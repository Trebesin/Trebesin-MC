//APIs:
import * as Mc from '@minecraft/server';
import * as serverAdmin from '@minecraft/server-admin';
//Plugins:
import * as Debug from '../debug/debug';
//Modules:
import { DatabaseConnection } from '../../mc_modules/network/database-api';
import { Server as ServerModule, ServerEventCallback } from '../../mc_modules/server';
import * as Items from '../../mc_modules/items';
import { CommandParser } from '../../mc_modules/commandParser';
import { sendMessage } from '../../mc_modules/players';

export const Commands = new CommandParser({
    prefix: "!", caseSensitive: false
});
export const Server = new ServerModule(0);
Server.cancelTerminations = true;

export const DB = new DatabaseConnection({
    connection: {
        host: serverAdmin.variables.get('db-connection-host'),
        user: serverAdmin.variables.get('db-connection-username'),
        password: serverAdmin.variables.get('db-connection-password'),
        multipleStatements: true,
        database: serverAdmin.variables.get('db-connection-name')
    },
    server: {
        url: serverAdmin.variables.get('db-server-url'),
        username: serverAdmin.variables.get('db-server-username'),
        password: serverAdmin.variables.get('db-server-password')
    }
});

const messages = {}

function more(sender, parameters) {
    if (!messages[sender.id]){
        sendMessage(`There is nothing to be shown.`, "CMD", sender);
        return;
    }
    messages.viewedFirst = true
    if (!parameters.page || parameters.page < 1 || parameters.page > Math.ceil(messages[sender.id].content.length/7)){
        sendMessage(`Invalid page number '${parameters.page}'.`, "CMD - error", sender);
        return;
    }
    let message = `§2Showing page ${parameters.page} of ${Math.ceil(messages[sender.id].content.length/7)} for ${messages[sender.id].title}:§r \n`
    for (let i = (parameters.page-1)*7;i<messages[sender.id].content.length && i<parameters.page*7;i++) {
        message += `${messages[sender.id].content[i]}\n`;
    }
    message += `§2Use !more [pageNumber] for other pages.`;
    sender.sendMessage(message);
}

export function sendLongMessage(title, content, sender, rewriteOld = true){
    if (rewriteOld && messages[sender.id]) {
        delete messages[sender.id]
    }
    if (!messages[sender.id]) {
        messages[sender.id] = {title: title, content: content.split(`\n`), viewedFirst: false}
    } else {
        let newContent = content.split('\n')
        for (let i = 0;i<newContent.length;i++) {
            if (newContent[i] != '') messages[sender.id].content.push(newContent[i])
        }
    }
    if (!messages[sender.id].viewedFirst) {
        more(sender, {page: 1});
    }
}

export const name = 'Backend';
export async function main() {
    Commands.registerCommand('more',{
        aliases: [],
        description: ['Manages sent messages to player so that chat doesn\'t become a mess.'],
        parameters: [{id:'page', type:'int', optional: false}],
        run: more
    });
    //# Database
    try {
        const response = await DB.connect();
        if (response.status === 200) Debug.logMessage('Successfully connected to the database!');
        else Debug.logMessage(`Couldn't connect to database! [${response.status}]\n${response.body}`);
    } catch (error) {
        Debug.logMessage(error);
    }
    //# Custom Events
    Server.registerEvent('player',{
        callbacks: {
            playerEquip: new ServerEventCallback(),
            playerSneak: new ServerEventCallback()
        },
        initialize() {},
        execute() {
            const {data,callbacks} = this;
            const players = Mc.world.getAllPlayers();
            for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
                const player = players[playerIndex];
                //## playerEquip event:
                const playerEquipCallbacks = callbacks.playerEquip;
                if (playerEquipCallbacks.saved.length) {
                    data.playerEquip[player.id] ??= {};
                    const itemBefore = data.playerEquip[player.id].item;
                    const slotBefore = data.playerEquip[player.id].slot;
                    const itemAfter = player.getComponent('inventory').container?.getSlot(player.selectedSlot).clone();
                    const slotAfter = player.selectedSlot;
                    if (!Items.compare(itemAfter,itemBefore) || slotBefore != slotAfter) {
                        data.playerEquip[player.id].item = itemAfter;
                        data.playerEquip[player.id].slot = slotAfter;
                        playerEquipCallbacks.runCallbacks({
                            itemBefore,
                            itemAfter,
                            slotBefore,
                            slotAfter,
                            player
                        });
                    }
                }
                //## playerSneak event:
                const playerSneakCallbacks = callbacks.playerSneak;
                if (playerSneakCallbacks.saved.length) {
                    data.playerSneak[player.id] ??= player.isSneaking;
                    const sneakingBefore = data.playerSneak[player.id];
                    const sneakingAfter = player.isSneaking;
                    if (sneakingBefore !== sneakingAfter) {
                        data.playerSneak[player.id] = player.isSneaking;
                        playerSneakCallbacks.runCallbacks({
                            player,
                            sneaking: player.isSneaking
                        });
                    }
                }
            }
        },
        data: {
            playerEquip: {},
            playerSneak: {}
        }
    });
    Server.registerEvent('itemStartUseOn',{
        callbacks: {
            itemStartUseOn: new ServerEventCallback()
        },
        initialize() {
            const {data,callbacks} = this;
            Mc.world.afterEvents.itemUseOn.subscribe(eventData => {
                const callbackData = callbacks.itemStartUseOn;
                if (((data[eventData.source.id] ?? 0) + 1) < Mc.system.currentTick) {
                    callbackData.runCallbacks(eventData);
                }
                data[eventData.source.id] = Mc.system.currentTick;
            });
        },
        execute() {},
        data: {}
    });
    Server.registerEvent('beforeItemStartUseOn',{
        callbacks: {
            beforeItemStartUseOn: new ServerEventCallback()
        },
        initialize() {
            const {data,callbacks} = this;
            Mc.world.beforeEvents.itemUseOn.subscribe(eventData => {
                const callbackData = callbacks.beforeItemStartUseOn;
                if (((data[eventData.source.id] ?? 0) + 1) < Mc.system.currentTick) {
                    callbackData.runCallbacks(eventData);
                }
                data[eventData.source.id] = Mc.system.currentTick;
            });
        },
        execute() {},
        data: {}
    });

    
}