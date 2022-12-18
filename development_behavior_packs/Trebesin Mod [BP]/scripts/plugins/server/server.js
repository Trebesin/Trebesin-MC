import {world,system,MinecraftEffectTypes,MolangVariableMap,Color} from '@minecraft/server';
import { Server } from '../../mc_modules/server';
import { spawnBlockSelection } from './../../mc_modules/particles'

async function main() {
    const server = new Server();
    system.runSchedule(() => {
        for (const player of world.getPlayers()) {
            player.addEffect(MinecraftEffectTypes.saturation,9999,128,false);
            player.addEffect(MinecraftEffectTypes.nightVision,9999,128,false);
        }
    },20);

    server.randomTick.subscribe((block) => {
        if (block == null) return;
        let molang = new MolangVariableMap();
        molang.setColorRGB('variable.colour',new Color(Math.random(),Math.random(),Math.random(),1));
        spawnBlockSelection('trebesin:selection_dot',[block.location,block.location],block.dimension,molang);
    });
    
}

export {main};