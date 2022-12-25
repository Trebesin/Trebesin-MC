import { world, system } from '@minecraft/server';
import * as serverAdmin from '@minecraft/server-admin';
import { LoggingConnection } from './network/logging-api';


const apiLog = new LoggingConnection({
    server: {
        url: serverAdmin.variables.get('log-server-url'),
        username: serverAdmin.variables.get('log-server-username'),
        password: serverAdmin.variables.get('log-server-password')
    }
})

async function main() {
    await apiLog.connect();
}

main();

/**
 * Sends a log message to the world chat, MC server content log and console API server.
 * @param {string} message 
 */
function logMessage(message) {
    world.say(`${logMessage}`);
    console.warn(`${logMessage}`);
    apiLog.sendLog(`${logMessage}`);
}

export { logMessage }