// ==========================================
//  STATE MANAGEMENT
// ==========================================
let SPRINT_WEEKS = CONFIG.sprint.defaultWeeks;
let MAX_CAPACITY = SPRINT_WEEKS * CONFIG.sprint.hoursPerWeek;
let currentUsed = 0;
let cardCounts = {};

function saveState() {
    const state = {
        weeks: SPRINT_WEEKS,
        counts: cardCounts
    };
    localStorage.setItem(CONFIG.sprint.storageKey, JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem(CONFIG.sprint.storageKey);
    if (!saved) return;

    try {
        const state = JSON.parse(saved);
        if (state.weeks) {
            SPRINT_WEEKS = state.weeks;
            MAX_CAPACITY = state.weeks * CONFIG.sprint.hoursPerWeek;
            renderHud(); // Re-render HUD to update active tabs
        }
        if (state.counts) {
            cardCounts = state.counts;
            recalculateUsage();
        }
    } catch (e) {
        console.error("Failed to load state", e);
    }
}

function recalculateUsage() {
    currentUsed = 0;
    CONFIG.cards.forEach(card => {
        const count = cardCounts[card.points] || 0;
        // Only count cards that aren't impossible
        if (!card.isImpossible) {
            currentUsed += (card.hours * count);
        }
        updateCardVisuals(card.points);
    });
    updateHudStats();
    checkAvailability();
}

// ==========================================
//  DOM GENERATION & RENDERING
// ==========================================

function initApp() {
    // Apply Theme
    const root = document.documentElement;
    root.style.setProperty('--bg-color', CONFIG.theme.bgColor);
    root.style.setProperty('--card-bg', CONFIG.theme.cardBg);
    root.style.setProperty('--text-primary', CONFIG.theme.textPrimary);
    root.style.setProperty('--text-secondary', CONFIG.theme.textSecondary);
    root.style.setProperty('--hud-bg', CONFIG.theme.hudBg);
    root.style.setProperty('--hud-text', CONFIG.theme.hudText);
    root.style.setProperty('--hud-border', CONFIG.theme.hudBorder);

    renderHeader();
    renderCards();
    renderHud();
    loadState(); // Restore state after rendering
}

function renderHeader() {
    const header = document.getElementById('app-header');
    header.innerHTML = `
        <h1>${CONFIG.app.title}</h1>
        <p class="subtitle">${CONFIG.app.subtitle}</p>
    `;
}

function renderCards() {
    const container = document.getElementById('card-grid');
    container.innerHTML = '';

    CONFIG.cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.setAttribute('data-points', card.points);

        // Specific styling for dark cards (Impossible) vs standard
        if (card.isImpossible) {
            cardEl.style.backgroundColor = card.bgColor;
            cardEl.style.borderTopColor = "#71717a";
        } else {
            cardEl.style.borderTopColor = card.iconColor || card.color;
        }

        // Internal HTML
        // Badge color logic
        const badgeStyle = card.isImpossible 
            ? `background: #27272a; color: white; border-color: #52525b;`
            : `color: ${card.textColor}; border-color: ${card.bgColor}; background: ${card.bgColor};`;

        const iconStyle = card.isImpossible
            ? `color: #f4f4f5;`
            : `color: ${card.color};`;

        const durationBg = card.isImpossible ? '#27272a' : '#f4f4f5';
        const durationText = card.isImpossible ? 'white' : 'var(--text-secondary)';

        let durationLabel = "";
        if (card.hours === 999) durationLabel = "Too Big";
        else if (card.hours >= 40) durationLabel = (card.hours / 40) + " Week" + (card.hours > 40 ? "s" : "");
        else if (card.hours >= 8) durationLabel = (card.hours / 8) + " Day" + (card.hours > 8 ? "s" : "");
        else durationLabel = card.hours + " Hours";

        if (card.disabled) {
            cardEl.classList.add('disabled');
        }

        // Click Handler
        if (card.disabled) {
            cardEl.onclick = () => showCardMessage(card, 'disabled', true);
        } else if (card.isImpossible) {
            cardEl.onclick = () => toggleImpossible(card.points);
        } else {
            cardEl.onclick = () => addCard(card.points);
        }

        cardEl.innerHTML = `
            <div class="card-controls">
                <div class="card-remove" onclick="removeCard(event, ${card.points})">
                    <i class="ph-bold ph-minus"></i>
                </div>
                <div class="card-badge">0</div>
            </div>
            <div class="card-header">
                <div class="points-badge" style="${badgeStyle}">${card.points === 21 ? '∞' : card.points}</div>
                <div class="duration-tag" style="background: ${durationBg}; color: ${durationText}">${durationLabel}</div>
            </div>
            <div class="emblem-container">
                <i class="ph-duotone ${card.icon} emblem-icon" style="${iconStyle}"></i>
            </div>
            <div class="card-content">
                <h2 class="quest-name" style="color: ${card.isImpossible ? 'white' : 'inherit'}">${card.title}</h2>
                <span class="role-name" style="color: ${card.isImpossible ? '#a1a1aa' : 'inherit'}">${card.role}</span>
                <p class="description" style="color: ${card.isImpossible ? '#d4d4d8' : 'inherit'}">${card.desc}</p>
                <div class="divider" style="background: ${card.isImpossible ? 'rgba(255,255,255,0.1)' : ''}"></div>
                <div class="quote" style="color: ${card.isImpossible ? '#a1a1aa' : 'inherit'}">"${card.quote}"</div>
            </div>
        `;

        container.appendChild(cardEl);
    });
}

function renderHud() {
    const container = document.getElementById('hud-container');

    // Generate Buttons HTML
    let buttonsHtml = '';
    for (let i = 1; i <= CONFIG.sprint.maxWeeks; i++) {
        buttonsHtml += `<button class="dur-btn ${i === SPRINT_WEEKS ? 'active' : ''}" onclick="setSprintLength(${i}, this)">${i}W</button>`;
    }

    container.innerHTML = `
        <div class="hud-header">
            <div class="duration-toggles">${buttonsHtml}</div>
            <div class="hud-stats-container">
                <span class="hud-stats">
                    <span id="hud-used">${currentUsed}</span>/<span id="hud-max">${MAX_CAPACITY}</span>h
                </span>
                <span class="hud-stats-label">Used</span>
            </div>
            <button class="reset-btn" onclick="resetSprint()" title="Reset Hand">
                <i class="ph-bold ph-arrow-counter-clockwise"></i>
            </button>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar" id="hud-bar"></div>
        </div>
        <div class="hud-legend" id="hud-legend">
            <span style="color: #52525b; font-size: 0.8rem;">Select quests to build your backlog...</span>
        </div>
    `;
    // Initialize Bar and Legend
    updateHudStats();
}

// ==========================================
//  LOGIC & INTERACTION
// ==========================================

function setSprintLength(weeks, tabElement) {
    let newCapacity = weeks * CONFIG.sprint.hoursPerWeek;

    if (currentUsed > newCapacity) {
        shakeHud();
        showToast(`Cannot switch to ${weeks}W. Current load (${currentUsed}h) exceeds capacity (${newCapacity}h)!`, true);
        return;
    }

    SPRINT_WEEKS = weeks;
    MAX_CAPACITY = newCapacity;

    // Update UI manually to avoid full re-render
    document.querySelectorAll('.dur-btn').forEach(t => t.classList.remove('active'));
    tabElement.classList.add('active');
    document.getElementById('hud-max').innerText = MAX_CAPACITY;

    updateHudStats();
    checkAvailability();
    showToast(`Sprint updated: ${weeks} Week${weeks > 1 ? 's' : ''} (${MAX_CAPACITY} Hours)`, false);
    saveState();
}

function addCard(points) {
    const cardData = CONFIG.cards.find(c => c.points === points);
    if (!cardData) return;
    if (cardData.disabled) {
        showCardMessage(cardData, 'disabled', true);
        return;
    }

    // Check Availability logic (re-implemented here)
    const remaining = MAX_CAPACITY - currentUsed;
    if (cardData.hours > remaining) {
        showToast("Quest too large for remaining capacity!", true);
        return;
    }

    if (!cardCounts[points]) cardCounts[points] = 0;
    cardCounts[points]++;
    currentUsed += cardData.hours;

    updateCardVisuals(points);
    updateHudStats();
    checkAvailability();
    saveState();
    showCardMessage(cardData, 'add', false);
}

function removeCard(event, points) {
    event.stopPropagation();
    const cardData = CONFIG.cards.find(c => c.points === points);
    if (!cardData) return;

    if (cardCounts[points] && cardCounts[points] > 0) {
        cardCounts[points]--;
        currentUsed -= cardData.hours;

        updateCardVisuals(points);
        updateHudStats();
        checkAvailability();
        saveState();
        showCardMessage(cardData, 'remove', false);
    }
}

function updateCardVisuals(points) {
    const count = cardCounts[points] || 0;
    const cardElement = document.querySelector(`.card[data-points="${points}"]`);
    if (!cardElement) return;

    const badge = cardElement.querySelector('.card-badge');
    cardElement.setAttribute('data-print-count', count);

    if (count > 0) {
        cardElement.classList.add('active');
        if (badge) badge.innerText = count;
    } else {
        cardElement.classList.remove('active');
    }
}

function toggleImpossible(points) {
    const cardData = CONFIG.cards.find(c => c.points === points);
    if (!cardData) return;
    showCardMessage(cardData, 'add', true);
}

function updateHudStats() {
    // Update Text
    const usedSpan = document.getElementById('hud-used');
    if (usedSpan) usedSpan.innerText = currentUsed;

    // Update Bar
    const bar = document.getElementById('hud-bar');
    if (bar) {
        let percentage = (currentUsed / MAX_CAPACITY) * 100;
        if (percentage > 100) percentage = 100;
        bar.style.width = percentage + '%';

        if (currentUsed > MAX_CAPACITY) {
            bar.style.background = '#ef4444';
        } else if (currentUsed === MAX_CAPACITY) {
            bar.style.background = '#22c55e';
        } else {
            bar.style.background = 'linear-gradient(90deg, #3b82f6, #a855f7)';
        }
    }

    // Update Legend
    const legend = document.getElementById('hud-legend');
    if (legend) {
        legend.innerHTML = '';
        let hasItems = false;

        CONFIG.cards.forEach(card => {
            const count = cardCounts[card.points];
            if (count > 0) {
                hasItems = true;
                const item = document.createElement('div');
                item.className = 'legend-item';
                item.style.borderColor = card.color;
                item.innerHTML = `
                    <i class="ph-duotone ${card.icon}" style="color: ${card.color}"></i>
                    <span style="color: #fff">${card.title}</span>
                    <span class="legend-count">x${count}</span>
                `;
                legend.appendChild(item);
            }
        });

        if (!hasItems) {
            legend.innerHTML = '<span style="color: #52525b; font-size: 0.8rem;">Select quests to build your backlog...</span>';
        }
    }
}

function checkAvailability() {
    const remaining = MAX_CAPACITY - currentUsed;
    const cards = document.querySelectorAll('.card');

    cards.forEach(cardEl => {
        const points = parseInt(cardEl.getAttribute('data-points'));
        const cardData = CONFIG.cards.find(c => c.points === points);

        if (cardData.disabled) {
            cardEl.classList.add('disabled');
            return;
        }
        if (cardData.isImpossible) return;

        if (cardData.hours > remaining) {
            cardEl.classList.add('disabled');
        } else {
            cardEl.classList.remove('disabled');
        }
    });
}

function resetSprint() {
    currentUsed = 0;
    cardCounts = {};
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.classList.remove('active');
        card.classList.remove('disabled');
        const badge = card.querySelector('.card-badge');
        if (badge) badge.innerText = '0';
    });
    updateHudStats();
    checkAvailability();
    saveState();
}

function shakeHud() {
    const hud = document.querySelector('.sprint-hud');
    hud.classList.remove('shake');
    void hud.offsetWidth;
    hud.classList.add('shake');
}

function showToast(message, isWarning = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = isWarning ? 'toast warning' : 'toast';
    const icon = isWarning ? 'ph-warning-circle' : 'ph-info';

    toast.innerHTML = `<i class="ph-bold ${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}

function showCardMessage(cardData, trigger, isWarning) {
    let messages = [];
    if (trigger === 'remove') {
        messages = cardData.onRemoveMessages || [];
    } else if (trigger === 'disabled') {
        messages = cardData.disabledMessages || [];
    } else {
        messages = cardData.onAddMessages || [];
    }
    if (!messages.length) return;
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    showToast(randomMsg, isWarning);
}

// --- Init ---
window.addEventListener('DOMContentLoaded', initApp);
