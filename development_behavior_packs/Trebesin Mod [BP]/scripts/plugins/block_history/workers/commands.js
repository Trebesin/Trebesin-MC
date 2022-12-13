import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { exported } from "../block_history";
function blockHistoryHandler(sender, parameter){
    sendMessage("hello", sender, "bh")
    /*
    if(isAdmin(sender) && (parameter.command === "inspect" || parameter.command === "i")){
        const request = {
            sql : `Select * FROM 'block_history' WHERE x = ${sender.location.x} AND y = ${sender.location.y} AND z = ${sender.location.z}`
        }
        await sendMessage(exported.connection.query(request).stringify,"bh",sender)
    }*/
}
function main(){
    command_parser.registerCommand("bh", {aliases: ["blockhistory", "coreprotect", "co"], parameters: [{id: "command", type: "string", optional: "true"}], run: blockHistoryHandler})
    command_parser.registerCommand("op", {parameters: [{id: "player", type: "string", optional: true}], senderCheck: isAdmin, run: op})
}

export {main}