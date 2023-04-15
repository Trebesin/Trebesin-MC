//APIs:
import * as Mc from '@minecraft/server';
//Plugins:
import { isAdmin, isBuilder } from './admin';
import { Commands } from '../../backend/backend';
//Modules:
import { sendMessage } from '../../../mc_modules/players';


export function main() {
    const itemCommands = {
        'trebesin:cmd_phaser': {
            input: 'phase',
            parameter: '2'
        }
    }
    Commands.registerCommand('commanditem',{
        aliases: ["itemcommand", "customitem", "ci"], senderCheck: isBuilder,
        parameters: [
            {
                type: 'str',
                id: 'commandName'
            },
            {
                type: "string",
                id: "commandParameters",
                array: Infinity,
                fullArray: false
            }
        ],
        /**
         * 
         * @param {Player} sender 
         * @param {*} parameters 
         */
        run(sender,parameters) {
            const commandItem = new Mc.ItemStack(Mc.ItemTypes.get('trebesin:cmd_universal'),1);
            commandItem.setLore([parameters.commandName,parameters.commandParameters.join(' ')]);
            commandItem.nameTag = parameters.itemName ?? `[CMD] ${parameters.commandName}`;
            sender.getComponent('inventory').container.addItem(commandItem);
            sendMessage(`Successfully created item for the command ${parameters.commandName}. It's been addded to your inventory.`,'CMD',sender);
        }
    });

    Mc.world.beforeEvents.itemUse.subscribe((eventData) => {
        //## Dynamic item:
        if (eventData.itemStack.typeId === 'trebesin:cmd_universal') {
            const itemLore = eventData.item.getLore();
            const command = itemLore[0];
            const parameters = itemLore[1];
            Mc.system.runTimeout(
                () => Commands.runCommand(command,parameters,eventData.source), 1
            );
        }
        //## Hardcoded items:
        const itemCommand = itemCommands[eventData.item.typeId];
        if (itemCommand) {
            Mc.system.runTimeout (
                () => Commands.runCommand(itemCommand.input,itemCommand.parameter,eventData.source), 1
            );
        }
    })
}