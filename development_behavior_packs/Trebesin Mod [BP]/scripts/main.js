import * as BlockHistoryPlugin from './plugins/block_history/block_history';
import * as BlockyToolsPlugin from './plugins/blocky_tools/blocky_tools';
import * as ServerPlugin from './plugins/server/server';
import * as CommandsPlugin from './plugins/commands/commands';
import * as Debug from './plugins/debug/debug';
import * as Backend from './plugins/backend/backend';
import { world } from '@minecraft/server';

Debug.logMessage('\n\nReloading Trebesin Mod...\n\n',{api:false});
async function executePlugins() {
    //!Loading Debug (1.):
    try {
        await Debug.main();
        Debug.logMessage('Loaded debug!');
    } catch (error) {
        Debug.logMessage(error);
    }
    //!Loaded Backend (2.):
    try {
        Debug.logMessage('Loading Backend...\n{');
        Backend.main();
        Debug.logMessage('}\nLoaded Backend...');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        Debug.logMessage('Loading Server...\n{');
        ServerPlugin.main();
        Debug.logMessage('}\nLoaded Server...');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        Debug.logMessage('Loading Block History...\n{');
        await BlockHistoryPlugin.main();
        Debug.logMessage('}\nLoaded Block History...');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        BlockyToolsPlugin.main();
        Debug.logMessage('Loaded Blocky Tools');
    } catch (error) {
        Debug.logMessage(error);
    }
    try {
        Debug.logMessage('Loading Commands...\n{');
        CommandsPlugin.main();
        Debug.logMessage('}\nLoaded Commands...');
    } catch (error) {
        Debug.logMessage(error);
    }
}

executePlugins();
