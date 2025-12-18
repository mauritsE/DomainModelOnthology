import React, { StrictMode, useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { IComponent, getStudioProApi, DomainModels } from "@mendix/extensions-api";

// Types for ontology data
interface OntologyEntity {
    id: string;
    name: string;
    moduleName: string;
    qualifiedName: string;
    attributes: Array<{
        name: string;
        type: string;
    }>;
    generalization: string | null;
}

interface OntologyAssociation {
    id: string;
    name: string;
    parentEntity: string;
    childEntity: string;
    type: string;
    owner: string;
    isCrossModule: boolean;
}

interface ModuleInfo {
    name: string;
    isMarketplace: boolean;
    isSystem: boolean;
}

interface OntologyData {
    entities: OntologyEntity[];
    associations: OntologyAssociation[];
    modules: ModuleInfo[];
}

// Node position type
interface NodePosition {
    x: number;
    y: number;
}

// Graph node with position
interface GraphNode extends OntologyEntity {
    position: NodePosition;
}

// Helper function to get attribute type name
function getAttributeTypeName(type: DomainModels.AttributeType): string {
    switch (type.$Type) {
        case "DomainModels$StringAttributeType":
            return "String";
        case "DomainModels$IntegerAttributeType":
            return "Integer";
        case "DomainModels$LongAttributeType":
            return "Long";
        case "DomainModels$DecimalAttributeType":
            return "Decimal";
        case "DomainModels$BooleanAttributeType":
            return "Boolean";
        case "DomainModels$DateTimeAttributeType":
            return "DateTime";
        case "DomainModels$AutoNumberAttributeType":
            return "AutoNumber";
        case "DomainModels$BinaryAttributeType":
            return "Binary";
        case "DomainModels$HashedStringAttributeType":
            return "HashedString";
        case "DomainModels$EnumerationAttributeType":
            return "Enumeration";
        default:
            return "Unknown";
    }
}

// Function to collect ontology data directly from the API
async function collectOntologyData(studioPro: ReturnType<typeof getStudioProApi>): Promise<OntologyData> {
    const entities: OntologyEntity[] = [];
    const associations: OntologyAssociation[] = [];
    const moduleInfos: ModuleInfo[] = [];
    
    // Get all modules
    const modules = await studioPro.app.model.projects.getModules();
    
    // First pass: collect all entities and build the ID mapping
    for (const module of modules) {
        moduleInfos.push({
            name: module.name,
            isMarketplace: module.fromAppStore,
            isSystem: module.name === "System" || module.name === "MxModelReflection"
        });
        
        // Get domain model for each module
        const domainModel = await studioPro.app.model.domainModels.getDomainModel(module.name);
        
        if (domainModel) {
            // Collect entities
            for (const entity of domainModel.entities) {
                const qualifiedName = `${module.name}.${entity.name}`;
                
                // Get generalization info
                let generalization: string | null = null;
                if (entity.generalization.$Type === "DomainModels$Generalization") {
                    const gen = entity.generalization as DomainModels.Generalization;
                    generalization = gen.generalization;
                }
                
                entities.push({
                    id: entity.$ID,
                    name: entity.name,
                    moduleName: module.name,
                    qualifiedName,
                    attributes: entity.attributes.map((attr: DomainModels.Attribute) => ({
                        name: attr.name,
                        type: getAttributeTypeName(attr.type)
                    })),
                    generalization
                });
            }
            
            // Collect associations (within same module)
            for (const assoc of domainModel.associations) {
                associations.push({
                    id: assoc.$ID,
                    name: assoc.name,
                    parentEntity: assoc.parent,
                    childEntity: assoc.child,
                    type: assoc.type,
                    owner: assoc.owner,
                    isCrossModule: false
                });
            }
            
            // Collect cross-module associations
            for (const crossAssoc of domainModel.crossAssociations) {
                associations.push({
                    id: crossAssoc.$ID,
                    name: crossAssoc.name,
                    parentEntity: crossAssoc.parent,
                    childEntity: crossAssoc.child,
                    type: crossAssoc.type,
                    owner: crossAssoc.owner,
                    isCrossModule: true
                });
            }
        }
    }
    
    return {
        entities,
        associations,
        modules: moduleInfos
    };
}

// Mendix Studio Pro color palette
const MENDIX_COLORS = {
    primary: "#0595DB",       // Mendix Blue
    primaryDark: "#264AE5",   // Darker blue for accents
    background: "#252526",    // Dark background
    surface: "#2D2D30",       // Elevated surface
    surfaceLight: "#3C3C3C",  // Lighter surface
    border: "#3E3E42",        // Border color
    text: "#CCCCCC",          // Primary text
    textMuted: "#858585",     // Secondary text
    textBright: "#FFFFFF",    // Bright text
    success: "#76B947",       // Green
    warning: "#F0AD4E",       // Orange/Yellow
    error: "#E74856",         // Red
    canvas: "#1E1E1E"         // Canvas/editor background
};

// Module colors for visual distinction (Mendix-friendly palette)
const MODULE_COLORS = [
    "#0595DB", "#76B947", "#F0AD4E", "#9B59B6", "#E74856",
    "#00B8D4", "#FFD93D", "#8D6E63", "#78909C", "#EC407A",
    "#5C6BC0", "#26A69A", "#FFA726", "#9CCC65", "#7E57C2"
];

function getModuleColor(moduleName: string, modules: ModuleInfo[]): string {
    const index = modules.findIndex(m => m.name === moduleName);
    return MODULE_COLORS[index % MODULE_COLORS.length];
}

// Force-directed layout algorithm
function calculateLayout(entities: OntologyEntity[], associations: OntologyAssociation[]): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();
    const width = 1200;
    const height = 800;
    
    // Group entities by module
    const moduleGroups = new Map<string, OntologyEntity[]>();
    entities.forEach(entity => {
        const group = moduleGroups.get(entity.moduleName) || [];
        group.push(entity);
        moduleGroups.set(entity.moduleName, group);
    });
    
    // Calculate initial positions - arrange modules in a grid pattern
    const modules = Array.from(moduleGroups.keys());
    const modulesPerRow = Math.ceil(Math.sqrt(modules.length));
    const moduleWidth = width / modulesPerRow;
    const moduleHeight = height / Math.ceil(modules.length / modulesPerRow);
    
    modules.forEach((moduleName, moduleIndex) => {
        const moduleCol = moduleIndex % modulesPerRow;
        const moduleRow = Math.floor(moduleIndex / modulesPerRow);
        const moduleEntities = moduleGroups.get(moduleName) || [];
        
        const entitiesPerRow = Math.ceil(Math.sqrt(moduleEntities.length));
        const entityWidth = moduleWidth / (entitiesPerRow + 1);
        const entityHeight = moduleHeight / (Math.ceil(moduleEntities.length / entitiesPerRow) + 1);
        
        moduleEntities.forEach((entity, entityIndex) => {
            const entityCol = entityIndex % entitiesPerRow;
            const entityRow = Math.floor(entityIndex / entitiesPerRow);
            
            positions.set(entity.id, {
                x: moduleCol * moduleWidth + (entityCol + 1) * entityWidth,
                y: moduleRow * moduleHeight + (entityRow + 1) * entityHeight
            });
        });
    });
    
    // Apply simple force-directed adjustments
    const iterations = 50;
    const repulsionStrength = 5000;
    const attractionStrength = 0.01;
    
    for (let i = 0; i < iterations; i++) {
        const forces = new Map<string, { fx: number; fy: number }>();
        
        // Initialize forces
        entities.forEach(entity => {
            forces.set(entity.id, { fx: 0, fy: 0 });
        });
        
        // Repulsion between all nodes
        entities.forEach((entity1, idx1) => {
            entities.forEach((entity2, idx2) => {
                if (idx1 >= idx2) return;
                
                const pos1 = positions.get(entity1.id)!;
                const pos2 = positions.get(entity2.id)!;
                
                const dx = pos2.x - pos1.x;
                const dy = pos2.y - pos1.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const force = repulsionStrength / (distance * distance);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                
                const f1 = forces.get(entity1.id)!;
                const f2 = forces.get(entity2.id)!;
                
                f1.fx -= fx;
                f1.fy -= fy;
                f2.fx += fx;
                f2.fy += fy;
            });
        });
        
        // Attraction along edges
        associations.forEach(assoc => {
            const parentEntity = entities.find(e => e.id === assoc.parentEntity || e.qualifiedName === assoc.parentEntity);
            const childEntity = entities.find(e => e.id === assoc.childEntity || e.qualifiedName === assoc.childEntity);
            
            if (!parentEntity || !childEntity) return;
            
            const pos1 = positions.get(parentEntity.id);
            const pos2 = positions.get(childEntity.id);
            
            if (!pos1 || !pos2) return;
            
            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            
            const fx = dx * attractionStrength;
            const fy = dy * attractionStrength;
            
            const f1 = forces.get(parentEntity.id)!;
            const f2 = forces.get(childEntity.id)!;
            
            f1.fx += fx;
            f1.fy += fy;
            f2.fx -= fx;
            f2.fy -= fy;
        });
        
        // Apply forces
        entities.forEach(entity => {
            const pos = positions.get(entity.id)!;
            const force = forces.get(entity.id)!;
            
            pos.x = Math.max(100, Math.min(width - 100, pos.x + force.fx * 0.1));
            pos.y = Math.max(50, Math.min(height - 50, pos.y + force.fy * 0.1));
        });
    }
    
    return positions;
}

// Entity Node Component
interface EntityNodeProps {
    entity: GraphNode;
    isSelected: boolean;
    moduleColor: string;
    onClick: () => void;
    onDrag: (id: string, x: number, y: number) => void;
}

const EntityNode: React.FC<EntityNodeProps> = ({ entity, isSelected, moduleColor, onClick, onDrag }) => {
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    
    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - entity.position.x,
            y: e.clientY - entity.position.y
        };
        e.stopPropagation();
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging.current) {
            onDrag(entity.id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
        }
    }, [entity.id, onDrag]);
    
    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
    }, []);
    
    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    const nodeWidth = 180;
    const headerHeight = 28;
    const attributeHeight = 18;
    const nodeHeight = headerHeight + Math.max(entity.attributes.length, 1) * attributeHeight + 10;
    
    return (
        <g
            transform={`translate(${entity.position.x - nodeWidth / 2}, ${entity.position.y - nodeHeight / 2})`}
            style={{ cursor: "move" }}
            onMouseDown={handleMouseDown}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            {/* Shadow */}
            <rect
                x={3}
                y={3}
                width={nodeWidth}
                height={nodeHeight}
                rx={6}
                fill="rgba(0,0,0,0.4)"
            />
            {/* Background */}
            <rect
                width={nodeWidth}
                height={nodeHeight}
                rx={6}
                fill={MENDIX_COLORS.surface}
                stroke={isSelected ? MENDIX_COLORS.primary : moduleColor}
                strokeWidth={isSelected ? 3 : 2}
            />
            {/* Header */}
            <rect
                width={nodeWidth}
                height={headerHeight}
                rx={6}
                fill={moduleColor}
            />
            <rect
                y={headerHeight - 6}
                width={nodeWidth}
                height={6}
                fill={moduleColor}
            />
            {/* Entity name */}
            <text
                x={nodeWidth / 2}
                y={18}
                textAnchor="middle"
                fill={MENDIX_COLORS.textBright}
                fontWeight="bold"
                fontSize={12}
            >
                {entity.name}
            </text>
            {/* Module name */}
            <text
                x={nodeWidth / 2}
                y={headerHeight + 15}
                textAnchor="middle"
                fill={MENDIX_COLORS.textMuted}
                fontSize={9}
                fontStyle="italic"
            >
                {entity.moduleName}
            </text>
            {/* Attributes */}
            {entity.attributes.slice(0, 8).map((attr, idx) => (
                <text
                    key={attr.name}
                    x={10}
                    y={headerHeight + 30 + idx * attributeHeight}
                    fill={MENDIX_COLORS.text}
                    fontSize={10}
                >
                    {attr.name}: <tspan fill={MENDIX_COLORS.textMuted}>{attr.type}</tspan>
                </text>
            ))}
            {entity.attributes.length > 8 && (
                <text
                    x={10}
                    y={headerHeight + 30 + 8 * attributeHeight}
                    fill={MENDIX_COLORS.textMuted}
                    fontSize={10}
                    fontStyle="italic"
                >
                    ... +{entity.attributes.length - 8} more
                </text>
            )}
        </g>
    );
};

// Association Edge Component
interface AssociationEdgeProps {
    association: OntologyAssociation;
    sourcePos: NodePosition | undefined;
    targetPos: NodePosition | undefined;
    isHighlighted: boolean;
}

const AssociationEdge: React.FC<AssociationEdgeProps> = ({ association, sourcePos, targetPos, isHighlighted }) => {
    if (!sourcePos || !targetPos) return null;
    
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Offset to start/end at node edge
    const nodeRadius = 90;
    const offsetX = (dx / distance) * nodeRadius;
    const offsetY = (dy / distance) * nodeRadius;
    
    const x1 = sourcePos.x + offsetX;
    const y1 = sourcePos.y + offsetY;
    const x2 = targetPos.x - offsetX;
    const y2 = targetPos.y - offsetY;
    
    // Control point for curve
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const perpX = -(y2 - y1) * 0.1;
    const perpY = (x2 - x1) * 0.1;
    
    const pathD = `M ${x1} ${y1} Q ${midX + perpX} ${midY + perpY} ${x2} ${y2}`;
    
    const color = association.isCrossModule ? "#FF5722" : "#666";
    const strokeWidth = isHighlighted ? 3 : 1.5;
    
    // Calculate label position
    const labelX = midX + perpX;
    const labelY = midY + perpY;
    
    return (
        <g>
            <defs>
                <marker
                    id={`arrow-${association.id}`}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
            </defs>
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={association.type === "ReferenceSet" ? "5,5" : "none"}
                markerEnd={`url(#arrow-${association.id})`}
                opacity={isHighlighted ? 1 : 0.6}
            />
            {/* Association name label */}
            <text
                x={labelX}
                y={labelY - 5}
                textAnchor="middle"
                fill={color}
                fontSize={9}
                fontWeight={isHighlighted ? "bold" : "normal"}
            >
                {association.name}
            </text>
            {/* Multiplicity indicator */}
            <text
                x={labelX}
                y={labelY + 8}
                textAnchor="middle"
                fill={MENDIX_COLORS.textMuted}
                fontSize={8}
            >
                {association.type === "Reference" ? "1:N" : "N:M"}
            </text>
        </g>
    );
};

// Main Ontology Viewer Component
interface OntologyViewerProps {
    studioPro: ReturnType<typeof getStudioProApi>;
}

const OntologyViewer: React.FC<OntologyViewerProps> = ({ studioPro }) => {
    const [data, setData] = useState<OntologyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
    const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
    const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
    const [showModuleDropdown, setShowModuleDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowModuleDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    // Load data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Fetch data directly from the model API
                const ontologyData = await collectOntologyData(studioPro);
                setData(ontologyData);
                
                // Initialize selected modules - exclude marketplace and system modules by default
                const defaultModules = ontologyData.modules
                    .filter(m => !m.isMarketplace && !m.isSystem)
                    .map(m => m.name);
                setSelectedModules(new Set(defaultModules));
                
                // Calculate initial layout
                const initialPositions = calculateLayout(ontologyData.entities, ontologyData.associations);
                setPositions(initialPositions);
                
                setLoading(false);
            } catch (err) {
                setError(`Failed to load data: ${err}`);
                setLoading(false);
            }
        };
        
        loadData();
    }, [studioPro]);
    
    // Toggle module selection
    const toggleModule = (moduleName: string) => {
        setSelectedModules(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moduleName)) {
                newSet.delete(moduleName);
            } else {
                newSet.add(moduleName);
            }
            return newSet;
        });
    };
    
    // Select/deselect all modules
    const selectAllModules = (includeAll: boolean) => {
        if (data) {
            const modules = includeAll 
                ? data.modules.map(m => m.name)
                : data.modules.filter(m => !m.isMarketplace && !m.isSystem).map(m => m.name);
            setSelectedModules(new Set(modules));
        }
    };
    
    const deselectAllModules = () => {
        setSelectedModules(new Set());
    };
    
    // Handle node drag
    const handleNodeDrag = useCallback((id: string, x: number, y: number) => {
        setPositions(prev => {
            const newPositions = new Map(prev);
            newPositions.set(id, { x, y });
            return newPositions;
        });
    }, []);
    
    // Handle pan
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && e.target === svgRef.current) {
            isPanning.current = true;
            panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning.current) {
            setPan({
                x: e.clientX - panStart.current.x,
                y: e.clientY - panStart.current.y
            });
        }
    };
    
    const handleMouseUp = () => {
        isPanning.current = false;
    };
    
    // Handle zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.max(0.2, Math.min(3, prev * delta)));
    };
    
    // Filter entities
    const filteredEntities = data?.entities.filter(entity => {
        const moduleMatch = selectedModules.size === 0 || selectedModules.has(entity.moduleName);
        const searchMatch = searchTerm === "" || 
            entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entity.moduleName.toLowerCase().includes(searchTerm.toLowerCase());
        return moduleMatch && searchMatch;
    }) || [];
    
    const filteredEntityIds = new Set(filteredEntities.map(e => e.id));
    const filteredEntityQualifiedNames = new Set(filteredEntities.map(e => e.qualifiedName));
    
    // Filter associations
    const filteredAssociations = data?.associations.filter(assoc => {
        const parentMatch = filteredEntityIds.has(assoc.parentEntity) || filteredEntityQualifiedNames.has(assoc.parentEntity);
        const childMatch = filteredEntityIds.has(assoc.childEntity) || filteredEntityQualifiedNames.has(assoc.childEntity);
        return parentMatch && childMatch;
    }) || [];
    
    // Get highlighted associations
    const highlightedAssociations = selectedEntity ? 
        filteredAssociations.filter(a => 
            a.parentEntity === selectedEntity || 
            a.childEntity === selectedEntity ||
            filteredEntities.find(e => e.id === selectedEntity)?.qualifiedName === a.parentEntity ||
            filteredEntities.find(e => e.id === selectedEntity)?.qualifiedName === a.childEntity
        ) : [];
    
    const highlightedAssociationIds = new Set(highlightedAssociations.map(a => a.id));
    
    // Find entity position by ID or qualified name
    const getEntityPosition = (idOrQualifiedName: string): NodePosition | undefined => {
        // First try direct ID match
        if (positions.has(idOrQualifiedName)) {
            return positions.get(idOrQualifiedName);
        }
        // Then try qualified name match
        const entity = data?.entities.find(e => e.qualifiedName === idOrQualifiedName);
        if (entity) {
            return positions.get(entity.id);
        }
        return undefined;
    };
    
    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading domain model ontology...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div style={styles.errorContainer}>
                <h2>Error</h2>
                <p>{error}</p>
            </div>
        );
    }
    
    return (
        <div style={styles.container}>
            {/* Toolbar */}
            <div style={styles.toolbar}>
                <h2 style={styles.title}>Domain Model Ontology</h2>
                <div style={styles.controls}>
                    <input
                        type="text"
                        placeholder="Search entities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                    {/* Multi-select module dropdown */}
                    <div ref={dropdownRef} style={styles.moduleDropdownContainer}>
                        <button
                            onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                            style={styles.moduleDropdownButton}
                        >
                            Modules ({selectedModules.size}/{data?.modules.length || 0}) ▼
                        </button>
                        {showModuleDropdown && (
                            <div style={styles.moduleDropdownContent}>
                                <div style={styles.dropdownActions}>
                                    <button 
                                        onClick={() => selectAllModules(true)}
                                        style={styles.dropdownActionButton}
                                    >
                                        All
                                    </button>
                                    <button 
                                        onClick={() => selectAllModules(false)}
                                        style={styles.dropdownActionButton}
                                    >
                                        Custom Only
                                    </button>
                                    <button 
                                        onClick={deselectAllModules}
                                        style={styles.dropdownActionButton}
                                    >
                                        None
                                    </button>
                                </div>
                                <div style={styles.dropdownDivider} />
                                <div style={styles.moduleList}>
                                    {data?.modules.map(module => (
                                        <label 
                                            key={module.name} 
                                            style={{
                                                ...styles.moduleCheckboxLabel,
                                                ...((module.isMarketplace || module.isSystem) ? styles.marketplaceModule : {})
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedModules.has(module.name)}
                                                onChange={() => toggleModule(module.name)}
                                                style={styles.moduleCheckbox}
                                            />
                                            <span 
                                                style={{
                                                    ...styles.moduleColorDot,
                                                    backgroundColor: getModuleColor(module.name, data.modules)
                                                }}
                                            />
                                            {module.name}
                                            {module.isSystem && (
                                                <span style={styles.systemBadge}>SYS</span>
                                            )}
                                            {module.isMarketplace && !module.isSystem && (
                                                <span style={styles.marketplaceBadge}>MP</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
                        style={styles.zoomButton}
                    >
                        +
                    </button>
                    <button 
                        onClick={() => setZoom(prev => Math.max(0.2, prev * 0.8))}
                        style={styles.zoomButton}
                    >
                        -
                    </button>
                    <button 
                        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                        style={styles.resetButton}
                    >
                        Reset View
                    </button>
                    <button 
                        onClick={async () => {
                            try {
                                setLoading(true);
                                setError(null);
                                const newData = await collectOntologyData(studioPro);
                                setData(newData);
                                // Re-apply module filter - keep current selections but validate they still exist
                                const validModules = new Set(
                                    Array.from(selectedModules).filter(m => 
                                        newData.modules.some(nm => nm.name === m)
                                    )
                                );
                                setSelectedModules(validModules);
                                const newPositions = calculateLayout(newData.entities, newData.associations);
                                setPositions(newPositions);
                                setLoading(false);
                            } catch (err) {
                                setError(`Failed to refresh data: ${err}`);
                                setLoading(false);
                            }
                        }}
                        style={styles.refreshButton}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>
            
            {/* Stats bar */}
            <div style={styles.statsBar}>
                <span>Entities: {filteredEntities.length}</span>
                <span>Associations: {filteredAssociations.length}</span>
                <span>Modules: {data?.modules.length || 0}</span>
                <span>Zoom: {Math.round(zoom * 100)}%</span>
            </div>
            
            {/* Graph Canvas */}
            <svg
                ref={svgRef}
                style={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onClick={() => setSelectedEntity(null)}
            >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Associations (render first so they're behind nodes) */}
                    {filteredAssociations.map(assoc => (
                        <AssociationEdge
                            key={assoc.id}
                            association={assoc}
                            sourcePos={getEntityPosition(assoc.parentEntity)}
                            targetPos={getEntityPosition(assoc.childEntity)}
                            isHighlighted={highlightedAssociationIds.has(assoc.id)}
                        />
                    ))}
                    
                    {/* Entity Nodes */}
                    {filteredEntities.map(entity => {
                        const pos = positions.get(entity.id);
                        if (!pos) return null;
                        
                        return (
                            <EntityNode
                                key={entity.id}
                                entity={{ ...entity, position: pos }}
                                isSelected={selectedEntity === entity.id}
                                moduleColor={getModuleColor(entity.moduleName, data?.modules || [])}
                                onClick={() => setSelectedEntity(entity.id)}
                                onDrag={handleNodeDrag}
                            />
                        );
                    })}
                </g>
            </svg>
            
            {/* Legend */}
            <div style={styles.legend}>
                <h4 style={styles.legendTitle}>Legend</h4>
                <div style={styles.legendItem}>
                    <div style={{ ...styles.legendLine, borderStyle: "solid" }}></div>
                    <span>Same module association</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{ ...styles.legendLine, borderStyle: "solid", borderColor: "#FF5722" }}></div>
                    <span>Cross-module association</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{ ...styles.legendLine, borderStyle: "dashed" }}></div>
                    <span>Reference Set (N:M)</span>
                </div>
                <h4 style={styles.legendTitle}>Modules</h4>
                {data?.modules.slice(0, 10).map((module, idx) => (
                    <div key={module.name} style={styles.legendItem}>
                        <div style={{ 
                            ...styles.legendColor, 
                            backgroundColor: MODULE_COLORS[idx % MODULE_COLORS.length] 
                        }}></div>
                        <span>{module.name}{module.isMarketplace ? " (MP)" : ""}</span>
                    </div>
                ))}
                {(data?.modules.length || 0) > 10 && (
                    <div style={styles.legendItem}>
                        <span style={{ color: "#999", fontStyle: "italic" }}>
                            +{(data?.modules.length || 0) - 10} more modules
                        </span>
                    </div>
                )}
            </div>
            
            {/* Selected entity details panel */}
            {selectedEntity && (
                <div style={styles.detailsPanel}>
                    {(() => {
                        const entity = data?.entities.find(e => e.id === selectedEntity);
                        if (!entity) return null;
                        
                        const relatedAssociations = data?.associations.filter(a => 
                            a.parentEntity === entity.id || 
                            a.childEntity === entity.id ||
                            a.parentEntity === entity.qualifiedName ||
                            a.childEntity === entity.qualifiedName
                        ) || [];
                        
                        return (
                            <>
                                <h3 style={styles.detailsTitle}>{entity.name}</h3>
                                <p style={styles.detailsModule}>Module: {entity.moduleName}</p>
                                {entity.generalization && (
                                    <p style={styles.detailsGeneralization}>
                                        Extends: {entity.generalization}
                                    </p>
                                )}
                                <h4 style={styles.detailsSubtitle}>Attributes ({entity.attributes.length})</h4>
                                <ul style={styles.attributeList}>
                                    {entity.attributes.map(attr => (
                                        <li key={attr.name} style={styles.attributeItem}>
                                            <strong>{attr.name}</strong>: {attr.type}
                                        </li>
                                    ))}
                                </ul>
                                <h4 style={styles.detailsSubtitle}>
                                    Associations ({relatedAssociations.length})
                                </h4>
                                <ul style={styles.attributeList}>
                                    {relatedAssociations.map(assoc => (
                                        <li key={assoc.id} style={styles.attributeItem}>
                                            <strong>{assoc.name}</strong>
                                            <br />
                                            <span style={{ fontSize: "11px", color: "#666" }}>
                                                {assoc.parentEntity} → {assoc.childEntity}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <button 
                                    onClick={() => setSelectedEntity(null)}
                                    style={styles.closeButton}
                                >
                                    Close
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

// Styles - Mendix Studio Pro theme
const styles: Record<string, React.CSSProperties> = {
    container: {
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: MENDIX_COLORS.background,
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
        color: MENDIX_COLORS.text
    },
    toolbar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        backgroundColor: MENDIX_COLORS.surface,
        color: MENDIX_COLORS.text,
        borderBottom: `1px solid ${MENDIX_COLORS.border}`
    },
    title: {
        margin: 0,
        fontSize: "14px",
        fontWeight: 600,
        color: MENDIX_COLORS.textBright
    },
    controls: {
        display: "flex",
        gap: "8px",
        alignItems: "center"
    },
    searchInput: {
        padding: "6px 10px",
        borderRadius: "3px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        backgroundColor: MENDIX_COLORS.surfaceLight,
        color: MENDIX_COLORS.text,
        width: "180px",
        fontSize: "13px",
        outline: "none"
    },
    moduleSelect: {
        padding: "6px 10px",
        borderRadius: "3px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        backgroundColor: MENDIX_COLORS.surfaceLight,
        color: MENDIX_COLORS.text,
        fontSize: "13px",
        cursor: "pointer"
    },
    moduleDropdownContainer: {
        position: "relative" as const
    },
    moduleDropdownButton: {
        padding: "6px 10px",
        borderRadius: "3px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        backgroundColor: MENDIX_COLORS.surfaceLight,
        color: MENDIX_COLORS.text,
        fontSize: "13px",
        cursor: "pointer",
        minWidth: "150px",
        textAlign: "left" as const
    },
    moduleDropdownContent: {
        position: "absolute" as const,
        top: "100%",
        left: 0,
        marginTop: "4px",
        backgroundColor: MENDIX_COLORS.surface,
        borderRadius: "3px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        zIndex: 1000,
        minWidth: "250px",
        maxHeight: "400px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column" as const
    },
    dropdownActions: {
        display: "flex",
        gap: "4px",
        padding: "8px",
        backgroundColor: MENDIX_COLORS.surfaceLight,
        borderBottom: `1px solid ${MENDIX_COLORS.border}`
    },
    dropdownActionButton: {
        padding: "4px 8px",
        borderRadius: "3px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        backgroundColor: MENDIX_COLORS.surface,
        color: MENDIX_COLORS.text,
        fontSize: "11px",
        cursor: "pointer",
        flex: 1
    },
    dropdownDivider: {
        height: "1px",
        backgroundColor: MENDIX_COLORS.border
    },
    moduleList: {
        overflowY: "auto" as const,
        maxHeight: "340px",
        padding: "4px 0"
    },
    moduleCheckboxLabel: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: "12px",
        color: MENDIX_COLORS.text,
        transition: "background-color 0.1s"
    },
    marketplaceModule: {
        color: MENDIX_COLORS.textMuted,
        fontStyle: "italic" as const
    },
    moduleCheckbox: {
        cursor: "pointer",
        accentColor: MENDIX_COLORS.primary
    },
    moduleColorDot: {
        width: "12px",
        height: "12px",
        borderRadius: "2px",
        flexShrink: 0
    },
    marketplaceBadge: {
        marginLeft: "auto",
        fontSize: "10px",
        padding: "2px 4px",
        borderRadius: "3px",
        backgroundColor: MENDIX_COLORS.surfaceLight,
        color: MENDIX_COLORS.textMuted
    },
    systemBadge: {
        marginLeft: "auto",
        fontSize: "10px",
        padding: "2px 4px",
        borderRadius: "3px",
        backgroundColor: MENDIX_COLORS.warning,
        color: MENDIX_COLORS.background
    },
    zoomButton: {
        padding: "6px 12px",
        borderRadius: "3px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        backgroundColor: MENDIX_COLORS.surfaceLight,
        color: MENDIX_COLORS.text,
        fontSize: "14px",
        fontWeight: "bold",
        cursor: "pointer"
    },
    resetButton: {
        padding: "6px 12px",
        borderRadius: "3px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        backgroundColor: MENDIX_COLORS.surfaceLight,
        color: MENDIX_COLORS.text,
        fontSize: "13px",
        cursor: "pointer"
    },
    refreshButton: {
        padding: "6px 12px",
        borderRadius: "3px",
        border: "none",
        backgroundColor: MENDIX_COLORS.primary,
        color: MENDIX_COLORS.textBright,
        fontSize: "13px",
        cursor: "pointer"
    },
    statsBar: {
        display: "flex",
        gap: "20px",
        padding: "6px 16px",
        backgroundColor: MENDIX_COLORS.surfaceLight,
        borderBottom: `1px solid ${MENDIX_COLORS.border}`,
        fontSize: "12px",
        color: MENDIX_COLORS.textMuted
    },
    canvas: {
        flex: 1,
        backgroundColor: MENDIX_COLORS.canvas,
        cursor: "grab"
    },
    legend: {
        position: "absolute",
        bottom: "20px",
        left: "20px",
        backgroundColor: MENDIX_COLORS.surface,
        padding: "12px",
        borderRadius: "4px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        maxWidth: "200px",
        maxHeight: "300px",
        overflowY: "auto"
    },
    legendTitle: {
        margin: "0 0 8px 0",
        fontSize: "12px",
        fontWeight: 600,
        color: MENDIX_COLORS.textBright
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "5px",
        fontSize: "11px",
        color: MENDIX_COLORS.text
    },
    legendLine: {
        width: "30px",
        height: "0",
        borderTop: `2px solid ${MENDIX_COLORS.textMuted}`
    },
    legendColor: {
        width: "14px",
        height: "14px",
        borderRadius: "2px"
    },
    detailsPanel: {
        position: "absolute",
        top: "100px",
        right: "20px",
        backgroundColor: MENDIX_COLORS.surface,
        padding: "16px",
        borderRadius: "4px",
        border: `1px solid ${MENDIX_COLORS.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        maxWidth: "300px",
        maxHeight: "calc(100vh - 160px)",
        overflowY: "auto"
    },
    detailsTitle: {
        margin: "0 0 4px 0",
        color: MENDIX_COLORS.primary,
        fontSize: "15px",
        fontWeight: 600
    },
    detailsModule: {
        margin: "0 0 4px 0",
        fontSize: "12px",
        color: MENDIX_COLORS.textMuted
    },
    detailsGeneralization: {
        margin: "0 0 10px 0",
        fontSize: "12px",
        color: MENDIX_COLORS.warning,
        fontStyle: "italic"
    },
    detailsSubtitle: {
        margin: "12px 0 6px 0",
        fontSize: "12px",
        fontWeight: 600,
        color: MENDIX_COLORS.textBright
    },
    attributeList: {
        margin: 0,
        padding: "0 0 0 12px",
        fontSize: "11px",
        color: MENDIX_COLORS.text
    },
    attributeItem: {
        marginBottom: "3px"
    },
    closeButton: {
        marginTop: "12px",
        padding: "6px 12px",
        borderRadius: "3px",
        border: "none",
        backgroundColor: MENDIX_COLORS.primary,
        color: MENDIX_COLORS.textBright,
        cursor: "pointer",
        width: "100%",
        fontSize: "13px"
    },
    loadingContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: "14px",
        color: MENDIX_COLORS.textMuted,
        backgroundColor: MENDIX_COLORS.background
    },
    spinner: {
        width: "40px",
        height: "40px",
        border: `4px solid ${MENDIX_COLORS.surfaceLight}`,
        borderTop: `4px solid ${MENDIX_COLORS.primary}`,
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "20px"
    },
    errorContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: MENDIX_COLORS.error,
        backgroundColor: MENDIX_COLORS.background
    }
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export const component: IComponent = {
    async loaded(componentContext) {
        const studioPro = getStudioProApi(componentContext);
        
        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <OntologyViewer studioPro={studioPro} />
            </StrictMode>
        );
    }
};
