import { BoolBlockProperty, DirectionBlockProperty, IntBlockProperty, StringBlockProperty, world, system, Block} from '@minecraft/server';
import * as FormUi from '../../../mc_modules/ui';
import {mapArray,insertToArray} from '../../../js_modules/array';
import {setBlockPermutation,setBlockType} from '../../block_history/block_history'

function main() {
    addItemStartUseOnListener(async (eventData) => {
        if (eventData.item.typeId === 'trebesin:bh_debug_stick') {
            const block = eventData.source.dimension.getBlock(eventData.blockLocation);
            const player =eventData.source;
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
}

//!Will be its own thing, this is temporary!
const listeners = [];
const dataMap = {};
world.events.itemUseOn.subscribe(eventData => {
    if (((dataMap[eventData.source.id] ?? 0) + 1) < system.currentTick) {
        for (let index = 0; index < listeners.length; index++) {
            listeners[index](eventData);
        }
    }
    dataMap[eventData.source.id] = system.currentTick;
});

function addItemStartUseOnListener(callback) {
    return insertToArray(listeners, callback)
}

function removeItemStartUseOnListener(index) {
    delete listeners[index];
}
//! -- !

export {main}