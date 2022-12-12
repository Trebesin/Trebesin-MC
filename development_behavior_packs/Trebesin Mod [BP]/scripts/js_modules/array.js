/**
 * @description Inserts value at the first empty index in the array and returns the index.
 * @param {Array} array - Array to insert the value into.
 * @param {*} value - Value to insert into the array.
 * @returns {Number} Index that the value was inserted to.
 **/
 function insertToArray(array, value) {
    for (let index = 0;true;index++) {
        if (array[index] == null) {
            array[index] = value;
            return index
        }
    }
}

/**
 * 
 * @param {Array} array - Array to get the mode of.
 * @returns {Array} Array of 2 values - first value is array of all the modes found and second is the amount of times each mode is found in the array.
 */
function getMode(array) {
    const items = new Map();
    let mode = [[null],-1];

    for (const item of array) {
        const value = items.get(item);
        if (value == null) {
            items.set(item, 1);
        } else {
            items.set(item, value+1);
        }
    }
    for (const item of items) {
        if (item[1] > mode[1]) {
            mode[0] = [item[0]];
            mode[1] = item[1];
        } else if (item[1] === mode[1]) {
            mode[0].push(item[0]);
        }
    }

    return mode
}


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


function subArrays(array1,array2) {
    const newArray = [];
    for (let index = 0;index < array1.length;index++) {
        newArray[index] = array1[index] - array2[index];
    }
    return newArray;
}

function range(start,end,step = 1) {
    if (end == null) {
        end = start;
        start = 0;
    }
    const rangeArray = [];
    let number = start;
    while (number < end) {
        newArray.push(number);
        number+=step;
    }
    return rangeArray
}

function arrayDifference(array,subArray) {
    return filter(array,(value) => !includes(subArray,value));
}

//*Built-in JS functions recreated
//!Faster
function includes(array,value) {
    for (let index = 0;index < array.length;index++) {
        if (array[index] === value) return true;
    }
    return false
}

function filter(array,condition) {
    const filterArray = [];
    for (let index = 0;index < array.length;index++) {
        if (condition(array[index],index,array)) filterArray.push(array[index]);
    }
    return filterArray
}

//!Slower
function findLast(array,condition,indexRange) {
    const startIndex = indexRange?.[0] ?? 0;
    const endIndex = indexRange?.[1] ?? array.length;
    for (let index = endIndex;index > startIndex;index--) {
        if (condition(array[index],index,array)) {
            return {value: array[index], index};
        }
    }
    return null;
}

function find(array,condition,indexRange) {
    const startIndex = indexRange?.[0] ?? 0;
    const endIndex = indexRange?.[1] ?? array.length;
    for (let index = startIndex;index < endIndex;index++) {
        if (condition(array[index],index,array)) {
            return {value: array[index], index};
        }
    }
    return null;
}

function mapArray(array,callback) {
    const mappedArray = [];
    for (let index = 0;index < array.length;index++) {
        mappedArray[index] = callback(array[index],index,array);
    }
    return mappedArray;
}

export {insertToArray, getMode, containsArray, mapArray, arrayDifference, includes, filter, range, find, findLast }