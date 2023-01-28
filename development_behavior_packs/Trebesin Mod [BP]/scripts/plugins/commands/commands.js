import * as AdminWorker from "./workers/admin"
import * as UserWorker from "./workers/user"
import * as ItemsWorker from "./workers/items"
import * as Debug from "../debug/debug"
import * as DebugCommands from "./workers/debug"
const debugAllowed = true

async function main(){
    AdminWorker.main();
    Debug.logMessage('   Admin commands set');
    UserWorker.main();
    Debug.logMessage('   User commands set');
    ItemsWorker.main()
    Debug.logMessage('   item links to commands set');
    DebugCommands.main();
    Debug.logMessage('   debug commands set');
}

export {main, debugAllowed}