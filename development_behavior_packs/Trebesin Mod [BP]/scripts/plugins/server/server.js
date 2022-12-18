import {world,system,MinecraftEffectTypes,MolangVariableMap,Color} from '@minecraft/server';
import { Server } from '../../mc_modules/server';
import { spawnBlockSelection } from './../../mc_modules/particles';
import { randInt } from '../../js_modules/random';

async function main() {
    const server = new Server();
    system.runSchedule(() => {
        for (const player of world.getPlayers()) {
            player.addEffect(MinecraftEffectTypes.saturation,9999,128,false);
            player.addEffect(MinecraftEffectTypes.nightVision,9999,128,false);
        }
    },20);

    //try {
    //    const index = server.playerEquipSubscribe((eventData) => {
    //        world.say(`Before: ${eventData.itemBefore.typeId} - ${eventData.slotBefore}`);
    //        world.say(`After: ${eventData.itemAfter.typeId} - ${eventData.slotAfter}`);
    //    })
    //    world.say(`${index} subscribed`);
    //} catch (error) {
    //    world.say(`${error}`);
    //}
    //try {
    //    const index = server.randomTickSubscribe((block) => {
    //        if (block.typeId === 'minecraft:red_flower') world.say('Found a flower.');
    //    });
    //    world.say(`${index} subscribed`);
    //} catch (error) {
    //    world.say(`${error}`)
    //}
    
}

export {main};