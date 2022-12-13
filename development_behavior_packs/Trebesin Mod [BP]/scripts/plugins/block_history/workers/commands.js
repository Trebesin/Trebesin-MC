import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { exported } from "../block_history";
function main(){
    async function blockHistoryHandler(sender, parameter){
        world.say(parameter.command)
        if(isAdmin(sender) && (parameter.command === "inspect" || parameter.command === "i")){
            const request = {
                sql : `Select * FROM 'block_history' WHERE x = ${sender.location.x} AND y = ${sender.location.y} AND z = ${sender.location.z}`
            }
            try {
            const response = await exported.connection.query(request);
            sendMessage(`${response.stringify()}`,'CMD',sender);
            } catch(error) {
                sendMessage(`${error}`,'CMD',sender);
            }
            await sendMessage(exported.connection.query(request).stringify,"bh",sender)
        }
    }
  command_parser.registerCommand("bh", {
    parameters: [{id: "command", type: "string", optional: true}], aliases: ["block_history"], run: blockHistoryHandler
  })
}

export {main}