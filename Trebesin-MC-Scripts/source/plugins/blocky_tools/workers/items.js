//APIs:
import { MolangVariableMap, BlockPermutation, BlockStates, world, system, Block } from '@minecraft/server';
//Plugins:
import * as Debug from './../../debug/debug';
import { Server } from '../../backend/backend';
//Modules:
import { mapArray, insertToArray } from '../../../js_modules/array';
import * as FormUi from '../../../mc_modules/ui';
import { setBlockPermutation } from '../../block_history/block_history';
import { spawnBlockSelection, spawnLine } from '../../../mc_modules/particles';
import { getAbsoluteChunkCoord, getOriginChunkCoord } from '../../../mc_modules/chunk';
export function main() {
    //## Debug Stick:
    const showChunkBorder = {};
    Server.events.playerEquip.subscribe((eventData) => {
        if (eventData.itemAfter.typeId === 'trebesin:bt_debug_stick')
            showChunkBorder[eventData.player.id] = 1;
        else
            showChunkBorder[eventData.player.id] = 0;
    });
    Server.events.itemStartUseOn.subscribe(async (eventData) => {
        if (eventData.item.typeId === 'trebesin:bt_debug_stick') {
            /** @type {Block} */
            const block = eventData.source.dimension.getBlock(eventData.block.location);
            const propertyList = block.permutation.getAllProperties();
            const player = eventData.source;
            //let blockTagText = '';
            //const blockTags = block.getTags();
            //for (let tagIndex = 0;tagIndex < blockTags.length;tagIndex++) {
            //    blockTagText += `${blockTags[tagIndex]}`;
            //    if (tagIndex != blockTags.length - 1) blockTagText += ',';
            //}
            const menuData = {
                title: `${block.typeId}`,
                withIds: true,
                structure: []
            };
            for (const propertyName in propertyList) {
                const option = {
                    id: propertyName
                };
                const propertyDefinition = BlockStates.get(propertyName);
                const propertyType = typeof propertyDefinition.validValues[0];
                option.label = `§2${propertyName} [${propertyType}]`;
                if (propertyType === 'boolean') {
                    option.type = 'toggle';
                    option.defaultValue = propertyList[propertyName];
                }
                else {
                    option.type = 'dropdown';
                    option.options = propertyDefinition.validValues.map((value) => `${value}`);
                    option.defaultValueIndex = propertyDefinition.validValues.indexOf(propertyList[propertyName]);
                }
                menuData.structure.push(option);
            }
            if (menuData.structure.length === 0)
                return;
            const response = await FormUi.modalMenu(menuData, player);
            if (block?.typeId == null)
                return;
            const propertyRecord = {};
            for (const propertyName in propertyList) {
                const propertyDefinition = BlockStates.get(propertyName);
                const propertyType = typeof propertyDefinition.validValues[0];
                if (propertyType === 'boolean') {
                    propertyRecord[propertyName] = response.formValues[propertyName];
                }
                else {
                    const index = response.formValues[propertyName];
                    propertyRecord[propertyName] = propertyDefinition.validValues[index];
                }
            }
            const updatedPermutations = BlockPermutation.resolve(block.typeId, propertyRecord);
            setBlockPermutation(block, updatedPermutations, { actorId: player.id, updateType: 'blockyTools: player' });
        }
    });
    system.runInterval(() => {
        const players = world.getAllPlayers();
        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
            const player = players[playerIndex];
            if (showChunkBorder[player.id] === 0 || showChunkBorder[player.id] == null)
                continue;
            const chunk = getOriginChunkCoord(player.location);
            const verticalMolang = new MolangVariableMap();
            verticalMolang.setColorRGBA('variable.color', { red: 1, green: 0, blue: 0, alpha: 1 });
            verticalMolang.setSpeedAndDirection('variable.size', 384, { x: 0, y: 1, z: 0 });
            verticalMolang.setSpeedAndDirection('variable.time', 1.01, { x: 0, y: 0, z: 0 });
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x, y: -64, z: chunk.z }, verticalMolang);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x + 16, y: -64, z: chunk.z }, verticalMolang);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x, y: -64, z: chunk.z + 16 }, verticalMolang);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x + 16, y: -64, z: chunk.z + 16 }, verticalMolang);
            const randomColor = { red: 1, green: 1, blue: 1, alpha: 1 };
            const diagonalMolangPositiveZ = new MolangVariableMap();
            diagonalMolangPositiveZ.setSpeedAndDirection('variable.size', 384.3331887829, { x: 0, y: 384, z: 16 });
            diagonalMolangPositiveZ.setSpeedAndDirection('variable.time', 1.01, { x: 0, y: 0, z: 0 });
            diagonalMolangPositiveZ.setColorRGBA('variable.color', randomColor);
            const diagonalMolangPositiveX = new MolangVariableMap();
            diagonalMolangPositiveX.setSpeedAndDirection('variable.size', 384.3331887829, { x: 16, y: 384, z: 0 });
            diagonalMolangPositiveX.setSpeedAndDirection('variable.time', 1.01, { x: 0, y: 0, z: 0 });
            diagonalMolangPositiveX.setColorRGBA('variable.color', randomColor);
            const diagonalMolangNegativeZ = new MolangVariableMap();
            diagonalMolangNegativeZ.setSpeedAndDirection('variable.size', 384.3331887829, { x: 0, y: 384, z: -16 });
            diagonalMolangNegativeZ.setSpeedAndDirection('variable.time', 1.01, { x: 0, y: 0, z: 0 });
            diagonalMolangNegativeZ.setColorRGBA('variable.color', randomColor);
            const diagonalMolangNegativeX = new MolangVariableMap();
            diagonalMolangNegativeX.setSpeedAndDirection('variable.size', 384.3331887829, { x: -16, y: 384, z: 0 });
            diagonalMolangNegativeX.setSpeedAndDirection('variable.time', 1.01, { x: 0, y: 0, z: 0 });
            diagonalMolangNegativeX.setColorRGBA('variable.color', randomColor);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x, y: -64, z: chunk.z }, diagonalMolangPositiveX);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x, y: -64, z: chunk.z + 16 }, diagonalMolangPositiveX);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x, y: -64, z: chunk.z }, diagonalMolangPositiveZ);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x + 16, y: -64, z: chunk.z }, diagonalMolangPositiveZ);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x + 16, y: -64, z: chunk.z }, diagonalMolangNegativeX);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x + 16, y: -64, z: chunk.z + 16 }, diagonalMolangNegativeX);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x, y: -64, z: chunk.z + 16 }, diagonalMolangNegativeZ);
            player.dimension.spawnParticle('trebesin:line_flex2', { x: chunk.x + 16, y: -64, z: chunk.z + 16 }, diagonalMolangNegativeZ);
        }
    }, 20);
    //## -- --
}
