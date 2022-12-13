import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { exported } from "../block_history";
function main(){
    async function blockHistoryHandler(sender, parameter){
      sendMessage("hello", "§aCMD§f", sender)
        /*
        if(isAdmin(sender) && (parameter.command === "inspect" || parameter.command === "i")){
            const request = {
                sql : `Select * FROM 'block_history' WHERE x = ${sender.location.x} AND y = ${sender.location.y} AND z = ${sender.location.z}`
            }
            await sendMessage(exported.connection.query(request).stringify,"bh",sender)
        }*/
    }
  command_parser.registerCommand("bh", {
    parameters: [{id: "distance", type: "int", optional: true}], aliases: ["block_history"], run: blockHistoryHandler
  })
}

export {main}