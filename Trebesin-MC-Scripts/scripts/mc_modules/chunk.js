import { world } from '@minecraft/server';
import { arrayToObject, insertToArray } from '../js_modules/array';

const TICK_DISTANCE = 4;
const WORLD_HEIGHT_RANGE = [-64,319];
const DIMENSIONS = ['minecraft:overworld','minecraft:nether','minecraft:the_end'];

function getOriginChunkCoord(location) {
    const coordX = Math.floor(location.x/16) * 16;
    const coordY = Math.floor(location.y/16) * 16;
    const coordZ = Math.floor(location.z/16) * 16;
    return {x:coordX,y:coordY,z:coordZ};
}

function getAbsoluteChunkCoord(location) {
    const coordX = Math.floor(location.x/16);
    const coordY = Math.floor(location.y/16);
    const coordZ = Math.floor(location.z/16);
    return {x:coordX,y:coordY,z:coordZ};
}

function getRelativeChunkCoord(location) {
    const coordX = location.x % 16;
    const coordY = location.y >= 0 ? location.y % 16 : 15 - location.y % 16;
    const coordZ = location.z % 16;
    return {x:coordX,y:coordY,z:coordZ};  
}

function iterateLoadedChunks(centerChunk,callback,tickDistance) {
    const tickDistanceMax = tickDistance**2 + 1;
    for (let xVector = 0;xVector <= tickDistance;xVector++) {
        for (let zVector = 0;zVector**2 + xVector**2 <= tickDistanceMax;zVector++) {
            callback({x:xVector + centerChunk.x ,z:zVector + centerChunk.z});
            if (xVector !== 0) {
                callback({x:-xVector + centerChunk.x ,z:zVector + centerChunk.z});
                if (zVector !== 0) callback({x:-xVector + centerChunk.x, z:-zVector + centerChunk.z});
            }
            if (zVector !== 0) callback({x:xVector + centerChunk.x, z:-zVector + centerChunk.z});
        }
    }
}

function getSubchunksCoords(chunkCoord,realCoordinates = false) {
    const range = (WORLD_HEIGHT_RANGE[1] - WORLD_HEIGHT_RANGE[0])/16;
    const coords = [];
    for (let index = 0;index <= range;index++) {
        if (realCoordinates) {
            coords.push({x:chunkCoord.x*16,y:index*16 + WORLD_HEIGHT_RANGE[0],z:chunkCoord.z*16});
        } else {
            coords.push({x:chunkCoord.x,y:index,z:chunkCoord.z});
        }
    }
    return coords;
}
class ChunkManager {
    constructor(options = {}) {
        Object.assign(options,{tickDistance:TICK_DISTANCE,dimensions:DIMENSIONS});
        this.#tickDistance = options.tickDistance;
        const dimensions = options.dimensions;
        for (let index = 0;index < dimensions.length;index++) {
            const dimension = DIMENSIONS[index];
            this.#centerChunks[dimension] = [];
            this.#loadedChunks[dimension] = [];
            this.#forcedChunks[dimension] = [];
        }
    }

    updateLoadedChunks(players = null) {
        let updateChunks = false;
        //Get all Ids and have everything as an object
        const playerIds = new Set(Object.keys(this.#playerChunks));
        const currentPlayers = arrayToObject(players ?? world.getAllPlayers(),(player) => player.id);
        for (const playerId in currentPlayers) playerIds.add(playerId);

        for (const playerId of playerIds) {
            const player = currentPlayers[playerId];
            const savedPlayerData = this.#playerChunks[playerId];

            //Player is no longer in the world:
            if (player == null) {
                updateChunks = true;
                //Update chunk player left from:
                this.#playerChunks[playerId] = null;

                const oldCenterChunk = this.#centerChunks[savedPlayerData.dimensionId].find((chunk) =>
                    chunk.x === savedPlayerData.chunk.x &&
                    chunk.z === savedPlayerData.chunk.z
                );
                oldCenterChunk.players--;
                continue;
            }

            const playerData = {
                dimensionId: player.dimension.id,
                chunk: getAbsoluteChunkCoord(player.location)
            };

            if (
                playerData.dimensionId !== savedPlayerData?.dimension ||
                playerData.chunk.x !== savedPlayerData?.chunk.x ||
                playerData.chunk.z !== savedPlayerData?.chunk.z
            ) {
                updateChunks = true;
                //Update chunk player moved into:
                const newCenterChunk = this.#centerChunks[playerData.dimensionId].find((chunk) =>
                    chunk.x === playerData.chunk.x &&
                    chunk.z === playerData.chunk.z
                );
                //Create new chunk if it isn't saved yet:
                if (newCenterChunk == null) {
                    this.#centerChunks[playerData.dimensionId].push({x: playerData.chunk.x ,z: playerData.chunk.z ,players: 1});
                } else {
                    newCenterChunk.players++;
                }

                //Update chunk player moved from, if player was saved in any:
                if (savedPlayerData != null) {
                    const oldCenterChunk = this.#centerChunks[savedPlayerData.dimensionId].find((chunk) =>
                        chunk.x === savedPlayerData.chunk.x &&
                        chunk.z === savedPlayerData.chunk.z
                    );
                    oldCenterChunk.players--;
                }
            }
        }

        //Update loaded chunks if players have moved between chunks, left or joined:
        if (updateChunks) {
            for (const dimensionId in this.#centerChunks) {
                const centerChunks = this.#centerChunks[dimensionId];
                const forcedChunks = this.#centerChunks[dimensionId];
                const loadedChunks = [];
                //Getting forced chunks:
                for (let index = 0;index < forcedChunks.length;index++) {
                    const chunk = forcedChunks[index];
                    if (loadedChunks.find((value) => value.x === chunk.x && value.z === chunk.z) == null) loadedChunks.push({x:chunk.x,z:chunk.z});
                }
                //Getting player loaded chunks:
                for (let index = 0;index < centerChunks.length;index++) {
                    const centerChunk = centerChunks[index];
                    iterateLoadedChunks(centerChunk,(chunk) => {
                        if (loadedChunks.find((value) => value.x === chunk.x && value.z === chunk.z) == null) loadedChunks.push(chunk);
                    },this.#tickDistance);
                }
                this.#loadedChunks[dimensionId] = loadedChunks;
            }
        }
        return this.#loadedChunks;
    }

    addForcedChunk(dimensionId,chunk) {
        return insertToArray(this.#forcedChunks[dimensionId],chunk);
    }

    removeForcedChunk(dimensionId,index) {
        delete this.#forcedChunks[dimensionId][index];
    }

    get loadedChunks() {
        return this.#loadedChunks;
    }

    #tickDistance;
    #forcedChunks = {};
    #playerChunks = {};
    #centerChunks = {};
    #loadedChunks = {};
}


export {
    ChunkManager, 
    getSubchunksCoords, 
    getAbsoluteChunkCoord, 
    getOriginChunkCoord, 
    getRelativeChunkCoord, 
    iterateLoadedChunks
}