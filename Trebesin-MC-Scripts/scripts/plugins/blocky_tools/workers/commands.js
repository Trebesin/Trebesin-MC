//APIs:
import {CommandResult, MinecraftEffectTypes , system, world, Player, MinecraftBlockTypes } from '@minecraft/server';
//Plugins:
import { setBlockType } from '../../block_history/block_history';
import { isAdmin } from "../../commands/workers/admin";
//Modules:
import { generateBlockArea } from '../../../mc_modules/blocks';
import { generateBlockPyramid } from '../../../js_modules/geometry';
import { CommandParser } from '../../../mc_modules/commandParser';
import { sendMessage } from '../../../mc_modules/players';
import { copyVector, sumVectors } from '../../../js_modules/vector';
import { logMessage } from '../../debug/debug';

const Commands = new CommandParser({
  prefix: '.', caseSensitive: false
})

export async function main() {
  Commands.registerCommand('idk',{
    parameters: [
      {
        type: 'pos',
        id: 'location'
      },
      {
        type: 'str',
        id: 'blockId'
      },
      {
        type: 'int',
        id: 'size'
      }
    ],
    senderCheck: isAdmin,
    /**
     * 
     * @param {Player} sender 
     * @param {*} parameters 
     */
    run(sender,parameters) {
      try{
      const blocks = [];
      generateBlockArea(parameters.location,parameters.size,(location) => {
        blocks.push(location);
      });
      for (let index = 0;index < blocks.length;index++) {
        const block = blocks[index];
        setBlockType(
          sender.dimension.getBlock(block),
          MinecraftBlockTypes.get(parameters.blockId),
          sender.id
        );
      }
      sendMessage('Successfully generated the thing!','CMD',sender);
      }
      catch(error){
        logMessage(error)
      }
    }
  })
}
export { Commands }