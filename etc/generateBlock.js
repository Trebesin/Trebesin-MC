const fs = require('fs');
const path = require('path');
const process = require('process');

/**
 * @param {string} id - Path to the block texture as well as the ID used within the block.
 * @param {object} packDefinition - Contains information about the pack.
 * @param {string} packDefinition.resourceFolder - Exact file path to the root folder of the resource pack.
 * @param {string} packDefinition.behaviorFolder - Exact file path to the root folder of the behavior pack.
 * @param {string} packDefinition.namespace - Namespace of the project used within the IDs.
 * @param {Object[]} languageDefinitions - Contains information about the translations.
 * @param {string} languageDefinitions[].langId - Language ID.
 * @param {string} languageDefinitions[].text - Translation string.
 * @param {boolean} onGround - Whether to make teh block placeable on the ground.
 * @returns {undefined}
 */
function generateBlock(id,packDefinition,languageDefinitions) {
    const terrainTexturePath = path.join(packDefinition.resourceFolder,'\\textures\\terrain_texture.json');
    let terrainTexture = JSON.parse(fs.readFileSync(terrainTexturePath));
    const textureData = terrainTexture.texture_data;
    textureData[`${packDefinition.namespace}.image_${id}`] = {};
    textureData[`${packDefinition.namespace}.image_${id}`].textures = `textures/blocks/${id}`;
    terrainTexture = JSON.stringify(terrainTexture,null,2);
    fs.writeFileSync(terrainTexturePath,terrainTexture);

    const blocksPath = path.join(packDefinition.resourceFolder,'\\blocks.json');
    let blocks = JSON.parse(fs.readFileSync(blocksPath));
    blocks[`${packDefinition.namespace}:imageboard_${id}`] = {};
    blocks[`${packDefinition.namespace}:imageboard_${id}`].sounds = 'wood';
    blocks[`${packDefinition.namespace}:imageboard_${id}`].textures = {};
    const textures = blocks[`${packDefinition.namespace}:imageboard_${id}`].textures;
    textures.north = `${packDefinition.namespace}.image_${id}`;
    textures.south = `${packDefinition.namespace}.image_${id}`;
    textures.west = 'wood_oak';
    textures.east = 'wood_oak';
    textures.up = 'wood_oak';
    textures.down = 'wood_oak';
    blocks = JSON.stringify(blocks,null,2);
    fs.writeFileSync(blocksPath,blocks);

    const blockDefinitionPath = path.join(packDefinition.behaviorFolder,`\\blocks\\imageboard_${id}.json`);
    const blockDefinition = `{
        "format_version": "1.19.0",
        "minecraft:block": {
            "description": {
                "identifier": "${packDefinition.namespace}:imageboard_${id}",
                "properties": {
                    "${packDefinition.namespace}:direction": [0, 1, 2, 3, 4, 5, 6],
                    "${packDefinition.namespace}:ground_rotation": [2, 3, 4, 5, 6]
                },
                "is_experimental": true,
                "register_to_creative_menu": true,
                "menu_category": {
                    "category": "construction"
                }
            },
            "components": {
                "minecraft:geometry": "geometry.imageboard",
                "minecraft:destroy_time": 0.0,
                "minecraft:block_light_filter": 0,
                "minecraft:collision_box": {
                    "origin": [-8,0,-8],
                    "size": [16,16,1]
                },
                "minecraft:selection_box": {
                    "origin": [-8,0,-8],
                    "size": [16,16,1]
                },
                "minecraft:material_instances": {
                    "south": {
                        "texture": "image_${id}",
                        "render_method": "alpha_test"
                    },
                    "north": {
                        "texture": "image_${id}",
                        "render_method": "alpha_test"
                    },
                    "*": {
                        "texture": "wood_oak",
                        "render_method": "alpha_test"
                    }
                },
                "minecraft:on_player_placing": {
                    "event": "${packDefinition.namespace}:set_rotation",
                    "target": "self"
                },
                "minecraft:creative_category": {
                    "category": "construction"
                }
            },
            "events": {
                "${packDefinition.namespace}:set_rotation": {
                    "set_block_property": {
                        "${packDefinition.namespace}:direction": "q.block_face",
                        "${packDefinition.namespace}:ground_rotation": "q.cardinal_facing_2d"
                    }
                }
            },
            "permutations": [
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 0.0 && (q.block_property('${packDefinition.namespace}:ground_rotation') == 2.0 || q.block_property('${packDefinition.namespace}:ground_rotation') == 6.0)",
                    "components": {
                        "minecraft:rotation": [
                            90,
                            0,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 0.0 && q.block_property('${packDefinition.namespace}:ground_rotation') == 3.0",
                    "components": {
                        "minecraft:rotation": [
                            90,
                            180,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 0.0 && q.block_property('${packDefinition.namespace}:ground_rotation') == 4.0",
                    "components": {
                        "minecraft:rotation": [
                            90,
                            90,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 0.0 && q.block_property('${packDefinition.namespace}:ground_rotation') == 5.0",
                    "components": {
                        "minecraft:rotation": [
                            90,
                            270,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 1.0 && (q.block_property('${packDefinition.namespace}:ground_rotation') == 2.0 || q.block_property('${packDefinition.namespace}:ground_rotation') == 6.0)",
                    "components": {
                        "minecraft:rotation": [
                            270,
                            0,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 1.0 && q.block_property('${packDefinition.namespace}:ground_rotation') == 3.0",
                    "components": {
                        "minecraft:rotation": [
                            270,
                            180,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 1.0 && q.block_property('${packDefinition.namespace}:ground_rotation') == 4.0",
                    "components": {
                        "minecraft:rotation": [
                            270,
                            90,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 1.0 && q.block_property('${packDefinition.namespace}:ground_rotation') == 5.0",
                    "components": {
                        "minecraft:rotation": [
                            270,
                            270,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 2.0 || q.block_property('${packDefinition.namespace}:direction') == 6.0",
                    "components": {
                        "minecraft:rotation": [
                            0,
                            180,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 3.0",
                    "components": {
                        "minecraft:rotation": [
                            0,
                            0,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 4.0",
                    "components": {
                        "minecraft:rotation": [
                            0,
                            270,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 5.0",
                    "components": {
                        "minecraft:rotation": [
                            0,
                            90,
                            0
                        ]
                    }
                },
                {
                    "condition": "q.block_property('${packDefinition.namespace}:direction') == 6.0",
                    "components": {
                        "minecraft:rotation": [
                            0,
                            0,
                            0
                        ]
                    }
                }
            ]
        }
    }`;
    fs.writeFileSync(blockDefinitionPath,blockDefinition);

    for (const language of languageDefinitions) {
        const languagePath = path.join(packDefinition.resourceFolder,`\\texts\\${language.langId}.lang`);
        fs.appendFileSync(languagePath,`tile.${packDefinition.namespace}:imageboard_${id}.name=${language.text}`);
    }
}

async function askForInput(message) {
    return new Promise((resolve => {
        process.stdout.write(message + '\n');
        process.stdin.once('data', data => resolve(data.toString().trim()));
    }));
}

async function main() {
    const id = await askForInput('What is the ID of the block?');
    const namespace = await askForInput('What is the namespace of the add-on?');
    const resourceFolder = await askForInput('What is the file path to the root of the resource pack?');
    const behaviorFolder = await askForInput('What is the file path to the root of the behavior pack?');
    const langDefinitions = [];
    let langInput = true;
    while (langInput) {
        const input = await askForInput('Define language information for the blocks in such format: "ln_ID=Some text",type "done" when you are done.');
        if (input === 'done') {
            langInput = false;
        } else {
            const language = input.split('=')[0];
            const text = input.split('=').slice(1).join('=');
            langDefinitions.push({langId:language,text:text})
        }
    }
    console.log(langDefinitions);
    generateBlock(id,{resourceFolder,behaviorFolder,namespace},langDefinitions);
    process.stdout.write('Block successfully generated!');
}

async function mainAutom() {
    const packDefinition= {
        resourceFolder:'D:\\Code\\Projects\\Trebesin\\MCBE Server Beta\\development_resource_packs\\Trebesin mod [RP]',
        behaviorFolder: 'D:\\Code\\Projects\\Trebesin\\MCBE Server Beta\\development_behavior_packs\\Trebesin Mod [BP]',
        namespace: 'trebesin'
    }
    const blocks = []
    for (const block of blocks) {
        generateBlock(block,packDefinition,[]);
    }
}

main();