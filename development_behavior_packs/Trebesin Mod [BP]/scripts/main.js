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
    Debug.logMessage('\n\nReloading Trebesin Mod Script...\n\n',{api:false});
    //!Debug && Backend (1.):
    world.sendMessage('Debug!');
    await loadPlugin(Debug);
    world.sendMessage('Backend!');
    await loadPlugin(Backend);
    //!Rest of the plugins (2.):
    world.sendMessage('Server Plugin!');
    await loadPlugin(ServerPlugin);
    world.sendMessage('Block History Plugin!');
    await loadPlugin(BlockHistoryPlugin);
    world.sendMessage('Blocky Tools Plugin!');
    await loadPlugin(BlockyToolsPlugin);
    world.sendMessage('Commands Plugin!');
    await loadPlugin(CommandsPlugin);
    return
    //!Loading Debug (1.):
    try {
        await Debug.main();
        Debug.sendLogMessage('Loaded debug!');
    } catch (error) {
        Debug.sendLogMessage(error);
    }
    //!Loaded Backend (2.):
    try {
        Debug.sendLogMessage('Loading Backend...\n{');
        await Backend.main();
        Debug.sendLogMessage('}\nLoaded Backend...');
    } catch (error) {
        Debug.sendLogMessage(error);
    }
    try {
        Debug.sendLogMessage('Loading Server...\n{');
        ServerPlugin.main();
        Debug.sendLogMessage('}\nLoaded Server...');
    } catch (error) {
        Debug.sendLogMessage(error);
    }
    try {
        Debug.sendLogMessage('Loading Block History...\n{');
        await BlockHistoryPlugin.main();
        Debug.sendLogMessage('}\nLoaded Block History...');
    } catch (error) {
        Debug.sendLogMessage(error);
    }
    try {
        Debug.sendLogMessage('Loading Blocky Tools...\n{');
        BlockyToolsPlugin.main();
        Debug.sendLogMessage('}\nLoaded Blocky Tools...');
    } catch (error) {
        Debug.sendLogMessage(error);
    }
    try {
        Debug.sendLogMessage('Loading Commands...\n{');
        CommandsPlugin.main();
        Debug.sendLogMessage('}\nLoaded Commands...');
    } catch (error) {
        Debug.sendLogMessage(error);
    }
}

async function loadPlugin(pluginImport) {
    try {
        world.sendMessage(`Loading ${pluginImport.name}...\n{`);
        Debug.logMessage(`Loading ${pluginImport.name}...\n{`,{api:false});
        await pluginImport.main();
        Debug.logMessage(`}\nLoaded successfully!`,{api:false});
        world.sendMessage(`}\nLoaded successfully!`);
    } catch {
        Debug.logMessage(`}\nError has occured during the load, read below!\n${error}`,{api:false});
        world.sendMessage(`}\nError has occured during the load, read below!\n${error}`);
    }
}

executePlugins();