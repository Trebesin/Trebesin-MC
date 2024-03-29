//Plugins:
import * as ItemWorker from './workers/items';
import * as CommandWorker from './workers/commands';
import * as Debug from './../debug/debug'


export const name = 'Blocky Tools';
export async function main() {
    ItemWorker.main();
    Debug.sendLogMessage('   Item Worker Loaded');
    CommandWorker.main();
    Debug.sendLogMessage('   Command Worker Loaded');
}