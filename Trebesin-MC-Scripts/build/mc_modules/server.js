var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Server_eventsRegister, _Server_tick, _Server_playersLoaded, _Server_watchdogTerminate;
import * as Mc from "@minecraft/server";
import { ChunkManager, getSubchunksCoords } from './chunk.js';
import { randInt } from '../js_modules/random.js';
import { insertToArray, deleteFromArray } from "../js_modules/array.js";
import * as Debug from './../plugins/debug/debug';
/**
 * @description - Class with helper functions that relate to scheduling or backend functioning of the server.
 */
export class Server {
    constructor(initialTick = 0) {
        _Server_eventsRegister.set(this, {});
        this.events = {};
        _Server_tick.set(this, 0);
        _Server_playersLoaded.set(this, false);
        _Server_watchdogTerminate.set(this, false);
        __classPrivateFieldSet(this, _Server_tick, initialTick, "f");
        //## Relative Tick, Loaded Players, Custom Events
        Mc.system.runInterval(() => {
            var _a;
            __classPrivateFieldSet(this, _Server_tick, (_a = __classPrivateFieldGet(this, _Server_tick, "f"), _a++, _a), "f");
            for (const eventId in __classPrivateFieldGet(this, _Server_eventsRegister, "f"))
                __classPrivateFieldGet(this, _Server_eventsRegister, "f")[eventId].execute?.(this);
            if (!__classPrivateFieldGet(this, _Server_playersLoaded, "f") && Mc.world.getAllPlayers().length)
                __classPrivateFieldSet(this, _Server_playersLoaded, true, "f");
        }, 1);
        //## Cancel Termination:
        Mc.system.beforeEvents.watchdogTerminate.subscribe((eventData) => {
            eventData.cancel = __classPrivateFieldGet(this, _Server_watchdogTerminate, "f");
        });
    }
    /**
     * @param {boolean} value - Set to `true` to cancel watchdog server termination.
     */
    set cancelTerminations(value) {
        __classPrivateFieldSet(this, _Server_watchdogTerminate, value, "f");
        return __classPrivateFieldGet(this, _Server_watchdogTerminate, "f");
    }
    get tick() {
        return __classPrivateFieldGet(this, _Server_tick, "f");
    }
    get playersLoaded() {
        return __classPrivateFieldGet(this, _Server_playersLoaded, "f");
    }
    registerEvent(eventId, eventObject) {
        __classPrivateFieldGet(this, _Server_eventsRegister, "f")[eventId] = eventObject;
        eventObject.initialize?.(this);
        for (const eventCallback in eventObject.callbacks) {
            this.events[eventCallback] = eventObject.callbacks[eventCallback];
        }
    }
    //! The following functions are DEPRECATED and left only for compatibility. Use other exports instead.
    /** !!DEPRECATED!! use other exports instead
     * @param {object} eventObject Object containing `subscribe()` and `unsubscribe()` methods.
     * @param {Function} callback Callback that gets passed event data, it must return an object that contains property `tries` that modifies the tries counter and a property `saveValue` which gets saved and counts the event as success if its value isn't nullish.
     * @param {EventWaitOptions} options Options that define how to wait for the event.
     */
    async waitForEvent(eventObject, callback, options = {}) {
        const OPTIONS = Object.assign({ tries: 10, timeout: 200, amount: 1 }, options);
        return new Promise((resolve, reject) => {
            let savedEvents = [];
            let timeoutIndex;
            const event = eventObject.subscribe((data) => {
                const result = callback(data);
                OPTIONS.tries += result?.tries ?? 0;
                if (OPTIONS.tries <= 0) {
                    if (timeoutIndex != null)
                        Mc.system.clearRun(timeoutIndex);
                    eventObject.unsubscribe(event);
                    reject({ timeout: false, tries: true });
                }
                if (result?.saveValue != null) {
                    savedEvents.push(result.saveValue);
                    if ((OPTIONS.amount > 0 && savedEvents.length === OPTIONS.amount) ||
                        (OPTIONS.amount < 0 && savedEvents.length + OPTIONS.amount === 0)) {
                        if (timeoutIndex != null)
                            Mc.system.clearRun(timeoutIndex);
                        eventObject.unsubscribe(event);
                        resolve(savedEvents);
                    }
                }
            });
            if (OPTIONS.timeout > 0) {
                if (OPTIONS.amount > 0) {
                    timeoutIndex = Mc.system.runTimeout(() => {
                        eventObject.unsubscribe(event);
                        reject({ timeout: true, tries: false });
                    }, OPTIONS.timeout);
                }
                else {
                    timeoutIndex = Mc.system.runTimeout(() => {
                        eventObject.unsubscribe(event);
                        resolve(savedEvents);
                    }, OPTIONS.timeout);
                }
            }
        });
    }
    /**
     * !!DEPRECATED!! use other exports instead
     * @param {Function} callback Callback that runs on the next tick,its return value is resolved or its error is rejected.
     * @returns {Promise}
     */
    async waitForNextTick(callback) {
        return new Promise((resolve, reject) => {
            Mc.system.runTimeout(() => {
                try {
                    resolve(callback());
                }
                catch (error) {
                    reject(error);
                }
            }, 1);
        });
    }
}
_Server_eventsRegister = new WeakMap(), _Server_tick = new WeakMap(), _Server_playersLoaded = new WeakMap(), _Server_watchdogTerminate = new WeakMap();
/**
 * Returns promise that executes the callback function and gets resolved/rejected on the defined following tick.
 * @param {Function} callback Callback that runs on the defined tick, its return value is resolved or its error is rejected.
 * @param {number} ticks Amount of ticks to wait for. Defaults to the next tick (1).
 * @returns {Promise}
 */
export async function waitForTick(callback, ticks = 1) {
    return new Promise((resolve, reject) => {
        Mc.system.runTimeout(() => {
            try {
                resolve(callback());
            }
            catch (error) {
                reject(error);
            }
        }, ticks);
    });
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
export async function waitForEvent(eventObject, callback, options = {}) {
    const OPTIONS = Object.assign({ tries: 10, timeout: 200, amount: 1 }, options);
    return new Promise((resolve, reject) => {
        let savedEvents = [];
        let timeoutIndex;
        const event = eventObject.subscribe((data) => {
            const result = callback(data);
            OPTIONS.tries += result?.tries ?? 0;
            if (OPTIONS.tries <= 0) {
                if (timeoutIndex != null)
                    Mc.system.clearRun(timeoutIndex);
                eventObject.unsubscribe(event);
                reject({ timeout: false, tries: true });
            }
            if (result?.saveValue != null) {
                savedEvents.push(result.saveValue);
                if ((OPTIONS.amount > 0 && savedEvents.length === OPTIONS.amount) ||
                    (OPTIONS.amount < 0 && savedEvents.length + OPTIONS.amount === 0)) {
                    if (timeoutIndex != null)
                        Mc.system.clearRun(timeoutIndex);
                    eventObject.unsubscribe(event);
                    resolve(savedEvents);
                }
            }
        });
        if (OPTIONS.timeout > 0) {
            if (OPTIONS.amount > 0) {
                timeoutIndex = Mc.system.runTimeout(() => {
                    eventObject.unsubscribe(event);
                    reject({ timeout: true, tries: false });
                }, OPTIONS.timeout);
            }
            else {
                timeoutIndex = Mc.system.runTimeout(() => {
                    eventObject.unsubscribe(event);
                    resolve(savedEvents);
                }, OPTIONS.timeout);
            }
        }
    });
}
export class ServerEventCallback {
    constructor() {
        this.saved = [];
    }
    subscribe(callback) {
        return insertToArray(this.saved, callback);
    }
    unsubscribe(index) {
        deleteFromArray(this.saved, index);
    }
    runCallbacks(eventData, errorHandle = null) {
        for (let callbackIndex = 0; callbackIndex < this.saved.length; callbackIndex++) {
            try {
                this.saved[callbackIndex](eventData);
            }
            catch (error) {
                if (errorHandle)
                    errorHandle(error);
            }
        }
    }
}
//! TESTING
import * as VectorMath from '../js_modules/vectorMath.js';
/**
 * !! TESTING !!
 * @param {*} callback
 * @param {*} loadedChunks
 * @param {*} tickSpeed
 */
function executeRandomTick(callback, loadedChunks, tickSpeed) {
    for (const dimensionId in loadedChunks) {
        const dimension = Mc.world.getDimension(dimensionId);
        const chunks = loadedChunks[dimensionId];
        const randomDistributions = [
            [], [], [], []
        ];
        for (let index = 0; index <= tickSpeed; index++) {
            for (let distIndex = 0; distIndex < randomDistributions.length; distIndex++) {
                randomDistributions[distIndex].push(randomVector(0, 15));
            }
        }
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const subChunks = getSubchunksCoords(chunks[chunkIndex], true);
            for (let subChunkIndex = 0; subChunkIndex < subChunks.length; subChunkIndex++) {
                const subChunk = subChunks[subChunkIndex];
                const distribution = randomDistributions[randInt(0, randomDistributions.length - 1)];
                for (let vectorIndex = 0; vectorIndex < distribution.length; vectorIndex++) {
                    callback(dimension.getBlock(VectorMath.sum(distribution[vectorIndex], subChunk)));
                }
                //!the performance problem lies here:
                //!40-45% CPU Usage Getting The Block, 40-45% CPU Usage Generating the Number :/
                //const subChunkEnd = VectorMath.sum(subChunk,{x:15,y:15,z:15});
                //for (let index = 0;index <= tickSpeed;index++) {
                //    callback(dimension.getBlock({
                //        x: randInt(subChunk.x,subChunkEnd.x),
                //        y: randInt(subChunk.y,subChunkEnd.y),
                //        z: randInt(subChunk.z,subChunkEnd.z)
                //    }));
                //}
            }
        }
    }
}
function randomVector(min, max) {
    return { x: randInt(min, max), y: randInt(min, max), z: randInt(min, max) };
}

//# sourceMappingURL=server.js.map