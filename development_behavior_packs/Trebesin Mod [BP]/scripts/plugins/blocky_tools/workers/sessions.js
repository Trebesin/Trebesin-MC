//APIs:
import * as Mc from '@minecraft/server';
import { floorVector, setVectorLength, sumVectors, getDirectionFace} from '../../../js_modules/vector';
import { FACE_DIRECTIONS } from '../../../mc_modules/constants';
import { spawnBox } from '../../../mc_modules/particles';
import { getEquipedItem, sendMessage } from '../../../mc_modules/players';
//Plugins:
import { Server } from '../../backend/backend';
import { logMessage } from '../../debug/debug';
//Modules:

const SessionStore = {};

export function main() {
    Mc.world.events.itemUse.subscribe((eventData) => {
        if (eventData.item.typeId !== 'trebesin:bt_blocky_axe') return;
        const session = SessionStore[eventData.source.id];
        if (!session) {
            sendMessage('No session initialized! Use ".start" command to continue.','§2BT§r', eventData.source);
            return;
        };
        logMessage('ItemUse')
    });

    //Server.events.itemStartUseOn.subscribe(() => {
    //    logMessage('ItemUseOn')
    //});

    Mc.system.runInterval(() => {
        for (const playerId in SessionStore) {
            const session = SessionStore[playerId];
            /** @type {Mc.Player} */
            const player = session.player;
            if (getEquipedItem(player)?.typeId === 'trebesin:bt_blocky_axe') {
                //# Updating Pointer Block
                switch (session.pointerMode) {
                    case PointerMode.BLOCK: {
                        session.pointerBlockLocation = player.getBlockFromViewDirection().location;
                    }   break;
                    case PointerMode.FACE: {
                        session.pointerBlockLocation = sumVectors(
                            player.getBlockFromViewDirection().location,
                            FACE_DIRECTIONS[getDirectionFace(player.getViewDirection())]
                        );
                    }   break;
                    case PointerMode.FREE: {
                        session.pointerBlockLocation = floorVector(sumVectors(
                            player.getHeadLocation(),
                            setVectorLength(player.getViewDirection(),session.config.pointerRange)
                        ));
                    }   break;
                }
                if (session.pointerBlockLocation != null) {
                    // ## Pointer Preview
                    const molang = new Mc.MolangVariableMap();
                    molang.setColorRGBA('variable.color',{red:0,green:0,blue:1,alpha:1});
                    spawnBox(`trebesin:plane_box_`,session.pointerBlockLocation,player.dimension,molang);

                    player.onScreenDisplay.setActionBar('§aTest\n§cTwo\n§bThree\n§dFour\n§aTest\n§cTwo\n§bThree\n§dFour');
                }
            } else {
                session.pointerBlockLocation = null;
            }
        }
    },4);
}

/**
 * Enum for selection modes that the player can use.
 * @readonly
 * @enum {number}
 */
var PointerMode = {
    /** The first block the player view intersects with gets selected. */
    BLOCK: 0,
    /** The block adjecent to the face of the first block the player view intersects with gets selected. */
    FACE: 1,
    /** The block on the position that is exactly `{config.selectionRange}` blocks in front of the player gets selected. */
    FREE: 2
};

/**
 * Enum for selection modes that the player can use.
 * @readonly
 * @enum {number}
 */
var SelectionType = {
    /** Selection which is defined by a pair of 2 points in the corners of a cuboid area fill.*/
    CORNER: 0,
    /** Selection which is defined by a center of a radius and points for x,y,z axis which either define radius or length of a plane. */
    ELIPSE: 1,
    /** Selection which is defined by a collection of points, structure they compose then fills an area between them used as vertices. */
    POINT: 2
};

/**
 * Initializes the Blocky Tools session for a player.
 * @param {Mc.Player} player 
 */
export function initialize(player) {
    SessionStore[player.id] = {
        player: player,
        pointerBlockLocation: null,
        selection: null,
        pointerMode: PointerMode.FACE,
        selectionType: SelectionType.CORNER,
        selectionSaves: [],
        clipboard: null,
        config: {
            pointer: {
                range: 3,
                selectLiquids: false
            }
        }
    };
    sendMessage(`§aInitialized the Block Tools session!`,'§2BT§r',player);
}