import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation, TicksPerDay, TicksPerSecondS} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import * as BlockHistoryPLugin from "../block_history";
function main(){
    async function blockHistoryHandler(sender, parameter){
        if(isAdmin(sender) && (parameter.command === "inspect" || parameter.command === "i")){
            const request = {
                sql : `Select * FROM \`block_history\` WHERE x = ${Math.floor(sender.location.x)} AND y = ${Math.floor(sender.location.y)} AND z = ${Math.floor(sender.location.z)}`
            }
            try {
                const response = await BlockHistoryPLugin.database.query(request);
                const tickInASec = TicksPerSecond
                const tickInAMin = tickInASec*60
                const tickInAnHour = tickInAMin*60
                const tickInADay = tickInAnHour*24
                for(const block_alteration of response.result){
                    let hey = true
                    const timeOfBlockAlteration = system.currentTick - parseInt(block_alteration.tick)
                    for (const player of world.getPlayers()) {
                        if (player.id === block_alteration.actor_id) {
                            sendMessage(`${player.name}: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'BH',sender);
                            hey = false; //im sure this can be done better but i dont care at this point 
                            break;
                        }
                    }
                    if (hey) {
                            sendMessage(`player with id[${block_alteration.actor_id}]: ${block_alteration.before_id} -> ${block_alteration.after_id} - before: ${Math.floor(timeOfBlockAlteration/tickInADay)}d${Math.floor(timeOfBlockAlteration%tickInADay/tickInAnHour)}h${Math.floor(timeOfBlockAlteration%tickInAnHour/tickInAMin)}m${Math.floor(timeOfBlockAlteration%tickInAMin/tickInASec)}s`,'BH',sender);
                    }
                }
            }
            catch(error) {
                sendMessage(`${error}`,'CMD',sender);
            }
        }
    }
  command_parser.registerCommand("bh", {
    parameters: [{id: "command", type: "string", optional: true}], aliases: ["block_history"], run: blockHistoryHandler
  })
}

export {main}
