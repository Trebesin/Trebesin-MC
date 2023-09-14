//APIs:
import * as Mc from '@minecraft/server';
//Plugins:
import * as Debug from '../../debug/debug';
import { playerData as serverPlayerData } from '../../server/server';
import { Commands } from '../../backend/backend';
//Modules:
import * as VectorMath from "../../../js_modules/vectorMath.js";
import { sendMessage } from '../../../mc_modules/players';
import { spawnBox, spawnBigBox, spawnLineBox } from '../../../mc_modules/particles';
export function main() {
    Commands.registerCommand("gmsp", {
        aliases: ["gamemodespectator", "gamemodesp", "gm3", "gmspectator", "spectator"], parameters: [], run: async (sender) => {
            await sender.runCommandAsync(`gamerule sendcommandfeedback false`);
            await sender.runCommandAsync(`gamemode spectator @s `);
            sendMessage("you are now in §lspectator§r§f Mode", "§aCMD§f", sender);
            await sender.runCommandAsync(`gamerule sendcommandfeedback true`);
        },
        description: "sets your gamemode to spectator"
    });
    Commands.registerCommand("cls", {
        aliases: ["clear", "clearchat", "clschat"],
        parameters: [],
        description: "spams your chat with newlines therefore clearing chat",
        run: (sender) => {
            let message = '';
            for (let i = 0; i < 10000; i++) {
                message += '\n';
            }
            sender.sendMessage(message);
        }
    });
    Commands.registerCommand("gma", {
        aliases: ["gamemodeadventure", "gamemodea", "gm2", "gmadventure", "adventure"], parameters: [], run: async (sender) => {
            await sender.runCommandAsync(`gamerule sendcommandfeedback false`);
            await sender.runCommandAsync(`gamemode a @s `);
            if (sender.hasTag("fly")) {
                await sender.runCommandAsync(`tag @s remove fly`);
                await sender.runCommandAsync(`ability @s mayfly false`);
            }
            sendMessage("you are now in §ladventure§r§f mode", "§aCMD§f", sender);
            await sender.runCommandAsync(`gamerule sendcommandfeedback true`);
        },
        description: "sets your gamemode to adventure"
    });
    Commands.registerCommand("phase", {
        parameters: [{ id: "distance", type: "int", optional: true }], aliases: ["p", "phaser"], run: (sender, parameter) => {
            const newLocation = VectorMath.sum(sender.location, VectorMath.setLength(sender.getViewDirection(), parameter.distance ?? 2));
            sender.teleport(newLocation);
            sendMessage("§l§bWHOOSH!§r", "", sender);
        },
        description: "teleports you in front by [distance] blocks"
    });
    Commands.registerCommand("fly", {
        parameters: [], aliases: ["f"], run: async (sender) => {
            const __parameter = !sender.hasTag("fly");
            await sender.runCommandAsync(`gamerule sendcommandfeedback false`);
            await sender.runCommandAsync(`ability @s mayfly ${__parameter.toString()}`);
            if (__parameter) {
                await sender.runCommandAsync(`tag @s add fly`);
                sendMessage("you can now §lfly§r!", "§aCMD§f", sender);
            }
            else {
                await sender.runCommandAsync(`tag @s remove fly`);
                sendMessage("you have disabled §lflying§r", "§aCMD§f", sender);
            }
            await sender.runCommandAsync(`gamerule sendcommandfeedback true`);
        },
        description: "switches flying"
    });
    Commands.registerCommand("nv", { description: "switches night vision on/off", aliases: ["nightvision"], parameters: [], run: (sender) => {
            try {
                if (!sender.hasTag("nvoff")) {
                    sender.addTag("nvoff");
                    sendMessage("your §l§anightvision§r has been turned off - §c(you might need to wait 15s for it to run out)", "§aCMD§f", sender);
                }
                else {
                    sender.removeTag("nvoff");
                    sendMessage("your §l§anightvision§r has been turned on", "§aCMD§f", sender);
                }
                ;
            }
            catch (error) {
                sendMessage(`Error! ${error}`, 'CMD', sender);
            }
        } });
    Commands.registerCommand('particle', {
        description: 'Spawns a particle in the world. Optional parameter "molang" is used to define variables for the particle.\n The object is following such format: {"color":{"name":"color","r":0-255,"g":0-255,"b":0-255,"a":0-255},"speed_direction":{"name":"speed_and_dir","speed":1,"x":1,"y":1,"z":1},"vector":{"x":1,"y":1,"z":1}} (anything except "name" can be omitted and may be replaced with default value of 0)',
        parameters: [
            {
                id: 'particleId',
                type: 'string',
            },
            {
                id: 'location',
                type: 'position',
            },
            {
                id: 'molang',
                optional: true,
                type: 'json'
            }
        ],
        run(sender, parameters) {
            const molangOptions = parameters?.molang;
            const molangVariables = new Mc.MolangVariableMap();
            if (molangOptions?.color)
                molangVariables.setColorRGBA(`variable.${molangOptions.color.name}`, {
                    red: (molangOptions.color.r ?? 0) / 255,
                    green: (molangOptions.color.g ?? 0) / 255,
                    blue: (molangOptions.color.b ?? 0) / 255,
                    alpha: (molangOptions.color.a ?? 0) / 255
                });
            if (molangOptions?.speed_direction)
                molangVariables.setSpeedAndDirection(`variable.${molangOptions.speed_direction.name}`, molangOptions.speed_direction.speed ?? 0, {
                    x: molangOptions.speed_direction.x ?? 0,
                    y: molangOptions.speed_direction.y ?? 0,
                    z: molangOptions.speed_direction.z ?? 0
                });
            if (molangOptions?.vector)
                molangVariables.setVector3(`variable.${molangOptions.vector.name}`, {
                    x: molangOptions.vector.x ?? 0,
                    y: molangOptions.vector.y ?? 0,
                    z: molangOptions.vector.z ?? 0
                });
            sender.dimension.spawnParticle(parameters.particleId, parameters.location, molangVariables);
            sendMessage(`Summoned particle "${parameters.particleId}"!`, '§aCMD§f', sender);
        }
    });
    Commands.registerCommand('particleBox', {
        parameters: [
            {
                id: 'location',
                type: 'position'
            }
        ],
        run(sender, parameters) {
            const molang = new Mc.MolangVariableMap();
            molang.setColorRGBA(`variable.color`, { red: 0, green: 0, blue: 1, alpha: 1 });
            spawnBox('trebesin:plane_box_', parameters.location, sender.dimension, molang, 0.005);
        }
    });
    Commands.registerCommand('particlebigbox', {
        parameters: [
            {
                id: 'location',
                type: 'position'
            },
            {
                id: 'sizeX',
                type: 'int'
            },
            {
                id: 'sizeY',
                type: 'int'
            },
            {
                id: 'sizeZ',
                type: 'int'
            }
        ],
        run(sender, parameters) {
            const molang = new Mc.MolangVariableMap();
            molang.setColorRGBA(`variable.color`, { red: 0, green: 0, blue: 1, alpha: 0.5 });
            molang.setSpeedAndDirection(`variable.time`, 10, { x: 0, y: 0, z: 0 });
            molang.setVector3(`variable.size`, { x: parameters.sizeX / 2, y: parameters.sizeY / 2, z: parameters.sizeZ / 2 });
            spawnBigBox('trebesin:plane_box_flex_', VectorMath.floor(parameters.location), sender.dimension, molang, { x: parameters.sizeX, y: parameters.sizeY, z: parameters.sizeZ }, 0.0);
        }
    });
    Commands.registerCommand('particleline', {
        parameters: [
            {
                id: 'location',
                type: 'position'
            },
            {
                id: 'lineLength',
                type: 'int'
            },
            {
                id: 'dirX',
                type: 'int'
            },
            {
                id: 'dirY',
                type: 'int'
            },
            {
                id: 'dirZ',
                type: 'int'
            }
        ],
        run(sender, parameters) {
            const molang = new Mc.MolangVariableMap();
            molang.setColorRGBA(`variable.color`, { red: 0, green: 0, blue: 1, alpha: 0.5 });
            molang.setSpeedAndDirection(`variable.size`, parameters.lineLength, { x: parameters.dirX, y: parameters.dirY, z: parameters.dirZ });
            sender.dimension.spawnParticle(`trebesin:line_flex`, VectorMath.floor(parameters.location), molang);
        }
    });
    Commands.registerCommand('particlelinebox', {
        parameters: [
            {
                id: 'location',
                type: 'position'
            },
            {
                id: 'sizeX',
                type: 'int'
            },
            {
                id: 'sizeY',
                type: 'int'
            },
            {
                id: 'sizeZ',
                type: 'int'
            }
        ],
        run(sender, parameters) {
            const molang = new Mc.MolangVariableMap();
            molang.setColorRGBA(`variable.color`, { red: 0, green: 0, blue: 1, alpha: 0.5 });
            molang.setSpeedAndDirection(`variable.time`, 10, { x: 0, y: 0, z: 0 });
            Debug.logMessage(JSON.stringify([VectorMath.floor(parameters.location), VectorMath.sum(VectorMath.floor(parameters.location), { x: parameters.sizeX, y: parameters.sizeY, z: parameters.sizeZ })]));
            spawnLineBox('trebesin:line_flex2', [VectorMath.floor(parameters.location), VectorMath.sum(VectorMath.floor(parameters.location), { x: parameters.sizeX, y: parameters.sizeY, z: parameters.sizeZ })], sender.dimension, molang);
        }
    });
}

//# sourceMappingURL=user.js.map
