import { world, system, BlockLocation } from "@minecraft/server";
import { ChunkManager, getSubchunksCoords } from './chunk.js';
import { randInt } from '../js_modules/random.js';
import { insertToArray, deleteFromArray } from "../js_modules/array.js";
import { compareItems } from './items.js';

/**
 * @description - Class with helper functions that relate to scheduling or backend functioning of the server.
 */
class Server {
    constructor(initialTick = 0) {
        this.#tick = initialTick;
        this.#chunkManager = new ChunkManager();

        const tickEvent = () => {
            //Property 'relativeTick'
            this.#tick++;
            //Property 'playersLoaded'
            if (this.#playersLoaded === false && [...world.getPlayers()].length) {
                this.#playersLoaded = true;
            }
            //Timeouts
            executeTimeout(this.#callbacks.onTimeout,this.#tick);

            //Random Ticking
            const loadedChunks = this.#chunkManager.updateLoadedChunks();
            executeRandomTick(this.#callbacks.onRandomTick,loadedChunks,this.#tickSpeed);

            //Player Equip
            executePlayerEquip(this.#callbacks.playerEquip,this.#playerData);
            
        }

        system.runSchedule(tickEvent,1);

        system.events.beforeWatchdogTerminate.subscribe(eventData => {
            eventData.cancel = this.#watchdogTerminate;
        });
    }

    #chunkManager;
    #playerData = {
        equip: {}
    };
    #callbacks = {
        onTimeout: [],
        onRandomTick: [],
        playerEquip: []
    };
    #tickSpeed = 3;
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

    setTimeout(callback, ticks) {
        return insertToArray(this.#callbacks.onTimeout,[callback, this.#tick + ticks]);
    }
    
    clearTimeout(index) {
        deleteFromArray(this.#callbacks.onTimeout,index)
    }

    randomTickSubscribe(callback) {
        return insertToArray(this.#callbacks.onRandomTick,callback);
    }

    randomTickUnsubscribe(index) {
        deleteFromArray(this.#callbacks.onRandomTick,index);
    }

    playerEquipSubscribe(callback) {
        return insertToArray(this.#callbacks.playerEquip,callback);
    }

    playerEquipUnsubscribe(index) {
        deleteFromArray(this.#callbacks.playerEquip,index);
    }

    /**
     * @param {string} eventName Name of the event function is waiting for.
     * @param {Function} callback Callback that gets passed event data, it must return an object that contains property `tries` that modifies the tries counter and a property `saveValue` which gets saved and counts the event as success if its value isn't nullish.
     * @param {number} tries A variable that changes everytime the event fires depending on the condition return value if it is a number. Getting tires to/below 0 results in rejection of the promise.
     * @param {number} timeout Number of ticks before rejecting the promise. Enter 0 for infinite timeout (not recommended).
     * @param {number} amount Number of events to wait for before resolving the promise, it must get there or else the promise times out. 0 will wait until the timeout and resolve everything that met the condition. Negative values will resolve the promise even if it doesn't get to the requested amount.
     */
     async waitForEvent(eventName,callback,tries = 10,timeout = 200,amount = 1) {
        return new Promise((resolve, reject) => {
            let savedEvents = [];
            let timeoutIndex;
            const event = world.events[eventName].subscribe((data) => {
                const result = callback(data);
                tries += result.tries;
                if (tries <= 0) {
                    if (Number.isFinite(timeoutIndex)) this.clearTimeout(timeoutIndex);
                    world.events[eventName].unsubscribe(event);
                    reject({timeout:false,tries:true});
                }
                
                if (result.saveValue != null) {
                    savedEvents.push(result.saveValue);
                    if ((amount > 0 && savedEvents.length === amount) || (amount < 0 && savedEvents.length + amount === 0)) {
                        if (Number.isFinite(timeoutIndex)) this.clearTimeout(timeoutIndex);
                        world.events[eventName].unsubscribe(event);
                        resolve(savedEvents);
                    }
                } else console.warn('[Script] Invalid condition return value!');
            });

            if (timeout > 0) {
                if (amount > 0) {
                    timeoutIndex = this.setTimeout(() => {
                        world.events[eventName].unsubscribe(event);
                        reject({timeout:true,tries:false});
                    },timeout)
                } else {
                    timeoutIndex = this.setTimeout(() => {
                        world.events[eventName].unsubscribe(event);
                        resolve(savedEvents);
                    },timeout)
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

class Events {
    
}

function executePlayerEquip(callbackArray,playerData) {
    const players = world.getAllPlayers();
    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
        const player = players[playerIndex];
        if (playerData.equip[player.id] == null) playerData.equip[player.id] = {};
        const itemBefore = playerData.equip[player.id].item;
        const slotBefore = playerData.equip[player.id].slot;
        const itemAfter = player.getComponent('inventory').container.getSlot(player.selectedSlot).getItem();
        const slotAfter = player.selectedSlot;
        if (!compareItems(itemAfter,itemBefore) || slotBefore != slotAfter) {
            for (let callbackIndex = 0;callbackIndex < callbackArray.length;callbackIndex++) {
                try {
                    callbackArray[callbackIndex]({
                        itemBefore,
                        itemAfter,
                        slotBefore,
                        slotAfter,
                        player
                    });
                } catch {}
            }
        }
        playerData.equip[player.id].item = itemAfter;
        playerData.equip[player.id].slot = slotAfter;
    }
}


function executeTimeout(callbackArray,tick) {
    for (let index = 0; index < callbackArray.length; index++) {
        const item = callbackArray[index];
        if (item && tick === item[1]) {
            item[0]();
            deleteFromArray(callbackArray,index);
        }
    }
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
                        const blockLocation = new BlockLocation(
                            randInt(subChunk.x,subChunk.x + 15),
                            randInt(subChunk.y,subChunk.y + 15),
                            randInt(subChunk.z,subChunk.z + 15)
                        );
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

export { Server }