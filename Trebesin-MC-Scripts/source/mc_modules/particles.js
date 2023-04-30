import * as Mc from '@minecraft/server';
import { arrayDifference } from '../js_modules/array';
import { getGridLine } from '../js_modules/geometry';
import * as VectorMath from '../js_modules/vectorMath';
import { logMessage } from '../plugins/debug/debug';
import { EDGE_AXES, EDGE_COORDS } from './constants';
export function spawnBlockSelection(particle, coords, dimension, molang) {
    const cornerMin = [
        Math.min(coords[0].x, coords[1].x),
        Math.min(coords[0].y, coords[1].y),
        Math.min(coords[0].z, coords[1].z)
    ];
    const cornerMax = [
        Math.max(coords[0].x, coords[1].x),
        Math.max(coords[0].y, coords[1].y),
        Math.max(coords[0].z, coords[1].z)
    ];
    const corners = [cornerMin, cornerMax];
    for (let mainAxis = 0; mainAxis < 3; mainAxis++) {
        const otherAxis = arrayDifference([0, 1, 2], [mainAxis]);
        for (let axisPoint = cornerMin[mainAxis]; axisPoint <= cornerMax[mainAxis] + 1; axisPoint++) {
            for (let corner0 = 0; corner0 < corners.length; corner0++) {
                for (let corner1 = 0; corner1 < corners.length; corner1++) {
                    const location = [];
                    location[mainAxis] = axisPoint;
                    location[otherAxis[0]] = corners[corner0][otherAxis[0]] + corner0;
                    location[otherAxis[1]] = corners[corner1][otherAxis[1]] + corner1;
                    const spawnLocation = { x: location[0], y: location[1], z: location[2] };
                    dimension.spawnParticle(particle, spawnLocation, molang);
                }
            }
        }
    }
}
export function spawnLine(particle, coords, dimension, molang, stepBy = 1) {
    getGridLine(coords, { stepBy, round: false }, (coord) => {
        dimension.spawnParticle(particle, coord, molang);
    });
}
export function highlightBlockCoords(particle, coords, dimension, molang) {
    const blocksSet = createLocationSet(coords);
    for (let blockIndex = 0; blockIndex < coords.length; blockIndex++) {
        const block = coords[blockIndex];
        for (let edgeAxisIndex = 0; edgeAxisIndex < EDGE_AXES.length; edgeAxisIndex++) {
            const edgeAxis = EDGE_AXES[edgeAxisIndex];
            for (let edgeCoordIndex = 0; edgeCoordIndex < EDGE_COORDS.length; edgeCoordIndex++) {
                const edgeCoord = EDGE_COORDS[edgeCoordIndex];
                const sideALoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                const sideACoord = sumLocations(block, sideALoc);
                const sideABlock = blocksSet.has(`${sideACoord.x},${sideACoord.y},${sideACoord.z}`);
                const sideBLoc = {};
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const sideBCoord = sumLocations(block, sideBLoc);
                const sideBBlock = blocksSet.has(`${sideBCoord.x},${sideBCoord.y},${sideBCoord.z}`);
                const cornerLoc = {};
                cornerLoc[edgeAxis[0]] = edgeCoord[0];
                cornerLoc[edgeAxis[1]] = edgeCoord[1];
                const cornerCoord = sumLocations(block, cornerLoc);
                const cornerBlock = blocksSet.has(`${cornerCoord.x},${cornerCoord.y},${cornerCoord.z}`);
                if ((!cornerBlock && sideABlock && sideBBlock) || (!sideABlock && !sideBBlock)) {
                    drawCorner(block, cornerLoc, (location) => {
                        dimension.spawnParticle(particle, location, molang);
                    });
                }
            }
        }
    }
}
export function getCornerLocations(coords, callback) {
    const blocksSet = createLocationSet(coords);
    for (let blockIndex = 0; blockIndex < coords.length; blockIndex++) {
        const block = coords[blockIndex];
        for (let edgeAxisIndex = 0; edgeAxisIndex < EDGE_AXES.length; edgeAxisIndex++) {
            const edgeAxis = EDGE_AXES[edgeAxisIndex];
            for (let edgeCoordIndex = 0; edgeCoordIndex < EDGE_COORDS.length; edgeCoordIndex++) {
                const edgeCoord = EDGE_COORDS[edgeCoordIndex];
                const sideALoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                const sideACoord = sumLocations(block, sideALoc);
                const sideABlock = blocksSet.has(`${sideACoord.x},${sideACoord.y},${sideACoord.z}`);
                const sideBLoc = {};
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const sideBCoord = sumLocations(block, sideBLoc);
                const sideBBlock = blocksSet.has(`${sideBCoord.x},${sideBCoord.y},${sideBCoord.z}`);
                const cornerLoc = {};
                cornerLoc[edgeAxis[0]] = edgeCoord[0];
                cornerLoc[edgeAxis[1]] = edgeCoord[1];
                const cornerCoord = sumLocations(block, cornerLoc);
                const cornerBlock = blocksSet.has(`${cornerCoord.x},${cornerCoord.y},${cornerCoord.z}`);
                if ((!cornerBlock && sideABlock && sideBBlock) || (!sideABlock && !sideBBlock)) {
                    drawCorner(block, cornerLoc, callback);
                }
            }
        }
    }
}
export function getEdgeLocations(coords, callback) {
    const blocksSet = createLocationSet(coords);
    for (let blockIndex = 0; blockIndex < coords.length; blockIndex++) {
        const block = coords[blockIndex];
        for (let edgeAxisIndex = 0; edgeAxisIndex < EDGE_AXES.length; edgeAxisIndex++) {
            const edgeAxis = EDGE_AXES[edgeAxisIndex];
            for (let edgeCoordIndex = 0; edgeCoordIndex < EDGE_COORDS.length; edgeCoordIndex++) {
                const edgeCoord = EDGE_COORDS[edgeCoordIndex];
                const sideALoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                const sideACoord = sumLocations(block, sideALoc);
                const sideABlock = blocksSet.has(`${sideACoord.x},${sideACoord.y},${sideACoord.z}`);
                const sideBLoc = {};
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const sideBCoord = sumLocations(block, sideBLoc);
                const sideBBlock = blocksSet.has(`${sideBCoord.x},${sideBCoord.y},${sideBCoord.z}`);
                const cornerLoc = {};
                cornerLoc[edgeAxis[0]] = edgeCoord[0];
                cornerLoc[edgeAxis[1]] = edgeCoord[1];
                const cornerCoord = sumLocations(block, cornerLoc);
                const cornerBlock = blocksSet.has(`${cornerCoord.x},${cornerCoord.y},${cornerCoord.z}`);
                if ((!cornerBlock && sideABlock && sideBBlock) || (!sideABlock && !sideBBlock)) {
                    drawEdge(block, cornerLoc, callback);
                }
            }
        }
    }
}
export function drawEdge(origin, corner, callback) {
    const otherAxis = getStaleAxis(corner);
    const particleCoord = getCornerOffset(origin, corner);
    callback(particleCoord, otherAxis);
}
export function drawCorner(origin, corner, callback) {
    const otherAxis = getStaleAxis(corner);
    const particleCoord = getCornerOffset(origin, corner);
    for (let staleAxisStep = 0; staleAxisStep <= 1; staleAxisStep++) {
        const staleAxisOffset = {};
        staleAxisOffset[otherAxis] = staleAxisStep;
        const particleLocation = sumLocations(particleCoord, staleAxisOffset);
        callback(particleLocation);
    }
}
/**
 *
 * @param {string} particle
 * @param {Vector3} coords
 * @param {Mc.Dimension} dimension
 * @param {Mc.MolangVariableMap} molang
 */
export function spawnBox(particle, coords, dimension, molang, edgeOffset = 0.005) {
    for (const axis of ['x', 'y', 'z']) {
        for (const addition of [-edgeOffset, 1 + edgeOffset]) {
            const addedVector = { x: 0, y: 0, z: 0 };
            addedVector[axis] = addition;
            dimension.spawnParticle(`${particle}${axis}`, VectorMath.sum(coords, addedVector), molang);
        }
    }
}
/**
 *
 * @param {string} particle
 * @param {Vector3} coords
 * @param {Mc.Dimension} dimension
 * @param {Mc.MolangVariableMap} molang
 */
export function spawnBigBox(particle, coords, dimension, molang, span, edgeOffset) {
    const additions = [-edgeOffset, edgeOffset];
    for (const axis of ['x', 'y', 'z']) {
        for (let i = 0; i < 2; i++) {
            let addition = additions[i];
            if (i === 1) {
                addition = addition + span[axis];
            }
            const addedVector = { x: 0, y: 0, z: 0 };
            addedVector[axis] = addition;
            dimension.spawnParticle(`${particle}${axis}`, VectorMath.sum(coords, addedVector), molang);
        }
    }
}
/**
 *
 * @param {any[]} array
 * @param {Function} predicate
 * @returns {number}
 */
function maxIndex(array, predicate) {
    let maxIndex = 0;
    for (let index = 1; index < array.length; index++) {
        const item = predicate(array[index]);
        if (item > predicate(array[maxIndex]))
            maxIndex = index;
    }
    return maxIndex;
}
/**
 *
 * @param {import('../js_modules/vectorMath').Vector3[]} locations
 * @param {number[]} expansionAmount
 */
export function expandArea(locations, expansionAmounts) {
    let newLocations = [];
    const maxIndexes = {
        x: maxIndex(locations, (item) => item.x),
        y: maxIndex(locations, (item) => item.y),
        z: maxIndex(locations, (item) => item.z)
    };
    for (let locationIndex = 0; locationIndex < locations.length; locationIndex++) {
        const location = locations[locationIndex];
        const newLocation = {};
        for (const axis in location) {
            newLocation[axis] = location[axis] + expansionAmounts[(maxIndexes[axis] === locationIndex ? 1 : 0)];
        }
        newLocations.push(newLocation);
    }
    return newLocations;
}
//TODO origin vector will prolly be needed to be define beforehand in order to manage rotation and flipping that is maintained to the origin
//TODO infact we might need to flip x with z or something and this system wouldnt allow for that 
//TODO we need to create more powerful function
/**
 *
 * @param {string} particle
 * @param {import('../js_modules/vectorMath').Vector3[]} corners
 * @param {Mc.Dimension} dimension
 * @param {Mc.MolangVariableMap} molang
 */
export function spawnLineBox(particleName, corners, dimension, molang) {
    const appliedCorners = expandArea(corners, [0, 1]);
    const span = VectorMath.sub(appliedCorners[0], appliedCorners[1]);
    for (const axis of ['x', 'y', 'z']) {
        const absoluteSpan = Math.abs(span[axis]);
        const direction = span[axis] < 0 ? 1 : -1;
        const vector = { x: 0, y: 0, z: 0 };
        vector[axis] = direction;
        let finalLocation = VectorMath.copy(appliedCorners[1]);
        finalLocation[axis] = appliedCorners[0][axis];
        for (let spawnAxis of ['x', 'y', 'z']) {
            let spawnLocation = VectorMath.copy(appliedCorners[0]);
            if (spawnAxis != axis) {
                spawnLocation[spawnAxis] = appliedCorners[1][spawnAxis];
            }
            molang.setSpeedAndDirection(`variable.size`, absoluteSpan, vector);
            dimension.spawnParticle(particleName, spawnLocation, molang);
        }
        molang.setSpeedAndDirection(`variable.size`, absoluteSpan, vector);
        dimension.spawnParticle(particleName, finalLocation, molang);
    }
}
/**
 *
 * @param {import('../js_modules/vectorMath').Vector3[]} corners
 * @param {Mc.Color} defaultColor
 */
export function generateLineBox(corners, defaultColor) {
    const particleDefinitions = [];
    const appliedCorners = expandArea(corners, [0, 1]);
    //~ Prototype code for axis colors
    const minCorner = VectorMath.getMinimalVector(appliedCorners);
    //~ Prototype code for axis colors
    const span = VectorMath.sub(appliedCorners[1], appliedCorners[0]);
    for (const axis of ['x', 'y', 'z']) {
        //* This is a loop where the direction of the Particle is defined
        //* 4 Particles of each direction form the box
        const direction = { x: 0, y: 0, z: 0 };
        direction[axis] = span[axis];
        const length = Math.abs(direction[axis]);
        for (let spawnAxis of ['x', 'y', 'z']) {
            //* Here we take a spawn location, which is the 1st corner and then apply to it 1 coordinate of the other corner,
            //* unless the axis is the same, that's what spawns the particle on the original corner location
            const location = VectorMath.copy(appliedCorners[0]);
            if (spawnAxis != axis) {
                location[spawnAxis] = appliedCorners[1][spawnAxis];
            }
            //~ Prototype code for axis colors
            const color = directionLiesOnOrigin(location, direction, minCorner) ? {
                red: axis === 'x' ? 1 : 0,
                green: axis === 'y' ? 1 : 0,
                blue: axis === 'z' ? 1 : 0,
                alpha: defaultColor.alpha
            } : defaultColor;
            //~ Prototype code for axis colors
            particleDefinitions.push({
                location, direction, length, color
            });
        }
        //* Here we take the 2nd corner and we apply to its axis that is rn the direction coordinate of the 1st one
        //* That is essentially spawning it on the opposite side
        const location = VectorMath.copy(appliedCorners[1]);
        location[axis] = appliedCorners[0][axis];
        //~ Prototype code for axis colors
        const color = directionLiesOnOrigin(location, direction, minCorner) ? {
            red: axis === 'x' ? 1 : 0,
            green: axis === 'y' ? 1 : 0,
            blue: axis === 'z' ? 1 : 0,
            alpha: defaultColor.alpha
        } : defaultColor;
        //~ Prototype code for axis colors
        particleDefinitions.push({
            location, direction, length, color
        });
    }
    return particleDefinitions;
}
/**
 * Helper function to proccess the `location` and `direction` vectors and checks if one of its ends lies on the `origin`.
 * @param {object} vectors
 * @param {import('../js_modules/vectorMath').Vector3} location
 * @param {import('../js_modules/vectorMath').Vector3} direction
 * @param {import('../js_modules/vectorMath').Vector3} origin
 */
function directionLiesOnOrigin(location, direction, origin) {
    return (VectorMath.compare(location, origin) ||
        VectorMath.similar(VectorMath.sum(location, direction), origin, 0.1));
}
/**
 * @param {string} particleName ID of the particle to spawn.
 * @param {Mc.Dimension} dimension The dimension where the particle should spawn.
 * @param {VectorMath.Vector3} location The origin location of the line particle/
 * @param {VectorMath.Vector3} direction Direction the line particle is pointing towards from the origin.
 * @param {number} length The length of the particle.
 * @param {number} time The time in seconds the particle should be alive for.
 * @param {Mc.Color} color Color the particle should have represneted in RGBA intensity 0-1.
 */
export function spawnParticleLine(particleName, dimension, location, direction, length = 1, time = 1, color = { red: 0, green: 0, blue: 0, alpha: 1 }) {
    const molang = new Mc.MolangVariableMap();
    molang.setSpeedAndDirection(`variable.time`, time, { x: 0, y: 0, z: 0 });
    molang.setSpeedAndDirection(`variable.size`, length, direction);
    molang.setColorRGBA(`variable.color`, color);
    dimension.spawnParticle(particleName, location, molang);
}
export function createLocationSet(locations) {
    const locationSet = new Set();
    for (let locationIndex = 0; locationIndex < locations.length; locationIndex++) {
        const location = locations[locationIndex];
        locationSet.add(`${location.x},${location.y},${location.z}`);
    }
    return locationSet;
}
export function createLocationSet2(locations) {
    const locationSet = new Set();
    for (let locationIndex = 0; locationIndex < locations.length; locationIndex++) {
        const location = locations[locationIndex][0];
        const axis = locations[locationIndex][1];
        locationSet.add(`${location.x},${location.y},${location.z},${axis}`);
    }
    return locationSet;
}
export function locationToString(location, axis) {
    return `${location.x},${location.y},${location.z},${axis}`;
}
export function stringToLocation(string) {
    const positionArray = string.split(',');
    return [
        {
            x: parseInt(positionArray[0]),
            y: parseInt(positionArray[1]),
            z: parseInt(positionArray[2])
        },
        positionArray[3]
    ];
}
export function sumLocations(locationA, locationB) {
    return {
        x: (locationA.x ?? 0) + (locationB.x ?? 0),
        y: (locationA.y ?? 0) + (locationB.y ?? 0),
        z: (locationA.z ?? 0) + (locationB.z ?? 0)
    };
}
export function getStaleAxis(coord) {
    if ((coord.x ?? 0) === 0)
        return 'x';
    if ((coord.y ?? 0) === 0)
        return 'y';
    if ((coord.z ?? 0) === 0)
        return 'z';
}
export function getCornerOffset(origin, corner) {
    return {
        x: origin.x + (corner.x === 1 ? 1 : 0),
        y: origin.y + (corner.y === 1 ? 1 : 0),
        z: origin.z + (corner.z === 1 ? 1 : 0)
    };
}
