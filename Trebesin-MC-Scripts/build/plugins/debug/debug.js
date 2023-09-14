//APIs:
import { world } from '@minecraft/server';
//Modules:
import { sendMessage } from '../../mc_modules/players';
export const name = 'Debug';
export async function main() {
}
export function sendLogMessage(message) {
    for (const player of world.getPlayers({ tags: ['log'] })) {
        sendMessage(`§o§7${message.replace('\n', '\n§r[§o§7LOG§r]§o§7 ')}`, '§o§7LOG', player);
    }
}
/**
 * Sends a log message to the world chat, MC server content log and console API server.
 * @param {string} message Log message.
 */
export async function logMessage(message, options = {}) {
    const OPTIONS = Object.assign({ chat: true, log: true }, options);
    if (OPTIONS.chat)
        sendLogMessage(`${message}`);
    if (OPTIONS.log)
        console.warn(`${message}`);
}

//# sourceMappingURL=debug.js.map
