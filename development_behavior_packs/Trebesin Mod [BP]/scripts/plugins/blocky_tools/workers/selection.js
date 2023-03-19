//Base imports
import { world, MolangVariableMap, MinecraftBlockTypes, system, Dimension, Player } from '@minecraft/server';
//MC Modules
import { spawnBlockSelection } from '../../../mc_modules/particles';
//JS Modules
import { getGridBlock } from '../../../js_modules/geometry';
import { insertToArray } from '../../../js_modules/array';
 
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
        this.#maxCoords = {
            x: null,
            y: null,
            z: null
        }
        this.#minCoords = {
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

    #maxCoords
    #minCoords
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
     * @param {Vector3} coord Coordinate of the selection corner.
     */
    setCorner(index,coord) {
        if (index !== 1 && index !== 0) throw new Error('Invalid Index');
        this.#corners[index] = coord;
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
        }
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
    includes(coordinate) {

    }
    /**
     * Returns all block coorinates contained within the selection area.
     * @returns {Vector3[]}
     */
    getAllBlocks() {

    }
    /**
     * Generates all coordinates of edge particles to get a preview of the selection.
     */
    generateParticlePreview(callback) {

    }
    /**
     * G
     */
    generatePlaneParticlePreview(callback) {
        callback(location,axis,size)
    }
 
    #corners = [];
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