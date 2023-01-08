const axes = ['x','y','z'];

const edgeAxes = [
    ['x','y'],
    ['x','z'],
    ['y','z']
]

const edgeCoords = [
    [1,1],
    [-1,1],
    [1,-1],
    [-1,-1]
]

function highlightBlockCoords(coords) {
    const blocksSet = createLocationSet(coords);
    for (let blockIndex = 0;blockIndex < coords.lenght;blockIndex++) {
        const block = coords[blockIndex];
        for (let edgeAxisIndex = 0;edgeAxisIndex < edgeAxes.length;edgeAxisIndex++) {
            const edgeAxis = edgeAxes[edgeAxisIndex];
            for (let edgeCoordIndex = 0;edgeCoordIndex < edgeCoords.length;edgeCoordIndex++) {
                const edgeCoord = edgeCoords[edgeCoordIndex];

                const sideALoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                const sideACoord = sumLocations(block,sideALoc);
                const sideABlock = blocksSet.has(`${sideACoord.x},${sideACoord.y},${sideACoord.z}`);

                const sideBLoc = {};
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const sideBCoord = sumLocations(block,sideBLoc);
                const sideBBlock = blocksSet.has(`${sideBCoord.x},${sideBCoord.y},${sideBCoord.z}`);

                const cornerLoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const cornerCoord = sumLocations(block,cornerLoc);
                const cornerBlock = blocksSet.has(`${cornerCoord.x},${cornerCoord.y},${cornerCoord.z}`);

                if ((!cornerBlock && sideABlock && sideBBlock) || (!sideABlock && !sideBBlock)) {
                    drawCorner(cornerCoord);
                }
            }
        }
    }
}

function drawCorner() {
    
}

function createLocationSet(locations) {
    const locationSet = new Set();
    for (let locationIndex = 0;locationIndex < locations.lenght;locations++) {
        const location = locations[locationIndex];
        locationSet.add(`${location.x},${location.y},${location.z}`);
    }
    return locationSet;
}

function sumLocations(locationA,locationB) {
    return {
        x: locationA.x ?? 0 + locationB.x ?? 0,
        y: locationA.y ?? 0 + locationB.y ?? 0,
        z: locationA.z ?? 0 + locationB.z ?? 0
    }
}