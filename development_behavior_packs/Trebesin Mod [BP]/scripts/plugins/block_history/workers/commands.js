import {CommandResult, MinecraftEffectTypes , world, BlockLocation,Location, TicksPerDay, TicksPerSecond, Vector, MolangVariableMap, Color, system, MinecraftBlockTypes, BlockPermutation} from "@minecraft/server";
import { copyBlock, getPermutations, setPermutationFromObject } from "../../../mc_modules/blocks";
import { sendMessage} from "../../../mc_modules/players";
import { getEdgeLocations, createLocationSet2, locationToString, stringToLocation } from "../../../mc_modules/particles";
import { Commands, sendLongMessage } from '../../backend/backend';
import { isAdmin, isMod } from "../../commands/workers/admin";
import { logMessage, sendLogMessage } from "../../debug/debug";
import { playerData } from "../../server/server";
import * as BlockHistoryPlugin from "../block_history";
import { CommandError } from "../../../mc_modules/commandParser";
let particlesPerPlayers = {}
let confirmationPerPlayer = {}
let lastParticleCall = {}
const PARTICLE_LIMIT = 1000//particle limit per player

function main(){
    system.runSchedule(() => {
        for (const player in particlesPerPlayers) {
            //particles
            let limitIndex = 0;
            for(const locationString of particlesPerPlayers[player].particleLocations){
                if(limitIndex > PARTICLE_LIMIT){
                    sendMessage("§c§lTOO MANY PARTICLES §r- removing all your particles", "§cBH - CHAOS MANAGER",particlesPerPlayers[player].player)
                    delete particlesPerPlayers[player]
                    break
                }
                limitIndex++
                const particleLocation = stringToLocation(locationString);
                spawnParticles(particleLocation[0], particleLocation[1], particlesPerPlayers[player].player)
            }
        }
        for(const player in confirmationPerPlayer) {
            if(!confirmationPerPlayer[player].confirmed && confirmationPerPlayer[player].countdown > 0) {
                confirmationPerPlayer[player].countdown - 4;
            }
            else if(confirmationPerPlayer[player].confirmed) {
                try {
                    confirmationPerPlayer[player].callback()
                }
                catch(error){
                    logMessage(error)
                }
                delete confirmationPerPlayer[player];
            }
            else {
                sendMessage('The confirmation has expired!', 'blockHistory manager', confirmationPerPlayer[player].player)
                delete confirmationPerPlayer[player];
            }
        }
    },4);

    async function blockHistoryHandler(sender, parameter){
        if (isMod(sender) && (parameter.command === "rb" || parameter.command === "reverseblock")) {
            let pos = parameter.coords ?? sender.location
            pos.x = Math.floor(pos.x)
            pos.y = Math.floor(pos.y)
            pos.z = Math.floor(pos.z)
            let request = {}

            try{
                request = sqlRequestHandler(parameter, {type: "block", pos: pos})
            }
            catch(error){
                sendMessage(`invalid until/startingFrom parameter: ${error}`, "blockHistory - error", sender)
                return;
            }
            try {
                const response = await BlockHistoryPlugin.database.query(request);
                sendLogMessage(JSON.stringify(response.result))

                if(!printBlockHistory(response, {type: "block", pos: pos}, sender))return;

                if(parameter.particles ?? false){
                    getEdgeLocations([pos], (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                }
                else{
                    if(lastParticleCall[sender.id])delete lastParticleCall[sender.id]
                    lastParticleCall[sender.id] = {
                        callback: () => {
                            getEdgeLocations([pos], (loc,axis) => {
                                addActiveParticles(loc,axis,sender);
                            })
                        }
                    }
                }

                sendMessage(`are you sure you want to reverse these changes?\n - !bh confirm to confirm or !bh cancel to cancel`,'CMD - BlockHistory',sender);

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
            catch (error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }

        else if(isMod(sender) && (parameter.command === "show")){
            if(lastParticleCall[sender.id])lastParticleCall[sender.id].callback()
            else sendMessage("there is nothing to show", "cmd - BlockHistory", sender)
        }

        else if (isMod(sender) && (parameter.command === "b" || parameter.command === "block")) {
            let pos = parameter.coords ?? sender.location
            pos.x = Math.floor(pos.x)
            pos.y = Math.floor(pos.y)
            pos.z = Math.floor(pos.z)
            let request = {}
            try{
                request = sqlRequestHandler(parameter, {type: "block", pos: pos})
            }
            catch(error){
                sendMessage(`invalid until/startingFrom parameter: ${error}`, "blockHistory - error", sender)
                return;
            }
            sendLogMessage(request.sql)
            sendLogMessage(request.values)
            try {
                const response = await BlockHistoryPlugin.database.query(request);
                sendLogMessage(JSON.stringify(response.result))

                if(!printBlockHistory(response, {type: "block", pos: pos}, sender))return;

                else if(parameter.particles ?? false){
                        getEdgeLocations([pos], (loc,axis) => {
                            addActiveParticles(loc,axis,sender);
                        })
                }
            }
            catch (error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }

        else if (isMod(sender) && (parameter.command === "p" || parameter.command === "player")) {
            const playerName = parameter.player ?? sender.name
            let request = {}
            try{
                request = sqlRequestHandler(parameter, {type: "player", playerName: playerName})
            }
            catch(error){
                sendMessage(`invalid until/startingFrom parameter: ${error}`, "blockHistory - error", sender)
                return;
            }
            sendLogMessage(request.sql)
            sendLogMessage(request.values)
            try {
                const response = await BlockHistoryPlugin.database.query(request);

                if(!printBlockHistory(response, {type: "player"}, sender))return;

                else if(parameter.particles ?? false){
                    getEdgeLocations(response.result, (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                }

            }
            catch (error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }

        else if(isMod(sender) && (parameter.command === "redo")) {
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
                    WHERE PlayerName = ? AND blockPlaceType = 'blockHistory: reverse' AND blockPlaceTypeID = ?
                    ORDER BY \`block_history\`.\`tick\` DESC
                `,
                values : [playerName, parameter.id]
            }
            try {
                const response = await BlockHistoryPlugin.database.query(request);
                if(!printBlockHistory(response, {type: "reverse"}, sender))return;

                if(parameter.particles ?? false){
                    getEdgeLocations(response.result, (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                }

                sendMessage(`are you sure you want to revert these changes?\n - !bh confirm to confirm or !bh cancel to cancel`,'CMD - BlockHistory',sender);

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
            catch(error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }

        else if(isMod(sender) && (parameter.command === "r" || parameter.command === "reverse")) {
            const playerName = parameter.player ?? sender.name
            let request = {}
            try{
                request = sqlRequestHandler(parameter, {type: "player", playerName: playerName})
            }
            catch(error){
                sendMessage(`invalid until/startingFrom parameter: ${error}`, "blockHistory - error", sender)
                return;
            }
            try {
                const response = await BlockHistoryPlugin.database.query(request);
                if(!printBlockHistory(response, {type: "player"}, sender))return;

                if(parameter.particles ?? false){
                    getEdgeLocations(response.result, (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                }

                sendMessage(`are you sure you want to reverse these changes?\n - !bh confirm to confirm or !bh cancel to cancel`,'CMD - BlockHistory',sender);

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
            catch(error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }

        else if(isMod(sender) && parameter.command === "confirm") {
            try {
                confirmationPerPlayer[sender.id].confirmed = true
            }
            catch {
                sendMessage('the confirmation has expired!', 'cmd - BlockHistory', sender)
            }
        }

        else if(isAdmin(sender) && (parameter.command === "i" || parameter.command === "inspector")){
            if(!sender.hasTag("inspector")) {
                sender.addTag("inspector");
                sendMessage("inspector is now turned on, right click a block with your hand or place any block to see its history\n", "CMD - BlockHistory", sender);
            }
            else {
                sender.removeTag("inspector");
                sendMessage("inspector is now turned off", "CMD - BlockHistory", sender);
            };
        }

        else if(parameter.command === "cancel"){
            delete confirmationPerPlayer[sender.id]
            sendMessage("The call is now aborted", "CMD - BlockHistory", sender)
        }

        else if(isMod(sender) &&(parameter.command === "c" || parameter.command === "clear")) {
            if(parameter.players){
                for(let i = 0;i<parameter.players.length; i++){
                    const player = parameter.players[i]
                    removeActiveParticles(player)
                }
            } else {
                removeActiveParticles(sender);
            }
        }

        else if(isMod(sender) && (parameter.command === "ca" || parameter.command === "clearall")) {
            removeAllActiveParticles();
        }

        else if(isAdmin(sender)){
            sendMessage(
                `help:
                b/block - shows the changes made to block on [x], [y], [z] - parameters: until, startingFrom, location: x, location: y, location: z
                p/player - shows the changes made by a player - parameters: until, startingFrom, player
                i/inspect - gets you into inspector mode - when you place blocks it doesn't place them and instead shows you the changes made to that block
                r/reverse - reverses actions of a player in specific time frame - parameters: until, startingFrom, player
                rb/reverseblock - reverses a block to it's older state - parameters: until, startingFrom, location: x, location: y, location: z
                bt/blockytools - show history of blockytools edits - parameters: until, startingFrom, player -- not ready yet
                rbt/reversebt/reverseblockytools - reverses a blockytools edit using its id - parameters: until, startingFrom, player -- not ready yet
                redo - reverses an action made by this plugin - parameters: ID, player, particles
                c/clear - clears all the particles generated by this plugin by a player
                ca/clearall - clears all the particles generated by this plugin by everyone
                `, "", sender);
        }

        else if(isMod(sender)){
            sendMessage(
                `help:
                b/block - shows the changes made to block on [x], [y], [z] - parameters: until, startingFrom, location: x, location: y, location: z
                p/player - shows the changes made by a player - parameters: until, startingFrom, player
                r/reverse - reverses actions of a player in specific time frame - parameters: until, startingFrom, player
                rb/reverseblock - reverses a block to it's older state - parameters: until, startingFrom, location: x, location: y, location: z
                bt/blockytools - show history of blockytools edits - parameters: until, startingFrom, player -- not ready yet
                rbt/reversebt/reverseblockytools - reverses a blockytools edit using its id - parameters: until, startingFrom, player -- not ready yet
                redo - reverses an action made by this plugin - parameters: ID
                c/clear - clears all the particles generated by this plugin by a player
                ca/clearall - clears all the particles generated by this plugin by everyone
                `, "", sender);
        }

        else {
            sendMessage(
                `
                sorry but you shouldn't have access to this command. If you believe this is a mistake please contact us.
                `, "", sender
            )
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
    ], aliases: ["blockhistory", "co", "coreprotect"], run: blockHistoryHandler, senderCheck: isMod
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
                values : [options.pos.x, options.pos.y, options.pos.z,system.currentTick - parseToTicks(parameters.until), parseInt(parameters.startingFrom ?? 0)]
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
            values : [options.pos.x, options.pos.y, options.pos.z,system.currentTick - parseToTicks(parameters.until), system.currentTick - parseToTicks(parameters.startingFrom)]
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
            values : [options.pos.x, options.pos.y, options.pos.z,system.currentTick - parseToTicks(parameters.startingFrom), parseInt(parameters.until ?? 7)]
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
                values : [options.playerName,system.currentTick - parseToTicks(parameters.until), parseInt(parameters.startingFrom ?? 0)]
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
            values : [options.playerName,system.currentTick - parseToTicks(parameters.until), system.currentTick - parseToTicks(parameters.startingFrom)]
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
            values : [options.playerName,system.currentTick - parseToTicks(parameters.startingFrom), parseInt(parameters.until ?? 7)]
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
    const tickInASec = TicksPerSecond
    const tickInAMin = tickInASec*60
    const tickInAnHour = tickInAMin*60
    const tickInADay = tickInAnHour*24
    let message = ''
    for(let i = 0; i < request.result.length; i++){
        const blockAlteration = request.result[i]
        const timeOfBlockAlteration = system.currentTick - parseInt(blockAlteration.tick)
        if(options.type === "player" || options.type === "reverse"){
            message += `${blockAlteration.blockPlaceType === "playerPlace"? "" : `(${blockAlteration.blockPlaceType}) - `}[${blockAlteration.x}, ${blockAlteration.y}, ${blockAlteration.z}]: ${blockAlteration.before_id} -> ${blockAlteration.after_id} - before: ${parseToRealTime(timeOfBlockAlteration)}\n`;
        }
        if(options.type === "block"){
            message += `${blockAlteration.PlayerName}${blockAlteration.blockPlaceType === "playerPlace"? "" : ` (${blockAlteration.blockPlaceType})`}: ${blockAlteration.before_id} -> ${blockAlteration.after_id} - before: ${parseToRealTime(timeOfBlockAlteration)}\n`;
        }
    }
    if(options.type === "reverse")sendLongMessage(`Block History reverses of ${playerName}`, message.trim(), sender)
    if(options.type === "player")sendLongMessage(`Block History of ${playerName}`, message.trim(), sender);
    if(options.type === "block")sendLongMessage(`Block History of block ${Math.floor(options.pos.x)}, ${Math.floor(options.pos.y)}, ${Math.floor(options.pos.z)}`, message.trim(), sender);
    return true
}

function spawnParticles(location, particleAxis, sender) {
    const molang = new MolangVariableMap()
    .setColorRGB('variable.colour',new Color(1,0,0,1));
    const dimension = world.getDimension('overworld');
    dimension.spawnParticle(`trebesin:edge_highlight_${particleAxis}`, location, molang);
}

async function getMaxIDPerPlayer(blockPlaceType, player){
    try{
        const request = await BlockHistoryPlugin.database.query({
            sql: `SELECT actor_id, MAX(blockPlaceTypeID) AS id
                    FROM block_history
                    WHERE actor_id = ? AND blockPlaceType = ? AND blockPlaceTypeID IS NOT NULL
                    GROUP BY actor_id;
                    `,
            values: [player.id, blockPlaceType]
        })
        return request.result[0].id
    }
    catch(error){
        logMessage(error)
    }
}

function revertBlockChange(blockOld, blockNew, sender){
    const block = sender.dimension.getBlock(new BlockLocation(blockNew.location.x, blockNew.location.y, blockNew.location.z))
    block.setType(MinecraftBlockTypes.get(blockOld.typeId))
    block.setPermutation(setPermutationFromObject(block.permutation, getPermutations(blockOld.permutation)))
}

function parseToRealTime(input){
    let result = ""
    const tickInASec = TicksPerSecond
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
    const tickInASec = TicksPerSecond
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

async function inspector(location, sender){
    const pos = location 
    const request = {
        sql : `SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                FROM \`block_history\` 
                JOIN PlayerConnections 
                ON block_history.actor_id = PlayerConnections.PlayerID 
                WHERE x = ? AND y = ? AND z = ?
                ORDER BY \`block_history\`.\`tick\` DESC`,
        values: [Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)]
    }
    try {
        const response = await BlockHistoryPlugin.database.query(request);
        printBlockHistory(response, {type: "block", pos: pos}, sender)
    }
    catch (error) {
        sendMessage(`${error}`,'CMD - BlockHistory',sender);
    }
}

async function reverseBlocks(blocks, sender) {
    const callID = (await getMaxIDPerPlayer("blockHistory: reverse", sender) ?? -1)+1
    for(let i = 0;i<blocks.length;i++){
        const playerId = sender.id;
        const block = world.getDimension(blocks[i].dimension_id).getBlock(new BlockLocation(blocks[i].x, blocks[i].y, blocks[i].z))
        const blockOld = copyBlock(block)
        block.setType(MinecraftBlockTypes.get(blocks[i].before_id))
        block.setPermutation(setPermutationFromObject(block.permutation, JSON.parse(blocks[i].before_permutations)))
        BlockHistoryPlugin.saveBlockUpdate(blockOld,copyBlock(block),playerId, "blockHistory: reverse", callID);
    }
    sendMessage(`succesfully reversed blocks - callID: ${callID}`, "BlockHistory: reverse",sender)
}

export {main, inspector, revertBlockChange}
