import {CommandResult, Location, system, world, Vector, Player, MinecraftEffectTypes} from "@minecraft/server";
import { sendMessage } from '../../../mc_modules/players';
import * as Debug from './../../debug/debug';
import { playerData as serverPlayerData } from '../../server/server';
import { Commands } from '../../backend/backend';
import {isAdmin} from "./admin";
import * as backend from "../../backend/backend"; 
import * as vectorMath from "../../../js_modules/vector.js";
import { variables as ServerConfig } from '@minecraft/server-admin';
function main(){
  if(!ServerConfig.get('debug-enabled')) return;
  Commands.registerCommand('testArray', { aliases:[], parameters:[
        {type:'pos',id:'location'},
        {type:'string',id:'strArray',array:3},
        {type:'string',id:'option',choice:{test:[],not:[]}}
    ],
    senderCheck: isAdmin,
    run(sender,parameters) {
    logMessage(`${parameters.location.x},${parameters.location.y},${parameters.location.z}`);
    logMessage(`${parameters.strArray[0]},${parameters.strArray[1]},${parameters.strArray[2]}`);
    logMessage(`${parameters.option}`)
  }})

  Commands.registerCommand('testedge', {
    parameters:[{type:'pos',id:'location'},{type:'int',id:'colour',array:3}],
    senderCheck: isAdmin,
    run(sender,parameters) {
      getEdgeLocations([{
        x:Math.floor(parameters.location.x),
        y:Math.floor(parameters.location.y),
        z:Math.floor(parameters.location.z)
      }],(loc,axis) => {
        const molang = new MolangVariableMap()
        .setColorRGBA('variable.colour',new Color(parameters.colour[0]/255,parameters.colour[1]/255,parameters.colour[2]/255,1));
        sender.dimension.spawnParticle(`trebesin:edge_highlight_${axis}`,new Location(loc.x,loc.y,loc.z),molang)
      })
    }
  })
  Commands.registerCommand("databasedisconnect", {aliases: ["dbdisconnect", "dbdis"], parameters: [], senderCheck: isAdmin, run: async (sender) =>  {
      try {
        await backend.DB.disconnect();
        sendMessage(`§asuccesfully disconnected from the database.`,'cmd',sender);
      } catch(error) {
        sendMessage(`${error}`,'cmd',sender);
      }
    }
  })

  Commands.registerCommand("databaseconnect", {aliases: ["dbconnect", "dbcon"], parameters: [], senderCheck: isAdmin, run: async (sender) => {
      try {
        await backend.DB.connect();
        sendMessage(`§asuccesfully connected to the database.`,'cmd',sender);
      } catch(error) {
        sendMessage(`${error}`,'cmd',sender);
      }
    }
  })

  Commands.registerCommand("block", {parameters: [], senderCheck: isAdmin, run: (sender,parameters) => {
      const location = new BlockLocation(Math.round(sender.location.x),Math.round(sender.location.y),Math.round(sender.location.z));
      world.say(`${sender.dimension.getBlock(location).typeId}`);
    }
  })
  //movement commands

  Commands.registerCommand("getvector", {
    aliases: ["vector"], parameters: [],senderCheck: isAdmin, run: (sender) => sendMessage(`${sender.viewVector.x}, ${sender.viewVector.y}, ${sender.viewVector.z}`,'CMD',sender)
  });

  Commands.registerCommand("getcoords", {
    aliases: ["vector"], parameters: [],senderCheck: isAdmin, run: (sender) => sendMessage(`${sender.location.x}, ${sender.location.y}, ${sender.location.z}`,'CMD',sender)
  });

  Commands.registerCommand('testSelector', {
    parameters: [{type:'selector',id:'entities'}],aliases:[], senderCheck: isAdmin, run(sender,parameters) {
      world.say(`${parameters.entities.length}`)
      for (const entity of parameters.entities) {
        world.say(`Entity: ${entity.typeId}, ${entity.nameTag}, ${entity.id}`);
      }
    }
  });

  Commands.registerCommand('testpos', {
    parameters:[{type:'pos',id:'location'}],
    senderCheck: isAdmin,
    run(sender,parameters) {
      logMessage(`${parameters.location.x} ${parameters.location.y} ${parameters.location.z}`);
    }
  })

}

export {main}