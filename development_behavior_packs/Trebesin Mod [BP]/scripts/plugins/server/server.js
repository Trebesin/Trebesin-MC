//Base imports
import {world,system,MinecraftEffectTypes,MolangVariableMap,Color,Location} from '@minecraft/server';
import * as Debug from './../debug/debug';
//MC module imports
import * as Particles from './../../mc_modules/particles';
//JS module imports
import { randInt } from '../../js_modules/random';
import { setVectorLength, sumVectors } from '../../js_modules/vector';
import { DB } from '../backend/backend';

const playerData = {
    instaKill: {}
};

async function main() {
    system.runSchedule(() => {
        for (const player of world.getPlayers()) {
            player.addEffect(MinecraftEffectTypes.saturation,9999,128,false);
            if(!player.hasTag("nvoff")) player.addEffect(MinecraftEffectTypes.nightVision,300,128,false);
        }
    },20);

    system.runSchedule(() => {
        for (const player of world.getPlayers()) {
            if (playerData.instaKill[player.id]) {
                const molang = new MolangVariableMap()
                .setColorRGBA('variable.colour',new Color(1,0,0,1));
                const vectorLocation = sumVectors(setVectorLength(player.viewDirection,2),player.headLocation);
                const location = new Location(
                    vectorLocation.x,
                    vectorLocation.y,
                    vectorLocation.z
                );
                player.dimension.spawnParticle(
                    'trebesin:selection_dot_fast',
                    location,
                    molang
                );
            };

            const equipedItem = player.getComponent('inventory').container.getSlot(player.selectedSlot).getItem();
            if (equipedItem.typeId === 'trebesin:cmd_phaser') {
                const molang = new MolangVariableMap()
                .setColorRGBA('variable.colour',new Color(0,1,1,1));
                Particles.spawnLine(
                    'trebesin:selection_dot_fast',
                    [
                        player.location,
                        sumVectors(setVectorLength(player.viewDirection,2),player.headLocation)
                    ],
                    player.dimension,
                    molang,
                    0.25
                );
            };
        }
    },4);

    world.events.entityHit.subscribe((eventData) => {
        const {entity,hitEntity} = eventData;
        if (hitEntity && entity.typeId === 'minecraft:player' && playerData.instaKill[entity.id]) {
            hitEntity.kill();
            playerData.instaKill[entity.id] = false;
        }
    })

    world.events.playerJoin.subscribe(async (eventData) => {
        const connection = DB;
        const request = {
            sql: 'INSERT INTO PlayerConnections (playerID,PlayerName,Tick) VALUES (?,?,?);',
            values: [eventData.playerId, eventData.playerName, system.currentTick]
        }
        try {
            await connection.query(request,true);
        } catch (error) {
            world.say(`${error}`);
        }
    });

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

export {main,playerData};