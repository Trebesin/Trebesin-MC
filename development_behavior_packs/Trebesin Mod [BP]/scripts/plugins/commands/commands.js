import * as admin from "./workers/admin"
import * as user from "./workers/user"
import * as items from "./workers/items"
import { world } from '@minecraft/server';

function main(){
    console.warn('Loading Commands...\n{');
    world.say('Loading Commands...\n{');
    admin.main();
    console.warn('   Admin commands set');
    world.say('   Admin commands set');
    user.main();
    console.warn('   User commands set');
    world.say('   User commands set');
    items.main()
    console.warn('   item links to commands set');
    world.say('   item links to commands set');
    console.warn('}');
    world.say('}');

}

export {main}