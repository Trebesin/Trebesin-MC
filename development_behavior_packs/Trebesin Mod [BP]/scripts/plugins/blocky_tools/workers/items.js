//APIs:
import { BoolBlockProperty, MolangVariableMap, Color, DirectionBlockProperty, IntBlockProperty, StringBlockProperty, world, system, Block} from '@minecraft/server';
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
            const block = eventData.source.dimension.getBlock(eventData.blockLocation);
            const player = eventData.source;
            const menuData = {
                title: `${block.typeId}`,
                withIds: true,
                structure: []
                
            }
            for (const permutation of block.permutation.getAllProperties()) {
                const option = {
                    id: permutation.name
                };

                if (permutation instanceof StringBlockProperty) {
                    option.label = `§2${permutation.name} [String]`;
                    option.type = 'dropdown';
                    option.options = mapArray(permutation.validValues,value => value);
                    option.defaultValueIndex = permutation.validValues.indexOf(permutation.value);
                };
                if (permutation instanceof IntBlockProperty) {
                    option.label = `§4${permutation.name} [Integer]`;
                    option.options = mapArray(permutation.validValues, value => value.toString());
                    option.defaultValueIndex = permutation.validValues.indexOf(permutation.value);
                    option.type = 'dropdown';
                };
                if (permutation instanceof BoolBlockProperty) {
                    option.label = `§3${permutation.name} [Boolean]`;
                    option.type = 'toggle';
                    option.defaultValue = permutation.value;
                };
                if (permutation instanceof DirectionBlockProperty) {
                    option.label = `§6${permutation.name} [Direction]`;
                    option.type = 'dropdown';
                    option.options = mapArray(permutation.validValues,value => value);
                    option.defaultValueIndex = permutation.validValues.indexOf(permutation.value);
                };
                menuData.structure.push(option);
            }
            if (menuData.structure.length === 0) return
            const response = await FormUi.modalMenu(menuData,player);

            if (block?.typeId == null) return;
            const permutation = block.permutation;
            for (const property of permutation.getAllProperties()) {
                if (property instanceof BoolBlockProperty) {
                        const value = response.formValues[property.name];
                        property.value = value;
                } else {
                        const index = response.formValues[property.name];
                        const value = property.validValues[index];
                        property.value = value;
                }
            }
            setBlockPermutation(block,permutation,player.id);
        }
    });

    system.runSchedule(() => {
        const players = world.getAllPlayers();
        for (let playerIndex = 0;playerIndex < players.length;playerIndex++) {
            const player = players[playerIndex];
            if (showChunkBorder[player.id] === 0 || showChunkBorder[player.id] == null) continue; 
            const chunk = getOriginChunkCoord(player.location);
            const molang = new MolangVariableMap()
            .setColorRGBA('variable.colour',new Color(Math.random(),Math.random(),Math.random(),1));
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