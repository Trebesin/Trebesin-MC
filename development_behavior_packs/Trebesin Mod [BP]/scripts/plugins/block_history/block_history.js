import { world,system, Block, BlockType, BlockLocation, Entity, BlockPermutation} from '@minecraft/server';
import { sendMessage } from '../../mc_modules/commandParser';
import { copyBlock, compareBlocks, getPermutations, blockUpdateIteration } from '../../mc_modules/blocks';
import { sumVectors, copyVector, subVectors } from '../../js_modules/vector';
import { containsArray, filter, insertToArray, deleteFromArray } from '../../js_modules/array';
import * as BlockHistoryCommandsWorker from './workers/commands';
import * as Debug from '../debug/debug';
import { DB } from '../backend/backend';
import { DIMENSION_IDS , FACE_DIRECTIONS } from '../../mc_modules/constants';
const DB_UPDATE_INTERVAL = 100;

const blockUpdates = {};
const fallingBlocksTracked = [];
let DatabaseExport = null;

async function main() {
    //# Workers:
    loadWorkers();
    
    //# Database:
    const connection = DB;
    DatabaseExport = connection
    //## DB Save Schedule:
    system.runSchedule(async () => {
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
                    JSON.stringify(getPermutations(record.before.permutation)),
                    JSON.stringify(getPermutations(record.after.permutation)),
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
            world.say(`${error}`);
        }
    },DB_UPDATE_INTERVAL)

    //# Block Updates:
    //## Falling Block Patches:
    world.events.entitySpawn.subscribe((eventData) => {
        if (eventData.entity.typeId === 'minecraft:falling_block') {
            const location = eventData.entity.location;
            const blockLocation = new BlockLocation(Math.floor(location.x),Math.floor(location.y),Math.floor(location.z));
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
            Debug.logMessage(`§aBlock Starts Falling§r [${blockLocation.x},${blockLocation.y},${blockLocation.z}] @ ${system.currentTick}`);
        }
    });

    system.runSchedule(() => {
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
                world.say(`§aBlock Ends Falling§r [${location.current.x},${location.current.y},${location.current.z}] @ ${tick.current} - ${getEntityById(
                    fallingBlockData.playerId,
                    {},
                    [fallingBlockData.dimensionId]
                )?.nameTag}`);
                deleteFromArray(fallingBlocksTracked,index);
            } else {
                fallingBlockData.location.current = new BlockLocation(
                    Math.floor(fallingBlockEntity.location.x),
                    Math.floor(fallingBlockEntity.location.y),
                    Math.floor(fallingBlockEntity.location.z)
                );
                fallingBlockData.tick.current = system.currentTick;
            }
        }
    },1);

    //## Block Breaking Detection:
    world.events.blockBreak.subscribe(async (eventData) => {
        world.say(`§cBlock Break§r - ${system.currentTick}`);
        const playerId = eventData.player.id;
        const blockOld = {
            typeId: eventData.brokenBlockPermutation.type.id,
            isWaterlogged: eventData.block.isWaterlogged,
            dimension: eventData.dimension,
            location: eventData.block.location,
            permutation: eventData.brokenBlockPermutation
        }
        //This Block:
        if(eventData.player.hasTag('inspector')){
            try{
                await BlockHistoryCommandsWorker.inspector(blockOld, copyBlock(eventData.block), eventData.player) 
            }
            catch(error){
                Debug.logMessage(error)
            }
        }
        else{
            saveBlockUpdate(blockOld,copyBlock(eventData.block),playerId);
        }

        //Updated Blocks:
        await blockUpdateIteration(blockOld.location,blockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,blockOld.location);
            world.say(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
            //Falling Blocks:
            const fallObject = fallingBlocksTracked.find((block) => blockBefore.location.equals(block.location.start));
            if (fallObject) fallObject.playerId = playerId;
        });
    });

    //!falling blocks will need a special treatment.
    //!also placing blocks can have chain effect too.
    
    //## Block Placing Detection:
    world.events.itemStartUseOn.subscribe(async(eventData) => {
        const player = eventData.source;
        const offset = FACE_DIRECTIONS[eventData.blockFace];
        const faceBlockLocation = eventData.blockLocation.offset(offset.x,offset.y,offset.z);
        const faceBlock = player.dimension.getBlock(faceBlockLocation);
        const faceBlockOld = copyBlock(faceBlock);
        const block = player.dimension.getBlock(eventData.blockLocation);
        const blockOld = copyBlock(block);
        try{
            await BlockHistoryCommandsWorker.inspector(faceBlockOld, copyBlock(faceBlock), player) 
            BlockHistoryCommandsWorker.revertBlockChange(blockOld, copyBlock(block), player)
        }
        catch(error){
            Debug.logMessage(error)
        }

        //Those Blocks:
        system.run(async () => {
            if(player.hasTag('inspector')){
            }
            else{
                saveBlockUpdate(faceBlockOld,copyBlock(faceBlock),player.id);
                saveBlockUpdate(blockOld,copyBlock(block),player.id);
            }
            //Falling Blocks
            system.run(() => {
                const fallObject = fallingBlocksTracked.find((block) => faceBlock.location.equals(block.location.start));
                if (fallObject) fallObject.playerId = player.id;
            })
        });

        //Updated Blocks:
        await blockUpdateIteration(faceBlockLocation,faceBlockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,faceBlockOld.location);
            world.say(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
            //Falling Blocks:
            const fallObject = fallingBlocksTracked.find((block) => blockBefore.location.equals(block.location.start));
            if (fallObject) fallObject.playerId = player.id;
        });
    });  

    //Debug:
    world.events.itemUseOn.subscribe((eventData) => {
        if (eventData.item.typeId === 'minecraft:stick') {
            const block = eventData.source.dimension.getBlock(eventData.blockLocation);
            if (block.typeId.startsWith('trebesin')) {
                world.say(`[trebesin:rotation] - ${block.permutation.getProperty('trebesin:rotation')?.value}`);
                world.say(`[trebesin:horizontal_rotation] - ${block.permutation.getProperty('trebesin:horizontal_rotation')?.value}`);
                world.say(`[trebesin:vertical_rotation] - ${block.permutation.getProperty('trebesin:vertical_rotation')?.value}`);    
            } else {
                for (const permutation of block.permutation.getAllProperties()) {
                    world.say(`[${permutation.name}] - ${permutation.value}`);
                }
            }
        } else if (eventData.item.typeId === 'minecraft:diamond_sword') {
            world.say(`${JSON.stringify(blockUpdates,null,1)}`);
        }
    })
}

//# Functions:

//## Internal Functions:
function loadWorkers() {
    BlockHistoryCommandsWorker.main();
    Debug.logMessage('   Block History commands Loaded');
}

/**
 * Function used to get entity with a specified ID from the world.
 * @param {*} id Id of the entity to find.
 * @param {EntityQueryOptions} [queryOptions] Optional query options to further specify the entity to look for.
 * @param {string[]} [dimensionIds] IDs of dimensions to look for. Defaults to all dimensions of the world.
 * @returns {Entity|undefined} Entity with the specified ID or undefined if no entity was found.
 */
function getEntityById(id,queryOptions = {},dimensionIds = DIMENSION_IDS) {
    for (let index = 0;index < dimensionIds.length;index++) {
        const dimension = world.getDimension(DIMENSION_IDS[index]);
        const entities = [...dimension.getEntities(queryOptions)];
        const entityWithId = filter(entities,(entity) => entity.id === id)[0]
        if (entityWithId != null) return entityWithId;
    }
}

/**
 * Function for saving block updates into the Block History memory database.
 * @param {object} blockBefore **Copy** of the `Block` class object saved as the block before the update.
 * @param {object} blockAfter **Copy** of the `Block` class object saved as the block after the update.
 * @param {object} actorId ID that is used to identify the cause of the block update, usually an entity ID.
 * @returns {number} Returns a number indicating change to the memory database.
 */
function saveBlockUpdate(blockBefore,blockAfter,actorId,blockPlaceType = "playerPlace",blockPlaceID = null) {
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
        world.say('garbage collected!');
        return -1;
    } else {
        records.push(updateRecord);
        world.say('saved the record');
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
function setBlockType(block,blockType,actorId) {
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
function setBlockPermutation(block,permutation,actorId) {
    const blockBefore = copyBlock(block);
    block.setPermutation(permutation);
    const blockAfter = copyBlock(block);
    saveBlockUpdate(blockBefore,blockAfter,actorId);
}

export {
    main,
    setBlockType,
    setBlockPermutation,
    saveBlockUpdate,
    DatabaseExport as database
};


