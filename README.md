# Domain Model Ontology Viewer

A Mendix Studio Pro extension that visualizes the ontology of all domain models, entities, and their associations in your Mendix application.

![Mendix Studio Pro](https://img.shields.io/badge/Mendix%20Studio%20Pro-11.3+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Visual Graph Representation**: See all entities and their relationships displayed as an interactive graph
- **Multi-Module Filtering**: Select which modules to display with a convenient multi-select dropdown
- **Marketplace Module Filtering**: Marketplace modules are hidden by default to focus on your custom domain models
- **Entity Details Panel**: Click on any entity to view its attributes, associations, and generalizations
- **Search Functionality**: Quickly find entities by name or module
- **Interactive Navigation**: Pan, zoom, and drag entities to explore your domain model
- **Color-Coded Modules**: Each module is assigned a distinct color for easy identification
- **Association Visualization**: 
  - Solid lines for regular associations
  - Dashed lines for reference sets (N:M relationships)
  - Highlighted cross-module associations

## Screenshots

*Coming soon*

## Requirements

- Mendix Studio Pro 11.3 or higher
- Node.js 18+ (for building)

## Installation

### From Release

1. Download the latest zip release from the [Releases](../../releases) page
2. unzip the folder
3. place the folder in your <app>/extensions/ folder
### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/mauritsE/DomainModelOnthology.git
   cd DomainModelOnthology
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. The built extension will be available in the `dist/` folder as `DomainModelOnthology.mxext`

5. Install the extension in Mendix Studio Pro

## Usage

1. Open your Mendix project in Studio Pro
2. Go to **View** → **Domain Model Ontology** → **Show Ontology Viewer**
3. A new tab will open displaying the ontology graph

### Controls

| Control | Action |
|---------|--------|
| **Click entity** | Show entity details |
| **Drag entity** | Reposition entity node |
| **Scroll wheel** | Zoom in/out |
| **Drag background** | Pan the view |
| **+ / - buttons** | Zoom in/out |
| **Reset View** | Reset zoom and pan to default |
| **🔄 Refresh** | Reload data from the model |

### Module Filter

- Click the **Modules** dropdown to select which modules to display
- Use quick-select buttons:
  - **All**: Show all modules including marketplace
  - **Non-Marketplace**: Show only your custom modules (default)
  - **None**: Hide all modules
- Marketplace modules are marked with an "MP" badge

## Development

### Project Structure

```
├── src/
│   ├── main/
│   │   └── index.ts      # Extension entry point (menu registration)
│   ├── ui/
│   │   └── index.tsx     # React UI component
│   └── manifest.json     # Extension manifest
├── build-extension.mjs   # Build script
├── package.json
└── tsconfig.json
```

### Building

```bash
# Type check and build
npm run build

# Watch mode (if available)
npm run watch
```

### Technologies

- **TypeScript** - Type-safe development
- **React 18** - UI components
- **Mendix Extensions API** - Integration with Studio Pro
- **esbuild** - Fast bundling

## API Reference

This extension uses the following Mendix Extensions APIs:

- `studioPro.ui.extensionMenu` - Adding menu items
- `studioPro.ui.tabs` - Opening custom tabs
- `studioPro.app.model.projects.getModules()` - Fetching module list
- `studioPro.app.model.domainModels.getDomainModel()` - Fetching domain model data

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [Mendix Extensions API](https://docs.mendix.com/apidocs-mxsdk/extensions-api/)
- Inspired by the need to visualize complex domain model relationships
