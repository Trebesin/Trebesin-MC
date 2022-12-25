import {Location} from '@minecraft/server';
import {arrayDifference} from '../js_modules/array';
import {getGridLine} from '../js_modules/geometry';

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

export {spawnBlockSelection,spawnLine}