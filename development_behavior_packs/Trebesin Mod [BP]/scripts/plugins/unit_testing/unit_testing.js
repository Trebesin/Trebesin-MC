import { sendLogMessage } from "../debug/debug";
import * as unitTesting from "./workers/unit_testing";

const name = "unit testing"
export {name}
export async function main(){
    unitTesting.main()
    sendLogMessage('   unit testing loaded')
}