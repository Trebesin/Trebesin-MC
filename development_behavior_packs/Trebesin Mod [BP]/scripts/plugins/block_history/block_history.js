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
import * as Blocks from '../../mc_modules/blocks';
import * as Dimensions from '../../mc_modules/dimensions';
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
                    JSON.stringify(record.before.permutation.getAllProperties()),
                    JSON.stringify(record.after.permutation.getAllProperties()),
                    record.blockPlaceType,
                    record.blockPlaceID
                );
                empty = false;
            }
            actorRecords.length = 0;
        }
        if (empty) return 0;
        try {
            await connection.query(request,true);
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
        Debug.logMessage(`§cBlock Break§r - ${system.currentTick}`);
        const playerId = eventData.player.id;
        const blockOld = {
            typeId: eventData.brokenBlockPermutation.type.id,
            isWaterlogged: eventData.block.isWaterlogged,
            permutation: eventData.brokenBlockPermutation?.clone(),
            components: {},
            location: eventData.block.location,
            dimension: eventData.dimension,
        }

        //This Block:
        saveBlockUpdate(blockOld,Blocks.copyBlockState(eventData.block,true),{actorId:playerId});

        //Updated Blocks:
        await Blocks.blockUpdateIteration(blockOld.location,blockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,blockOld.location);
            Debug.logMessage(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
            //Falling Blocks:
            const fallObject = fallingBlocksTracked.find((block) => compareVectors(blockBefore.location,block.location.start));
            if (fallObject) fallObject.playerId = playerId;
        });
    });
    
    world.events.beforeItemUseOn.subscribe((eventData) => {
        //!! this prevents an exploit do not remove !!
        const player = eventData.source;
        if (player.hasTag('inspector')){
            eventData.cancel = true;
        }
    })
    //## Inspector
    Server.events.beforeItemStartUseOn.subscribe((eventData) => {
            const player = eventData.source;
            if (player.hasTag('inspector')){
                try {
                    eventData.cancel = true;
                    const offset = FACE_DIRECTIONS[eventData.blockFace];
                    const faceBlockLocation = sumVectors(eventData.getBlockLocation(), offset);
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
        const faceBlockOld = Blocks.copyBlockState(faceBlock,true);
        const block = player.dimension.getBlock(eventData.getBlockLocation());
        const blockOld = Blocks.copyBlockState(block,true);

        //These Blocks:
        system.runTimeout(async () => {
            saveBlockUpdate(faceBlockOld,Blocks.copyBlockState(faceBlock,true),{actorId:player.id});
            saveBlockUpdate(blockOld,Blocks.copyBlockState(block,true),{actorId:player.id});
            //Falling Blocks
            system.runTimeout(() => {
                const fallObject = fallingBlocksTracked.find((block) => compareVectors(faceBlock.location,block.location.start));
                if (fallObject) fallObject.playerId = player.id;
            },1);
        },1);

        //Updated Blocks:
        await Blocks.blockUpdateIteration(faceBlockLocation,faceBlockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,faceBlockOld.location);
            Debug.logMessage(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
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
 * @param {BlockHistoryOptions} blockHistoryEntry Information regarding the block history database entry for the block update.
 * @returns {number} Returns a number indicating change to the memory database.
 */
export function saveBlockUpdate(blockBefore,blockAfter,blockHistoryEntry) {
    blockUpdates[blockHistoryEntry.actorId] ??= [];
    if (Blocks.compareBlockStates(blockBefore,blockAfter,true)) return 0;

    const records = blockUpdates[blockHistoryEntry.actorId]
    const lastRecord = records[records.length - 1];
    if (
        lastRecord &&
        Dimensions.comparePositions(lastRecord.before,blockBefore) &&
        Blocks.compareBlockStates(lastRecord.before,blockAfter,true) &&
        Blocks.compareBlockStates(lastRecord.after,blockBefore,true)
    ) {
        records.pop();
        Debug.sendLogMessage('garbage collected!');
        return -1;
    } else {
        records.push({
            before: blockBefore,
            after: blockAfter,
            tick: system.currentTick,
            blockPlaceType: blockHistoryEntry.updateType ?? "playerPlace",
            blockPlaceID: blockHistoryEntry.updateId
        });
        Debug.sendLogMessage('saved the record');
        return 1;
    }
}

//# Exported Functions:
/**
 * Custom set block type function, does the same as `Block.setType()` method but also records the update to the block hisory database.
 * @param {Block} block `Block` class object to invoke `setType()` method on.
 * @param {BlockType} blockType `blockType` parameter of the `setType()` method.
 * @param {BlockHistoryOptions} blockHistoryEntry Information used to store the entry in the database.
 */
export function setBlockType(block,blockType,blockHistoryEntry) {
    const blockBefore = Blocks.copyBlockState(block,true);
    block.setType(blockType);
    const blockAfter = Blocks.copyBlockState(block,true);
    saveBlockUpdate(blockBefore,blockAfter,blockHistoryEntry);
}

/**
 * Custom set block permutation function, does the same as `Block.setpermutation()` method but also records the update to the block hisory database.
 * @param {Block} block `Block` class object to invoke `setpermutation()` method on.
 * @param {BlockPermutation} permutation `permutation` parameter of the `setpermutation()` method.
 * @param {BlockHistoryOptions} blockHistoryEntry Information used to store the entry in the database.
 */
export function setBlockPermutation(block,permutation,blockHistoryEntry) {
    const blockBefore = Blocks.copyBlockState(block,true);
    block.setPermutation(permutation);
    const blockAfter = Blocks.copyBlockState(block,true);
    saveBlockUpdate(blockBefore,blockAfter,blockHistoryEntry);
}

/**
 * Updates the block state and records the update to the block hisory database.
 * @param {Block} block `Block` class object to edit state of.
 * @param {import('../../mc_modules/blocks').BlockState} blockState Block state to apply.
 * @param {BlockHistoryOptions} blockHistoryEntry Information used to store the entry in the database.
 */
export function editBlock(block,blockState,blockHistoryEntry) {
    const blockBefore = Blocks.copyBlockState(block,true);
    Blocks.applyBlockState(block,blockState)
    const blockAfter = Blocks.copyBlockState(block,true);
    saveBlockUpdate(blockBefore,blockAfter,blockHistoryEntry);
}

//# Types / Constants
/**
 * @typedef BlockHistoryOptions
 * @prop {string} actorId ID of the player or entity that will be defined as the cause.
 * @prop {string} updateType Type of the block update.
 * @prop {number} updateId ID for the block update.
 */

/**
 * Object with defining IDs for `BlockHistoryOptions` `updateType` entries.
 */
export const BlockHistoryUpdateTypes = {
    /** Block updated by a player in a usual vanilla MC interaction. */
    playerUpdate: 0,
    /** Block updated by a player using block history plugin reverse feature. */
    blockHistoryReverse: 1,
    /** Block updated by a player using blocky tools plugin. */
    blockyTools: 2,
    /** Block updated by the system for a technical reason in an automated fashion. */
    system: 3

};

export const BlockHistoryUpdateTypeNames = [
    'Player Update',
    'Block History: Reverse',
    'Blocky Tools: Player',
    'System'
];

