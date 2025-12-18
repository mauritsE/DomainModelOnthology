import {
  s
} from "./chunk-RNF4TMFR.js";

// src/main/index.ts
var component = {
  async loaded(componentContext) {
    const studioPro = s(componentContext);
    await studioPro.ui.extensionsMenu.add({
      menuId: "DomainModelOnthology.MainMenu",
      caption: "Domain Model Ontology",
      subMenus: [
        { menuId: "DomainModelOnthology.ShowOntology", caption: "Show Ontology Viewer" }
      ]
    });
    studioPro.ui.extensionsMenu.addEventListener(
      "menuItemActivated",
      async (args) => {
        if (args.menuId === "DomainModelOnthology.ShowOntology") {
          studioPro.ui.tabs.open(
            {
              title: "Domain Model Ontology"
            },
            {
              componentName: "extension/DomainModelOnthology",
              uiEntrypoint: "tab"
            }
          );
        }
      }
    );
  }
};
export {
  component
};
//# sourceMappingURL=main.js.map
