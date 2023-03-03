import { world, system } from "@minecraft/server";
import { ChunkManager, getSubchunksCoords } from './chunk.js';
import { randInt } from '../js_modules/random.js';
import { insertToArray, deleteFromArray } from "../js_modules/array.js";
import { compareItems } from './items.js';
import * as Debug from './../plugins/debug/debug'

/**
 * @description - Class with helper functions that relate to scheduling or backend functioning of the server.
 */
export class Server {
    constructor(initialTick = 0) {
        this.#tick = initialTick;
        
        //## Relative Tick, Loaded Players, Custom Events
        system.runInterval(() => {
            this.#tick++;
            for (const eventId in this.#eventsRegister) this.#eventsRegister[eventId].execute?.(this);
            if (!this.#playersLoaded && world.getAllPlayers().length) this.#playersLoaded = true;
        },1);

        //## Cancel Termination:
        system.events.beforeWatchdogTerminate.subscribe((eventData) => {
            eventData.cancel = this.#watchdogTerminate;
        });
    }

    #eventsRegister = {}
    events = {}

    #tick = 0;
    #playersLoaded = false;
    #watchdogTerminate = false;

    /**
     * @param {boolean} value - Set to `true` to cancel watchdog server termination.
     */
    set cancelTerminations(value) {
        this.#watchdogTerminate = value;
        return this.#watchdogTerminate;
    }

    get tick() {
        return this.#tick;
    }

    get playersLoaded() {
        return this.#playersLoaded;
    }

    registerEvent(eventId,eventObject) {
        this.#eventsRegister[eventId] = eventObject;
        eventObject.initialize?.(this);
        for (const eventCallback in eventObject.callbacks) {
            this.events[eventCallback] = eventObject.callbacks[eventCallback];
        }
        
    }

    /**
     * @typedef EventWaitOptions Options that define how to wait for the event.
     * @property {number} tries A variable that changes everytime the event fires depending on the condition return value if it is a number. Getting tires to/below 0 results in rejection of the promise.
     * @property {number} timeout Number of ticks before rejecting the promise. Enter 0 for infinite timeout (not recommended).
     * @property {number} amount Number of events to wait for before resolving the promise, it must get there or else the promise times out. 0 will wait until the timeout and resolve everything that met the condition. Negative values will resolve the promise even if it doesn't get to the requested amount.
     */

    /**
     * @param {object} eventObject Object containing `subscribe()` and `unsubscribe()` methods.
     * @param {Function} callback Callback that gets passed event data, it must return an object that contains property `tries` that modifies the tries counter and a property `saveValue` which gets saved and counts the event as success if its value isn't nullish.
     * @param {EventWaitOptions} options Options that define how to wait for the event.
     */
    async waitForEvent(eventObject,callback,options = {}) {
        const OPTIONS = Object.assign({tries: 10,timeout: 200,amount: 1},options);
        return new Promise((resolve, reject) => {
            let savedEvents = [];
            let timeoutIndex;
            const event = eventObject.subscribe((data) => {
                const result = callback(data);
                OPTIONS.tries += result?.tries ?? 0;
                if (OPTIONS.tries <= 0) {
                    if (timeoutIndex != null) system.clearRun(timeoutIndex);
                    eventObject.unsubscribe(event);
                    reject({timeout:false,tries:true});
                }
                
                if (result?.saveValue != null) {
                    savedEvents.push(result.saveValue);
                    if (
                        (OPTIONS.amount > 0 && savedEvents.length === OPTIONS.amount) || 
                        (OPTIONS.amount < 0 && savedEvents.length + OPTIONS.amount === 0)
                    ) {
                        if (timeoutIndex != null) system.clearRun(timeoutIndex);
                        eventObject.unsubscribe(event);
                        resolve(savedEvents);
                    }
                }
            });

            if (OPTIONS.timeout > 0) {
                if (OPTIONS.amount > 0) {
                    timeoutIndex = system.runTimeout(() => {
                        eventObject.unsubscribe(event);
                        reject({timeout:true,tries:false});
                    },OPTIONS.timeout);
                } else {
                    timeoutIndex = system.runTimeout(() => {
                        eventObject.unsubscribe(event);
                        resolve(savedEvents);
                    },OPTIONS.timeout);
                }
            }
        });
    }

    /**
     * Retruns promise that executes the callback function and gets resolved/rejected on the next tick.
     * @param {Function} callback Callback that runs on the next tick,its return value is resolved or its error is rejected.
     * @returns {Promise}
     */
    async waitForNextTick(callback) {
        return new Promise((resolve,reject) => {
            system.run(() => {
                try {
                    resolve(callback());
                } catch (error) {
                    reject(error)
                }
            })
        })
    }
}

export class ServerEventCallback {
    constructor() {
        this.saved = [];
    }
    subscribe(callback) {
        return insertToArray(this.saved,callback);
    }
    unsubscribe(index) {
        deleteFromArray(this.saved,index);
    }
    runCallbacks(eventData,errorHandle = null) {
        for (let callbackIndex = 0;callbackIndex < this.saved.length;callbackIndex++) {
            try {
                this.saved[callbackIndex](eventData);
            } catch (error) {
                if (errorHandle) errorHandle(error);
            }
        }   
    }
    saved;
}

export class ServerEventCallback {
    constructor() {
        this.saved = [];
    }
    subscribe(callback) {
        return insertToArray(this.saved,callback);
    }
    unsubscribe(index) {
        deleteFromArray(this.saved,index);
    }
    runCallbacks(eventData,errorHandle = null) {
        for (let callbackIndex = 0;callbackIndex < this.saved.length;callbackIndex++) {
            try {
                this.saved[callbackIndex](eventData);
            } catch (error) {
                if (errorHandle) errorHandle(error);
            }
        }   
    }
    saved;
}

function executeRandomTick(callbackArray,loadedChunks,tickSpeed) {
    if (callbackArray.length) {
        //!this has terrible performance:
        for (const dimensionId in loadedChunks) {
            const dimension = world.getDimension(dimensionId);
            const chunks = loadedChunks[dimensionId];
            for (let chunkIndex = 0;chunkIndex < chunks.length;chunkIndex++) {
                const subChunks = getSubchunksCoords(chunks[chunkIndex],true);
                for (let subChunkIndex = 0;subChunkIndex < subChunks.length;subChunkIndex++) {
                    //!the performance problem lies here:
                    //!40-45% CPU Usage Getting The Block, 40-45% CPU Usage Generating the Number :/
                    for (let index = 0;index <= tickSpeed;index++) {
                        const subChunk = subChunks[subChunkIndex];
                        const blockLocation = {
                            x: randInt(subChunk.x,subChunk.x + 15),
                            y: randInt(subChunk.y,subChunk.y + 15),
                            z: randInt(subChunk.z,subChunk.z + 15)
                        };
                        const block = dimension.getBlock(blockLocation);
                        for (let callbackIndex = 0;callbackIndex < callbackArray.length;callbackIndex++) {
                            callbackArray[callbackIndex](block);
                        }
                    }
                }
            }
        }
    }
}