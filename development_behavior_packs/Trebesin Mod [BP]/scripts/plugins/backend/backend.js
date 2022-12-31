import { world, system } from '@minecraft/server';
import { Server, ServerEventCallback } from '../../mc_modules/server';
import { compareItems } from '../../mc_modules/items';
import * as Debug from '../debug/debug';

const server = new Server(0);

const PluginName = 'Backend';
function PluginMain() {
    server.registerEvent('player',{
        callbacks: {
            playerEquip: new ServerEventCallback()
        },
        initialize() {},
        execute() {
            const {data,callbacks} = this;
            const players = world.getAllPlayers();
            for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
                const player = players[playerIndex];
                //## playerEquip event:
                const playerEquipCallbacks = callbacks.playerEquip.saved;
                if (playerEquipCallbacks.length) {
                    if (data.playerEquip[player.id] == null) data.playerEquip[player.id] = {};
                    const itemBefore = data.playerEquip[player.id].item;
                    const slotBefore = data.playerEquip[player.id].slot;
                    const itemAfter = player.getComponent('inventory').container.getSlot(player.selectedSlot).getItem();
                    const slotAfter = player.selectedSlot;
                    if (!compareItems(itemAfter,itemBefore) || slotBefore != slotAfter) {
                        for (let callbackIndex = 0;callbackIndex < playerEquipCallbacks.length;callbackIndex++) {
                            try {
                                playerEquipCallbacks[callbackIndex]({
                                    itemBefore,
                                    itemAfter,
                                    slotBefore,
                                    slotAfter,
                                    player
                                });
                            } catch {}
                        }
                    }
                    data.playerEquip[player.id].item = itemAfter;
                    data.playerEquip[player.id].slot = slotAfter;
                }
            }
        },
        data: {
            playerEquip: {}
        }
    });

    server.registerEvent('itemStartUseOn',{
        callbacks: {
            itemStartUseOn: new ServerEventCallback()
        },
        initialize() {
            const {data,callbacks} = this;
            world.events.itemUseOn.subscribe(eventData => {
                const itemStartUseOnCallbacks = callbacks.itemStartUseOn.saved;
                if (((data[eventData.source.id] ?? 0) + 1) < system.currentTick) {
                    for (let callbackIndex = 0;callbackIndex < itemStartUseOnCallbacks.length;callbackIndex++) {
                        try {
                            itemStartUseOnCallbacks[callbackIndex](eventData);
                        } catch {}
                    }
                }
                data[eventData.source.id] = system.currentTick;
            });
        },
        execute() {},
        data: {}
    })
}

export { server as Server , PluginMain as main, PluginName as name }