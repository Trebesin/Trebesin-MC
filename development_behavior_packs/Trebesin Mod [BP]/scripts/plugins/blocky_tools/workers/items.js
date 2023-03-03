//APIs:
import { MolangVariableMap, BlockPermutation,BlockProperties, world, system, Block} from '@minecraft/server';
//Plugins:
import * as Debug from './../../debug/debug';
import { Server } from '../../backend/backend';
//Modules:
import {mapArray,insertToArray} from '../../../js_modules/array';
import * as FormUi from '../../../mc_modules/ui';
import {setBlockPermutation,setBlockType} from '../../block_history/block_history';
import { spawnBlockSelection, spawnLine } from '../../../mc_modules/particles';
import { getAbsoluteChunkCoord, getOriginChunkCoord} from '../../../mc_modules/chunk';


export function main() {
    //## Debug Stick:
    const showChunkBorder = {};
    Server.events.playerEquip.subscribe((eventData) => {
        if (eventData.itemAfter.typeId === 'trebesin:bt_debug_stick') showChunkBorder[eventData.player.id] = 1;
        else showChunkBorder[eventData.player.id] = 0;
    });
    
    Server.events.itemStartUseOn.subscribe(async (eventData) => {
        if (eventData.item.typeId === 'trebesin:bt_debug_stick') {
            /**
             * @type {Block}
             */
            const block = eventData.source.dimension.getBlock(eventData.getBlockLocation());
            const propertyList = block.permutation.getAllProperties();
            const player = eventData.source;
            const menuData = {
                title: `${block.typeId}`,
                withIds: true,
                structure: []
                
            }

            //!some blocks dont show ui, i dont see why
            for (const propertyName in propertyList) {
                const option = {
                    id: propertyName
                };
                const propertyDefinition = BlockProperties.get(propertyName);
                const propertyType = typeof propertyDefinition.validValues[0];
                option.label = `§2${propertyName} [${propertyType}]`;
                if (propertyType === 'boolean') {
                    option.type = 'toggle';
                    option.defaultValue = propertyList[propertyName];
                } else {
                    option.type = 'dropdown';
                    option.options = propertyDefinition.validValues;
                    option.defaultValueIndex = propertyDefinition.validValues.indexOf(propertyList[propertyName]);
                }
                menuData.structure.push(option);
            }
            if (menuData.structure.length === 0) return
            const response = await FormUi.modalMenu(menuData,player);

            if (block?.typeId == null) return;
            const propertyRecord = {};
            for (const propertyName in propertyList) {
                const propertyDefinition = BlockProperties.get(propertyName);
                const propertyType = typeof propertyDefinition.validValues[0];
                if (propertyType === 'boolean') {
                    propertyRecord[propertyName] = response.formValues[propertyName];
                } else {
                    const index = response.formValues[propertyName];
                    propertyRecord[propertyName] = propertyDefinition.validValues[index];
                }
            }
            const updatedPermutations = BlockPermutation.resolve(block.typeId, propertyRecord);
            setBlockPermutation(block,updatedPermutations,player.id);
        }
    });

    system.runInterval(() => {
        const players = world.getAllPlayers();
        for (let playerIndex = 0;playerIndex < players.length;playerIndex++) {
            const player = players[playerIndex];
            if (showChunkBorder[player.id] === 0 || showChunkBorder[player.id] == null) continue; 
            const chunk = getOriginChunkCoord(player.location);
            const molang = new MolangVariableMap()
            .setColorRGBA('variable.color',{red:Math.random(),green:Math.random(),blue:Math.random(),alpha:1});
            spawnLine('trebesin:selection_dot',[{x:chunk.x,y:player.location.y-20,z:chunk.z},{x:chunk.x,y:player.location.y+20,z:chunk.z}],player.dimension,molang);
            spawnLine('trebesin:selection_dot',[{x:chunk.x+8,y:player.location.y-20,z:chunk.z},{x:chunk.x+8,y:player.location.y+20,z:chunk.z}],player.dimension,molang);
            spawnLine('trebesin:selection_dot',[{x:chunk.x+16,y:player.location.y-20,z:chunk.z+8},{x:chunk.x+16,y:player.location.y+20,z:chunk.z+8}],player.dimension,molang);
            spawnLine('trebesin:selection_dot',[{x:chunk.x+8,y:player.location.y-20,z:chunk.z+16},{x:chunk.x+8,y:player.location.y+20,z:chunk.z+16}],player.dimension,molang);
            spawnLine('trebesin:selection_dot',[{x:chunk.x,y:player.location.y-20,z:chunk.z+8},{x:chunk.x,y:player.location.y+20,z:chunk.z+8}],player.dimension,molang);

            spawnLine('trebesin:selection_dot',[{x:chunk.x,y:player.location.y-20,z:chunk.z},{x:chunk.x,y:player.location.y+20,z:chunk.z}],player.dimension,molang);
            spawnLine('trebesin:selection_dot',[{x:chunk.x+16,y:player.location.y-20,z:chunk.z},{x:chunk.x+16,y:player.location.y+20,z:chunk.z}],player.dimension,molang);
            spawnLine('trebesin:selection_dot',[{x:chunk.x+16,y:player.location.y-20,z:chunk.z+16},{x:chunk.x+16,y:player.location.y+20,z:chunk.z+16}],player.dimension,molang);
            spawnLine('trebesin:selection_dot',[{x:chunk.x,y:player.location.y-20,z:chunk.z+16},{x:chunk.x,y:player.location.y+20,z:chunk.z+16}],player.dimension,molang);
        }
    },20);
    //## -- --
}