//APIs:
import { Block, BlockPermutation } from "@minecraft/server";
import { variables as ServerConfig } from '@minecraft/server-admin';
//Plugins:
import {isAdmin} from "./admin";
import { Commands, DB } from '../../backend/backend';
//Modules:
import { sendMessage } from '../../../mc_modules/players';
import { logMessage } from "../../debug/debug";
import { setBlockPermutation, setBlockType } from '../../block_history/block_history';


export function main(){
  if(!ServerConfig.get('debug-enabled')) return;
  /*

  ----these feature has been tested and the propability of them beraking is low that's why the code is commented.---
  ----It's not removed hovewer in case those features unexpactably breaks---

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
        .setColorRGBA('variable.color',new Color(parameters.colour[0]/255,parameters.colour[1]/255,parameters.colour[2]/255,1));
        sender.dimension.spawnParticle(`trebesin:edge_highlight_${axis}`,loc,molang)
      })
    }
  })

  */
 
  Commands.registerCommand("databasedisconnect", {aliases: ["dbdisconnect", "dbdis"], parameters: [], senderCheck: isAdmin, run: async (sender) =>  {
      try {
        await DB.disconnect();
        sendMessage(`§asuccesfully disconnected from the database.`,'cmd',sender);
      } catch(error) {
        sendMessage(`${error}`,'cmd',sender);
      }
    }
  })

  Commands.registerCommand("databaseconnect", {aliases: ["dbconnect", "dbcon"], parameters: [], senderCheck: isAdmin, run: async (sender) => {
      try {
        await DB.connect();
        sendMessage(`§asuccesfully connected to the database.`,'cmd',sender);
      } catch(error) {
        sendMessage(`${error}`,'cmd',sender);
      }
    }
  })

  Commands.registerCommand("block", {parameters: [], senderCheck: isAdmin, run: (sender,parameters) => {
      const location = {x: Math.round(sender.location.x), y: Math.round(sender.location.y), z: Math.round(sender.location.z)}
      sendMessage(`${sender.dimension.getBlock(location).typeId}`, 'cmd - debug', sender);
    }
  })
  //movement commands

  Commands.registerCommand("getvector", {
    aliases: ["vector"], parameters: [],senderCheck: isAdmin, run: (sender) => sendMessage(`${sender.getViewDirection().x}, ${sender.getViewDirection().y}, ${sender.getViewDirection().z}`,'CMD',sender)
  });

  Commands.registerCommand("getcoords", {
    aliases: ["vector"], parameters: [],senderCheck: isAdmin, run: (sender) => sendMessage(`${sender.location.x}, ${sender.location.y}, ${sender.location.z}`,'CMD',sender)
  });

  Commands.registerCommand('testSelector', {
    parameters: [{type:'selector',id:'entities'}],aliases:[], senderCheck: isAdmin, run(sender,parameters) {
      sendMessage(`${parameters.entities.length}`, 'cmd - debug', sender)
      for (const entity of parameters.entities) {
        sendMessage(`Entity: ${entity.typeId}, ${entity.nameTag}, ${entity.id}`, 'cmd - debug', sender);
      }
    }
  });

  Commands.registerCommand('testBlockType', {
    parameters: [
      {
        id: 'blockType',
        type:'blockType'
      }
    ],
    run(sender, parameters) {
      logMessage(JSON.stringify(parameters.blockType));
      setBlockType(sender.dimension.getBlock(sender.location),parameters.blockType,sender.id);
    }
  });

  Commands.registerCommand('testBlockPermutation', {
    parameters: [
      {
        id: 'permutation',
        type:'blockPermutation'
      }
    ],
    run(sender, parameters) {
      /** @type {BlockPermutation} */
      const permutation = parameters.permutation;
      const allStates = permutation.getAllProperties();
      logMessage(permutation.type.id);
      logMessage(JSON.stringify(permutation.getTags()));
      for (const state in allStates) {
        logMessage(`${state} = ${allStates[state]}`);
      }
      setBlockPermutation(sender.dimension.getBlock(sender.location),permutation,sender.id);
    }
  })

  Commands.registerCommand('testpos', {
    parameters:[{type:'pos',id:'location'}],
    senderCheck: isAdmin,
    run(sender,parameters) {
      sendMessage(`${parameters.location.x} ${parameters.location.y} ${parameters.location.z}`, "cmd - debug", sender);
    }
  })

}