import {CommandResult, MinecraftEffectTypes , world, BlockLocation,Location, TicksPerDay, TicksPerSecond, Vector, MolangVariableMap, Color, system} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { getEdgeLocations, createLocationSet2, locationToString, stringToLocation } from "../../../mc_modules/particles";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { logMessage } from "../../debug/debug";
import { playerData } from "../../server/server";
import * as BlockHistoryPLugin from "../block_history";
let particlesPerPlayers = {}

function addActiveParticles(particleLocation, axis, sender) {
    particlesPerPlayers[sender.id] ??= { //that thing i've talked bout is with question marks instead
        player: sender,
        particleLocations: new Set()
    };
    particlesPerPlayers[sender.id].particleLocations.add(locationToString(particleLocation,axis));
}

function removeActiveParticles(sender) {
    delete particlesPerPlayers[sender.id];
}

function removeAllActiveParticles() {
    for(const player in particlesPerPlayers){
        delete particlesPerPlayers[player];
    }
}
function spawnParticles(location,particleAxis, sender) {
    const molang = new MolangVariableMap()
    .setColorRGB('variable.colour',new Color(1,0,0,1));
    const dimension = world.getDimension('overworld');
    dimension.spawnParticle(`trebesin:edge_highlight_${particleAxis}`,location,molang);
}
function main(){
    system.runSchedule(() => {
        for (const player in particlesPerPlayers) {
            for (const locationString of particlesPerPlayers[player].particleLocations) {
                const particleLocation = stringToLocation(locationString);
                spawnParticles(particleLocation[0],particleLocation[1], particlesPerPlayers[player].player)
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
                const response = await BlockHistoryPLugin.database.query(request);
                const tickInASec = TicksPerSecond;
                const tickInAMin = tickInASec*60;
                const tickInAnHour = tickInAMin*60;
                const tickInADay = tickInAnHour*24;
                for (let responseIndex = response.result.length-1; responseIndex+1; responseIndex--) {
                    const block_alteration = response.result[responseIndex]
                    const timeOfBlockAlteration = system.currentTick - parseInt(block_alteration.tick)
                    sendMessage(`${block_alteration.PlayerName}: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
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
                const response = await BlockHistoryPLugin.database.query(request);
                const tickInASec = TicksPerSecond
                const tickInAMin = tickInASec*60
                const tickInAnHour = tickInAMin*60
                const tickInADay = tickInAnHour*24
                let locations = []
                for (let responseIndex = response.result.length-1; responseIndex+1; responseIndex--){
                    const block_alteration = response.result[responseIndex]
                    const timeOfBlockAlteration = system.currentTick - parseInt(block_alteration.tick)
                    sendMessage(`${block_alteration.PlayerName} - [${block_alteration.x}, ${block_alteration.y}, ${block_alteration.z}]: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
                    locations.push({x: block_alteration.x, y: block_alteration.y, z: block_alteration.z})
                }
                if (response.result == ''){
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
        else if (/*isAdmin(sender) && */(parameter.command === "c" || parameter.command === "clear")) {
            if (parameter.players) {
                for(let playerIndex = 0;playerIndex<parameter.players.length; playerIndex++){
                    const player = parameter.players[playerIndex]
                    removeActiveParticles(player)
                }
            }
            else{
                removeActiveParticles(sender)
            }
        }
        else if (/*isAdmin(sender) && */(parameter.command === "ca" || parameter.command === "clearall")){
            removeAllActiveParticles();
        }
        else {
            sendMessage(
                `help:
                b/block - shows the changes made to block on [x], [y], [z] - parameters: count, startingFrom, location: x, location: y, location: z
                p/player - shows the changes made by a player - parameters: count, startingFrom, player
                i/inspect - gets you into inspector mode - when you place blocks it doesn't place them and instead shows you the changes made to that block
                r/reverse - reverses actions of a player in specific time frame - parameters: player, operations
                redo - reverses an action made by this plugin - parameters: ID
                c/clear - clears all the particles generated by this plugin by a player
                ca/clearall - clears all the particles generated by this plugin by everyone
                `)
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
                
            }
        }
    ], aliases: ["blockhistory", "co", "coreprotect"], run: blockHistoryHandler
  })
}

export {main}
