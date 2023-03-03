//APIs:
import {CommandResult, MinecraftEffectTypes , system, world, MolangVariableMap} from "@minecraft/server";
//Plugins:
import { Commands } from "../../backend/backend"; 
import { playerData as serverPlayerData } from '../../server/server';
//Modules:
import { sendMessage } from '../../../mc_modules/players';


export function isAdmin(sender){
  return sender.hasTag("admin") || sender.id === "-193273528314" || sender.id === "-279172874239"; 
}
export function isMod(sender){
  return sender.hasTag("moderator") || isAdmin(sender)
}
export function isBuilder(sender){
  return sender.hasTag("builder") || isMod(sender)
}

export function main() {
  Commands.registerCommand("summon", {
    aliases: ["spawn"],
    description: "summons an entity",
    senderCheck: isBuilder,
    parameters: [
      {id:'entity',type:'str'},
      {id:'location',type:'pos', optional: true}
    ],
    run(sender,parameters) {
      try {
        sender.dimension.spawnEntity(parameters.entity, parameters.location ?? sender.location);
        sendMessage(`Summoned ${parameters.entity}!`,'CMD',sender);
      } catch (error) {
        sendMessage(`Error! ${error}`,'CMD',sender);
      }
    }
  });


  Commands.registerCommand("instakill", {
    aliases: ["ik"],
    description: "makes every punch oneshot everything",
    senderCheck: isBuilder,
    parameters: [],
    run(sender) {
      const instaKillStatus = serverPlayerData.instaKill[sender.id];
      if (instaKillStatus) serverPlayerData.instaKill[sender.id] = false;
      else serverPlayerData.instaKill[sender.id] = true;
      sendMessage(`Your new InstaKill status: ${serverPlayerData.instaKill[sender.id]}`,'CMD',sender);
    }
  });

  Commands.registerCommand("runas", {
    aliases: ["execute", "executeas"], 
    description: "runs a command (with the same prefix) as a user",
    senderCheck: isAdmin,
    parameters: [
      {type: "selector", id: "player", playersOnly: true},
      {type: "string", id: "command"},
      {type: "string", id: "parameters", array: Infinity, fullArray: false}
    ],
    run(sender, parameter) {
      for(let i = 0;i<parameter.player.length;i++){
        Commands.runCommand(parameter.command, parameter.parameters.join(' '), parameter.player[i], true)
      }
    }
  });


  Commands.registerCommand("dupe", {
    parameters: [{id: 'count', type: 'integer', optional: true}, {id: 'whomTo', type: 'selector', playersOnly: true, optional: true}, {id: 'name', type: 'string', optional: true}], aliases: [], senderCheck: isBuilder, run: (sender,parameter) => {
      const container = sender.getComponent('inventory').container
      const item = container.getItem(sender.selectedSlot);
      if(parameter.name)item.nameTag = parameter.name
      if (item != null) {
        const itemReceivers = parameter.whomTo ?? [sender]
        for(let j = 0;j<itemReceivers.length;j++){
          const player = itemReceivers[j]
          const receiverContainer = player.getComponent('inventory').container
          for(let i = 0;i<(parameter.count ?? 1);i++){
            if (receiverContainer.emptySlotsCount > 0) {
              receiverContainer.addItem(item);
            } else {
              player.dimension.spawnItem(item,player.location);
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


  Commands.registerCommand("tphere", {parameters: [{id: "players", type: "selector"}], description: "teleports players you select to you", run: (sender, parameter) => {
      for(let i = 0;i<parameter.players.length;i++){
        parameter.players[i].teleport(sender.location, sender.dimension, sender.getRotation().x, sender.getRotation().y)
      }
  }})

  Commands.registerCommand("tpallhere", {aliases: ["tpall"], description: "teleports all players to you", parameters: [], run: (sender, parameter) => {
    for (const player of world.getPlayers()) {
        player.teleport(sender.location, sender.dimension, sender.getRotation().x, sender.getRotation().y)
      }
  }})


  Commands.registerCommand("op", {parameters: [{id: "player", type: "string", optional: true}], senderCheck: isAdmin, run: (sender, parameter) => {
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

  Commands.registerCommand("deop", {parameters: [{id: "player", type: "string", optional: true}], senderCheck: isAdmin, run: (sender, parameter) => {
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

  Commands.registerCommand("gmc", {
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

  Commands.registerCommand("allowbuild", {description: "allows lava placing for players", aliases: ["allowlava", "lavaplace", "allowwater", "waterplace"], senderCheck: isAdmin, parameters: [{id: "player", type: 'selector', optional: false, playersOnly: true}], run: (sender) => {
    player = parameter.player[0] ?? sender
    if(sender.hasTag("certified_builder")) {
      sender.removeTag("certified_builder");
      sendMessage("you have been rewoked the permision to place lava", "§aCMD§f", player);
      sendMessage(`${player.name} been rewoked the permision to place lava`, "§aCMD§f", sender);
    }
    else {
      sender.addTag("certified_builder");
      sendMessage("you are now able to place lava", "§aCMD§f", player);
      sendMessage(`${player.name} is now able to place lava`, "§aCMD§f", sender);
    };
  },
})

  Commands.registerCommand("log", {description: "turns chat log broadcast on/off per player", aliases: ["logs", "logmessages", "seelogs", "seelogmessages"], senderCheck: isAdmin, parameters: [], run: (sender) => {
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

  Commands.registerCommand("gms", {
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
