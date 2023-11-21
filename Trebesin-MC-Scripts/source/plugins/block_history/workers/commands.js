//APIs:
import * as Mc from '@minecraft/server';
//Plugins:
import * as BlockHistoryPlugin from "../block_history";
import { Commands, sendLongMessage, DB } from '../../backend/backend';
import { isAdmin, isMod } from "../../commands/workers/admin";
import { logMessage, sendLogMessage } from "../../debug/debug";
//sdf
//Modules:
import * as VectorMath from '../../../js_modules/vectorMath'
import * as Blocks from "../../../mc_modules/blocks";
import { sendMessage} from "../../../mc_modules/players";
import { getEdgeLocations, locationToString, stringToLocation } from "../../../mc_modules/particles";
import { CommandError } from "../../../mc_modules/commandParser";

//const {BlockHistoryUpdateTypes,BlockHistoryUpdateTypeNames} = BlockHistoryPlugin;

/**
 * Object with defining IDs for `BlockHistoryOptions` `updateType` entries.
 */
const BlockHistoryUpdateTypes = {
    /** Block updated by a player in a usual vanilla MC interaction. */
    playerUpdate: 0,
    /** Block updated by a player using block history plugin reverse feature. */
    blockHistoryReverse: 1,
    /** Block updated by a player using blocky tools plugin. */
    blockyTools: 2,
    /** Block updated by the system for a technical reason in an automated fashion. */
    system: 3

};

const BlockHistoryUpdateTypeNames = [
    'Player Update',
    'Block History: Reverse',
    'Blocky Tools: Player',
    'System'
];


let particlesPerPlayers = {}
let confirmationPerPlayer = {}
let lastParticleCall = {}
let lastCall = {}
const PARTICLE_LIMIT = 1000//particle limit per player

export function main(){
    Mc.system.runInterval(() => {
        for (const player in particlesPerPlayers) {
            //## Particles:
            let limitIndex = 0;
            for(const locationString of particlesPerPlayers[player].particleLocations){
                if(limitIndex > PARTICLE_LIMIT){
                    sendMessage("§c§lTOO MANY PARTICLES §r- removing all your particles", "§cBH - CHAOS MANAGER",particlesPerPlayers[player].player)
                    delete particlesPerPlayers[player];
                    break;
                }
                limitIndex++
                const particleLocation = stringToLocation(locationString);
                spawnParticles(particleLocation[0], particleLocation[1], particlesPerPlayers[player].player);
            }
        }
        for(const player in confirmationPerPlayer) {
            if (!confirmationPerPlayer[player].confirmed && confirmationPerPlayer[player].countdown > 0) {
                confirmationPerPlayer[player].countdown - 4;
            }
            else if(confirmationPerPlayer[player].confirmed) {
                try {
                    confirmationPerPlayer[player].callback();
                } catch(error) {
                    logMessage(error);
                }
                delete confirmationPerPlayer[player];
            }
            else {
                sendMessage('The confirmation has expired!', 'blockHistory', confirmationPerPlayer[player].player)
                delete confirmationPerPlayer[player];
            }
        }
    },4);



    /**
     * 
     * @param {Mc.Player} sender 
     * @param {*} parameter 
     */
    async function blockHistoryHandler(sender, parameter){
        switch(parameter.command){
            case 'warp':
                if(!lastCall[sender.id]){
                    sendMessage("there is nothing to warp to", "blockHistory", sender)
                }
                {
                    const index = parameter.index ?? 1
                    if(index < 0 || index >= lastCall[sender.id].length){
                        sendMessage('invalid index', 'blockHistory', sender)
                    }
                    sender.teleport(lastCall[sender.id][index-1]);
                }
                break;
            case 'rb':
            case 'reverseblock':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    const pos = VectorMath.floor(parameter.coords ?? sender.location);
                    let request = {};
                    try{
                        request = sqlRequestHandler(parameter, {type: "block", pos: pos})
                    }
                    catch(error){
                        sendMessage(`invalid until/startingFrom parameter: ${error}`, "blockHistory", sender)
                        break;
                    }
                    const response = await DB.query(request);

                    if(!response.result[0]?.x && response.result != ""){
                        sendMessage('§c critical Mysql error. Contact admins for fix', 'BlockHistory', sender)
                        sendLogMessage(JSON.stringify(response.result))
                        break;
                    }

                    if(!printBlockHistory(response, {type: "block", pos: pos}, sender))break;

                    lastCall[sender.id] = response.result
                    sendMessage('You can use !bh warp [index] to warp to a block', "blockHistory", sender)

                    if(parameter.particles ?? false){
                        getEdgeLocations([pos], (loc,axis) => {
                            addActiveParticles(loc,axis,sender);
                        })
                    }
                    else{
                        if(lastParticleCall[sender.id])delete lastParticleCall[sender.id]
                        sendMessage(`you can use !bh show to see these changes using particles`, "blockHistory", sender)
                        lastParticleCall[sender.id] = {
                            callback: () => {
                                getEdgeLocations([pos], (loc,axis) => {
                                    addActiveParticles(loc,axis,sender);
                                })
                            }
                        }
                    }
                    sendMessage(`are you sure you want to reverse these changes?\n - !bh confirm to confirm or !bh cancel to cancel`,'blockHistory',sender);

                    if(confirmationPerPlayer[sender.id]) delete confirmationPerPlayer[sender.id];
                    confirmationPerPlayer[sender.id] = {
                        player: sender,
                        confirmed: false,
                        callback: () => {
                            reverseBlocks(response.result, sender)
                        },
                        countdown: 1200
                    };
                }
                break;
            case "show":
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    if(lastParticleCall[sender.id]){
                        lastParticleCall[sender.id].callback()
                        delete lastParticleCall[sender.id]
                        sendMessage("showing particles..", "blockHistory", sender)
                    }
                    else sendMessage("there is nothing to show", "blockHistory", sender)
                }
                break;
            case 'b':
            case 'block':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    const pos = VectorMath.floor(parameter.coords ?? sender.location);
                    let request = {}
                    try{
                        request = sqlRequestHandler(parameter, {type: "block", pos: pos})
                    }
                    catch(error){
                        sendMessage(`invalid until/startingFrom parameter: ${error}`, "blockHistory", sender)
                        break;
                    }
                    const response = await DB.query(request);

                    if(!response.result[0]?.x && response.result != ""){
                        sendMessage('§c critical Mysql error. Contact admins for fix', 'BlockHistory', sender)
                        sendLogMessage(JSON.stringify(response.result))
                        break;
                    }

                    if(!printBlockHistory(response, {type: "block", pos: pos}, sender))break;

                    lastCall[sender.id] = response.result
                    sendMessage('You can use !bh warp [index] to warp to a block', "blockHistory", sender)

                    if(parameter.particles ?? false){
                            getEdgeLocations([pos], (loc,axis) => {
                                addActiveParticles(loc,axis,sender);
                            })
                    }
                    else{
                        if(lastParticleCall[sender.id])delete lastParticleCall[sender.id]
                        sendMessage(`you can use !bh show to see these changes using particles`, "blockHistory", sender)
                        lastParticleCall[sender.id] = {
                            callback: () => {
                                getEdgeLocations([pos], (loc,axis) => {
                                    addActiveParticles(loc,axis,sender);
                                })
                            }
                        }
                    }
                }
                break;
            case 'p':
            case 'player':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    const playerName = parameter.player ?? sender.name
                    let request = {}
                    try{
                        request = sqlRequestHandler(parameter, {type: "player", playerName: playerName})
                    }
                    catch(error){
                        sendMessage(`invalid until/startingFrom parameter: ${error}`, "", sender)
                        break;
                    }
                    const response = await DB.query(request);
                    
                    if(!response.result[0]?.x && response.result != ""){
                        sendMessage('§c critical Mysql error. Contact admins for fix', 'BlockHistory', sender)
                        sendLogMessage(JSON.stringify(response.result))
                        break;
                    }


                    if(!printBlockHistory(response, {type: "player"}, sender))break;

                    lastCall[sender.id] = response.result
                    sendMessage('You can use !bh warp [index] to warp to a block', "blockHistory", sender)

                    if(parameter.particles ?? false){
                        getEdgeLocations(response.result, (loc,axis) => {
                            addActiveParticles(loc,axis,sender);
                        })
                    }
                    else{
                        if(lastParticleCall[sender.id])delete lastParticleCall[sender.id]
                        sendMessage(`you can use !bh show to see these changes using particles`, "blockHistory", sender)
                        lastParticleCall[sender.id] = {
                            callback: () => {
                                getEdgeLocations(response.result, (loc,axis) => {
                                    addActiveParticles(loc,axis,sender);
                                })
                            }
                        }
                    }
                }
                break;
            case 'redo':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    const playerName = parameter.player ?? sender.name
                    const request = {
                        sql : `
                            SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                            FROM \`block_history\` 
                            JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                                FROM PlayerConnections 
                                GROUP BY PlayerID) AS latest_connections 
                            ON block_history.actor_id = latest_connections.PlayerID 
                            JOIN PlayerConnections 
                            ON latest_connections.latest_id = PlayerConnections.ID
                            WHERE PlayerName = ? AND update_type = ${BlockHistoryUpdateTypes.blockHistoryReverse} AND update_id = ?
                            ORDER BY \`block_history\`.\`tick\` DESC
                        `,
                        values : [playerName, parameter.id]
                    }
                    const response = await DB.query(request);

                    if(!response.result[0]?.x && response.result != ""){
                        sendMessage('§c critical Mysql error. Contact admins for fix', 'BlockHistory', sender)
                        sendLogMessage(JSON.stringify(response.result))
                        break;
                    }

                    if(!printBlockHistory(response, {type: "reverse"}, sender))break;

                    lastCall[sender.id] = response.result
                    sendMessage('You can use !bh warp [index] to warp to a block', "blockHistory", sender)

                    if(parameter.particles ?? false){
                        getEdgeLocations(response.result, (loc,axis) => {
                            addActiveParticles(loc,axis,sender);
                        })
                    }
                    else{
                        if(lastParticleCall[sender.id])delete lastParticleCall[sender.id]
                        sendMessage(`you can use !bh show to see these changes using particles`, "blockHistory", sender)
                        lastParticleCall[sender.id] = {
                            callback: () => {
                                getEdgeLocations(response.result, (loc,axis) => {
                                    addActiveParticles(loc,axis,sender);
                                })
                            }
                        }
                    }

                    sendMessage(`are you sure you want to revert these changes?\n - !bh confirm to confirm or !bh cancel to cancel`,'blockHistory',sender);

                    if(confirmationPerPlayer[sender.id]) delete confirmationPerPlayer[sender.id];
                    confirmationPerPlayer[sender.id] = {
                        player: sender,
                        confirmed: false,
                        callback: () => {
                            reverseBlocks(response.result, sender)
                        },
                        countdown: 1200
                    };
                }
                break;
            case 'r':
            case 'reverse':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    const playerName = parameter.player ?? sender.name
                    let request = {}
                    try{
                        request = sqlRequestHandler(parameter, {type: "player", playerName: playerName})
                    }
                    catch(error){
                        sendMessage(`invalid until/startingFrom parameter: ${error}`, "blockHistory", sender)
                        break;
                    }
                    const response = await DB.query(request);

                    if(!response.result[0]?.x && response.result != ""){
                        sendMessage('§c critical Mysql error. Contact admins for fix', 'BlockHistory', sender)
                        sendLogMessage(JSON.stringify(response.result))
                        break;
                    }

                    if(!printBlockHistory(response, {type: "player"}, sender))break;

                    lastCall[sender.id] = response.result
                    sendMessage('You can use !bh warp [index] to warp to a block', "blockHistory", sender)

                    if(parameter.particles ?? false){
                        getEdgeLocations(response.result, (loc,axis) => {
                            addActiveParticles(loc,axis,sender);
                        })
                    }
                    else{
                        if(lastParticleCall[sender.id])delete lastParticleCall[sender.id]
                        sendMessage(`you can use !bh show to see these changes using particles`, "blockHistory", sender)
                        lastParticleCall[sender.id] = {
                            callback: () => {
                                getEdgeLocations(response.result, (loc,axis) => {
                                    addActiveParticles(loc,axis,sender);
                                })
                            }
                        }
                    }

                    sendMessage(`are you sure you want to reverse these changes?\n - !bh confirm to confirm or !bh cancel to cancel`,'blockHistory',sender);

                    if(confirmationPerPlayer[sender.id]) delete confirmationPerPlayer[sender.id];
                    confirmationPerPlayer[sender.id] = {
                        player: sender,
                        confirmed: false,
                        callback: () => {
                            reverseBlocks(response.result, sender)
                        },
                        countdown: 1200
                    };
                }
                break;
            case 'confirm':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    try {
                        confirmationPerPlayer[sender.id].confirmed = true
                    }
                    catch {
                        sendMessage('the confirmation has expired!', 'blockHistory', sender)
                    }
                }
                break;
            case 'i':
            case 'inspector':
                {
                    if(!sender.hasTag("inspector")) {
                        sender.addTag("inspector");
                        sendMessage("inspector is now turned on, right click a block with your hand or place any block to see its history\n", "blockHistory", sender);
                    }
                    else {
                        sender.removeTag("inspector");
                        sendMessage("inspector is now turned off", "blockHistory", sender);
                    };
                }
                break;
            case 'cancel':
                if(!confirmationPerPlayer[sender.id]){
                    sendMessage("there is nothing to be canceled", "blockHistory", sender)
                    break;
                }
                delete confirmationPerPlayer[sender.id]
                sendMessage("The call is now aborted", "blockHistory", sender)
                break;
            case 'c':
            case 'clear':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                {
                    if(parameter.players){
                        for(let i = 0;i<parameter.players.length; i++){
                            const player = parameter.players[i]
                            removeActiveParticles(player)
                        }
                    } else {
                        removeActiveParticles(sender);
                    }
                }
                break;
            case 'ca':
            case 'clearall':
                if(!isMod(sender)){
                    sendMessage('sorry you don\'t have permision to use this command. use !bh help for available commands')
                    break;
                }
                removeAllActiveParticles();
                break;
            default:
                if(isAdmin(sender)){
                    sendLongMessage(`blockHistory: help`,
                        `
    b/block - shows the changes made to block on [x], [y], [z] - parameters: until, startingFrom, location: x, location: y, location: z, allowParticles
    p/player - shows the changes made by a player - parameters: until, startingFrom, player, allowParticles
    i/inspect - gets you into inspector mode - when you place blocks it doesn't place them and instead shows you the changes made to that block
    r/reverse - reverses actions of a player in specific time frame - parameters: until, startingFrom, player, allowParticles
    rb/reverseblock - reverses a block to it's older state - parameters: until, startingFrom, location: x, location: y, location: z, allowParticles
    bt/blockytools - show history of blockytools edits - parameters: until, startingFrom, player -- not ready yet
    rbt/reversebt/reverseblockytools - reverses a blockytools edit using its id - parameters: until, startingFrom, player -- not ready yet
    redo - reverses an action made by this plugin - parameters: ID, player, allowParticles
    c/clear - clears all the particles generated by this plugin by a player
    ca/clearall - clears all the particles generated by this plugin by everyone
                        `,sender);
                }

                else if(isMod(sender)){
                    sendMessage(`blockHistory: help`
                        `
    b/block - shows the changes made to block on [x], [y], [z] - parameters: until, startingFrom, location: x, location: y, location: z, allowParticles
    p/player - shows the changes made by a player - parameters: until, startingFrom, player, allowParticles
    r/reverse - reverses actions of a player in specific time frame - parameters: until, startingFrom, player, allowParticles
    rb/reverseblock - reverses a block to it's older state - parameters: until, startingFrom, location: x, location: y, location: z, allowParticles
    bt/blockytools - show history of blockytools edits - parameters: until, startingFrom, player -- not ready yet
    rbt/reversebt/reverseblockytools - reverses a blockytools edit using its id - parameters: until, startingFrom, player -- not ready yet
    redo - reverses an action made by this plugin - parameters: ID, player, allowParticles
    c/clear - clears all the particles generated by this plugin by a player
    ca/clearall - clears all the particles generated by this plugin by everyone
                        `, sender);
                }

                else {
                    sendLongMessage(`blockHistory: help`
                        `
    i/inspector - gets you into inspector mode: place blocks or right click with hand to see changes
                        `, sender
                    )
                }
                break;
        }
    }

  Commands.registerCommand("bh", {
    parameters: [
        {id: "command", type: "string", optional: true, choice: {
                b: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'pos',id:'coords',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                warp: [
                    {type: 'int', id: 'index', optional: true}
                ],
                block: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'pos',id:'coords',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                show: [

                ],
                p: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'string',id:'player',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                player: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'string',id:'player',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                c: [
                    {type: 'selector', id: 'players', optional:true, playerOnly:true}
                ],
                clear: [
                    {type: 'selector', id: 'players', optional:true, playerOnly:true}
                ],
                ca: [

                ],
                clearall: [

                ],
                i: [

                ],
                inspector: [

                ],
                r: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'string',id:'player',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                redo: [
                    {type:'int',id:'id'},
                    {type:'string',id:'player',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                reverse: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'string',id:'player',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                rb: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'pos',id:'coords',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                reverseblock: [
                    {type:'str',id:'until',optional:true},
                    {type:'str',id:'startingFrom',optional:true},
                    {type:'pos',id:'coords',optional:true},
                    {type:'bool',id:'particles', optional:true}
                ],
                confirm: [
                ],
                help: [
                ],
                h: [
                ],
                "?": [
                ],
                cancel: [
                ]
                
            }
        }
    ], aliases: ["blockhistory", "co", "coreprotect"], run: blockHistoryHandler, senderCheck: isMod, description: `manage/view player blockHistory. view !bh help for detailed help`
  })
}

function addActiveParticles(particleLocation, axis, sender) {
    particlesPerPlayers[sender.id] ??= {
        player: sender,
        particleLocations: new Set()
    };
    particlesPerPlayers[sender.id].particleLocations.add(locationToString(particleLocation,axis));
}

function removeActiveParticles(sender) {
    delete particlesPerPlayers[sender.id];
}

function removeAllActiveParticles() {
    for (const player in particlesPerPlayers) {
        delete particlesPerPlayers[player];
    }
}




function sqlRequestHandler(parameters, options){
    let request = {}
    if(options.type === "block"){
        if((!parameters.until || /^(\d+)$/.exec(parameters.until)) && (!parameters.startingFrom || /^(\d+)$/.exec(parameters.startingFrom))){
            request = {//request for block where we have number until and number startFrom
            sql: `
                SELECT DISTINCT block_history.*, PlayerConnections.PlayerName
                FROM block_history 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE x = ? AND y = ? AND z = ?
                ORDER BY \`block_history\`.\`tick\` DESC
                LIMIT ? OFFSET ?
            `,
            values : [options.pos.x, options.pos.y, options.pos.z,parseInt(parameters.until ?? 7), parseInt(parameters.startingFrom ?? 0)]
            }
        }
        else if(/^(\d+)(m|w|d|h|s)/.exec(parameters.until) && (!parameters.startingFrom || /^(\d+)$/.exec(parameters.startingFrom))){
            request = {//request for block where we have realtime until and startFrom number
                sql : `
                WITH cte AS (
                SELECT DISTINCT block_history.*, PlayerConnections.PlayerName, ROW_NUMBER() OVER (ORDER BY block_history.tick DESC) AS rn
                FROM block_history 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE x = ? AND y = ? AND z = ? AND block_history.tick >= ?
                ORDER BY \`block_history\`.\`tick\` DESC
                )
                SELECT *
                FROM cte
                WHERE rn > ?
                `,
                values : [options.pos.x, options.pos.y, options.pos.z,Mc.system.currentTick - parseToTicks(parameters.until), parseInt(parameters.startingFrom ?? 0)]
            }
        }
        else if(/^(\d+)(m|w|d|h|s)/.exec(parameters.until) && /^(\d+)(m|w|d|h|s)/.exec(parameters.startingFrom)){
            request = {//request for block where we have realtime until and realtime startFrom
            sql: `
                SELECT DISTINCT block_history.*, PlayerConnections.PlayerName
                FROM block_history 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE x = ? AND y = ? AND z = ? AND block_history.tick >= ? AND block_history.tick <= ?
                ORDER BY \`block_history\`.\`tick\` DESC
            `,
            values : [options.pos.x, options.pos.y, options.pos.z,Mc.system.currentTick - parseToTicks(parameters.until), Mc.system.currentTick - parseToTicks(parameters.startingFrom)]
            }
        }
        else if((!parameters.until || /^(\d+)$/.exec(parameters.until)) && /^(\d+)(m|w|d|h|s)/.exec(parameters.startingFrom)){
            request = {//request for block where we have number until and realtime startFrom
            sql: `
                SELECT DISTINCT block_history.*, PlayerConnections.PlayerName
                FROM block_history 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE x = ? AND y = ? AND z = ? AND block_history.tick <= ?
                ORDER BY \`block_history\`.\`tick\` DESC
                LIMIT ? OFFSET 0
            `,
            values : [options.pos.x, options.pos.y, options.pos.z,Mc.system.currentTick - parseToTicks(parameters.startingFrom), parseInt(parameters.until ?? 7)]
            }
        }
        else{
            throw new CommandError("invalid until/startingFrom parameter")
        }
    }




    


    else if(options.type === "player"){
        if((!parameters.until || /^(\d+)$/.exec(parameters.until)) && (!parameters.startingFrom || /^(\d+)$/.exec(parameters.startingFrom))){
            request = {//request for player where we have number until and number startFrom
                sql : `
                SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                FROM \`block_history\` 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE PlayerName = ?  
                ORDER BY \`block_history\`.\`tick\` DESC
                LIMIT ? OFFSET ?
                `,
                values : [options.playerName, parseInt(parameters.until ?? 7), parseInt(parameters.startingFrom ?? 0)]
            }
        }
        else if(/^(\d+)(m|w|d|h|s)/.exec(parameters.until) && (!parameters.startingFrom || /^(\d+)$/.exec(parameters.startingFrom))){
            request = {//request for player where we have realtime until and startFrom number
                sql : `
                    WITH cte AS (
                        SELECT block_history.*, PlayerConnections.PlayerName, ROW_NUMBER() OVER (ORDER BY block_history.tick DESC) AS rn
                        FROM block_history
                        JOIN (SELECT PlayerID, MAX(ID) AS latest_id
                            FROM PlayerConnections
                            GROUP BY PlayerID) AS latest_connections
                        ON block_history.actor_id = latest_connections.PlayerID
                        JOIN PlayerConnections
                        ON latest_connections.latest_id = PlayerConnections.ID
                        WHERE PlayerName = ? AND block_history.tick >= ?
                    )
                    SELECT *
                    FROM cte
                    WHERE rn > ?
                `,
                values : [options.playerName,Mc.system.currentTick - parseToTicks(parameters.until), parseInt(parameters.startingFrom ?? 0)]
            }
        }
        else if(/^(\d+)(m|w|d|h|s)/.exec(parameters.until) && /^(\d+)(m|w|d|h|s)/.exec(parameters.startingFrom)){
            request = {//request for player where we have realtime until and realtime startFrom
            sql: `
                SELECT DISTINCT block_history.*, PlayerConnections.PlayerName
                FROM block_history 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE playerName = ? AND block_history.tick >= ? AND block_history.tick <= ?
                ORDER BY \`block_history\`.\`tick\` DESC
            `,
            values : [options.playerName,Mc.system.currentTick - parseToTicks(parameters.until), Mc.system.currentTick - parseToTicks(parameters.startingFrom)]
            }
        }
        else if((!parameters.until || /^(\d+)$/.exec(parameters.until)) && /^(\d+)(m|w|d|h|s)/.exec(parameters.startingFrom)){
            request = {//request for player where we have number until and realtime startFrom
            sql: `
                SELECT DISTINCT block_history.*, PlayerConnections.PlayerName
                FROM block_history 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE playerName = ? AND block_history.tick <= ?
                ORDER BY \`block_history\`.\`tick\` DESC
                LIMIT ? OFFSET 0
            `,
            values : [options.playerName,Mc.system.currentTick - parseToTicks(parameters.startingFrom), parseInt(parameters.until ?? 7)]
            }
        }
        else{
            throw new CommandError("invalid until/startingFrom parameter")
        }
    }
    return request
}





/**
 * 
 * @param {Promise} request 
 * @param {options} options 
 * @returns 
 */

function printBlockHistory(request, options, sender){
    const playerName = sender.name
    if(request.result == "" && options.type === "player"){
        sendMessage(`No changes were made by the player ${playerName}`,'CMD - BlockHistory',sender);
        return false;
    }
    if(request.result == "" && options.type === "reverse"){
        sendMessage(`No changes were made by blockhistory from ${playerName}`,'CMD - BlockHistory',sender);
        return false;
    }
    if(request.result == "" && options.type === "block"){
        sendMessage(`No changes were made to block ${Math.floor(options.pos.x)}, ${Math.floor(options.pos.y)}, ${Math.floor(options.pos.z)}`,'CMD - BlockHistory',sender);
        return false;
    }
    const tickInASec = Mc.TicksPerSecond
    const tickInAMin = tickInASec*60
    const tickInAnHour = tickInAMin*60
    const tickInADay = tickInAnHour*24
    let message = ''
    for(let i = 0; i < request.result.length; i++){
        const blockAlteration = request.result[i]
        const timeOfBlockAlteration = Mc.system.currentTick - parseInt(blockAlteration.tick)
        if(options.type === "player" || options.type === "reverse"){
            message += `${blockAlteration.update_type === BlockHistoryUpdateTypes.playerUpdate ? "" : `(${BlockHistoryUpdateTypeNames[blockAlteration.update_type]}) - `}[${blockAlteration.x}, ${blockAlteration.y}, ${blockAlteration.z}]: ${blockAlteration.before_id} -> ${blockAlteration.after_id} - before: ${parseToRealTime(timeOfBlockAlteration)}\n`;
        }
        if(options.type === "block"){
            message += `${blockAlteration.PlayerName}${blockAlteration.update_type === BlockHistoryUpdateTypes.playerUpdate ? "" : ` (${BlockHistoryUpdateTypeNames[blockAlteration.update_type]})`}: ${blockAlteration.before_id} -> ${blockAlteration.after_id} - before: ${parseToRealTime(timeOfBlockAlteration)}\n`;
        }
    }
    if(options.type === "reverse")sendLongMessage(`Block History reverses of ${playerName}`, message.trim(), sender)
    if(options.type === "player")sendLongMessage(`Block History of ${playerName}`, message.trim(), sender);
    if(options.type === "block")sendLongMessage(`Block History of block ${Math.floor(options.pos.x)}, ${Math.floor(options.pos.y)}, ${Math.floor(options.pos.z)}`, message.trim(), sender);
    return true;
}

function spawnParticles(location, particleAxis, sender) {
    const molang = new Mc.MolangVariableMap()
    .setColorRGB('variable.color',{red:1,green:0,blue:0,alpha:1});
    const dimension = Mc.world.getDimension('overworld');
    dimension.spawnParticle(`trebesin:edge_highlight_${particleAxis}`, location, molang);
}

async function getMaxIDPerPlayer(updateType, player){
    try{
        const request = await DB.query({
            sql: `SELECT actor_id, MAX(update_id) AS id
                    FROM block_history
                    WHERE actor_id = ? AND update_type = ? AND update_id IS NOT NULL
                    GROUP BY actor_id;
                    `,
            values: [player.id, updateType]
        })
        return request.result[0].id
    }
    catch(error){
        logMessage(error)
    }
}

/**
 * 
 * @param {Blocks.BlockState} blockOld 
 * @param {import('../../../mc_modules/dimensions').Position} position 
 */
export function revertBlockChange(blockOld, position){
    const block = position.dimension.getBlock(position.location);
    Blocks.applyBlockState(block,blockOld);
}

function parseToRealTime(input){
    let result = ""
    const tickInASec = Mc.TicksPerSecond
    const tickInAMin = tickInASec*60
    const tickInAnHour = tickInAMin*60
    const tickInADay = tickInAnHour*24
    const tickInAWeek = tickInADay*7
    const timers = [tickInAWeek, tickInADay, tickInAnHour, tickInAMin, tickInASec]
    const timerletter = ['w', 'd', 'h', 'm', 's']
    for(let i = 0;i<timers.length;i++){
        if(!Math.floor(input/timers[i]))continue;
        result += `${Math.floor(input/timers[i])}` + timerletter[i]
        input = input%timers[i]
    }
    return result
}

function parseToTicks(input){
    const regex = /^(\d+)(m|w|d|h|s)/;
    let result = 0
    const tickInASec = Mc.TicksPerSecond
    const tickInAMin = tickInASec*60
    const tickInAnHour = tickInAMin*60
    const tickInADay = tickInAnHour*24
    const tickInAWeek = tickInADay*7
    let workingString = input
    while(workingString !== ""){
        const string = regex.exec(workingString)
        workingString = workingString.replace(regex, "")
        if(!string)throw new CommandError(`couldn't parse ${input} to ticks!`)
        switch (string[2]) {
            case "w":
                result += string[1]*tickInAWeek
                break;
            case "d":
                result += string[1]*tickInADay
                break;
            case "h":
                result += string[1]*tickInAnHour
                break;
            case "m":
                result += string[1]*tickInAMin
                break;
            case "s":
                result += string[1]*tickInASec
                break;
            default:
                throw new CommandError(`couldn't parse ${input} to ticks!`)
                break;
        }
    }
    return result;
}

export async function inspector(location, sender){
    const pos = location 
    const request = {
        sql : `SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                FROM \`block_history\` 
                JOIN (SELECT PlayerID, MAX(ID) AS latest_id 
                        FROM PlayerConnections 
                        GROUP BY PlayerID) AS latest_connections 
                    ON block_history.actor_id = latest_connections.PlayerID 
                    JOIN PlayerConnections 
                    ON latest_connections.latest_id = PlayerConnections.ID
                WHERE x = ? AND y = ? AND z = ?
                ORDER BY \`block_history\`.\`tick\` DESC`,
        values: [Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)]
    }
    try {
        const response = await DB.query(request);
        if(!response.result[0]?.x && response.result != ""){
            sendMessage('§c critical Mysql error. Contact admins for fix', 'BlockHistory', sender)
            sendLogMessage(JSON.stringify(response.result))
            return;
        }
        if(printBlockHistory(response, {type: "block", pos: pos}, sender)){
            if(lastParticleCall[sender.id])delete lastParticleCall[sender.id]
            sendMessage(`you can use !bh show to see these changes using particles`, "cmd - BlockHistory", sender)
            lastParticleCall[sender.id] = {
                callback: () => {
                    getEdgeLocations(response.result, (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                }
            }
        }
    }
    catch (error) {
        sendMessage(`${error}`,'CMD - BlockHistory',sender);
    }
}

async function reverseBlocks(blocks, sender) {
    const callID = (await getMaxIDPerPlayer(BlockHistoryUpdateTypes.blockHistoryReverse, sender) ?? -1)+1
    for(let i = 0;i<blocks.length;i++){
        const playerId = sender.id;
        const block = Mc.world.getDimension(blocks[i].dimension_id).getBlock(blocks[i]);
        const blockOld = Blocks.copyBlockState(block,true);
        const permutationsBefore = Mc.BlockPermutation.resolve(blocks[i].before_id, JSON.parse(blocks[i].before_permutations))
        block.setType(Mc.BlockTypes.get(blocks[i].before_id));
        block.setPermutation(permutationsBefore);
        BlockHistoryPlugin.saveBlockUpdate({
            before: blockOld,
            after: Blocks.copyBlockState(block,true)
        },{
            actorId: playerId,
            updateType: BlockHistoryUpdateTypes.blockHistoryReverse,
            updateId: callID
        });
    }
    sendMessage(`succesfully reversed blocks - callID: ${callID}`, "BlockHistory: reverse",sender)
}
