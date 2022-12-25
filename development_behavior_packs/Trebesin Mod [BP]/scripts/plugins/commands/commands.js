import * as admin from "./workers/admin"
import * as user from "./workers/user"
import * as items from "./workers/items"
import * as Debug from "../debug/debug"

async function main(){
    admin.main();
    Debug.logMessage('   Admin commands set');
    user.main();
    Debug.logMessage('   User commands set');
    items.main()
    Debug.logMessage('   item links to commands set');
}

export {main}