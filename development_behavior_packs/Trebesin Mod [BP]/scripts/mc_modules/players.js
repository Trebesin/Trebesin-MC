import { world, Player } from "@minecraft/server";
function hasItem(entity, typeId, data, amount = { min: 1, max: 64 }) {
    let hasItem = false;
    const inventory = entity.getComponent('inventory');
    const container = inventory.container;
    const inventorySize = inventory.inventorySize;
    for (let slot = 0; slot < inventorySize; slot++) {
        const item = container.getItem(slot);
        if (item && item.typeId === typeId) {
            if (item.data === data || data < 0) {
                if (item.amount >= amount.min && item.amount <= amount.max) {
                    hasItem = true;
                }
            }
        }
    }
    return hasItem
}

function hasItemInv(entity, typeId, data, amount = { min: 1, max: 64 }) {
    let hasItem = false;
    let totalAmount = 0;
    const inventory = entity.getComponent('inventory');
    const container = inventory.container;
    const inventorySize = inventory.inventorySize;
    for (let slot = 0; slot < inventorySize; slot++) {
        const item = container.getItem(slot);
        if (item && item.typeId === typeId) {
            if (item.data === data || data < 0) {
                totalAmount += item.amount;
                if (item.amount > amount.max) {
                    hasItem = false;
                    break;
                }
            }
        }
    }
    if (totalAmount >= amount.min && totalAmount <= amount.max) {
        hasItem = true;
    }
    return hasItem
}

function clearItemInv(entity, typeId, type, data, amount = { min: 4, max: 64 }) {
    const inventory = entity.getComponent('inventory');
    const container = inventory.container;
    const inventorySize = inventory.inventorySize;
    let totalAmount = 0;
    let clearSlots = []; //[slottypeId, clearAmount]
    for (let slot = 0; slot < inventorySize; slot++) {
        const item = container.getItem(slot);
        if (item && item.typeId === typeId) {
            if (item.data === data || data < 0) {
                const left2Clear = amount.max - totalAmount;
                if (item.amount >= left2Clear) {
                    clearSlots.push([slot, item.amount - left2Clear]);
                    totalAmount += left2Clear;
                    break;
                } else {
                    clearSlots.push([slot, 0]);
                    totalAmount += item.amount;
                }
            }
        }
    }
    if (totalAmount < amount.min) {
        totalAmount = 0;
        return totalAmount
    }
    for (const clearSlot of clearSlots) {
        container.setItem(clearSlot[0], new ItemStack(type, clearSlot[1], data));
    }
    return totalAmount
}

function clearItem(entity, typeId, type, data, amount = { min: 1, max: 64 }) {
    const inventory = entity.getComponent('inventory');
    const container = inventory.container;
    const inventorySize = inventory.inventorySize;
    let clearAmount = null;
    for (let slot = 0; slot < inventorySize; slot++) {
        const item = container.getItem(slot);
        if (item && item.typeId === typeId) {
            if (item.data === data || data < 0) {
                clearAmount = item.amount;
                if (item.amount < amount.min) {
                    clearAmount = 0;
                }
                if (item.amount > amount.max) {
                    clearAmount = amount.max
                }
                container.setItem(slot, new ItemStack(type, item.amount - clearAmount, item.data));
            }
        }
    }
    return clearAmount
}

export function getEquipedItem(entity) {
    const container = entity.getComponent('inventory').container;
    return container.getItem(entity.selectedSlot);
}

/**
 * 
 * @param {string} message 
 * @param {Player | Player[]} [player]
 * @param {string} [sender]
 */
export function sendMessage(message,senderName,player = null) {
    const messageText = senderName == null ? message : `[${senderName}§r] ${message}`;
    if (!player) {
        world.sendMessage(messageText);
    } else {
        if (!Array.isArray(player)) {
            player.sendMessage(messageText);
        } else {
            for (let playerIndex = 0;playerIndex < player.length;playerIndex++) {
                player[playerIndex].sendMessage(messageText);
            }
        }
    }
}