import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation, TicksPerDay, TicksPerSecond, Vector, MolangVariableMap, Color} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { getCornerLocations } from "../../../mc_modules/particles";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { playerData } from "../../server/server";
import * as BlockHistoryPLugin from "../block_history";
function spawnParticles(particleLocation){
    let molang = new MolangVariableMap();
        molang.setColorRGB('variable.colour',new Color(255,0,0,1));
    const dimension = world.getDimension('overworld')
    dimension.spawnParticle('trebesin:selection_dot',particleLocation,molang);
}
function main(){
    async function blockHistoryHandler(sender, parameter){
        if(/*isAdmin(sender) && */(parameter.command === "b" || parameter.command === "block")){
            const pos = parameter.coords ?? sender.location
            const request = {
                sql : `SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                       FROM \`block_history\` 
                       JOIN PlayerConnections 
                       ON block_history.actor_id = PlayerConnections.PlayerID 
                       WHERE x = ${Math.floor(pos.x)} AND y = ${Math.floor(pos.y)} AND z = ${Math.floor(pos.z)}
                       ORDER BY \`block_history\`.\`tick\` DESC`,
            }
            try {
                const response = await BlockHistoryPLugin.database.query(request);
                const tickInASec = TicksPerSecond
                const tickInAMin = tickInASec*60
                const tickInAnHour = tickInAMin*60
                const tickInADay = tickInAnHour*24
                let counter = 0
                for(const block_alteration of response.result){
                    const timeOfBlockAlteration = system.currentTick - parseInt(block_alteration.tick)
                    sendMessage(`${block_alteration.PlayerName}: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
                    if(counter === 6)break;
                    counter++
                }
                if(response.result == ""){
                    sendMessage(`No changes were made to block  ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`,'CMD - BlockHistory',sender);
                }
            }
            catch(error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }
        else if(/*isAdmin(sender) && */(parameter.command === "p" || parameter.command === "player")){
            const playerName = parameter.player ?? sender.name
            const request = {
                sql : `SELECT DISTINCT block_history.*, PlayerConnections.PlayerName 
                       FROM \`block_history\` 
                       JOIN PlayerConnections 
                       ON block_history.actor_id = PlayerConnections.PlayerID 
                       WHERE PlayerName = ?  
                       ORDER BY \`block_history\`.\`tick\` DESC`,
                values : [playerName]
            }
            try {
                const response = await BlockHistoryPLugin.database.query(request);
                const tickInASec = TicksPerSecond
                const tickInAMin = tickInASec*60
                const tickInAnHour = tickInAMin*60
                const tickInADay = tickInAnHour*24
                let locations = []
                let counter = 0
                for(const block_alteration of response.result){
                    const timeOfBlockAlteration = system.currentTick - parseInt(block_alteration.tick)
                    sendMessage(`${block_alteration.PlayerName} - [${block_alteration.x}, ${block_alteration.y}, ${block_alteration.z}]: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
                    locations.push({x: block_alteration.x, y: block_alteration.y, z: block_alteration.z})
                    if(counter === 6)break;
                    counter++
                }
                if(response.result == ""){
                    sendMessage(`No changes were made to by player ${playerName}`,'CMD - BlockHistory',sender);
                }
                else{
                    getCornerLocations(locations, spawnParticles)
                }

            }
            catch(error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
            

        }
        else {
            sendMessage(
                `help:
                b/block - shows the changes made to block on [x], [y], [z] - parameters: location: x, location: y, location: z
                p/player - shows the changes made by a player - parameters: player
                i/inspect - gets you into inspector mode - when you place blocks it doesn't place them and instead shows you the changes made to that block
                r/reverse - reverses actions of a player in specific time frame - parameters: player, time (in ticks)
                redo - reverses an action made by this plugin - parameters: ID
                c/clear - clears all the particles generated by this plugin
                `)
        }
    }
  command_parser.registerCommand("bh", {
    parameters: [
        {id: "command", type: "string", optional: true, choice: {
                b: [
                    {type:'pos',id:'coords',optional:true}
                ],
                block: [
                    {type:'pos',id:'coords',optional:true}
                ],
                p: [
                    {type:'string',id:'player',optional:true}
                ],
                player: [
                    {type:'string',id:'player',optional:true}
                ]
            }
        }
    ], aliases: ["block_history", "co", "coreprotect"], run: blockHistoryHandler
  })
}

export {main}
