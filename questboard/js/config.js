const CONFIG = {
    app: {
        title: "The Quest Board",
        subtitle: "Assemble your party's hand for the upcoming sprint.<br>Select a quest to begin.",
        fontHeader: "'Cinzel', serif",
        fontBody: "'Inter', sans-serif"
    },
    sprint: {
        storageKey: "rpg-sprint-planner-v2",
        hoursPerWeek: 40,
        defaultWeeks: 2,
        maxWeeks: 4
    },
    theme: {
        bgColor: "#f3f4f6",
        cardBg: "#ffffff",
        textPrimary: "#27272a",
        textSecondary: "#52525b",
        hudBg: "#18181b",
        hudText: "#ffffff",
        hudBorder: "#3f3f46"
    },
    // Card Definitions
    cards: [
        {
            points: 1,
            hours: 2,
            title: "Camp Chores",
            role: "Errand",
            desc: "Gathering wood or sharpening blades. Essential, low-risk work that keeps us moving.",
            quote: "Done before the fire dies out.",
            icon: "ph-campfire",
            color: "#3b82f6", // Blue
            bgColor: "#eff6ff",
            textColor: "#1d4ed8",
            disabled: false,
            onAddMessages: [
                "Even heroes need to gather firewood.",
                "Sharpening blades is a noble task.",
                "This chore keeps the camp running smoothly.",
                "A small task, but it must be done.",
                "The unsung hero of every quest."
            ],
            onRemoveMessages: [
                "The camp chores are already underway, no turning back.",
                "You can't back out of a chore once it's started.",
                "The camp needs these chores to keep going!",
                "Don't give up on this essential task!",
                "The world needs heroes to see these chores through!"
            ],
            disabledMessages: []
        },
        {
            points: 2,
            hours: 4,
            title: "Local Delivery",
            role: "Side Quest",
            desc: "A clear path with a known destination. Minimal encounters expected on the road.",
            quote: "There and back again by sundown.",
            icon: "ph-scroll",
            color: "#22c55e", // Green
            bgColor: "#f0fdf4",
            textColor: "#15803d",
            disabled: false,
            onAddMessages: [
                "A simple delivery quest.",
                "Just a quick trip to the next town.",
                "No monsters, just a bit of travel.",
                "A nice break from dungeon crawling.",
                "Don't forget to tip the courier!"
            ],
            onRemoveMessages: [
                "The delivery is already on its way, no turning back.",
                "You can't back out of a delivery once it's accepted.",
                "The destination is already in sight, keep going!",
                "Don't give up on this side quest!",
                "The world needs heroes to complete this delivery!"
            ],
            disabledMessages: []
        },
        {
            points: 3,
            hours: 8, // 1 Day
            title: "Dungeon Delve",
            role: "Adventure",
            desc: "The standard gig. Clear a room, disarm a trap, solve a puzzle. Requires a full kit.",
            quote: "Check for traps, then proceed.",
            icon: "ph-skull",
            color: "#eab308", // Yellow/Bronze
            bgColor: "#fefce8",
            textColor: "#854d0e",
            disabled: false,
            onAddMessages: [
                "A classic dungeon crawl.",
                "Monsters, traps, and treasure await!",
                "Make sure to bring your potions.",
                "Don't forget to check for secret doors.",
            ],
            onRemoveMessages: [
                "The dungeon is already in sight, keep going!",
                "Don't give up on this adventure!",
                "The world needs heroes to see this quest through!"
            ],
            disabledMessages: []
        },
        {
            points: 5,
            hours: 16, // 2 Days
            title: "The Heist",
            role: "Complex Mission",
            desc: "Infiltrating a secure location. Many moving parts and high complexity. Needs a plan.",
            quote: "Timing is everything.",
            icon: "ph-key",
            color: "#f97316", // Orange
            bgColor: "#fff7ed",
            textColor: "#c2410c",
            disabled: false,
            onAddMessages: [
                "A daring heist!",
                "You'll need a solid plan for this one.",
                "Stealth and precision are key.",
                "This mission has many moving parts.",
                "Make sure to have an escape route!"
            ],
            onRemoveMessages: [
                "The heist is already in motion, no turning back.",
                "You can't back out of a plan once it's set.",
                "The target is already in sight, keep going!",
                "Don't give up on this complex mission!",
                "The world needs heroes to see this heist through!"
            ],
            disabledMessages: []
        },
        {
            points: 8,
            hours: 40, // 1 Week
            title: "War Campaign",
            role: "Epic Saga",
            desc: "A long-term strategic effort involving multiple battles. Drains resources heavily.",
            quote: "We march at dawn.",
            icon: "ph-flag-banner",
            color: "#ef4444", // Red
            bgColor: "#fef2f2",
            textColor: "#b91c1c",
            disabled: false,
            onAddMessages: [
                "An all-out war campaign!",
                "This will require careful resource management.",
                "Multiple battles and strategic decisions ahead.",
                "Make sure to rally your allies for this one.",
                "The fate of the realm may depend on this campaign!"
            ],
            onRemoveMessages: [
                "The war campaign is too critical to abandon now.",
                "You can't retreat from a battle once it's underway.",
                "The campaign is already in motion, no turning back.",
                "Don't give up on this epic saga!",
                "The world needs heroes to see this campaign through!"
            ],
            disabledMessages: []
        },
        {
            points: 13,
            hours: 80, // 2 Weeks
            title: "The Odyssey",
            role: "Legendary Voyage",
            desc: "Crossing the great ocean. Unpredictable weather and massive scale. High risk of failure.",
            quote: "Here be dragons.",
            icon: "ph-boat",
            color: "#a855f7", // Purple
            bgColor: "#faf5ff",
            textColor: "#7e22ce",
            disabled: false,
            isImpossible: false,
            onAddMessages: [
                "A legendary voyage across the ocean!",
                "Unpredictable weather and massive scale ahead.",
                "This is a true test of endurance and skill.",
                "Make sure to stock up on supplies for this one.",
                "The tales of this odyssey will be told for generations!"
            ],
            onRemoveMessages: [
                "The odyssey is too daunting to abandon now.",
                "You can't turn back from such a legendary quest.",
                "The journey is just as important as the destination.",
                "Don't give up on this epic adventure!",
                "The world needs heroes to complete this odyssey!"
            ],
            disabledMessages: []
        },
        {
            points: 21,
            hours: 999, // Impossible
            title: "Divine Will",
            role: "Impossible",
            desc: "Mortals cannot enact the will of gods directly. We must build temples (sub-tasks) first.",
            quote: "Beyond our current understanding.",
            icon: "ph-sparkle",
            color: "#f4f4f5", // Grey/Dark
            bgColor: "#18181b",
            textColor: "#e4e4e7",
            isImpossible: true, // Special flag for handling logic
            onAddMessages: [
                "Are you mad? That's a Tarrasque!",
                "You need a Raid Party for this.",
                "Roll for sanity check... You failed.",
                "Break it down into smaller quests first!",
                "The gods ignore your request.",
                "Scope creep detected!",
                "This card is purely decorative (and terrifying)."
            ],
            onRemoveMessages: [],
            disabledMessages: []
        }
    ]
};
