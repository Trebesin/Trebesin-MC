function compareItems(itemA,itemB) {
    if (
        itemA?.typeId !== itemB?.typeId || 
        itemA?.data !== itemB?.data ||
        itemA?.nameTag !== itemB?.nameTag
    ) return false;
    return true;
}

function copyItem(itemA,itemB) {

}


export { compareItems }