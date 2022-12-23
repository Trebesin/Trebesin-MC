import { DatabaseConnection } from '../../mc_modules/network/database';
import { world,system, Block, BlockType, BlockLocation, Entity, BlockPermutation} from '@minecraft/server';
import * as serverAdmin from '@minecraft/server-admin';
import { sendMessage } from '../../mc_modules/commandParser';
import { copyBlock, compareBlocks, getPermutations, blockUpdateIteration } from '../../mc_modules/block';
import { sumVectors, copyVector, subVectors } from '../../js_modules/vector';
import { containsArray, filter, insertToArray, deleteFromArray } from '../../js_modules/array';
import * as Block_history_commands from './workers/commands';
import { DIMENSION_IDS , FACE_DIRECTIONS } from '../../mc_modules/constants';
const DB_UPDATE_INTERVAL = 1200;

const exported = {};
const blockUpdates = {};

async function main() {

    console.warn('Loading Block History...\n{');
    world.say('Loading Block History...\n{');
    Block_history_commands.main();
    console.warn('   Block History commands Loaded');
    world.say('   Block History commands Loaded');
    
    //Connect to the database:
    const connection = new DatabaseConnection({
        connection: {
            host: 'db1.falix.cc',
            user: serverAdmin.variables.get('db-connection-username'),
            password: serverAdmin.variables.get('db-connection-password'),
            multipleStatements: true,
            database: 's835835_Trebesin-DB-Beta'
        },
        server: {
            url: serverAdmin.variables.get('db-server-url'),
            username: serverAdmin.variables.get('db-server-username'),
            password: serverAdmin.variables.get('db-server-password')
        }
    });
    exported.connection = connection;
    try {
        const response = await connection.connect();
        if (response.status === 200) world.say('successfully connected to the database');
        else world.say(`couldn't connect to database: \n[${response.status}] ${response.body}`);
    } catch (error) {
        world.say(`${error}`);
    }
    
    //Saving to the permanent database:
    system.runSchedule(async () => {
        let empty = true;
        const request = {
            sql: 'INSERT INTO block_history (actor_id,tick,dimension_id,x,y,z,before_id,after_id,before_waterlogged,after_waterlogged,before_permutations,after_permutations) VALUES ',
            values: []
        };
        for (const actorId in blockUpdates) {
            const actorRecords = blockUpdates[actorId];
            for (let index = 0;index < actorRecords.length;index++) {
                const record = actorRecords[index];
                request.sql += '(?,?,?,?,?,?,?,?,?,?,?,?)';
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
                    JSON.stringify(getPermutations(record.after.permutation))
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

    //Block Updates:

    //Fall block tests:
    const fallingBlocksTracked = []; // {location,tick,id,playerId}
    world.events.entitySpawn.subscribe((eventData) => {
        if (eventData.entity.typeId === 'minecraft:falling_block') {
            const location = eventData.entity.location;
            insertToArray(
                fallingBlocksTracked,
                {
                    location: {
                        start: new BlockLocation(location.x,location.y,location.z),
                        current: new BlockLocation(location.x,location.y,location.z)
                    },
                    tick: {
                        start:  system.currentTick,
                        current:  system.currentTick
                    },
                    id: eventData.entity.id,
                    dimensionId: eventData.entity.dimension.id,
                    playerId: 0
                }
            );
            world.say(`§aBlock Starts Falling§r [${location.x},${location.y},${location.z}] @ ${system.currentTick}`);
        }
    });

    system.runSchedule(() => {
        for (let index = 0;index < fallingBlocksTracked.length;index++) {
            const fallingBlockData = fallingBlocksTracked[index];
            const fallingBlockEntity = getEntityById(
                fallingBlockData.id,
                { type: 'minecraft:falling_block' },
                [fallingBlockData.dimensionId]
            )
            if (fallingBlockEntity == null) {
                const location = fallingBlockData.location.current;
                const tick = fallingBlockData.tick.current;
                world.say(`§aBlock Ends Falling§r [${location.x},${location.y},${location.z}] @ ${tick}`);
                deleteFromArray(fallingBlocksTracked,index);
            } else {
                fallingBlockData.location.current = fallingBlockEntity.location;
                fallingBlockData.tick.current = system.currentTick;
            }
        }
    });

    function getEntityById(id,queryOptions,dimensionIds = DIMENSION_IDS) {
        for (let index = 0;index < dimensionIds.length;index++) {
            const dimension = world.getDimension(DIMENSION_IDS[index]);
            const entities = dimension.getEntities(queryOptions);
            return filter(entities,(entity) => entity.id === id)[0];
        }
    }

    world.events.blockBreak.subscribe(async (eventData) => {
        world.say(`§cBlock Break§r - ${system.currentTick}`);
        const blockOld = {
            typeId: eventData.brokenBlockPermutation.type.id,
            isWaterlogged: eventData.block.isWaterlogged,
            dimension: eventData.dimension,
            location: eventData.block.location,
            permutation: eventData.brokenBlockPermutation
        }
        saveBlockUpdate(blockOld,copyBlock(eventData.block),eventData.player.id);

        //Testing:
        await blockUpdateIteration(blockOld.location,blockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,blockOld.location);
            world.say(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
        });

        
        //Future feature:
        //const dimension = eventData.dimension;
        //const blockAbove = dimension.getBlock(eventData.block.location.offset(0,1,0));
        //world.say(`Above Break Before: ${blockAbove.typeId} - ${system.currentTick}`);
        //system.run(() => {
        //    world.say(`Above Break After: ${blockAbove.typeId} - ${system.currentTick}`);
        //    const doubleBlockAbove = dimension.getBlock(blockAbove.location.offset(0,1,0));
        //    world.say(`2xAbove Break Before: ${doubleBlockAbove.typeId} - ${system.currentTick}`);
        //    system.run(() => {
        //        world.say(`2xAbove Break After: ${doubleBlockAbove.typeId} - ${system.currentTick}`);
        //    });
        //});
    });

    //!falling blocks will need a special treatment.
    //!also placing blocks can have chain effect too.
    
    world.events.itemStartUseOn.subscribe(async(eventData) => {
        const player = eventData.source;
        const offset = FACE_DIRECTIONS[eventData.blockFace];
        const faceBlockLocation = eventData.blockLocation.offset(offset.x,offset.y,offset.z);
        const faceBlock = player.dimension.getBlock(faceBlockLocation);
        const faceBlockOld = copyBlock(faceBlock);
        const block = player.dimension.getBlock(eventData.blockLocation);
        const blockOld = copyBlock(block);
        system.run(async () => {
            //Debug:
            //world.say(`§aBefore block§r - ${blockOld.typeId}`);
            //world.say(`§dAfter block§r - ${block.typeId}`);
            //if (compareBlocks(block,blockOld)) {
            //    world.say('They are the same.');
            //} else {
            //    saveBlockUpdate(faceBlockOld,copyBlock(faceBlock),player);
            //    world.say('They are NOT the same.');
            //}
            //world.say(`§aBefore face§r - ${faceBlockOld.typeId}`);
            //world.say(`§dAfter face§r - ${faceBlock.typeId}`);
            //if (compareBlocks(faceBlock,faceBlockOld)) {
            //    world.say('They are the same.');
            //} else {
            //    saveBlockUpdate(blockOld,copyBlock(block),player);
            //    world.say('They are NOT the same.');
            //}

            //Function:
            saveBlockUpdate(faceBlockOld,copyBlock(faceBlock),player.id);
            saveBlockUpdate(blockOld,copyBlock(block),player.id);

        })
        await blockUpdateIteration(faceBlockLocation,faceBlockOld.dimension,(blockBefore,blockAfter,tick) => {
            const vec = subVectors(blockBefore.location,faceBlockOld.location);
            world.say(`${blockBefore.typeId} -> ${blockAfter.typeId} @ ${vec.x},${vec.y},${vec.z}:${tick}`);
        });
    });  

    world.events.blockPlace.subscribe(async (eventData) => {
        world.say('§bBlock Place');
    });

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
    console.warn('}\nLoaded Block History...\n{');
    world.say('}\nLoaded Block History...\n{');
}

//*Functions:
/**
 * Function for saving block updates into the Block History memory database.
 * @param {object} blockBefore **Copy** of the `Block` class object saved as the block before the update.
 * @param {object} blockAfter **Copy** of the `Block` class object saved as the block after the update.
 * @param {object} actorId ID that is used to identify the cause of the block update, usually an entity ID.
 * @returns {number} Returns a number indicating change to the memory database.
 */
function saveBlockUpdate(blockBefore,blockAfter,actorId) {
    if (blockUpdates[actorId] == null) blockUpdates[actorId] = [];
    const updateRecord = {
        before: blockBefore,
        after: blockAfter,
        tick: system.currentTick
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

//*Export Functions:
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

export {main,setBlockType,setBlockPermutation,exported};


