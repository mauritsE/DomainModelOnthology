import { IComponent, getStudioProApi } from "@mendix/extensions-api";

export const component: IComponent = {
    async loaded(componentContext) {
        const studioPro = getStudioProApi(componentContext);
        
        // Add a menu item to the Extensions menu
        await studioPro.ui.extensionsMenu.add({
            menuId: "DomainModelOnthology.MainMenu",
            caption: "Domain Model Ontology",
            subMenus: [
                { menuId: "DomainModelOnthology.ShowOntology", caption: "Show Ontology Viewer" },
            ],
        });

        // Open a tab when the menu item is clicked
        studioPro.ui.extensionsMenu.addEventListener(
            "menuItemActivated",
            async (args) => {
                if (args.menuId === "DomainModelOnthology.ShowOntology") {
                    // Open the tab - the UI will fetch its own data
                    studioPro.ui.tabs.open(
                        {
                            title: "Domain Model Ontology"
                        },
                        {
                            componentName: "extension/DomainModelOnthology",
                            uiEntrypoint: "tab",
                        }
                    );
                }
            }
        );
    }
};

