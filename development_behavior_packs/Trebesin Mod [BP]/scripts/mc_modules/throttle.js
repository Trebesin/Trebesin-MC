import * as Mc from '@minecraft/server';
import { logMessage } from '../plugins/debug/debug';

export class Throttling {
    constructor(maxOperations) {
        this.#maxOperations = maxOperations;
        this.#operationsRan = 0;
        this.#queuedActions = [];

        Mc.system.runInterval(() => {
            if (this.#operationsRan > 0) logMessage(`OPS ran: ${this.#operationsRan}`);
            this.#operationsRan = 0;
    
            //~2nd version (safe because array functions):
            do {
                const action = this.#queuedActions.pop();
                if (action == null) break;
                action();
            } while (++this.#operationsRan < this.#maxOperations);
        },1);
    }

    /**
    * This is an async function meant to be used when performing an algorithmical operation with an extremely large amount of steps *(e.g. loop over large array)*.
    * When it's called it adds `1` to a global amount of ran operations per tick and as long as the global amount doesn't cross the threshold it returns immediatly otherwise it queues to return on the next tick.
    */
    async runAction() {
        if (++this.#operationsRan <= this.#maxOperations) return;
        else await this.#queueAction();
    }

    #queueAction() {
        return new Promise((resolve) => this.#queuedActions.push(resolve));
    }

    #maxOperations;
    #operationsRan;
    #queuedActions;
}

//~1st version (doesn't use array functions, might cause bugs??):
/*
while (queuedActions.length < 0) {
    if (operationsRan++ < MAX_OPS_PER_TICK) break;
    queuedActions[queuedActions.length-1]();
    --queuedActions.length;
}
*/