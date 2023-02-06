import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation, MolangVariableMap, Color, Location} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { getEdgeLocations, interfaceToLocation } from '../../../mc_modules/particles';
import * as Backend from "../../backend/backend"; 
import { playerData as serverPlayerData } from '../../server/server';
import { logMessage } from '../../debug/debug';
const command_parser = new CommandParser({
  prefix: "!", caseSensitive: false
})

function isAdmin(sender){
  return sender.hasTag("admin") || sender.id === "-193273528314" || sender.id === "-279172874239"; 
}
function isMod(sender){
  return sender.hasTag("moderator") || isAdmin(sender)
}
function isBuilder(sender){
  return sender.hasTag("builder") || isMod(sender)
}

function main(){
  command_parser.registerCommand("summon", {
    parameters: [
      {id:'entity',type:'str'},
      {id:'location',type:'pos', optional: true}
    ], aliases: ["spawn"], senderCheck: isBuilder, run: (sender,parameters) => {
      try {
        sender.dimension.spawnEntity(parameters.entity, parameters.location ?? interfaceToLocation(sender.location));
        sendMessage(`Summoned ${parameters.entity}!`,'CMD',sender);
      } catch (error) {
        sendMessage(`Error! ${error}`,'CMD',sender);
      }
    },
    description: "summons an entity"
  });


  command_parser.registerCommand("instakill", {
    parameters: [], aliases: ["ik"], senderCheck: isBuilder, run: (sender) => {
      const instaKillStatus = serverPlayerData.instaKill[sender.id];
      if (instaKillStatus) serverPlayerData.instaKill[sender.id] = false;
      else serverPlayerData.instaKill[sender.id] = true;
      sendMessage(`Your new InstaKill status: ${serverPlayerData.instaKill[sender.id]}`,'CMD',sender);
    },
    description: "makes every punch oneshot everything"
  });


  command_parser.registerCommand("dupe", {
    parameters: [{id: 'count', type: 'integer', optional: true}, {id: 'whomTo', type: 'selector', playerOnly: true, optional: true}], aliases: [], senderCheck: isBuilder, run: (sender,parameter) => {
      const container = sender.getComponent('inventory').container
      const item = container.getItem(sender.selectedSlot);
      if (item != null) {
        const itemReceivers = parameter.whomTo ?? [sender]
        for(let j = 0;j<itemReceivers.length;j++){
          const player = itemReceivers[j]
          const receiverContainer = player.getComponent('inventory').container
          for(let i = 0;i<(parameter.count ?? 1);i++){
            if (receiverContainer.emptySlotsCount > 0) {
              receiverContainer.addItem(item);
            } else {
              player.dimension.spawnItem(item,new Location(player.location.x,player.location.y,player.location.z));
            }
          sendMessage(`Added copy of ${item.typeId} to your inventory by ${sender.name}`,'CMD',player);
          }
        }
      } else {
        sendMessage(`No item equipped!`,'CMD',sender);
      }
    },
    description: "dupes item in your hand"
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
    },
    description: "ops a player"
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
    },
    description: "deops a player"
  })


  //gamemode commmands

  command_parser.registerCommand("gmc", {
    aliases: ["gamemodecreative", "gamemode", "gamemodec", "gm0", "gmcreative", "creative"], parameters: [], senderCheck: isBuilder, run: async (sender) => {
      await sender.runCommandAsync(`gamerule sendcommandfeedback false`)//could this be solved better? - No
      await sender.runCommandAsync(`gamemode c @s `)
      if(!sender.hasTag("fly")){
        await sender.runCommandAsync(`tag @s add fly`)
        await sender.runCommandAsync(`ability @s mayfly true`)
      }
      sendMessage("you are now in §lcreative§r§f Mode", "§aCMD§f", sender)
      await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
    },
    description: "sets your gamemode to creative"
  })

  command_parser.registerCommand("log", {description: "turns chat log broadcast on/off per player", aliases: ["logs", "logmessages", "seelogs", "seelogmessages"], parameters: [], run: (sender) => {
      try {
        if(sender.hasTag("log")) {
          sender.removeTag("log");
          sendMessage("logmessages will no longer show", "§aCMD§f", sender);
        }
        else {
          sender.addTag("log");
          sendMessage("you will now see logmessages", "§aCMD§f", sender);
        };
      } catch (error) {
        sendMessage(`Error! ${error}`,'CMD',sender);
      }
  },
})

  command_parser.registerCommand("gms", {
    aliases: ["gamemodesurvival", "gamemodes", "gm1", "gmsurvival", "survival"], parameters: [], senderCheck: isBuilder, run: async (sender) => {
      await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
      await sender.runCommandAsync(`gamemode s @s `)
      if(sender.hasTag("fly")){
        await sender.runCommandAsync(`tag @s remove fly`)
        await sender.runCommandAsync(`ability @s mayfly false`)
      }
      sendMessage("you are now in §lsurvival§r§f Mode", "§aCMD§f", sender)
      await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
    },
    description: "sets your gamemode to survival"
  })

}

export {main, command_parser, isAdmin, isBuilder, isMod};
