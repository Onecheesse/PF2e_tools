// --- CONFIGURATION ---
const fieldLabels = {
    "price": "Price",
    "level": "Level",
    "rank": "Rank", // Pro kouzla
    "bulk": "Bulk",
    "hands": "Hands",
    "acBonus": "AC Bonus",
    "dexCap": "Dex Cap",
    "checkPenalty": "Check Pen.",
    "speedPenalty": "Speed Pen.",
    "strength": "Str Req.",
    "upgrades": "Slots",
    "group": "Group",
    "category": "Category",
    "range": "Range",
    "area": "Area",
    "duration": "Duration",
    "defense": "Defense",
    "keyAttribute": "Key Attr." // Pro skilly
};

// Mapování JSON klíčů na naše Záložky (Tabs)
const categoryMap = {
    "armor": "equipment",
    "techGear": "equipment",
    "weapons": "equipment",
    "spells": "spells",
    "skills": "skills"
};

// --- STATE ---
let allItems = [];
let activeTab = 'all';

// --- DOM ---
const searchBar = document.getElementById('searchBar');
const minLevelInput = document.getElementById('minLevel');
const maxLevelInput = document.getElementById('maxLevel');
const traitFilter = document.getElementById('traitFilter');
const resultsList = document.getElementById('resultsList');
const contentArea = document.getElementById('contentArea');
const navButtons = document.querySelectorAll('.nav-btn');

// --- INIT ---
async function init() {
    try {
        const manifestResponse = await fetch('data/manifest.json');
        if (!manifestResponse.ok) throw new Error("Manifest not found");
        const fileList = await manifestResponse.json();

        for (const filePath of fileList) {
            await loadFile(filePath);
        }

        allItems.sort((a, b) => a.name.localeCompare(b.name));
        
        populateTraits(); // Naplnit roletku traitů
        renderList();     // Zobrazit vše

    } catch (error) {
        console.error("Error:", error);
        resultsList.innerHTML = `<li style="color:red; padding:10px;">Error loading data.<br>Check console.</li>`;
    }
}

async function loadFile(path) {
    try {
        const resp = await fetch(path);
        const json = await resp.json();
        // Zjistíme hlavní klíč (např. "spells") pro určení typu
        const rootKey = Object.keys(json)[0]; 
        const inferredType = categoryMap[rootKey] || "other";

        extractItemsRecursive(json, inferredType);
    } catch (e) { console.error(`Failed ${path}`, e); }
}

function extractItemsRecursive(obj, mainType, parentCategory = "") {
    for (const key in obj) {
        const value = obj[key];
        if (Array.isArray(value)) {
            value.forEach(item => {
                // Nastavíme interní typ pro filtrování
                if (!item.mainType) item.mainType = mainType;
                // Nastavíme kategorii pro zobrazení
                if (!item.category) item.category = camelCaseToTitle(parentCategory || key);
                
                // Sjednocení Levelu a Ranku (Spells mají rank, Items level)
                if (item.level === undefined && item.rank !== undefined) {
                    item.level = item.rank;
                }
                // Skills nemají level, dáme jim 0 pro řazení
                if (item.level === undefined) item.level = 0;

                allItems.push(item);
            });
        } else if (typeof value === 'object' && value !== null) {
            extractItemsRecursive(value, mainType, key);
        }
    }
}

// --- FILTROVÁNÍ & RENDER ---

function applyFilters() {
    const term = searchBar.value.toLowerCase();
    const minLvl = parseInt(minLevelInput.value) || -1; // -1 bere i level 0
    const maxLvl = parseInt(maxLevelInput.value) || 99;
    const selectedTrait = traitFilter.value;

    return allItems.filter(item => {
        // 1. Tab Filter
        if (activeTab !== 'all' && item.mainType !== activeTab) return false;

        // 2. Text Search
        const matchesText = item.name.toLowerCase().includes(term) || 
                          (item.category && item.category.toLowerCase().includes(term));
        if (!matchesText) return false;

        // 3. Level Filter (Skills ignored)
        if (item.mainType !== 'skills') {
            if (item.level < minLvl || item.level > maxLvl) return false;
        }

        // 4. Trait Filter
        if (selectedTrait) {
            if (!item.traits || !item.traits.includes(selectedTrait)) return false;
        }

        return true;
    });
}

function renderList() {
    const filtered = applyFilters();
    resultsList.innerHTML = '';
    
    // Limit pro rychlost, kdyby toho bylo moc
    const toRender = filtered.slice(0, 200); 

    toRender.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-item';
        
        let metaInfo = "";
        if (item.mainType === 'skills') {
            metaInfo = `${item.keyAttribute} | ${item.category}`;
        } else {
            // Pro spelly píšeme "Rank", pro itemy "Lvl"
            const lvlLabel = item.mainType === 'spells' ? 'Rank' : 'Lvl';
            metaInfo = `${lvlLabel} ${item.level} | ${item.category}`;
        }

        li.innerHTML = `
            <strong>${item.name}</strong>
            <small>${metaInfo}</small>
        `;
        li.addEventListener('click', () => renderDetail(item));
        resultsList.appendChild(li);
    });

    if (filtered.length === 0) {
        resultsList.innerHTML = '<li style="padding:15px; color:#666;">No results found.</li>';
    }
}

function populateTraits() {
    const traitSet = new Set();
    allItems.forEach(item => {
        if (item.traits && Array.isArray(item.traits)) {
            item.traits.forEach(t => traitSet.add(t));
        }
    });
    
    const sortedTraits = Array.from(traitSet).sort();
    sortedTraits.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t;
        traitFilter.appendChild(opt);
    });
}

// --- TAB SWITCHING ---
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update UI classes
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Set State & Render
        activeTab = btn.getAttribute('data-tab');
        renderList();
    });
});

// --- EVENT LISTENERS ---
searchBar.addEventListener('input', renderList);
minLevelInput.addEventListener('input', renderList);
maxLevelInput.addEventListener('input', renderList);
traitFilter.addEventListener('change', renderList);

// --- HELPER & DETAIL RENDER (Same as before) ---
function camelCaseToTitle(text) {
    const result = text.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function renderDetail(item) {
    // ... (Zde vlož svou původní funkci renderDetail z minula) ...
    // Jen malá změna: Pokud je to Skill, nezobrazuj Level Badge
    
    let traitsHtml = '';
    if (item.traits) {
        traitsHtml = item.traits.map(t => `<span class="trait">${t}</span>`).join('');
    }

    let statsHtml = '<div class="stats-grid">';
    for (const [key, label] of Object.entries(fieldLabels)) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
            statsHtml += `<div class="stat-box"><span class="stat-label">${label}</span><span class="stat-value">${item[key]}</span></div>`;
        }
    }
    statsHtml += '</div>';

    // Badge logic
    let badgeHtml = '';
    if (item.mainType === 'spells') badgeHtml = `<span class="level-badge">Rank ${item.level}</span>`;
    else if (item.mainType === 'equipment') badgeHtml = `<span class="level-badge">Level ${item.level}</span>`;

    contentArea.innerHTML = `
        <div class="detail-header">
            <h1>${item.name}</h1>
            ${badgeHtml}
        </div>
        <div class="traits-container">${traitsHtml}</div>
        ${statsHtml}
        <hr>
        <div class="description-block">
            <h3>Description</h3>
            <p>${item.description || ""}</p>
        </div>
    `;
}

init();
