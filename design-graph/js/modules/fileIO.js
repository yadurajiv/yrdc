import { state, getCurrentProject, saveState, upgradeState, setCurrentProjectId } from './store.js?v=1.4.9';
import { showToast } from './toasts.js?v=1.4.9';

let onStateImported = null;
let onProjectImported = null;

export function setFileIOHandlers(handlers) {
    onStateImported = handlers?.onStateImported || null;
    onProjectImported = handlers?.onProjectImported || null;
}

export function loadSharedProjectFromUrl() {
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
        project.edges = project.edges || [];
        state.projects[targetId] = project;
        setCurrentProjectId(targetId);
        saveState();
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

export function shareCurrentProject() {
    const project = getCurrentProject();
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

export function exportToJSON() {
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

export function triggerImport() {
    document.getElementById('importInput')?.click();
}

export function importFromJSON(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = upgradeState(JSON.parse(e.target.result));
            if (!importedState.projects) throw new Error('Not a valid workspace file');
            if (confirm('Replace your current workspace with this archive?')) {
                if (onStateImported) onStateImported(importedState);
            }
        } catch (err) { alert('Import failed: ' + err.message); }
        finally { input.value = ''; }
    };
    reader.readAsText(file);
}

export function exportSingleProject() {
    const project = getCurrentProject();
    if (!project) return;
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

export function triggerSheetImport() {
    document.getElementById('importSheetInput')?.click();
}

export function importSingleSheet(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const project = upgradeState({ projects: { temp: JSON.parse(e.target.result) } }).projects.temp;
            if (!project.nodes || !project.name) throw new Error('Not a valid sheet file');
            const newId = 'p_' + Date.now();
            project.id = newId;
            project.edges = project.edges || [];
            state.projects[newId] = project;
            setCurrentProjectId(newId);
            saveState();
            if (onProjectImported) onProjectImported(newId);
        } catch (err) { alert('Import failed: ' + err.message); }
        finally { input.value = ''; }
    };
    reader.readAsText(file);
}
