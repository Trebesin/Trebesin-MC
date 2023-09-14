/*
    "random.js" - Helper functions to generate pseudo-random numbers/values.
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
 * @param {number} min Minimal number to be chosen, inclusive.
 * @param {number} max maximal number to be chosen, inclusive.
 * @returns {number} Uniformly selected random integer number.
 */
export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @param {number} min Minimal number to be chosen, inclusive.
 * @param {number} max maximal number to be chosen, exclusive.
 * @returns {number} Uniformly selected random integer number.
 */
export function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * @param {any[]} array Array to select random element from.
 * @param {number[]} [weights] Optional weights coresponding to each element by index.
 * @returns {any} Randomly selected elements.
 */
export function randChoice(array, weights = null) {
    let totalWeight = 0;
    for (let index = 0; index < array.length; index++) {
        totalWeight += weights[index] ?? 1;
    }
    let choice = null;

    while (!choice) {
        const index = randInt(0,array.length-1);
        if (weights[index] ?? 1/totalWeight > Math.random()) choice = array[index];
    }
    return choice
}

function randomTriInt(min, max, tri) {
}

function randomTriFloat() {
    
}

/*
    !! License terms defined in the first line of the file do not apply to the parts of the file that come after this comment.
*/
//! None of this is mine:
//const f = 0.5;
//const n = 0.5;
//const o = 0.0645497224;
for (let i = 0;i<32769;i++) {
    const number = rndN(2);
    if (number <= 2.5 && number >= -2.5) {
        console.log(`${number}`.replace('.',','));
    };
}

function gurn() {
    let u = 1 - Math.random();
    let v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v);
}

function randn_bm() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return randn_bm() // resample between 0 and 1
    return num
  }

  const randn_bm_extra = (min, max, skew = 1) => {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) num = randn_bm_extra(min, max, skew); // resample between 0 and 1 if out of range
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
    return num;
}

function rndN(n) {
	var rand = 0;
  
  for (var i = 0; i < n; i += 1) {
  	rand += Math.random();
  }

  // return (rand - n/2) / (n/2);
  return rand / n
}

export function mulberry32seed(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}