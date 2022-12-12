import {CommandResult, MinecraftEffectTypes , system, world, Player, MinecraftBlockTypes, BlockLocation} from "@minecraft/server";
import {CommandParser, sendMessage} from "../../../mc_modules/commandParser";
import { copyVector, sumVectors } from '../../../js_modules/vector';
import { setBlockType } from '../../block_history/block_history';
const commands = new CommandParser({
  prefix: "bt!", caseSensitive: false
})
async function main() {
  commands.registerCommand('idk',{
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
    /**
     * 
     * @param {Player} sender 
     * @param {*} parameters 
     */
    run(sender,parameters) {
      const blocks = generateBlockArea(parameters.location,parameters.size);
      for (let index = 0;index < blocks.length;index++) {
        const block = blocks[index];
        setBlockType(
          sender.dimension.getBlock(new BlockLocation(block.x,block.y,block.z)),
          MinecraftBlockTypes.get(parameters.blockId),
          sender.id
        );
      }
      sendMessage('Successfully genarated the thing!','CMD',sender);
    }
  })
}

function generateBlockArea(coord,steps = 10) {
  const coords = [];
  const vectorDefinitions = {};
  //Tertiary vectors are sent at the beginning from the starting coordinate and also from the secondary and primary vectors. Those cover the whole Y axis.
  vectorDefinitions.tertiary = [
          {
              vector: {x:0,y:1,z:0}
          },
          {
              vector: {x:0,y:-1,z:0}
          }
  ];
  //Secondary vectors are sent by the primary vectors. Those cover each X,Z quadrant of the area.
  vectorDefinitions.secondary = [
          {
              vector: {x:0,y:0,z:1},
              sends: vectorDefinitions.tertiary
          },
          {
              vector: {x:0,y:0,z:-1},
              sends: vectorDefinitions.tertiary
          },
          {
              vector: {x:-1,y:0,z:0},
              sends: vectorDefinitions.tertiary
          },
          {
              vector: {x:1,y:0,z:0},
              sends: vectorDefinitions.tertiary
          }
  ];
  //Primary vectors are sent at the beginning from the starting coordinate. Those are the edges between the X,Z quadrants of the area.
  vectorDefinitions.primary = [
          {
              vector: {x:1,y:0,z:0},
              sends: [vectorDefinitions.secondary[0],...vectorDefinitions.tertiary]
          },
          {
              vector: {x:-1,y:0,z:0},
              sends: [vectorDefinitions.secondary[1],...vectorDefinitions.tertiary]
          },
          {
              vector: {x:0,y:0,z:1},
              sends: [vectorDefinitions.secondary[2],...vectorDefinitions.tertiary]
          },
          {
              vector: {x:0,y:0,z:-1},
              sends: [vectorDefinitions.secondary[3],...vectorDefinitions.tertiary]
          }

  ];
  let sentVectors = [];
  for (let step = 0;step <= steps;step++) {
      const lastLength = sentVectors.length;
      if (step === 0) {
          const location = copyVector(coord);
          for (let index = 0;index < vectorDefinitions.primary.length;index++) {
              sentVectors.push({
                  location: copyVector(location),
                  definition: vectorDefinitions.primary[index]
              });
          }
          for (let index = 0;index < vectorDefinitions.tertiary.length;index++) {
              sentVectors.push({
                  location: copyVector(location),
                  definition: vectorDefinitions.tertiary[index]
              });
          }
          coords.push(location);
      }
      for (let index = 0;index < lastLength;index++) {
          const vector = sentVectors[index];
          const location = sumVectors(vector.location,vector.definition.vector);
          vector.location = copyVector(location);
          coords.push(location);
          if (vector.definition.sends) {
              for (let sendIndex = 0;sendIndex < vector.definition.sends.length;sendIndex++) {
                  sentVectors.push({
                      location: copyVector(location),
                      definition: vector.definition.sends[sendIndex]
                  });
              }
          }
      }
  }
  return coords;
}

export {main};