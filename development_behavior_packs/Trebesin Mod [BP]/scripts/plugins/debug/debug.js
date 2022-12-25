import { world, system } from '@minecraft/server';
import * as serverAdmin from '@minecraft/server-admin';
import { LoggingConnection } from '../../mc_modules/network/logging-api';


const apiLog = new LoggingConnection({
    server: {
        url: serverAdmin.variables.get('log-server-url'),
        username: serverAdmin.variables.get('log-server-username'),
        password: serverAdmin.variables.get('log-server-password')
    }
})

async function main() {
    const response = await apiLog.connect();
    logMessage(response.status);
}

/**
 * Sends a log message to the world chat, MC server content log and console API server.
 * @param {string} message 
 */
async function logMessage(message) {
    world.say(`${message}`);
    console.warn(`${message}`);
    await apiLog.sendLog(`${message}`);
}

export { logMessage , main }