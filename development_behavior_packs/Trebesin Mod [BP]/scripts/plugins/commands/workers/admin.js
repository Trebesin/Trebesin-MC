import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation, MolangVariableMap, Color, Location} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { getEdgeLocations } from '../../../mc_modules/particles';
import * as Backend from "../../backend/backend"; 
import { logMessage } from '../../debug/debug';
const command_parser = new CommandParser({
  prefix: "!", caseSensitive: false
})

function isAdmin(sender){
  return sender.hasTag("admin"); 
}

function main(){
  command_parser.registerCommand("summon", {
    parameters: [
      {id:'entity',type:'str'},
      {id:'location',type:'pos', optional: true}
    ], aliases: ["spawn"], senderCheck: isAdmin, run: (sender,parameters) => {
      try {
        sender.dimension.spawnEntity(parameters.entity,parameters.location);
        sendMessage(`Summoned ${parameters.entity}!`,'CMD',sender);
      } catch (error) {
        sendMessage(`Error! ${error}`,'CMD',sender);
      }
    }
  });


  command_parser.registerCommand("instakill", {
    parameters: [], aliases: [], senderCheck: isAdmin, run: (sender) => {
      const instaKillStatus = serverPlayerData.instaKill[sender.id];
      if (instaKillStatus) serverPlayerData.instaKill[sender.id] = false;
      else serverPlayerData.instaKill[sender.id] = true;
      sendMessage(`Your new InstaKill status: ${serverPlayerData.instaKill[sender.id]}`,'CMD',sender);
    }
  });


  command_parser.registerCommand("dupe", {
    parameters: [{id: 'count', type: 'integer', optional: true}], aliases: [], senderCheck: isAdmin, run: (sender,parameter) => {
      const container = sender.getComponent('inventory').container
      const item = container.getItem(sender.selectedSlot);
      if (item != null) {
        for(let i = 0;i<parameter.count ?? 1;i++){
          if (container.emptySlotsCount > 0) {
            container.addItem(item);
          } else {
            sender.dimension.spawnItem(item,new Location(sender.location.x,sender.location.y,sender.location.z));
          }
        }
        sendMessage(`Added copy of ${item.typeId} to your inventory!`,'CMD',sender);
      } else {
        sendMessage(`No item equipped!`,'CMD',sender);
      }
    }
  });


  command_parser.registerCommand("op", {parameters: [{id: "player", type: "string", optional: true}], senderCheck: isAdmin, run: (sender, parameter) => {
      if(!parameter.player)parameter.player = sender.name;
      for (const player of world.getPlayers()) {
        if (player.name === parameter.player) {
          try {
            player.setOp(true);
            sendMessage(`§aSuccessfully OPed "${player.name}"!`,'CMD',sender);
          } catch(error) {
            sendMessage(error,'CMD',sender);
            sendMessage(`§cCouldn't OP "${player.name}"!`,'CMD',sender);
          }
          return
        }
      }
      sendMessage(`§cCouldn't find "${parameter.player}"!`,'CMD',sender);
    }
  })

  command_parser.registerCommand("deop", {parameters: [{id: "player", type: "string", optional: true}], senderCheck: isAdmin, run: (sender, parameter) => {
      if(!parameter.player)parameter.player = sender.name;
      for (const player of world.getPlayers()) {
        if (player.name === parameter.player) {
          try {
            player.setOp(false);
            sendMessage(`§aSuccessfully deOPed "${player.name}"!`,'CMD',sender);
          } catch(error) {
            sendMessage(error,'CMD',sender);
            sendMessage(`§cCouldn't deOP "${player.name}"!`,'CMD',sender);
          }
          return
        }
      }
      sendMessage(`§cCouldn't find "${parameter.player}"!`,'CMD',sender);
    }
  })


  //gamemode commmands

  command_parser.registerCommand("gmc", {
    aliases: ["gamemodecreative", "gamemode", "gamemodec", "gm0", "gmcreative", "creative"], parameters: [], senderCheck: isAdmin, run: async (sender) => {
      await sender.runCommandAsync(`gamerule sendcommandfeedback false`)//could this be solved better? - No
      await sender.runCommandAsync(`gamemode c @s `)
      if(!sender.hasTag("fly")){
        await sender.runCommandAsync(`tag @s add fly`)
        await sender.runCommandAsync(`ability @s mayfly true`)
      }
      sendMessage("you are now in §lcreative§r§f Mode", "§aCMD§f", sender)
      await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
    }
  })

  command_parser.registerCommand("gms", {
    aliases: ["gamemodesurvival", "gamemodes", "gm1", "gmsurvival", "survival"], parameters: [], senderCheck: isAdmin, run: async (sender) => {
      await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
      await sender.runCommandAsync(`gamemode s @s `)
      if(sender.hasTag("fly")){
        await sender.runCommandAsync(`tag @s remove fly`)
        await sender.runCommandAsync(`ability @s mayfly false`)
      }
      sendMessage("you are now in §lsurvival§r§f Mode", "§aCMD§f", sender)
      await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
    }
  })

}

export {main, command_parser, isAdmin};
