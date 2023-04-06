//APIs:
import * as Mc from '@minecraft/server';
//Plugins:
import * as Sessions from './sessions';
import {editBlock, setBlockPermutation, setBlockType} from '../../block_history/block_history';
import {isAdmin} from '../../commands/workers/admin';
//Modules:
import {generateBlockArea} from '../../../mc_modules/blocks';
import {generateBlockPyramid} from '../../../js_modules/geometry';
import {CommandParser} from '../../../mc_modules/commandParser';
import {sendMessage} from '../../../mc_modules/players';
import * as VectorMath from '../../../js_modules/vectorMath';
import {logMessage} from '../../debug/debug';

const Commands = new CommandParser({
	prefix: '.',
	caseSensitive: false
});


export async function main() {
	Commands.registerCommand('restart', {
		description: 'Initializes the Blocky Tools session for the player that invokes the command.',
		parameters: [],
		run(sender) {
			Sessions.startSession(sender);
		}
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
			const session = Sessions.getSession(sender);
			session.switchPointer(pointerMode);
		}
	});

	Commands.registerCommand('fillSelectionCorners',{
		parameters: [{
			id:'fillBlock',
			type:'blockPermutation'
		}],
		run(sender,parameters) {
			const session = Sessions.getSession(sender);
			session.fillSelectionCorners(parameters.fillBlock.permutation);
		}
	});

	Commands.registerCommand('selectionMinMax',{
		parameters: [],
		run(sender) {
			const session = Sessions.getSession(sender);
			session.sendSelectionBounds();
		}
	});

	Commands.registerCommand('fillSelection',{
		parameters: [{
			id:'fillBlock',
			type:'blockPermutation'
		}],
		run(sender,parameters) {
			const session = Sessions.getSession(sender);
			session.fillSelection(parameters.fillBlock.permutation);
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
			//~ Changes userStates to exactMatch.
			const replacePermutations = [];
			for (let index = 0;index < parameters.replacePermutations.length; index++) {
				const replaceData = parameters.replacePermutations[index];
				replacePermutations.push({
					permutation: replaceData.permutation,
					exactMatch: replaceData.userStates
				});
			}
			const session = Sessions.getSession(sender);
			session.fillReplaceSelection(
				parameters.fillBlock,
				replacePermutations,
				parameters.replaceMode === 'exclude',
			)
		}
	});

	Commands.registerCommand('isInsideSelection',{
		parameters: [],
		run(sender) {
			const session = Sessions.getSession(sender);
			session.sendSelectionInside();
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
			const session = Sessions.getSession(sender);
			session.flip(parameters.axis);
		}
	});

	Commands.registerCommand('flipClipboard',{
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
			const session = Sessions.getSession(sender);
			const clipboard = session.getClipboard();
			const config = clipboard.getConfig(0);
			config.flip[parameters.axis] = !config.flip[parameters.axis];
			clipboard.updateParticlePreview(0);
			//session.flipClipboard(parameters.axis);
		}
	});

	Commands.registerCommand('rotateClipboard',{
		parameters: [
			{
				id:'angle',
				type:'integer'
			},
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
			const session = Sessions.getSession(sender);
			const clipboard = session.getClipboard();
			const config = clipboard.getConfig(0);
			config.rotation[parameters.axis] += parameters.angle;
			clipboard.updateParticlePreview(0);
			//session.rotateClipboard(parameters.angle,parameters.axis);
		}
	});

	Commands.registerCommand('scaleClipboard',{
		parameters: [
			{
				id:'scale',
				type:'float'
			},
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
			const session = Sessions.getSession(sender);
			const clipboard = session.getClipboard();
			const config = clipboard.getConfig(0);
			config.scale[parameters.axis] = parameters.scale;
			clipboard.updateParticlePreview(0);
			//session.scaleClipboard(parameters.scale,parameters.axis);
		}
	});

	Commands.registerCommand('setblock',{
		parameters: [
			{
				id:'fillBlock',
				type:'blockPermutation'
			},
			{
				id:'location',
				type:'position'
			}
		],
		run(sender,parameters) {
			setBlockPermutation(
				sender.dimension.getBlock(parameters.location),
				parameters.fillBlock.permutation,
				{actorId:sender.id,updateType:'blockyTools: player'}
			);
		}
	});

	Commands.registerCommand('paste',{
		parameters: [],
		run(sender) {
			const session = Sessions.getSession(sender);
			session.preparePasteSelection(VectorMath.copy(session.pointerBlockLocation));
		}
	});

	Commands.registerCommand('confirm',{
		parameters: [],
		run(sender) {
			const session = Sessions.getSession(sender);
			session.setActionConfirmation(true);
		}
	});

	Commands.registerCommand('cancel',{
		parameters: [],
		run(sender) {
			const session = Sessions.getSession(sender);
			session.setActionConfirmation(false);
		}
	});

	Commands.registerCommand('copy',{
		parameters: [],
		run(sender) {
			const session = Sessions.getSession(sender);
			session.copySelection();
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
							type: 'integer'
						},
						{
							id: 'y',
							type: 'integer'
						},
						{
							id: 'z',
							type: 'integer'
						}
					],
					extend: [
						{
							id: 'x',
							type: 'integer'
						},
						{
							id: 'y',
							type: 'integer'
						},
						{
							id: 'z',
							type: 'integer'
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
							type: 'integer'
						},
						{
							id: 'y',
							type: 'integer'
						},
						{
							id: 'z',
							type: 'integer'
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
							type: 'integer'
						},
						{
							id: 'y',
							type: 'integer'
						},
						{
							id: 'z',
							type: 'integer'
						}
					]
				}
			}
		],
		run(sender, parameters) {
			const session = Sessions.getSession(sender);
		}
	});

	Commands.registerCommand('moveClipboard', {
		description: '',
		parameters: [
			{
				id: 'x',
				type: 'float'
			},
			{
				id: 'y',
				type: 'float'
			},
			{
				id: 'z',
				type: 'float'
			}
		],
		run(sender,parameters) {
			const session = Sessions.getSession(sender);
			const clipboard = session.getClipboard();
			clipboard.translateLocations({
				x: parameters.x,
				y: parameters.y,
				z: parameters.z
			},0);
			clipboard.updateParticlePreview(0);
		}
	});

	Commands.registerCommand('movePasteOrigin', {
		description: '',
		parameters: [
			{
				id: 'x',
				type: 'float'
			},
			{
				id: 'y',
				type: 'float'
			},
			{
				id: 'z',
				type: 'float'
			}
		],
		run(sender,parameters) {
			const session = Sessions.getSession(sender);
			if (session.pasteState.originLocation == null) {
				sendMessage('§nNo paste action!','§2BT§r',sender)
				return;
			}
			session.pasteState.originLocation = VectorMath.sum(
				session.pasteState.originLocation,
				{
					x: parameters.x,
					y: parameters.y,
					z: parameters.z
				}
			);
		}
	});

	Commands.registerCommand('getClipboardBounds', {
		description: '',
		parameters: [],
		run(sender) {
			const session = Sessions.getSession(sender);
			const clipboard = session.getClipboard();
			const bounds = clipboard.getBounds(0);
			sendMessage(`Sending Clipboard Bounds:`,'§2BT§r',sender);
			sendMessage(`MAX: §mX:${bounds.max.x} §qY:${bounds.max.y} §tZ:${bounds.max.z}`,'§2BT§r',sender);
			sendMessage(`CENTER: §mX:${bounds.center.x} §qY:${bounds.center.y} §tZ:${bounds.center.z}`,'§2BT§r',sender);
			sendMessage(`MIN: §mX:${bounds.min.x} §qY:${bounds.min.y} §tZ:${bounds.min.z}`,'§2BT§r',sender);
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
