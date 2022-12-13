import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser } from "../../commands/workers/admin";
function main(){
    command_parser.registerCommand("bh", {aliases: ["blockhistory", "coreprotect", "co"], parameters: []})
}