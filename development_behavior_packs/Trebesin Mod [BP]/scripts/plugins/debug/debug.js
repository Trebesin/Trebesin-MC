//APIs:
import { world } from '@minecraft/server';
import * as serverAdmin from '@minecraft/server-admin';
//Modules:
import { sendMessage } from '../../mc_modules/players';
import { LoggingConnection } from '../../mc_modules/network/logging-api';


const apiLog = new LoggingConnection({
    server: {
        url: serverAdmin.variables.get('log-server-url'),
        username: serverAdmin.variables.get('log-server-username'),
        password: serverAdmin.variables.get('log-server-password')
    }
})

export const name = 'Debug';
export async function main() {
    await apiLog.connect();
}

export function sendLogMessage(message){
    for (const player of world.getPlayers({tags:['log']})) {
        sendMessage(`§o§7${message.replace('\n','\n§r[§o§7LOG§r]')}§r`, '§o§7LOG', player);
    }
}
/**
 * Sends a log message to the world chat, MC server content log and console API server.
 * @param {string} message Log message.
 */
export async function logMessage(message,options) {
    const OPTIONS = Object.assign({api:true,world:true,content:true},options);
    if (OPTIONS.world) sendLogMessage(`${message}`);
    if (OPTIONS.content) console.warn(`${message}`);
    if (OPTIONS.api) await apiLog.sendLog(`${message}`);
}