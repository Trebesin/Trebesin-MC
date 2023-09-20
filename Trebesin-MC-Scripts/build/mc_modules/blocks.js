/*
    "blocks.js" - Helper functions to work with MC blocks.
    Copyright (C) 2023  PavelDobCZ23

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
//! Rename BlockState to BlockData or RawBlockData or RawBlock and so on... (to avoid confusion with API terminology)
import * as Mc from '@minecraft/server';
import * as VectorMath from './../js_modules/vectorMath';
import { logMessage, sendLogMessage } from '../plugins/debug/debug';
import { DIRECTIONS, BLOCK_STATE_COMPONENTS } from './constants';
/**
 * Function for comparing 2 `Block` class objects.
 * @param {Mc.Block} blockA 1st block to compare the other with.
 * @param {Mc.Block} blockB The other block to compare the 1st with.
 * @param {boolean} checkLocation If the location of the block should be checked as well.
 * @returns {boolean} Boolean that is equal to `true` if the blocks are identical, otherwise `false`.
 */
export function compareBlocks(blockA, blockB, checkLocation = false) {
    if (blockA == null || blockB == null ||
        blockA.typeId !== blockB.typeId ||
        blockA.isWaterlogged !== blockB.isWaterlogged)
        return false;
    if (checkLocation) {
        if (!(blockA.dimension.id === blockB.dimension.id &&
            blockA.location.x === blockB.location.x &&
            blockA.location.y === blockB.location.y &&
            blockA.location.z === blockB.location.z))
            return false;
    }
    return (blockA.permutation === blockB.permutation);
}
/**
 * Function to copy `Block` class objects with data that define its state regardless of its location.
 * @param {Mc.Block} block Block to copy.
 * @param {boolean} [includePosition] If `true` the block state information will contain `location` and `dimension` properties.
 * @returns {BlockState} Object containing copies of selected properties of the block.
 */
export function copyBlockState(block, includePosition = false) {
    if (block == null)
        return null;
    const blockState = {
        typeId: block.typeId,
        isWaterlogged: block.isWaterlogged,
        permutation: block.permutation?.clone(),
        components: copyBlockComponents(block)
    };
    if (includePosition) {
        blockState.dimension = block.dimension;
        blockState.location = block.location;
    }
    return blockState;
}
/**
 * Function to apply block state data to an existing block.
 * @param {Mc.Block} block Block to apply the state onto.
 * @param {BlockState} blockState Block state data to apply.
 */
export function applyBlockState(block, blockState) {
    if (blockState.typeId)
        block.setType(Mc.MinecraftBlockTypes.get(blockState.typeId));
    if (blockState.isWaterlogged)
        block.isWaterlogged = blockState.isWaterlogged;
    if (blockState.permutation)
        block.setPermutation(blockState.permutation);
    if (blockState.components)
        applyBlockComponents(block, blockState.components);
}
/**
 * Function to compare if 2 block states are matching.
 * @param {BlockState} blockStateA 1st block state data to compare.
 * @param {BlockState} blockStateB 2nd block state data to compare.
 * @param {boolean} ignoreComponents If `true` components will automatically pass the check.
 * @returns {boolean}
 */
export function compareBlockStates(blockStateA, blockStateB, ignoreComponents = false) {
    return (blockStateA != null && blockStateB != null &&
        blockStateA.typeId === blockStateB.typeId &&
        blockStateA.isWaterlogged === blockStateB.isWaterlogged &&
        blockStateA.permutation === blockStateB.permutation &&
        (ignoreComponents || compareBlockComponents(blockStateA.components, blockStateB.components)));
}
/**
 * Function to compare if 2 block component states are matching.
 * @param {BlockComponentState} componentsA First block component state data to compare.
 * @param {BlockComponentState} componentsB Second block component state data to compare.
 * @returns {boolean | undefined} Returns the result of the comparison or `undefined` if any of the components are invalid.
 */
export function compareBlockComponents(componentsA, componentsB) {
    if (componentsA == null || componentsB == null)
        return undefined;
    for (const componentId in BLOCK_STATE_COMPONENTS) {
        const componentDataA = componentsA[componentId];
        const componentDataB = componentsB[componentId];
        if (componentDataA != null && componentDataB != null) {
            switch (componentId) {
                case 'inventory':
                    {
                        return false;
                    }
                    break;
                case 'sign':
                    {
                        const signCheck = (componentDataA.text === componentDataB.text &&
                            componentDataA.dyeColor === componentDataB.dyeColor &&
                            (componentDataA.rawText == null && componentDataB.rawText == null));
                        if (!signCheck)
                            return false;
                    }
                    break;
            }
        }
        else if ((componentDataA != null && componentDataB == null) ||
            (componentDataA == null && componentDataB != null))
            return false;
    }
    return true;
}
/**
 * @typedef BlockState
 * @prop {string} typeId ID of the type of the block.
 * @prop {boolean} isWaterlogged Waterlog state of the block.
 * @prop {Mc.BlockPermutation} permutation Block permutation.
 * @prop {BlockComponentState} components State of the block components.
 * @prop {Mc.Dimension} [dimension] Dimension of a block. *Only included if position is explicitly requested.*
 * @prop {VectorMath.Vector3} [location] Coordinates of a block. *Only included if position is explicitly requested.*
 */
/**
 * @typedef BlockSignComponentState Contains data of block sign component saved in a simple object.
 * @prop {string} text The sign text.
 * @prop {Mc.RawText} rawText The sign text if defined as a `RawMessage`.
 * @prop {Mc.DyeColor} dyeColor Dye color of the sign text.
 */
/**
 * @typedef BlockComponentState Contains data of block components saved in a simple object.
 * @prop {Mc.ItemStack[]} inventory Array of `ItemStack` or `null`/`undefined` values which's index coresponds to the slot they are contained in inside the container.
 * @prop {BlockSignComponentState} sign Sign component data.
 */
/**
 * Function to copy all components of a block.
 * @param {Mc.Block} block Block to copy.
 * @returns {BlockComponentState | undefined} Object containing copies of components of the block. `undefined` if the block is invalid.
 */
export function copyBlockComponents(block) {
    if (block == null)
        return undefined;
    const blockComponents = {};
    /** @type {Mc.BlockInventoryComponent} */
    const inventory = block.getComponent('inventory');
    if (inventory != null && inventory?.container != null) {
        blockComponents.inventory = [];
        const { container } = inventory;
        for (let slotIndex = 0; slotIndex < container.size; slotIndex++) {
            try {
                blockComponents.inventory[slotIndex] = container.getSlot(slotIndex).clone();
            }
            catch {
                blockComponents.inventory[slotIndex] = null;
            }
        }
    }
    /** @type {Mc.BlockSignComponent} */
    const sign = block.getComponent('sign');
    if (sign != null) {
        blockComponents.sign = {
            text: sign.getText(),
            rawText: sign.getRawText(),
            dyeColor: sign.getTextDyeColor()
        };
    }
    return blockComponents;
    //!These components do not have getter functions:
    //const lavaContainer = block.getComponent('lavaContainer');
    //const potionContainer = block.getComponent('potionContainer');
    //const snowContainer = block.getComponent('snowContainer');
    //const waterContainer = block.getComponent('waterContainer');
    //const piston = block.getComponent('piston');
    //const recordPlayer = block.getComponent('recordPlayer');
}
/**
 * Function to apply components from a co.
 * @param {Mc.Block} block Affected block.
 * @param {BlockComponentState} blockComponents Block components to apply.
 */
export function applyBlockComponents(block, blockComponents) {
    for (let componentId in blockComponents) {
        const componentData = blockComponents[componentId];
        const component = block.getComponent(componentId);
        if (component == null)
            continue;
        switch (componentId) {
            case 'inventory':
                {
                    const container = component.container;
                    for (let slotIndex = 0; slotIndex < componentData.length; slotIndex++) {
                        container.setItem(slotIndex, componentData[slotIndex]);
                    }
                }
                break;
            case 'sign':
                {
                    component.setText(componentData.text ?? componentData.rawText);
                    component.setTextDyeColor(componentData.dyeColor);
                }
                break;
        }
    }
}
//# Block Update Functions:
export function getAdjecentBlockCopies(coord, dimension) {
    const blockArray = [];
    for (let index = 0; index < DIRECTIONS.length; index++) {
        const face = DIRECTIONS[index];
        blockArray.push(copyBlockState(dimension.getBlock(VectorMath.sum(coord, face)), true));
    }
    return blockArray;
}
export function getAdjecentBlocks(coord, dimension) {
    const blockArray = [];
    for (let index = 0; index < DIRECTIONS.length; index++) {
        const face = DIRECTIONS[index];
        blockArray.push(dimension.getBlock(VectorMath.sum(coord, face)));
    }
    return blockArray;
}
function getAdjecentBlockCoords(coord) {
    const coordArray = [];
    for (let index = 0; index < DIRECTIONS.length; index++) {
        coordArray.push(VectorMath.sum(coord, DIRECTIONS[index]));
    }
    return coordArray;
}
export async function blockUpdateIteration(location, dimension, callback) {
    sendLogMessage(`starting block update iteration @ ${location.x},${location.y},${location.z} [${Mc.system.currentTick}]`);
    let blockUpdateSignal = [];
    blockUpdateSignal.push(...getAdjecentBlockCopies(location, dimension));
    while (blockUpdateSignal.length !== 0) {
        blockUpdateSignal = await waitForNextTick(() => {
            const newBlockUpdates = [];
            for (let index = 0; index < blockUpdateSignal.length; index++) {
                const blockBefore = blockUpdateSignal[index];
                const blockLocation = blockBefore.location;
                const blockAfter = copyBlockState(dimension.getBlock(blockLocation), true);
                if (!compareBlockStates(blockBefore, blockAfter, true)) {
                    const adjecentBlocks = getAdjecentBlockCopies(blockLocation, dimension);
                    for (let adjecentIndex = 0; adjecentIndex < adjecentBlocks.length; adjecentIndex++) {
                        const adjecentBlock = adjecentBlocks[adjecentIndex];
                        if (newBlockUpdates.find((block) => VectorMath.compare(block.location, adjecentBlock.location)) == null) {
                            newBlockUpdates.push(adjecentBlock);
                        }
                    }
                    callback(blockBefore, blockAfter, Mc.system.currentTick);
                }
            }
            return newBlockUpdates;
        });
    }
    logMessage(`ending block update iteration [${Mc.system.currentTick}]`);
}
async function blockUpdateIterationObject(location, dimension, callback) {
    let blockUpdateSignal = {};
    const initialAdjecentBlocks = getAdjecentBlockCopies(location, dimension);
    for (let adjecentIndex = 0; adjecentIndex < initialAdjecentBlocks.length; adjecentIndex++) {
        const adjecentBlock = initialAdjecentBlocks[adjecentIndex];
        const adjecentBlockId = `${adjecentBlock.location.x},${adjecentBlock.location.y},${adjecentBlock.location.z}`;
        blockUpdateSignal[adjecentBlockId] = adjecentBlock;
    }
    while (!isEmptyObject(blockUpdateSignal)) {
        blockUpdateSignal = await waitForNextTick(() => {
            const newBlockUpdates = {};
            for (const blockBeforeId in blockUpdateSignal) {
                const blockBefore = blockUpdateSignal[blockBeforeId];
                const blockLocation = blockBefore.location;
                const blockAfter = copyBlockState(dimension.getBlock(blockLocation), true);
                if (!compareBlockStates(blockBefore, blockAfter, true)) {
                    const adjecentBlocks = getAdjecentBlockCopies(blockLocation, dimension);
                    for (let adjecentIndex = 0; adjecentIndex < adjecentBlocks.length; adjecentIndex++) {
                        const adjecentBlock = adjecentBlocks[adjecentIndex];
                        const adjecentBlockId = `${adjecentBlock.location.x},${adjecentBlock.location.y},${adjecentBlock.location.z}`;
                        newBlockUpdates[adjecentBlockId] = adjecentBlock;
                    }
                    callback(blockBefore, blockAfter, Mc.system.currentTick);
                }
            }
            return newBlockUpdates;
        });
    }
}
async function waitForNextTick(callback) {
    return new Promise((resolve, reject) => {
        Mc.system.runTimeout(() => {
            try {
                resolve(callback());
            }
            catch (error) {
                reject(error);
            }
        });
    });
}
function isEmptyObject(object) {
    for (const _ in object)
        return false;
    return true;
}
export function generateBlockArea(coord, steps = 10, callback = null) {
    const coords = [];
    const vectorDefinitions = {};
    //Tertiary vectors are sent at the beginning from the starting coordinate and also from the secondary and primary vectors. Those cover the whole Y axis.
    vectorDefinitions.tertiary = [
        {
            vector: { x: 0, y: 1, z: 0 }
        },
        {
            vector: { x: 0, y: -1, z: 0 }
        }
    ];
    //Secondary vectors are sent by the primary vectors. Those cover each X,Z quadrant of the area.
    vectorDefinitions.secondary = [
        {
            vector: { x: 0, y: 0, z: 1 },
            sends: vectorDefinitions.tertiary
        },
        {
            vector: { x: 0, y: 0, z: -1 },
            sends: vectorDefinitions.tertiary
        },
        {
            vector: { x: -1, y: 0, z: 0 },
            sends: vectorDefinitions.tertiary
        },
        {
            vector: { x: 1, y: 0, z: 0 },
            sends: vectorDefinitions.tertiary
        }
    ];
    //Primary vectors are sent at the beginning from the starting coordinate. Those are the edges between the X,Z quadrants of the area.
    vectorDefinitions.primary = [
        {
            vector: { x: 1, y: 0, z: 0 },
            sends: [vectorDefinitions.secondary[0], ...vectorDefinitions.tertiary]
        },
        {
            vector: { x: -1, y: 0, z: 0 },
            sends: [vectorDefinitions.secondary[1], ...vectorDefinitions.tertiary]
        },
        {
            vector: { x: 0, y: 0, z: 1 },
            sends: [vectorDefinitions.secondary[2], ...vectorDefinitions.tertiary]
        },
        {
            vector: { x: 0, y: 0, z: -1 },
            sends: [vectorDefinitions.secondary[3], ...vectorDefinitions.tertiary]
        }
    ];
    let sentVectors = [];
    for (let step = 0; step <= steps; step++) {
        const lastLength = sentVectors.length;
        if (step === 0) {
            const location = VectorMath.copy(coord);
            for (let index = 0; index < vectorDefinitions.primary.length; index++) {
                sentVectors.push({
                    location: VectorMath.copy(location),
                    definition: vectorDefinitions.primary[index]
                });
            }
            for (let index = 0; index < vectorDefinitions.tertiary.length; index++) {
                sentVectors.push({
                    location: VectorMath.copy(location),
                    definition: vectorDefinitions.tertiary[index]
                });
            }
            callback(location);
        }
        for (let index = 0; index < lastLength; index++) {
            const vector = sentVectors[index];
            const location = VectorMath.sum(vector.location, vector.definition.vector);
            vector.location = VectorMath.copy(location);
            callback(location);
            if (vector.definition.sends) {
                for (let sendIndex = 0; sendIndex < vector.definition.sends.length; sendIndex++) {
                    sentVectors.push({
                        location: VectorMath.copy(location),
                        definition: vector.definition.sends[sendIndex]
                    });
                }
            }
        }
    }
    return coords;
}

//# sourceMappingURL=blocks.js.map
