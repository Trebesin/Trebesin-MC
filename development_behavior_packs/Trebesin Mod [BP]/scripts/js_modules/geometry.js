import {mapArray} from './array';

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
function getGridLine(coords,options = {},callback = null) {
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


function getGridBlock(coords,options = {},callback = null) {
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

function getGridTriangle(verticies,options = {},callback = null) {

}

function withinBounds(coords,coord) {
    //* check if block is within a selection
}

export {getGridBlock,getGridLine}