//APIs:
import * as Mc from '@minecraft/server';
import { floorVector, setVectorLength, sumVectors, getDirectionFace, multiplyVector, subVectors} from '../../../js_modules/vector';
import { FACE_DIRECTIONS } from '../../../mc_modules/constants';
import { spawnBox } from '../../../mc_modules/particles';
import { getEquipedItem, sendMessage } from '../../../mc_modules/players';
//Plugins:
import { CornerSelection } from './selection';
import { Server } from '../../backend/backend';
import { logMessage } from '../../debug/debug';
import { setBlockType } from '../../block_history/block_history';
//Modules:


//# 
const SessionStore = {};

class RightClickDetect {
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
            playerEntity = player.dimension.spawnEntity('trebesin:right_click_detect',entityLocation);
            this.#playerData[player.id] = playerEntity;
        } else {
            playerEntity.teleport(entityLocation,player.dimension,0,0,false);
        }

    }

    stop(player) {
        let playerEntity = this.#playerData[player.id];
        if (playerEntity !== null) {
            playerEntity.triggerEvent('trebesin:make_despawn');
            this.#playerData[player.id] = null;
        }
    }

    #playerData = {}
}

const rightClickDetector = new RightClickDetect();

export function main() {

    Mc.world.events.itemUse.subscribe((eventData) => {
        if (eventData.item.typeId !== 'trebesin:bt_blocky_axe') return;
        let session = SessionStore[eventData.source.id];
        if (session == null) session = initialize(eventData.source);

        const selection = session.selections[session.selectionType];
        selection.setCorner(0,session.pointerBlockLocation);

        logMessage('ItemUse')
    });

    Mc.world.events.entityHit.subscribe((eventData) => {
        logMessage(`EntityHit ${eventData.entity.name} - E:${eventData?.hitEntity?.typeId} B:${eventData?.hitBlock?.typeId}`);
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
                        sumVectors(
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
            }
        }
    },4);

    Mc.system.runInterval(() => {
        for (const playerId in SessionStore) {
            const session = SessionStore[playerId];
            const player = session.player;

            if (getEquipedItem(player)?.typeId === 'trebesin:bt_blocky_axe') rightClickDetector.run(player);
            else rightClickDetector.stop(player);
        }
    },1);
}

export function fillCorner(player,blockType) {
    let session = SessionStore[player.id];
    if (session == null) session = initialize(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    for (const blockLocation of selection.getAllCorners()) {
        sendMessage(`§mX:${blockLocation.x} §qY:${blockLocation.y} §tZ:${blockLocation.z}`,'§2BT§r',player);
        setBlockType(player.dimension.getBlock(blockLocation),blockType);
    }
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