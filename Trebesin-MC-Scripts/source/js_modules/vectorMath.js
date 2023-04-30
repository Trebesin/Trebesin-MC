/*
    "vectorMath.js" - Helper functions to work with vectors.
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
/**
 * @typedef Vector3
 * @property {number} x Value of the vector on the X axis.
 * @property {number} y Value of the vector on the Y axis.
 * @property {number} z Value of the vector on the Z axis.
 */
/**
 * @param {Vector3} vector
 * @returns {number}
 **/
export function getLength(vector) {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}
/**
 * @param {Vector3} vector
 * @returns {number}
 **/
export function getLengthSquared(vector) {
    return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}
/**
 * @param {Vector3} vector
 * @param {number} length
 **/
export function setLength(vector, length) {
    const vectorLength = getLength(vector);
    const ratio = length / vectorLength;
    vector.x *= ratio;
    vector.y *= ratio;
    vector.z *= ratio;
    return vector;
}
/**
 * Sums 2 vectors together.
 * @param {Vector3} vectorA First vector to sum.
 * @param {Vector3} vectorB Second vector to sum.
 * @returns {Vector3} New object with the result of the sum of the vector.
 */
export function sum(vectorA, vectorB) {
    return { x: vectorA.x + vectorB.x, y: vectorA.y + vectorB.y, z: vectorA.z + vectorB.z };
}
/**
 * Subs 2 vectors together.
 * @param {Vector3} vectorA First vector to sub.
 * @param {Vector3} vectorB Second vector to sub.
 * @returns {Vector3} New object with the result of the sub of the vector.
 */
export function sub(vectorA, vectorB) {
    return { x: vectorA.x - vectorB.x, y: vectorA.y - vectorB.y, z: vectorA.z - vectorB.z };
}
/**
 * Scalar vector multiplication.
 * @param {Vector3} vector Vector to multiply.
 * @param {number} amount Scalar multiplicator.
 * @returns {Vector3} Result of the scalar multiplication.
 */
export function multiply(vector, amount) {
    return { x: vector.x * amount, y: vector.y * amount, z: vector.z * amount };
}
/**
 * Scalar vector division.
 * @param {Vector3} vector Vector to divide.
 * @param {number} amount Scalar divider.
 * @returns {Vector3} Result of the scalar division.
 */
export function divide(vector, amount) {
    return { x: vector.x / amount, y: vector.y / amount, z: vector.z / amount };
}
/**
 * Vector multiplication.
 * @param {Vector3} vectorA Vector to multiply.
 * @param {Vector3} vectorB vector multiplicator.
 * @returns {Vector3} Result of the vector multiplication.
 */
export function vectorMultiply(vectorA, vectorB) {
    return { x: vectorA.x * vectorB.x, y: vectorA.y * vectorB.y, z: vectorA.z * vectorB.z };
}
/**
 * Vector division.
 * @param {Vector3} vector Vector to divide.
 * @param {Vector3} vectorB Vector divider.
 * @returns {Vector3} Result of the vector division.
 */
export function vectorDivide(vectorA, vectorB) {
    return { x: vectorA.x / vectorB.x, y: vectorA.y / vectorB.y, z: vectorA.z / vectorB.z };
}
/**
 * Copies a vector into a new object.
 * @param {Vector3} vector Vector to copy.
 * @returns {Vector3} New object of the same vector.
 */
export function copy(vector) {
    return { x: vector.x, y: vector.y, z: vector.z };
}
/**
 * Floors all the axis of the vector.
 * @param {Vector3} vector Vector to floor.
 * @returns {Vector3} Result of flooring all axis of the vector.
 */
export function floor(vector) {
    return { x: Math.floor(vector.x), y: Math.floor(vector.y), z: Math.floor(vector.z) };
}
/**
 * Rounds all the axis of the vector.
 * @param {Vector3} vector Vector to round.
 * @returns {Vector3} Result of rounding all axis of the vector.
 */
export function round(vector) {
    return { x: Math.round(vector.x), y: Math.round(vector.y), z: Math.round(vector.z) };
}
/**
 *  Changes all axis of the vector to their absolute values.
 * @param {Vector3} vector Vector to get absolute value of.
 * @returns {Vector3} Result of absolute values of all the axis of the vector.
 */
export function absolute(vector) {
    return { x: Math.abs(vector.x), y: Math.abs(vector.y), z: Math.abs(vector.z) };
}
/**
 * Returns a value that indicates if the vectors are both the exact same or not.
 * @param {Vector3} vectorA
 * @param {Vector3} vectorB
 * @returns {boolean}
 */
export function compare(vectorA, vectorB) {
    return (vectorA.x === vectorB.x && vectorA.y === vectorB.y && vectorA.z === vectorB.z);
}
/**
 * Returns a value that indicates if the vectors are similar according to the `margin`.
 * @param {Vector3} vectorA
 * @param {Vector3} vectorB
 * @param {number} margin
 * @returns {boolean}
 */
export function similar(vectorA, vectorB, margin) {
    return (Math.abs(vectorA.x - vectorB.x) <= margin &&
        Math.abs(vectorA.y - vectorB.y) <= margin &&
        Math.abs(vectorA.z - vectorB.z) <= margin);
}
export function getDirectionFace(vector) {
    const absVector = getAbsoluteVector(vector);
    if (absVector.x > absVector.y && absVector.x > absVector.z) {
        if (vector.x > 0)
            return 'west';
        else
            return 'east';
    }
    if (absVector.z > absVector.x && absVector.z > absVector.y) {
        if (vector.z > 0)
            return 'north';
        return 'south';
    }
    if (absVector.y > absVector.x && absVector.y > absVector.z) {
        if (vector.y > 0)
            return 'down';
        else
            return 'up';
    }
}
/**
 * Returns a vector with each axis containing the maximal value found for that axis out of all the input vectors.
 * @param {Vector3[]} vectors
 * @returns {Vector3}
 */
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
/**
 * Returns a vector with each axis containing the minimal value found for that axis out of all the input vectors.
 * @param {Vector3[]} vectors
 * @returns {Vector3}
 */
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
 * Performs a basic vector rotation.
 * @param {Vector3} vector Vector that will be rotated by a specified angle on a specified axis.
 * @param {number} angle Angle in radians.
 * @param {'x' | 'y' | 'z'} axis Axis to rotate the vector along.
 * @returns {Vector3}
 */
export function rotate(vector, angle, axis) {
    const rotatedVector = {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
    const angleSin = Math.sin(angle);
    const angleCos = Math.cos(angle);
    switch (axis) {
        case 'x':
            {
                rotatedVector.y = vector.y * angleCos - vector.z * angleSin;
                rotatedVector.z = vector.y * angleSin + vector.z * angleCos;
            }
            break;
        case 'y':
            {
                rotatedVector.x = vector.x * angleCos + vector.z * angleSin;
                rotatedVector.z = vector.z * angleCos - vector.x * angleSin;
            }
            break;
        case 'z':
            {
                rotatedVector.x = vector.x * angleCos - vector.y * angleSin;
                rotatedVector.y = vector.x * angleSin + vector.y * angleCos;
            }
            break;
        default: throw new Error('Invalid Axis specified!');
    }
    return rotatedVector;
}
/**
 * Function that flips a `vector` on an `axis` relative to a defined `flipVector`.
 * @param {Vector3} vector
 * @param {Vector3} flipVector
 * @param {'x' | 'y' | 'z'} axis
 * @returns {Vector3} Result of flipping the vector along the selected axis relative to the defined point.
 */
export function flip(vector, flipVector, axis) {
    const flippedVector = copy(vector);
    flippedVector[axis] = flipVector[axis] - (vector[axis] - flipVector[axis]);
    return flippedVector;
}
/**
 * Performs a basic vector rotation in a batch on multiple vectors. The main advantage of this is that `Math.sin` and `Math.cos` will only be called once during the entire function.
 * @param {Vector3[]} vectors Array of vectors that will be each rotated by a specified angle on a specified axis.
 * @param {number} angle Angle in radians.
 * @param {'x' | 'y' | 'z'} axis Axis to rotate the vector along.
 * @param {Vector3Callback} callback Callback that gets called with the result of the operation.
 */
export function rotateVectors(vectors, angle, axis, callback) {
    const angleSin = Math.sin(angle);
    const angleCos = Math.cos(angle);
    for (let index = 0; index < vectors.length; index++) {
        const vector = vectors[index];
        const rotatedVector = {
            x: vector.x,
            y: vector.y,
            z: vector.z
        };
        switch (axis) {
            case 'x':
                {
                    rotatedVector.y = vector.y * angleCos - vector.z * angleSin;
                    rotatedVector.z = vector.y * angleSin + vector.z * angleCos;
                }
                break;
            case 'y':
                {
                    rotatedVector.x = vector.x * angleCos + vector.z * angleSin;
                    rotatedVector.z = vector.z * angleCos - vector.x * angleSin;
                }
                break;
            case 'z':
                {
                    rotatedVector.x = vector.x * angleCos - vector.y * angleSin;
                    rotatedVector.y = vector.x * angleSin + vector.y * angleCos;
                }
                break;
            default: throw new Error('Invalid Axis specified!');
        }
        callback(rotatedVector);
    }
}
/**
 * Performs a basic vector rotation. The angle is defined by its `sin` and `cos` values.
 * @param {Vector3[]} vectors Array of vectors that will be each rotated by a specified angle on a specified axis.
 * @param {object} angle Angle definition.
 * @param {number} angle.sin Sinus result of the angle.
 * @param {number} angle.cos Cosin result of the angle.
 * @param {'x' | 'y' | 'z'} axis Axis to rotate the vector along.
 * @returns {Vector3}
 */
export function rotateSinCos(vector, angle, axis) {
    const rotatedVector = {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
    switch (axis) {
        case 'x':
            {
                rotatedVector.y = vector.y * angle.cos - vector.z * angle.sin;
                rotatedVector.z = vector.y * angle.sin + vector.z * angle.cos;
            }
            break;
        case 'y':
            {
                rotatedVector.x = vector.x * angle.cos + vector.z * angle.sin;
                rotatedVector.z = vector.z * angle.cos - vector.x * angle.sin;
            }
            break;
        case 'z':
            {
                rotatedVector.x = vector.x * angle.cos - vector.y * angle.sin;
                rotatedVector.y = vector.x * angle.sin + vector.y * angle.cos;
            }
            break;
        default: throw new Error('Invalid Axis specified!');
    }
    return rotatedVector;
}
/**
 * Returns the first axis that contains the maximal value of all the axis of the vector.
 * @param {Vector3} vector
 * @returns {'x' | 'y' | 'z'}
 */
export function getMaxAxis(vector) {
    const maxAxis = 'x';
    for (const axis in vector) {
        if (vector[axis] > vector[maxAxis])
            maxAxis = axis;
    }
    return maxAxis;
}
/**
 * Returns the first axis that contains the minimal value of all the axis of the vector.
 * @param {Vector3} vector
 * @returns {'x' | 'y' | 'z'}
 */
export function getMinAxis(vector) {
    const minAxis = 'x';
    for (const axis in vector) {
        if (vector[axis] < vector[minAxis])
            minAxis = axis;
    }
    return minAxis;
}
//# Types / Constants
/**
 * @callback Vector3Callback Callback that gets called during a vector operation with multiple vector outputs.
 * @param {Vector3} vector Vector result of the operation.
 */ 

//# sourceMappingURL=vectorMath.js.map
