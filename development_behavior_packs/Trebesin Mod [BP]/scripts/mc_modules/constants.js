const DIMENSION_IDS = ['minecraft:overworld','minecraft:nether','minecraft:the_end'];
const FACE_DIRECTIONS = {
    west: {x:-1,y:0,z:0},
    east: {x:1,y:0,z:0},
    down: {x:0,y:-1,z:0},
    up: {x:0,y:1,z:0},
    north: {x:0,y:0,z:-1},
    south: {x:0,y:0,z:1}
};
const TREBESIN_PERMUTATIONS = [
    {name:'trebesin:direction'},{name:'trebesin:vertical_direction'},{name:'trebesin:horizontal_direction'}
];
const DIRECTIONS = [
    {x:-1,y:0,z:0},
    {x:1,y:0,z:0},
    {x:0,y:-1,z:0},
    {x:0,y:1,z:0},
    {x:0,y:0,z:-1},
    {x:0,y:0,z:1}
]

const EDGE_AXES = [
    ['x','y'],
    ['x','z'],
    ['y','z']
]

const EDGE_COORDS = [
    [1,1],
    [-1,1],
    [1,-1],
    [-1,-1]
]

export {
    DIMENSION_IDS,
    FACE_DIRECTIONS,
    TREBESIN_PERMUTATIONS,
    DIRECTIONS,
    EDGE_AXES,
    EDGE_COORDS
}