//APIs:
import {world,system,MinecraftEffectTypes,MolangVariableMap} from '@minecraft/server';
import * as Debug from './../debug/debug';
//MC modules
import * as Particles from './../../mc_modules/particles';
import { sendMessage } from '../../mc_modules/players';
import { FACE_DIRECTIONS } from '../../mc_modules/constants';
//JS modules
import { randInt } from '../../js_modules/random';
import { setVectorLength, sumVectors } from '../../js_modules/vector';
import { DB } from '../backend/backend';
import { isAdmin } from '../commands/workers/admin';

export const playerData = {
    instaKill: {}
};

export const name = 'Server';
export async function main() {
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            player.addEffect(MinecraftEffectTypes.saturation,9999,128,false);
            if(!player.hasTag("nvoff")) player.addEffect(MinecraftEffectTypes.nightVision,300,128,false);
        }
    },20);

    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            if (playerData.instaKill[player.id]) {
                const molang = new MolangVariableMap()
                .setColorRGBA('variable.color',{red:1,green:0,blue:0,alpha:1});
                const location = sumVectors(setVectorLength(player.getViewDirection(),2),player.getHeadLocation());
                player.dimension.spawnParticle(
                    'trebesin:selection_dot_fast',
                    location,
                    molang
                );
            };

            const equipedItem = player.getComponent('inventory').container.getSlot(player.selectedSlot).getItem();
            if (equipedItem.typeId === 'trebesin:cmd_phaser') {
                const molang = new MolangVariableMap()
                .setColorRGBA('variable.color',{red:0,green:1,blue:1,alpha:1});
                Particles.spawnLine(
                    'trebesin:selection_dot_fast',
                    [
                        player.location,
                        sumVectors(setVectorLength(player.getViewDirection(),2),player.getHeadLocation())
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
            Debug.logMessage(`${error}`);
        }
    });

    //## Block Ban
    world.events.beforeItemUseOn.subscribe((eventData) => {
        if (eventData.source.hasTag('certified_builder')) return;
        const itemId = eventData.item.typeId;
        if (
            itemId === 'minecraft:lava_bucket' ||
            itemId === 'minecraft:lava' ||
            itemId === 'minecraft:flowing_lava' || 
            itemId === 'minecraft:dragon_egg'
        ) {
            sendMessage(`§cYou are not permitted to use the item ${itemId}!§r`,'SERVER',eventData.source);
            if(isAdmin(eventData.source))sendMessage(`§a You hovewer do have the permissions to place lava buckets. Use !allowbuild @s to grant them§r\n`,'SERVER',eventData.source);
            eventData.cancel = true;
        }
    });
}