//Base imports
import { world, MolangVariableMap, MinecraftBlockTypes, system, Vector, Dimension, Player } from '@minecraft/server';
//MC Modules
import { spawnBlockSelection, spawnBox, spawnLineBox } from '../../../mc_modules/particles';
//JS Modules
import { getGridBlock } from '../../../js_modules/geometry';
import { insertToArray } from '../../../js_modules/array';
import { logMessage } from '../../debug/debug';
import { copyVector } from '../../../js_modules/vector';
 
/**
 * A selection class that the blocky tools plugin works with.
 */
class BaseSelection {
    /**
     * 
     * @param {Player} player The player associated with the slection.
     * @param {Dimension} dimension The dimension the selection is contained within.
     */
    constructor(player, dimension) {
        this.#player = player;
        this.#dimension = dimension;
        this.#empty = true;
        this.maxCoordinates = {
            x: null,
            y: null,
            z: null
        }
        this.minCoordinates = {
            x: null,
            y: null,
            z: null
        }
    }
    /**
     * Returns the player associated with the selection.
     * @returns {Player}
     */
    getPlayer() {
        return this.#player;
    }
    /**
     * Returns the dimension the selection is contained within.
     * @returns {Dimension}
     */
    getDimension() {
        return this.#dimension;
    }
    /**
     * Returns if the selection is empty of any blocks. Selection isn't considered empty once it's defined enough to contain blocks in its volume.
     * @returns {boolean}
     */
    isEmpty() {
        return this.#empty;
    }

    maxCoords
    minCoords
    #empty
    #dimension
    #player
}
 
/**
 * Selection with basic 2 corner definition.
 */
export class CornerSelection extends BaseSelection {
    /**
     * Sets corner of the selection.
     * @param {number} index Index of the corner 0 or 1.
     * @param {Vector3} [coord] Coordinate of the selection corner. If omitted resets the coord to null.
     */
    setCorner(index,coord = null) {
        if (index !== 1 && index !== 0) throw new Error('Invalid Index');
        this.#corners[index] = coord;
        this.updateMinMax();
    }
    /**
     * Returns the corners that are currently selected to define the selection.
     * @returns {Vector3[]}
     */
    getSelectionCorners() {
        return [this.#corners[0],this.#corners[1]];
    }
    /**
     * Returns all corners that exist on the selection.
     * @returns {Vector3[]}
     */
    getAllCorners() {
        const corners = this.#corners;
        const notEquals = {
            x: corners[0].x !== corners[1].x,
            y: corners[0].y !== corners[1].y,
            z: corners[0].z !== corners[1].z
        };
        const allCorners = [];
        allCorners.push({x:corners[0].x,y:corners[0].y,z:corners[0].z});
        if (notEquals.x && notEquals.z) allCorners.push({x:corners[1].x,y:corners[0].y,z:corners[0].z});
        if (notEquals.z && notEquals.x && notEquals.y) allCorners.push({x:corners[0].x,y:corners[0].y,z:corners[1].z});
        if (notEquals.y && (notEquals.x || notEquals.z)) allCorners.push({x:corners[1].x,y:corners[0].y,z:corners[1].z});
        if (notEquals.y && (notEquals.x || notEquals.z)) allCorners.push({x:corners[0].x,y:corners[1].y,z:corners[0].z});
        if (notEquals.z && notEquals.x && notEquals.y) allCorners.push({x:corners[1].x,y:corners[1].y,z:corners[0].z});
        if (notEquals.x && notEquals.z) allCorners.push({x:corners[0].x,y:corners[1].y,z:corners[1].z});
        if (!(!notEquals.x && !notEquals.y && !notEquals.z)) allCorners.push({x:corners[1].x,y:corners[1].y,z:corners[1].z});

        return allCorners;
    }
    /**
     * Returns if a block coordinate is contained within the selection area.
     * @param {Vector3} coordinate 
     * @returns {boolean}
     */
    includes(coord) {
        const max = this.maxCoordinates;
        const min = this.minCoordinates;

        return !(
            coord.x < min.x || coord.x > max.x ||
            coord.y < min.y || coord.y > max.y ||
            coord.z < min.z || coord.z > max.z
        )
    }

    /**
     * Calls the callback for every single block that is within the selection area.
     * @arg {function} callback
     * @returns 
     */
    getAllBlocks(callback) {
        getGridBlock(this.getSelectionCorners(),{stepBy:{x:1,y:1,z:1},hollow:false,width:1},callback);
    }

    updateMinMax() {
        const corners = this.getSelectionCorners();
        if (corners[0] == null && corners[1] == null) {
            this.maxCoords = {x:null,y:null,z:null};
            this.minCoords = {x:null,y:null,z:null};
        } else if (corners[0] == null) {
            const copyOfVector = copyVector(corners[1]);
            this.maxCoords = copyOfVector;
            this.minCoords = copyOfVector;
        } else if (corners[1] == null) {
            const copyOfVector = copyVector(corners[0]);
            this.maxCoords = copyOfVector;
            this.minCoords = copyOfVector;
        } else {
            const maxCoord = {};
            const minCoord = {};
            for (const axis of ['x','y','z']) {
                if (corners[0][axis] > corners[1][axis]) {
                    maxCoord[axis] = corners[0][axis];
                    minCoord[axis] = corners[1][axis];
                } else {
                    maxCoord[axis] = corners[1][axis];
                    minCoord[axis] = corners[0][axis];
                }
            }
            this.maxCoordinates = maxCoord;
            this.minCoordinates = minCoord;
        }
    }

    /**
     * Creates particles for the outline of the selection in the world.
     */
    createParticleOutline(color = null,duration = null) {
        const corners = this.getSelectionCorners();
        if (corners[0] == null || corners[1] == null) return;

        const molangVariables = new MolangVariableMap();
        molangVariables.setColorRGBA(`variable.color`,{red:0,green:0,blue:1,alpha:0.85});
        molangVariables.setSpeedAndDirection(`variable.time`,0.051,new Vector(0,0,0));
        spawnLineBox('trebesin:line_flex2',corners,this.getDimension(),molangVariables);
    }

    /**
     * Creates particles for the functional blocks of the selection in the world.
     */
    createParticleBlocks(color = null,duration = null) {
        const molangVariables = new MolangVariableMap();
        molangVariables.setColorRGBA('variable.color',{red:0,green:1,blue:0,alpha:1});
        molangVariables.setSpeedAndDirection(`variable.time`,0.051,new Vector(0,0,0));
        for (const cornerCoordinate of this.getSelectionCorners()) {
            if (cornerCoordinate == null) continue;
            spawnBox('trebesin:plane_box_',cornerCoordinate,this.getDimension(),molangVariables,0.005);
        }
    }
    /**
     * G
     */
    generatePlaneParticlePreview(callback) {
        callback(location,axis,size)
    }
 
    #corners = [];
    #definedCorners = 0;
}
 
class ExtendedSelection {
    /* setting selection */
    addPoint(coords) {
        insertToArray(this.#points,coords);
    }
 
    removePoint(coords) {
        const index = this.#points.findIndex((value) => value.x === coords.x && value.y === coords.y && value.z === coords.z);
        delete this.#points[index];
    }
 
    createLink(link) {
        const point1 = this.#points.findIndex((value) => value.x === link[0].x && value.y === link[0].y && value.z === link[0].z);
        const point2 = this.#points.findIndex((value) => value.x === link[1].x && value.y === link[1].y && value.z === link[1].z);
        if (point1 > 0 && point2 > 0) { 
            insertToArray(this.#links,link);
        } else throw new Error('One of the selected points doesn\'t exist!');
    }
 
    removeLink(link) {
        const index = this.#points.findIndex((array) => {
            const point1 = array.find((value) => value.x === link[0].x && value.y === link[0].y && value.z === link[0].z);
            const point2 = array.find((value) => value.x === link[1].x && value.y === link[1].y && value.z === link[1].z);
            return point1 && point2;
        });
        if (index > 0) {
            delete this.#links[index];
        } else throw new Error('Can\'t remove link that does not exist!');
    }
 
    /**
     * @param {Object[]} bounds 
     */
    set bounds(bounds) {
        this.#bounds = bounds;
    }
 
    get bounds() {
        return this.#bounds;
    }
 
    fillBounds(blockId,options = {stepBy:1,hollow:true,width:1}) {
        const block = MinecraftBlockTypes.get(blockId);
        const dimension = this.dimension;
        getGridBlock(this.#bounds,options,(coord) => {
            const location = new BlockLocation(coord.x,coord.y,coord.z);
            dimension.getBlock(location).setType(block)
        });
    }
 
    fillPoints(hollow) {
 
    }
 
    #pointMode = false;
    #points = []
    #links = []
    #bounds = []
}
