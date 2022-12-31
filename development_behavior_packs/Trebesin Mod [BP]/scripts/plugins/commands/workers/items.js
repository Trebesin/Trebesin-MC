import { command_parser } from './admin';
import {world,ItemTypes, ItemStack} from '@minecraft/server';

function main() {
    const itemCommands = {
        'trebesin:cmd_phaser': {
            input: 'phase',
            parameter: '2'
        }
    }
    command_parser.registerCommand('commanditem',{
        parameters: [
            {
                type: 'str',
                id: 'commandName'
            },
            {
                type: 'str',
                id: 'commandParameters'
            }
        ],
        /**
         * 
         * @param {Player} sender 
         * @param {*} parameters 
         */
        run(sender,parameters) {
            const commandItem = new ItemStack(ItemTypes.get('trebesin:cmd_universal'),1);
            commandItem.setLore([parameters.commandName,parameters.commandParameters]);
            sender.getComponent('inventory').container.addItem(commandItem);
        }
    });

    world.events.beforeItemUse.subscribe((eventData) => {
        //## Dynamic item:
        if (eventData.item.typeId === 'trebesin:cmd_universal') {
            const itemLore = eventData.item.getLore();
            const command = itemLore[0];
            const parameters = itemLore[1];
            command_parser.runCommand(command,parameters,eventData.source);
        }
        //## Hardcoded items:
        const itemCommand = itemCommands[eventData.item.typeId];
        if (itemCommand) {
            command_parser.runCommand(itemCommand.input,itemCommand.parameter,eventData.source);
        }
    })
}

export {main}