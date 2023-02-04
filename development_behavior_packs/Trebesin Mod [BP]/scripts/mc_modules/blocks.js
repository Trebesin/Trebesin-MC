import {Block, BlockPermutation, world, system, BlockLocation} from '@minecraft/server';
import { arrayDifference, find } from '../js_modules/array';
import { sumVectors, compareVectors } from '../js_modules/vector';
import { logMessage } from '../plugins/debug/debug';
import { DIRECTIONS, TREBESIN_PERMUTATIONS } from './constants';

/**
 * Function for comparing 2 `Block` class objects.
 * @param {Block} blockA 1st block to compare the other with.
 * @param {Block} blockB The other block to compare with.
 * @param {boolean} checkLocation If the location of the block should be checked as well.
 * @returns {boolean} Boolean that is equal to `true` if the blocks are identical, otherwise `false`.
 */
function compareBlocks(blockA,blockB,checkLocation = false) {
    if (
        blockA == null || blockB == null ||
        blockA.typeId !== blockB.typeId || 
        blockA.isWaterlogged !== blockB.isWaterlogged
    ) return false;
    
    if (checkLocation) {
        if (!(
            blockA.dimension.id === blockB.dimension.id &&
            blockA.location.x === blockB.location.x &&
            blockA.location.y === blockB.location.y &&
            blockA.location.z === blockB.location.z
        )) return false;
    }

    const permutationA = blockA.permutation;
    const permutationB = blockB.permutation;
    const properties = blockA.typeId.startsWith('trebesin:') ? TREBESIN_PERMUTATIONS : permutationA.getAllProperties();
    for (let index = 0;index < properties.length;index++) {
        const permutationName = properties[index].name;
        const valueA = permutationA.getProperty(permutationName)?.value;
        const valueB = permutationB.getProperty(permutationName)?.value;
        if (valueA !== valueB) return false;
    }

    return true
}

/**
 * Returns all properties of a permutation in an object.
 * @param {BlockPermutation} permutation Permutation.
 * @returns {object}
 */
function getPermutations(permutation) {
    const permutationObject = {};
    const properties = permutation.type.id.startsWith('trebesin:') ? TREBESIN_PERMUTATIONS : permutation.getAllProperties();
    for (let index = 0;index < properties.length;index++) {
        const permutationName = properties[index].name;
        permutationObject[permutationName] = permutation.getProperty(permutationName)?.value;
    }
    return permutationObject
}

/**
 * 
 * @param {BlockPermutation} permutation 
 * @param {object} object 
 */
function setPermutationFromObject(permutation,object) {
    for (const property in object) {
        const value = object[property];
        permutation.getProperty(property).value = value;
    }
    return permutation;
}

/**
 * Function for comparing location of 2 `Block` class objects.
 * @param {Block} blockA 1st block to compare the other with.
 * @param {Block} blockB The other block to compare with.
 * @returns {boolean} Boolean that is equal to `true` if the blocks at the exact same place, otherwise `false`.
 */
 function compareBlockLocations(blockA,blockB) {
    return (
        blockA.dimension.id === blockB.dimension.id &&
        blockA.location.x === blockB.location.x &&
        blockA.location.y === blockB.location.y &&
        blockA.location.z === blockB.location.z
    )
}

/**
 * Function to copy `Block` class objects.
 * @param {Block} block Block to copy.
 * @returns {object} Object containing copies of selected properties of the block.
 */
function copyBlock(block) {
    return {
        typeId: block.typeId,
        dimension: block.dimension,
        location: block.location,
        isWaterlogged: block.isWaterlogged,
        permutation: block.permutation.clone()
    }
}

function getAdjecentBlockCopies(coord,dimension) {
    const blockArray = [];
    for (let index = 0;index < DIRECTIONS.length;index++) {
        const face = DIRECTIONS[index];
        blockArray.push(copyBlock(dimension.getBlock(new BlockLocation(coord.x + face.x,coord.y + face.y,coord.z + face.z))));
    }
    return blockArray;
}

function getAdjecentBlocks(coord,dimension) {
    const blockArray = [];
    for (let index = 0;index < DIRECTIONS.length;index++) {
        const face = DIRECTIONS[index];
        blockArray.push(dimension.getBlock(new BlockLocation(coord.x + face.x,coord.y + face.y,coord.z + face.z)));
    }
    return blockArray;
}

function getAdjecentBlockCoords(coord) {
    const coordArray = [];
    for (let index = 0;index < DIRECTIONS.length;index++) {
        coordArray.push(sumVectors(coord,DIRECTIONS[index]));
    }
    return coordArray;
}

async function blockUpdateIteration(location,dimension,callback) {
    world.say(`starting block update iteration @ ${location.x},${location.y},${location.z} [${system.currentTick}]`);
    let blockUpdateSignal = [];
    blockUpdateSignal.push(...getAdjecentBlockCopies(location,dimension));
    while (blockUpdateSignal.length !== 0) {
        blockUpdateSignal = await waitForNextTick(() => {
            const newBlockUpdates = [];
            for (let index = 0;index < blockUpdateSignal.length;index++) {
                const blockBefore = blockUpdateSignal[index];
                const blockLocation = blockBefore.location;
                const blockAfter = copyBlock(dimension.getBlock(blockLocation));
                if (!compareBlocks(blockBefore,blockAfter,false)) {
                    const adjecentBlocks = getAdjecentBlockCopies(blockLocation,dimension);
                    for (let adjecentIndex = 0;adjecentIndex < adjecentBlocks.length;adjecentIndex++) {
                        const adjecentBlock = adjecentBlocks[adjecentIndex];
                        if (newBlockUpdates.find((block) => compareVectors(block.location,adjecentBlock.location)) == null) {
                            newBlockUpdates.push(adjecentBlock);
                        }
                    }
                    callback(blockBefore,blockAfter,system.currentTick);
                }
            }
            return newBlockUpdates;
        });
    }
    world.say(`ending block update iteration [${system.currentTick}]`);
}

async function blockUpdateIterationObject(location,dimension,callback) {
    let blockUpdateSignal = {};
    const initialAdjecentBlocks = getAdjecentBlockCopies(location,dimension);
    for (let adjecentIndex = 0;adjecentIndex < initialAdjecentBlocks.length;adjecentIndex++) {
        const adjecentBlock = initialAdjecentBlocks[adjecentIndex];
        const adjecentBlockId = `${adjecentBlock.location.x},${adjecentBlock.location.y},${adjecentBlock.location.z}`;
        blockUpdateSignal[adjecentBlockId] = adjecentBlock;
    }
    while (!isEmptyObject(blockUpdateSignal)) {
        blockUpdateSignal = await waitForNextTick(() => {
            const newBlockUpdates = {};
            for (const blockBefore in blockUpdateSignal) {
                const blockLocation = blockBefore.location;
                const blockAfter = copyBlock(dimension.getBlock(blockLocation));
                if (!compareBlocks(blockBefore,blockAfter,false)) {
                    const adjecentBlocks = getAdjecentBlockCopies(blockLocation,dimension);
                    for (let adjecentIndex = 0;adjecentIndex < adjecentBlocks.length;adjecentIndex++) {
                        const adjecentBlock = adjecentBlocks[adjecentIndex];
                        const adjecentBlockId = `${adjecentBlock.location.x},${adjecentBlock.location.y},${adjecentBlock.location.z}`;
                        newBlockUpdates[adjecentBlockId] = adjecentBlock;
                    }
                    callback(blockBefore,blockAfter,system.currentTick);
                }
            }
            return newBlockUpdates;
        });
    }
}

async function waitForNextTick(callback) {
    return new Promise((resolve,reject) => {
        system.run(() => {
            try {
                resolve(callback());
            } catch (error) {
                reject(error)
            }
        })
    })
}

function isEmptyObject(object) {
    for (const property in object) return false;
    return true;
}

function generateBlockArea(coord,steps = 10,callback = null) {
    const coords = [];
    const vectorDefinitions = {};
    //Tertiary vectors are sent at the beginning from the starting coordinate and also from the secondary and primary vectors. Those cover the whole Y axis.
    vectorDefinitions.tertiary = [
            {
                vector: {x:0,y:1,z:0}
            },
            {
                vector: {x:0,y:-1,z:0}
            }
    ];
    //Secondary vectors are sent by the primary vectors. Those cover each X,Z quadrant of the area.
    vectorDefinitions.secondary = [
            {
                vector: {x:0,y:0,z:1},
                sends: vectorDefinitions.tertiary
            },
            {
                vector: {x:0,y:0,z:-1},
                sends: vectorDefinitions.tertiary
            },
            {
                vector: {x:-1,y:0,z:0},
                sends: vectorDefinitions.tertiary
            },
            {
                vector: {x:1,y:0,z:0},
                sends: vectorDefinitions.tertiary
            }
    ];
    //Primary vectors are sent at the beginning from the starting coordinate. Those are the edges between the X,Z quadrants of the area.
    vectorDefinitions.primary = [
            {
                vector: {x:1,y:0,z:0},
                sends: [vectorDefinitions.secondary[0],...vectorDefinitions.tertiary]
            },
            {
                vector: {x:-1,y:0,z:0},
                sends: [vectorDefinitions.secondary[1],...vectorDefinitions.tertiary]
            },
            {
                vector: {x:0,y:0,z:1},
                sends: [vectorDefinitions.secondary[2],...vectorDefinitions.tertiary]
            },
            {
                vector: {x:0,y:0,z:-1},
                sends: [vectorDefinitions.secondary[3],...vectorDefinitions.tertiary]
            }
  
    ];
    let sentVectors = [];
    for (let step = 0;step <= steps;step++) {
        const lastLength = sentVectors.length;
        if (step === 0) {
            const location = copyVector(coord);
            for (let index = 0;index < vectorDefinitions.primary.length;index++) {
                sentVectors.push({
                    location: copyVector(location),
                    definition: vectorDefinitions.primary[index]
                });
            }
            for (let index = 0;index < vectorDefinitions.tertiary.length;index++) {
                sentVectors.push({
                    location: copyVector(location),
                    definition: vectorDefinitions.tertiary[index]
                });
            }
            coords.push(location);
        }
        for (let index = 0;index < lastLength;index++) {
            const vector = sentVectors[index];
            const location = sumVectors(vector.location,vector.definition.vector);
            vector.location = copyVector(location);
            coords.push(location);
            if (vector.definition.sends) {
                for (let sendIndex = 0;sendIndex < vector.definition.sends.length;sendIndex++) {
                    sentVectors.push({
                        location: copyVector(location),
                        definition: vector.definition.sends[sendIndex]
                    });
                }
            }
        }
    }
    return coords;
}

export {compareBlocks, compareBlockLocations, setPermutationFromObject, copyBlock, getPermutations, getAdjecentBlocks, getAdjecentBlockCopies, blockUpdateIteration, generateBlockArea}