# Trebesin-MC

Toto je repozitář obsahující plugin kód pro Minecraft server Třebešína s replikou školy. Do kódu patří skripty, gameplay customizace a resource packy.

## Pravidla Codebase pro Skriptování Pluginů

Zde se nachází důležité informace pro možnou kolaboraci na projektu vrámci skriptování a pluginů.

### Struktura složek

Všechny skriptovací soubory se nachází ve složce `/development_behavior_packs/Trebesin Mod [BP]/scripts` (dále jen *kořenový adresář).

V kořenovém adresáři jsou **2** soubory a **3** složky. Soubory jsou `main.js` a `config.js`, slouží příslušně ke spouštění pluginů a k exportaci globálních konfigurací. Složky jsou `plugins`, `mc_modules` a `js_modules`, slouží příslušně k uchování souborů pluginů, doplňujících skriptů závisejících na Minecraft Script-API a nezávislých doplňujících skriptů.

Každý plugin má svoji složku v adresáři `plugins`, v této složce se nachází hlavní spouštěcí soubor s téže názvem.
Plugin může mít ve svém vlastním adresáři složku `workers`, která obsahuje soubory, které dělí funkcionalitu pluginu. Ty se pak dají importovat do hlavního souboru pluginu pro zpracování.

Ve složkách `mc_modules` a `js_modules` se nachází soubory s doplňujícími funkcemi, ke kterým má každý plugin přístup. Je zde mnoho pomocných funkcí co mohou usnadnit práci. Jediný rozdíl mezi `js_` a `mc_` složkou je ten, že `mc_` má funkce závislé na Minecraft APIs, mezitím co `js_` jsou nezávislém funkce v čistém JS. Soubory v těchto složkách jsou pojmenovány podle kategorií problémů, které funkce v nich řeší.

### Pluginy

Tento soubor musí obsahovat minimálně 2 exporty, a to funkci `main` a variable `name`. Funkce `main` musí být asynchronizovaná a je to jediná funkce z celého pluginy co server spustí, zbytek si každý plugin spouští sám. Variable `name` je konstatní string, který je použit jako zobrazený název pluginu.

### Debugging

Minecraft má built-in debugger pro skriptování co funguje s TS. Tento debugger je dělaný pro použití ve VSCode a dá se [stáhnout jako rozšíření](https://marketplace.visualstudio.com/items?itemName=mojang-studios.minecraft-debugger). Tento debugger má již nastavené parametry v souboru `/.vscode/launch.json`, aby fungoval v našem prostředí. Ke spuštění debuggeru stačí spusit příkaz `script debugger listen` na serveru a připojit ve VSCodu debugger `Trebesin-MC Script Debug`.