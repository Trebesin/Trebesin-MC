import {world} from '@minecraft/server';
import * as ItemWorker from './workers/items';
import * as CommandWorker from './workers/commands';

async function main() {
    console.warn('Loading Blocky Tools...\n{');
    world.say('Loading Blocky Tools...\n{');
    ItemWorker.main();
    console.warn('   Item Worker Loaded');
    world.say('   Item Worker Loaded');
    CommandWorker.main();
    console.warn('   Command Worker Loaded');
    world.say('   Command Worker Loaded');
    console.warn('}');
    world.say('}');
}

export {main};