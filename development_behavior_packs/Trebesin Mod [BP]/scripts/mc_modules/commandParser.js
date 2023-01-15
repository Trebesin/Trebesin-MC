import { world, Location, BlockAreaSize, Player } from '@minecraft/server';
import { setVectorLength } from './../js_modules/vector';
import { filter } from '../js_modules/array';
import { randInt } from '../js_modules/random';
import { findCharIndex, findLastCharIndex, findNumber } from '../js_modules/string';
import { logMessage } from '../plugins/debug/debug';

//# Type Definitions:
/**
* @callback CommandDefinitionRun
* @param {Player} sender - Actor that has invoked the command.
* @param {object} parameters - Object of parameters, keys are named after ids specified in command definition parameters and values are parsed user input.
*/

/**
* @callback CommandDefinitionSenderCheck
* @param {Player} sender - Actor that has invoked the command.
*/

/**
* @typedef CommandDefinitionParameter
* @property {string} id - ID of the parameter.
* @property {('string'|'integer'|'float'|'boolean'|'position'|'selector')} type - Type of the parameter defining what the user input should look like.
* @property {number} [array] - Number defining an array of parameters, the value corresponds to its length.
*/

/**
* @typedef CommandDefinition
* @property {string} description - Description of the command shown in the default help command.
* @property {string[]} [aliases] - Aliases to invoke the command. Repeating the same aliases might have unexpected results.
* @property {CommandDefinitionParameter[]} parameters - All parameters that the command takes.
* @property {any[]} [arguments] - Array of any additional arguments that will be passed to the command function when it's ran.
* @property {CommandDefinitionSenderCheck} [senderCheck] - Optional function that needs to return `true` in order to allow execution of the command.
* @property {CommandDefinitionRun} run - Function that runs when the command is invoked.
*/

//#Main Command Parser Class:
//Finish help command, add parameter preprocesser
class CommandParser {
    /**
     * Creates a new command parser instance.
     * @param {object} options 
     */
    constructor(options = {}) {
        for (const option in options) {
            this.#options[option] = options[option];
        }
        world.events.beforeChat.subscribe(async (eventData) => {
            const {message, sender} = eventData;

            if (message.startsWith(this.#options.prefix)) {
                eventData.cancel = true;
                const messageArray = message.split(' ');
                let commandInput = messageArray[0].slice(this.#options.prefix.length);
                if (!this.#options.caseSensitive) {
                    commandInput = commandInput.toLowerCase();
                }
                this.runCommand(commandInput,messageArray.slice(1).join(' '),sender);
            }
        });

        this.registerCommand('help',{
            aliases: ['?'],
            parameters: [{id:'command',type:'string',optional: true}],
            run: this.#helpCommand
        });
    }

    #helpCommand(sender, parameters) {
        let helpMessage = '';
        if (parameters.command) {
            helpMessage = 'wip';
        } else {
            for (const commandName in this.#commands) {
                const command = this.#commands[commandName];
                helpMessage += `§9${commandName}§r [${command.aliases.join(',')}] - ${command.description}\n`;
            }
        }
        sender.tell(helpMessage);
    }

    /** 
     * @param {string} name - Identification of the command.
     * @param {CommandDefinition} definition - Definitions of the command.
     **/
    registerCommand(name,definition) {
        if (!this.#options.caseSensitive) {
            name = name.toLowerCase();
        }
        if (!definition.arguments) {
            definition.arguments = [];
        }
        this.#commands[name] = definition;
    }

    /**
     * A function used to execute a command.
     * @param {string} name Name of the command to run.
     * @param {string} parameterString String input of the parameters.
     * @param {Player} sender Player to use as the context of the command execution.
     */
     async runCommand(input,parameterString,sender) {
        let command;
        for (const commandName in this.#commands) {
            if (commandName === input || this.#commands[commandName].aliases?.includes(input)) {
                command = this.#commands[commandName];
            }
        }

        try {
            if (!command) {
                throw new CommandError(`§cCommand §r§l'${input}'§r§c not found!`);
            }
            if (command.senderCheck && !this.#options.adminCheck(sender) && !command.senderCheck(sender)) {
                throw new CommandError(`§cYou do not meet requirements to use the command §r§l'${input}'§r§c!`);
            }

            const parameterArray = this.#getParameters(parameterString,this.#options.parameterChars);
            const parameters = this.#getParameterChain(parameterArray,command.parameters,sender);
            await command.run(sender, parameters, ...command.arguments);
        } catch (error) {
            if (error instanceof CommandError) {
                sendMessage(error.message,'CMD',sender);
            } else {
                sendMessage(`§cFatal error has occurred during the execution of §r§l'${commandInput}'§r§c!`,sender,'CMD');
            }
        }
    }

    #commands = {}
    #options = {
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

    #getParameters(string,options) {
        const {quote:quoteChar,escape:escapeChar,separator,selector:selectorChar} = options;
        const items = [];
        let itemIndex = -1;
        let parsingItem, escaped, quoted, selector, selectorArg;
    
        for (let charIndex = -1;charIndex < string.length;charIndex++) {
            const char = string[charIndex];
            const nextChar = string[charIndex+1];
    
            if (!escaped && char === escapeChar) {
                escaped = true;
                continue;
            }
            if (parsingItem) {
                if (selector) {
                    items[itemIndex] += char;
                    if (nextChar === '[') {
                        selectorArg = true;
                    }
                    if (selectorArg) {
                        if (!escaped && char === ']' && (nextChar === separator || nextChar == null)) {
                            parsingItem = false;
                            selector = false;
                            selectorArg = false;
                        } else if (nextChar == null) {
                            throw new CommandError('Unfinished selector parameter!');
                        }
                    } else {
                        if (escaped) { 
                            throw new CommandError(`Can't escape inside of a selector name parameter!`)
                        }
                        if (nextChar === separator) {
                            parsingItem = false;
                            selector = false;
                        }
                    }
                } else if (quoted) {
                    if (!escaped && char === quoteChar) {
                        if (nextChar === separator || nextChar == null) {
                            parsingItem = false;
                            quoted = false;
                        } else {
                            throw new CommandError('Unescaped quote inside the parameters!');
                        }
                    } else {
                        if (nextChar == null) {
                            throw new CommandError('Unfinished quoted parameter!');
                        }
                        items[itemIndex] += char;
                    }
                } else {
                    items[itemIndex] += char;
                    if (!escaped) {
                        if (char === quoteChar) {
                            throw new CommandError('Unescaped quote inside the parameters!')
                        }
                    }
                    if (nextChar === separator) {
                        parsingItem = false;
                    }
                }
            } else {
                if (nextChar !== separator && nextChar != null){
                    parsingItem = true;
                    items.push('');
                    itemIndex++;
                }
                if (nextChar === quoteChar) {
                    quoted = true;
                    charIndex++;
                }
                if (nextChar === selectorChar) {
                    selector = true;
                }
            }
            if (escaped) {
                escaped = false;
            }
        }
        
        return items;
    }


    #getParameterChain(parameters,options,sender) {
        const output = {};
        let optional = false;
        let currentOptions = options;
        let currentParameters = parameters;

        for (let index = 0;index < currentOptions.length;index++) {
            const option = currentOptions[index];
            const parameter = currentParameters[index];
            logMessage(`Starting parameter ${index}: ${option.id} [${option.type}]`)
            logMessage(parameter);

            if (option.optional) optional = true;

            if (index >= currentParameters.length) {
                if (optional) return output;
                throw new CommandError(`Missing parameter '${option.id}'!`);
            }

            //Position type
            if (option.type === 'position' || option.type === 'pos') {
                const coords = currentParameters.slice(index,index += 3);
                const parsedPosition = this.#parsePosition(coords,sender,option);
                output[option.id] = parsedPosition;
                continue
            }
            //Array type
            if (option.array) {
                let parameterArray = [];
                let newIndex = index + option.array;
                if (currentParameters.length < newIndex) {
                    throw new CommandError(`Incomplete array parameter '${option.id}'!`);
                }

                for (const arrayParameter of currentParameters.slice(index,newIndex)) {
                    const parsedArrayParameter = this.#parseParameterType(arrayParameter,sender,option);
                    parameterArray.push(parsedArrayParameter);
                }

                index = newIndex;
                output[option.id] = parameterArray;
                continue
            }

            const parsedParameter = this.#parseParameterType(parameter,sender,option);
            //Choice type
            if (option.choice) {
                output[option.id] = parsedParameter;
                if (!(parameter in option.choice)) {
                    throw new CommandError(`Invalid choice of '${parameter}' at ${option.id}!`);
                }
                //Restart with new options defined by the choice
                index = 0;
                currentOptions = option.choice[parameter];
                currentParameters = currentParameters.slice(index+1)
            //Default type
            } else {
                output[option.id] = parsedParameter;
            }
        }

        return output
    }   

    #parseParameterType(parameter,sender,option) {
        let parsedParameter, value;

        switch (option.type) {
            case 'string':
            case 'str':
                value = parameter;
                parsedParameter = value;
                break
            case 'integer':
            case 'int':
                value = parseInt(parameter);
                if (!isNaN(value)) {
                    parsedParameter = value;
                } else {
                    throw new CommandError(`Value of '${option.id}' couldn't be parsed as integer number!`);
                }
                break
            case 'float':
            case 'flt':
                value = parseFloat(parameter);
                if (!isNaN(value)) {
                    parsedParameter = value;
                } else {
                    throw new CommandError(`Value of '${option.id}' couldn't be parsed as floating-point number!`);
                }
                break
            case 'boolean':
            case 'bool':
                value = parameter.toLowerCase();
                if (value === 'true' || value === '1') {
                    parsedParameter = true;
                } else if (value === 'false' || value === '0') {
                    parsedParameter = false;
                } else {
                    throw new CommandError(`Value of '${option.id}' couldn't be parsed as boolean value!`);
                }
                break
            case 'selector':
            case 'select':
                value = this.#parseSelector(parameter,sender,option);
                parsedParameter = value;
                break
            default:
                throw new Error(`Unknown type of '${option.type}' found while parsing parameters!`);
        }
        if (option.selection?.contains(parsedParameter) === false){
            throw CommandError(`Value of '${option.id}' isn't in the allowed selection list.`);
        }

        return parsedParameter;
    }

    #parsePosition(stringArray,entity,option) {
        const coord = [0,0,0];
        let vector = null;
        const axisIndexes = ['x','y','z'];
        for (let index = 0;index < stringArray.length;index++) {
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
                    const number = parseFloat(string.slice(2,string.length-1));
                    coord[index] = Math.round(entity.location[axis]) + (isNaN(number) ? 0 : number);
                } else if (string[1] === '[' && string[string.length - 1] === ']') {
                    const number = parseFloat(string.slice(2,string.length-1));
                    coord[index] = parseInt(entity.location[axis]) + (isNaN(number) ? 0 : number);
                } else {
                    const number = parseFloat(string.slice(1));
                    coord[index] = entity.location[axis] + (isNaN(number) ? 0 : number);
                }
            } else {
                if (vector) {
                    coord[index] += entity.location[axis];
                    const number = parseFloat(string.slice(1));
    
                    if (isNaN(number)) continue
                    let useVector;
                    const vector = entity.viewDirection;
                    switch (index) {
                        case 0:
                            useVector = setVectorLength({x:vector.z,y:0,z:-vector.x},number);
                            break;
                        case 1:
                            const total = Math.sqrt(Math.abs(vector.x**2)+Math.abs(vector.z**2));
                            useVector = setVectorLength({x:(vector.x/total)*-vector.y,y:total,z:(vector.z/total)*-vector.y},number);
                            break;
                        case 2:
                            useVector = setVectorLength(vector,number);
                            break;
                    }
                    coord[0] += useVector.x;
                    coord[1] += useVector.y;
                    coord[2] += useVector.z;
                } else {
                    let number = parseFloat(string);
                    if (isNaN(number)) throw new CommandError(`Couldn't parse absolute coordinate as number at parameter '${option.id}'!`)
                    coord[index] = number;
                }
            }
        }
        return new Location(...coord);
    }

    #parseSelector(string,sender,option) {
        try {
        const queryOptions = {};
        const selector = this.#getSelector(string,option);
        let selectedEntities = [];
        let entityLimit = parseInt(selector.values.limit?.[0]);
        let randomize = false;
        let allPlayersOnly = false;
        //Player only selector:
        if (option.playerOnly && (selector.name !== 'a' || selector.name !== 'p')) throw new CommandError(`'${option.id}' is a player-only selector!`);
        //Overridable entity queries from selector type:
        if (selector.name === 'r') queryOptions.type = 'minecraft:player';
        if (selector.name === 'a') allPlayersOnly = true;
        //All entity queries from selector arguments:
        let idSelection = new Set(selector.values.id);

        //Entity property filtering:
        if (selector.values.name) {
            parseListSelectorArg(
                selector.values.name,
                {options:queryOptions,include:'name',exclude:'excludeNames'},
                {includeSingleItem:true}
            );
        }
        if (selector.values.type) {
            parseListSelectorArg(
                selector.values.type,
                {options:queryOptions,include:'type',exclude:'excludeTypes'},
                {includeSingleItem:true}
            );
        }
        if (selector.values.tag) {
            parseListSelectorArg(
                selector.values.tag,
                {options:queryOptions,include:'tags',exclude:'excludeTags'}
            );
        }
        if (selector.values.family) {
            parseListSelectorArg(
                selector.values.family,
                {options:queryOptions,include:'families',exclude:'excludeFamilies'}
            );
        }
        if (selector.values.gamemode) {
            parseListSelectorArg(
                selector.values.gamemode,
                {options:queryOptions,include:'gameMode',exclude:'excludeGameModes'},
                {includeSingleItem:true}
            );
        }
        if (selector.values.level) {
            parseRangeSelectorArg(
                selector.values.level[0],
                {options:queryOptions,max:'maxLevel',min:'minLevel'}
            );
        };
        if (selector.values.x_rotation) {
            parseRangeSelectorArg(
                selector.values.x_rotation[0],
                {options:queryOptions,max:'maxHorizontalRotation',min:'minHorizontalRotation'}
            );
        }
        if (selector.values.y_rotation) {
            parseRangeSelectorArg(
                selector.values.y_rotation[0],
                {options:queryOptions,max:'maxVerticalRotation',min:'minVerticalRotation'}
            );
        }

        //Entity location filtering:
        if (selector.values.distance) {
            parseRangeSelectorArg(
                selector.values.distance[0],
                {options:queryOptions,max:'maxDistance',min:'minDistance'}
            );
        }
        if (selector.values.x && selector.values.y && selector.values.z) {
            allPlayersOnly = false;
            queryOptions.location = this.#parsePosition(
                [selector.values.x[0],selector.values.y[0],selector.values.z[0]],sender,option
            );
        }
        if (selector.values.dx && selector.values.dy && selector.values.dz) {
            allPlayersOnly = false;
            queryOptions.volume = new BlockAreaSize(
                parseInt(selector.values.dx[0]),parseInt(selector.values.dy[0]),parseInt(selector.values.dz[0])
            );
        }

        //Entity score filtering:
        if (selector.values.scores) {
            queryOptions.scoreOptions = {};
            parseScoresSelectorArg(selector.values.scores[0],{options:queryOptions,scores:'scoreOptions'});
        }

        //Sorts:
        if (selector.values.sort) {
            switch (selector.values.sort[0]) {
                case 'furthest':
                    queryOptions.farthest = isNaN(entityLimit) ? 99 : entityLimit;//can set this by default to a real high value ?Infinity to make limit selectors work well with ID patch and other future possible patches
                    break;
                case 'nearest':
                    queryOptions.closest = isNaN(entityLimit) ? 99 : entityLimit;//same as above
                    break;
                case 'random':
                    randomize = true; //Prepares to randomize after getting all the entities from the query.
                    break;
            }
        }

        //Forced entity queries from selector type:
        switch (selector.name) {
            case 'e':
                break
            case 'a':
                if (allPlayersOnly) {
                    delete queryOptions.type;
                    delete queryOptions.excludeTypes;
                } else {
                    queryOptions.type = 'minecraft:player';
                    queryOptions.excludeTypes = [];
                }
                break
            case 'p':
                delete queryOptions.farthest;
                queryOptions.closest = isNaN(entityLimit) ? 1 : entityLimit;
                queryOptions.type = 'minecraft:player';
                queryOptions.excludeTypes = [];
                break
            case 'r':
                entityLimit = isNaN(entityLimit) ? 1 : entityLimit;
                delete queryOptions.farthest;
                delete queryOptions.closest;
                randomize = true;
                break
            case 's':
                entityLimit = 1;
                idSelection = new Set();
                idSelection.add(sender.id);
                break
            default:
                throw new CommandError(`Invalid selector type at '${option.id}'!`);
        }
        //Getting all entities from a chosen/default dimension:
        let entities;
        if (allPlayersOnly) {
            entities = world.getPlayers(queryOptions);
        } else {
            const dimension = world.getDimension(selector.values.dimension?.[0] ?? sender.dimension.id);
            entities = dimension.getEntities(queryOptions);
        }
        //Custom entity filters & limit for unsorted entity queries:
        for (const entity of entities) {
            if (idSelection.size === 0 || idSelection.has(entity.id)) selectedEntities.push(entity);
            if (!randomize && selectedEntities.length === entityLimit) break;
        }
        //Randomize if @r/sort=random:
        if (randomize) {
            const randomizedEntities = [];
            for (let randomStep = 0;randomStep < entityLimit;randomStep++) {
                const randomIndex = randInt(0,selectedEntities.length-1);
                randomizedEntities.push(selectedEntities[randomIndex]);
                selectedEntities.splice(randomIndex,1);
            }
            selectedEntities = randomizedEntities;
        }
        
        return selectedEntities;
        } catch (error) {logMessage(error);}
    }

    #getSelector(string,option,options = {selectorChar: '@', escapeChar: '\\', quoteChar: '\"', separator: ','}) {
        const selector = {
            name: '',
            values: {}
        };
        const {quoteChar,escapeChar,selectorChar,separator} = options;
        let part = 0; // 0: selector name; 1: parameter name; 2: parameter value
        let currentName = '';
        let quoted, escaped;
    
        if (string[0] != selectorChar) throw new CommandError(`Missing '@' symbol at parameter '${option.id}'!`);
        for (let index = 1;index <= string.length;index++) {
            const char = string[index];
            if (!escaped && char === escapeChar) {
                escaped = true;
                continue;
            }
            if (char == null && part === 2) throw new CommandError(`Unexpected end of selector at parameter '${option.id}'!`);
    
            if (part === 0) {
                if (char === '[' || char == null) {
                    part = 1;
                    continue;
                };
                if (char !== ' ') selector.name += char;
            }

            if (part === 1) {
                if (!escaped && char === '=') {
                    if (selector.values[currentName] == null) selector.values[currentName] = [];
                    const nextItemIndex = selector.values[currentName].length;
                    part = 2;
                    selector.values[currentName][nextItemIndex] = '';
                    continue;
                };
                if (char !== ' ') currentName += char ?? '';
            }
            
            if (part === 2) {
                const itemIndex = selector.values[currentName].length - 1;
                if (!escaped && char === quoteChar) {
                    if (!quoted && selector.values[currentName][itemIndex].length <= 1) {
                        quoted = true;
                        continue;
                    }
                    if (quoted === true) {
                        quoted = false;
                        continue;
                    }
                }
                if (!escaped && (char === separator || char === ']') && !quoted) {
                    part = 1;
                    currentName = '';
                    continue;
                }
                if (quoted || (char !== ' ')) selector.values[currentName][itemIndex] += char;
            }

            if (escaped) escaped = false;
        }
        return selector;
    }
}

class CommandError extends Error {
    constructor(message) {
        super(`§c${message}`);
        this.name = 'CommandError';
    }
}

//# Helper Functions:
/**
 * 
 * @param {string} message 
 * @param {Player | Player[]} [actor]
 * @param {string} [sender]
 */
 function sendMessage(message,senderName,actor = null) {
    const messageText = !senderName ? message : `[${senderName}§r] ${message}`;
    if (!actor) {
        world.say(messageText);
    } else {
        if (!Array.isArray(actor)) {
            actor.tell(messageText);
        } else {
            for (let playerIndex = 0;playerIndex < actor.length;playerIndex++) {
                actor[playerIndex].tell(messageText);
            }
        }
    }
}

function parseRangeSelectorArg(selectorArg,query,options = {}) {
    let min,max;
    const firstDotIndex = findCharIndex(selectorArg,'.');
    const lastDotIndex = findLastCharIndex(selectorArg,'.');
    if (firstDotIndex != null) {
        if (lastDotIndex < selectorArg.length-1) {
            max = findNumber(selectorArg,lastDotIndex);
        }
        if (firstDotIndex > 0) {
            min = findNumber(selectorArg);
        }
    } else {
        min = parseInt(selectorArg);
        max = parseInt(selectorArg);
    }

    query.options[query.max] = max;
    query.options[query.min] = min;
}

function parseListSelectorArg(selectorArg,query,options = {}) {
    let include,exclude;
    include = filter(selectorArg,element => element[0] !== '!');
    if (options.includeSingleItem) include = include[0];
    exclude = filter(selectorArg,element => element[0] === '!').map((element) => element.slice(1));

    query.options[query.include] = include;
    query.options[query.exclude] = exclude;
}

function parseScoresSelectorArg(selectorArg,query,options = {}) {
    const scoreOptions = [];
    if (selectorArg[0] === '{' && selectorArg[selectorArg.length-1] === '}') {
        const scoreStrings = getScoreSelectors(selectorArg);
        for (const objective in scoreStrings) {
            let objectiveValue = scoreStrings[objective];
            let exclude = false;
            if (objectiveValue[0] === '!') {
                exclude = true;
                objectiveValue = objectiveValue.slice(1);
            }
            const scoreQuery = {objective,exclude};
            parseRangeSelectorArg(objectiveValue,{options:scoreQuery,min:'scoreMin',max:'scoreMax'});
            scoreOptions.push(scoreQuery);
        }
    }

    query.options[query.scores] = scoreOptions;
}

function getScoreSelectors(string,options = {escapeChar: '\\', separator: ','}) {
    const selector = {};
    const {escapeChar,separator} = options;
    let part = 0; //0: objective name; 1: objective value
    let currentName = '';
    let escaped;

    for (let index = 1;index < string.length-1;index++) {
        const char = string[index];
        if (!escaped && char === escapeChar) {
            escaped = true;
            continue;
        }

        if (part === 0) {
            if (!escaped && char === '=') {
                if (selector[currentName] == null) selector[currentName] = '';
                part = 1;
                selector[currentName] = '';
                continue;
            };
            if (char !== ' ') currentName += char ?? '';
        }
        
        if (part === 1) {
            if (!escaped && (char === separator || char === null)) {
                part = 0;
                currentName = '';
                continue;
            }
            if (char !== ' ') selector[currentName] += char ?? '';
        }

        if (escaped) escaped = false;
    }
    return selector
}

export {CommandParser,sendMessage}