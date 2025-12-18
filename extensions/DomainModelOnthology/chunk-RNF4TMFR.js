var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@mendix/extensions-api/dist/index.js
import { getComponentFramework as p } from "@mendix/component-framework";
import { getComponentFramework as d } from "@mendix/component-framework";
import { getModelAccessWithComponentProxy as o } from "@mendix/model-access-sdk";
function s(i) {
  const e = p(i);
  return {
    ui: {
      messageBoxes: e.getApi("mendix.MessageBoxApi"),
      tabs: e.getApi("mendix.TabApi"),
      panes: e.getApi("mendix.DockablePaneApi"),
      extensionsMenu: e.getApi("mendix.ExtensionsMenuApi"),
      preferences: e.getApi("mendix.PreferencesApi"),
      dialogs: e.getApi("mendix.DialogApi"),
      notifications: e.getApi("mendix.NotificationApi"),
      editors: e.getApi("mendix.EditorApi"),
      elementSelectors: e.getApi("mendix.ElementSelectorApi"),
      versionControl: e.getApi("mendix.VersionControlApi"),
      appExplorer: e.getApi("mendix.AppExplorerApi"),
      documents: e.getApi("mendix.DocumentEditorApi"),
      messagePassing: e.getApi("mendix.MessagePassingApi")
    },
    app: {
      commands: e.getApi("mendix.CommandRegistrationApi"),
      files: e.getApi("mendix.AppFilesApi"),
      model: {
        domainModels: o(
          "mendix.DomainModelApi",
          "DomainModels$DomainModel",
          i
        ),
        pages: o(
          "mendix.PageApi",
          "Pages$Page",
          i
        ),
        enumerations: o(
          "mendix.EnumerationApi",
          "Enumerations$Enumeration",
          i
        ),
        snippets: o(
          "mendix.SnippetApi",
          "Pages$Snippet",
          i
        ),
        buildingBlocks: o(
          "mendix.BuildingBlockApi",
          "Pages$BuildingBlock",
          i
        ),
        projects: e.getApi("mendix.ProjectApi"),
        moduleSettings: o(
          "mendix.ModuleSettingsApi",
          "Projects$ModuleSettings",
          i
        ),
        microflows: o(
          "mendix.MicroflowModelApi",
          "Microflows$Microflow",
          i
        ),
        customBlobDocuments: e.getApi("mendix.CustomBlobDocumentApi"),
        importMappings: o(
          "mendix.ImportMappingModelApi",
          "ImportMappings$ImportMapping",
          i
        ),
        exportMappings: o(
          "mendix.ExportMappingModelApi",
          "ExportMappings$ExportMapping",
          i
        ),
        jsonStructures: o(
          "mendix.JsonStructureModelApi",
          "JsonStructures$JsonStructure",
          i
        ),
        messageDefinitions: o(
          "mendix.MessageDefinitionModelApi",
          "MessageDefinitions$MessageDefinitionCollection",
          i
        ),
        xmlSchemas: o(
          "mendix.XmlSchemaModelApi",
          "XmlSchemas$XmlSchema",
          i
        )
      }
    },
    network: {
      httpProxy: e.getApi("mendix.HttpProxyApi")
    }
  };
}

export {
  __commonJS,
  __toESM,
  s
};
//# sourceMappingURL=chunk-RNF4TMFR.js.map
