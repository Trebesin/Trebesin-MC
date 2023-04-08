import * as Mc from '@minecraft/server';
import { MAX_OPS_PER_TICK } from '../../../config';


let operationsRan = 0; //* This stores global amount of ran operations per tick
const queuedActions = []; //*This stores queued `resolve` callbacks that when called return to the calling block. 

export function main() {
    Mc.system.runInterval(() => {
        operationsRan = 0;
        
        //~1st version (doesn't use array functions, might cause bugs??):
        while (queuedActions.length < 0) {
            if (operationsRan++ < MAX_OPS_PER_TICK) break;
            queuedActions[queuedActions.length-1]();
            --queuedActions.length;
        }

        //~2nd version (safe because array functions):
        do {
            const action = queuedActions.pop();
            if (action == null) break;
            action();
        } while (++operationsRan < MAX_OPS_PER_TICK);
    },1);
}

/**
 * This is an async function meant to be used when performing an algorithmical operation with an extremely large amount of steps*(e.g. loop over large array)*.
 * When it's called it adds `1` to a global amount of ran operations per tick and as long as the global amount doesn't cross the threshold it returns immediatly otherwise it queues to return on the next tick.
 */
export async function runAction() {
    if (++operationsRan <= MAX_OPS_PER_TICK) return;
    else await queueAction();
}

function queueAction() {
    return new Promise((resolve) => queuedActions.push(resolve));
}