import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation, TicksPerDay, TicksPerSecond} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import * as BlockHistoryPLugin from "../block_history";
function main(){
    async function blockHistoryHandler(sender, parameter){
        if(/*isAdmin(sender) && */(parameter.command === "b" || parameter.command === "block")){
            const x = parameter.par1 ?? sender.location.x
            const y = parameter.par2 ?? sender.location.y
            const z = parameter.par3 ?? sender.location.z
            const request = {
                sql : `SELECT *, PlayerConnections.PlayerName 
                       FROM \`block_history\` 
                       JOIN PlayerConnections ON block_history.actor_id = PlayerConnections.PlayerID 
                       WHERE x = ${Math.floor(parseInt(x))} AND y = ${Math.floor(parseInt(y))} AND z = ${Math.floor(parseInt(z))}`
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
                if(response.isEmpty()){
                    sendMessage(`There have been found no changes made to this block (note: this is only from the time the server was ported to bedrock)`,'CMD - BlockHistory',sender);

                }
            }
            catch(error) {
                sendMessage(`${error}`,'CMD - BlockHistory',sender);
            }
        }
        else {
            sendMessage(
                `help:
                b x y z`)
        }
    }
  command_parser.registerCommand("bh", {
    parameters: [{id: "command", type: "string", optional: true}, {id: "par1", type: "string", optional: true}, {id: "par2", type: "string", optional: true}, {id: "par3", type: "string", optional: true}], aliases: ["block_history", "co", "coreprotect"], run: blockHistoryHandler
  })
}

export {main}
