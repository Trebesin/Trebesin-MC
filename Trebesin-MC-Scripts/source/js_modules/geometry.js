/*
    "geometry.js" - Helper functions to work with geometric shapes.
    Copyright (C) 2023  PavelDobCZ23

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { logMessage } from '../plugins/debug/debug';
import * as ArrayOps from './array';
import * as VectorMath from './vectorMath';
/**
 * Function that creates a line in 3D coordinate system.
 * @param {Object[]} coords Array specifing X,Y,Z starting and ending coordinates respectively.
 * @param {number} coords[].x X coordinate.
 * @param {number} coords[].y Y coordinate.
 * @param {number} coords[].z Z coordinate.
 * @param {Object} [options] Options defining behavior of the function.
 * @param {number} options.stepBy Increament of the loop generating the line. It will be automatically rounded to ensure it's dividable by the amount of steps. Negative values define the amount of steps instead.
 * @param {boolean} options.round Whether to round the calculated value added to the starting coordinate.
 * @param {Function} [callback] Callback that gets each step as an input, it will make the return `undefined`.
 * @returns {Object[]|undefined} Array containing X,Y,Z coordinates the line is composed of.
 */
export async function getGridLine(coordinates, callback, options = {}) {
    let { stepBy, round } = Object.assign({ stepBy: 1, round: true }, options);
    let difference = VectorMath.sub(coordinates[1], coordinates[0]);
    let absoluteDifference = VectorMath.absolute(difference);
    const steps = Math.max(absoluteDifference.x, absoluteDifference.y, absoluteDifference.z);
    if (stepBy < 0) {
        stepBy = steps / -stepBy;
    }
    if (stepBy > 0) {
        stepBy = steps / Math.round(steps / stepBy);
    }
    if (stepBy === 0) {
        stepBy = 1;
    }
    const portions = VectorMath.divide(difference, steps);
    for (let step = 0; step <= steps; step += stepBy) {
        let stepVector = VectorMath.multiply(portions, step);
        if (round)
            stepVector = VectorMath.round(stepVector);
        await callback(VectorMath.sum(coordinates[0], stepVector));
    }
}
export async function getBlockOutline(coordinates, callback, options = {}) {
    const { stepBy, width } = Object.assign({ stepBy: 1, width: 1 }, options);
    const span = VectorMath.sub(coordinates[1], coordinates[0]);
    //!! this code is repeated for particles and this
    for (const axis of ['x', 'y', 'z']) {
        //~Prototype width code
        const thickAxes = ArrayOps.arrayDifference(['x', 'y', 'z'], [axis]);
        //~Prototype width code
        const direction = { x: 0, y: 0, z: 0 };
        direction[axis] = span[axis];
        for (let spawnAxis of ['x', 'y', 'z']) {
            const location = VectorMath.copy(coordinates[0]);
            if (spawnAxis != axis) {
                location[spawnAxis] = coordinates[1][spawnAxis];
            }
            if (width > 1) {
                //~Prototype width code
                for (let thickAxis0 = 0; thickAxis0 < width; thickAxis0++)
                    for (let thickAxis1 = 0; thickAxis1 < width; thickAxis1++) {
                        const lineLocation = VectorMath.copy(location);
                        lineLocation[thickAxes[0]] += (((thickAxes[0] === spawnAxis) === (span[thickAxes[0]] < 0)) ? thickAxis0 : -thickAxis0);
                        lineLocation[thickAxes[1]] += (((thickAxes[1] === spawnAxis) === (span[thickAxes[1]] < 0)) ? thickAxis1 : -thickAxis1);
                        await getGridLine([lineLocation, VectorMath.sum(lineLocation, direction)], callback, { stepBy });
                    }
                //~Prototype width code
            }
            else {
                await getGridLine([location, VectorMath.sum(location, direction)], callback, { stepBy });
            }
        }
        const location = VectorMath.copy(coordinates[1]);
        location[axis] = coordinates[0][axis];
        if (width > 1) {
            //~Prototype width code
            for (let thickAxis0 = 0; thickAxis0 < width; thickAxis0++)
                for (let thickAxis1 = 0; thickAxis1 < width; thickAxis1++) {
                    const lineLocation = VectorMath.copy(location);
                    lineLocation[thickAxes[0]] += (span[thickAxes[0]] < 0 ? thickAxis0 : -thickAxis0);
                    lineLocation[thickAxes[1]] += (span[thickAxes[1]] < 0 ? thickAxis1 : -thickAxis1);
                    await getGridLine([lineLocation, VectorMath.sum(lineLocation, direction)], callback, { stepBy });
                }
            //~Prototype width code
        }
        else {
            await getGridLine([location, VectorMath.sum(location, direction)], callback, { stepBy });
        }
    }
}
export async function getGridBlock(coordinates, callback, options = {}) {
    const { stepBy, hollow, width } = Object.assign({ stepBy: { x: 1, y: 1, z: 1 }, hollow: false, width: 1 }, options);
    const maxCorner = VectorMath.getMaximalVector(coordinates);
    const minCorner = VectorMath.getMinimalVector(coordinates);
    let hollowMaxCorner, hollowMinCorner;
    if (hollow) {
        const widthVector = { x: width, y: width, z: width };
        hollowMaxCorner = VectorMath.sub(maxCorner, widthVector);
        hollowMinCorner = VectorMath.sum(minCorner, widthVector);
    }
    for (const axis in stepBy) {
        const steps = maxCorner[axis] - minCorner[axis];
        if (stepBy[axis] < 0) {
            stepBy[axis] = steps / -stepBy[axis];
        }
        if (stepBy[axis] > 0) {
            stepBy[axis] = steps / Math.round(steps / stepBy[axis]);
        }
        if (stepBy[axis] === 0) {
            stepBy[axis] = 1;
        }
    }
    for (let x = minCorner.x; x <= maxCorner.x; x += stepBy.x) {
        for (let y = minCorner.y; y <= maxCorner.y; y += stepBy.y) {
            for (let z = minCorner.z; z <= maxCorner.z; z += stepBy.z) {
                if (hollow && !(x > hollowMaxCorner.x ||
                    y > hollowMaxCorner.y ||
                    z > hollowMaxCorner.z ||
                    x < hollowMinCorner.x ||
                    y < hollowMinCorner.y ||
                    z < hollowMinCorner.z))
                    continue;
                await callback({ x, y, z });
            }
        }
    }
}
export function getMaximalVector(vectors) {
    const max = {
        x: vectors[0].x,
        y: vectors[0].y,
        z: vectors[0].z
    };
    for (const axis of ['x', 'y', 'z']) {
        for (const vector of vectors) {
            const savedMaxValue = max[axis];
            const currentValue = vector[axis];
            if (savedMaxValue < currentValue)
                max[axis] = currentValue;
        }
    }
    return max;
}
export function getMinimalVector(vectors) {
    const min = {
        x: vectors[0].x,
        y: vectors[0].y,
        z: vectors[0].z
    };
    for (const axis of ['x', 'y', 'z']) {
        for (const vector of vectors) {
            const savedMinValue = min[axis];
            const currentValue = vector[axis];
            if (savedMinValue > currentValue)
                min[axis] = currentValue;
        }
    }
    return min;
}
/**
 * Transforms a single block location of area 1\*1\*1 into a new array of block locations which fill out scaled area of a new scaled block location.
 * @param {VectorMath.Vector3} blockLocation Block location of area 1\*1\*1 to scale.
 * @param {VectorMath.Vector3} scaleVector Vector that defines the scale on each axis.
 * @returns {VectorMath.Vector3[]}
 */
export function scaleBlockLocation(blockLocation, scaleVector) {
    const scaledLocations = [];
    scaledLocations.push(VectorMath.vectorMultiply(blockLocation, scaleVector));
    for (const axis of ['x', 'y', 'z']) {
        const addedLocations = [];
        for (let spanStep = scaleVector[axis]; spanStep > 1; --spanStep) {
            const addedStep = Math.max(0, spanStep - 1);
            for (let locationIndex = 0; locationIndex < scaledLocations.length; ++locationIndex) {
                const location = scaledLocations[locationIndex];
                const scaledLocation = VectorMath.copy(location);
                scaledLocation[axis] += addedStep;
                addedLocations.push(scaledLocation);
            }
        }
        scaledLocations.push(...addedLocations);
    }
    return scaledLocations;
}
export function generateBlockPyramid(startCoord, steps = 10, callback) {
    const vectorDefinitions = {};
    //Tertiary vectors are sent at the beginning from the starting coordinate and also from the secondary and primary vectors. Those cover the whole Y axis.
    vectorDefinitions.tertiary = [
        {
            vector: { x: 0, y: 1, z: 0 }
        },
        {
            vector: { x: 0, y: -1, z: 0 }
        }
    ];
    //Secondary vectors are sent by the primary vectors. Those cover each X,Z quadrant of the area.
    vectorDefinitions.secondary = [
        {
            vector: { x: 0, y: 0, z: 1 },
            sends: vectorDefinitions.tertiary
        },
        {
            vector: { x: 0, y: 0, z: -1 },
            sends: vectorDefinitions.tertiary
        },
        {
            vector: { x: -1, y: 0, z: 0 },
            sends: vectorDefinitions.tertiary
        },
        {
            vector: { x: 1, y: 0, z: 0 },
            sends: vectorDefinitions.tertiary
        }
    ];
    //Primary vectors are sent at the beginning from the starting coordinate. Those are the edges between the X,Z quadrants of the area.
    vectorDefinitions.primary = [
        {
            vector: { x: 1, y: 0, z: 0 },
            sends: [vectorDefinitions.secondary[0], ...vectorDefinitions.tertiary]
        },
        {
            vector: { x: -1, y: 0, z: 0 },
            sends: [vectorDefinitions.secondary[1], ...vectorDefinitions.tertiary]
        },
        {
            vector: { x: 0, y: 0, z: 1 },
            sends: [vectorDefinitions.secondary[2], ...vectorDefinitions.tertiary]
        },
        {
            vector: { x: 0, y: 0, z: -1 },
            sends: [vectorDefinitions.secondary[3], ...vectorDefinitions.tertiary]
        }
    ];
    let sentVectors = [];
    for (let step = 0; step <= steps; step++) {
        const lastLength = sentVectors.length;
        if (step === 0) {
            const location = startCoord;
            for (let index = 0; index < vectorDefinitions.primary.length; index++) {
                sentVectors.push({
                    location: location,
                    definition: vectorDefinitions.primary[index]
                });
            }
            for (let index = 0; index < vectorDefinitions.tertiary.length; index++) {
                sentVectors.push({
                    location: location,
                    definition: vectorDefinitions.tertiary[index]
                });
            }
            callback(location);
        }
        for (let index = 0; index < lastLength; index++) {
            const vector = sentVectors[index];
            const location = VectorMath.sumVectors(vector.location, vector.definition.vector);
            vector.location = location;
            callback(location);
            if (vector.definition.sends) {
                for (let sendIndex = 0; sendIndex < vector.definition.sends.length; sendIndex++) {
                    sentVectors.push({
                        location: location,
                        definition: vector.definition.sends[sendIndex]
                    });
                }
            }
        }
    }
}
function getGridTriangle(verticies, options = {}, callback = null) {
}
function withinBounds(coords, coord) {
    //* check if block is within a selection
}

//# sourceMappingURL=geometry.js.map
