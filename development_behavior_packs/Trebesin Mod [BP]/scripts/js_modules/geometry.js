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
import { mapArray } from './array';
import { sumVectors } from './vector';

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
export function getGridLine(coords,options = {},callback = null) {
    let {stepBy, round} = Object.assign({stepBy:1,round:true},options);
    const resultCoords = !callback ? [] : undefined;
    let differences = [
        coords[1].x - coords[0].x,
        coords[1].y - coords[0].y,
        coords[1].z - coords[0].z
    ];
    
    const steps = Math.max(...mapArray(differences,num => Math.abs(num)));

    if (stepBy < 0) {
        stepBy = steps/-stepBy;
    }
    if (stepBy > 0) {
        stepBy = steps/Math.round(steps/stepBy);
    } 
    if (stepBy === 0) {
        stepBy = 1;
    }

    const portions = mapArray(differences,num => num/steps);
    
    for (let step = 0;step <= steps;step += stepBy) {
        const x = coords[0].x + (round ? Math.round(portions[0] * step) : portions[0] * step);
        const y = coords[0].y + (round ? Math.round(portions[1] * step) : portions[1] * step);
        const z = coords[0].z + (round ? Math.round(portions[2] * step) : portions[2] * step);
        if (callback) {
            callback({x,y,z});
        } else {
            resultCoords.push({x,y,z});
        }
    }
    return resultCoords;
}


export function getGridBlock(coords,options = {},callback = null) {
    const {stepBy,hollow,width} = Object.assign({stepBy:{x:1,y:1,z:1},hollow:false,width:1},options);
    const resultCoords = !callback ? [] : undefined;
    const maxCorner = {
        x: Math.max(coords[0].x,coords[1].x),
        y: Math.max(coords[0].y,coords[1].y),
        z: Math.max(coords[0].z,coords[1].z)
    };
    const minCorner = {
        x: Math.min(coords[0].x,coords[1].x),
        y: Math.min(coords[0].y,coords[1].y),
        z: Math.min(coords[0].z,coords[1].z)
    };

    for (const axis in stepBy) {
        const steps = maxCorner[axis] - minCorner[axis];
        if (stepBy[axis] < 0) {
            stepBy[axis] = steps/-stepBy[axis];
        }
        if (stepBy[axis] > 0) {
            stepBy[axis] = steps/Math.round(steps/stepBy[axis]);
        }
        if (stepBy[axis] === 0) {
            stepBy[axis] = 1;
        }
    }

    for (let x = maxCorner.x;x >= minCorner.x;x -= stepBy.x) {
        for (let y = maxCorner.y;y >= minCorner.y;y -= stepBy.y) {
            for (let z = maxCorner.z;z >= minCorner.z;z -= stepBy.z) {
                if (hollow && !(
                    x > maxCorner.x - width ||
                    y > maxCorner.y - width ||
                    z > maxCorner.z - width ||
                    x < minCorner.x + width ||
                    y < minCorner.y + width ||
                    z < minCorner.z + width 
                )) continue;

                if (callback) {
                    callback({x,y,z});
                } else {
                    resultCoords.push({x,y,z});
                }
            }
        }
    }

    return resultCoords;
}

export function generateBlockPyramid(startCoord,steps = 10,callback) {
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
            const location = startCoord;
            for (let index = 0;index < vectorDefinitions.primary.length;index++) {
                sentVectors.push({
                    location: location,
                    definition: vectorDefinitions.primary[index]
                });
            }
            for (let index = 0;index < vectorDefinitions.tertiary.length;index++) {
                sentVectors.push({
                    location: location,
                    definition: vectorDefinitions.tertiary[index]
                });
            }
            callback(location);
        }
        for (let index = 0;index < lastLength;index++) {
            const vector = sentVectors[index];
            const location = sumVectors(vector.location,vector.definition.vector);
            vector.location = location;
            callback(location);
            if (vector.definition.sends) {
                for (let sendIndex = 0;sendIndex < vector.definition.sends.length;sendIndex++) {
                    sentVectors.push({
                        location: location,
                        definition: vector.definition.sends[sendIndex]
                    });
                }
            }
        }
    }
}

function getGridTriangle(verticies,options = {},callback = null) {

}

function withinBounds(coords,coord) {
    //* check if block is within a selection
}