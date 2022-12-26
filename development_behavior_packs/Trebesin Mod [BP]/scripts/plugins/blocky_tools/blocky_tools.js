import {world} from '@minecraft/server';
import * as ItemWorker from './workers/items';
import * as CommandWorker from './workers/commands';
import * as Debug from './../debug/debug'

async function main() {
    ItemWorker.main();
    Debug.logMessage('   Item Worker Loaded');
    CommandWorker.main();
    Debug.logMessage('   Command Worker Loaded');
}

export {main};