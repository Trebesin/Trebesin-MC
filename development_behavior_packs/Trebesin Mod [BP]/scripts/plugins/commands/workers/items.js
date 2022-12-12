import { command_parser } from './admin';
import {world} from '@minecraft/server';

function main() {
    const itemCommands = {
        'trebesin:cmd_phaser': {
            input: 'phase',
            parameter: '2'
        }
    }
    world.events.beforeItemUse.subscribe((eventData) => {
        const itemCommand = itemCommands[eventData.item.typeId];
        if (itemCommand) {
            command_parser.runCommand(itemCommand.input,[itemCommand.parameter],eventData.source);
        }
    })
}

export {main}