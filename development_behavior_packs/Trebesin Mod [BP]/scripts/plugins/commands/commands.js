import * as ItemsWorker from "./workers/admin"
import * as ItemsWorker from "./workers/user"
import * as ItemsWorker from "./workers/items"
import * as Debug from "../debug/debug"

async function main(){
    ItemsWorker.main();
    Debug.logMessage('   Admin commands set');
    ItemsWorker.main();
    Debug.logMessage('   User commands set');
    ItemsWorker.main()
    Debug.logMessage('   item links to commands set');
}

export {main}