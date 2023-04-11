const fs = require('fs');
const path = require('path');
const process = require('process');

async function copyBlock(source, target, langDefinitions){
    outputFile = fs.readFile(path.join(target.resourceFolder, '\\textures\\terrain_texture.json'), )
    if(outputFile['texture_data'][source.id] != null){
        process.stdout.write(`id is already it the target file...\nAborting action`)
        process.exit()
    }
    fs.cpSync(path.join(source.behaviorFolder, '\\blocks\\'), path.join(target.behaviorFolder, '\\blocks\\'));
    fs.cpSync(path.join(source.resourceFolder, '\\models\\blocks\\'), path.join(target.resourceFolder, '\\models\\blocks\\'));
    fs.cpSync(path.join(source.resourceFolder, '\\textures\\blocks\\'), path.join(target.resourceFolder, '\\textures\\blocks\\'));
    sourceFile = fs.readFileSync(path.join(source.resourceFolder, '\\textures\\terrain_texture.json'))
    sourceFile = sourceFile.toString()
    sourceFile = JSON.parse(sourceFile)
    outputFile = outputFile.toString()
    outputFile = JSON.parse(outputFile)
    outputFile['texture_data'][source.id] = sourceFile['texture_data'][source.id]
    fs.writeFileSync(path.join(target.resourceFolder, '\\textures\\terrain_texture.json'), JSON.stringify(outputFile, null, 2))
    for (const language of langDefinitions) {
        const languagePath = path.join(packDefinition.resourceFolder,`\\texts\\${language.langId}.lang`);
        fs.appendFileSync(languagePath, `tile.${target.namespace}:${source.id}.name =${language.text}`)
    }
}

async function main() {
    let source = {}
    let target = {}
    source.id = await askForInput('What is the source ID of the block?');
    source.namespace = await askForInput('What is the source namespace of the add-on?');
    target.id = source.id
    //target.id = await askForInput('What is the source ID of the block?');
    target.namespace = source.namespace
    //target.namespace = await askForInput('What is the source namespace of the add-on?');
    source.behaviorFolder = await askForInput('What is the file path to the root of the source behavior pack?');
    source.resourceFolder = await askForInput('What is the file path to the root of the source resource pack?');
    target.behaviorFolder = await askForInput('What is the file path to the root of the target behavior pack?');
    target.resourceFolder = await askForInput('What is the file path to the root of the target resource pack?');
    const langDefinitions = [];
    let langInput = true;
    while (langInput) {
        const input = await askForInput('Define language information for the blocks for target in such format: "ln_ID=Some text",type "done" when you are done.');
        if (input === 'done') {
            langInput = false;
        } else {
            const language = input.split('=')[0];
            const text = input.split('=').slice(1).join('=');
            langDefinitions.push({langId:language,text:text})
        }
    }
    process.stdout.write(langDefinitions);
    process.stdout.write('Block successfully generated!');
    process.exit()
}

await main();