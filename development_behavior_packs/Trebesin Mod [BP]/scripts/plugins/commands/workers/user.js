import {CommandResult, Location, system, world, Vector, Player, MinecraftEffectTypes} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import * as Debug from './../../debug/debug';
import { playerData as serverPlayerData } from '../../server/server';
import {command_parser} from "./admin";
import * as vectorMath from "../../../js_modules/vector.js";
function main(){
  command_parser.registerCommand("gmsp", {
    aliases: ["gamemodespectator", "gamemodesp", "gm3", "gmspectator", "spectator"], parameters: [], run: async (sender) => {
      await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
      await sender.runCommandAsync(`gamemode spectator @s `)
      sendMessage("you are now in §lspectator§r§f Mode", "§aCMD§f", sender)
      await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
    }
  })

  command_parser.registerCommand("gma", {
    aliases: ["gamemodeadventure", "gamemodea", "gm2", "gmadventure", "adventure"], parameters: [], run: async (sender) => {
      await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
      await sender.runCommandAsync(`gamemode a @s `)
      if(sender.hasTag("fly")){
        await sender.runCommandAsync(`tag @s remove fly`)
        await sender.runCommandAsync(`ability @s mayfly false`)
      }
      sendMessage("you are now in §ladventure§r§f mode", "§aCMD§f", sender)
      await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
    }
  })

  command_parser.registerCommand("phase", {
    parameters: [{id: "distance", type: "int", optional: true}], aliases: ["p","phaser"], run: (sender, parameter) => {
      try {
        const newLocation = Vector.add(sender.location, vectorMath.setVectorLength(sender.viewDirection, parameter.distance ?? 2));
        sender.teleport(newLocation, sender.dimension, sender.rotation.x, sender.rotation.y);
        sendMessage("§l§bWHOOSH!§r", "", sender);
      } catch (error) {
        world.say(`${error}`)
      }
    }
  })

  command_parser.registerCommand("fly", {
    parameters: [], aliases: ["f"], run: async (sender) => {
      const __parameter = !sender.hasTag("fly");
      await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
      await sender.runCommandAsync(`ability @s mayfly ${__parameter.toString()}`);
      if(__parameter){
        await sender.runCommandAsync(`tag @s add fly`);
        sendMessage("you can now §lfly§r!", "§aCMD§f", sender)
      }
      else{
        await sender.runCommandAsync(`tag @s remove fly`);
        sendMessage("you have disabled §lflying§r", "§aCMD§f", sender)
      }
      await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
    }
  });


    
  command_parser.registerCommand("nv", {description: "switches night vision on/off", aliases: ["nightvision"], parameters: [], run: (sender) => {
      try {
        if(!sender.hasTag("nvoff")) {
          sender.addTag("nvoff");
          sendMessage("your §l§anightvision§r has been turned off - §c(you might need to wait 15s for it to run out)", "§aCMD§f", sender);
        }
        else {
          sender.removeTag("nvoff");
          sendMessage("your §l§anightvision§r has been turned on", "§aCMD§f", sender);
        };
      } catch (error) {
        sendMessage(`Error! ${error}`,'CMD',sender);
      }
  }})
}
export {main};