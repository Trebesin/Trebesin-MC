//APIs:
import { world,system, Block, BlockType, Entity, BlockPermutation} from '@minecraft/server';
//Plugins:
import * as BlockHistoryCommandsWorker from './workers/commands';
import * as Debug from '../debug/debug';
import { DB, Server } from '../backend/backend';
//Modules:
import { getEntityById } from '../../mc_modules/entities';
import { sumVectors, copyVector, subVectors, floorVector, compareVectors } from '../../js_modules/vector';
import { containsArray, filter, insertToArray, deleteFromArray } from '../../js_modules/array';
import { copyBlock, compareBlocks, getPermutations, blockUpdateIteration } from '../../mc_modules/blocks';
import { DIMENSION_IDS , FACE_DIRECTIONS } from '../../mc_modules/constants';
import { getEquipedItem, sendMessage } from '../../mc_modules/players';


const DB_UPDATE_INTERVAL = 100;
const blockUpdates = {};
const fallingBlocksTracked = [];

export const name = 'Block History';
export async function main() {
    //# Workers:
    loadWorkers();
    
    //# Database:
    const connection = DB;
    //## DB Save Schedule:
    system.runInterval(async () => {
        let empty = true;
        const request = {
            sql: 'INSERT INTO block_history (actor_id,tick,dimension_id,x,y,z,before_id,after_id,before_waterlogged,after_waterlogged,before_permutations,after_permutations,blockPlaceType,blockPlaceTypeID) VALUES ',
            values: []
        };
        for (const actorId in blockUpdates) {
            const actorRecords = blockUpdates[actorId];
            for (let index = 0;index < actorRecords.length;index++) {
                const record = actorRecords[index];
                request.sql += '(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
                request.sql += (index+1 === actorRecords.length) ? ';' : ',';
                request.values.push(
                    actorId,
                    record.tick,
                    record.before.dimension.id,
                    record.before.location.x,
                    record.before.location.y,
                    record.before.location.z,
                    record.before.typeId,
                    record.after.typeId,
                    record.before.isWaterlogged,
                    record.after.isWaterlogged,
                    record.before.permutation.getAllProperties(),
                    record.after.permutation.getAllProperties(),
                    record.blockPlaceType,
                    record.blockPlaceID
                );
                empty = false;
            }
            actorRecords.length = 0;
        }
        if (empty) return 0;
        try {
            Debug.logMessage(JSON.stringify(await connection.query(request,true)));
        } catch (error) {
            Debug.sendLogMessage(`${error}`);
        }
    },DB_UPDATE_INTERVAL)

    //# Block Updates:
    //## Falling Block Patches:
    world.events.entitySpawn.subscribe((eventData) => {
        if (eventData.entity.typeId === 'minecraft:falling_block') {
            const blockLocation = floorVector(eventData.entity.location);
            insertToArray(
                fallingBlocksTracked,
                {
                    location: {
                        start: blockLocation,
                        current: blockLocation
                    },
                    tick: {
                        start:  system.currentTick,
                        current:  system.currentTick
                    },
                    id: eventData.entity.id,
                    dimensionId: eventData.entity.dimension.id,
                    playerId: null
                }
            );
            Debug.sendLogMessage(`§aBlock Starts Falling§r [${blockLocation.x},${blockLocation.y},${blockLocation.z}] @ ${system.currentTick}`);
        }
    });

    system.runInterval(() => {
        for (let index = 0;index < fallingBlocksTracked.length;index++) {
            const fallingBlockData = fallingBlocksTracked[index];
            if (fallingBlockData == null) continue;
            const fallingBlockEntity = getEntityById(
                    fallingBlockData.id,
                    { type: 'minecraft:falling_block' },
                    [fallingBlockData.dimensionId]
            );
            if (fallingBlockEntity == null) {
                const location = fallingBlockData.location;
                const tick = fallingBlockData.tick;
                const blocksTravelled = location.start.y - location.current.y;
                const timeTravelled = tick.current - tick.start;
                const speed = blocksTravelled/timeTravelled;
                Debug.sendLogMessage(`§aBlock Ends Falling§r [${location.current.x},${location.current.y},${location.current.z}] @ ${tick.current} - ${getEntityById(
                    fallingBlockData.playerId,
                    {},
                    [fallingBlockData.dimensionId]
                )?.nameTag}`);
                deleteFromArray(fallingBlocksTracked,index);
            } else {
                fallingBlockData.location.current = floorVector(fallingBlockEntity.location);
                fallingBlockData.tick.current = system.currentTick;
            }
        }
    },1);

    //## Block Breaking Detection:
    world.events.blockBreak.subscribe(async (eventData) => {
        Debug.sendLogMessage(`§cBlock Break§r - ${system.currentTick}`);
        const playerId = eventData.player.id;
        const blockOld = {
            typeId: eventData.brokenBlockPermutation.type.id,
            isWaterlogged: eventData.block.isWaterlogged,
            dimension: eventData.dimension,
            location: eventData.block.location,
            permutation: eventData.brokenBlockPermutation
        }
        //This Block:
        /*if(eventData.player.hasTag('inspector')){
            try{
                BlockHistoryCommandsWorker.revertBlockChange(blockOld, copyBlock(eventData.block), eventData.player)
                await BlockHistoryCommandsWorker.inspector(eventData.block.location, eventData.player) 

            }
            catch(error){
                Debug.sendLogMessage(error)
            }
        }
        else{*/
            saveBlockUpdate(blockOld,copyBlock(eventData.block),playerId);
        //}

        //Updated Blocks:
        await blockUpdateIteration(blockOld.location,blockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,blockOld.location);
            Debug.sendLogMessage(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
            //Falling Blocks:
            const fallObject = fallingBlocksTracked.find((block) => blockBefore.location.equals(block.location.start));
            if (fallObject) fallObject.playerId = playerId;
        });
    });
    
    //## Inspector
    Server.events.beforeItemStartUseOn.subscribe((eventData) => {
        const player = eventData.source;
        const offset = FACE_DIRECTIONS[eventData.blockFace];
        const faceBlockLocation = sumVectors(eventData.getBlockLocation(),offset);
        if (player.hasTag('inspector')){
            try {
                eventData.cancel = true;
                if (getEquipedItem(player) != null) BlockHistoryCommandsWorker.inspector(faceBlockLocation, player);
                else BlockHistoryCommandsWorker.inspector(eventData.getBlockLocation(), player);
            }
            catch(error){
                Debug.sendLogMessage(error)
            }
        }
    });

    //## Block Placing Detection:
    world.events.itemStartUseOn.subscribe(async(eventData) => {
        const player = eventData.source;
        const offset = FACE_DIRECTIONS[eventData.blockFace];
        const faceBlockLocation = sumVectors(eventData.getBlockLocation(),offset);
        const faceBlock = player.dimension.getBlock(faceBlockLocation);
        const faceBlockOld = copyBlock(faceBlock);
        const block = player.dimension.getBlock(eventData.getBlockLocation());
        const blockOld = copyBlock(block);

        //Those Blocks:
        system.runTimeout(async () => {
            saveBlockUpdate(faceBlockOld,copyBlock(faceBlock),player.id);
            saveBlockUpdate(blockOld,copyBlock(block),player.id);
            //Falling Blocks
            system.runTimeout(() => {
                const fallObject = fallingBlocksTracked.find((block) => compareVectors(faceBlock.location,block.location.start));
                if (fallObject) fallObject.playerId = player.id;
            },1);
        },1);

        //Updated Blocks:
        await blockUpdateIteration(faceBlockLocation,faceBlockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,faceBlockOld.location);
            Debug.sendLogMessage(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
            //Falling Blocks:
            const fallObject = fallingBlocksTracked.find((block) => blockBefore.location.equals(block.location.start));
            if (fallObject) fallObject.playerId = player.id;
        });
    });

    //Debug:
    world.events.itemUseOn.subscribe((eventData) => {
        if (eventData.item.typeId === 'minecraft:stick') {
            const block = eventData.source.dimension.getBlock(eventData.getBlockLocation());
            if (block.typeId.startsWith('trebesin')) {
                Debug.sendLogMessage(`[trebesin:rotation] - ${block.permutation.getProperty('trebesin:rotation')?.value}`);
                Debug.sendLogMessage(`[trebesin:horizontal_rotation] - ${block.permutation.getProperty('trebesin:horizontal_rotation')?.value}`);
                Debug.sendLogMessage(`[trebesin:vertical_rotation] - ${block.permutation.getProperty('trebesin:vertical_rotation')?.value}`);    
            } else {
                const properties = block.permutation.getAllProperties();
                for (const property in properties) {
                    Debug.sendLogMessage(`[${property}] - ${properties[property]}`);
                }
            }
        } else if (eventData.item.typeId === 'minecraft:diamond_sword') {
            Debug.sendLogMessage(`${JSON.stringify(blockUpdates,null,1)}`);
        }
    })
}

//# Functions:

//## Internal Functions:
function loadWorkers() {
    BlockHistoryCommandsWorker.main();
    Debug.sendLogMessage('   Block History commands Loaded');
}

/**
 * Function for saving block updates into the Block History memory database.
 * @param {object} blockBefore **Copy** of the `Block` class object saved as the block before the update.
 * @param {object} blockAfter **Copy** of the `Block` class object saved as the block after the update.
 * @param {object} actorId ID that is used to identify the cause of the block update, usually an entity ID.
 * @returns {number} Returns a number indicating change to the memory database.
 */
export function saveBlockUpdate(blockBefore,blockAfter,actorId,blockPlaceType = "playerPlace",blockPlaceID = null) {
    if (blockUpdates[actorId] == null) blockUpdates[actorId] = [];
    const updateRecord = {
        before: blockBefore,
        after: blockAfter,
        tick: system.currentTick,
        blockPlaceType: blockPlaceType,
        blockPlaceID: blockPlaceID
    };
    if (compareBlocks(updateRecord.before,updateRecord.after)) return 0;
    
    const records = blockUpdates[actorId]
    const lastRecord = records[records.length - 1];
    if (
        lastRecord &&
        compareBlocks(lastRecord.before,updateRecord.after,true) &&
        compareBlocks(lastRecord.after,updateRecord.before,true)
    ) {
        records.pop();
        Debug.sendLogMessage('garbage collected!');
        return -1;
    } else {
        records.push(updateRecord);
        Debug.sendLogMessage('saved the record');
        return 1;
    }
}

//## Exported Functions:
/**
 * Custom set block type function, does the same as `Block.setType()` method but also records the update to the block hisory database.
 * @param {Block} block `Block` class object to invoke `setType()` method on.
 * @param {BlockType} blockType `blockType` parameter of the `setType()` method.
 * @param {string} actorId ID that is used to identify the cause of the block update saved to the database, usually an entity ID.
 */
export function setBlockType(block,blockType,actorId) {
    const blockBefore = copyBlock(block);
    block.setType(blockType);
    const blockAfter = copyBlock(block);
    saveBlockUpdate(blockBefore,blockAfter,actorId);
}

/**
 * Custom set block permutation function, does the same as `Block.setpermutation()` method but also records the update to the block hisory database.
 * @param {Block} block `Block` class object to invoke `setpermutation()` method on.
 * @param {BlockPermutation} permutation `permutation` parameter of the `setpermutation()` method.
 * @param {string} actorId ID that is used to identify the cause of the block update saved to the database, usually an entity ID.
 */
export function setBlockPermutation(block,permutation,actorId) {
    const blockBefore = copyBlock(block);
    block.setPermutation(permutation);
    const blockAfter = copyBlock(block);
    saveBlockUpdate(blockBefore,blockAfter,actorId);
}


