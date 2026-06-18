import { NODE_DEFS } from '../config.js?v=1.4.9';

export const STORAGE_KEY = 'gdc_workspace_v3';
export const LEGACY_KEY = 'gdc_workspace_v2';
export const COMPACT_KEY = 'gdc_sidebar_compact';
export const SIDEBAR_WIDTH_KEY = 'gdc_sidebar_width';
export const PROPERTIES_WIDTH_KEY = 'gdc_properties_width';
export const PROPERTIES_COLLAPSED_KEY = 'gdc_properties_collapsed';

export const state = {
    projects: {},
    currentId: null,
    helpSeen: false
};

export const viewState = {
    x: 0,
    y: 0,
    scale: 1
};

export const dragState = {
    mode: null,
    nodeId: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0,
    resizeStartWidth: 0,
    resizeStartHeight: 0,
    selectedIds: [],
    nodeStartPositions: {}
};

export const linkState = {
    fromId: null,
    tempLine: null
};

let selectedNodeId = null;
let selectedNodeIds = [];
let nodeFilter = '';

export function setSelectedNodeId(nodeId) {
    selectedNodeId = nodeId;
    selectedNodeIds = nodeId ? [nodeId] : [];
}

export function getSelectedNodeId() {
    return selectedNodeId;
}

export function getSelectedNodeIds() {
    return [...selectedNodeIds];
}

export function setSelectedNodeIds(nodeIds) {
    if (!Array.isArray(nodeIds)) {
        selectedNodeId = null;
        selectedNodeIds = [];
        return;
    }
    const unique = Array.from(new Set(nodeIds.filter(Boolean)));
    selectedNodeIds = unique;
    selectedNodeId = unique.length ? unique[unique.length - 1] : null;
}

export function toggleSelectedNodeId(nodeId) {
    if (!nodeId) return;
    const index = selectedNodeIds.indexOf(nodeId);
    if (index >= 0) {
        selectedNodeIds.splice(index, 1);
    } else {
        selectedNodeIds.push(nodeId);
    }
    if (!selectedNodeIds.length) {
        selectedNodeId = null;
    } else if (!selectedNodeIds.includes(selectedNodeId)) {
        selectedNodeId = selectedNodeIds[selectedNodeIds.length - 1];
    }
}

export function clearSelectedNodeIds() {
    selectedNodeId = null;
    selectedNodeIds = [];
}

export function setNodeFilterValue(value) {
    nodeFilter = value;
}

export function getNodeFilterValue() {
    return nodeFilter;
}

export function setCurrentProjectId(id) {
    state.currentId = id;
}

export function getCurrentProject() {
    return state.projects[state.currentId] || null;
}

export function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setHelpSeen() {
    state.helpSeen = true;
    saveState();
}

export function initState() {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (saved) {
        const upgraded = upgradeState(JSON.parse(saved));
        state.projects = upgraded.projects || {};
        state.currentId = upgraded.currentId || Object.keys(state.projects)[0] || null;
        state.helpSeen = !!upgraded.helpSeen;
    } else {
        const initialId = 'p_' + Date.now();
        state.projects = {
            [initialId]: createInitialProject(initialId, 'My New Game')
        };
        state.currentId = initialId;
    }
    return state.currentId;
}

export function createInitialProject(id, name) {
    const nodes = {};
    const edges = [];
    const nodeWidth = 320;
    const nodeHeight = 300;
    const gutterX = 80;
    const gutterY = 80;
    let nodeIds = [];
    const nodeIdsByDefIndex = new Array(NODE_DEFS.length).fill(null);

    if (NODE_DEFS.length === 8) {
        const layoutOrder = [7, 0, 1, 6, 2, 5, 4, 3];
        const positions = [
            { col: 0, row: 0 },
            { col: 1, row: 0 },
            { col: 2, row: 0 },
            { col: 0, row: 1 },
            { col: 2, row: 1 },
            { col: 0, row: 2 },
            { col: 1, row: 2 },
            { col: 2, row: 2 }
        ];
        const gridWidth = 3 * (nodeWidth + gutterX) - gutterX;
        const gridHeight = 3 * (nodeHeight + gutterY) - gutterY;
        const originX = -gridWidth / 2;
        const originY = -gridHeight / 2;

        nodeIds = layoutOrder.map((defIndex, index) => {
            const def = NODE_DEFS[defIndex];
            const slot = positions[index];
            const position = {
                x: originX + slot.col * (nodeWidth + gutterX),
                y: originY + slot.row * (nodeHeight + gutterY)
            };
            const node = buildNodeFromTemplate(def, position);
            nodes[node.id] = node;
            nodeIdsByDefIndex[defIndex] = node.id;
            return node.id;
        });
    } else {
        const cols = Math.ceil(Math.sqrt(NODE_DEFS.length));
        const rows = Math.ceil(NODE_DEFS.length / cols);
        const gridWidth = cols * (nodeWidth + gutterX) - gutterX;
        const gridHeight = rows * (nodeHeight + gutterY) - gutterY;
        const originX = -gridWidth / 2;
        const originY = -gridHeight / 2;

        nodeIds = NODE_DEFS.map((def, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const position = {
                x: originX + col * (nodeWidth + gutterX),
                y: originY + row * (nodeHeight + gutterY)
            };
            const node = buildNodeFromTemplate(def, position);
            nodes[node.id] = node;
            nodeIdsByDefIndex[index] = node.id;
            return node.id;
        });
    }

    const orderedNodeIds = NODE_DEFS.length === 8
        ? [7, 0, 1, 2, 3, 4, 5, 6].map(defIndex => nodeIdsByDefIndex[defIndex]).filter(Boolean)
        : nodeIds;

    for (let i = 0; i < orderedNodeIds.length; i++) {
        const from = orderedNodeIds[i];
        const to = orderedNodeIds[(i + 1) % orderedNodeIds.length];
        edges.push(buildEdge(from, to));
    }

    for (let i = 0; i < orderedNodeIds.length / 2; i++) {
        const from = orderedNodeIds[i];
        const to = orderedNodeIds[i + orderedNodeIds.length / 2];
        edges.push(buildEdge(from, to));
    }

    return {
        id,
        name,
        nodes,
        edges
    };
}

export function upgradeState(rawState) {
    if (!rawState || !rawState.projects) return rawState;

    Object.values(rawState.projects).forEach(project => {
        if (!project.nodes) return;
        const isLegacy = !Array.isArray(project.edges) && !project.nodes.__isGraph && !project.nodes[Object.keys(project.nodes)[0]]?.id;
        if (isLegacy) {
            const nodes = {};
            const edges = [];
            const radius = 240;
            const center = { x: 0, y: 0 };
            const legacyIds = Object.keys(project.nodes);

            legacyIds.forEach((legacyId, index) => {
                const def = NODE_DEFS.find(item => item.id === legacyId) || NODE_DEFS[index % NODE_DEFS.length];
                const angle = (Math.PI * 2 * index) / legacyIds.length - Math.PI / 2;
                const position = {
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius
                };
                const node = buildNodeFromTemplate(def, position);
                node.content = project.nodes[legacyId] || '';
                nodes[node.id] = node;
            });

            const nodeIds = Object.keys(nodes);
            for (let i = 0; i < nodeIds.length; i++) {
                const from = nodeIds[i];
                const to = nodeIds[(i + 1) % nodeIds.length];
                edges.push(buildEdge(from, to));
            }

            project.nodes = nodes;
            project.edges = edges;
        }

        project.edges = project.edges || [];
    });

    if (!rawState.currentId || !rawState.projects[rawState.currentId]) {
        rawState.currentId = Object.keys(rawState.projects)[0] || null;
    }

    return rawState;
}

export function buildNodeFromTemplate(def, position) {
    return {
        id: 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        templateId: def.id,
        label: def.label,
        title: def.title,
        question: def.question,
        tip: def.tip,
        content: '',
        group: '',
        tags: [],
        width: 320,
        height: 300,
        x: position.x,
        y: position.y
    };
}

export function buildBlankNode(position) {
    return {
        id: 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        templateId: null,
        label: 'NEW',
        title: 'Untitled Node',
        question: 'What are you exploring here?',
        tip: 'Define a prompt that pushes the idea forward.',
        content: '',
        group: '',
        tags: [],
        width: 320,
        height: 300,
        x: position.x,
        y: position.y
    };
}

export function buildEdge(from, to) {
    return {
        id: 'edge_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        from,
        to
    };
}

export function addEdgeToProject(project, fromId, toId) {
    const exists = project.edges.some(edge =>
        (edge.from === fromId && edge.to === toId) ||
        (edge.from === toId && edge.to === fromId)
    );
    if (exists) return false;
    project.edges.push(buildEdge(fromId, toId));
    return true;
}

export function removeEdgeFromProject(project, fromId, toId) {
    const before = project.edges.length;
    project.edges = project.edges.filter(edge =>
        !((edge.from === fromId && edge.to === toId) || (edge.from === toId && edge.to === fromId))
    );
    return project.edges.length !== before;
}
