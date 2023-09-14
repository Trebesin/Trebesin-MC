//Plugin Imports:
import * as Debug from '../debug/debug';
import * as AdminWorker from './workers/admin';
import * as UserWorker from './workers/user';
import * as ItemsWorker from './workers/items';
import * as DebugCommands from './workers/debug';
export const name = 'Commands';
export async function main() {
    AdminWorker.main();
    Debug.sendLogMessage('   Admin commands set');
    UserWorker.main();
    Debug.sendLogMessage('   User commands set');
    ItemsWorker.main();
    Debug.sendLogMessage('   Item links set');
    DebugCommands.main();
    Debug.sendLogMessage('   Debug commands set');
}

//# sourceMappingURL=commands.js.map
