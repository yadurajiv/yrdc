import {
    getCurrentProject,
    getSelectedNodeId,
    getSelectedNodeIds,
    PROPERTIES_WIDTH_KEY,
    PROPERTIES_COLLAPSED_KEY
} from './store.js?v=1.4.9';
import { clamp } from './utils.js?v=1.4.9';
import { getLinkedNodes, setEdgeHighlight } from './graphView.js?v=1.4.9';

let onUpdateMeta = null;
let onUpdateContent = null;
let onFocus = null;
let onDuplicate = null;
let onDelete = null;
let onRemoveConnection = null;

export function setPropertiesHandlers(handlers) {
    onUpdateMeta = handlers?.onUpdateMeta || null;
    onUpdateContent = handlers?.onUpdateContent || null;
    onFocus = handlers?.onFocus || null;
    onDuplicate = handlers?.onDuplicate || null;
    onDelete = handlers?.onDelete || null;
    onRemoveConnection = handlers?.onRemoveConnection || null;
}

export function initPropertiesPanel() {
    const title = document.getElementById('prop-title');
    const question = document.getElementById('prop-question');
    const tip = document.getElementById('prop-tip');
    const content = document.getElementById('prop-content');
    const group = document.getElementById('prop-group');
    const tags = document.getElementById('prop-tags');
    const focusBtn = document.getElementById('prop-focus');
    const duplicateBtn = document.getElementById('prop-duplicate');
    const deleteBtn = document.getElementById('prop-delete');
    const links = document.getElementById('prop-links');
    const collapseBtn = document.getElementById('properties-collapse');
    const toggleBtn = document.getElementById('properties-toggle');
    const resizer = document.getElementById('properties-resizer');

    if (title) {
        title.addEventListener('input', () => {
            if (onUpdateMeta) onUpdateMeta('title', title.value);
        });
    }
    if (question) {
        question.addEventListener('input', () => {
            if (onUpdateMeta) onUpdateMeta('question', question.value);
        });
    }
    if (tip) {
        tip.addEventListener('input', () => {
            if (onUpdateMeta) onUpdateMeta('tip', tip.value);
        });
    }
    if (content) {
        content.addEventListener('input', () => {
            if (onUpdateContent) onUpdateContent(content.value);
        });
    }
    if (group) {
        group.addEventListener('input', () => {
            if (onUpdateMeta) onUpdateMeta('group', group.value);
        });
    }
    if (tags) {
        tags.addEventListener('input', () => {
            if (onUpdateMeta) onUpdateMeta('tags', tags.value);
        });
    }
    if (focusBtn) {
        focusBtn.addEventListener('click', () => {
            if (onFocus) onFocus();
        });
    }
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => {
            if (onDuplicate) onDuplicate();
        });
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (onDelete) onDelete();
        });
    }
    if (links) {
        links.addEventListener('click', event => {
            const btn = event.target.closest('[data-remove-link]');
            if (!btn) return;
            if (onRemoveConnection) onRemoveConnection(btn.dataset.removeLink);
        });
        links.addEventListener('pointerover', event => {
            const item = event.target.closest('[data-link-target]');
            if (!item) return;
            setEdgeHighlight(item.dataset.linkSource, item.dataset.linkTarget, true);
        });
        links.addEventListener('pointerout', event => {
            const item = event.target.closest('[data-link-target]');
            if (!item) return;
            setEdgeHighlight(item.dataset.linkSource, item.dataset.linkTarget, false);
        });
    }

    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => togglePropertiesPanel());
    }
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => togglePropertiesPanel(true));
    }
    if (resizer) {
        initPropertiesResize(resizer);
    }
}

export function initPropertiesLayout() {
    const savedWidth = parseInt(localStorage.getItem(PROPERTIES_WIDTH_KEY), 10);
    if (!Number.isNaN(savedWidth)) {
        document.body.style.setProperty('--properties-width', `${savedWidth}px`);
    }
    const collapsed = localStorage.getItem(PROPERTIES_COLLAPSED_KEY) === '1';
    document.body.classList.toggle('properties-collapsed', collapsed);
}

export function togglePropertiesPanel(forceOpen = null) {
    let shouldCollapse = document.body.classList.contains('properties-collapsed');
    if (forceOpen === null) {
        shouldCollapse = !shouldCollapse;
    } else if (forceOpen === true) {
        shouldCollapse = false;
    } else {
        shouldCollapse = true;
    }
    document.body.classList.toggle('properties-collapsed', shouldCollapse);
    localStorage.setItem(PROPERTIES_COLLAPSED_KEY, shouldCollapse ? '1' : '0');
}

function initPropertiesResize(resizer) {
    resizer.addEventListener('pointerdown', event => {
        if (document.body.classList.contains('properties-collapsed')) return;
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = parseInt(getComputedStyle(document.body).getPropertyValue('--properties-width'), 10) || 280;

        const onMove = moveEvent => {
            const delta = startX - moveEvent.clientX;
            const next = clamp(startWidth + delta, 220, 420);
            document.body.style.setProperty('--properties-width', `${next}px`);
            localStorage.setItem(PROPERTIES_WIDTH_KEY, `${next}`);
        };

        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
}

export function renderPropertiesPanel() {
    const project = getCurrentProject();
    const selectedNodeId = getSelectedNodeId();
    const emptyState = document.getElementById('properties-empty');
    const fields = document.getElementById('properties-fields');
    const title = document.getElementById('prop-title');
    const question = document.getElementById('prop-question');
    const tip = document.getElementById('prop-tip');
    const content = document.getElementById('prop-content');
    const group = document.getElementById('prop-group');
    const tags = document.getElementById('prop-tags');
    const links = document.getElementById('prop-links');
    const subtitle = document.querySelector('.properties-subtitle');

    if (!project || !selectedNodeId || !project.nodes[selectedNodeId]) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (fields) fields.classList.add('hidden');
        if (subtitle) subtitle.textContent = 'Select a node to edit its details.';
        return;
    }

    const node = project.nodes[selectedNodeId];
    if (title) title.value = node.title || '';
    if (question) question.value = node.question || '';
    if (tip) tip.value = node.tip || '';
    if (content) content.value = node.content || '';
    if (group) group.value = node.group || '';
    if (tags) tags.value = Array.isArray(node.tags) ? node.tags.join(', ') : '';
    if (links) {
        const linked = getLinkedNodes(node.id, project);
        links.innerHTML = linked.length
            ? linked.map(linkedNode => `
                <div class="properties-link-item" data-link-source="${node.id}" data-link-target="${linkedNode.id}">
                    <span>${linkedNode.title}</span>
                    <button data-remove-link="${linkedNode.id}">Remove</button>
                </div>
            `).join('')
            : '<div class="properties-empty">No connections yet.</div>';
    }
    if (subtitle) {
        const selectedIds = getSelectedNodeIds();
        subtitle.textContent = selectedIds.length > 1
            ? `Editing ${selectedIds.length} nodes. Changes apply to all.`
            : 'Select a node to edit its details.';
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (fields) fields.classList.remove('hidden');
}

export function updateNodeMetaDisplay(node) {
    const el = document.querySelector(`[data-node-id="${node.id}"]`);
    if (!el) return;
    const title = el.querySelector('.node-title');
    const question = el.querySelector('.node-question');
    const tip = el.querySelector('.node-tip');
    if (title) title.textContent = node.title;
    if (question) question.textContent = node.question;
    if (tip) tip.textContent = node.tip;
}
