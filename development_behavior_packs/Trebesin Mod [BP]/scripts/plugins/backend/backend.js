import { world, system } from '@minecraft/server';
import * as serverAdmin from '@minecraft/server-admin';
import { DatabaseConnection } from '../../mc_modules/network/database-api';
import { Server, ServerEventCallback } from '../../mc_modules/server';
import { compareItems } from '../../mc_modules/items';
import * as Debug from '../debug/debug';
import { CommandParser } from '../../mc_modules/commandParser';
import { sendMessage } from '../../mc_modules/players';

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

    let messages = {}

    function more(sender, parameters){
        if(!messages[sender.id]){
            sendMessage(`there is nothing to be shown`, "CMD", sender)
            return
        }
        messages.viewedFirst = true
        if(!parameters.page || parameters.page < 1 || parameters.page > Math.ceil(messages[sender.id].content.length/7)){
            sendMessage(`invalid page number '${parameters.page}'`, "CMD - error", sender)
            return;
        }
        let message = `§2showing page ${parameters.page} of ${Math.ceil(messages[sender.id].content.length/7)} for ${messages[sender.id].title}:§r \n`
        for(let i = (parameters.page-1)*7;i<messages[sender.id].content.length && i<parameters.page*7;i++){
            message += `${messages[sender.id].content[i]}\n`
        }
        message += `§2use !more [pageNumber] for other pages`
        sender.tell(message)
    }

    commandParser.registerCommand('more',{
        aliases: [],
        description: ["manages sent messages to player so that chat doesn't become a mess"],
        parameters: [{id:'page', type:'int', optional: false}],
        run: more})

    function sendLongMessage(title, content, sender, rewriteOld = true){
        if(rewriteOld && messages[sender.id]){
            delete messages[sender.id]
        }
        if(!messages[sender.id]){
            messages[sender.id] = {title: title, content: content.split(`\n`), viewedFirst: false}
        }
        else{
            let newContent = content.split('\n')
            for(let i = 0;i<newContent.length;i++){
                if(newContent[i] != "")messages[sender.id].content.push(newContent[i])
            }
        }
        if(!messages[sender.id].viewedFirst){
        more(sender, {page: 1});
        }
    }

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
                const callbackData = callbacks.itemStartUseOn;
                if (((data[eventData.source.id] ?? 0) + 1) < system.currentTick) {
                    callbackData.runCallbacks(eventData);
                }
                data[eventData.source.id] = system.currentTick;
            });
        },
        execute() {},
        data: {}
    });

    server.registerEvent('beforeItemStartUseOn',{
        callbacks: {
            beforeItemStartUseOn: new ServerEventCallback()
        },
        initialize() {
            const {data,callbacks} = this;
            world.events.beforeItemUseOn.subscribe(eventData => {
                const callbackData = callbacks.beforeItemStartUseOn;
                if (((data[eventData.source.id] ?? 0) + 1) < system.currentTick) {
                    callbackData.runCallbacks(eventData);
                }
                data[eventData.source.id] = system.currentTick;
            });
        },
        execute() {},
        data: {}
    });
}

export { server as Server, commandParser as Commands, dbConnection as DB , PluginMain as main, PluginName as name, sendLongMessage }