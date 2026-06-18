import { NODE_DEFS } from './config.js?v=1.4.9';
import {
    state,
    initState,
    setCurrentProjectId,
    getCurrentProject,
    setSelectedNodeId,
    getSelectedNodeId,
    getSelectedNodeIds,
    setSelectedNodeIds,
    toggleSelectedNodeId,
    clearSelectedNodeIds,
    saveState
} from './modules/store.js?v=1.4.9';
import {
    createNewProject,
    deleteCurrentProject,
    updateProjectName,
    updateNodeContent,
    updateNodeMeta,
    createNodeFromTemplateAtPosition,
    createBlankNodeAtPosition,
    autoTidyNodes,
    duplicateNode,
    duplicateNodes,
    deleteNode,
    deleteNodes,
    removeConnection,
    addConnection
} from './modules/nodesData.js?v=1.4.9';
import {
    initGraphCanvas,
    setGraphHandlers,
    renderGraph,
    renderNodeDisplay,
    updateNodeLinksDisplay,
    updateSelectionStyles,
    focusNode,
    fitGraphToNodes,
    resetGraphView,
    getViewCenterWorld,
    renderEdges,
    exitAllEdits,
    dismissLinkPrompt
} from './modules/graphView.js?v=1.4.9';
import {
    initSidebarState,
    initSidebarResize,
    renderProjectSelector,
    renderNodeList,
    setNodeFilter,
    setSidebarHandlers,
    toggleSidebarCompact
} from './modules/uiSidebar.js?v=1.4.9';
import {
    initPropertiesPanel,
    initPropertiesLayout,
    renderPropertiesPanel,
    updateNodeMetaDisplay,
    setPropertiesHandlers
} from './modules/uiProperties.js?v=1.4.9';
import { renderHudTemplates } from './modules/uiHud.js?v=1.4.9';
import { initFileMenu, setFileMenuHandler } from './modules/uiFileMenu.js?v=1.4.9';
import { showHelp, hideHelp } from './modules/uiHelp.js?v=1.4.9';
import {
    loadSharedProjectFromUrl,
    shareCurrentProject,
    exportToJSON,
    importFromJSON,
    exportSingleProject,
    triggerImport,
    triggerSheetImport,
    importSingleSheet,
    setFileIOHandlers
} from './modules/fileIO.js?v=1.4.9';

function handleFileAction(action) {
    switch (action) {
        case 'new':
            createNewProjectAndLoad();
            return;
        case 'save':
            exportSingleProject();
            return;
        case 'load':
            triggerSheetImport();
            return;
        case 'share':
            shareCurrentProject();
            return;
        case 'backup':
            exportToJSON();
            return;
        case 'restore':
            triggerImport();
            return;
        case 'delete':
            deleteProjectAndLoad();
            return;
        case 'help':
            showHelp();
            return;
        default:
            return;
    }
}

function createNewProjectAndLoad() {
    const id = createNewProject('Untitled Design');
    renderProjectSelector();
    loadProject(id);
    if (window.innerWidth < 1024) toggleSidebar();
}

function deleteProjectAndLoad() {
    if (Object.keys(state.projects).length <= 1) return;
    if (!confirm('Are you sure you want to delete this sheet?')) return;
    const nextId = deleteCurrentProject();
    renderProjectSelector();
    loadProject(nextId);
}

function loadProject(id) {
    setCurrentProjectId(id);
    const project = getCurrentProject();
    if (!project) return;
    const nameInput = document.getElementById('projectNameInput');
    if (nameInput) nameInput.value = project.name;
    setSelectedNodeId(null);
    renderPropertiesPanel();
    renderGraph(project);
    updateSelectionStyles([]);
    renderNodeList();
    saveState();
    fitGraphToNodes();
}

function createNodeFromTemplateAtCenter(templateId) {
    const def = NODE_DEFS.find(item => item.id === templateId);
    if (!def) return;
    const position = getNewNodePosition();
    const nodeId = createNodeFromTemplateAtPosition(def, position);
    renderGraph(getCurrentProject());
    renderNodeList();
    if (nodeId) {
        setSelectedNodeId(nodeId);
        renderPropertiesPanel();
        focusNode(nodeId);
    }
}

function createBlankNodeAtCenter() {
    const position = getNewNodePosition();
    const nodeId = createBlankNodeAtPosition(position);
    renderGraph(getCurrentProject());
    renderNodeList();
    if (nodeId) {
        setSelectedNodeId(nodeId);
        renderPropertiesPanel();
        focusNode(nodeId);
    }
}

function createNodeFromHudTemplate() {
    const select = document.getElementById('hud-template-select');
    if (!select || !select.value) return;
    createNodeFromTemplateAtCenter(select.value);
    select.value = '';
}

function handleContentChange(nodeId, value) {
    const result = updateNodeContent(nodeId, value);
    renderNodeDisplay(nodeId);
    if (result.addedLinks) {
        updateNodeLinksDisplay(nodeId);
        renderPropertiesPanel();
    }
}

function handleContentCommit(nodeId, value) {
    updateNodeContent(nodeId, value);
    renderNodeDisplay(nodeId);
}

function handleSelectNode(nodeId, additive = false) {
    if (!nodeId) return;
    if (additive) {
        const selected = getSelectedNodeIds();
        if (selected.includes(nodeId)) {
            setSelectedNodeIds(selected.filter(id => id !== nodeId));
        } else {
            setSelectedNodeIds([...selected, nodeId]);
        }
    } else {
        const selected = getSelectedNodeIds();
        if (selected.length > 1 && selected.includes(nodeId)) {
            const reordered = [...selected.filter(id => id !== nodeId), nodeId];
            setSelectedNodeIds(reordered);
        } else {
            setSelectedNodeId(nodeId);
        }
    }
    updateSelectionStyles(getSelectedNodeIds());
    renderPropertiesPanel();
    renderNodeList();
}

function handleSelectNodes(nodeIds, options = {}) {
    if (!Array.isArray(nodeIds)) return;
    const additive = options?.additive === true;
    const invert = options?.invert === true;
    const current = new Set(getSelectedNodeIds());

    if (invert) {
        nodeIds.forEach(id => {
            if (current.has(id)) {
                current.delete(id);
            } else {
                current.add(id);
            }
        });
        setSelectedNodeIds(Array.from(current));
    } else if (additive) {
        nodeIds.forEach(id => current.add(id));
        setSelectedNodeIds(Array.from(current));
    } else {
        setSelectedNodeIds(nodeIds);
    }
    updateSelectionStyles(getSelectedNodeIds());
    renderPropertiesPanel();
    renderNodeList();
}

function handleCloneSelection(nodeIds, primaryId) {
    const result = duplicateNodes(nodeIds, 0, 0);
    if (!result.ids.length) return null;
    setSelectedNodeIds(result.ids);
    updateSelectionStyles(result.ids);
    renderGraph(getCurrentProject());
    renderNodeList();
    renderPropertiesPanel();
    return { ids: result.ids, primaryId: result.map[primaryId] || result.ids[0] };
}

function handleCreateLink(fromId, toId) {
    const added = addConnection(fromId, toId);
    if (added) {
        updateNodeLinksDisplay(fromId);
        updateNodeLinksDisplay(toId);
        renderGraph(getCurrentProject());
        renderPropertiesPanel();
    }
}

function handleCreateLinkedNode(fromId, templateId, position) {
    if (!fromId || !position) return;
    let newId = null;
    if (templateId) {
        const def = NODE_DEFS.find(item => item.id === templateId);
        if (!def) return;
        newId = createNodeFromTemplateAtPosition(def, position);
    } else {
        newId = createBlankNodeAtPosition(position);
    }
    if (!newId) return;
    addConnection(fromId, newId);
    renderGraph(getCurrentProject());
    renderNodeList();
    setSelectedNodeId(newId);
    updateSelectionStyles([newId]);
    renderPropertiesPanel();
    focusNode(newId);
}

function handleUpdateMeta(field, value) {
    const selectedIds = getSelectedNodeIds();
    if (!selectedIds.length) return;
    const project = getCurrentProject();
    if (!project) return;
    selectedIds.forEach(nodeId => {
        updateNodeMeta(nodeId, field, value);
        if (project.nodes[nodeId]) {
            updateNodeMetaDisplay(project.nodes[nodeId]);
        }
    });
    renderNodeList();
}

function handleUpdateContent(value) {
    const selectedIds = getSelectedNodeIds();
    if (!selectedIds.length) return;
    let updatedLinks = false;
    selectedIds.forEach(nodeId => {
        const result = updateNodeContent(nodeId, value);
        renderNodeDisplay(nodeId);
        if (result?.addedLinks) updatedLinks = true;
    });
    if (updatedLinks) {
        selectedIds.forEach(nodeId => updateNodeLinksDisplay(nodeId));
        renderPropertiesPanel();
    }
}

function handleFocusSelected() {
    const nodeId = getSelectedNodeId();
    if (nodeId) focusNode(nodeId);
}

function handleDuplicateSelected() {
    const nodeId = getSelectedNodeId();
    if (!nodeId) return;
    const newId = duplicateNode(nodeId);
    renderGraph(getCurrentProject());
    renderNodeList();
    if (newId) {
        setSelectedNodeId(newId);
        renderPropertiesPanel();
        focusNode(newId);
    }
}

function handleDeleteSelected() {
    const selectedIds = getSelectedNodeIds();
    if (!selectedIds.length) return;
    if (selectedIds.length === 1) {
        if (!confirm('Delete this node?')) return;
        deleteNode(selectedIds[0]);
    } else {
        if (!confirm(`Delete ${selectedIds.length} nodes?`)) return;
        deleteNodes(selectedIds);
    }
    clearSelectedNodeIds();
    updateSelectionStyles([]);
    renderGraph(getCurrentProject());
    renderNodeList();
    renderPropertiesPanel();
}

function handleAutoTidy() {
    const didTidy = autoTidyNodes();
    if (!didTidy) return;
    renderGraph(getCurrentProject());
    renderNodeList();
    renderPropertiesPanel();
    renderEdges();
}

function handleKeyDown(event) {
    if (event.shiftKey && (event.key === 'D' || event.key === 'd')) {
        event.preventDefault();
        handleDuplicateSelected();
        return;
    }
    if (event.key === 'Escape') {
        if (dismissLinkPrompt()) return;
        const didExit = exitAllEdits();
        if (!didExit) {
            clearSelectedNodeIds();
            updateSelectionStyles([]);
            renderPropertiesPanel();
            renderNodeList();
        }
        return;
    }
    if (event.key !== 'Delete') return;
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return;
    handleDeleteSelected();
}

function getNewNodePosition() {
    const project = getCurrentProject();
    const selectedId = getSelectedNodeId();
    if (project && selectedId && project.nodes[selectedId]) {
        const node = project.nodes[selectedId];
        return { x: node.x + 280, y: node.y };
    }
    return getViewCenterWorld();
}

function handleRemoveConnection(targetId) {
    const nodeId = getSelectedNodeId();
    if (!nodeId) return;
    const removed = removeConnection(nodeId, targetId);
    if (removed) {
        updateNodeLinksDisplay(nodeId);
        updateNodeLinksDisplay(targetId);
        renderPropertiesPanel();
        renderEdges();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('closed');
    overlay.classList.toggle('hidden');
}

function init() {
    const currentId = initState();
    const sharedId = loadSharedProjectFromUrl();
    if (sharedId) setCurrentProjectId(sharedId);

    initGraphCanvas();
    initFileMenu();
    initSidebarState();
    initSidebarResize();
    initPropertiesLayout();
    initPropertiesPanel();
    renderProjectSelector();
    renderNodeList();
    renderHudTemplates();

    setGraphHandlers({
        onSelectNode: handleSelectNode,
        onSelectNodes: handleSelectNodes,
        onCloneSelection: handleCloneSelection,
        onCreateLink: handleCreateLink,
        onCreateLinkedNode: handleCreateLinkedNode,
        templateOptions: NODE_DEFS,
        onContentChange: handleContentChange,
        onContentCommit: handleContentCommit
    });

    setSidebarHandlers({
        onSelectNode: handleSelectNode,
        onFocusNode: focusNode
    });

    setPropertiesHandlers({
        onUpdateMeta: handleUpdateMeta,
        onUpdateContent: handleUpdateContent,
        onFocus: handleFocusSelected,
        onDuplicate: handleDuplicateSelected,
        onDelete: handleDeleteSelected,
        onRemoveConnection: handleRemoveConnection
    });

    setFileMenuHandler(handleFileAction);
    document.addEventListener('keydown', handleKeyDown);
    setFileIOHandlers({
        onStateImported: importedState => {
            state.projects = importedState.projects;
            state.currentId = importedState.currentId;
            state.helpSeen = !!importedState.helpSeen;
            saveState();
            init();
        },
        onProjectImported: newId => {
            renderProjectSelector();
            loadProject(newId);
        }
    });

    loadProject(state.currentId || currentId);
    lucide.createIcons();

    if (!state.helpSeen) {
        setTimeout(showHelp, 800);
    }
}

window.addEventListener('load', init);

window.createNewProject = createNewProjectAndLoad;
window.deleteCurrentProject = deleteProjectAndLoad;
window.loadProject = loadProject;
window.updateProjectName = value => {
    updateProjectName(value);
    renderProjectSelector();
};
window.createBlankNodeAtCenter = createBlankNodeAtCenter;
window.createNodeFromHudTemplate = createNodeFromHudTemplate;
window.resetGraphView = resetGraphView;
window.fitGraphToNodes = fitGraphToNodes;
window.toggleSidebar = toggleSidebar;
window.toggleSidebarCompact = toggleSidebarCompact;
window.showHelp = showHelp;
window.hideHelp = hideHelp;
window.setNodeFilter = setNodeFilter;
window.focusNode = focusNode;
window.triggerImport = triggerImport;
window.importFromJSON = importFromJSON;
window.triggerSheetImport = triggerSheetImport;
window.importSingleSheet = importSingleSheet;
window.selectAndFocusNode = selectAndFocusNode;
window.autoTidyNodes = handleAutoTidy;

function selectAndFocusNode(nodeId) {
    if (!nodeId) return;
    setSelectedNodeId(nodeId);
    updateSelectionStyles([nodeId]);
    renderPropertiesPanel();
    renderNodeList();
    focusNode(nodeId);
}
