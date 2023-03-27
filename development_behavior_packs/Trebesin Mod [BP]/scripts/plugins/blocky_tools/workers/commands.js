//APIs:
import * as Mc from '@minecraft/server';
//Plugins:
import * as Sessions from './sessions';
import {setBlockType} from '../../block_history/block_history';
import {isAdmin} from '../../commands/workers/admin';
//Modules:
import {generateBlockArea} from '../../../mc_modules/blocks';
import {generateBlockPyramid} from '../../../js_modules/geometry';
import {CommandParser} from '../../../mc_modules/commandParser';
import {sendMessage} from '../../../mc_modules/players';
import {copyVector, sumVectors} from '../../../js_modules/vector';
import {logMessage} from '../../debug/debug';

const Commands = new CommandParser({
	prefix: '.',
	caseSensitive: false
});


export async function main() {
	Commands.registerCommand('restart', {
		description: 'Initializes the Blocky Tools session for the player that invokes the command. §c!! Required to use Blocky Tools !!§r',
		parameters: [],
		run: Sessions.initializeSession
	});

	Commands.registerCommand('menu', {
		description: 'Open action menu with all possible actions.',
		parameters: [
			{
				id:'submenu',
				type: 'string',
				optional:true
			}
		],
		run: Sessions.actionMenu
	});

	Commands.registerCommand('pointer', {
		description: 'Switches the current pointer mode.',
		parameters: [
			{
				id:'mode',
				type:'string',
				optional: true,
			}
		],
		run(sender,parameters) {
			const modeInput = parameters?.mode?.toUpperCase();
			let pointerMode = Sessions.PointerMode[modeInput];
			if (modeInput != null && pointerMode == null) {
				sendMessage('§cInvalid choice of pointer mode!§r Options are: §c"BLOCK","FACE","FREE","ACTION"§r.','§2BT§r',sender);
				return;
			}
			Sessions.switchPointer(sender,pointerMode);
		}
	});

	Commands.registerCommand('fillSelectionCorners',{
		parameters: [			{
			id:'blockType',
			type:'blockType'
		}],
		run(sender,parameters) {
			Sessions.fillSelectionCorners(sender,parameters.blockType);
		}
	});

	Commands.registerCommand('selectionMinMax',{
		parameters: [],
		run(sender) {
			Sessions.getSelectionMinMax(sender);
		}
	});

	Commands.registerCommand('fillSelection',{
		parameters: [{
			id:'blockType',
			type:'blockType'
		}],
		run(sender,parameters) {
			Sessions.fillSelection(sender,parameters.blockType);
		}
	});

	Commands.registerCommand('fillReplaceSelection',{
		parameters: [
			{
				id:'fillBlock',
				type:'blockPermutation'
			},
			{
				id:'replaceMode',
				type:'string',
				choice: {
					'include': [
						{
							id: 'replacePermutations',
							type: 'blockPermutation',
							array: Infinity,
							fullArray: false
						}
					],
					'exclude': [
						{
							id: 'replacePermutations',
							type: 'blockPermutation',
							array: Infinity,
							fullArray: false
						}
					]
				}
			}
		],
		run(sender,parameters) {
			Sessions.fillReplaceSelection(
				sender,
				parameters.fillBlock,
				parameters.replacePermutations,
				parameters.replaceMode === 'exclude',
			);
		}
	});

	Commands.registerCommand('includesInSelection',{
		parameters: [],
		run(sender) {
			Sessions.insideSelection(sender);
		}
	});

	Commands.registerCommand('flip',{
		parameters: [
			{
				id:'axis',
				type:'string',
				choice: {
					'x':[],
					'y':[],
					'z':[]
				}
			}
		],
		run(sender,parameters) {
			Sessions.flipSelection(sender,parameters.axis);
		}
	});

	Commands.registerCommand('paste',{
		parameters: [],
		run(sender) {
			Sessions.beforePasteSelection(sender);
		}
	});

	Commands.registerCommand('confirm',{
		parameters: [],
		run(sender) {
			Sessions.confirmAction(sender,true);
		}
	});

	Commands.registerCommand('cancel',{
		parameters: [],
		run(sender) {
			Sessions.confirmAction(sender,false);
		}
	});

	Commands.registerCommand('copy',{
		parameters: [],
		run(sender) {
			Sessions.copySelection(sender);
		}
	});

	Commands.registerCommand('selection', {
		description: '',
		parameters: [
			{
				type: 'string',
				choice: {
					clear: [],
					translate: [
						{
							id: 'x',
							type: 'number'
						},
						{
							id: 'y',
							type: 'number'
						},
						{
							id: 'z',
							type: 'number'
						}
					],
					extend: [
						{
							id: 'x',
							type: 'number'
						},
						{
							id: 'y',
							type: 'number'
						},
						{
							id: 'z',
							type: 'number'
						},
						{
							id:'bothWays',
							type: 'boolean',
							optional: true
						}
					],
					shrink: [
						{
							id: 'x',
							type: 'number'
						},
						{
							id: 'y',
							type: 'number'
						},
						{
							id: 'z',
							type: 'number'
						},
						{
							id:'bothWays',
							type: 'boolean',
							optional: true
						}
					],
					rotate: [
						{
							id: 'x',
							type: 'number'
						},
						{
							id: 'y',
							type: 'number'
						},
						{
							id: 'z',
							type: 'number'
						}
					]
				}
			}
		],
		run(sender, parameters) {
			Sessions.clearSelections(sender);
		}
	});

	Commands.registerCommand('config', {
		description: '',
		parameters: [
		],
		run: Sessions.userConfig
	});

	Commands.registerCommand('idk', {
		parameters: [
			{
				type: 'pos',
				id: 'location'
			},
			{
				type: 'str',
				id: 'blockId'
			},
			{
				type: 'int',
				id: 'size'
			}
		],
		senderCheck: isAdmin,
		/**
		 *
		 * @param {Mc.Player} sender
		 * @param {*} parameters
		 */
		run(sender, parameters) {
			try {
				const blocks = [];
				generateBlockArea(
					parameters.location,
					parameters.size,
					(location) => {
						blocks.push(location);
					}
				);
				for (let index = 0; index < blocks.length; index++) {
					const block = blocks[index];
					setBlockType(
						sender.dimension.getBlock(block),
						Mc.MinecraftBlockTypes.get(parameters.blockId),
						{actorId:sender.id}
					);
				}
				sendMessage('Successfully generated the thing!', 'CMD', sender);
			} catch (error) {
				logMessage(error);
			}
		}
	});
}
export {Commands};
