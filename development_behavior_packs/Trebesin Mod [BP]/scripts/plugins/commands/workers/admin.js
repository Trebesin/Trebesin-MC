import {CommandResult, MinecraftEffectTypes , system, world, BlockLocation, MolangVariableMap, Color} from "@minecraft/server";
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

  async function DBDisconnect(sender) {
    try {
      await Backend.DB.disconnect();
      sendMessage(`§aSuccesfully disconnected from the database.`,'CMD',sender);
    } catch(error) {
      sendMessage(`${error}`,'CMD',sender);
    }
  }
  async function DBConnect(sender) {
    try {
      await Backend.DB.connect();
      sendMessage(`§aSuccesfully connected to the database.`,'CMD',sender);
    } catch(error) {
      sendMessage(`${error}`,'CMD',sender);
    }
  }

  command_parser.registerCommand("disconnect", {parameters: [], senderCheck: isAdmin, run: DBDisconnect
  })

  command_parser.registerCommand("connect", {parameters: [], senderCheck: isAdmin, run: DBConnect
  })

  command_parser.registerCommand("block", {
    parameters: [], senderCheck: isAdmin,
    run: (sender,parameters) => {
      const location = new BlockLocation(Math.round(sender.location.x),Math.round(sender.location.y),Math.round(sender.location.z));
      world.say(`${sender.dimension.getBlock(location).typeId}`);
    }
  })

  async function op(sender, parameter){
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

  command_parser.registerCommand("op", {parameters: [{id: "player", type: "string", optional: true}], senderCheck: isAdmin, run: op
  })

  async function deop(sender, parameter){
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

  command_parser.registerCommand("deop", {parameters: [{id: "player", type: "string", optional: true}], senderCheck: isAdmin, run: deop
  })


  //gamemode commmands

  async function gmc(sender){
    await sender.runCommandAsync(`gamerule sendcommandfeedback false`)//could this be solved better? - No
    await sender.runCommandAsync(`gamemode c @s `)
    if(!sender.hasTag("fly")){
      await sender.runCommandAsync(`tag @s add fly`)
      await sender.runCommandAsync(`ability @s mayfly true`)
    }
    sendMessage("you are now in §lcreative§r§f Mode", "§aCMD§f", sender)
    await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
  }

  command_parser.registerCommand("gmc", {
    aliases: ["gamemodecreative", "gamemode", "gamemodec", "gm0", "gmcreative", "creative"], parameters: [], senderCheck: isAdmin, run: gmc
  })

  async function gms(sender){
    await sender.runCommandAsync(`gamerule sendcommandfeedback false`)
    await sender.runCommandAsync(`gamemode s @s `)
    if(sender.hasTag("fly")){
      await sender.runCommandAsync(`tag @s remove fly`)
      await sender.runCommandAsync(`ability @s mayfly false`)
    }
    sendMessage("you are now in §lsurvival§r§f Mode", "§aCMD§f", sender)
    await sender.runCommandAsync(`gamerule sendcommandfeedback true`)
  }

  command_parser.registerCommand("gms", {
    aliases: ["gamemodesurvival", "gamemodes", "gm1", "gmsurvival", "survival"], parameters: [], senderCheck: isAdmin, run: gms
  })
  //movement commands

  command_parser.registerCommand("getvector", {
    aliases: ["vector"], parameters: [],senderCheck: isAdmin, run: (sender) => sendMessage(`${sender.viewVector.x}, ${sender.viewVector.y}, ${sender.viewVector.z}`,'CMD',sender)
  });
  command_parser.registerCommand("getcoords", {
    aliases: ["vector"], parameters: [],senderCheck: isAdmin, run: (sender) => sendMessage(`${sender.location.x}, ${sender.location.y}, ${sender.location.z}`,'CMD',sender)
  });
  command_parser.registerCommand('testSelector', {
    parameters: [{type:'selector',id:'entities'}],aliases:[], run(sender,parameters) {
      world.say(`${parameters.entities.length}`)
      for (const entity of parameters.entities) {
        world.say(`Entity: ${entity.typeId}, ${entity.nameTag}, ${entity.id}`);
      }
    }
  });

  command_parser.registerCommand('testArray', {aliases:[],parameters:[
    {type:'pos',id:'location'},{type:'string',id:'strArray',array:3},{type:'string',id:'option',choice:{test:[],not:[]}}
  ],run(sender,parameters) {
    logMessage(`${parameters.location.x},${parameters.location.y},${parameters.location.z}`);
    logMessage(`${parameters.strArray[0]},${parameters.strArray[1]},${parameters.strArray[2]}`);
    logMessage(`${parameters.option}`)
  }})

  command_parser.registerCommand('testedge', {
    parameters:[{type:'pos',id:'location'},{type:'int',id:'colour',array:3}],
    run(sender,parameters) {
      getEdgeLocations([parameters.location],(loc,axis) => {
        const molang = new MolangVariableMap()
        .setColorRGBA('variable.colour',new Color(parameters.colour[0]/255,parameters.colour[1]/255,parameters.colour[2]/255,1));
        sender.dimension.spawnParticle(`trebesin:edge_highlight_${axis}`,loc,molang)
      })
    }
  })
}

export {main, command_parser, isAdmin};
