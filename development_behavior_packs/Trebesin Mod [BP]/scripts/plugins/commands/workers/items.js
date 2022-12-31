import { command_parser } from './admin';
import {world,ItemTypes, ItemStack} from '@minecraft/server';
import { sendMessage } from '../../../mc_modules/commandParser';

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
            },
            {
                type: 'str',
                id: 'itemName',
                optional: true
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
            commandItem.nameTag = parameters.itemName ?? `[CMD] ${parameters.commandName}`;
            sender.getComponent('inventory').container.addItem(commandItem);
            sendMessage(`Successfully created item for the command ${parameters.commandName}. It's been addded to your inventory.`,'CMD',sender);
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