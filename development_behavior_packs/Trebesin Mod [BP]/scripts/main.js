//Plugins:
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
    Debug.sendLogMessage('\n\nReloading Trebesin Mod Script...\n\n',{api:false});
    //!Debug && Backend (1.):
    await loadPlugin(Debug);
    await loadPlugin(Backend);
    //!Rest of the plugins (2.):
    await loadPlugin(ServerPlugin);
    await loadPlugin(BlockHistoryPlugin);
    await loadPlugin(BlockyToolsPlugin);
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
        Debug.sendLogMessage(`Loading ${pluginImport.name}...\n{`);
        await pluginImport.main();
        Debug.sendLogMessage(`}\nLoaded successfully!`);
    } catch {
        Debug.sendLogMessage(`}\nError has occured during the load, read below!\n${error}`);
    }
}

executePlugins();