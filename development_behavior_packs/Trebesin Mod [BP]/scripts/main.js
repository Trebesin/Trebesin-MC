import * as blockHistory from './plugins/block_history/block_history';
import * as blockyTools from './plugins/blocky_tools/blocky_tools';
import * as server from './plugins/server/server';
import * as commands from './plugins/commands/commands';
import * as Debug from './plugins/debug/debug';
import { world } from '@minecraft/server';

Debug.logMessage('\n\nReloading Trebesin Mod...\n\n',{api:false});
function executePlugins() {
    try {
        Debug.main();
        Debug.logMessage('Loaded debug');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        Debug.logMessage('Loading Block History...\n{');
        blockHistory.main();
        Debug.logMessage('}\nLoaded Block History...\n');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        blockyTools.main();
        Debug.logMessage('Loaded Blocky Tools (world edit)');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        server.main();
        Debug.logMessage('Loaded Server');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        commands.main();
        Debug.logMessage('Loaded commands');
    } catch (error) {
        Debug.logMessage(error);
    }
}

executePlugins();
