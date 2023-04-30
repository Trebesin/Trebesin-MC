/*
    "geometry.js" - Helper functions to work with arrays.
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
 * @description Inserts value at the first empty index in the array and returns the index.
 * @param {any[]} array - Array to insert the value into.
 * @param {*} value - Value to insert into the array.
 * @returns {number|undefined|null} Index that the value was inserted to.
 **/
export function insertToArray(array, value) {
    if (!Array.isArray(array))
        return null;
    for (let index = 0; index <= array.length; index++) {
        if (array[index] == null) {
            array[index] = value;
            return index;
        }
    }
}
/**
 * @description Deletes item from an array at a given index and shortenes the array if possible.
 * @param {any[]} array - Array to delete the item from.
 * @param {number} index - Index of the item to delete.
 * @returns {number} New length of the array.
 **/
export function deleteFromArray(array, index) {
    let newLength = 0;
    delete array[index];
    for (let index = 0; index < array.length; index++) {
        if (array[index] != null) {
            newLength = index + 1;
        }
    }
    array.length = newLength;
    return newLength;
}
/**
 * Creates an object from an array. Values are each corresponding items of the array and keys are the return values of the callback.
 * @param {any[]} array - Array to convert into an object.
 * @param {callback} value - Callback that gets passed `value`,`index` and `array`. Its return value is the key inside of the new object.
 * @returns {object} New generated object.
 **/
export function arrayToObject(array, callback) {
    const newObject = {};
    for (let index = 0; index < array.length; index++) {
        const value = array[index];
        const key = callback(value, index, array);
        newObject[key] = value;
    }
    return newObject;
}
/**
 *
 * @param {Array} array - Array to get the mode of.
 * @returns {Array} Array of 2 values - first value is array of all the modes found and second is the amount of times each mode is found in the array.
 */
export function getMode(array) {
    const items = new Map();
    let mode = [[null], -1];
    for (const item of array) {
        const value = items.get(item);
        if (value == null) {
            items.set(item, 1);
        }
        else {
            items.set(item, value + 1);
        }
    }
    for (const item of items) {
        if (item[1] > mode[1]) {
            mode[0] = [item[0]];
            mode[1] = item[1];
        }
        else if (item[1] === mode[1]) {
            mode[0].push(item[0]);
        }
    }
    return mode;
}
export function containsArray(array, item) {
    const indexes = item.length;
    let found = false;
    arrayLoop: for (const element of array) {
        for (let index = 0; index < indexes; index++) {
            if (!(element[index] === item[index])) {
                continue arrayLoop;
            }
        }
        found = true;
        break arrayLoop;
    }
    return found;
}
function subArrays(array1, array2) {
    const newArray = [];
    for (let index = 0; index < array1.length; index++) {
        newArray[index] = array1[index] - array2[index];
    }
    return newArray;
}
export function range(start, end, step = 1) {
    if (end == null) {
        end = start;
        start = 0;
    }
    const rangeArray = [];
    let number = start;
    while (number < end) {
        newArray.push(number);
        number += step;
    }
    return rangeArray;
}
export function arrayDifference(array, subArray) {
    return filter(array, (value) => !includes(subArray, value));
}
//*Built-in JS functions recreated
//!Faster
export function includes(array, value) {
    for (let index = 0; index < array.length; index++) {
        if (array[index] === value)
            return true;
    }
    return false;
}
export function filter(array, condition) {
    const filterArray = [];
    for (let index = 0; index < array.length; index++) {
        if (condition(array[index], index, array))
            filterArray.push(array[index]);
    }
    return filterArray;
}
//!Slower
export function findLast(array, condition, indexRange = null) {
    const startIndex = indexRange?.[0] ?? 0;
    const endIndex = indexRange?.[1] ?? array.length;
    for (let index = endIndex; index > startIndex; index--) {
        if (condition(array[index], index, array)) {
            return { value: array[index], index };
        }
    }
    return null;
}
export function find(array, condition, indexRange = null) {
    const startIndex = indexRange?.[0] ?? 0;
    const endIndex = indexRange?.[1] ?? array.length;
    for (let index = startIndex; index < endIndex; index++) {
        if (condition(array[index], index, array)) {
            return { value: array[index], index };
        }
    }
    return null;
}
export function mapArray(array, callback) {
    const mappedArray = [];
    for (let index = 0; index < array.length; index++) {
        mappedArray[index] = callback(array[index], index, array);
    }
    return mappedArray;
}
