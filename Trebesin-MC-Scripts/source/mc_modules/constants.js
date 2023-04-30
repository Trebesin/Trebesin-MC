export const DIMENSION_IDS = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
export const FACE_DIRECTIONS = {
    west: { x: -1, y: 0, z: 0 },
    east: { x: 1, y: 0, z: 0 },
    down: { x: 0, y: -1, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    north: { x: 0, y: 0, z: -1 },
    south: { x: 0, y: 0, z: 1 }
};
export const TREBESIN_PERMUTATIONS = {
    'trebesin:direction': null,
    'trebesin:vertical_direction': null,
    'trebesin:horizontal_direction': null
};
export const DIRECTIONS = [
    { x: -1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: 1 }
];
export const EDGE_AXES = [
    ['x', 'y'],
    ['x', 'z'],
    ['y', 'z']
];
export const EDGE_COORDS = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
];
export const BLOCK_STATE_COMPONENTS = [
    'inventory',
    'sign'
];
export const ITEM_STATE_COMPONENTS = [
    'durability',
    'enchantments'
];
