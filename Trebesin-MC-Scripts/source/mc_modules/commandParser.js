var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _CommandParser_instances, _CommandParser_helpCommand, _CommandParser_commands, _CommandParser_options, _CommandParser_getParameterChain, _CommandParser_parseParameterType, _CommandParser_parsePosition, _CommandParser_parseSelector, _ParameterStringParser_index, _ParameterStringParser_string, _ParameterStringParser_options;
import { world, system, BlockAreaSize, Player, MinecraftBlockTypes, BlockPermutation } from '@minecraft/server';
import { setVectorLength } from './../js_modules/vector';
import { filter } from '../js_modules/array';
import { randInt } from '../js_modules/random';
import { findCharIndex, findLastCharIndex, findNumber } from '../js_modules/string';
import { sendMessage } from './players';
import { logMessage } from '../plugins/debug/debug';
import { sendLongMessage } from '../plugins/backend/backend';
//# Type Definitions:
/**
* @callback CommandDefinitionRun
* @param {Player} sender - Actor that has invoked the command.
* @param {object} parameters - Object of parameters, keys are named after ids specified in command definition parameters and values are parsed user input.
*/
/**
* @callback CommandDefinitionSenderCheck
* @param {Player} sender Actor that has invoked the command.
*/
/**
* @typedef CommandDefinitionParameter
* @property {string} id ID of the parameter.
* @property {('string'|'integer'|'float'|'boolean'|'position'|'selector'|'json'|'blockPermutation')} type - Type of the parameter defining what the user input should look like.
* @property {number} [array] Number defining an array of parameters, the value corresponds to its length.
* @property {boolean} [optional] Defines that the command will successfully execute even without this and following parameters specified by the user.
* @property {boolean} [fullArray] Only for `array: <number>`, allows the array to be returned even if it doesn't contain the same amount of elements as specified by the property.
* @property {boolean} [playersOnly] Only for `type: 'selector'`, sets the selector to only allow `@a`,`@p` and `@r(type: 'minecraft:player')`
* @property {Object.<string,CommandDefinitionParameter[]>} [choice] Makes parameter only allow values that correspond to keys of this object and then starts parsing the following parameters according to its value.
*/
/**
* @typedef CommandDefinition
* @property {string} description Description of the command shown in the default help command.
* @property {string[]} [aliases] Aliases to invoke the command. Repeating the same aliases might have unexpected results.
* @property {CommandDefinitionParameter[]} parameters All parameters that the command takes.
* @property {any[]} [arguments] Array of any additional arguments that will be passed to the command function when it's ran.
* @property {CommandDefinitionSenderCheck} [senderCheck] Optional function that needs to return `true` in order to allow execution of the command.
* @property {CommandDefinitionRun} run Function that runs when the command is invoked.
*/
//#Main Command Parser Class:
//Finish help command, add parameter preprocesser
class CommandParser {
    /**
     * Creates a new command parser instance.
     * @param {object} options
     */
    constructor(options = {}) {
        _CommandParser_instances.add(this);
        _CommandParser_commands.set(this, {});
        _CommandParser_options.set(this, {
            prefix: '!',
            caseSensitive: true,
            parameterChars: {
                escape: '\\',
                quote: '\"',
                separator: ' ',
                selector: '@'
            },
            adminCheck: () => false
        }
        /**
         *
         * @param {ParameterStringParser} parameters
         * @param {CommandDefinitionParameter[]} options
         * @param {Player} sender
         * @returns
         */
        );
        for (const option in options) {
            __classPrivateFieldGet(this, _CommandParser_options, "f")[option] = options[option];
        }
        world.beforeEvents.chatSend.subscribe(async (eventData) => {
            const { message, sender } = eventData;
            if (message.startsWith(__classPrivateFieldGet(this, _CommandParser_options, "f").prefix)) {
                eventData.cancel = true;
                logMessage(`player ${sender.name} executed command: ${message}`);
                const messageArray = message.split(' ');
                let commandInput = messageArray[0].slice(__classPrivateFieldGet(this, _CommandParser_options, "f").prefix.length);
                if (!__classPrivateFieldGet(this, _CommandParser_options, "f").caseSensitive) {
                    commandInput = commandInput.toLowerCase();
                }
                system.runTimeout(() => this.runCommand(commandInput, messageArray.slice(1).join(' '), sender), 1);
            }
        });
        this.registerCommand('help', {
            aliases: ['?'],
            description: 'Lists all commands or explains specific command in more detail.',
            parameters: [{ id: 'command', type: 'string', optional: true }],
            arguments: [__classPrivateFieldGet(this, _CommandParser_commands, "f"), __classPrivateFieldGet(this, _CommandParser_options, "f")],
            run: __classPrivateFieldGet(this, _CommandParser_instances, "m", _CommandParser_helpCommand)
        });
    }
    /**
     * @param {string} name - Identification of the command.
     * @param {CommandDefinition} definition - Definitions of the command.
     **/
    registerCommand(name, definition) {
        if (!__classPrivateFieldGet(this, _CommandParser_options, "f").caseSensitive) {
            name = name.toLowerCase();
        }
        if (!definition.arguments) {
            definition.arguments = [];
        }
        __classPrivateFieldGet(this, _CommandParser_commands, "f")[name] = definition;
    }
    /**
     * A function used to execute a command.
     * @param {string} name Name of the command to run.
     * @param {string} parameterString String input of the parameters.
     * @param {Player} sender Player to use as the context of the command execution.
     * @param {boolean} sudo Wheter or not to run the command if sender doesn't have permisions
     */
    async runCommand(name, parameterString, sender, sudo = false) {
        const command = findRegisteredCommand(name, __classPrivateFieldGet(this, _CommandParser_commands, "f"))?.definition;
        try {
            if (command == null) {
                throw new CommandError(`§cCommand §r§l'${name}'§r§c not found!`);
            }
            if (command.senderCheck && !__classPrivateFieldGet(this, _CommandParser_options, "f").adminCheck(sender) && !command.senderCheck(sender) && !sudo) {
                throw new CommandError(`§cYou do not meet requirements to use the command §r§l'${name}'§r§c!`);
            }
            const parameterParser = new ParameterStringParser(parameterString, __classPrivateFieldGet(this, _CommandParser_options, "f").parameterChars);
            const parameters = __classPrivateFieldGet(this, _CommandParser_instances, "m", _CommandParser_getParameterChain).call(this, parameterParser, command.parameters, sender);
            await command.run(sender, parameters, ...command.arguments);
        }
        catch (error) {
            if (error instanceof CommandError) {
                sendMessage(error.message, 'CMD', sender);
            }
            else {
                sendMessage(`§cFatal error has occurred during the execution of §r§l'${name}'§r§c!`, sender, 'CMD');
            }
        }
    }
}
_CommandParser_commands = new WeakMap(), _CommandParser_options = new WeakMap(), _CommandParser_instances = new WeakSet(), _CommandParser_helpCommand = function _CommandParser_helpCommand(sender, parameters, commandRegister, commandOptions) {
    let helpMessage = '';
    if (parameters.command) {
        const command = findRegisteredCommand(parameters.command, commandRegister);
        if (command == null) {
            throw new CommandError(`§cCommand §r§l'${parameters.command}'§r§c not found!`);
        }
        const definition = command.definition;
        const commandName = command.name;
        if (definition.senderCheck && !commandOptions.adminCheck(sender) && !definition.senderCheck(sender)) {
            throw new CommandError(`§cYou do not meet requirements to use the command §r§l'${commandName}'§r§c!`);
        }
        const aliases = definition.aliases?.length ? `[§7§o${definition.aliases.join(',')}§r]` : '';
        helpMessage += `§a§l${commandName}§r ${aliases}\n`;
        helpMessage += `§l§bDescription§r: ${definition.description ?? 'None'}\n`;
        helpMessage += `§l§bParamaters§r:\n`;
        const parameterHelp = parseParameterHelp(definition.parameters);
        helpMessage += parameterHelp.join('\n');
    }
    else {
        helpMessage += `§l§btip:§r use help [command] for detailed command description\n`;
        for (const commandName in commandRegister) {
            const command = commandRegister[commandName];
            if (command.senderCheck && !commandOptions.adminCheck(sender) && !command.senderCheck(sender))
                continue;
            const description = command.description ? command.description.slice(0, 32) : '';
            const ending = command.description?.length > 32 ? '...' : '';
            const aliases = command.aliases?.length ? `[§7§o${command.aliases.join(',')}§r]` : '';
            helpMessage += `§l§a${commandName}§r${aliases == '' ? '' : ` ${aliases}`}${(description + ending) == '' ? `` : ` - ${description + ending}`}\n`;
        }
    }
    sendLongMessage("help", helpMessage, sender);
}, _CommandParser_getParameterChain = function _CommandParser_getParameterChain(parameters, options, sender) {
    const output = {};
    let optional = false;
    let currentOptions = options;
    for (let optionIndex = 0; optionIndex < currentOptions.length; optionIndex++) {
        const option = currentOptions[optionIndex];
        const parameter = parameters.next(option);
        if (option.optional)
            optional = true;
        if (parameter == null) {
            if (optional)
                return output;
            throw new CommandError(`Missing parameter '${option.id}'!`);
        }
        //Array type
        if (option.array > 0) {
            output[option.id] = parameter.map((value) => __classPrivateFieldGet(this, _CommandParser_instances, "m", _CommandParser_parseParameterType).call(this, value, sender, option));
            continue;
        }
        const parsedParameter = __classPrivateFieldGet(this, _CommandParser_instances, "m", _CommandParser_parseParameterType).call(this, parameter, sender, option);
        output[option.id] = parsedParameter;
        //Choice type
        if (option.choice) {
            output[option.id] = parsedParameter;
            if (!(parameter in option.choice)) {
                throw new CommandError(`Invalid choice of '${parameter}' at ${option.id}!`);
            }
            //Restart with new options defined by the choice
            currentOptions = option.choice[parameter];
            optionIndex = -1; //increment will make it 0
            optional = false; //reset optional to false //![experimental]
        }
    }
    return output;
}, _CommandParser_parseParameterType = function _CommandParser_parseParameterType(parameter, sender, option) {
    let parsedParameter, value;
    switch (option.type) {
        case 'string':
        case 'str':
            value = parameter;
            parsedParameter = value;
            break;
        case 'integer':
        case 'int':
            value = parseInt(parameter);
            if (!isNaN(value))
                parsedParameter = value;
            else
                throw new CommandError(`Value of '${option.id}' couldn't be parsed as integer number!`);
            break;
        case 'float':
        case 'flt':
            value = parseFloat(parameter);
            if (!isNaN(value))
                parsedParameter = value;
            else
                throw new CommandError(`Value of '${option.id}' couldn't be parsed as floating-point number!`);
            break;
        case 'boolean':
        case 'bool':
            value = parameter.toLowerCase();
            if (value === 'true' || value === '1')
                parsedParameter = true;
            else if (value === 'false' || value === '0')
                parsedParameter = false;
            else
                throw new CommandError(`Value of '${option.id}' couldn't be parsed as boolean value!`);
            break;
        case 'json':
            try {
                value = JSON.parse(parameter);
                parsedParameter = value;
            }
            catch (error) {
                throw new CommandError(`Failed parsing of '${option.id}' as JSON! Error: ${error}`);
            }
            break;
        case 'pos':
        case 'position':
            value = __classPrivateFieldGet(this, _CommandParser_instances, "m", _CommandParser_parsePosition).call(this, parameter, sender, option);
            parsedParameter = value;
            break;
        case 'selector':
        case 'select':
            value = __classPrivateFieldGet(this, _CommandParser_instances, "m", _CommandParser_parseSelector).call(this, parameter, sender, option);
            parsedParameter = value;
            break;
        case 'blockPermutation':
            const typeId = parameter.type.match(':') == null ? `minecraft:${parameter.type}` : parameter.type;
            let blockStates;
            try {
                const stateJsonString = parameter.states === '' ? '{}' : parameter.states;
                blockStates = JSON.parse(stateJsonString);
            }
            catch (error) {
                throw new CommandError(`Failed parsing of '${option.id}' block states as JSON! Error: ${error}`);
            }
            try {
                parsedParameter = {
                    userStates: parameter.states !== '',
                    permutation: BlockPermutation.resolve(typeId, blockStates)
                };
            }
            catch {
                throw new CommandError(`Failed resolving block with id '${typeId}' and its states!`);
            }
            break;
        default:
            throw new Error(`Unknown type of '${option.type}' found while parsing parameters!`);
    }
    if (option.selection?.contains(parsedParameter) === false) {
        throw CommandError(`Value of '${option.id}' isn't in the allowed selection list.`);
    }
    return parsedParameter;
}, _CommandParser_parsePosition = function _CommandParser_parsePosition(stringArray, entity, option) {
    const coord = [0, 0, 0];
    let vector = null;
    const axisIndexes = ['x', 'y', 'z'];
    for (let index = 0; index < stringArray.length; index++) {
        const string = stringArray[index];
        const axis = axisIndexes[index];
        if (vector === null) {
            vector = string[0] === '\^';
        }
        if ((vector === true && string[0] !== '\^') || (vector === false && string[0] === '\^')) {
            throw new CommandError(`All or none of the coordinates at parameter '${option.id}' must be a vector!`);
        }
        if (string[0] === '~') {
            if (string[1] === '(' && string[string.length - 1] === ')') {
                const number = parseFloat(string.slice(2, string.length - 1));
                coord[index] = Math.round(entity.location[axis]) + (isNaN(number) ? 0 : number);
            }
            else if (string[1] === '[' && string[string.length - 1] === ']') {
                const number = parseFloat(string.slice(2, string.length - 1));
                coord[index] = Math.floor(entity.location[axis]) + (isNaN(number) ? 0 : number);
            }
            else {
                const number = parseFloat(string.slice(1));
                coord[index] = entity.location[axis] + (isNaN(number) ? 0 : number);
            }
        }
        else {
            if (vector) {
                coord[index] += entity.location[axis];
                const number = parseFloat(string.slice(1));
                if (isNaN(number))
                    continue;
                let useVector;
                const vector = entity.getViewDirection();
                switch (index) {
                    case 0:
                        useVector = setVectorLength({ x: vector.z, y: 0, z: -vector.x }, number);
                        break;
                    case 1:
                        const total = Math.sqrt(vector.x ** 2 + vector.z ** 2);
                        useVector = setVectorLength({ x: (vector.x / total) * -vector.y, y: total, z: (vector.z / total) * -vector.y }, number);
                        break;
                    case 2:
                        useVector = setVectorLength(vector, number);
                        break;
                }
                coord[0] += useVector.x;
                coord[1] += useVector.y;
                coord[2] += useVector.z;
            }
            else {
                let number = parseFloat(string);
                if (isNaN(number))
                    throw new CommandError(`Couldn't parse absolute coordinate as number at parameter '${option.id}'!`);
                coord[index] = number;
            }
        }
    }
    return { x: coord[0], y: coord[1], z: coord[2] };
}, _CommandParser_parseSelector = function _CommandParser_parseSelector(selector, sender, option) {
    const queryOptions = {};
    let selectedEntities = [];
    let entityLimit = parseInt(selector.values.limit?.[0]);
    let randomize = false;
    let allPlayersOnly = false;
    //Player only selector:
    if (option.playerOnly && !(selector.name === 'a' || selector.name === 'p' || selector.name === 'r'))
        throw new CommandError(`'${option.id}' is a player-only selector!`);
    //Overridable entity queries from selector type:
    if (selector.name === 'r')
        queryOptions.type = 'minecraft:player';
    if (selector.name === 'a')
        allPlayersOnly = true;
    //All entity queries from selector arguments:
    let idSelection = new Set(selector.values.id);
    //Entity property filtering:
    if (selector.values.name) {
        parseListSelectorArg(selector.values.name, { options: queryOptions, include: 'name', exclude: 'excludeNames' }, { includeSingleItem: true });
    }
    if (selector.values.type) {
        parseListSelectorArg(selector.values.type, { options: queryOptions, include: 'type', exclude: 'excludeTypes' }, { includeSingleItem: true });
    }
    if (selector.values.tag) {
        parseListSelectorArg(selector.values.tag, { options: queryOptions, include: 'tags', exclude: 'excludeTags' });
    }
    if (selector.values.family) {
        parseListSelectorArg(selector.values.family, { options: queryOptions, include: 'families', exclude: 'excludeFamilies' });
    }
    if (selector.values.gamemode) {
        parseListSelectorArg(selector.values.gamemode, { options: queryOptions, include: 'gameMode', exclude: 'excludeGameModes' }, { includeSingleItem: true });
    }
    if (selector.values.level) {
        parseRangeSelectorArg(selector.values.level[0], { options: queryOptions, max: 'maxLevel', min: 'minLevel' });
    }
    ;
    if (selector.values.x_rotation) {
        parseRangeSelectorArg(selector.values.x_rotation[0], { options: queryOptions, max: 'maxHorizontalRotation', min: 'minHorizontalRotation' });
    }
    if (selector.values.y_rotation) {
        parseRangeSelectorArg(selector.values.y_rotation[0], { options: queryOptions, max: 'maxVerticalRotation', min: 'minVerticalRotation' });
    }
    //Entity location filtering:
    if (selector.values.distance) {
        parseRangeSelectorArg(selector.values.distance[0], { options: queryOptions, max: 'maxDistance', min: 'minDistance' });
    }
    if (selector.values.x && selector.values.y && selector.values.z) {
        allPlayersOnly = false;
        queryOptions.location = __classPrivateFieldGet(this, _CommandParser_instances, "m", _CommandParser_parsePosition).call(this, [selector.values.x[0], selector.values.y[0], selector.values.z[0]], sender, option);
    }
    if (selector.values.dx && selector.values.dy && selector.values.dz) {
        allPlayersOnly = false;
        queryOptions.volume = new BlockAreaSize(parseInt(selector.values.dx[0]), parseInt(selector.values.dy[0]), parseInt(selector.values.dz[0]));
    }
    //Entity score filtering:
    if (selector.values.scores) {
        queryOptions.scoreOptions = {};
        parseScoresSelectorArg(selector.values.scores[0], { options: queryOptions, scores: 'scoreOptions' });
    }
    //Sorts:
    if (selector.values.sort) {
        switch (selector.values.sort[0]) {
            case 'furthest':
                queryOptions.farthest = isNaN(entityLimit) ? 99 : entityLimit; //can set this by default to a real high value ?Infinity to make limit selectors work well with ID patch and other future possible patches
                break;
            case 'nearest':
                queryOptions.closest = isNaN(entityLimit) ? 99 : entityLimit; //same as above
                break;
            case 'random':
                randomize = true; //Prepares to randomize after getting all the entities from the query.
                break;
        }
    }
    //Forced entity queries from selector type:
    switch (selector.name) {
        case 'e':
            break;
        case 'a':
            if (allPlayersOnly) {
                delete queryOptions.type;
                delete queryOptions.excludeTypes;
            }
            else {
                queryOptions.type = 'minecraft:player';
                queryOptions.excludeTypes = [];
            }
            break;
        case 'p':
            delete queryOptions.farthest;
            queryOptions.closest = isNaN(entityLimit) ? 1 : entityLimit;
            queryOptions.type = 'minecraft:player';
            queryOptions.excludeTypes = [];
            break;
        case 'r':
            if (option.playerOnly)
                queryOptions.type = 'minecraft:player';
            entityLimit = isNaN(entityLimit) ? 1 : entityLimit;
            delete queryOptions.farthest;
            delete queryOptions.closest;
            randomize = true;
            break;
        case 's':
            entityLimit = 1;
            idSelection = new Set();
            idSelection.add(sender.id);
            break;
        default:
            throw new CommandError(`Invalid selector type at '${option.id}'!`);
    }
    //Getting all entities from a chosen/default dimension:
    let entities;
    if (allPlayersOnly) {
        entities = world.getPlayers(queryOptions);
    }
    else {
        const dimension = world.getDimension(selector.values.dimension?.[0] ?? sender.dimension.id);
        entities = dimension.getEntities(queryOptions);
    }
    //Custom entity filters & limit for unsorted entity queries:
    for (const entity of entities) {
        if (idSelection.size === 0 || idSelection.has(entity.id))
            selectedEntities.push(entity);
        if (!randomize && selectedEntities.length === entityLimit)
            break;
    }
    //Randomize if @r/sort=random:
    if (randomize) {
        const randomizedEntities = [];
        for (let randomStep = 0; randomStep < entityLimit; randomStep++) {
            const randomIndex = randInt(0, selectedEntities.length - 1);
            randomizedEntities.push(selectedEntities[randomIndex]);
            selectedEntities.splice(randomIndex, 1);
        }
        selectedEntities = randomizedEntities;
    }
    return selectedEntities;
};
class CommandError extends Error {
    constructor(message) {
        super(`§c${message}`);
        this.name = 'CommandError';
    }
}
class ParameterStringParser {
    constructor(string, options = {}, index = 0) {
        _ParameterStringParser_index.set(this, void 0);
        _ParameterStringParser_string.set(this, void 0);
        _ParameterStringParser_options.set(this, {
            quote: '\"',
            escape: '\\',
            selector: '@',
            separator: ' ',
            selectorSeparator: ','
        });
        __classPrivateFieldSet(this, _ParameterStringParser_string, string, "f");
        Object.assign(__classPrivateFieldGet(this, _ParameterStringParser_options, "f"), options);
        __classPrivateFieldSet(this, _ParameterStringParser_index, index, "f");
    }
    next(option) {
        const { quote: quoteChar, escape: escapeChar, separator, selector: selectorChar, selectorSeparator } = __classPrivateFieldGet(this, _ParameterStringParser_options, "f");
        const string = __classPrivateFieldGet(this, _ParameterStringParser_string, "f");
        let index = __classPrivateFieldGet(this, _ParameterStringParser_index, "f");
        //Basic
        let item = null;
        let escaped = false;
        let quoted = false;
        //Json / Block Permutation
        let blockPhase = null;
        let json = null;
        //Selector
        let selector = null;
        let selectorName = '';
        //Array selectors:
        let parameterArray = null;
        let parameterLength = option.array ?? (option.type === 'pos' || option.type === 'position' ? 3 : null);
        if (parameterLength)
            parameterArray = [];
        for (let parsePhase = 0; parsePhase < 2; index++) {
            const char = string[index];
            const nextChar = string[index + 1];
            if (!escaped && char === escapeChar) {
                escaped = true;
                continue;
            }
            if (parsePhase === 0) {
                if (char == null && parameterArray && !(option.fullArray ?? true))
                    return parameterArray;
                if (char == null)
                    return null;
                if (!escaped && char === separator)
                    continue;
                parsePhase = 1;
                if (option.type === 'selector' || option.type === 'select') {
                    item = {
                        name: '',
                        values: {}
                    };
                    if (char !== selectorChar) {
                        selector = -1;
                        item.name = 'a';
                        item.values.name = [''];
                    }
                    else {
                        selector = 0;
                        continue;
                    }
                }
                else if (option.type === 'blockPermutation') {
                    item = {
                        type: '',
                        states: ''
                    };
                    blockPhase = 0;
                }
                else {
                    item = '';
                }
                if (option.type === 'json') {
                    if (char !== '{' || escaped)
                        throw new CommandError('Unexpected start of JSON!');
                    json = 0;
                }
                if (!escaped && char === quoteChar && blockPhase == null) {
                    quoted = true;
                    continue;
                }
            }
            if (parsePhase === 1) {
                if ((char == null && (selector == null || selector <= 0)) || (selector > 0 && char === ']')) {
                    parsePhase = 2;
                }
                else {
                    if (json != null) {
                        //## JSON / Block Permutation State
                        if (!escaped && char === '{')
                            json++;
                        if (!escaped && char === '}')
                            json--;
                        if (nextChar == null && json > 0)
                            throw new CommandError('Unexpected end of JSON!');
                        if (blockPhase === 1)
                            item.states += char;
                        else
                            item += char;
                        if (json === 0) {
                            if (nextChar !== separator && nextChar != null)
                                throw new CommandError('Unexpected end of JSON!');
                            parsePhase = 2;
                        }
                    }
                    else if (blockPhase === 0) {
                        //## Block Permutation Type
                        if (!escaped && char === '{') {
                            blockPhase = 1;
                            json = 1;
                            item.states += char;
                        }
                        else if (!escaped && char === separator) {
                            parsePhase = 2;
                        }
                        else {
                            item.type += char;
                        }
                    }
                    else if (selector != null) {
                        //## Selector
                        if (char === ']' && selector === 2)
                            parsePhase = 2;
                        //Name Selector:
                        if (selector === -1) {
                            if (quoted) {
                                if (!escaped && char === quoteChar) {
                                    if (nextChar === separator || nextChar == null)
                                        parsePhase = 2;
                                    else
                                        throw new CommandError('Unescaped quote inside the parameters!');
                                }
                                else {
                                    if (nextChar == null)
                                        throw new CommandError('Unfinished quoted parameter!');
                                    item.values.name[0] += char;
                                }
                            }
                            else {
                                if (!escaped && char === separator) {
                                    parsePhase = 2;
                                }
                                else {
                                    item.values.name[0] += char;
                                }
                            }
                        }
                        //Normal Selector:
                        if (selector === 0) {
                            if (char === '[') {
                                selector = 1;
                                continue;
                            }
                            ;
                            if (char !== separator) {
                                item.name += char;
                            }
                            else {
                                parsePhase = 2;
                            }
                        }
                        if (selector === 1) {
                            if (char == null)
                                throw new CommandError(`Unexpected end of selector at parameter '${option.id}'!`);
                            if (!escaped && char === selectorSeparator) {
                                if (item.values[selectorName] == null)
                                    item.values[selectorName] = [];
                                selectorName = '';
                            }
                            if (!escaped && char === '=') {
                                if (item.values[selectorName] == null)
                                    item.values[selectorName] = [];
                                const nextItemIndex = item.values[selectorName].length;
                                selector = 2;
                                item.values[selectorName][nextItemIndex] = '';
                                continue;
                            }
                            if (char !== separator)
                                selectorName += char;
                        }
                        if (selector === 2) {
                            if (char == null)
                                throw new CommandError(`Unexpected end of selector at parameter '${option.id}'!`);
                            const itemIndex = item.values[selectorName].length - 1;
                            if (!escaped && char === quoteChar) {
                                if (!quoted && item.values[selectorName][itemIndex].length <= 1) {
                                    quoted = true;
                                    continue;
                                }
                                if (quoted) {
                                    quoted = false;
                                    continue;
                                }
                            }
                            if (!escaped && !quoted && char === selectorSeparator) {
                                selector = 1;
                                selectorName = '';
                                continue;
                            }
                            if (quoted || (char !== separator))
                                item.values[selectorName][itemIndex] += char;
                        }
                    }
                    else {
                        //# Other types
                        if (quoted) {
                            if (!escaped && char === quoteChar) {
                                if (nextChar === separator || nextChar == null)
                                    parsePhase = 2;
                                else
                                    throw new CommandError('Unescaped quote inside the parameters!');
                            }
                            else {
                                if (nextChar == null)
                                    throw new CommandError('Unfinished quoted parameter!');
                                item += char;
                            }
                        }
                        else {
                            if (!escaped && char === separator) {
                                parsePhase = 2;
                            }
                            else {
                                item += char;
                            }
                        }
                    }
                }
            }
            if (parsePhase === 2) {
                if (parameterArray != null) {
                    parameterLength--;
                    parameterArray.push(item);
                    if (parameterLength === 0) {
                        __classPrivateFieldSet(this, _ParameterStringParser_index, ++index, "f");
                        return parameterArray;
                    }
                    else {
                        parsePhase = 0;
                    }
                }
                else {
                    __classPrivateFieldSet(this, _ParameterStringParser_index, ++index, "f");
                    return item;
                }
            }
            if (escaped)
                escaped = false;
        }
    }
}
_ParameterStringParser_index = new WeakMap(), _ParameterStringParser_string = new WeakMap(), _ParameterStringParser_options = new WeakMap();
//# Helper Functions:
function parseRangeSelectorArg(selectorArg, query, options = {}) {
    let min, max;
    const firstDotIndex = findCharIndex(selectorArg, '.');
    const lastDotIndex = findLastCharIndex(selectorArg, '.');
    if (firstDotIndex != null) {
        if (lastDotIndex < selectorArg.length - 1) {
            max = findNumber(selectorArg, lastDotIndex);
        }
        if (firstDotIndex > 0) {
            min = findNumber(selectorArg);
        }
    }
    else {
        min = parseInt(selectorArg);
        max = parseInt(selectorArg);
    }
    query.options[query.max] = max;
    query.options[query.min] = min;
}
function parseListSelectorArg(selectorArg, query, options = {}) {
    let include, exclude;
    include = filter(selectorArg, element => element[0] !== '!');
    if (options.includeSingleItem)
        include = include[0];
    exclude = filter(selectorArg, element => element[0] === '!').map((element) => element.slice(1));
    query.options[query.include] = include;
    query.options[query.exclude] = exclude;
}
function parseScoresSelectorArg(selectorArg, query, options = {}) {
    const scoreOptions = [];
    if (selectorArg[0] === '{' && selectorArg[selectorArg.length - 1] === '}') {
        const scoreStrings = getScoreSelectors(selectorArg);
        for (const objective in scoreStrings) {
            let objectiveValue = scoreStrings[objective];
            let exclude = false;
            if (objectiveValue[0] === '!') {
                exclude = true;
                objectiveValue = objectiveValue.slice(1);
            }
            const scoreQuery = { objective, exclude };
            parseRangeSelectorArg(objectiveValue, { options: scoreQuery, min: 'scoreMin', max: 'scoreMax' });
            scoreOptions.push(scoreQuery);
        }
    }
    query.options[query.scores] = scoreOptions;
}
function getScoreSelectors(string, options = { escapeChar: '\\', separator: ',' }) {
    const selector = {};
    const { escapeChar, separator } = options;
    let part = 0; //0: objective name; 1: objective value
    let currentName = '';
    let escaped;
    for (let index = 1; index < string.length - 1; index++) {
        const char = string[index];
        if (!escaped && char === escapeChar) {
            escaped = true;
            continue;
        }
        if (part === 0) {
            if (!escaped && char === '=') {
                if (selector[currentName] == null)
                    selector[currentName] = '';
                part = 1;
                selector[currentName] = '';
                continue;
            }
            ;
            if (char !== ' ')
                currentName += char ?? '';
        }
        if (part === 1) {
            if (!escaped && (char === separator || char === null)) {
                part = 0;
                currentName = '';
                continue;
            }
            if (char !== ' ')
                selector[currentName] += char ?? '';
        }
        if (escaped)
            escaped = false;
    }
    return selector;
}
/**
* @typedef CommandRegisterEntry
* @property {string} name - Name of the command.
* @property {CommandDefinition} [definition] - Definition of the command.
*/
/**
 *
 * @param {string} input
 * @param {object} commands
 * @returns {CommandRegisterEntry}
 */
function findRegisteredCommand(input, commands) {
    for (const commandName in commands) {
        if (commandName === input || commands[commandName].aliases?.includes(input)) {
            return { name: commandName, definition: commands[commandName] };
        }
    }
}
function parseParameterHelp(paremeters) {
    const messages = [];
    let helpMessage = '';
    let optional = false;
    for (let paramaterIndex = 0; paramaterIndex < paremeters.length; paramaterIndex++) {
        const definition = paremeters[paramaterIndex];
        const type = normalizeParameterType(definition.type);
        if (definition.optional)
            optional = true;
        if (definition.choice) {
            for (const choice in definition.choice) {
                const choiceParameters = parseParameterHelp(definition.choice[choice]);
                for (let choiceIndex = 0; choiceIndex < choiceParameters.length; choiceIndex++) {
                    messages.push(helpMessage + `${choice}` + ' ' + choiceParameters[choiceIndex]);
                }
            }
        }
        else {
            const optionalString = optional ? `§b?§r` : '';
            const arrayString = definition.array ? `(§d${definition.array}§r)` : '';
            helpMessage += `${definition.id}${optionalString}[§c${type}§r${arrayString}] `;
        }
    }
    if (messages.length === 0)
        messages.push(helpMessage);
    return messages;
}
function normalizeParameterType(type) {
    let normalizedType = 'unknown';
    switch (type) {
        case 'string':
        case 'str':
            normalizedType = 'str';
            break;
        case 'integer':
        case 'int':
            normalizedType = 'int';
            break;
        case 'float':
        case 'flt':
            normalizedType = 'float';
            break;
        case 'boolean':
        case 'bool':
            normalizedType = 'bool';
            break;
        case 'json':
            normalizedType = 'json';
            break;
        case 'pos':
        case 'position':
            normalizedType = 'position';
            break;
        case 'selector':
        case 'select':
            normalizedType = 'selector';
            break;
        case 'blockPermutation':
            normalizedType = 'blockPermutation';
            break;
    }
    return normalizedType;
}
export { CommandParser, CommandError };
