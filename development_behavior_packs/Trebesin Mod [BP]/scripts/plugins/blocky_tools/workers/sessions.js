//APIs:
import * as Mc from '@minecraft/server';
import { floorVector, setVectorLength, sumVectors, getDirectionFace, multiplyVector, subVectors} from '../../../js_modules/vector';
import { DIMENSION_IDS, FACE_DIRECTIONS } from '../../../mc_modules/constants';
import { spawnBox } from '../../../mc_modules/particles';
import { getEquipedItem, sendMessage } from '../../../mc_modules/players';
//Plugins:
import { CornerSelection } from './selection';
import { Server } from '../../backend/backend';
import { logMessage } from '../../debug/debug';
import { setBlockType } from '../../block_history/block_history';
import { find } from '../../../js_modules/array';
//Modules:


//# 
const SessionStore = {};

class LeftClickDetect {
    constructor() {}

    /**
     * Teleports entity in front of the player's cursor and creates it if it doesn't exist.
     * @param {Mc.Player} player
     */
    run(player) {
        const entityLocation = sumVectors(player.getHeadLocation(),multiplyVector(player.getViewDirection(),0.5));
        /** @type {Mc.Entity} */
        let playerEntity = this.#playerData[player.id];
        if (playerEntity == null) {
            this.#spawnEntity(player,entityLocation);
        } else {
            try {
                playerEntity.teleport(entityLocation,player.dimension,0,0,false);
            } catch {
                this.#spawnEntity(player,entityLocation);
            }
        }

    }

    stop(playerId) {
        let playerEntity = this.#playerData[playerId];
        if (playerEntity !== null) {
            playerEntity.triggerEvent('trebesin:make_despawn');
            this.#playerData[playerId] = null;
        }
    }

    #spawnEntity(player,location) {
        const playerEntity = player.dimension.spawnEntity('trebesin:left_click_detect',location);
        this.#playerData[player.id] = playerEntity;
    }

    #playerData = {}
}

const leftClickDetector = new LeftClickDetect();

export function main() {

    Mc.world.events.playerJoin.subscribe((eventData) => {
        leftClickDetector.stop(eventData.playerId);
    });

    Mc.world.events.itemUse.subscribe((eventData) => {
        if (eventData.item.typeId !== 'trebesin:bt_blocky_axe') return;
        let session = SessionStore[eventData.source.id];
        if (session == null) session = initialize(eventData.source);

        const selection = session.selections[session.selectionType];
        selection.setCorner(0,session.pointerBlockLocation);
    });

    Mc.world.events.entityHit.subscribe((eventData) => {
        logMessage(`EntityHit ${eventData.entity.name} - E:${eventData?.hitEntity?.typeId} B:${eventData?.hitBlock?.typeId} T:${Mc.system.currentTick}`);
        const itemHolding = getEquipedItem(eventData.entity);
        if (itemHolding?.typeId !== 'trebesin:bt_blocky_axe') return;
        let session = SessionStore[eventData.entity.id];
        if (session == null) session = initialize(eventData.entity);

        const selection = session.selections[session.selectionType];
        selection.setCorner(1,session.pointerBlockLocation);
    });

    //Server.events.itemStartUseOn.subscribe(() => {
    //    logMessage('ItemUseOn')
    //});

    Mc.system.runInterval(() => {
        for (const playerId in SessionStore) {
            const session = SessionStore[playerId];
            /** @type {Mc.Player} */
            const player = session.player;
            
            const selection = session.selections[session.selectionType];
            selection.createParticleOutline();
            selection.createParticleBlocks();


            if (getEquipedItem(player)?.typeId === 'trebesin:bt_blocky_axe') {
                leftClickDetector.run(player);

                //## Updating Pointer Block
                switch (session.pointerMode) {
                    case PointerMode.BLOCK: {
                        session.pointerBlockLocation = player.getBlockFromViewDirection().location;
                    }   break;
                    case PointerMode.FACE: {
                        const targetLocation = player.getBlockFromViewDirection().location;
                        const viewVector = player.getViewDirection();
                        const relativeVector = subVectors(
                            player.getHeadLocation(),targetLocation
                        );
                        session.pointerBlockLocation = sumVectors(
                            player.getBlockFromViewDirection().location,
                            FACE_DIRECTIONS[getDirectionFace(player.getViewDirection())]
                        );
                        //session.pointerBlockLocation = floorVector(
                        //    sumVectors(sumVectors(targetLocation,{x:0.5,y:0.5,z:0.5}),multiplyVector(viewVector,-1))
                        //);
                    }   break;
                    case PointerMode.FREE: {
                        session.pointerBlockLocation = floorVector(sumVectors(
                            player.getHeadLocation(),
                            setVectorLength(player.getViewDirection(),session.config.pointer.range)
                        ));
                    }   break;
                    case PointerMode.ACTION: {
                        session.pointerBlockLocation = null;
                    }
                }
                if (session.pointerBlockLocation != null) {
                    //## Pointer Preview
                    const molang = new Mc.MolangVariableMap();
                    molang.setColorRGBA('variable.color',{red:1,green:0,blue:0,alpha:1});
                    spawnBox(`trebesin:plane_box_`,session.pointerBlockLocation,player.dimension,molang,0.01);
                }

                player.onScreenDisplay.setActionBar(
                    `[§aBlocky §2Tools§r] ${ session.pointerBlockLocation != null ? `[${session.pointerBlockLocation.x},${session.pointerBlockLocation.y},${session.pointerBlockLocation.z}]` : ''}\n`+
                    `§cPointer Mode: §l${PointerModeNames[session.pointerMode]}§r\n`+
                    `§bSelection Type: §l${SelectionTypeNames[session.selectionType]}§r\n`
                );
            } else {
                session.pointerBlockLocation = null;
                leftClickDetector.stop(player.id);
            }
        }
    },1);

    Mc.system.runInterval(() => {
        for (const dimensionId of DIMENSION_IDS) {
            for (const entity of Mc.world.getDimension(dimensionId).getEntities({type:'trebesin:left_click_detect'})) {
                entity.triggerEvent('trebesin:make_despawn');
            }
        }
    },6000);
}

export function fillSelectionCorners(player,blockType) {
    let session = SessionStore[player.id];
    if (session == null) session = initialize(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    for (const blockLocation of selection.getAllCorners()) {
        sendMessage(`§mX:${blockLocation.x} §qY:${blockLocation.y} §tZ:${blockLocation.z}`,'§2BT§r',player);
        setBlockType(player.dimension.getBlock(blockLocation),blockType);
    }
}

export function fillSelection(player,blockType) {
    let session = SessionStore[player.id];
    if (session == null) session = initialize(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];

    selection.getAllBlocks((blockLocation) => {
        setBlockType(player.dimension.getBlock(blockLocation),blockType);
    });
}

/**
 * 
 * @param {Mc.Player} player 
 * @param {Mc.BlockType} blockType 
 * @param {Mc.BlockType[]} replaceTypes 
 * @param {boolean} exclusion 
 */
export function fillReplaceSelection(player,blockType,replaceTypes,exclusion) {
    let session = SessionStore[player.id];
    if (session == null) session = initialize(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    const dimension = selection.getDimension();

    //const perm = Mc.BlockPermutation.resolve(blockType)
    //perm.

    selection.getAllBlocks((blockLocation) => {
        const block = dimension.getBlock(blockLocation);
        const typeIdMatch = replaceTypes.find((replaceType) => block.typeId === replaceType.id) != null;
        if (
            (exclusion && !typeIdMatch) || (!exclusion && typeIdMatch)
        ) setBlockType(block,blockType);
    });
}

export function getSelectionMinMax(player) {
    let session = SessionStore[player.id];
    if (session == null) session = initialize(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    sendMessage(`MAX: §mX:${selection.maxCoordinates.x} §qY:${selection.maxCoordinates.y} §tZ:${selection.maxCoordinates.z}`,'§2BT§r',player);
    sendMessage(`MIN: §mX:${selection.minCoordinates.x} §qY:${selection.minCoordinates.y} §tZ:${selection.minCoordinates.z}`,'§2BT§r',player);
}

export function insideSelection(player) {
    let session = SessionStore[player.id];
    if (session == null) session = initialize(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    const location = session.pointerBlockLocation;
    sendMessage(`${selection.includes(location)} §mX:${location.x} §qY:${location.y} §tZ:${location.z}`,'§2BT§r',player);
}

//# Base functions
/**
 * Initializes the Blocky Tools session for a player.
 * @param {Mc.Player} player 
 */
export function initialize(player) {
    const defaultSelection = new CornerSelection(player,player.dimension);

    SessionStore[player.id] = {
        player: player,
        pointerBlockLocation: null,
        pointerMode: PointerMode.BLOCK,
        selectionType: SelectionType.CORNER,
        selections: [defaultSelection,null,null],
        clipboard: null,
        config: {
            pointer: {
                range: 3,
                selectLiquids: false
            }
        }
    };
    sendMessage(`§aInitialized the Block Tools session!`,'§2BT§r',player);

    return SessionStore[player.id];
}

//#User Interface functions
export function actionMenu(player,pointerMode) {

}

//#Session State functions
export function switchPointer(player,pointerMode = null) {
    let session = SessionStore[player.id];
    if (session == null) session = initialize(player);
    if (pointerMode == null) {
        if (session.pointerMode < 3) session.pointerMode++;
        else session.pointerMode = 0;
    } else {
        session.pointerMode = pointerMode;
    }
}

export function switchSelection(player,selectionType) {

}

class Session {
    constructor(player) {

    }

    player

    pointerMode
    selectionType
}


//# Additional Constants
/**
 * Enum for the messages defining state of a tool.
 * @readonly
 * @enum {number}
 */
export const StateMessages = {

}

/**
 * Enum for the pointer modes that the player can use.
 * @readonly
 * @enum {number}
 */
export const PointerMode = {
    /** The first block the player view intersects with gets selected. */
    BLOCK: 0,
    /** The block adjecent to the face of the first block the player view intersects with gets selected. */
    FACE: 1,
    /** The block on the position that is exactly `{config.selectionRange}` blocks in front of the player gets selected. */
    FREE: 2,
    /** No block gets selected, instead an action is triggered. */
    ACTION: 3
};

/**
 * Enum for the pointer mode names that the player can use.
 * @readonly
 * @enum {number}
 */
export const PointerModeNames = ['Block','Face','Free','Action'];

/**
 * Enum for the selection types that the player can use.
 * @readonly
 * @enum {number}
 */
export const SelectionType = {
    /** Selection which is defined by a pair of 2 points in the corners of a cuboid area fill.*/
    CORNER: 0,
    /** Selection which is defined by a center of a radius and points for x,y,z axis which either define radius or length of a plane. */
    ELIPSE: 1,
    /** Selection which is defined by a collection of points, structure they compose then fills an area between them used as vertices. */
    POINT: 2
};

/**
 * Enum for names of the selection types that the player can use.
 * @readonly
 * @enum {number}
 */
export const SelectionTypeNames = ['Corner','Elipse','Point'];