import { sendMessage } from "../../../mc_modules/players";
import { Commands } from "../../backend/backend";
import { isAdmin } from "../../commands/workers/admin"
import { logMessage } from "../../debug/debug";
import { variables as ServerConfig } from '@minecraft/server-admin';
import {world,ItemTypes, ItemStack} from '@minecraft/server';

const unitTestingList = {child: [
    {name: 'block_history', child: [
        {name: '!co p', run: (sender) => {Commands.runCommand("co", "p", sender)}, child: [
            {name: '!co p 5', run:(sender) => {Commands.runCommand("co", "p 5", sender)}},
            {name: '!co p 5m', run: (sender) => {Commands.runCommand("co", "p 5m", sender)}},
            {name: '!co p 5m 4m', run: (sender) => {Commands.runCommand("co", "p 5m 4m", sender)}},
            {name: '!co p 10 4m', run: (sender) => {Commands.runCommand("co", "p 10 4m", sender)}}
        ]},
        {name: '!co b', run: (sender) => {Commands.runCommand("co", "b", sender)}, child: [
            {name: '!co b 5', run: (sender) => {Commands.runCommand("co", "b 5", sender)}},
            {name: '!co b 5m', run:(sender) => {Commands.runCommand("co", "b 5m", sender)}},
            {name: '!co b 5m 4m', run: (sender) => {Commands.runCommand("co", "b 5m 4m", sender)}},
            {name: '!co b 10 4m', run: (sender) => {Commands.runCommand("co", "b 10 4m", sender)}}
        ]},
        {name: '!co rb',run: (sender) => {Commands.runCommand("co", "rb", sender)}, child: [
            {name: '!co rb 5', run: (sender) => {Commands.runCommand("co", "rb 5", sender)}},
            {name: '!co rb 5m', run: (sender) => {Commands.runCommand("co", "rb 5m", sender)}},
            {name: '!co rb 5m 4m', run: (sender) => {Commands.runCommand("co", "rb 5m 4m", sender)}},
            {name: '!co rb 10 4m', run: (sender) => {Commands.runCommand("co", "rb 10 4m", sender)}}
        ]},
        {name: "!co confirm", run: (sender) => {Commands.runCommand("co", "confirm", sender)}},
        {name: '!co r',run: (sender) => {Commands.runCommand("co", "r", sender)}, child: [
            {name: '!co r 5', run: (sender) => {Commands.runCommand("co", "r 5", sender)}},
            {name: '!co r 5m', run: (sender) => {Commands.runCommand("co", "r 5m", sender)}},
            {name: '!co r 5m 4m', run: (sender) => {Commands.runCommand("co", "r 5m 4m", sender)}},
            {name: '!co r 10 4m', run: (sender) => {Commands.runCommand("co", "r 10 4m", sender)}}
        ]},
        {name: '!co show', run: (sender) => {Commands.runCommand("co", "show", sender)}},
        {name: "!co cancel", run: (sender) => {Commands.runCommand("co", "cancel", sender)}},
        {name: "place a block and test !co i", run: (sender) => {Commands.runCommand("co", "i", sender)}},
        {name: "!co c", run: (sender) => {Commands.runCommand("co", "c", sender)}},
        {name: "!co ca", run: (sender) => {Commands.runCommand("co", "ca", sender)}}
    ]},
    {name: 'commands', child: [
        {name: '!summon minecraft:pig ~ ~ ~', run: (sender) => {Commands.runCommand("summon", "minecraft:pig ~ ~ ~", sender)}},
        {name: '!instakill', run: (sender) => {Commands.runCommand('instakill', "", sender)}},
        {name: '!runas @r tpall', run: (sender) => {Commands.runCommand('runas', "@r tpall", sender)}},
        {name: '!dupe 5 @a', run: (sender) => {Commands.runCommand('dupe', '5 @a', sender)}},
        {name: '!tphere', run: (sender) => {Commands.runCommand('tphere', '', sender)}},
        {name: '!tpall', run: (sender) => {Commands.runCommand('tpall', '', sender)}},
        {name: '!deop', run: (sender) => {Commands.runCommand('deop', '', sender)}},
        {name: '!op', run: (sender) => {Commands.runCommand('op', '', sender)}},
        {name: '!gmc', run: (sender) => {Commands.runCommand('gmc', '', sender)}},
        {name: '!allowbuild', run: (sender) => {Commands.runCommand('allowbuild', '', sender)}},
        {name: '!log', run: (sender) => {Commands.runCommand('log', '', sender)}},
        {name: '!gms', run: (sender) => {Commands.runCommand('gms', '', sender)}},
        {name: '!gmsp', run: (sender) => {Commands.runCommand('gmsp', '', sender)}},
        {name: '!cls', run: (sender) => {Commands.runCommand('cls', '', sender)}},
        {name: '!gma', run: (sender) => {Commands.runCommand('gma', '', sender)}},
        {name: '!fly', run: (sender) => {Commands.runCommand('fly', '', sender)}},
        {name: '!nv', run: (sender) => {Commands.runCommand('nv', '', sender)}},
        {name: '!phase 500', run: (sender) => {Commands.runCommand('phase', '500', sender)}},
        {name: '!dbdis', debug: true, run: (sender) => {Commands.runCommand('dbdis', '', sender)}},
        {name: '!dbcon', debug: true, run: (sender) => {Commands.runCommand('dbcon', '', sender)}},
        {name: '!block', debug: true, run: (sender) => {Commands.runCommand('block', '', sender)}},
        {name: '!getvector', debug: true, run: (sender) => {Commands.runCommand('getvector', '', sender)}},
        {name: '!getcoords', debug: true, run: (sender) => {Commands.runCommand('getcoords', '', sender)}},
        {name: '!testselector @e[type=!pig]', debug: true, run: (sender) => {Commands.runCommand('testselector', '@e[type=!pig]', sender)}},
        {name: '!testpos ~ ~ ~', debug: true, run: (sender) => {Commands.runCommand('testpos', '~ ~ ~', sender)}},
    ]}
]}
let currentActiveUnitTestingPerPlayer = {}

function getObjectFromIndex(object, positionArray){
    if(positionArray.length === 0)return object
    logMessage(`position array: ${positionArray}, object: ${object.name}`)
    const newArray = [...positionArray]
    const newObject = object.child?.[newArray.shift()]
    if(!newObject)return object
    return getObjectFromIndex(newObject, newArray)
}

function showOption(object, positionArray, sender){
    sendMessage(`unitTesting for: ${getObjectFromIndex(object, positionArray).name}`, 'cmd - unitTesting', sender)
    sendMessage('use !ut run for running or !ut [next|previous|parent|child] for navigating', 'cmd - unitTesting', sender)
    sendMessage(`${getObjectFromIndex(object, positionArray).child? 'this feature does have a child' : 'this feature doesn\'t have a child'}`)
}

function createItem(commandName, parameters, name, sender) {
    const commandItem = new ItemStack(ItemTypes.get('trebesin:cmd_universal'),1);
    commandItem.setLore([commandName,parameters]);
    commandItem.nameTag = name;
    sender.getComponent('inventory').container.addItem(commandItem);
}
function getTools(sender){
    createItem('ut', 'parent', 'parent', sender)
    createItem('ut', 'previous', 'previous', sender)
    createItem('ut', 'run', 'run', sender)
    createItem('ut', 'show', 'show', sender)
    createItem('ut', 'next', 'next', sender)
    createItem('ut', 'child', 'child', sender)
    createItem('ut', 'stop', 'stop', sender)
}

export async function main(){
    Commands.registerCommand("unittesting", {aliases: ["ut"], senderCheck: isAdmin, parameters: [
        {id: 'command', type: "string", optional: true, choice: {
            run: [

            ],
            parent: [

            ],
            child: [

            ],
            next: [

            ],
            previous: [

            ],
            show: [

            ],
            tools: [

            ],
            stop: [

            ]
        }}
    ], run: (sender, parameters) => {
        try {
        switch(parameters.command){
            case 'next':
                if(!currentActiveUnitTestingPerPlayer[sender.id]){
                    sendMessage("there is not a unitTesting session running. Use !unittesting to initiate.", 'cmd - unitTesting', sender)
                    break;
                }
                let newArrayWithoutTheLastElement = [...currentActiveUnitTestingPerPlayer[sender.id].position]
                newArrayWithoutTheLastElement.pop()
                if(currentActiveUnitTestingPerPlayer[sender.id].position
                    [currentActiveUnitTestingPerPlayer[sender.id].position.length - 1] + 1 >= getObjectFromIndex(unitTestingList, newArrayWithoutTheLastElement).child.length){
                    //doing the parent navigation
                    if(currentActiveUnitTestingPerPlayer[sender.id]?.position.length <= 1){
                    sendMessage('gj you have finished the unitTesting. If everything is included in the list in \\development_behavior_packs\\Trebesin Mod [BP]\\scripts\\plugins\\debug\\workers\\unit_testing.js you\'re now free to make a pr to stable', 'cmd - unitTesting', sender)
                    delete currentActiveUnitTestingPerPlayer[sender.id]
                    break;
                    }
                    currentActiveUnitTestingPerPlayer[sender.id].position.pop()
                    showOption(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position, sender)
                }
                else{
                    currentActiveUnitTestingPerPlayer[sender.id].position[ currentActiveUnitTestingPerPlayer[sender.id].position.length - 1]++
                    showOption(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position, sender)
                }
                break;
            case 'previous':
                if(!currentActiveUnitTestingPerPlayer[sender.id]){
                    sendMessage("there is not a unitTesting session running. Use !unittesting to initiate.", 'cmd - unitTesting', sender)
                    break;
                }
                if(currentActiveUnitTestingPerPlayer[sender.id].position[ currentActiveUnitTestingPerPlayer[sender.id].position.length - 1 ] !== 0){
                    currentActiveUnitTestingPerPlayer[sender.id].position[ currentActiveUnitTestingPerPlayer[sender.id].position.length - 1 ]--;
                    showOption(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position, sender)
                }
                else {
                    sendMessage("you are already at the first feature. To go up the hieararchy use !unittesting parent", 'cmd - unitTesting', sender)
                }
                break;
            case 'parent':
                if(!currentActiveUnitTestingPerPlayer[sender.id]){
                    sendMessage("there is not a unitTesting session running. Use !unittesting to initiate.", 'cmd - unitTesting', sender)
                    break;
                }
                if(currentActiveUnitTestingPerPlayer[sender.id]?.position.length === 1){
                    sendMessage('you\'re already in the root unitTesting directory', 'cmd - unitTesting', sender)
                    break;
                }
                currentActiveUnitTestingPerPlayer[sender.id].position.pop()
                showOption(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position, sender)
                break;
            case 'show':
                if(!currentActiveUnitTestingPerPlayer[sender.id]){
                    sendMessage("there is not a unitTesting session running. Use !unittesting to initiate.", 'cmd - unitTesting', sender)
                    break;
                }
                logMessage(`position: ${currentActiveUnitTestingPerPlayer[sender.id].position}`)
                showOption(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position, sender)
                break;
            case 'child':
                if(!currentActiveUnitTestingPerPlayer[sender.id]){
                    sendMessage("there is not a unitTesting session running. Use !unittesting to initiate.", 'cmd - unitTesting', sender)
                    break;
                }
                const object = getObjectFromIndex(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position)
                if(object.child){
                    currentActiveUnitTestingPerPlayer[sender.id].position.push(0)
                    showOption(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position, sender)
                }
                else {
                    sendMessage("this option has no children", 'cmd - unitTesting', sender)
                }
                break;
            case 'tools': 
                getTools(sender)
                break;
            case 'stop':
                delete currentActiveUnitTestingPerPlayer[sender.id];
                sendMessage('curent unitTesting session was closed.', 'cmd - unitTesting', sender)
                break;
            case 'run':
                if(!currentActiveUnitTestingPerPlayer[sender.id]){
                    sendMessage("there is not a unitTesting session running. Use !unittesting to initiate.", 'cmd - unitTesting', sender)
                    break;
                }
                const runObject = getObjectFromIndex(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position)
                if(!ServerConfig.get('debug-enabled') && runObject.debug){
                    sendMessage('this is a debug unitTesting feature but debug isn\'t allowed in the server. Enable it in server variables to do this', 'cmd - unitTesting', sender)
                    break;
                }
                if(runObject.run === undefined){
                    sendMessage('this unitTesting option doesn\'t have a run feature', 'cmd - unitTesting', sender)
                    break;
                }
                sendMessage('running the run option [', "", sender)
                runObject.run(sender);
                sendMessage(']\nfinished the run option', "", sender)
                break;
            default: 
                if(!currentActiveUnitTestingPerPlayer[sender.id]){
                    currentActiveUnitTestingPerPlayer[sender.id] = {player: sender, position: [0]}
                    showOption(unitTestingList, currentActiveUnitTestingPerPlayer[sender.id].position, sender)
                    getTools(sender)
                }
                else{
                    sendMessage('the unit testing is currently active! use !unittesting stop and then run this again to reset', 'cmd - unitTesting', sender)
                }
        }
    }catch(error){
        logMessage(error)
    }
    }
})
}