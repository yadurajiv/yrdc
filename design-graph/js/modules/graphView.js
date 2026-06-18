import {
    state,
    viewState,
    dragState,
    linkState,
    getCurrentProject,
    getSelectedNodeIds,
    saveState
} from './store.js?v=1.4.9';
import { clamp } from './utils.js?v=1.4.9';

let renderEdgesRaf = null;
let onSelectNode = null;
let onSelectNodes = null;
let onCloneSelection = null;
let onCreateLink = null;
let onCreateLinkedNode = null;
let onContentChange = null;
let onContentCommit = null;
let templateOptions = [];
let linkPrompt = null;
let marqueeState = {
    active: false,
    startX: 0,
    startY: 0,
    additive: false,
    invert: false,
    box: null
};

export function setGraphHandlers(handlers) {
    onSelectNode = handlers?.onSelectNode || null;
    onSelectNodes = handlers?.onSelectNodes || null;
    onCloneSelection = handlers?.onCloneSelection || null;
    onCreateLink = handlers?.onCreateLink || null;
    onCreateLinkedNode = handlers?.onCreateLinkedNode || null;
    onContentChange = handlers?.onContentChange || null;
    onContentCommit = handlers?.onContentCommit || null;
    templateOptions = Array.isArray(handlers?.templateOptions) ? handlers.templateOptions : [];
}

export function renderGraph(project) {
    const world = document.getElementById('graph-world');
    const edges = document.getElementById('graph-edges');
    if (!world || !edges || !project) return;
    world.innerHTML = '';
    edges.innerHTML = '';

    const selectedIds = new Set(getSelectedNodeIds());
    Object.values(project.nodes).forEach(node => {
        const el = document.createElement('div');
        el.className = `graph-node ${selectedIds.has(node.id) ? 'is-selected' : ''}`.trim();
        el.style.transform = `translate(${node.x}px, ${node.y}px)`;
        el.style.width = `${node.width || 320}px`;
        el.style.height = `${node.height || 300}px`;
        el.dataset.nodeId = node.id;

        const links = buildNodeLinksHtml(node.id, project);

        el.innerHTML = `
            <div class="node-header">
                <div>
                    <div class="node-label">${node.label || 'NODE'}</div>
                    <div class="node-title">${node.title}</div>
                </div>
                <div class="node-actions">
                    <div class="node-link-handle" data-link-handle="true" title="Drag to link"></div>
                </div>
            </div>
            <div class="node-body">
                <div>
                    <div class="node-question">${node.question}</div>
                    <div class="node-tip">${node.tip}</div>
                </div>
                <div class="node-display" id="display-${node.id}"></div>
                <textarea id="input-${node.id}" class="hidden" placeholder="Document your design logic here...">${node.content || ''}</textarea>
                <div class="node-links">Links: ${links || '<span class="text-slate-400">None yet</span>'}</div>
            </div>
            <div class="node-resize-handle" data-resize-handle="true" title="Resize"></div>
        `;

        const header = el.querySelector('.node-header');
        header.addEventListener('pointerdown', event => startNodeDrag(event, node.id));
        el.addEventListener('pointerdown', event => {
            if (onSelectNode) onSelectNode(node.id, event.shiftKey);
        });

        const title = el.querySelector('.node-title');
        if (title) {
            title.addEventListener('click', event => {
                event.stopPropagation();
                if (onSelectNode) onSelectNode(node.id, event.shiftKey);
            });
        }

        const handle = el.querySelector('[data-link-handle="true"]');
        handle.addEventListener('pointerdown', event => startLinkDrag(event, node.id));

        const resizeHandle = el.querySelector('[data-resize-handle="true"]');
        resizeHandle.addEventListener('pointerdown', event => startNodeResize(event, node.id));

        const linksContainer = el.querySelector('.node-links');
        if (linksContainer) {
            linksContainer.addEventListener('pointerover', event => {
                const btn = event.target.closest('[data-link-target]');
                if (!btn) return;
                setEdgeHighlight(btn.dataset.linkSource, btn.dataset.linkTarget, true);
            });
            linksContainer.addEventListener('pointerout', event => {
                const btn = event.target.closest('[data-link-target]');
                if (!btn) return;
                setEdgeHighlight(btn.dataset.linkSource, btn.dataset.linkTarget, false);
            });
        }

        const display = el.querySelector(`#display-${node.id}`);
        display.addEventListener('click', () => enterEdit(node.id));

        const textarea = el.querySelector(`#input-${node.id}`);
        textarea.addEventListener('input', () => {
            if (onContentChange) onContentChange(node.id, textarea.value);
        });
        textarea.addEventListener('blur', () => {
            if (onContentCommit) onContentCommit(node.id, textarea.value);
            exitEdit(node.id);
        });
        textarea.addEventListener('pointerdown', event => event.stopPropagation());

        world.appendChild(el);
        renderNodeDisplay(node.id);
    });

    renderEdges();
    lucide.createIcons();
}

export function renderEdges() {
    const edges = document.getElementById('graph-edges');
    const project = getCurrentProject();
    if (!edges || !project) return;
    edges.innerHTML = '';

    const svgBounds = edges.getBoundingClientRect();
    const lines = project.edges.map(edge => {
        const edgeKey = buildEdgeKey(edge.from, edge.to);
        const fromEl = document.querySelector(`[data-node-id="${edge.from}"]`);
        const toEl = document.querySelector(`[data-node-id="${edge.to}"]`);
        if (!fromEl || !toEl) return '';
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const x1 = (fromRect.left - svgBounds.left + fromRect.width / 2);
        const y1 = (fromRect.top - svgBounds.top + fromRect.height / 2);
        const x2 = (toRect.left - svgBounds.left + toRect.width / 2);
        const y2 = (toRect.top - svgBounds.top + toRect.height / 2);

        return `<line data-edge="${edgeKey}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 6" />`;
    }).join('');

    edges.innerHTML = lines;
}

export function renderNodeDisplay(nodeId) {
    const project = getCurrentProject();
    const display = document.getElementById(`display-${nodeId}`);
    if (!display || !project) return;
    const node = project.nodes[nodeId];
    const raw = node.content || '';

    if (!raw || raw.trim() === '') {
        display.innerHTML = '';
        return;
    }

    try {
        const parsed = marked.parse(raw);
        display.innerHTML = DOMPurify.sanitize(parsed);
    } catch (err) {
        console.error(`Error rendering node ${nodeId}:`, err);
        display.innerHTML = `<p>${raw}</p>`;
    }
}

export function buildNodeLinksHtml(nodeId, project) {
    const links = getLinkedNodes(nodeId, project);
    return links.map((linked, index) => {
        const separator = index < links.length - 1 ? ', ' : '';
        return `<button data-link-source="${nodeId}" data-link-target="${linked.id}" onclick="selectAndFocusNode('${linked.id}')">${linked.title}</button>${separator}`;
    }).join('');
}

export function updateNodeLinksDisplay(nodeId) {
    const project = getCurrentProject();
    const container = document.querySelector(`[data-node-id="${nodeId}"] .node-links`);
    if (!project || !container) return;
    const html = buildNodeLinksHtml(nodeId, project);
    container.innerHTML = `Links: ${html || '<span class="text-slate-400">None yet</span>'}`;
}

export function scheduleEdgesRender() {
    if (renderEdgesRaf) return;
    renderEdgesRaf = requestAnimationFrame(() => {
        renderEdges();
        renderEdgesRaf = null;
    });
}

export function updateSelectionStyles(selectedIds = []) {
    document.querySelectorAll('.graph-node.is-selected').forEach(node => {
        node.classList.remove('is-selected');
    });
    if (!selectedIds.length) return;
    selectedIds.forEach(nodeId => {
        const el = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (el) el.classList.add('is-selected');
    });
}

export function getLinkedNodes(nodeId, project) {
    const ids = new Set();
    project.edges.forEach(edge => {
        if (edge.from === nodeId) ids.add(edge.to);
        if (edge.to === nodeId) ids.add(edge.from);
    });
    return Array.from(ids).map(id => project.nodes[id]).filter(Boolean);
}

function buildEdgeKey(fromId, toId) {
    return [fromId, toId].sort().join('|');
}

export function setEdgeHighlight(fromId, toId, enabled) {
    const edgeKey = buildEdgeKey(fromId, toId);
    const line = document.querySelector(`[data-edge="${edgeKey}"]`);
    if (!line) return;
    line.classList.toggle('is-highlighted', enabled);
}

function enterEdit(nodeId) {
    const textarea = document.getElementById(`input-${nodeId}`);
    const display = document.getElementById(`display-${nodeId}`);
    if (!textarea || !display) return;
    display.classList.add('hidden');
    textarea.classList.remove('hidden');
    textarea.focus();
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
}

function exitEdit(nodeId) {
    const textarea = document.getElementById(`input-${nodeId}`);
    const display = document.getElementById(`display-${nodeId}`);
    if (!textarea || !display) return;
    textarea.classList.add('hidden');
    display.classList.remove('hidden');
}

export function exitAllEdits() {
    const openEditors = Array.from(document.querySelectorAll('.graph-node textarea:not(.hidden)'));
    if (!openEditors.length) return false;
    openEditors.forEach(textarea => {
        const nodeId = textarea.id?.replace('input-', '');
        if (!nodeId) return;
        if (onContentCommit) onContentCommit(nodeId, textarea.value);
        exitEdit(nodeId);
    });
    return true;
}

function startNodeDrag(event, nodeId) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (onSelectNode) onSelectNode(nodeId, event.shiftKey);
    let selectedIds = getSelectedNodeIds();
    if (!selectedIds.includes(nodeId)) {
        selectedIds = [nodeId];
    }

    if (event.altKey && onCloneSelection) {
        const cloned = onCloneSelection(selectedIds, nodeId);
        if (cloned?.ids?.length) {
            selectedIds = cloned.ids;
            nodeId = cloned.primaryId || selectedIds[0];
        }
    }

    const project = getCurrentProject();
    const node = project.nodes[nodeId];
    dragState.mode = 'node';
    dragState.nodeId = nodeId;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.nodeStartX = node.x;
    dragState.nodeStartY = node.y;
    dragState.selectedIds = selectedIds;
    dragState.nodeStartPositions = selectedIds.reduce((acc, id) => {
        const item = project.nodes[id];
        if (item) acc[id] = { x: item.x, y: item.y };
        return acc;
    }, {});
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp, { once: true });
}

function startLinkDrag(event, nodeId) {
    event.preventDefault();
    event.stopPropagation();
    if (onSelectNode) onSelectNode(nodeId, event.shiftKey);
    linkState.fromId = nodeId;
    const edges = document.getElementById('graph-edges');
    if (!edges) return;
    linkState.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    linkState.tempLine.setAttribute('stroke', '#0ea5e9');
    linkState.tempLine.setAttribute('stroke-width', '2');
    linkState.tempLine.setAttribute('stroke-dasharray', '6 6');
    edges.appendChild(linkState.tempLine);
    updateTempLink(event);

    document.addEventListener('pointermove', updateTempLink);
    document.addEventListener('pointerup', finishLinkDrag, { once: true });
}

function updateTempLink(event) {
    if (!linkState.fromId || !linkState.tempLine) return;
    const fromEl = document.querySelector(`[data-node-id="${linkState.fromId}"]`);
    const edges = document.getElementById('graph-edges');
    if (!fromEl || !edges) return;
    const svgBounds = edges.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const x1 = (fromRect.left - svgBounds.left + fromRect.width / 2);
    const y1 = (fromRect.top - svgBounds.top + fromRect.height / 2);
    const x2 = event.clientX - svgBounds.left;
    const y2 = event.clientY - svgBounds.top;

    linkState.tempLine.setAttribute('x1', x1);
    linkState.tempLine.setAttribute('y1', y1);
    linkState.tempLine.setAttribute('x2', x2);
    linkState.tempLine.setAttribute('y2', y2);
}

function finishLinkDrag(event) {
    document.removeEventListener('pointermove', updateTempLink);
    if (linkState.tempLine) {
        linkState.tempLine.remove();
    }

    const fromId = linkState.fromId;
    const target = event.target.closest('[data-node-id]');
    if (fromId && target) {
        const toId = target.dataset.nodeId;
        if (toId && toId !== fromId) {
            if (onCreateLink) onCreateLink(fromId, toId);
        }
        clearLinkPrompt();
    } else if (fromId) {
        showLinkPrompt(fromId, event.clientX, event.clientY);
    }

    linkState.fromId = null;
    linkState.tempLine = null;
}

function showLinkPrompt(fromId, clientX, clientY) {
    const viewport = document.getElementById('graph-viewport');
    if (!viewport) return;
    clearLinkPrompt();

    const prompt = document.createElement('div');
    prompt.className = 'link-prompt';
    prompt.innerHTML = `
        <div class="link-prompt-title">Create linked node</div>
        <button class="link-prompt-btn" data-link-action="blank">Blank node</button>
        <div class="link-prompt-row">
            <select class="link-prompt-select" data-link-action="template">
                <option value="">Choose template</option>
                ${templateOptions.map(def => `<option value="${def.id}">${def.label} ${def.title}</option>`).join('')}
            </select>
            <button class="link-prompt-btn" data-link-action="add-template">Add</button>
        </div>
    `;

    const rect = viewport.getBoundingClientRect();
    const left = Math.min(Math.max(12, clientX - rect.left), rect.width - 220);
    const top = Math.min(Math.max(12, clientY - rect.top), rect.height - 140);
    prompt.style.left = `${left}px`;
    prompt.style.top = `${top}px`;

    prompt.addEventListener('pointerdown', event => {
        event.stopPropagation();
    });

    prompt.addEventListener('click', event => {
        const action = event.target?.dataset?.linkAction;
        if (!action) return;
        event.stopPropagation();
        if (!onCreateLinkedNode) return;
        const position = clientToWorld(clientX, clientY);
        if (action === 'blank') {
            onCreateLinkedNode(fromId, null, position);
            clearLinkPrompt();
            return;
        }
        if (action === 'add-template') {
            const select = prompt.querySelector('[data-link-action="template"]');
            const templateId = select?.value || '';
            if (!templateId) return;
            onCreateLinkedNode(fromId, templateId, position);
            clearLinkPrompt();
        }
    });

    viewport.appendChild(prompt);
    linkPrompt = prompt;
}

function clearLinkPrompt() {
    if (!linkPrompt) return false;
    linkPrompt.remove();
    linkPrompt = null;
    return true;
}

export function dismissLinkPrompt() {
    return clearLinkPrompt();
}

function clientToWorld(clientX, clientY) {
    const viewport = document.getElementById('graph-viewport');
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    return {
        x: (clientX - rect.left - viewState.x) / viewState.scale,
        y: (clientY - rect.top - viewState.y) / viewState.scale
    };
}

function handlePointerMove(event) {
    if (dragState.mode === 'node') {
        const project = getCurrentProject();
        if (!project) return;
        const primaryStart = dragState.nodeStartPositions[dragState.nodeId];
        if (!primaryStart) return;
        const dx = (event.clientX - dragState.startX) / viewState.scale;
        const dy = (event.clientY - dragState.startY) / viewState.scale;
        let appliedDx = dx;
        let appliedDy = dy;
        if (event.shiftKey) {
            const grid = 32;
            const snappedX = Math.round((primaryStart.x + dx) / grid) * grid;
            const snappedY = Math.round((primaryStart.y + dy) / grid) * grid;
            appliedDx = snappedX - primaryStart.x;
            appliedDy = snappedY - primaryStart.y;
        }

        const idsToMove = dragState.selectedIds.length ? dragState.selectedIds : [dragState.nodeId];
        idsToMove.forEach(id => {
            const start = dragState.nodeStartPositions[id];
            const node = project.nodes[id];
            if (!start || !node) return;
            node.x = start.x + appliedDx;
            node.y = start.y + appliedDy;
            const el = document.querySelector(`[data-node-id="${node.id}"]`);
            if (el) {
                el.style.transform = `translate(${node.x}px, ${node.y}px)`;
            }
        });
        scheduleEdgesRender();
    } else if (dragState.mode === 'resize') {
        const project = getCurrentProject();
        if (!project) return;
        const node = project.nodes[dragState.nodeId];
        if (!node) return;
        const dx = (event.clientX - dragState.startX) / viewState.scale;
        const dy = (event.clientY - dragState.startY) / viewState.scale;
        const nextWidth = Math.max(320, dragState.resizeStartWidth + dx);
        const nextHeight = Math.max(300, dragState.resizeStartHeight + dy);
        node.width = nextWidth;
        node.height = nextHeight;
        const el = document.querySelector(`[data-node-id="${node.id}"]`);
        if (el) {
            el.style.width = `${node.width}px`;
            el.style.height = `${node.height}px`;
        }
        scheduleEdgesRender();
    } else if (dragState.mode === 'pan') {
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;
        viewState.x = dragState.nodeStartX + dx;
        viewState.y = dragState.nodeStartY + dy;
        applyViewTransform();
    }
}

function startMarquee(event, viewport) {
    if (!viewport) return;
    marqueeState.active = true;
    marqueeState.startX = event.clientX;
    marqueeState.startY = event.clientY;
    marqueeState.additive = true;
    marqueeState.invert = event.altKey;

    if (!marqueeState.box) {
        marqueeState.box = document.createElement('div');
        marqueeState.box.className = 'graph-marquee';
        viewport.appendChild(marqueeState.box);
    }

    marqueeState.box.style.display = 'block';
    updateMarqueeBox(event, viewport);

    document.addEventListener('pointermove', handleMarqueeMove);
    document.addEventListener('pointerup', handleMarqueeUp, { once: true });
}

function updateMarqueeBox(event, viewport) {
    if (!marqueeState.box || !viewport) return;
    const rect = viewport.getBoundingClientRect();
    const startX = marqueeState.startX - rect.left;
    const startY = marqueeState.startY - rect.top;
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    marqueeState.box.style.left = `${left}px`;
    marqueeState.box.style.top = `${top}px`;
    marqueeState.box.style.width = `${width}px`;
    marqueeState.box.style.height = `${height}px`;
}

function handleMarqueeMove(event) {
    const viewport = document.getElementById('graph-viewport');
    updateMarqueeBox(event, viewport);
}

function handleMarqueeUp(event) {
    document.removeEventListener('pointermove', handleMarqueeMove);
    marqueeState.active = false;
    const viewport = document.getElementById('graph-viewport');
    if (marqueeState.box) {
        marqueeState.box.style.display = 'none';
    }
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const x1 = Math.min(marqueeState.startX, event.clientX) - rect.left;
    const y1 = Math.min(marqueeState.startY, event.clientY) - rect.top;
    const x2 = Math.max(marqueeState.startX, event.clientX) - rect.left;
    const y2 = Math.max(marqueeState.startY, event.clientY) - rect.top;

    const selected = Array.from(document.querySelectorAll('.graph-node'))
        .filter(node => {
            const nodeRect = node.getBoundingClientRect();
            const nodeX1 = nodeRect.left - rect.left;
            const nodeY1 = nodeRect.top - rect.top;
            const nodeX2 = nodeRect.right - rect.left;
            const nodeY2 = nodeRect.bottom - rect.top;
            return !(nodeX2 < x1 || nodeX1 > x2 || nodeY2 < y1 || nodeY1 > y2);
        })
        .map(node => node.dataset.nodeId)
        .filter(Boolean);

    if (onSelectNodes) {
        onSelectNodes(selected, {
            additive: marqueeState.additive,
            invert: marqueeState.invert
        });
    }
}

function handlePointerUp() {
    document.removeEventListener('pointermove', handlePointerMove);
    dragState.mode = null;
    dragState.nodeId = null;
    dragState.startX = 0;
    dragState.startY = 0;
    dragState.nodeStartX = 0;
    dragState.nodeStartY = 0;
    dragState.resizeStartWidth = 0;
    dragState.resizeStartHeight = 0;
    dragState.selectedIds = [];
    dragState.nodeStartPositions = {};
    saveState();
}

function startNodeResize(event, nodeId) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (onSelectNode) onSelectNode(nodeId, event.shiftKey);
    const project = getCurrentProject();
    if (!project || !project.nodes[nodeId]) return;
    const node = project.nodes[nodeId];
    dragState.mode = 'resize';
    dragState.nodeId = nodeId;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.resizeStartWidth = node.width || 320;
    dragState.resizeStartHeight = node.height || 300;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp, { once: true });
}

export function initGraphCanvas() {
    const viewport = document.getElementById('graph-viewport');
    if (!viewport) return;

    viewport.addEventListener('pointerdown', event => {
        if (clearLinkPrompt()) return;
        if (event.target.closest('.graph-node')) return;
        if (event.shiftKey) {
            event.preventDefault();
            startMarquee(event, viewport);
            return;
        }
        dragState.mode = 'pan';
        dragState.nodeId = null;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.nodeStartX = viewState.x;
        dragState.nodeStartY = viewState.y;
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp, { once: true });
    });

    viewport.addEventListener('wheel', event => {
        event.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const worldX = (mouseX - viewState.x) / viewState.scale;
        const worldY = (mouseY - viewState.y) / viewState.scale;
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const nextScale = clamp(viewState.scale * delta, 0.1, 2.2);
        viewState.scale = nextScale;
        viewState.x = mouseX - worldX * viewState.scale;
        viewState.y = mouseY - worldY * viewState.scale;
        applyViewTransform();
    }, { passive: false });

    window.addEventListener('resize', () => {
        scheduleEdgesRender();
    });
}

export function applyViewTransform() {
    const world = document.getElementById('graph-world');
    if (!world) return;
    world.style.transform = `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`;
    scheduleEdgesRender();
}

export function resetGraphView() {
    const viewport = document.getElementById('graph-viewport');
    if (!viewport) return;
    viewState.scale = 1;
    viewState.x = viewport.clientWidth / 2;
    viewState.y = viewport.clientHeight / 2;
    applyViewTransform();
}

export function fitGraphToNodes() {
    const project = getCurrentProject();
    const viewport = document.getElementById('graph-viewport');
    if (!project || !viewport) return;

    const nodes = Object.values(project.nodes);
    if (nodes.length === 0) return;

    const bounds = nodes.reduce((acc, node) => {
        acc.minX = Math.min(acc.minX, node.x);
        acc.minY = Math.min(acc.minY, node.y);
        acc.maxX = Math.max(acc.maxX, node.x + (node.width || 320));
        acc.maxY = Math.max(acc.maxY, node.y + (node.height || 300));
        return acc;
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const scaleX = viewport.clientWidth / (width + 200);
    const scaleY = viewport.clientHeight / (height + 200);
    viewState.scale = clamp(Math.min(scaleX, scaleY), 0.1, 1.4);
    viewState.x = viewport.clientWidth / 2 - (bounds.minX + width / 2) * viewState.scale;
    viewState.y = viewport.clientHeight / 2 - (bounds.minY + height / 2) * viewState.scale;
    applyViewTransform();
}

export function getViewCenterWorld() {
    const viewport = document.getElementById('graph-viewport');
    if (!viewport) return { x: 0, y: 0 };
    return {
        x: (viewport.clientWidth / 2 - viewState.x) / viewState.scale,
        y: (viewport.clientHeight / 2 - viewState.y) / viewState.scale
    };
}

export function focusNode(nodeId) {
    const project = getCurrentProject();
    const node = project?.nodes[nodeId];
    if (!node) return;
    const viewport = document.getElementById('graph-viewport');
    if (!viewport) return;
    viewState.x = viewport.clientWidth / 2 - (node.x + 130) * viewState.scale;
    viewState.y = viewport.clientHeight / 2 - (node.y + 120) * viewState.scale;
    applyViewTransform();

    const el = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (el) {
        el.classList.add('is-active');
        setTimeout(() => el.classList.remove('is-active'), 1200);
    }
}
