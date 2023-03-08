import { sendLogMessage } from "../debug/debug";
import * as unitTesting from "./workers/unit_testing";

export async function main(){
    unitTesting.main()
    sendLogMessage('   unit testing loaded')
}