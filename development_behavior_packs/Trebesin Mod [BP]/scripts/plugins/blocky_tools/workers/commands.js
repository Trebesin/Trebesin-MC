//APIs:
import {CommandResult, MinecraftEffectTypes , system, world, Player, MinecraftBlockTypes } from '@minecraft/server';
//Plugins:
import { setBlockType } from '../../block_history/block_history';
import { isAdmin } from "../../commands/workers/admin";
//Modules:
import { generateBlockPyramid } from '../../../js_modules/geometry';
import { CommandParser } from '../../../mc_modules/commandParser';
import { sendMessage } from '../../../mc_modules/players';
import { copyVector, sumVectors } from '../../../js_modules/vector';

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
  })
}
export { Commands }