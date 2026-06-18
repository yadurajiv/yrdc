import { setHelpSeen } from './store.js?v=1.4.9';

export function showHelp() {
    document.getElementById('help-modal')?.classList.remove('hidden');
}

export function hideHelp() {
    document.getElementById('help-modal')?.classList.add('hidden');
    setHelpSeen();
}
