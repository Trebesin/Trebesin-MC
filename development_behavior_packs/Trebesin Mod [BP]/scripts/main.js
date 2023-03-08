//Plugins:
import { world } from '@minecraft/server';
import * as BlockHistoryPlugin from './plugins/block_history/block_history';
import * as BlockyToolsPlugin from './plugins/blocky_tools/blocky_tools';
import * as ServerPlugin from './plugins/server/server';
import * as CommandsPlugin from './plugins/commands/commands';
import * as Debug from './plugins/debug/debug';
import * as Backend from './plugins/backend/backend';

//#This is the main executable file of the script. It loads all imported plugins.
//#Order of the loading is important, Debug and Backend must be loaded first!
//#To ensure the order eveything is asynchrounus and awaited.

async function executePlugins() {
    world.sendMessage('Start!');
    Debug.logMessage('\n\nReloading Trebesin Mod Script...\n\n');
    //!Debug && Backend (1.):
    await loadPlugin(Debug);
    await loadPlugin(Backend);
    //!Rest of the plugins (2.):
    await loadPlugin(ServerPlugin);
    await loadPlugin(BlockHistoryPlugin);
    await loadPlugin(BlockyToolsPlugin);
    await loadPlugin(CommandsPlugin);
}

async function loadPlugin(pluginImport) {
    try {
        Debug.logMessage(`Loading ${pluginImport.name}...\n{`);
        await pluginImport.main();
        Debug.logMessage(`}\n${pluginImport.name} loaded successfully!`);
    } catch {
        Debug.logMessage(`}\nError has occured during the load, read below!\n${error}`);
    }
}

executePlugins();