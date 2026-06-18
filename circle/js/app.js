let state = {
    projects: {},
    currentId: null,
    activeTab: 'workspace',
    helpSeen: false
};

function init() {
    const saved = localStorage.getItem('gdc_workspace_v2');
    if (saved) {
        state = JSON.parse(saved);
        state.activeTab = 'workspace';
    } else {
        const initialId = 'p_' + Date.now();
        state.projects = { 
            [initialId]: { id: initialId, name: 'My New Game', nodes: { n1: '', n2: '', n3: '', n4: '', n5: '', n6: '', n7: '', n8: '' } } 
        };
        state.currentId = initialId;
    }
    
    const sharedId = loadSharedProjectFromUrl();
    if (sharedId) {
        state.currentId = sharedId;
    }

    renderProjectSelector();
    renderNavLinks();
    renderHandoutSideA();
    loadProject(state.currentId);
    lucide.createIcons();

    if (!state.helpSeen) {
        setTimeout(showHelp, 800);
    }
}

function save() {
    localStorage.setItem('gdc_workspace_v2', JSON.stringify(state));
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`.trim();
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, 2500);
}

function showHelp() {
    document.getElementById('help-modal').classList.remove('hidden');
}

function hideHelp() {
    document.getElementById('help-modal').classList.add('hidden');
    if (!state.helpSeen) {
        state.helpSeen = true;
        save();
    }
}

function createNewProject() {
    const id = 'p_' + Date.now();
    state.projects[id] = { id, name: 'Untitled Design', nodes: { n1: '', n2: '', n3: '', n4: '', n5: '', n6: '', n7: '', n8: '' } };
    state.currentId = id;
    save();
    renderProjectSelector();
    loadProject(id);
    switchTab('workspace');
    if (window.innerWidth < 1024) toggleSidebar();
}

function deleteCurrentProject() {
    if (Object.keys(state.projects).length <= 1) return;
    if (!confirm('Are you sure you want to delete this sheet?')) return;
    delete state.projects[state.currentId];
    state.currentId = Object.keys(state.projects)[0];
    save();
    renderProjectSelector();
    loadProject(state.currentId);
}

function updateProjectName(name) {
    state.projects[state.currentId].name = name;
    document.getElementById('print-project-name').innerText = 'Design Worksheet: ' + name;
    save();
    const opt = document.querySelector(`#projectSelector option[value="${state.currentId}"]`);
    if (opt) opt.textContent = name;
}

function updateNodeContent(nodeId, value) {
    state.projects[state.currentId].nodes[nodeId] = value;
    const mirror = document.getElementById(`mirror-${nodeId}`);
    if (mirror) mirror.innerText = value || "(No content entered)";
    save();
}

function renderNodeDisplay(nodeId) {
    const project = state.projects[state.currentId];
    const display = document.getElementById(`display-${nodeId}`);
    if (!display) return;
    const raw = project.nodes[nodeId] || '';
    
    if (!raw || raw.trim() === '') {
        display.innerHTML = '';
        return;
    }
    
    try {
        const parsed = marked.parse(raw);
        display.innerHTML = parsed;
    } catch (err) {
        console.error(`Error rendering node ${nodeId}:`, err);
        display.innerHTML = `<p>${raw}</p>`;
    }
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
    updateNodeContent(nodeId, textarea.value);
    renderNodeDisplay(nodeId);
    textarea.classList.add('hidden');
    display.classList.remove('hidden');
}

function loadProject(id) {
    state.currentId = id;
    const project = state.projects[id];
    document.getElementById('projectNameInput').value = project.name;
    document.getElementById('print-project-name').innerText = 'Design Worksheet: ' + project.name;
    renderWorkspaceNodes(project.nodes);
    save();
}

function renderProjectSelector() {
    const selector = document.getElementById('projectSelector');
    selector.innerHTML = '';
    Object.values(state.projects).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        opt.selected = p.id === state.currentId;
        selector.appendChild(opt);
    });
}

function renderNavLinks() {
    const container = document.getElementById('nav-links');
    container.innerHTML = '';
    NODE_DEFS.forEach(node => {
        const btn = document.createElement('button');
        btn.className = 'dc-nav-link';
        btn.onclick = () => scrollToNode(node.id);
        btn.innerHTML = `<span class="dc-nav-index">${node.label}</span>${node.title.split(' ')[0]}`;
        container.appendChild(btn);
    });
}

function renderWorkspaceNodes(nodeData) {
    const container = document.getElementById('node-editor-container');
    container.innerHTML = '';
    NODE_DEFS.forEach(node => {
        const details = document.createElement('details');
        details.id = `section-${node.id}`;
        details.className = 'group dc-editor-card print:shadow-none print:break-inside-avoid print:mb-8';
        details.open = true;
        const content = nodeData[node.id] || '';
        details.innerHTML = `
            <summary class="dc-editor-summary">
                <div class="dc-node-heading">
                    <span class="dc-node-label">${node.label}</span>
                    <h3 class="dc-node-title">${node.title}</h3>
                </div>
                <i data-lucide="chevron-down" class="dc-chevron group-open:rotate-180 transition-transform print:hidden w-5 h-5"></i>
            </summary>
            <div class="dc-node-body space-y-3">
                <div class="dc-node-prompt print:hidden">
                    <p class="dc-node-question">${node.question}</p>
                    <p class="dc-node-tip">${node.tip}</p>
                </div>
                <div
                    id="display-${node.id}"
                    class="node-display text-sm cursor-text"
                    onclick="enterEdit('${node.id}')"
                ></div>
                <textarea 
                    id="input-${node.id}"
                    oninput="updateNodeContent('${node.id}', this.value)"
                    onblur="exitEdit('${node.id}')"
                    placeholder="Document your design logic here..."
                    class="dc-node-textarea hidden"
                >${content}</textarea>
                <div id="mirror-${node.id}" class="print-mirror">${content || '(No content entered)'}</div>
            </div>
        `;
        container.appendChild(details);
    });
    lucide.createIcons();
    NODE_DEFS.forEach(node => renderNodeDisplay(node.id));
}

function renderHandoutSideA() {
    const container = document.getElementById('handout-nodes');
    container.innerHTML = '';
    NODE_DEFS.forEach(node => {
        const item = document.createElement('div');
        item.className = 'dc-handout-node';
        item.innerHTML = `
            <span class="vellum-archive-ref w-4">${node.label}</span>
            <div>
                <p class="vellum-archive-card-title dc-handout-node-title">${node.title}</p>
                <p class="vellum-archive-card-client dc-handout-node-tip">${node.tip}</p>
            </div>
        `;
        container.appendChild(item);
    });
}

function switchTab(tab) {
    state.activeTab = tab;
    const workspace = document.getElementById('view-workspace');
    const handout = document.getElementById('view-handout');
    const tabW = document.getElementById('tab-workspace');
    const tabH = document.getElementById('tab-handout');
    const main = document.getElementById('main-content');
    
    if (tab === 'workspace') {
        workspace.classList.remove('hidden');
        handout.classList.add('hidden');
        tabW.className = 'vellum-view-toggle is-active';
        tabH.className = 'vellum-view-toggle';
        tabW.setAttribute('aria-pressed', 'true');
        tabH.setAttribute('aria-pressed', 'false');
        main.classList.remove('items-center');
        main.classList.add('p-4', 'sm:p-8');
    } else {
        workspace.classList.add('hidden');
        handout.classList.remove('hidden');
        tabH.className = 'vellum-view-toggle is-active';
        tabW.className = 'vellum-view-toggle';
        tabH.setAttribute('aria-pressed', 'true');
        tabW.setAttribute('aria-pressed', 'false');
        main.classList.add('items-center');
        main.classList.remove('p-4', 'sm:p-8');
    }
    lucide.createIcons();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('closed');
    overlay.classList.toggle('hidden');
}

function scrollToNode(id) {
    switchTab('workspace');
    setTimeout(() => {
        const el = document.getElementById(`section-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.innerWidth < 1024) toggleSidebar();
        }
    }, 100);
}

// --- File I/O Logic ---

function loadSharedProjectFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const payload = params.get('share');
    if (!payload) return null;

    try {
        const json = LZString.decompressFromEncodedURIComponent(payload);
        if (!json) return null;
        const project = JSON.parse(json);
        if (!project || !project.nodes || !project.name) return null;

        let targetId = null;
        if (state.currentId && state.projects[state.currentId]) {
            const overwrite = confirm('Import shared sheet?\nOK = overwrite current sheet\nCancel = add as new sheet');
            if (overwrite) {
                targetId = state.currentId;
            }
        }

        if (!targetId) {
            targetId = 'p_' + Date.now();
        }

        project.id = targetId;
        state.projects[targetId] = project;
        state.currentId = targetId;
        save();
        showToast('Shared sheet imported.', 'success');

        const url = new URL(window.location.href);
        url.searchParams.delete('share');
        window.history.replaceState({}, document.title, url.toString());

        return targetId;
    } catch (err) {
        console.error('Failed to load shared sheet:', err);
        showToast('Failed to load shared sheet.', 'error');
        return null;
    }
}

function shareCurrentProject() {
    const project = state.projects[state.currentId];
    if (!project) return;

    try {
        const json = JSON.stringify(project);
        const compressed = LZString.compressToEncodedURIComponent(json);
        const url = new URL(window.location.href);
        url.searchParams.set('share', compressed);
        const shareUrl = url.toString();
        if (shareUrl.length > 1800) {
            showToast('Share link is long and may fail in some apps.', 'warn');
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl)
                .then(() => showToast('Share link copied to clipboard.', 'success'))
                .catch(() => prompt('Copy this link:', shareUrl));
        } else {
            prompt('Copy this link:', shareUrl);
        }
    } catch (err) {
        console.error('Failed to create share link:', err);
        showToast('Unable to create share link.', 'error');
    }
}

function exportToJSON() {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `full-workspace-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function triggerImport() {
    document.getElementById('importInput').click();
}

function importFromJSON(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            if (!importedState.projects) throw new Error('Not a valid workspace file');
            if (confirm('Replace your current workspace with this archive?')) {
                state = importedState;
                save();
                init();
            }
        } catch (err) { alert('Import failed: ' + err.message); }
        finally { input.value = ''; }
    };
    reader.readAsText(file);
}

function exportSingleProject() {
    const project = state.projects[state.currentId];
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-sheet.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function triggerSheetImport() {
    document.getElementById('importSheetInput').click();
}

function importSingleSheet(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const project = JSON.parse(e.target.result);
            if (!project.nodes || !project.name) throw new Error('Not a valid sheet file');
            const newId = 'p_' + Date.now();
            project.id = newId;
            state.projects[newId] = project;
            state.currentId = newId;
            save();
            renderProjectSelector();
            loadProject(newId);
        } catch (err) { alert('Import failed: ' + err.message); }
        finally { input.value = ''; }
    };
    reader.readAsText(file);
}

window.onload = init;
