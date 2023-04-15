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

function highlightBlockCoords(particle,coords,dimension,molang) {
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
                    drawCorner(block,cornerCoord);
                }
            }
        }
    }
}

function drawCorner(origin,corner) {
    const otherAxis = getStaleAxis(origin,corner);
    const particleCoord = getCornerOffset(origin,corner);
    for (let staleAxisStep = 0;staleAxisStep <= 1;staleAxisStep++) {
        const staleAxisOffset = {};
        staleAxisOffset[otherAxis] = staleAxisStep;
        const particleLocation = sumLocations(particleCoord,staleAxisOffset);
        dimension.spawnParticle(particle,particleLocation,molang);
    }
}

function createLocationSet(locations) {
    const locationSet = new Set();
    for (let locationIndex = 0;locationIndex < locations.lenght;locationIndex++) {
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

function getStaleAxis(origin,corner) {
    if (origin.x === corner.x) return 'x';
    if (origin.y === corner.y) return 'y';
    if (origin.z === corner.z) return 'z';
}

function getCornerOffset(origin,corner) {
    return {
        x: origin.x + (corner.x === 1 ? 1 : 0),
        y: origin.y + (corner.y === 1 ? 1 : 0),
        z: origin.z + (corner.z === 1 ? 1 : 0)
    }
}