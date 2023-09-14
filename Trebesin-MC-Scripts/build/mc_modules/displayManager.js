var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ScreenDisplayManager_scenes, _ScreenDisplayManager_playerScenes;
import { Player } from '@minecraft/server';
/**
 * @typedef ScreenDisplayManagerOptions
 * @property {string}
 */
/**
 * Class used for management of `ScreenDisplay` property of each individual player. It is used to define priorities of different dynamically added display scenes to make sure that the most relevent message is shown on the player's screen.
 */
class ScreenDisplayManager {
    constructor() {
        _ScreenDisplayManager_scenes.set(this, {});
        _ScreenDisplayManager_playerScenes.set(this, {});
    }
    /**
     * Defines a scene with its specific priority.
     * @param {string} id
     * @param {number} priority
     */
    defineScene(id, priority) {
        __classPrivateFieldGet(this, _ScreenDisplayManager_scenes, "f")[id] = priority;
    }
    setTitle(player, text, options) {
    }
    /**
     *
     * @param {Player} player
     * @param {string} text
     * @param {*} options
     */
    setActionBar(player, text, options) {
        __classPrivateFieldGet(this, _ScreenDisplayManager_playerScenes, "f")[player.id] ??= { actionBar: {}, title: {} };
        const playerActionBar = __classPrivateFieldGet(this, _ScreenDisplayManager_playerScenes, "f")[player.id].actionBar;
        const playerScreenDisplay = player.onScreenDisplay;
        if (playerActionBar) { }
    }
    clearActionBar(player) {
    }
    clearTitle(player) {
    }
}
_ScreenDisplayManager_scenes = new WeakMap(), _ScreenDisplayManager_playerScenes = new WeakMap();

//# sourceMappingURL=displayManager.js.map
