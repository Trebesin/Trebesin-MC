import {world, BlockLocation, Vector, Location} from "mojang-minecraft";
import { includes } from '../js_modules/array';
import { sumVectors } from '../js_modules/vector';

function getTopSolidBlock(x, z, dimension = world.getDimension('overworld')) {
    const location = new Location(x, 320, z);
    return dimension.getBlockFromRay(location, Vector.down, {includeLiquidBlocks: false, includePassableBlocks: false, maxDistance: 390});
}

function getTopBlock(x, z, dimension = world.getDimension('overworld')) {
    const location = new Location(x, 320, z);
    return dimension.getBlockFromRay(location, Vector.down, {includeLiquidBlocks: true, includePassableBlocks: true, maxDistance: 390});
}

function getClosestEmptyBlock(coordinate, dimension = world.getDimension('overworld'), vectorMap = [[0,1,0],[0,-1,0]], maxDistance = 256) {
    let emptyBlock = null;
    const checkedBlocks = [];
    let coords = [coordinate];
    while (coords.length) {
        const newCoords = [];
        for (let index = 0;index < coords.length;index++) {
            const coord = coords[index];
            if (coord.some((element, index) => Math.abs(coordinate[index] - element) > maxDistance)) continue;
            const blockLocation = new BlockLocation(coord[0], coord[1], coord[2]);
            if (dimension.isEmpty(blockLocation)) {
                emptyBlock = coord;
                coords.length = 0;
                break;
            } else {
                checkedBlocks.push(coord);
                for (let vectorIndex = 0;vectorIndex < vectorMap.length;vectorIndex++) {
                    const vector = vectorMap[vectorIndex];
                    const newCoord = vector.map((element, index) => element + coord[index]);
                    if (!(containsArray(checkedBlocks,newCoord) || containsArray(coords,newCoord))) {
                        newCoords.push(newCoord);
                    }
                }
            }
        }
        coords = newCoords;
    }
    return emptyBlock;
}

/**
   * @arg {number[]} coordinate - Array of 3 integers reprsenting base coordinate, which the function spreads from.
   * @arg {Object} options - Information defining behavior of the spread function.
   * @arg {Number} options.chance - Decimal between 0 and 1 inclusive, it defines how likely is spread to occur for each iteration.
   * @arg {Number} options.amount - Integer between 0 and Infinity, it defines how many times spread iteration occurs.
   * @arg {Number} options.max - Integer between 0 and 256 inclusive, it defines the maximal amount of spread recursion that can happen.
   * @arg {Object} vectorMap - The vector(direction) for each coordinate in which the spread occurs.
   * @arg {number[]} vectorMap.x - Array of two Integers, it defines the range of random coordinate shift to occur for spread on X axis.
   * @arg {number[]} vectorMap.y - Array of two Integers, it defines the range of random coordinate shift to occur for spread on Y axis.
   * @arg {number[]} vectorMap.z - Array of two Integers, it defines the range of random coordinate shift to occur for spread on Z axis.
**/
function createRandomSpread(coordinate, options, vectorMap = { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, callback) {
    const blocks = new Set();
    let coords = [coordinate];
    let currentSpread = 0;
    let spread = Object.assign({
        chanceFunc: value => value / 2,
        amountFunc: value => value / 2
    }, options);

    while (coords.length) {
        currentSpread++;
        if (currentSpread > spread.max) return
        const newCoords = [];

        for (const coord of coords) {
            for (let index = spread.amount; index > 0; index--) {
                if (Math.random() <= spread.chance) {
                    const newCoord = {
                        x: coord.x + randInt(vectorMap.x[0], vectorMap.x[1]),
                        y: coord.y + randInt(vectorMap.y[0], vectorMap.y[1]),
                        z: coord.z + randInt(vectorMap.z[0], vectorMap.z[1])
                    };
                    const newCoordString = locationToString(newCoord);
                    if (blocks.has(newCoordString)) {
                        blocks.add(newCoordString);
                        newCoords.push(newCoord);
                        callback(newCoord);
                    }
                }
            }
        }
        coords = newCoords;
        Object.assign(spread, {
            chance: spread.chanceFunc(spread.chance),
            amount: spread.amountFunc(spread.amount)
        });
    }
}

/**
   * Gets all blocks that can be filled starting from a single location and returns them and the edges, alternatively callbacks can also be used.
   * @arg {object} origin - Base coordinates, which the function fills its surounding area from.
   * @arg {number} origin.x - Integer of the base X coordinate.
   * @arg {number} origin.y - Integer of the base Y coordinate.
   * @arg {number} origin.z - Integer of the base Z coordinate.
   * @arg {Dimension} dimension - The dimension which the function anlyzes for the fill.
   * @arg {string[]} options.whitelist - Block IDs of the blocks that can be filled.
   * @arg {number} options.maxDistance - Integer between 0 and Infinity, it defines the maximal distance each coordinate can take.
   * @arg {number[][]} options.vectorMap - Array of vector coordinates defined as Arrays of 3 Numbers that the function attempts to fill.
   * @returns {undefined}
**/
function getAreaFill(origin, dimension, options, innerCallback, outerCallback) {
    const fill = Object.assign({
        whitelist: ['minecraft:air'],
        maxDistance: 256,
        vectorMap: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
    },options);
    
    const coords = [origin];
    const checkedBlocks = new Set();
    while (coords.length) {
        const coord = coords.shift();
        if (outsideDistance(coord,origin,fill.maxDistance)) continue;
        const currentBlock = dimension.getBlock(new BlockLocation(coord.x,coord.y,coord.z));
        if (includes(fill.whitelist,currentBlock.typeId)) {
            innerCallback(coord);
            for (const vector of fill.vectorMap) {
                const newCoord = sumVectors(coord,vector);
                const newCoordString = locationToString(newCoord)
                if (!checkedBlocks.has(newCoordString)) {
                    coords.push(newCoord);
                }
            }
        } else {
            outerCallback(coord);
        }
        checkedBlocks.add(locationToString(coord));
    }
}

export {getTopBlock, getTopSolidBlock, getClosestEmptyBlock, getAreaFill, createRandomSpread}

function containsArray(array,item) {
    const indexes = item.length;
    let found = false;
    arrayLoop: 
    for (const element of array) {
        for (let index = 0; index < indexes; index++) {
            if (!(element[index] === item[index])) {
                continue arrayLoop
            }
        }
        found = true;
        break arrayLoop 
    }
    return found
}

function randInt(min, max) {
    max++;
    return Math.floor(Math.random() * (max - min) + min);
}

function locationToString(location) {
    return `${location.x},${location.y},${location.z}`;
}

function outsideDistance(locationA,locationB,distance) {
    return (
        Math.abs(locationA.x - locationB.x) > distance ||
        Math.abs(locationA.y - locationB.y) > distance ||
        Math.abs(locationA.z - locationB.z) > distance
    )
}

function outsideDistanceSquered(locationA,locationB,distance) {
    return (
        (locationA.x-locationB.x)**2+
        (locationA.y-locationB.y)**2+
        (locationA.z-locationB.z)**2
    ) > distance**2;
}

//!new filler algorithm - start with 6 main vectors with set children vectors which are vectors
//!that are sent by the main vector to start checking too