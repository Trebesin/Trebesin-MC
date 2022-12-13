/**
 * @param {object} vector 
 **/
function getVectorLength(vector) {
    return Math.sqrt(vector.x**2+vector.y**2+vector.z**2);
}
/**
 * @param {object} vector
 * @param {number} length
 **/
function setVectorLength(vector, length) {
    const vectorLength = getVectorLength(vector);
    const ratio = length/vectorLength;
    vector.x *= ratio;
    vector.y *= ratio;
    vector.z *= ratio;

    return vector
}

/**
 * Sums 2 vectors together.
 * @param {object} vectorA First vector to sum.
 * @param {object} vectorB Second vector to sum.
 * @returns {object} New object with the result of the sum of the vector.
 */
 function sumVectors(vectorA,vectorB) {
    return {x:vectorA.x+vectorB.x,y:vectorA.y+vectorB.y,z:vectorA.z+vectorB.z};
}

/**
 * Subs 2 vectors together.
 * @param {object} vectorA First vector to sub.
 * @param {object} vectorB Second vector to sub.
 * @returns {object} New object with the result of the sub of the vector.
 */
function subVectors(vectorA,vectorB) {
    return {x:vectorA.x-vectorB.x,y:vectorA.y-vectorB.y,z:vectorA.z-vectorB.z};
}

/**
 * Copies a vector into a new object.
 * @param {object} vector Vector to copy.
 * @returns {object} New object of the same vector.
 */
function copyVector(vector) {
    return {x:vector.x,y:vector.y,z:vector.z};
}


function compareVectors(vectorA,vectorB) {
    return (vectorA.x === vectorB.x && vectorA.y === vectorB.y && vectorA.z === vectorB.z);
}

export {setVectorLength,getVectorLength,sumVectors,subVectors,copyVector,compareVectors}