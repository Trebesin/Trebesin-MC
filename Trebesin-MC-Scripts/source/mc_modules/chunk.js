/*
    "chunk.js" - Helper functions to work with MC chunks.
    Copyright (C) 2023  PavelDobCZ23

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
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
var _ChunkManager_tickDistance, _ChunkManager_forcedChunks, _ChunkManager_playerChunks, _ChunkManager_centerChunks, _ChunkManager_loadedChunks;
import { world } from '@minecraft/server';
import { arrayToObject, insertToArray } from '../js_modules/array';
const TICK_DISTANCE = 4;
const WORLD_HEIGHT_RANGE = [-64, 319];
const DIMENSIONS = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
function getOriginChunkCoord(location) {
    const coordX = Math.floor(location.x / 16) * 16;
    const coordY = Math.floor(location.y / 16) * 16;
    const coordZ = Math.floor(location.z / 16) * 16;
    return { x: coordX, y: coordY, z: coordZ };
}
function getAbsoluteChunkCoord(location) {
    const coordX = Math.floor(location.x / 16);
    const coordY = Math.floor(location.y / 16);
    const coordZ = Math.floor(location.z / 16);
    return { x: coordX, y: coordY, z: coordZ };
}
function getRelativeChunkCoord(location) {
    const coordX = location.x % 16;
    const coordY = location.y >= 0 ? location.y % 16 : 15 - location.y % 16;
    const coordZ = location.z % 16;
    return { x: coordX, y: coordY, z: coordZ };
}
function iterateLoadedChunks(centerChunk, callback, tickDistance) {
    const tickDistanceMax = tickDistance ** 2 + 1;
    for (let xVector = 0; xVector <= tickDistance; xVector++) {
        for (let zVector = 0; zVector ** 2 + xVector ** 2 <= tickDistanceMax; zVector++) {
            callback({ x: xVector + centerChunk.x, z: zVector + centerChunk.z });
            if (xVector !== 0) {
                callback({ x: -xVector + centerChunk.x, z: zVector + centerChunk.z });
                if (zVector !== 0)
                    callback({ x: -xVector + centerChunk.x, z: -zVector + centerChunk.z });
            }
            if (zVector !== 0)
                callback({ x: xVector + centerChunk.x, z: -zVector + centerChunk.z });
        }
    }
}
function getSubchunksCoords(chunkCoord, realCoordinates = false) {
    const range = (WORLD_HEIGHT_RANGE[1] - WORLD_HEIGHT_RANGE[0]) / 16;
    const coords = [];
    for (let index = 0; index <= range; index++) {
        if (realCoordinates) {
            coords.push({ x: chunkCoord.x * 16, y: index * 16 + WORLD_HEIGHT_RANGE[0], z: chunkCoord.z * 16 });
        }
        else {
            coords.push({ x: chunkCoord.x, y: index, z: chunkCoord.z });
        }
    }
    return coords;
}
class ChunkManager {
    constructor(options = {}) {
        _ChunkManager_tickDistance.set(this, void 0);
        _ChunkManager_forcedChunks.set(this, {});
        _ChunkManager_playerChunks.set(this, {});
        _ChunkManager_centerChunks.set(this, {});
        _ChunkManager_loadedChunks.set(this, {});
        Object.assign(options, { tickDistance: TICK_DISTANCE, dimensions: DIMENSIONS });
        __classPrivateFieldSet(this, _ChunkManager_tickDistance, options.tickDistance, "f");
        const dimensions = options.dimensions;
        for (let index = 0; index < dimensions.length; index++) {
            const dimension = DIMENSIONS[index];
            __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")[dimension] = [];
            __classPrivateFieldGet(this, _ChunkManager_loadedChunks, "f")[dimension] = [];
            __classPrivateFieldGet(this, _ChunkManager_forcedChunks, "f")[dimension] = [];
        }
    }
    updateLoadedChunks(players = null) {
        let updateChunks = false;
        //Get all Ids and have everything as an object
        const playerIds = new Set(Object.keys(__classPrivateFieldGet(this, _ChunkManager_playerChunks, "f")));
        const currentPlayers = arrayToObject(players ?? world.getAllPlayers(), (player) => player.id);
        for (const playerId in currentPlayers)
            playerIds.add(playerId);
        for (const playerId of playerIds) {
            const player = currentPlayers[playerId];
            const savedPlayerData = __classPrivateFieldGet(this, _ChunkManager_playerChunks, "f")[playerId];
            //Player is no longer in the world:
            if (player == null) {
                updateChunks = true;
                //Update chunk player left from:
                __classPrivateFieldGet(this, _ChunkManager_playerChunks, "f")[playerId] = null;
                const oldCenterChunk = __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")[savedPlayerData.dimensionId].find((chunk) => chunk.x === savedPlayerData.chunk.x &&
                    chunk.z === savedPlayerData.chunk.z);
                oldCenterChunk.players--;
                continue;
            }
            const playerData = {
                dimensionId: player.dimension.id,
                chunk: getAbsoluteChunkCoord(player.location)
            };
            if (playerData.dimensionId !== savedPlayerData?.dimension ||
                playerData.chunk.x !== savedPlayerData?.chunk.x ||
                playerData.chunk.z !== savedPlayerData?.chunk.z) {
                updateChunks = true;
                //Update chunk player moved into:
                const newCenterChunk = __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")[playerData.dimensionId].find((chunk) => chunk.x === playerData.chunk.x &&
                    chunk.z === playerData.chunk.z);
                //Create new chunk if it isn't saved yet:
                if (newCenterChunk == null) {
                    __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")[playerData.dimensionId].push({ x: playerData.chunk.x, z: playerData.chunk.z, players: 1 });
                }
                else {
                    newCenterChunk.players++;
                }
                //Update chunk player moved from, if player was saved in any:
                if (savedPlayerData != null) {
                    const oldCenterChunk = __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")[savedPlayerData.dimensionId].find((chunk) => chunk.x === savedPlayerData.chunk.x &&
                        chunk.z === savedPlayerData.chunk.z);
                    oldCenterChunk.players--;
                }
            }
        }
        //Update loaded chunks if players have moved between chunks, left or joined:
        if (updateChunks) {
            for (const dimensionId in __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")) {
                const centerChunks = __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")[dimensionId];
                const forcedChunks = __classPrivateFieldGet(this, _ChunkManager_centerChunks, "f")[dimensionId];
                const loadedChunks = [];
                //Getting forced chunks:
                for (let index = 0; index < forcedChunks.length; index++) {
                    const chunk = forcedChunks[index];
                    if (loadedChunks.find((value) => value.x === chunk.x && value.z === chunk.z) == null)
                        loadedChunks.push({ x: chunk.x, z: chunk.z });
                }
                //Getting player loaded chunks:
                for (let index = 0; index < centerChunks.length; index++) {
                    const centerChunk = centerChunks[index];
                    iterateLoadedChunks(centerChunk, (chunk) => {
                        if (loadedChunks.find((value) => value.x === chunk.x && value.z === chunk.z) == null)
                            loadedChunks.push(chunk);
                    }, __classPrivateFieldGet(this, _ChunkManager_tickDistance, "f"));
                }
                __classPrivateFieldGet(this, _ChunkManager_loadedChunks, "f")[dimensionId] = loadedChunks;
            }
        }
        return __classPrivateFieldGet(this, _ChunkManager_loadedChunks, "f");
    }
    addForcedChunk(dimensionId, chunk) {
        return insertToArray(__classPrivateFieldGet(this, _ChunkManager_forcedChunks, "f")[dimensionId], chunk);
    }
    removeForcedChunk(dimensionId, index) {
        delete __classPrivateFieldGet(this, _ChunkManager_forcedChunks, "f")[dimensionId][index];
    }
    get loadedChunks() {
        return __classPrivateFieldGet(this, _ChunkManager_loadedChunks, "f");
    }
}
_ChunkManager_tickDistance = new WeakMap(), _ChunkManager_forcedChunks = new WeakMap(), _ChunkManager_playerChunks = new WeakMap(), _ChunkManager_centerChunks = new WeakMap(), _ChunkManager_loadedChunks = new WeakMap();
export { ChunkManager, getSubchunksCoords, getAbsoluteChunkCoord, getOriginChunkCoord, getRelativeChunkCoord, iterateLoadedChunks };

//# sourceMappingURL=chunk.js.map
