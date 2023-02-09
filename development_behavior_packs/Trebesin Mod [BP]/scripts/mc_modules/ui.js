import {ModalFormData, MessageFormData, ActionFormData} from "@minecraft/server-ui";

//Form with title, accepts text fields, toggles, sliders, graphical icons and dropdown menus
const modalMenuData = {
    title: "Example Title",
    withIds: false,
    structure: [
        {
            type: "toggle",
            label: "Hello World",
            defaultValue: true,

        },
        {
            type: "textField",
            label: "Hello World",
            defaultValue: "",
            placeholderText: "Insert Hello World!"
        },
        {
            type: "slider",
            label: "Hello World",
            defaultValue: 1,
            minimalValue: 1,
            maximalValue: 100,
            valueStep: 10
        },
        {
            type: "icon",
            iconPath: "/textures/blocks/grass"
        },
        {
            type: "dropdown",
            label: "Hello World",
            defaultValueIndex: 0,
            options: [
                "Hello",
                "There"
            ]
        }
    ]
}

//Form with body, title and 2 buttons
const messageMenuData = {
    title: "Example Title",
    body: "Example Body",
    button1: "Hello World",
    button2: "Goodbye World"
}

//Form with body and title, accepts only buttons with icons
const actionMenuData = {
    title: "Example Title",
    body: "Example Body",
    withIds: true,
    structure: [
        {
            id: "testId",
            text: "Hello World",
            iconPath: "/textures/blocks/grass"
        }
    ]
}

//!add new features forced shit yk the drill
//Async

export async function modalMenu(menuData,player) {
    let menu = new ModalFormData()
    .title(menuData.title);
    if (menuData.structure?.length === 0) throw new Error('No structure found!');
    for (let index = 0;index < menuData.structure.length;index++) {
        const element = menuData.structure[index];
        switch (element.type) {
            case "toggle":
                menu = menu.toggle(element.label, element.defaultValue);
                break
            case "textField":
                menu = menu.textField(element.label, element.placeholderText, element.defaultValue);
                break
            case "slider":
                menu = menu.slider(element.label, element.minimalValue, element.maximalValue, element.valueStep, element.defaultValue);
                break
            case "icon":
                menu = menu.icon(element.iconPath);
                break
            case "dropdown":
                menu = menu.dropdown(element.label, element.options, element.defaultValueIndex);
                break
            default: 
                console.warn(`[UI Parser]: Recieved invalid type of '${element.type}' during parsing! Element has been skipped*`)
        }
    }

    let formValues;
    const response = await menu.show(player);
    if (menuData.withIds) {
        formValues = {};
        for (let index = 0;index < response.formValues.length;index++) {
            const formValue = response.formValues[index];
            const elementId = menuData.structure[index].id;
            formValues[elementId] = formValue;
        }
    } else {
        formValues = response.formValues;
    }
    
    return { canceled:response.canceled, cancelationReason:response.cancelationReason, formValues }
}

export async function actionMenu(menuData, player) {
    let menu = new ActionFormData()
    .title(menuData.title)
    .body(menuData.body);
    for (const button of menuData.structure) {
        menu = menu.button(button.text,button.iconPath);
    }

    let selection;
    const response = await menu.show(player);
    if (menuData.withIds) {
        selection = {};
        selection.index = response.selection;
        selection.id = menuData.structure[response.selection].id;
    } else {
        selection = response.selection;
    }

    return {
        canceled: response.canceled,
        cancelationReason: response.cancelationReason,
        selection
    }
}

export async function messageMenu(menuData, player) {
    const menu = new MessageFormData()
    .title(menuData.title)
    .body(menuData.body)
    .button1(menuData.button1)
    .button2(menuData.button2);

    const response = await menu.show(player);

    return response
}