//APIs:
import { world, MolangVariableMap, MinecraftBlockTypes, Color, system } from '@minecraft/server';
//Modules:
import { getGridBlock } from '../../../js_modules/geometry';
import { insertToArray } from '../../../js_modules/array';
import { spawnBlockSelection } from '../../../mc_modules/particles';

//# Individual Selection
class Selection {
    constructor (player) {
        this.#playerId = player.id;
        this.#dimensionId = player.dimension.id;
        Selections[this.#playerId] = this;
    }

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

    get dimension() {
        return world.getDimension(this.#dimensionId);
    }

    cancel() {
        delete Selections[this.#playerId];
    }

    /* working with selection */

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

    /* metadata */
    #playerId = null;
    #dimensionId = null;

    #pointMode = false;
    #points = []
    #links = []
    #bounds = []
}

//# Global Selection
const Selections = {};

system.runSchedule(() => {
    for (player in Selections) {
        const selection = Selections[player];
        const molang = new MolangVariableMap()
        .setColorRGB('colour',new Color(1,0,0,1));

        spawnBlockSelection('trebesin:selection_dot',selection.bounds,selection.dimension,molang);
    }
},1);

export {Selection, Selections}



