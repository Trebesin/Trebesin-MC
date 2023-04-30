//APIs:
import { world } from '@minecraft/server';
export async function main() {
    world.afterEvents.playerJoin.subscribe(() => {
    });
}

//# sourceMappingURL=action_log.js.map
