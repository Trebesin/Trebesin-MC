import {CommandResult, Location, system, world, Vector, Player, MinecraftEffectTypes} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import * as Debug from './../../debug/debug';
import { playerData as serverPlayerData } from '../../server/server';
import {command_parser} from "./admin";
import * as vectorMath from "../../../js_modules/vector.js";
function main(){


  async function gmsp(sender){
    await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
    await sender.runCommandAsync(`gamemode spectator @s `)
    sendMessage("you are now in §lspectator§r§f Mode", "§aCMD§f", sender)
    await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
  }

  command_parser.registerCommand("gmsp", {
    aliases: ["gamemodespectator", "gamemodesp", "gm3", "gmspectator", "spectator"], parameters: [], run: gmsp
  })


  async function gma(sender){
    await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
    await sender.runCommandAsync(`gamemode a @s `)
    if(sender.hasTag("fly")){
      await sender.runCommandAsync(`tag @s remove fly`)
      await sender.runCommandAsync(`ability @s mayfly false`)
    }
    sendMessage("you are now in §ladventure§r§f mode", "§aCMD§f", sender)
    await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
  }

  command_parser.registerCommand("gma", {
    aliases: ["gamemodeadventure", "gamemodea", "gm2", "gmadventure", "adventure"], parameters: [], run: gma
  })


  /**
   * 
   * @param {Player} sender 
   * @param {*} parameter 
   */
  async function phase(sender, parameter){
    try {
      const newLocation = Vector.add(sender.location, vectorMath.setVectorLength(sender.viewDirection, parameter.distance ?? 2));
      sender.teleport(newLocation, sender.dimension, sender.rotation.x, sender.rotation.y);
      sendMessage("§l§bWHOOSH!§r", "", sender);
    } catch (error) {
      world.say(`${error}`)
    }
  }

  command_parser.registerCommand("phase", {
    parameters: [{id: "distance", type: "int", optional: true}], aliases: ["p","phaser"], run: phase
  })


  async function fly(sender){
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

  command_parser.registerCommand("fly", {
    parameters: [], aliases: ["f"], run: fly
  });


  command_parser.registerCommand("summon", {
    parameters: [
      {id:'entity',type:'str'},
      {id:'location',type:'pos'}
    ], aliases: ["spawn"], run: (sender,parameters) => {
      try {
        sender.dimension.spawnEntity(parameters.entity,parameters.location);
        sendMessage(`Summoned ${parameters.entity}!`,'CMD',sender);
      } catch (error) {
        sendMessage(`Error! ${error}`,'CMD',sender);
      }
    }
  });


  command_parser.registerCommand("instakill", {
    parameters: [], aliases: [], run: (sender) => {
      const instaKillStatus = serverPlayerData.instaKill[sender.id];
      if (instaKillStatus) serverPlayerData.instaKill[sender.id] = false;
      else serverPlayerData.instaKill[sender.id] = true;
      sendMessage(`Your new InstaKill status: ${serverPlayerData.instaKill[sender.id]}`,'CMD',sender);
    }
  });


  command_parser.registerCommand("dupe", {
    parameters: [], aliases: [], run: (sender,parameters) => {
      const container = sender.getComponent('inventory').container
      const item = container.getItem(sender.selectedSlot);
      if (item != null) {
        if (container.emptySlotsCount > 0) {
          container.addItem(item);
        } else {
          sender.dimension.spawnItem(item,new Location(sender.location.x,sender.location.y,sender.location.z));
        }
        sendMessage(`Added copy of ${item.typeId} to your inventory!`,'CMD',sender);
      } else {
        sendMessage(`No item equipped!`,'CMD',sender);
      }
    }
  });
    
  command_parser.registerCommand("nv", {description: "switches night vision on/off", aliases: ["nightvision"], run: (sender) => {
    if(sender.hasTag("nv"))sender.addTag("nv");
    else {
      sender.removeTag("nv");
      sender.addEffect(MinecraftEffectTypes.nightVision, 1, 1, false);
    };
  }})
}
export {main};