import {Location} from '@minecraft/server';
import {arrayDifference} from '../js_modules/array';
import {getGridLine} from '../js_modules/geometry';
import { EDGE_AXES,EDGE_COORDS } from './constants';

function spawnBlockSelection(particle,coords,dimension,molang) {
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

function spawnLine(particle,coords,dimension,molang,stepBy = 1) {
    getGridLine(coords,{stepBy,round:false},(coord) => {
        const location = new Location(coord.x,coord.y,coord.z);
        dimension.spawnParticle(particle,location,molang);
    })
}

function highlightBlockCoords(particle,coords,dimension,molang) {
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
                    drawCorner(block,cornerLoc,{name:particle,dimension,molang});
                }
            }
        }
    }
}

function drawCorner(origin,corner,particleOptions) {
    const otherAxis = getStaleAxis(corner);
    const particleCoord = getCornerOffset(origin,corner);
    for (let staleAxisStep = 0;staleAxisStep <= 1;staleAxisStep++) {
        const staleAxisOffset = {};
        staleAxisOffset[otherAxis] = staleAxisStep;
        const particleLocation = interfaceToLocation(sumLocations(particleCoord,staleAxisOffset));
        particleOptions.dimension.spawnParticle(particleOptions.name,particleLocation,particleOptions.molang);
    }
}

function createLocationSet(locations) {
    const locationSet = new Set();
    for (let locationIndex = 0;locationIndex < locations.length;locationIndex++) {
        const location = locations[locationIndex];
        locationSet.add(`${location.x},${location.y},${location.z}`);
    }
    return locationSet;
}

function sumLocations(locationA,locationB) {
    return {
        x: (locationA.x ?? 0) + (locationB.x ?? 0),
        y: (locationA.y ?? 0) + (locationB.y ?? 0),
        z: (locationA.z ?? 0) + (locationB.z ?? 0)
    }
}

function interfaceToLocation(object) {
    return new Location(object.x,object.y,object.z)
}

function getStaleAxis(coord) {
    if ((coord.x ?? 0) === 0) return 'x';
    if ((coord.y ?? 0) === 0) return 'y';
    if ((coord.z ?? 0) === 0) return 'z';
}

function getCornerOffset(origin,corner) {
    return {
        x: origin.x + (corner.x === 1 ? 1 : 0),
        y: origin.y + (corner.y === 1 ? 1 : 0),
        z: origin.z + (corner.z === 1 ? 1 : 0)
    }
}

export {spawnBlockSelection,spawnLine,highlightBlockCoords}