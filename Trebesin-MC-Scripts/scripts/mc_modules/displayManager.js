import { Player } from '@minecraft/server';

/**
 * @typedef ScreenDisplayManagerOptions
 * @property {string}
 */

/**
 * Class used for management of `ScreenDisplay` property of each individual player. It is used to define priorities of different dynamically added display scenes to make sure that the most relevent message is shown on the player's screen.
 */
class ScreenDisplayManager {

    /**
     * Defines a scene with its specific priority.
     * @param {string} id 
     * @param {number} priority 
     */
    defineScene(id,priority) {
        this.#scenes[id] = priority;
    }

    
    setTitle(player,text,options) {
        
    }

    /**
     * 
     * @param {Player} player 
     * @param {string} text 
     * @param {*} options 
     */
    setActionBar(player,text,options) {
        this.#playerScenes[player.id] ??= {actionBar:{},title:{}};
        const playerActionBar = this.#playerScenes[player.id].actionBar;
        const playerScreenDisplay = player.onScreenDisplay;
        if (playerActionBar) {}

    }

    clearActionBar(player) {

    }

    clearTitle(player) {
        
    }

    #scenes = {}
    #playerScenes = {}
}