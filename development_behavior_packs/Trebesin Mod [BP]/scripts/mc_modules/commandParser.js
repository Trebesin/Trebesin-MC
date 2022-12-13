import {world,Location,EntityQueryOptions} from '@minecraft/server';
import {setVectorLength} from './../js_modules/vector';

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
     * @param {object} definition - Definitions for the behavior of the command.
     * @param {string} description - Description of the command shown in the default help command.
     * @param {string[]} [definition.aliases] - Aliases to invoke the command. Repeating the same aliases might have unexpected results.
     * @param {object[]} definition.parameters - All parameters that the command takes.
     * @param {any[]} definition.arguments - Array of any additional arguments that will be passed to the command function when it's ran.
     * @param {Function} [definition.senderCheck] - Optional function that needs to return `true` in order to allow execution of the command, it gets passed a `sender{Player}` parameter.
     * @param {Function} definition.run - Function that runs when the command is invoked, it gets passed 3 parameters: `sender{Player}`, `parameters{Object}` and `arguments{any[]}` which is the command invoker, all parsed parameters and defined arguments.
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

    #getParameterChain(parameters,options,sender,index = 0,optional = false) {
        let output = {};
        //let options = 

        //for (let optionIndex = 0;optionIndex < ) { }
        for (const option of options) {
            //const option = options[optionIndex];
            const parameter = parameters[index];

            if (option.optional) optional = true;

            if (index >= parameters.length) {
                if (optional) return output;
                throw new CommandError(`Missing parameter '${option.id}'!`);
            }

            //Position type
            if (option.type === 'position' || option.type === 'pos') {
                const coords = parameters.slice(index,index += 3);
                const parsedPosition = this.#parsePosition(coords,sender,option);
                output[option.id] = parsedPosition;
                continue
            }
            //Array type
            if (option.array) {
                let parameterArray = [];
                if (parameters.length < index + option.array) {
                    throw new CommandError(`Incomplete array parameter '${option.id}'!`);
                }
                for (const arrayParameter of parameters.slice(index,index += option.array)) {
                    const parsedArrayParameter = this.#parseParameterType(arrayParameter,option);
                    parameterArray.push(parsedArrayParameter);
                }
                output[option.id] = parameterArray;
                continue
            }

            const parsedParameter = this.#parseParameterType(parameter,option);
            //Choice type
            if (option.choice) {
                output[option.id] = parsedParameter;
                if (!(parameter in option.choice)) {
                    throw new CommandError(`Invalid choice of '${parameter}' at ${option.id}!`);
                }
                const choiceOutput = this.#getParameterChain(parameters.slice(index+1),option.choice[parameter],sender,0,optional);
                Object.assign(output,choiceOutput);
            //Default type
            } else {
                output[option.id] = parsedParameter;
                index++;
            }
        }

        return output
    }

    #parseParameterType(parameter,option) {
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
                value = this.#parseSelector(parameter,option);
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
                    const vector = entity.viewVector;
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

    #parseSelector(string,option) {
        const selectorEntities = [];
        /**
         * @type {EntityQueryOptions}
         */
        const queryOptions = {};
        const selector = this.#getSelector(string,option);
        if (selector.values.name) {

        }
        if (selector.values.type) {

        }
        if (selector.values.tag) {
            queryOptions.tags = filter(selector.values.tag,element => element[0] !== '!');
            queryOptions.excludeTags = filter(selector.values.tag,element => element[0] === '!');
        }
        if (selector.values.family) {
            queryOptions.families = filter(selector.values.family,element => element[0] !== '!');
            queryOptions.excludeFamilies = filter(selector.values.family,element => element[0] === '!');
        }
        if (selector.values.level) {

        }
        if (selector.values.distance) {

        }
        if (selector.values.x_rotation) {

        }
        if (selector.values.y_rotation) {
            
        }
        if (selector.values.gamemode) {

        }
        if (selector.values.limit) {

        }
        if (selector.values.sort) {

        }
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
            if (char == null && part >= 2) throw new CommandError(`Unexpected end of selector at parameter '${option.id}'!`);
    
            if (part === 0) {
                if (char === '[') {
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
                if (char !== ' ') currentName += char;
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
        return selector
    }
}

function filter(array,condition) {
    const filterArray = [];
    for (let index = 0;index < array.length;index++) {
        if (condition(array[index],index,array)) filterArray.push(array[index]);
    }
    return filterArray
}

class CommandError extends Error {
    constructor(message) {
        super(`§c${message}`);
        this.name = 'CommandError';
    }
}

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

export {CommandParser,sendMessage}