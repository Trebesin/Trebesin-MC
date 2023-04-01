//APIs:
import * as Mc from '@minecraft/server';
import { floorVector, setVectorLength, sumVectors, getDirectionFace, multiplyVector, subVectors} from '../../../js_modules/vector';
import { DIMENSION_IDS, FACE_DIRECTIONS } from '../../../mc_modules/constants';
import { spawnBox, spawnLineBox } from '../../../mc_modules/particles';
import { getEquipedItem, sendMessage } from '../../../mc_modules/players';
//Plugins:
import { CornerSelection } from './selection';
import { logMessage } from '../../debug/debug';
import { editBlock, setBlockPermutation, setBlockType } from '../../block_history/block_history';
import { compareBlockStates, copyBlockState } from '../../../mc_modules/blocks';
import * as VectorMath from '../../../js_modules/vectorMath';
//Modules:


//# 
const SessionStore = {};

class LeftClickDetect {
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
        const session = getSession(eventData.source);
        const selection = session.getCurrentSelection();
        selection.setCorner(0,session.pointerBlockLocation);
    });

    Mc.world.events.entityHit.subscribe((eventData) => {
        //logMessage(`EntityHit ${eventData.entity.name} - E:${eventData?.hitEntity?.typeId} B:${eventData?.hitBlock?.typeId} T:${Mc.system.currentTick}`);
        const itemHolding = getEquipedItem(eventData.entity);
        if (itemHolding?.typeId !== 'trebesin:bt_blocky_axe') return;
        const session = getSession(eventData.entity);
        const selection = session.getCurrentSelection();
        selection.setCorner(1,session.pointerBlockLocation);
    });

    //Server.events.itemStartUseOn.subscribe(() => {
    //    logMessage('ItemUseOn')
    //});

    Mc.system.runInterval(() => {
        for (const playerId in SessionStore) {
            /** @type {Session} */
            const session = SessionStore[playerId];
            const player = session.getPlayer();
            
            const selection = session.getCurrentSelection();
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
                        //const targetLocation = player.getBlockFromViewDirection().location;
                        //const viewVector = player.getViewDirection();
                        //const relativeVector = subVectors(
                        //    player.getHeadLocation(),targetLocation
                        //);
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
    if (session == null) session = initializeSession(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    for (const blockLocation of selection.getAllCorners()) {
        sendMessage(`§mX:${blockLocation.x} §qY:${blockLocation.y} §tZ:${blockLocation.z}`,'§2BT§r',player);
        setBlockType(player.dimension.getBlock(blockLocation),blockType,{actorId:player.id,updateType:'blockyTools: player'});
    }
}

export function fillSelection(player,blockType) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];

    selection.getAllBlocks((blockLocation) => {
        setBlockType(player.dimension.getBlock(blockLocation),blockType,{actorId:player.id,updateType:'blockyTools: player'});
    });
}

/**
 * 
 * @param {Mc.Player} player 
 * @param {Mc.BlockPermutation} blockType 
 * @param {object[]} replacePermutations 
 * @param {Mc.BlockPermutation} replacePermutations[].permutation
 * @param {boolean} replacePermutations[].userStates
 * @param {boolean} exclusion 
 */
export function fillReplaceSelection(player,fillPermutation,replacePermutations,exclusion) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    const dimension = selection.getDimension();

    selection.getAllBlocks((blockLocation) => {
        const block = dimension.getBlock(blockLocation);
        const blockMatch = replacePermutations.find(
            ({userStates,permutation}) => {
                return ((
                    userStates && block.permutation === permutation
                ) || (
                    !userStates && block.typeId === permutation.type.id
                ));
            }
        ) != null;
        if (
            (exclusion && !blockMatch) || (!exclusion && blockMatch)
        ) setBlockPermutation(block,fillPermutation.permutation,{actorId:player.id,updateType:'blockyTools: player'});

    });
}

/**
 * 
 * @param {Mc.Player} player
 */
export function copySelection(player) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    const dimension = selection.getDimension();
    const bounds = selection.getBounds();
    const clipboard = {
        locationData: [],
        blockStateData: [],
        bounds: {
            min: {x:0,y:0,z:0},
            max: VectorMath.sub(bounds.max,bounds.min),
            center: VectorMath.sub(bounds.center,bounds.min)
        }
    };

    selection.getAllBlocks((blockLocation) => {
        const blockStateIndex = clipboardGetBlockStateIndex(copyBlockState(dimension.getBlock(blockLocation)),clipboard.blockStateData);
        logMessage(`${blockStateIndex},${JSON.stringify(blockLocation)}`);
        clipboard.locationData.push([
            VectorMath.sub(blockLocation,selection.minCoordinates),blockStateIndex
        ]);
    });

    session.clipboard = clipboard;
}

/**
 * 
 * @param {Mc.Player} player
 */
export function beforePasteSelection(player) {
    let session = SessionStore[player.id];
    if (session == null) return initializeSession(player);

    sendMessage(`Use the commands ".confirm" or ".cancel" to confirm or cancel the paste.`,'§2BT§r',player);

    const pasteDimension = player.dimension;
    const pasteBounds = [
        VectorMath.copy(session.pointerBlockLocation),
        VectorMath.sum(session.pointerBlockLocation,session.clipboard.bounds.max)
    ];

    requestActionConfirmation(player);

    const intervalCheckId = Mc.system.runInterval(() => {
        const molangVariables = new Mc.MolangVariableMap();
        molangVariables.setColorRGBA(`variable.color`,{red:0,green:1,blue:1,alpha:0.85});
        molangVariables.setSpeedAndDirection(`variable.time`,0.051,new Mc.Vector(0,0,0));
        spawnLineBox('trebesin:line_flex2',pasteBounds,pasteDimension,molangVariables);

        const confirm = recieveActionConfirmation(player);
        if (confirm != null) {
            Mc.system.clearRun(intervalCheckId);
            if (confirm) pasteSelection(player,pasteBounds[0],pasteDimension);
        }
    });
}

/**
 * 
 * @param {import('../../../mc_modules/blocks').BlockState} blockState 
 * @param {import('../../../mc_modules/blocks').BlockState[]} dataArray 
 */
function clipboardGetBlockStateIndex(blockState,dataArray) {
    const indexInArray = dataArray.findIndex((savedBlockState) => compareBlockStates(blockState,savedBlockState));
    if (indexInArray >= 0) return indexInArray;
    else return (dataArray.push(blockState) - 1);
}

/**
 * 
 * @param {Mc.Player} player
 */
export function pasteSelection(player,baseLocation,dimension) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    for (let clipboardIndex = 0;clipboardIndex < session.clipboard.locationData.length;clipboardIndex++) {
        const clipboardBlock = session.clipboard.locationData[clipboardIndex];
        const block = dimension.getBlock(VectorMath.sum(baseLocation,clipboardBlock[0]));
        editBlock(block,session.clipboard.blockStateData[clipboardBlock[1]],{actorId:player.id,updateType:'blockyTools: player'});
    }
}

export function flipSelection(player,axis) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    selection.flip(axis);
}

export function getSelectionMinMax(player) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    /** @type {CornerSelection} */
    const selection = session.selections[session.selectionType];
    const bounds = selection.getBounds()
    sendMessage(`MAX: §mX:${bounds.max.x} §qY:${bounds.max.y} §tZ:${bounds.max.z}`,'§2BT§r',player);
    sendMessage(`CENTER: §mX:${bounds.center.x} §qY:${bounds.center.y} §tZ:${bounds.center.z}`,'§2BT§r',player);
    sendMessage(`MIN: §mX:${bounds.min.x} §qY:${bounds.min.y} §tZ:${bounds.min.z}`,'§2BT§r',player);
}

export function insideSelection(player) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

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
export function initializeSession(player) {
    const defaultSelection = new CornerSelection(player,player.dimension);

    SessionStore[player.id] = {
        player: player,
        pointerBlockLocation: null,
        pointerMode: PointerMode.FREE,
        selectionType: SelectionType.CORNER,
        selections: [defaultSelection,null,null],
        clipboard: null,
        actionConfirmState: {
            pending: false,
            confirmation: false
        },
        config: {
            pointer: {
                range: 3,
                selectLiquids: false
            }
        }
    };
    sendMessage(`§aInitialized the Block Tools session!`,'§2BT§r',player);

    //const session = new Session(player);
    //other session

    //return getSession(player.id);
    return SessionStore[player.id];
}


/**
 * Starts a new session to a player.
 * @param {Mc.Player} player 
 * @returns {Session}
 */
export function startSession(player) {
    const session = new Session(player);
    SessionStore[player.id] = session;
    return session;
}

/**
 * Gets a selection associated with a player. Creates a new session if the player doesn't have one yet.
 * @param {Mc.Player} player 
 * @returns {Session}
 */
export function getSession(player) {
    let session = SessionStore[player.id];
    if (session == null) session = startSession(player);
    return session;
}

/**
 * Gets a selection by its Id.
 * @param {Mc.Player} player 
 * @returns {Session}
 */
export function getSessionById(id) {
    return SessionStore[id];
}

//# Action State functions
export function confirmAction(player,confirm) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    if (session.actionConfirmState.pending === 1) {
        session.actionConfirmState.confirmation = confirm;
        session.actionConfirmState.pending = 2;
        if (confirm) sendMessage('§qConfirmed action!','§2BT§r',player);
        else sendMessage('§mCancelled action!','§2BT§r',player);
    } else sendMessage('§nNo action currently pending confirmation!','§2BT§r',player);
}

export function recieveActionConfirmation(player) {
    let session = SessionStore[player.id];
    if (session == null) throw new Error('Session doesn\'t exist and can\'t be created from this call!');

    if (session.actionConfirmState.pending === 0) throw new Error('No action currently pending confirmation!');
    if (session.actionConfirmState.pending === 1) return null;
    if (session.actionConfirmState.pending === 2) {
        const confirmValue = session.actionConfirmState.confirmation;
        session.actionConfirmState.pending = 0;
        session.actionConfirmState.confirmation = null;
        return confirmValue;
    }
}

export function requestActionConfirmation(player) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);

    if (session.actionConfirmState.pending > 0) throw new Error('There is an already pending confirmation for the session!');
    else session.actionConfirmState.pending = 1;
}


//#User Interface functions
export function actionMenu(player,pointerMode) {

}

//#Session State functions
export function switchPointer(player,pointerMode = null) {
    let session = SessionStore[player.id];
    if (session == null) session = initializeSession(player);
    if (pointerMode == null) {
        if (session.pointerMode < 3) session.pointerMode++;
        else session.pointerMode = 0;
    } else {
        session.pointerMode = pointerMode;
    }
}

export function switchSelection(player,selectionType) {

}

//# Sessions:

/**
 * Class used for storing sessions of Blocky Tools plugin bound to a player. It keeps track of configurations, selections and other states of player interaction with the plugin.
 */
class Session {
    /**
     * Creates a new session bound to a player that can be stored and accessed for purposes of Blocky Tools plugin.
     * @param {Mc.Player} player 
     */
    constructor(player) {
        this.id = player.id;

        this.#player = player;
        this.#clipboard = new ClipboardInstance();
        this.#actionConfirmation.pending = ActionPendingState.NONE;
        this.#actionConfirmation.confirm = null;

        this.pointerMode = PointerMode.FREE;
        this.selectionType = SelectionType.CORNER
        this.selections[SelectionType.CORNER] = new CornerSelection(player);
        this.config = {  
            pointer: {
                range: 3,
                selectLiquids: false
            }
        };
    }

    //## Configurations
    switchPointer(pointerMode = null) {
        if (pointerMode == null) {
            if (this.pointerMode < 3) this.pointerMode++;
            else this.pointerMode = 0;
        } else {
            this.pointerMode = pointerMode;
        }
    }

    //## Sending Info
    sendSelectionBounds() {
        const selection = this.getCurrentSelection();
        const bounds = selection.getBounds();
        const player = this.getPlayer();
        sendMessage(`MAX: §mX:${bounds.max.x} §qY:${bounds.max.y} §tZ:${bounds.max.z}`,'§2BT§r',player);
        sendMessage(`CENTER: §mX:${bounds.center.x} §qY:${bounds.center.y} §tZ:${bounds.center.z}`,'§2BT§r',player);
        sendMessage(`MIN: §mX:${bounds.min.x} §qY:${bounds.min.y} §tZ:${bounds.min.z}`,'§2BT§r',player);
    }

    sendSelectionInside() {
        const player = this.getPlayer();
        const selection = this.getCurrentSelection();
        const location = this.pointerBlockLocation;
        sendMessage(`${selection.includes(location)} §mX:${location.x} §qY:${location.y} §tZ:${location.z}`,'§2BT§r',player);
    }

    //## Working with Selections
    copySelection() {
        const clipboard = this.getClipboard();
        const selection = this.getCurrentSelection();
        const dimension = selection.getDimension();
        const bounds = selection.getBounds();
        const copiedData = {
            locations: [],
            bounds: {
                min: {x:0,y:0,z:0},
                max: VectorMath.sub(bounds.max,bounds.min),
                center: VectorMath.sub(bounds.center,bounds.min)
            }
        };
    
        selection.getAllBlocks((blockLocation) => {
            const blockStateIndex = clipboard.getBlockStateIndex(copyBlockState(dimension.getBlock(blockLocation)));
            logMessage(`${blockStateIndex},${JSON.stringify(blockLocation)}`);
            copiedData.locations.push([
                VectorMath.sub(blockLocation,selection.minCoordinates),blockStateIndex
            ]);
        });
    
        clipboard.structureData[0] = copiedData;
        //clipboard.structureData.push(copiedData);
    }

    flip(axis) {
        const selection = this.getCurrentSelection();
        selection.flip(axis);
    }

    //TODO Add a way to rotate, scale, transform, mirror and flip the selection in this phase.
    /**
     * Prepares to paste a selection from the clipboard of the session. It asks the player to confirm the paste and highlights the area the paste will occur inside of.
     * @param {number} clipboardIndex 
     */
    preparePasteSelection(clipboardIndex = 0) {
        sendMessage(`Use the commands ".confirm" or ".cancel" to confirm or cancel the paste.`,'§2BT§r',player);

        const pasteDimension = player.dimension;
        const clipboard = this.getClipboard();
        const pasteBounds = [
            VectorMath.copy(this.pointerBlockLocation),
            VectorMath.sum(this.pointerBlockLocation,clipboard.structureData[index].bounds.max)
        ];

        this.requestActionConfirmation();

        const intervalCheckId = Mc.system.runInterval(() => {
            const molangVariables = new Mc.MolangVariableMap();
            molangVariables.setColorRGBA(`variable.color`,{red:0,green:1,blue:1,alpha:0.85});
            molangVariables.setSpeedAndDirection(`variable.time`,0.051,new Mc.Vector(0,0,0));
            spawnLineBox('trebesin:line_flex2',pasteBounds,pasteDimension,molangVariables);

            const confirm = this.getActionCofirmation();
            if (confirm != null) {
                Mc.system.clearRun(intervalCheckId);
                if (confirm) this.pasteSelection(pasteBounds[0],pasteDimension,clipboardIndex);
            }
        });
    }

    pasteSelection(baseLocation,dimension,clipboardIndex) {
        const player = this.getPlayer();
        const clipboard = this.getClipboard();

        clipboard.getAllBlocks((clipboardLocation,blockState) => {
            const block = dimension.getBlock(VectorMath.sum(baseLocation,clipboardLocation));
            editBlock(
                block,
                blockState,
                {actorId:player.id,updateType:'blockyTools: player'}
            );
        },clipboardIndex);
    }

    /**
     * Sets the permutation of all blocks contained inside the area of the selection.
     * @param {Mc.BlockPermutation} fillPermutation 
     */
    fillSelection(fillPermutation) {
        const player = this.getPlayer();
        const selection = this.getCurrentSelection();
        const dimension = selection.getDimension();

        selection.getAllBlocks((blockLocation) => {
            try {
                setBlockPermutation(
                    dimension.getBlock(blockLocation),
                    fillPermutation,
                    {actorId:player.id,updateType:'blockyTools: player'}
                );
            } catch (error) {
                logMessage(error);
            }
        });
    }

    /**
     * Sets the permutation of all blocks contained inside the area of the selection follow replace rules that allow to only include/exclude specific blockTypes or permutations.
     * @param {Mc.BlockPermutation} fillPermutation 
     * @param {object[]} replacePermutations 
     * @param {Mc.BlockPermutation} replacePermutations[].permutation
     * @param {boolean} replacePermutations[].exactMatch
     * @param {boolean} exclusion 
     */
    fillReplaceSelection(fillPermutation,replacePermutations,exclusion) {
        const player = this.getPlayer();
        const selection = this.getCurrentSelection();
        const dimension = selection.getDimension();

        selection.getAllBlocks((blockLocation) => {
            const block = dimension.getBlock(blockLocation);
            const blockMatch = replacePermutations.find(
                ({exactMatch,permutation}) => {
                    return ((
                        exactMatch && block.permutation === permutation
                    ) || (
                        !exactMatch && block.typeId === permutation.type.id
                    ));
                }
            ) != null;
            if (
                (exclusion && !blockMatch) || (!exclusion && blockMatch)
            ) setBlockPermutation(block,fillPermutation.permutation,{actorId:player.id,updateType:'blockyTools: player'});

        });
    }

    fillSelectionCorners(fillPermutation) {
        const player = this.getPlayer();
        const selection = this.getCurrentSelection();

        for (const blockLocation of selection.getAllCorners()) {
            sendMessage(`§mX:${blockLocation.x} §qY:${blockLocation.y} §tZ:${blockLocation.z}`,'§2BT§r',player);
            setBlockPermutation(
                player.dimension.getBlock(blockLocation),
                fillPermutation,
                {actorId:player.id,updateType:'blockyTools: player'}
            );
        }
    }

    //## Action Confirm
    /**
     * Sents a request to the player of the session to make a confirmation of some action the plugin wants to confirm.
     * @returns {undefined}
     */
    requestActionConfirmation() {
        if (this.#actionConfirmation.pending > ActionPendingState.NONE) throw new Error('There is an already pending confirmation for the session!');
        else this.#actionConfirmation.pending = ActionPendingState.WAIT;
    }

    /**
     * Returns state of the confirmation, either `true` or `false` after player has confirmed the action or `null` when confirmation is still pending from the player.
     * @throws Throws an error when there wasn't a request for confirmation made yet.
     * @returns {boolean | null}
     */
    getActionCofirmation() {
        if (this.#actionConfirmation.pending === ActionPendingState.NONE) throw new Error('No action currently pending confirmation!');
        if (this.#actionConfirmation.pending === ActionPendingState.WAIT) return null;
        if (this.#actionConfirmation.pending === ActionPendingState.DONE) {
            this.#actionConfirmation.pending = ActionPendingState.NONE;
            return this.#actionConfirmation.confirm;
        }
    }

    /**
     * Sets the state of the confirmation for the player, used to confirm an action by a player.
     * @param {boolean} confirmValue `true` if player has confirmed, `false` if player has cancelled the action.
     * @returns {undefined}
     */
    setActionConfirmation(confirmValue) {
        if (this.#actionConfirmation.pending !== ActionPendingState.WAIT) {
            sendMessage('§nNo action currently pending confirmation!','§2BT§r',player)
            return;
        }
        this.#actionConfirmation.confirm = confirmValue;
        this.#actionConfirmation.pending = ActionPendingState.DONE;
        if (confirmValue) sendMessage('§qConfirmed action!','§2BT§r',player);
        else sendMessage('§mCancelled action!','§2BT§r',player);
    }

    //## Getters
    /**
     * Player whom the session belongs to.
     * @returns {Mc.Player}
     */
    getPlayer() {
        return this.#player;
    }
    /**
     * Clipboard instance bound to the session.
     * @returns {ClipboardInstance}
     */
    getClipboard() {
        return this.#clipboard;
    }
    /**
     * Single function that returns the current selection the player is using.
     * @returns {CornerSelection}
     */
    getCurrentSelection() {
        return this.selections[this.selectionType];
    }

    //## Properties
    //### Metadata:
    id
    #player
    //### Configurations:
    pointerMode
    selectionType
    config = {}
    //### State:
    /** @type {import('./selection').Vector3} */
    pointerBlockLocation
    selections = [];
    //### Other:
    #clipboard
    #actionConfirmation = {};
}


//# Clipboard:
class ClipboardInstance {
    constructor() {}

    blockStateData = []
    structureData = []

    getBlockStateIndex(blockState) {
        const indexInArray = this.blockStateData.findIndex((savedBlockState) => compareBlockStates(blockState,savedBlockState));
        if (indexInArray >= 0) return indexInArray;
        else return (this.blockStateData.push(blockState) - 1);
    }

    getAllBlocks(callback,index) {
        const locations = this.structureData[index];
        if (locations == null) return null;
        for (let index = 0;index < locations.length;index++) {
            callback(...locations[index]);
        }
    }
}

//# Types / Constants

/**
 * @typedef ClipboardStructureData
 * @property {import('./selection').Vector3 | number [][]} locations
 * @property {import('./selection').SelectionBounds} bounds
*/

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
export const ActionPendingState = {
    /** No action is pending confirmation. */
    NONE: 0,
    /** The session is currently waiting for user to confirm the action. */
    WAIT: 1,
    /** The session has got confirmation from its player and is pending to be recieved by the plugin.*/
    DONE: 2
};

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