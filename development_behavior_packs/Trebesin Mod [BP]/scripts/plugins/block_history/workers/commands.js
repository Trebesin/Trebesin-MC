import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { command_parser, isAdmin } from "../../commands/workers/admin";
import { exported } from "../block_history";
function main(){
  async function blockHistoryHandler(sender, parameter){
    try {
      const newLocation = Vector.add(sender.location, vectorMath.setVectorLength(sender.viewDirection, parameter.distance ?? 2));
      sender.teleport(newLocation, sender.dimension, sender.rotation.x, sender.rotation.y);
      sendMessage("§l§bWHOOSH!§r");
    } catch (error) {
      world.say(`${error}`)
    }
  }
  command_parser.registerCommand("bh", {
    parameters: [{id: "distance", type: "int", optional: true}], aliases: ["block_history"], run: blockHistoryHandler
  })
}

export {main}