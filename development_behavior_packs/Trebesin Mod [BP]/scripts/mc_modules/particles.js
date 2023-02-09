import {Location} from '@minecraft/server';
import {arrayDifference} from '../js_modules/array';
import {getGridLine} from '../js_modules/geometry';
import { EDGE_AXES,EDGE_COORDS } from './constants';

export function spawnBlockSelection(particle,coords,dimension,molang) {
    const cornerMin = [
        Math.min(coords[0].x,coords[1].x),
        Math.min(coords[0].y,coords[1].y),
        Math.min(coords[0].z,coords[1].z)
    ];
    const cornerMax = [
        Math.max(coords[0].x,coords[1].x),
        Math.max(coords[0].y,coords[1].y),
        Math.max(coords[0].z,coords[1].z)
    ];
    const corners = [cornerMin,cornerMax];
    
    for (let mainAxis = 0;mainAxis < 3;mainAxis++) {
        const otherAxis = arrayDifference([0,1,2],[mainAxis]);
        for (let axisPoint = cornerMin[mainAxis];axisPoint <= cornerMax[mainAxis] + 1;axisPoint++) {
            for (let corner0 = 0;corner0 < corners.length;corner0++) {
                for (let corner1 = 0;corner1 < corners.length;corner1++) {
                    const location = [];
                    location[mainAxis] = axisPoint;
                    location[otherAxis[0]] = corners[corner0][otherAxis[0]] + corner0;
                    location[otherAxis[1]] = corners[corner1][otherAxis[1]] + corner1;

                    const spawnLocation = new Location(...location);
                    dimension.spawnParticle(particle,spawnLocation,molang);
                }
            }
        }
    }
}

export function spawnLine(particle,coords,dimension,molang,stepBy = 1) {
    getGridLine(coords,{stepBy,round:false},(coord) => {
        const location = new Location(coord.x,coord.y,coord.z);
        dimension.spawnParticle(particle,location,molang);
    })
}

export function highlightBlockCoords(particle,coords,dimension,molang) {
    const blocksSet = createLocationSet(coords);
    for (let blockIndex = 0;blockIndex < coords.length;blockIndex++) {
        const block = coords[blockIndex];
        for (let edgeAxisIndex = 0;edgeAxisIndex < EDGE_AXES.length;edgeAxisIndex++) {
            const edgeAxis = EDGE_AXES[edgeAxisIndex];
            for (let edgeCoordIndex = 0;edgeCoordIndex < EDGE_COORDS.length;edgeCoordIndex++) {
                const edgeCoord = EDGE_COORDS[edgeCoordIndex];
                const sideALoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                const sideACoord = sumLocations(block,sideALoc);
                const sideABlock = blocksSet.has(`${sideACoord.x},${sideACoord.y},${sideACoord.z}`);

                const sideBLoc = {};
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const sideBCoord = sumLocations(block,sideBLoc);
                const sideBBlock = blocksSet.has(`${sideBCoord.x},${sideBCoord.y},${sideBCoord.z}`);

                const cornerLoc = {};
                cornerLoc[edgeAxis[0]] = edgeCoord[0];
                cornerLoc[edgeAxis[1]] = edgeCoord[1];
                const cornerCoord = sumLocations(block,cornerLoc);
                const cornerBlock = blocksSet.has(`${cornerCoord.x},${cornerCoord.y},${cornerCoord.z}`);

                if ((!cornerBlock && sideABlock && sideBBlock) || (!sideABlock && !sideBBlock)) {
                    drawCorner(block,cornerLoc,(location) => {
                        dimension.spawnParticle(particle,location,molang);
                    });
                }
            }
        }
    }
}

export function getCornerLocations(coords,callback) {
    const blocksSet = createLocationSet(coords);
    for (let blockIndex = 0;blockIndex < coords.length;blockIndex++) {
        const block = coords[blockIndex];
        for (let edgeAxisIndex = 0;edgeAxisIndex < EDGE_AXES.length;edgeAxisIndex++) {
            const edgeAxis = EDGE_AXES[edgeAxisIndex];
            for (let edgeCoordIndex = 0;edgeCoordIndex < EDGE_COORDS.length;edgeCoordIndex++) {
                const edgeCoord = EDGE_COORDS[edgeCoordIndex];
                const sideALoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                const sideACoord = sumLocations(block,sideALoc);
                const sideABlock = blocksSet.has(`${sideACoord.x},${sideACoord.y},${sideACoord.z}`);

                const sideBLoc = {};
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const sideBCoord = sumLocations(block,sideBLoc);
                const sideBBlock = blocksSet.has(`${sideBCoord.x},${sideBCoord.y},${sideBCoord.z}`);

                const cornerLoc = {};
                cornerLoc[edgeAxis[0]] = edgeCoord[0];
                cornerLoc[edgeAxis[1]] = edgeCoord[1];
                const cornerCoord = sumLocations(block,cornerLoc);
                const cornerBlock = blocksSet.has(`${cornerCoord.x},${cornerCoord.y},${cornerCoord.z}`);

                if ((!cornerBlock && sideABlock && sideBBlock) || (!sideABlock && !sideBBlock)) {
                    drawCorner(block,cornerLoc,callback);
                }
            }
        }
    }
}

export function getEdgeLocations(coords,callback) {
    const blocksSet = createLocationSet(coords);
    for (let blockIndex = 0;blockIndex < coords.length;blockIndex++) {
        const block = coords[blockIndex];
        for (let edgeAxisIndex = 0;edgeAxisIndex < EDGE_AXES.length;edgeAxisIndex++) {
            const edgeAxis = EDGE_AXES[edgeAxisIndex];
            for (let edgeCoordIndex = 0;edgeCoordIndex < EDGE_COORDS.length;edgeCoordIndex++) {
                const edgeCoord = EDGE_COORDS[edgeCoordIndex];
                const sideALoc = {};
                sideALoc[edgeAxis[0]] = edgeCoord[0];
                const sideACoord = sumLocations(block,sideALoc);
                const sideABlock = blocksSet.has(`${sideACoord.x},${sideACoord.y},${sideACoord.z}`);

                const sideBLoc = {};
                sideBLoc[edgeAxis[1]] = edgeCoord[1];
                const sideBCoord = sumLocations(block,sideBLoc);
                const sideBBlock = blocksSet.has(`${sideBCoord.x},${sideBCoord.y},${sideBCoord.z}`);

                const cornerLoc = {};
                cornerLoc[edgeAxis[0]] = edgeCoord[0];
                cornerLoc[edgeAxis[1]] = edgeCoord[1];
                const cornerCoord = sumLocations(block,cornerLoc);
                const cornerBlock = blocksSet.has(`${cornerCoord.x},${cornerCoord.y},${cornerCoord.z}`);

                if ((!cornerBlock && sideABlock && sideBBlock) || (!sideABlock && !sideBBlock)) {
                    drawEdge(block,cornerLoc,callback);
                }
            }
        }
    }
}

export function drawEdge(origin,corner,callback) {
    const otherAxis = getStaleAxis(corner);
    const particleCoord = getCornerOffset(origin,corner);
    callback(particleCoord,otherAxis);
}

export function drawCorner(origin,corner,callback) {
    const otherAxis = getStaleAxis(corner);
    const particleCoord = getCornerOffset(origin,corner);
    for (let staleAxisStep = 0;staleAxisStep <= 1;staleAxisStep++) {
        const staleAxisOffset = {};
        staleAxisOffset[otherAxis] = staleAxisStep;
        const particleLocation = sumLocations(particleCoord,staleAxisOffset);
        callback(particleLocation);
    }
}


export function createLocationSet(locations) {
    const locationSet = new Set();
    for (let locationIndex = 0;locationIndex < locations.length;locationIndex++) {
        const location = locations[locationIndex];
        locationSet.add(`${location.x},${location.y},${location.z}`);
    }
    return locationSet;
}

export function createLocationSet2(locations) {
    const locationSet = new Set();
    for (let locationIndex = 0;locationIndex < locations.length;locationIndex++) {
        const location = locations[locationIndex][0];
        const axis = locations[locationIndex][1];
        locationSet.add(`${location.x},${location.y},${location.z},${axis}`);
    }
    return locationSet;
}

export function locationToString(location,axis) {
    return `${location.x},${location.y},${location.z},${axis}`;
}

export function stringToLocation(string) {
    const positionArray = string.split(',');
    return [
        new Location(
            parseInt(positionArray[0]),
            parseInt(positionArray[1]),
            parseInt(positionArray[2])
        ),
        positionArray[3]
    ];
}

export function sumLocations(locationA,locationB) {
    return {
        x: (locationA.x ?? 0) + (locationB.x ?? 0),
        y: (locationA.y ?? 0) + (locationB.y ?? 0),
        z: (locationA.z ?? 0) + (locationB.z ?? 0)
    }
}

export function getStaleAxis(coord) {
    if ((coord.x ?? 0) === 0) return 'x';
    if ((coord.y ?? 0) === 0) return 'y';
    if ((coord.z ?? 0) === 0) return 'z';
}

export function getCornerOffset(origin,corner) {
    return {
        x: origin.x + (corner.x === 1 ? 1 : 0),
        y: origin.y + (corner.y === 1 ? 1 : 0),
        z: origin.z + (corner.z === 1 ? 1 : 0)
    }
}