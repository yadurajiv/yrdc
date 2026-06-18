import {
    state,
    saveState,
    setCurrentProjectId,
    getCurrentProject,
    buildNodeFromTemplate,
    buildBlankNode,
    createInitialProject,
    addEdgeToProject,
    removeEdgeFromProject
} from './store.js?v=1.4.9';

export function createNewProject(name = 'Untitled Design') {
    const id = 'p_' + Date.now();
    state.projects[id] = createInitialProject(id, name);
    setCurrentProjectId(id);
    saveState();
    return id;
}

export function deleteCurrentProject() {
    if (Object.keys(state.projects).length <= 1) return state.currentId;
    delete state.projects[state.currentId];
    const nextId = Object.keys(state.projects)[0] || null;
    setCurrentProjectId(nextId);
    saveState();
    return nextId;
}

export function updateProjectName(name) {
    const project = getCurrentProject();
    if (!project) return;
    project.name = name;
    saveState();
}

export function updateNodeContent(nodeId, value) {
    const project = getCurrentProject();
    if (!project || !project.nodes[nodeId]) return { addedLinks: false };
    project.nodes[nodeId].content = value;
    const addedLinks = applyInlineMentions(nodeId, value);
    saveState();
    return { addedLinks };
}

export function updateNodeMeta(nodeId, field, value) {
    const project = getCurrentProject();
    if (!project || !project.nodes[nodeId]) return;
    if (field === 'tags') {
        const nextTags = Array.isArray(value)
            ? value
            : String(value || '')
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean);
        project.nodes[nodeId].tags = nextTags;
    } else if (field === 'group') {
        project.nodes[nodeId].group = String(value || '').trim();
    } else {
        project.nodes[nodeId][field] = value;
    }
    saveState();
}

export function createNodeFromTemplateAtPosition(def, position) {
    const project = getCurrentProject();
    if (!project) return null;
    const node = buildNodeFromTemplate(def, position);
    project.nodes[node.id] = node;
    saveState();
    return node.id;
}

export function createBlankNodeAtPosition(position) {
    const project = getCurrentProject();
    if (!project) return null;
    const node = buildBlankNode(position);
    project.nodes[node.id] = node;
    saveState();
    return node.id;
}

export function autoTidyNodes() {
    const project = getCurrentProject();
    if (!project) return false;
    const nodes = Object.values(project.nodes);
    if (!nodes.length) return false;

    const sorted = [...nodes].sort((a, b) => {
        if (a.y === b.y) return a.x - b.x;
        return a.y - b.y;
    });

    const maxWidth = Math.max(...sorted.map(node => node.width || 320));
    const maxHeight = Math.max(...sorted.map(node => node.height || 300));
    const gutterX = 80;
    const gutterY = 80;
    const cols = Math.ceil(Math.sqrt(sorted.length));
    const rows = Math.ceil(sorted.length / cols);
    const gridWidth = cols * (maxWidth + gutterX) - gutterX;
    const gridHeight = rows * (maxHeight + gutterY) - gutterY;
    const originX = -gridWidth / 2;
    const originY = -gridHeight / 2;

    sorted.forEach((node, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        node.x = originX + col * (maxWidth + gutterX);
        node.y = originY + row * (maxHeight + gutterY);
    });

    saveState();
    return true;
}

export function duplicateNode(nodeId) {
    const project = getCurrentProject();
    if (!project || !project.nodes[nodeId]) return null;
    const node = project.nodes[nodeId];
    const clone = {
        ...node,
        id: 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        x: node.x + 280,
        y: node.y
    };
    project.nodes[clone.id] = clone;
    saveState();
    return clone.id;
}

export function deleteNode(nodeId) {
    const project = getCurrentProject();
    if (!project || !project.nodes[nodeId]) return false;
    delete project.nodes[nodeId];
    project.edges = project.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
    saveState();
    return true;
}

export function duplicateNodes(nodeIds, offsetX = 0, offsetY = 0) {
    const project = getCurrentProject();
    if (!project || !Array.isArray(nodeIds) || !nodeIds.length) {
        return { ids: [], map: {} };
    }
    const map = {};
    const ids = [];
    nodeIds.forEach(nodeId => {
        const node = project.nodes[nodeId];
        if (!node) return;
        const clone = {
            ...node,
            id: 'node_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            x: node.x + offsetX,
            y: node.y + offsetY
        };
        project.nodes[clone.id] = clone;
        map[nodeId] = clone.id;
        ids.push(clone.id);
    });
    saveState();
    return { ids, map };
}

export function deleteNodes(nodeIds) {
    const project = getCurrentProject();
    if (!project || !Array.isArray(nodeIds) || !nodeIds.length) return 0;
    const idSet = new Set(nodeIds);
    let removed = 0;
    nodeIds.forEach(nodeId => {
        if (project.nodes[nodeId]) {
            delete project.nodes[nodeId];
            removed += 1;
        }
    });
    if (!removed) return 0;
    project.edges = project.edges.filter(edge => !idSet.has(edge.from) && !idSet.has(edge.to));
    saveState();
    return removed;
}

export function removeConnection(fromId, toId) {
    const project = getCurrentProject();
    if (!project || !fromId || !toId) return false;
    const removed = removeEdgeFromProject(project, fromId, toId);
    saveState();
    return removed;
}

export function addConnection(fromId, toId) {
    const project = getCurrentProject();
    if (!project || !fromId || !toId) return false;
    const added = addEdgeToProject(project, fromId, toId);
    saveState();
    return added;
}

export function applyInlineMentions(nodeId, content) {
    const project = getCurrentProject();
    if (!project || !project.nodes[nodeId]) return false;
    const mentions = extractInlineMentions(content);
    if (!mentions.length) return false;

    let changed = false;
    mentions.forEach(mention => {
        const target = Object.values(project.nodes).find(node => node.title.toLowerCase() === mention.toLowerCase());
        if (target && target.id !== nodeId) {
            const added = addEdgeToProject(project, nodeId, target.id);
            if (added) changed = true;
        }
    });

    return changed;
}

export function extractInlineMentions(text) {
    if (!text) return [];
    const matches = [...text.matchAll(/\[\[([^\]]+)]\]/g)];
    return matches.map(match => match[1].trim()).filter(Boolean);
}
