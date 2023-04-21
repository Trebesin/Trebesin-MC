//APIs:
import {world} from '@minecraft/server';


export async function main() {
    world.events.playerJoin.subscribe(() => {
        if (true) {
            return;
        }
    });
}