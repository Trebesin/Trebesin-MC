/*
    "vector.js" - Helper functions to work with vectors.
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
//!DEPRECATED - Left for backwards compatibility. Use vectorMath.js!
/**
 * @param {object} vector
 **/
export function getVectorLength(vector) {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}
/**
 * @param {object} vector
 * @param {number} length
 **/
export function setVectorLength(vector, length) {
    const vectorLength = getVectorLength(vector);
    const ratio = length / vectorLength;
    vector.x *= ratio;
    vector.y *= ratio;
    vector.z *= ratio;
    return vector;
}
/**
 * Sums 2 vectors together.
 * @param {object} vectorA First vector to sum.
 * @param {object} vectorB Second vector to sum.
 * @returns {object} New object with the result of the sum of the vector.
 */
export function sumVectors(vectorA, vectorB) {
    return { x: vectorA.x + vectorB.x, y: vectorA.y + vectorB.y, z: vectorA.z + vectorB.z };
}
/**
 * Subs 2 vectors together.
 * @param {object} vectorA First vector to sub.
 * @param {object} vectorB Second vector to sub.
 * @returns {object} New object with the result of the sub of the vector.
 */
export function subVectors(vectorA, vectorB) {
    return { x: vectorA.x - vectorB.x, y: vectorA.y - vectorB.y, z: vectorA.z - vectorB.z };
}
/**
 * Multiply vector.
 * @param {object} vector Vector to multiply.
 * @param {number} amount Multiplication.
 * @returns {object} Result of the vector multiplication.
 */
export function multiplyVector(vector, amount) {
    return { x: vector.x * amount, y: vector.y * amount, z: vector.z * amount };
}
/**
 * Copies a vector into a new object.
 * @param {object} vector Vector to copy.
 * @returns {object} New object of the same vector.
 */
export function copyVector(vector) {
    return { x: vector.x, y: vector.y, z: vector.z };
}
/**
 * Floors the vector.
 * @param {object} vector Vector to floor.
 * @returns {object} Result of flooring all axis of the vector.
 */
export function floorVector(vector) {
    return { x: Math.floor(vector.x), y: Math.floor(vector.y), z: Math.floor(vector.z) };
}
export function compareVectors(vectorA, vectorB) {
    return (vectorA.x === vectorB.x && vectorA.y === vectorB.y && vectorA.z === vectorB.z);
}
export function getAbsoluteVector(vector) {
    return { x: Math.abs(vector.x), y: Math.abs(vector.y), z: Math.abs(vector.z) };
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
