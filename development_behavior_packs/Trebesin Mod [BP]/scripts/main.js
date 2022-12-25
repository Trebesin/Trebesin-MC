import * as blockHistory from './plugins/block_history/block_history';
import * as blockyTools from './plugins/blocky_tools/blocky_tools';
import * as server from './plugins/server/server';
import * as commands from './plugins/commands/commands';
import { world } from '@minecraft/server';
console.warn('\n\nReloading Trebesin Mod...\n\n');
world.say('\n\nReloading Trebesin Mod...\n\n');
function executePlugins() {
    try {
        console.warn('Loading Block History...\n{');
        world.say('Loading Block History...\n{');
        blockHistory.main();
        console.warn('}\nLoaded Block History...\n{');
        world.say('}\nLoaded Block History...\n{');
    } catch (error) {
        console.warn(error);
        world.say(`${error}`);
    }
    try {
        blockyTools.main();
        console.warn('Loaded Blocky Tools (world edit)');
        world.say('Loaded Blocky Tools (world edit)');
    } catch (error) {
        console.warn(error);
        world.say(`${error}`);
    }
    try {
        server.main();
        console.warn('Loaded Server');
        world.say('Loaded Server');
    } catch (error) {
        console.warn(error);
        world.say(`${error}`);
    }
    try {
        commands.main();
        console.warn('Loaded commands');
        world.say('Loaded commands');
    } catch (error) {
        console.warn(error);
        world.say(`${error}`);
    }
    
}

executePlugins();
