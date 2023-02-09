export function findNumber(string,startIndex = 0) {
    let number = '';
    let numberPart = -1;
    for (let index = startIndex;index < string.length;index++) {
        const charCode = string.charCodeAt(index);
        const char = string[index];

        if ((charCode === 43 || charCode === 45) && numberPart === -1) {
            numberPart = 0;
            number = char;
        } else if (charCode > 47 && charCode < 58) {
            if (numberPart < 1) numberPart = 1;
            number += char;
        } else if (charCode === 46 && numberPart === 1) {
            number += char;
            numberPart = 2;
        } else if (numberPart === 0) {
            number = '';
            numberPart = -1;
        } else if (numberPart > 0) break;
    }
    return parseFloat(number);
}

export function findLastCharIndex(string,char) {
    for (let index = string.length-1;index >= 0;index--) {
        if (string[index] === char) return index;
    }
}

export function findCharIndex(string,char) {
    for (let index = 0;index < string.length;index++) {
        if (string[index] === char) return index;
    }
}