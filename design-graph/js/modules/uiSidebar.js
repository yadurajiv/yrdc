import {
    state,
    COMPACT_KEY,
    SIDEBAR_WIDTH_KEY,
    getNodeFilterValue,
    getSelectedNodeIds,
    setNodeFilterValue
} from './store.js?v=1.4.9';
import { clamp } from './utils.js?v=1.4.9';

let onSelectNode = null;
let onFocusNode = null;

export function setSidebarHandlers(handlers) {
    onSelectNode = handlers?.onSelectNode || null;
    onFocusNode = handlers?.onFocusNode || null;
}

export function renderProjectSelector() {
    const selector = document.getElementById('projectSelector');
    if (!selector) return;
    selector.innerHTML = '';
    Object.values(state.projects).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        opt.selected = p.id === state.currentId;
        selector.appendChild(opt);
    });
}

export function renderNodeList() {
    const container = document.getElementById('nav-links');
    if (!container) return;
    container.innerHTML = '';
    const project = state.projects[state.currentId];
    if (!project) return;
    const filter = getNodeFilterValue();
    const selectedIds = new Set(getSelectedNodeIds());

    Object.values(project.nodes)
        .filter(node => !filter || node.title.toLowerCase().includes(filter))
        .forEach(node => {
            const btn = document.createElement('button');
            btn.className = `node-list-item ${selectedIds.has(node.id) ? 'is-selected' : ''}`.trim();
            btn.addEventListener('pointerdown', event => {
                event.preventDefault();
                const additive = event.shiftKey;
                if (onSelectNode) onSelectNode(node.id, additive);
                if (!additive && onFocusNode) onFocusNode(node.id);
            });
            btn.innerHTML = `
                <span class="node-list-badge">${node.label || 'NODE'}</span>
                <span class="node-list-title">${node.title}</span>
            `;
            container.appendChild(btn);
        });
}

export function initSidebarState() {
    const compact = localStorage.getItem(COMPACT_KEY) === '1';
    document.body.classList.toggle('sidebar-collapsed', compact);
}

export function toggleSidebarCompact() {
    const compact = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem(COMPACT_KEY, compact ? '1' : '0');
}

export function initSidebarResize() {
    const resizer = document.getElementById('sidebar-resizer');
    const savedWidth = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
    if (!Number.isNaN(savedWidth)) {
        document.body.style.setProperty('--sidebar-width', `${savedWidth}px`);
    }
    if (!resizer) return;

    resizer.addEventListener('pointerdown', event => {
        if (document.body.classList.contains('sidebar-collapsed')) return;
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = parseInt(getComputedStyle(document.body).getPropertyValue('--sidebar-width'), 10) || 240;

        const onMove = moveEvent => {
            const delta = moveEvent.clientX - startX;
            const next = clamp(startWidth + delta, 180, 360);
            document.body.style.setProperty('--sidebar-width', `${next}px`);
            localStorage.setItem(SIDEBAR_WIDTH_KEY, `${next}`);
        };

        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
}

export function setNodeFilter(value) {
    setNodeFilterValue((value || '').trim().toLowerCase());
    renderNodeList();
}
