//Plugins:
console.warn('1st log');
import { world } from '@minecraft/server';
console.warn('BH');
import * as BlockHistoryPlugin from './plugins/block_history/block_history';
console.warn('BT');
import * as BlockyToolsPlugin from './plugins/blocky_tools/blocky_tools';
console.warn('Server');
import * as ServerPlugin from './plugins/server/server';
console.warn('Commnads');
import * as CommandsPlugin from './plugins/commands/commands';
console.warn('Debug');
import * as Debug from './plugins/debug/debug';
console.warn('Backend');
import * as Backend from './plugins/backend/backend';
console.warn('UT');
import * as unitTesting from './plugins/unit_testing/unit_testing';
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
    await loadPlugin(unitTesting);
}
async function loadPlugin(pluginImport) {
    try {
        Debug.logMessage(`Loading ${pluginImport.name}...\n{`);
        await pluginImport.main();
        Debug.logMessage(`}\n${pluginImport.name} loaded successfully!`);
    }
    catch {
        Debug.logMessage(`}\nError has occured during the load, read below!\n${error}`);
    }
}
executePlugins();

//# sourceMappingURL=main.js.map
