let onFileAction = null;

export function setFileMenuHandler(handler) {
    onFileAction = handler;
}

export function initFileMenu() {
    const menu = document.getElementById('file-menu');
    const button = document.getElementById('file-menu-button');
    if (!menu || !button) return;

    button.addEventListener('click', event => {
        event.stopPropagation();
        menu.classList.toggle('hidden');
    });

    menu.addEventListener('click', event => {
        const item = event.target.closest('[data-file-action]');
        if (!item) return;
        if (onFileAction) onFileAction(item.dataset.fileAction);
        menu.classList.add('hidden');
    });

    document.addEventListener('click', event => {
        if (!menu.classList.contains('hidden') && !menu.contains(event.target) && !button.contains(event.target)) {
            menu.classList.add('hidden');
        }
    });
}
