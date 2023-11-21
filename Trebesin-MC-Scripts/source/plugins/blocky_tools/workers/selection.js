//Base imports
import * as Mc from '@minecraft/server';
//MC Modules
import { spawnBlockSelection, spawnBox, spawnLineBox } from '../../../mc_modules/particles';
//JS Modules
import { getBlockOutline, getGridBlock } from '../../../js_modules/geometry';
import { insertToArray } from '../../../js_modules/array';
import { logMessage } from '../../debug/debug';
import * as VectorMath from '../../../js_modules/vectorMath';
import * as Blocks from '../../../mc_modules/blocks';
import { BlockHistoryUpdateTypes, editBlock } from '../../block_history/block_history';

/**
 * @typedef Vector3
 * @property {number} x Value of the vector on the X axis.
 * @property {number} y Value of the vector on the Y axis.
 * @property {number} z Value of the vector on the Z axis.
 */

/**
 * A selection class that the blocky tools plugin works with.
 */
class BaseSelection {
    /**
     * 
     * @param {Mc.Player} player The player associated with the slection.
     * @param {Mc.Dimension} dimension The dimension the selection is contained within.
     */
    constructor(player) {
        this.#player = player;
        this.#dimension = player.dimension;
        this.#empty = true;
        this.maxCoordinates = {
            x: null,
            y: null,
            z: null
        };
        this.minCoordinates = {
            x: null,
            y: null,
            z: null
        };
        this.centerCoordinates = {
            x: null,
            y: null,
            z: null
        };
    }

    /**
     * Returns the player associated with the selection.
     * @returns {Mc.Player}
     */
    getPlayer() {
        return this.#player;
    }
    /**
     * Returns the dimension the selection is contained within.
     * @returns {Mc.Dimension}
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
    /**
     * Returns bounding information for the selection area.
     * @returns {SelectionBounds}
     */
    getBounds() {
        return {
            min: VectorMath.copy(this.minCoordinates),
            max: VectorMath.copy(this.maxCoordinates),
            center: VectorMath.copy(this.centerCoordinates)
        }
    }

    universalGetAllBlocks(callback) {
        const bounds = this.getBounds();
        for (let x = bounds.min.x;x <= bounds.max.x;x++) {
            for (let y = bounds.min.y;y <= bounds.max.y;y++) {
                for (let z = bounds.min.z;z <= bounds.max.z;z++) {
                    const coordinates = {x,y,z};
                    if (this.includes(coordinates)) callback(coordinates);
                }
            }
        }
    }

    updateCenter() {
        this.centerCoordinates = VectorMath.divide(VectorMath.sum(this.minCoordinates,this.maxCoordinates),2);
    }

    /**
     * Flips all the blocks in the selection on the chosen axis.
     * @param {'x'|'y'|'z'} axis Axis to flip.
     */
    flip(axis) {
        const bounds = this.getBounds();
        const dimension = this.getDimension();
        const player = this.getPlayer();

        const updatedBlocks = [];
        this.getAllBlocks((blockLocation) => {
            const block = dimension.getBlock(blockLocation);
            const flippedBlockLocation = VectorMath.copy(blockLocation);
            flippedBlockLocation[axis] = (bounds.center[axis]-(blockLocation[axis]-bounds.center[axis]));
            updatedBlocks.push({
                blockState: Blocks.copyBlockState(block),
                blockLocation: flippedBlockLocation
            })
        })

        for (const newBlock of updatedBlocks) {
            const block = dimension.getBlock(newBlock.blockLocation);
            editBlock(block,newBlock.blockState,{actorId:player.id,updateType:BlockHistoryUpdateTypes.blockyTools});
        }
        //center-(cordinate-center)
    } 

    /** @protected */
    maxCoordinates
    /** @protected */
    minCoordinates
    /** @protected */
    centerCoordinates
    
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
     * @param {Vector3} [coord] Coordinates of the selection corner. If omitted resets the coord to null.
     */
    setCorner(index,coords = null) {
        if (index !== 1 && index !== 0) throw new Error('Invalid Index');
        this.#corners[index] = VectorMath.floor(coords);
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
     * Returns if a block coordinates are contained within the selection area.
     * @param {Vector3} coordinates
     * @returns {boolean}
     */
    includes(coordinates) {
        const max = this.maxCoordinates;
        const min = this.minCoordinates;

        return !(
            coordinates.x < min.x || coordinates.x > max.x ||
            coordinates.y < min.y || coordinates.y > max.y ||
            coordinates.z < min.z || coordinates.z > max.z
        )
    }

    /**
     * Returns the number blocks in the selection.
     * @returns 
     */
    getArea() {
        const lengths = VectorMath.sub(this.maxCoordinates,this.minCoordinates)
        return Math.abs((lengths.x+1) * (lengths.y+1) * (lengths.z+1));
    }

    /**
     * Calls the callback for every single block that is within the selection area.
     * @arg {function} callback
     * @returns 
     */
    async getAllBlocks(callback) {
        await getGridBlock(this.getSelectionCorners(),callback);
    }

    /**
     * Calls the callback selected blocks in a specific shape defined in options.
     * @arg {function} callback
     * @returns 
     */
    async getBlocks(callback,options) {
        await getGridBlock(this.getSelectionCorners(),callback,options);
    }

    /**
     * Calls the callback for every single block that is on the outline of the selection area.
     * @arg {function} callback
     * @returns 
     */
    async getOutlineBlocks(callback,options) {
        await getBlockOutline(this.getSelectionCorners(),callback,options);
    }

    updateMinMax() {
        const corners = this.getSelectionCorners();
        if (corners[0] == null && corners[1] == null) {
            this.maxCoords = {x:null,y:null,z:null};
            this.minCoords = {x:null,y:null,z:null};
        } else if (corners[0] == null) {
            const copyOfVector = VectorMath.copy(corners[1]);
            this.maxCoords = copyOfVector;
            this.minCoords = copyOfVector;
        } else if (corners[1] == null) {
            const copyOfVector = VectorMath.copy(corners[0]);
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
            this.updateCenter();
        }
    }

    /**
     * Creates particles for the outline of the selection in the world.
     */
    createParticleOutline(color = null,duration = null) {
        const corners = this.getSelectionCorners();
        if (corners[0] == null || corners[1] == null) return;

        const molangVariables = new Mc.MolangVariableMap();
        molangVariables.setColorRGBA(`variable.color`,{red:0,green:0,blue:1,alpha:0.85});
        molangVariables.setSpeedAndDirection(`variable.time`,0.06,{x:0,y:0,z:0});
        spawnLineBox('trebesin:line_flex2',corners,this.getDimension(),molangVariables);
    }

    /**
     * Creates particles for the functional blocks of the selection in the world.
     */
    createParticleBlocks(color = null,duration = null) {
        const molangVariables = new Mc.MolangVariableMap();
        molangVariables.setColorRGBA('variable.color',{red:0,green:1,blue:0,alpha:1});
        molangVariables.setSpeedAndDirection(`variable.time`,0.06,{x:0,y:0,z:0});
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
        const block = Mc.MinecraftBlockTypes.get(blockId);
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

//# Types / Constants

/**
 * @typedef SelectionBounds
 * @property {Vector3} max Maximal coordinate value for each axis the selection area spans.
 * @property {Vector3} min Minimal coordinate value for each axis the selection area spans.
 * @property {Vector3} center Average coordinate value for each axis the selection area spans.
 */
