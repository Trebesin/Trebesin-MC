import { world, system } from '@minecraft/server';
import * as serverAdmin from '@minecraft/server-admin';
import { DatabaseConnection } from '../../mc_modules/network/database-api';
import { Server, ServerEventCallback } from '../../mc_modules/server';
import { compareItems } from '../../mc_modules/items';
import * as Debug from '../debug/debug';
import { CommandParser } from '../../mc_modules/commandParser';

//Initial Variables:
const commandParser = new CommandParser({
    prefix: "!", caseSensitive: false
  })
const server = new Server(0);
server.cancelTerminations = true;
const dbConnection = new DatabaseConnection({
    connection: {
        host: 'db1.falix.cc',
        user: serverAdmin.variables.get('db-connection-username'),
        password: serverAdmin.variables.get('db-connection-password'),
        multipleStatements: true,
        database: 's835835_Trebesin-DB-Beta'
    },
    server: {
        url: serverAdmin.variables.get('db-server-url'),
        username: serverAdmin.variables.get('db-server-username'),
        password: serverAdmin.variables.get('db-server-password')
    }
});



/*


        this.registerCommand('more',{
            aliases: [],
            description: ["manages sent messages to player so that chat doesn't become a mess"],
            parameters: [{id:'page', type:'int', optional: false}],
            arguments: [this.#messages],
            run: this.#more
        })

    #more(sender, parameters, messages){
        if(!parameters.page || parameters.page < 1 || parameters.page > messages.pages){
            sendMessage(`invalid page number '${parameters.page}'`, "CMD - error", sender)
            return;
        }
        let message = `showing page ${parameters.page} of ${messages.pages} for ${messages.title}: \n`
        for(let i = (parameters.page-1)*5;i<messages.content.length && i<parameters.page*5;i++){
            message += `${messages.content[i]}\n`
        }
        sender.tell(message)
    }


    #messages = {}





*/

const PluginName = 'Backend';
async function PluginMain() {
    //# Database
    try {
        const response = await dbConnection.connect();
        if (response.status === 200) Debug.logMessage('Successfully connected to the database!');
        else Debug.logMessage(`Couldn't connect to database! [${response.status}]\n${response.body}`);
    } catch (error) {
        Debug.logMessage(error);
    }
    //# Custom Events
    server.registerEvent('player',{
        callbacks: {
            playerEquip: new ServerEventCallback(),
            playerSneak: new ServerEventCallback()
        },
        initialize() {},
        execute() {
            const {data,callbacks} = this;
            const players = world.getAllPlayers();
            for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
                const player = players[playerIndex];
                //## playerEquip event:
                const playerEquipCallbacks = callbacks.playerEquip;
                if (playerEquipCallbacks.saved.length) {
                    data.playerEquip[player.id] ??= {};
                    const itemBefore = data.playerEquip[player.id].item;
                    const slotBefore = data.playerEquip[player.id].slot;
                    const itemAfter = player.getComponent('inventory').container.getSlot(player.selectedSlot).getItem();
                    const slotAfter = player.selectedSlot;
                    if (!compareItems(itemAfter,itemBefore) || slotBefore != slotAfter) {
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
                //!needs testing
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
    });
}

export { server as Server, commandParser as Commands, dbConnection as DB , PluginMain as main, PluginName as name }