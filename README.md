# Trebesin-MC

Toto je repozitář obsahující plugin kód pro Minecraft server Třebešína s replikou školy. Do kódu patří skripty, gameplay customizace a resource packy.

## Pravidla Codebase pro JS Pluginy

Zde se nachází důležité informace pro možnou kolaboraci na projektu vrámci skriptování a pluginů.
Za tento vývoj je zoodpovědný a vede ho Pavel Dobiáš (Discord: **PavelDobCZ23#5726**), pokud máte jakékoliv dotazy, obracet na mě.

### Struktura složek

Všechny skriptovací soubory se nachází ve složce `/development_behavior_packs/Trebesin Mod [BP]/scripts` (dále jen *kořenový adresář).

V kořenovém adresáři jsou **2** soubory a **3** složky. Soubory jsou `main.js` a `config.js`, slouží příslušně ke spouštění pluginů a k exportaci globálních konfigurací. Složky jsou `plugins`, `mc_modules` a `js_modules`, slouží příslušně k uchování souborů pluginů, doplňujících skriptů závisejících na Minecraft Script-API a nezávislých doplňujících skriptů.

Každý

