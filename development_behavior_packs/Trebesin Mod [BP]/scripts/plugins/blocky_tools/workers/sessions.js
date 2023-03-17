//APIs:
import * as Mc from '@minecraft/server';
//Plugins:
import { logMessage } from '../../debug/debug';
//Modules:

const SessionStore = {};

export function main() {
    Mc.world.events.itemUse.subscribe(() => {
        logMessage('ItemUse')
    });

    Mc.world.events.itemUseOn.subscribe(() => {
        logMessage('ItemUse')
    });

    Mc.system.runInterval(() => {

    });
}