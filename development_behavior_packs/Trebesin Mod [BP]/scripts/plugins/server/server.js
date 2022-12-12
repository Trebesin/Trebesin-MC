import {world,system,MinecraftEffectTypes} from '@minecraft/server';

async function main() {
    system.runSchedule(() => {
        for (const player of world.getPlayers()) {
            player.addEffect(MinecraftEffectTypes.saturation,9999,128,false);
            player.addEffect(MinecraftEffectTypes.nightVision,9999,128,false);
        }
    },20);
}

export {main};