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
            sendMessage('No session initialized! Use ".start" command to continue.','BT', eventData.source);
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
                switch (session.selectionMode) {
                    case SelectionModes.BLOCK: {
                        const location = player.getBlockFromViewDirection().location;
                        const molang = new Mc.MolangVariableMap();
                        molang.setColorRGBA('variable.color',{red:0,green:0,blue:1,alpha:1});
                        spawnBox(`trebesin:plane_box_`,location,player.dimension,molang);
                    }   break;
                    case SelectionModes.FACE: {
                        const face = getDirectionFace(player.getViewDirection());
                        logMessage(JSON.stringify(player.getViewDirection()))
                        logMessage(face);
                        const location = sumVectors(
                            player.getBlockFromViewDirection().location,
                            FACE_DIRECTIONS[getDirectionFace(player.getViewDirection())]
                        );
                        const molang = new Mc.MolangVariableMap();
                        molang.setColorRGBA('variable.color',{red:0,green:0,blue:1,alpha:1});
                        spawnBox(`trebesin:plane_box_`,location,player.dimension,molang);
                    }   break;
                    case SelectionModes.FREE: {
                        const location = floorVector(sumVectors(
                            player.getHeadLocation(),
                            setVectorLength(player.getViewDirection(),session.config.selectionRange)
                        ));
                        const molang = new Mc.MolangVariableMap();
                        molang.setColorRGBA('variable.color',{red:0,green:0,blue:1,alpha:1});
                        spawnBox(`trebesin:plane_box_`,location,player.dimension,molang);
                    }   break;
                }
            }
        }
    },20);
}

/**
 * Enum for selection modes that the player can use.
 * @readonly
 * @enum {number}
 */
var SelectionModes = {
    /** The first block the player view intersects with gets selected. */
    BLOCK: 0,
    /** The block adjecent to the face of the first block the player view intersects with gets selected. */
    FACE: 1,
    /** The block on the position that is exactly `{config.selectionRange}` blocks in front of the player gets selected. */
    FREE: 2
};

/**
 * Initializes the Blocky Tools session for a player.
 * @param {Mc.Player} player 
 */
export function initialize(player) {
    SessionStore[player.id] = {
        player: player,
        selection: null,
        selectionMode: SelectionModes.FACE,
        config: {
            selectionRange: 3,
            selectionLiquids: false,
        }
    };
    sendMessage(`§aInitialized the Block Tools session!`, 'BT',player);
}