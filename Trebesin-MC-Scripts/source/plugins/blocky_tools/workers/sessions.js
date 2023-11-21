//APIs:
import * as Mc from '@minecraft/server';
import { floorVector, setVectorLength, sumVectors, getDirectionFace, multiplyVector, subVectors} from '../../../js_modules/vector';
import { DIMENSION_IDS, FACE_DIRECTIONS } from '../../../mc_modules/constants';
import { expandArea, generateLineBox, spawnBox, spawnLine, spawnLineBox, spawnParticleLine } from '../../../mc_modules/particles';
import { getEquipedItem, sendMessage } from '../../../mc_modules/players';
//Plugins:
import { CornerSelection } from './selection';
import { logMessage } from '../../debug/debug';
import { editBlock, setBlockPermutation, setBlockType, BlockHistoryUpdateTypes } from '../../block_history/block_history';
import * as Blocks from '../../../mc_modules/blocks';
import * as VectorMath from '../../../js_modules/vectorMath';
import * as Geometry from '../../../js_modules/geometry';
//Modules:


//# 
const SessionStore = {};

class LeftClickDetect {
    /**
     * Teleports entity in front of the player's cursor and creates it if it doesn't exist.
     * @param {Mc.Player} player
     */
    run(player) {
        /** @type {Mc.Entity} */
        let playerEntity = this.#playerData[player.id];
        if (playerEntity == null) {
            this.#spawnEntity(player,player.location);
        } else {
            try {
                playerEntity.teleport(VectorMath.sum(player.location,VectorMath.multiply(player.getVelocity(),5)),{dimension:player.dimension,keepVelocity:false});
                playerEntity.getComponent('minecraft:scale').value = 1.0 + (VectorMath.getLengthSquared(player.getVelocity())*8);
            } catch {
                this.#spawnEntity(player,player.location);
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

    /**
     * @param {Mc.Player} player 
     * @param {VectorMath.Vector3} location 
     */
    #spawnEntity(player,location) {
        const playerEntity = player.dimension.spawnEntity('trebesin:left_click_detect',location);
        //const scale = playerEntity.getComponent('minecraft:scale');
        //scale.value = 1.0;
        this.#playerData[player.id] = playerEntity;
    }

    #playerData = {}
}

const leftClickDetector = new LeftClickDetect();

export function main() {

    Mc.world.afterEvents.playerJoin.subscribe((eventData) => {
        leftClickDetector.stop(eventData.playerId);
    });

    Mc.world.afterEvents.itemUse.subscribe((eventData) => {
        if (eventData.itemStack.typeId !== 'trebesin:bt_blocky_axe') return;
        const session = getSession(eventData.source);
        const selection = session.getCurrentSelection();
        selection.setCorner(0,session.pointerBlockLocation);
    });

    Mc.world.afterEvents.entityHitEntity.subscribe((eventData) => {
        //logMessage(`EntityHit ${eventData.entity.name} - E:${eventData?.hitEntity?.typeId} B:${eventData?.hitBlock?.typeId} T:${Mc.system.currentTick}`);
        const itemHolding = getEquipedItem(eventData.damagingEntity);
        if (itemHolding?.typeId !== 'trebesin:bt_blocky_axe') return;
        const session = getSession(eventData.damagingEntity);
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
                try { 
                    session.updatePointerBlockLocation();
                } catch (error) {
                    logMessage(`[blocky_tools@workers/sessions.js] ERROR - session.updatePointerBlockLocation():\n${error}`);
                }
                //## Pointer Preview
                if (session.pointerBlockLocation != null) {
                    const molang = new Mc.MolangVariableMap();
                    molang.setColorRGBA('variable.color',{red:1,green:0,blue:0,alpha:1});
                    spawnBox(`trebesin:plane_box_`,session.pointerBlockLocation,player.dimension,molang,0.01);
                }
                player.onScreenDisplay.setActionBar(
                    `[§aBlocky §2Tools§r] ${ session.pointerBlockLocation != null ? `[${session.pointerBlockLocation.x},${session.pointerBlockLocation.y},${session.pointerBlockLocation.z}]` : ''}\n`+
                    `§cPointer Mode: §l${PointerModeNames[session.pointerMode]}§r\n`+
                    `§bSelection Type: §l${SelectionTypeNames[session.selectionType]}§r\n`+
                    `§bAction: §l${session.getActionString()}§r\n`
                );
            } else {
                session.pointerBlockLocation = null;
                leftClickDetector.stop(player.id);
            }

            if (session.pasteState.clipboardIndex != null) {
                const molang = new Mc.MolangVariableMap();
                molang.setColorRGBA('variable.color',{red:0,green:1,blue:1,alpha:1});
                spawnBox(`trebesin:plane_box_`,session.pasteState.originLocation,player.dimension,molang,0.01);
            }
            //## Paste Action Update
            try { 
                session.processPasteAction();
            } catch (error) {
                logMessage(`[blocky_tools@workers/sessions.js] ERROR - session.processPasteAction():\n${error}`);
                session.pasteState.clipboardIndex = null;
            }
        }
    },1);

    Mc.system.runInterval(() => {
        for (const dimensionId of DIMENSION_IDS) {
            for (const entity of Mc.world.getDimension(dimensionId).getEntities({type:'trebesin:left_click_detect'})) {
                entity.triggerEvent('trebesin:make_despawn');
            }
        }
    },3600);

    Mc.system.runInterval(() => {
        for (const playerId in SessionStore) {
            const session = SessionStore[playerId];
            session.updateActionPercent();
        }
    },20);
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
        this.pasteState = {
            originLocation: null,
            clipboardIndex: null,
            dimension: null
        };
        this.actionState = {
            id: null,
            progress: 0,
            maxSteps: 0
        };
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
    /**
     * 
     * @param {object[]} permutations 
     * @param {Mc.BlockPermutation} permutations[].permutation
     * @param {boolean} permutations[].exactMatch
     * @param {boolean} exclusion 
     */
    async copySelection(permutations,exclusion) {
        const clipboard = this.getClipboard();
        const selection = this.getCurrentSelection();
        const dimension = selection.getDimension();
        const bounds = selection.getBounds();
        const player = this.getPlayer();
        
        sendMessage(`Started copying selected area!`,'§2BT§r',player);
        const copiedData = {
            locations: [],
            bounds: {
                min: {x:0,y:0,z:0},
                max: VectorMath.sub(bounds.max,bounds.min),
                center: VectorMath.sub(bounds.center,bounds.min)
            },
            particles: null,
            config: {
                rotation: {x:0,y:0,z:0},
                scale: {x:1,y:1,z:1},
                flip: {x:false,y:false,z:false}
            }
        };

        copiedData.particles = generateLineBox([copiedData.bounds.min,copiedData.bounds.max],{red:0,green:1,blue:1,alpha:0.85});
    
        await selection.getAllBlocks((blockLocation) => {
            try {
                const block = dimension.getBlock(blockLocation);
                const blockMatch = permutations.find(
                    ({exactMatch,permutation}) => {
                        return ((
                            exactMatch && block.permutation === permutation
                        ) || (
                            !exactMatch && block.typeId === permutation.type.id
                        ));
                    }
                ) != null;
                if ((exclusion && blockMatch) || (!exclusion && !blockMatch)) return;
                
                const blockState = Blocks.copyBlockState(block);
                const blockStateIndex = clipboard.getBlockStateIndex(blockState);
                //logMessage(`${blockStateIndex},${JSON.stringify(blockLocation)}`);
                copiedData.locations.push([
                    VectorMath.sub(blockLocation,selection.minCoordinates),blockStateIndex
                ]);
            } catch (error) {
                logMessage(`Failed to copy block [§m${blockLocation.x},§q${blockLocation.y},§t${blockLocation.z}] due to error:\n ${error}`);
            }
        });
    
        sendMessage(`Finished copying §l§m${copiedData.locations.length}§r blocks!`,'§2BT§r',player);
        clipboard.structureData[0] = copiedData;
        //clipboard.structureData.push(copiedData);
    }

    flip(axis) {
        const selection = this.getCurrentSelection();
        selection.flip(axis);
    }

    //TODO Add a way to rotate, scale, translate, mirror and flip the selection in this phase.
    /**
     * Prepares to paste a selection from the clipboard of the session. It asks the player to confirm the paste and highlights the area the paste will occur inside of.
     * @param {VectorMath.Vector3} originLocation
     * @param {number} clipboardIndex 
     */
    preparePasteSelection(originLocation,clipboardIndex = 0) {
        const player = this.getPlayer();

        this.requestActionConfirmation();
        sendMessage(`Use the commands ".confirm" or ".cancel" to confirm or cancel the paste.`,'§2BT§r',player);

        this.pasteState.dimension = player.dimension;
        this.pasteState.originLocation = originLocation;
        this.pasteState.clipboardIndex = clipboardIndex;
    }

    pasteSelection(baseLocation,dimension,clipboardIndex) {
        const player = this.getPlayer();
        const clipboard = this.getClipboard();

        clipboard.getAllBlocksProccessed((clipboardLocation,blockState) => {
            const block = dimension.getBlock(VectorMath.sum(baseLocation,clipboardLocation));
            editBlock(
                block,
                blockState,
                {actorId:player.id,updateType:BlockHistoryUpdateTypes.blockyTools}
            );
        },clipboardIndex);
    }

    /**
     * Sets the permutation of all blocks contained inside the area of the selection.
     * @param {Mc.BlockPermutation} fillPermutation 
     */
    async fillSelection(fillPermutation,options) {
        const player = this.getPlayer();
        const selection = this.getCurrentSelection();
        const dimension = selection.getDimension();

        const fullProgress = selection.getArea();
        this.setCurrentAction(SessionActionIds.SELECTION_FILL,fullProgress);

        sendMessage(`Started copying selected area!`,'§2BT§r',player);
        await selection.getBlocks(async (blockLocation) => {
            this.progressCurrentAction();
            setBlockPermutation(
                dimension.getBlock(blockLocation),
                fillPermutation,
                {actorId:player.id,updateType:BlockHistoryUpdateTypes.blockyTools}
            );
            
        },options);

        sendMessage(`Finished filling!`,'§2BT§r',player);
        this.setCurrentAction(null,null);
    }

    /**
     * Sets the permutation of all blocks on the outline of the selection.
     * @param {Mc.BlockPermutation} fillPermutation 
     */
    async fillSelectionOutline(fillPermutation,options) {
        const player = this.getPlayer();
        const selection = this.getCurrentSelection();
        const dimension = selection.getDimension();

        await selection.getOutlineBlocks(async (blockLocation) => {
            setBlockPermutation(
                dimension.getBlock(blockLocation),
                fillPermutation,
                {actorId:player.id,updateType:BlockHistoryUpdateTypes.blockyTools}
            );
            
        },options);
    }

    /**
     * Sets the permutation of all blocks contained inside the area of the selection follow replace rules that allow to only include/exclude specific blockTypes or permutations.
     * @param {Mc.BlockPermutation} fillPermutation 
     * @param {object[]} replacePermutations 
     * @param {Mc.BlockPermutation} replacePermutations[].permutation
     * @param {boolean} replacePermutations[].exactMatch
     * @param {boolean} exclusion 
     */
    async fillReplaceSelection(fillPermutation,replacePermutations,exclusion) {
        const player = this.getPlayer();
        const selection = this.getCurrentSelection();
        const dimension = selection.getDimension();
        await selection.getAllBlocks(async (blockLocation) => {
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
            ) setBlockPermutation(block,fillPermutation.permutation,{actorId:player.id,updateType:BlockHistoryUpdateTypes.blockyTools});
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
     * Senss a request to the player of the session to make a confirmation of some action the plugin wants to confirm.
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
        const player = this.getPlayer();
        if (this.#actionConfirmation.pending !== ActionPendingState.WAIT) {
            sendMessage('§nNo action currently pending confirmation!','§2BT§r',player);
            return;
        }
        this.#actionConfirmation.confirm = confirmValue;
        this.#actionConfirmation.pending = ActionPendingState.DONE;
        if (confirmValue) sendMessage('§qConfirmed action!','§2BT§r',player);
        else sendMessage('§mCancelled action!','§2BT§r',player);
    }

    //## Action State
    /**
     * Sets the current action.
     * @param {number | null} id 
     */
    setCurrentAction(id,fullProgress) {
        this.actionState.id = id;
        this.actionState.fullProgress = fullProgress;
        this.actionState.currentProgress = 0;
        this.actionState.percentDone = 0;
    }

    progressCurrentAction() {
        return ++this.actionState.currentProgress;
    }

    updateActionPercent() {
        this.actionState.percentDone = Math.round((this.actionState.currentProgress*100)/this.actionState.fullProgress);
    }

    getActionString() {
        if (this.actionState.id == null) return 'None';
        return `§q§l${SessionActions[this.actionState.id].name}§r - §p${this.actionState.percentDone}§u%`;
    }

    //## State Update Functions *Designed to run inside an interval.*
    updatePointerBlockLocation() {
        const player = this.getPlayer();
        switch (this.pointerMode) {
            case PointerMode.BLOCK: {
                this.pointerBlockLocation = player.getBlockFromViewDirection().location;
            }   break;
            case PointerMode.FACE: {
                //const targetLocation = player.getBlockFromViewDirection().location;
                //const viewVector = player.getViewDirection();
                //const relativeVector = subVectors(
                //    player.getHeadLocation(),targetLocation
                //);
                this.pointerBlockLocation = sumVectors(
                    player.getBlockFromViewDirection().location,
                    FACE_DIRECTIONS[getDirectionFace(player.getViewDirection())]
                );
                //session.pointerBlockLocation = floorVector(
                //    sumVectors(sumVectors(targetLocation,{x:0.5,y:0.5,z:0.5}),multiplyVector(viewVector,-1))
                //);
            }   break;
            case PointerMode.FREE: {
                this.pointerBlockLocation = floorVector(sumVectors(
                    player.getHeadLocation(),
                    setVectorLength(player.getViewDirection(),this.config.pointer.range)
                ));
            }   break;
            case PointerMode.ACTION: {
                this.pointerBlockLocation = null;
            }
        }
    }

    processPasteAction() {
        if (this.pasteState.clipboardIndex == null) return;
        const clipboard = this.getClipboard();
        clipboard.getAllParticles((particle) => {
            spawnParticleLine(
                'trebesin:line_flex2',
                this.pasteState.dimension,
                VectorMath.sum(this.pasteState.originLocation,particle.location),
                particle.direction,
                particle.length,
                0.051,
                particle.color
            );
        },this.pasteState.clipboardIndex);

        const confirm = this.getActionCofirmation();
        if (confirm != null) {
            if (confirm) this.pasteSelection(
                this.pasteState.originLocation,
                this.pasteState.dimension,
                this.pasteState.clipboardIndex
            );
            this.pasteState.clipboardIndex = null;
        }
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
    /** @type {VectorMath.Vector3} */
    pointerBlockLocation
    selections = [];
    pasteState = {};
    actionState = {};
    //### Other:
    #clipboard
    #actionConfirmation = {};
}


//# Clipboard:
class ClipboardInstance {
    constructor() {}

    /** @type {Blocks.BlockState[]} */
    blockStateData = []
    /** @type {ClipboardStructureData[]} */
    structureData = []

    /**
     * 
     * @param {Blocks.BlockState} blockState 
     * @returns {number}
     */
    getBlockStateIndex(blockState) {
        const indexInArray = this.blockStateData.findIndex((savedBlockState) => Blocks.compareBlockStates(blockState,savedBlockState));
        if (indexInArray >= 0) return indexInArray;
        else return (this.blockStateData.push(blockState) - 1);
    }

    /**
     * 
     * @param {ClipboardBlocksCallback} callback 
     * @param {number} clipboardIndex
     * @returns 
     */
    getAllBlocks(callback,clipboardIndex) {
        const locations = this.structureData[clipboardIndex].locations;
        if (locations == null) return null;
        for (let index = 0;index < locations.length;index++) {
            callback(locations[index][0],this.blockStateData[locations[index][1]]);
        }
    }

    
    /**
     * Translates the position of the origin and all locations relative to it in the direction provided by `translation` vector.
     * * Useful to change the relative point which rotation occurs around. *
     * @param {VectorMath.Vector3} translation Direction to move the block locations.
     * @param {number} clipboardIndex
     * @returns 
     */
    translateLocations(translation,clipboardIndex) {
        const bounds = this.getBounds(clipboardIndex);
        const locations = this.structureData[clipboardIndex].locations;
        for (let index = 0;index < locations.length;index++) {
            locations[index][0] = VectorMath.sum(locations[index][0],translation);
        }
        bounds.max = VectorMath.sum(bounds.max,translation);
        bounds.min = VectorMath.sum(bounds.min,translation);
        bounds.center = VectorMath.sum(bounds.center,translation);
    }

    /**
     * 
     * @param {ClipboardBlocksCallback} callback 
     * @param {number} clipboardIndex
     * @returns 
     */
    async getAllBlocksProccessed(callback,clipboardIndex) {
        const config = this.getConfig(clipboardIndex);
        const ogBounds = this.getBounds(clipboardIndex);
        const bounds = {
            max: VectorMath.vectorMultiply(ogBounds.max,config.scale),
            center: VectorMath.vectorMultiply(ogBounds.center,config.scale),
            min: VectorMath.vectorMultiply(ogBounds.min,config.scale)
        };
        const locations = this.structureData[clipboardIndex].locations;
        if (locations == null) return null;
        //### Scaling process:
        if (!VectorMath.compare(config.scale,{x:1,y:1,z:1})) {
            const blockMap = new Map();
            for (let index = 0;index < locations.length;++index) {
                let blockLocation = VectorMath.copy(locations[index][0]);
                const scaledLocations = Geometry.scaleBlockLocation(blockLocation,config.scale);
                for (let locationIndex = 0;locationIndex < scaledLocations.length;++locationIndex) {
                    const location = scaledLocations[locationIndex];
                    const flooredLocation = VectorMath.floor(location);
                    const locationString = `${flooredLocation.x},${flooredLocation.y},${flooredLocation.z}`;
                    const distance = Math.abs(location.x-flooredLocation.x-0.5)+Math.abs(location.y-flooredLocation.y-0.5)+Math.abs(location.z-flooredLocation.z-0.5);
                    if (!blockMap.has(locationString) || blockMap.get(locationString).distance > distance) {
                        blockMap.set(locationString,{
                            distance,
                            block: [flooredLocation,locations[index][1]]
                        });
                    }
                }
            }
            locations.length = 0;
            blockMap.forEach((value) => {
                locations.push(value.block);
            })
        }
        //### Flipping and rotation:
        for (let index = 0;index < locations.length;index++) {
            const blockState = this.blockStateData[locations[index][1]];
            let blockLocation = VectorMath.copy(locations[index][0]);
            for (const axis in config.flip) {
                if (!config.flip[axis]) continue;
                blockLocation = VectorMath.flip(blockLocation,bounds.center,axis);
            }
            for (const axis in config.rotation) {
                const angleRadians = (Math.PI/180)*config.rotation[axis];
                const angleResults = {
                    sin: Math.sin(angleRadians),
                    cos: Math.cos(angleRadians)
                }
                if (config.rotation[axis] === 0) continue;
                blockLocation = VectorMath.rotateSinCos(blockLocation,angleResults,axis);
            }
            await callback(blockLocation,blockState);
        }
    }

    getAllParticles(callback,clipboardIndex) {
        const particles = this.structureData[clipboardIndex].particles;
        if (particles == null) return null;
        for (let index = 0;index < particles.length;index++) {
            callback(particles[index]);
        }
    }

    getBounds(clipboardIndex) {
        return this.structureData[clipboardIndex].bounds;
    }
    
    getConfig(clipboardIndex) {
        return this.structureData[clipboardIndex].config;
    }

    /**
     * Calling this function updates the particle preview for the clipboard contents.
     * *Use mainly when updating configs of the clipboard contents or translating block locations.*
     * @param {number} clipboardIndex Index of the clipboard contents.
     */
    updateParticlePreview(clipboardIndex) {
        const bounds = this.getBounds(clipboardIndex);
        const config = this.getConfig(clipboardIndex);
        //### Create new particle set forming a box:
        const particleData = generateLineBox([bounds.min,bounds.max],{red:0,green:1,blue:1,alpha:0.85});

        //### Prepare center value for flip:
        const particleBounds = expandArea([bounds.min,bounds.max],[0,1]); //*Particles are 1 block longer than the actual volume.
        const particleCenter = VectorMath.divide(
            VectorMath.sum(
                VectorMath.getMaximalVector(particleBounds),
                VectorMath.getMinimalVector(particleBounds)
            ),2
        );

        //### Transform the particles !!(order: flip -> scale -> rotate)!!:
        for (let index = 0;index < particleData.length; index++) {
            const particle = particleData[index];
            let {location,direction,length} = particle;
            //### Apply Flip:
            for (const axis in config.flip) {
                if (!config.flip[axis]) continue;
                location = VectorMath.flip(location,particleCenter,axis);
                direction = VectorMath.flip(direction,{x:0,y:0,z:0},axis);
            }
            //### Apply Scale:
            location = VectorMath.vectorMultiply(location,config.scale);
            direction = VectorMath.vectorMultiply(direction,config.scale);
            length = VectorMath.getLength(direction);
            //### Apply Rotation:
            for (const axis in config.rotation) {
                if (config.rotation[axis] === 0) continue;
                const angleRadians = (Math.PI/180)*config.rotation[axis];
                const angleResults = {
                    sin: Math.sin(angleRadians),
                    cos: Math.cos(angleRadians)
                }
                location = VectorMath.rotateSinCos(location,angleResults,axis);
                direction = VectorMath.rotateSinCos(direction,angleResults,axis);
            }
            //### Save the calculated values:
            particleData[index].location = location;
            particleData[index].length = length;
            particleData[index].direction = direction;
        }
        //### Save the particles:
        this.structureData[clipboardIndex].particles = particleData;
    }
}


const SessionActions = {
    0: {
        groupId: null,
        name: 'Fill'
    },
    1: {
        groupId: null,
        name: 'Outline Fill'
    },
    2: {
        groupId: null,
        name: 'Fill Replace'
    },
    100: {
        groupId: 0,
        name: 'Copy'
    },
    101: {
        groupId: 0,
        name: 'Paste'
    }
}

const SessionActionIds = {
    SELECTION_FILL: 0,
    SELECTION_OUTLINE_FILL: 1,
    SELECTION_FILL_REPLACE: 2,
    CLIPBOARD_COPY: 100,
    CLIPBOARD_PASTE: 101
}

//# Types / Constants

/**
 * @callback ClipboardBlocksCallback Callback that gives a `blockLocation` and a `blockState`.
 * @param {VectorMath.Vector3} blockLocation
 * @param {import('../../../mc_modules/blocks').BlockState} blockState
 */

/**
 * @typedef ClipboardStructureConfig
 * @property {VectorMath.Vector3} rotation Defines how the clipboard contents are rotated on each axis.
 * @property {VectorMath.Vector3} scale Defines how the clipboard contents are rotated on each axis.
 * @property {object} flip Defines if the clipboard contents are flipped on any axis.
 * @property {boolean} flip.x Flip value for the X axis.
 * @property {boolean} flip.y Flip value for the Y axis.
 * @property {boolean} flip.z Flip value for the Z axis.
 */

/**
 * @typedef ClipboardStructureData Interface to define a set of blocks that are copied to the clipboard of a session.
 * @property {VectorMath.Vector3 | number [][]} locations Array of arrays that consist of 2 items - **0**: `Vector3` to define a location relative to an origin and **1**: an index `number` that defines the block state coresponding to the location.
 * @property {import('./selection').SelectionBounds} bounds Bounds of the clipboard contents that are important to technical workings of the clipboard.
 * @property {object[]} particles Array of particles that show the user what is inside the clipboard contents.
 * @property {ClipboardStructureConfig} config Configurations that define how the user has manipulated the clipboard contents, it gets processed and presented when the user pastes the data.
*/

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