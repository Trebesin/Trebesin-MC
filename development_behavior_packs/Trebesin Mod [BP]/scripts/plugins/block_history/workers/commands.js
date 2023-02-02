import {CommandResult, MinecraftEffectTypes , world, BlockLocation,Location, TicksPerDay, TicksPerSecond, Vector, MolangVariableMap, Color, system} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { getEdgeLocations, createLocationSet2, locationToString, stringToLocation } from "../../../mc_modules/particles";
import * as Backend from "../../../mc_modules/server" ;
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { logMessage } from "../../debug/debug";
import { playerData } from "../../server/server";
import * as BlockHistoryPlugin from "../block_history";
let particlesPerPlayers = {}
let confirmationPerPlayer = {}

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
function spawnParticles(location, particleAxis, sender) {
    const molang = new MolangVariableMap()
    .setColorRGB('variable.colour',new Color(1,0,0,1));
    const dimension = world.getDimension('overworld');
    dimension.spawnParticle(`trebesin:edge_highlight_${particleAxis}`, location, molang);
}
function reverseBlocks(blocks, sender) {
    logMessage("confirmed!")
//loops through all the blocks and replaces them with the old data
}
function main(){
    system.runSchedule(() => {
        for (const player in particlesPerPlayers) {
            //particles
            const set = particlesPerPlayers[player].particleLocations;
            for(const locationString of particlesPerPlayers[player].particleLocations){
                const particleLocation = stringToLocation(locationString);
                spawnParticles(particleLocation[0], particleLocation[1], particlesPerPlayers[player].player)
            }
        }
        for(const player in confirmationPerPlayer) {
            if(!confirmationPerPlayer[player].confirmed && confirmationPerPlayer[player].countdown > 0) {
                confirmationPerPlayer[player].countdown - 4;
            }
            else if(confirmationPerPlayer[player].confirmed) {
                confirmationPerPlayer[player].callback()
                delete confirmationPerPlayer[player];
            }
            else {
                sendMessage('The confirmation has expired!', 'blockHistory manager', confirmationPerPlayer[player].player)
                delete confirmationPerPlayer[player];
            }
        }
    },4);
    async function blockHistoryHandler(sender, parameter){
        if (/*isAdmin(sender) && */(parameter.command === "b" || parameter.command === "block")) {
            const pos = parameter.coords ?? sender.location
            const request = {
                sql : `SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                       FROM \`block_history\` 
                       JOIN PlayerConnections 
                       ON block_history.actor_id = PlayerConnections.PlayerID 
                       WHERE x = ${Math.floor(pos.x)} AND y = ${Math.floor(pos.y)} AND z = ${Math.floor(pos.z)}
                       ORDER BY \`block_history\`.\`tick\` DESC
                       LIMIT ? OFFSET ?`,
                values : [parameter.count ?? 5, parameter.startingFrom ?? 0]
            }
            try {
                const response = await BlockHistoryPlugin.database.query(request);
                const tickInASec = TicksPerSecond;
                const tickInAMin = tickInASec*60;
                const tickInAnHour = tickInAMin*60;
                const tickInADay = tickInAnHour*24;
                for (let responseIndex = response.result.length-1; responseIndex+1; responseIndex--) {
                    const blockAlteration = response.result[responseIndex];
                    const timeOfBlockAlteration = system.currentTick - parseInt(blockAlteration.tick);
                    sendMessage(`${blockAlteration.PlayerName}: ${blockAlteration.before_id} -> ${blockAlteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
                }
                if (response.result == '') {
                    sendMessage(`No changes were made to block  ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`,'CMD - BlockHistory',sender);
                }
                else {
                    getEdgeLocations([{
                        x: Math.floor(pos.x),
                        y: Math.floor(pos.y),
                        z: Math.floor(pos.z)
                    }], (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                }
            }
            catch (error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }
        else if (/*isAdmin(sender) && */(parameter.command === "p" || parameter.command === "player")) {
            const playerName = parameter.player ?? sender.name
            const request = {
                sql : `SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                       FROM \`block_history\` 
                       JOIN PlayerConnections 
                       ON block_history.actor_id = PlayerConnections.PlayerID 
                       WHERE PlayerName = ?  
                       ORDER BY \`block_history\`.\`tick\` DESC
                       LIMIT ? OFFSET ?`,
                values : [playerName, parameter.count ?? 5, parameter.startingFrom ?? 0]
            }
            try {
                const response = await BlockHistoryPlugin.database.query(request);
                const tickInASec = TicksPerSecond
                const tickInAMin = tickInASec*60
                const tickInAnHour = tickInAMin*60
                const tickInADay = tickInAnHour*24
                let locations = []
                for (let responseIndex = response.result.length-1; responseIndex+1; responseIndex--) {
                    const blockAlteration = response.result[responseIndex]
                    const timeOfBlockAlteration = system.currentTick - parseInt(blockAlteration.tick)
                    sendMessage(`${blockAlteration.PlayerName} - [${blockAlteration.x}, ${blockAlteration.y}, ${blockAlteration.z}]: ${blockAlteration.before_id} -> ${blockAlteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
                    locations.push({x: blockAlteration.x, y: blockAlteration.y, z: blockAlteration.z})
                }
                if (response.result == '') {
                    sendMessage(`No changes were made by the player ${playerName}`,'CMD - BlockHistory',sender);
                }
                else {
                    getEdgeLocations(locations, (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                }

            }
            catch (error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }
        else if(isAdmin(sender) && (parameter.command === "r" || parameter.command === "reverse")) {
            const playerName = parameter.player ?? sender.name
            const request = {
                sql : `SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                       FROM \`block_history\` 
                       JOIN PlayerConnections 
                       ON block_history.actor_id = PlayerConnections.PlayerID 
                       WHERE PlayerName = ?  
                       ORDER BY \`block_history\`.\`tick\` DESC
                       LIMIT ? OFFSET ?`,
                values : [playerName, parameter.count ?? 5, parameter.startingFrom ?? 0]
            }
            try {
                const response = await BlockHistoryPlugin.database.query(request);
                const tickInASec = TicksPerSecond
                const tickInAMin = tickInASec*60
                const tickInAnHour = tickInAMin*60
                const tickInADay = tickInAnHour*24
                let locations = []
                for(let i = response.result.length-1; i+1; i--){
                    const block_alteration = response.result[i]
                    const timeOfBlockAlteration = system.currentTick - parseInt(block_alteration.tick)
                    sendMessage(`${block_alteration.PlayerName} - [${block_alteration.x}, ${block_alteration.y}, ${block_alteration.z}]: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
                    locations.push({x: block_alteration.x, y: block_alteration.y, z: block_alteration.z})
                }
                if(response.result == ""){
                    sendMessage(`No changes were made by the player ${playerName}`,'CMD - BlockHistory',sender);
                }
                else{
                    getEdgeLocations(locations, (loc,axis) => {
                        addActiveParticles(loc,axis,sender);
                    })
                    sendMessage(`are you sure you want to reverse these changes?\n - !bh confirm to confirm`,'CMD - BlockHistory',sender);
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

            }
            catch(error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
            
        }
        else if(isAdmin(sender) && parameter.command === "confirm") {
            try {
                confirmationPerPlayer[sender.id].confirmed = true
            }
            catch {
                sendMessage('the confirmation has expired!', 'cmd - BlockHistory', sender)
            }
        }
        else if(/*isAdmin(sender) && */(parameter.command === "c" || parameter.command === "clear")) {
            if(parameter.players){
                for(let i = 0;i<parameter.players.length; i++){
                    const player = parameter.players[i]
                    removeActiveParticles(player)
                }
            } else {
                removeActiveParticles(sender);
            }
        }
        else if(/*isAdmin(sender) && */(parameter.command === "ca" || parameter.command === "clearall")) {
            removeAllActiveParticles();
        }
        else {
            sendMessage(
                `help:
                b/block - shows the changes made to block on [x], [y], [z] - parameters: count, startingFrom, location: x, location: y, location: z
                p/player - shows the changes made by a player - parameters: count, startingFrom, player
                i/inspect - gets you into inspector mode - when you place blocks it doesn't place them and instead shows you the changes made to that block
                r/reverse - reverses actions of a player in specific time frame - parameters: count, startingFrom, player
                bt/blockytools - show history of blockytools edits - parameters: count, startingFrom, player -- not ready yet
                rbt/reversebt/reverseblockytools - reverses a blockytools edit using its id - parameters: count, startingFrom, player -- not ready yet
                redo - reverses an action made by this plugin - parameters: ID
                c/clear - clears all the particles generated by this plugin by a player
                ca/clearall - clears all the particles generated by this plugin by everyone
                `);
        }
    }
  command_parser.registerCommand("bh", {
    parameters: [
        {id: "command", type: "string", optional: true, choice: {
                b: [
                    {type:'int',id:'count',optional:true},
                    {type:'int',id:'startingFrom',optional:true},
                    {type:'pos',id:'coords',optional:true}
                ],
                block: [
                    {type:'int',id:'count',optional:true},
                    {type:'int',id:'startingFrom',optional:true},
                    {type:'pos',id:'coords',optional:true}
                ],
                p: [
                    {type:'int',id:'count',optional:true},
                    {type:'int',id:'startingFrom',optional:true},
                    {type:'string',id:'player',optional:true}
                ],
                player: [
                    {type:'int',id:'count',optional:true},
                    {type:'int',id:'startingFrom',optional:true},
                    {type:'string',id:'player',optional:true}
                ],
                c: [
                    {type: 'selector', id: 'players', optional:true, playerOnly:true}
                ],
                clear: [
                    {type: 'selector', id: 'players', optional:true, playerOnly:true}
                ],
                ca: [
                    {}
                ],
                clearall: [
                    {}
                ],
                r: [
                    {}
                ],
                reverse: [
                    {}
                ],
                confirm: [
                    {}
                ]
                
            }
        }
    ], aliases: ["blockhistory", "co", "coreprotect"], run: blockHistoryHandler
  })
}

export {main}
