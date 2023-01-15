import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation, TicksPerDay, TicksPerSecond} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { playerData } from "../../server/server";
import * as BlockHistoryPLugin from "../block_history";
function main(){
    async function blockHistoryHandler(sender, parameter){
        if(/*isAdmin(sender) && */(parameter.command === "b" || parameter.command === "block")){
            const x = parameter.param1 ?? sender.location.x
            const y = parameter.param2 ?? sender.location.y
            const z = parameter.param3 ?? sender.location.z
            const request = {
                sql : `SELECT *, PlayerConnections.PlayerName 
                       FROM \`block_history\` 
                       JOIN PlayerConnections ON block_history.actor_id = PlayerConnections.PlayerID 
                       WHERE x = ${Math.floor(x)} AND y = ${Math.floor(y)} AND z = ${Math.floor(z)}`
            }
            try {
                const response = await BlockHistoryPLugin.database.query(request);
                const tickInASec = TicksPerSecond
                const tickInAMin = tickInASec*60
                const tickInAnHour = tickInAMin*60
                const tickInADay = tickInAnHour*24
                for(const block_alteration of response.result){
                    const timeOfBlockAlteration = system.currentTick - parseInt(block_alteration.tick)
                    sendMessage(`${block_alteration.PlayerName}: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'CMD - BlockHistory',sender);
                }
                if(response.result == ""){
                    sendMessage(`No changes were made to block  ${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}`,'CMD - BlockHistory',sender);
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
                `)
        }
    }
  command_parser.registerCommand("bh", {
    parameters: [{id: "command", type: "string", optional: true}, {id: "param1", type: "string", optional: true}, {id: "param2", type: "string", optional: true}, {id: "param3", type: "string", optional: true}], aliases: ["block_history", "co", "coreprotect"], run: blockHistoryHandler
  })
}

export {main}
