//! Rename ItemState to ItemData or RawItemData or RawItem and so on... (to avoid confusion with API terminology)
import * as Mc from '@minecraft/server';
import { ITEM_STATE_COMPONENTS } from './constants';
export function compare(itemA, itemB) {
    if (itemA?.typeId !== itemB?.typeId ||
        itemA?.data !== itemB?.data ||
        itemA?.nameTag !== itemB?.nameTag)
        return false;
    return true;
}
//## Comparing state data:
/**
 * Function to compare if 2 item states are matching.
 * @param {ItemState} itemStateA First item state data to compare.
 * @param {ItemState} itemStateB Second item state data to compare.
 * @returns {boolean} Result of the comparison.
 */
export function compareStates(itemStateA, itemStateB) {
    //### Checking lore
    const maxLoreLength = Math.max(itemStateA?.lore?.length, itemStateB?.lore?.length);
    for (let loreIndex = 0; loreIndex < maxLoreLength; ++loreIndex) {
        if (itemStateA.lore[loreIndex] !== itemStateB.lore[loreIndex])
            return false;
    }
    //### Rest of the item
    return (itemStateA.typeId === itemStateB.typeId &&
        itemStateA.nameTag === itemStateB.nameTag &&
        itemStateA.amount === itemStateB.amount &&
        itemStateA.keepOnDeath === itemStateB.keepOnDeath &&
        itemStateA.lockMode === itemStateB.lockMode &&
        compareComponents(itemStateA.components, itemStateB.components));
}
/**
 * Function to compare if 2 item component states are matching.
 * @param {ItemComponentState} componentsA First item component data to compare.
 * @param {ItemComponentState} componentsB Second item component data to compare.
 * @returns {boolean | undefined} Returns the result of the comparison or `undefined` if any of the components are invalid.
 */
export function compareComponents(componentsA, componentsB) {
    if (componentsA == null || componentsB == null)
        return undefined;
    for (const componentId in ITEM_STATE_COMPONENTS) {
        const componentDataA = componentsA[componentId];
        const componentDataB = componentsB[componentId];
        if (componentDataA != null && componentDataB != null) {
            switch (componentId) {
                case 'durability':
                    {
                        if (componentDataA.damage !== componentDataB.damage)
                            return false;
                    }
                    break;
                case 'enchantments':
                    {
                        for (const enchantId in componentDataA) {
                            if (componentDataA[enchantId] != componentDataB[enchantId])
                                return false;
                        }
                        for (const enchantId in componentDataB) {
                            if (componentDataB[enchantId] != componentDataA[enchantId])
                                return false;
                        }
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
//## Getting state data:
/**
 * Function to create `ItemStack` class from an `ItemState` that defines it.
 * @param {ItemState} itemState Item state defining what item to create.
 * @returns {Mc.ItemStack} Item stack created from the item state.
 */
export function createStack(itemState) {
    if (itemState?.typeId == null)
        return null;
    const itemStack = new Mc.ItemStack(itemState.typeId, itemState.amount);
    itemStack.nameTag = itemState.nameTag;
    itemStack.setLore(itemState.lore);
    itemStack.keepOnDeath = itemState.keepOnDeath;
    itemStack.lockMode = itemState.lockMode;
    applyComponents(itemStack, itemState.components);
    return itemStack;
}
/**
 *
 * @param {Mc.ItemStack} itemStack
 * @param {ItemComponentState} itemComponents
 */
export function applyComponents(itemStack, itemComponents) {
    for (let componentId in itemComponents) {
        const componentData = itemComponents[componentId];
        const component = itemStack.getComponent(componentId);
        if (component == null)
            continue;
        switch (componentId) {
            case 'durability':
                {
                    component.damage = componentData.damage;
                }
                break;
            case 'enchantments':
                {
                    const enchantList = component.enchantments;
                    for (const enchantId in componentData) {
                        enchantList.addEnchantment(new Mc.Enchantment(Mc.MinecraftEnchantmentTypes[enchantId], componentData[enchantId]));
                    }
                }
                break;
        }
    }
}
//## Getting state data:
/**
 * Function to copy `ItemStack` class objects with data that define its state.
 * @param {Mc.ItemStack} item Item to copy.
 * @returns {ItemState} Object containing copies of selected properties of the item.
 */
export function copyState(item) {
    if (item?.typeId == null)
        return null;
    return {
        typeId: item.typeId,
        nameTag: item.nameTag,
        amount: item.amount,
        lore: item?.getLore(),
        keepOnDeath: item.keepOnDeath,
        lockMode: item.lockMode,
        components: copyComponents(item)
    };
}
/**
 * Function to copy all components of an item.
 * @param {Mc.ItemStack} item Item to copy.
 * @returns {ItemComponentState} Object containing copies of components of the item. `undefined` if the item is invalid.
 */
export function copyComponents(item) {
    if (item == null)
        return undefined;
    const itemComponents = {};
    /** @type {Mc.ItemDurabilityComponent} */
    const durability = item.getComponent('durability');
    if (durability != null) {
        itemComponents.durability = {};
        itemComponents.durability.damage = durability.damage;
    }
    /** @type {Mc.ItemEnchantsComponent} */
    const enchants = item.getComponent('enchantments');
    if (enchants != null) {
        itemComponents.enchantments = {};
        for (const enchant of enchants.enchantments)
            itemComponents.enchantments[enchant.type.id] = enchant.level;
    }
    return itemComponents;
}
//# Types / Constants:
/**
 * @typedef ItemState
 * @prop {string} typeId ID of the type of the item.
 * @prop {state} nameTag The name of the item.
 * @prop {number} amount Number of items in the stack.
 * @prop {string[]} lore Lore strings of the item.
 * @prop {boolean} keepOnDeath Defines if the item is kept in player's inventory after death.
 * @prop {Mc.ItemLockMode} lockMode Defines if and how the item is locked in player's inventory.
 * @prop {ItemComponentState} components State of the item components.
 */
/**
 * @typedef ItemComponentState Contains data of item components saved in a simple object.
 * @prop {object} durability Defines durability of the item.
 * @prop {number} durability.damage Defines how damaged the item is.
 * @prop {Object.<string,number>} enchantments Object of numerical value with keys defining the specific enchanment type and the number its level.
 */ 

//# sourceMappingURL=items.js.map
