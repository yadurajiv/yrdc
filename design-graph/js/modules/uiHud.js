import { NODE_DEFS } from '../config.js?v=1.4.9';

export function renderHudTemplates() {
    const select = document.getElementById('hud-template-select');
    if (!select) return;
    select.innerHTML = '<option value="">Add template...</option>';
    NODE_DEFS.forEach(def => {
        const opt = document.createElement('option');
        opt.value = def.id;
        opt.textContent = def.title;
        select.appendChild(opt);
    });
}
