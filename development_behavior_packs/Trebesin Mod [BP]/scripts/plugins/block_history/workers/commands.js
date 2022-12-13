import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { exported } from "../block_history";
function main(){
    async function blockHistoryHandler(sender, parameter){
        if(isAdmin(sender) && (parameter.command === "inspect" || parameter.command === "i")){
            const request = {
                sql : `Select * FROM \`block_history\` WHERE x = ${Math.floor(sender.location.x)} AND y = ${Math.floor(sender.location.y)} AND z = ${Math.floor(sender.location.z)}`
            }
            try {
                const response = await exported.connection.query(request);
                for(const block_alteration of response.result){
                    var hey = true
                    for (const player of world.getPlayers()) {
                        if (player.id === block_alteration.actor_id) {
                            sendMessage(`${player.name}: ${block_alteration.before_id} -> ${block_alteration.after_id}`,'CMD',sender);
                            hey = false; //im sure this can be done better but i dont care at this point
                            break;
                        }
                    }
                    if (hey) {
                            sendMessage(`player with id[${block_alteration.id}]: ${block_alteration.before_id} -> ${block_alteration.after_id}`,'CMD',sender);
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