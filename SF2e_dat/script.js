// --- KONFIGURACE DAT ---

// 1. Definice struktury (Které klíče z JSONu patří kam)
// Key = název klíče v JSONu (např. "simpleMelee")
// Value = { main: HlavníTab, sub: PodTab }
const categoryMapping = {
    // --- EQUIPMENT ---
    "weapons": { main: "equipment", sub: "Weapons" }, // Fallback pro root
    "unarmedAttacks": { main: "equipment", sub: "Weapons" },
    "simpleMelee": { main: "equipment", sub: "Weapons" },
    "martialMelee": { main: "equipment", sub: "Weapons" },
    "advancedMelee": { main: "equipment", sub: "Weapons" },
    "simpleRanged": { main: "equipment", sub: "Weapons" },
    "martialRanged": { main: "equipment", sub: "Weapons" },
    "advancedRanged": { main: "equipment", sub: "Weapons" },
    "ammunition": { main: "equipment", sub: "Ammunition" },
    
    "armor": { main: "equipment", sub: "Armor" },
    "lightArmor": { main: "equipment", sub: "Armor" },
    "mediumArmor": { main: "equipment", sub: "Armor" },
    "heavyArmor": { main: "equipment", sub: "Armor" },
    
    "shields": { main: "equipment", sub: "Shields" },
    
    "techGear": { main: "equipment", sub: "Tech Gear" },
    "adventuringGear": { main: "equipment", sub: "Tech Gear" },
    
    "medicalItems": { main: "equipment", sub: "Medical" },
    "services": { main: "equipment", sub: "Services" },

    // --- SPELLS ---
    "spells": { main: "spells", sub: "Spells" },
    "focusSpells": { main: "spells", sub: "Focus Spells" },
    "rituals": { main: "spells", sub: "Rituals" },

    // --- SKILLS ---
    "skills": { main: "skills", sub: "Skills" }
};

// 2. Definice sloupců pro tabulku
const tableColumns = {
    equipment: [
        { key: 'name', label: 'Name' },
        { key: 'level', label: 'Level' },
        { key: 'price', label: 'Price' },
        { key: 'category', label: 'Category' }, // např. "Simple Melee"
        { key: 'bulk', label: 'Bulk' },
        { key: 'source', label: 'Source' }
    ],
    spells: [
        { key: 'name', label: 'Name' },
        { key: 'level', label: 'Rank' },
        { key: 'traditions', label: 'Traditions' },
        { key: 'actions', label: 'Act' },
        { key: 'source', label: 'Source' }
    ],
    skills: [
        { key: 'name', label: 'Name' },
        { key: 'keyAttribute', label: 'Key Attr' },
        { key: 'source', label: 'Source' }
    ]
};

// --- STAV ---
let allItems = [];
let activeMainTab = 'equipment';
let activeSubTab = 'All'; // 'All' zobrazí vše v daném hlavním tabu
let currentSort = { key: 'level', direction: 'asc' };

// --- INIT ---
async function init() {
    try {
        const manifest = await (await fetch('data/manifest.json')).json();
        for (const file of manifest) await loadFile(file);
        
        allItems.sort((a, b) => a.name.localeCompare(b.name));
        
        setupNavigation();
        updateView();

    } catch (e) {
        console.error("Critical Error:", e);
        document.getElementById('tableBody').innerHTML = `<tr><td colspan="6" style="color:red;text-align:center">Error loading data. Check console.</td></tr>`;
    }
}

async function loadFile(path) {
    try {
        const json = await (await fetch(path)).json();
        extractItems(json);
    } catch (e) { console.error("Failed to load:", path, e); }
}

// Rekurzivní parser, který přiřazuje MainType a SubType
function extractItems(obj, inheritedContext = null) {
    for (const key in obj) {
        // Zkusíme najít kontext pro tento klíč v naší mapě
        let currentContext = categoryMapping[key] || inheritedContext;

        if (Array.isArray(obj[key])) {
            // Jsme u pole položek (listí stromu)
            if (!currentContext) {
                console.warn(`Neznámá kategorie pro klíč: "${key}". Položky budou ignorovány.`);
                continue;
            }

            obj[key].forEach(item => {
                item.mainType = currentContext.main;
                item.subType = currentContext.sub;
                
                // Hezký název kategorie (pokud chybí)
                if (!item.category) item.category = camelCaseToTitle(key);
                
                // Normalizace Levelu (Kouzla mají Rank)
                if (item.level === undefined) {
                    item.level = item.rank !== undefined ? item.rank : 0;
                }
                // Source fix (pokud chybí)
                if(!item.source) item.source = "Unknown";

                allItems.push(item);
            });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            // Zanoření (např. weapons -> simpleMelee)
            extractItems(obj[key], currentContext);
        }
    }
}

// --- UI LOGIKA ---

function setupNavigation() {
    // Hlavní taby
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeMainTab = btn.dataset.tab;
            activeSubTab = 'All'; // Reset podkategorie
            
            updateSubNavigation(); // Vygenerovat nová tlačítka
            updateView();
        });
    });

    // Filtry
    document.getElementById('searchBar').addEventListener('input', renderTable);
    document.getElementById('traitFilter').addEventListener('change', renderTable);
    document.getElementById('minLevel').addEventListener('input', renderTable);
    document.getElementById('maxLevel').addEventListener('input', renderTable);
    
    // Inicializace pod-menu
    updateSubNavigation();
}

function updateSubNavigation() {
    const subNavContainer = document.getElementById('subNav');
    subNavContainer.innerHTML = ''; // Vyčistit

    // 1. Zjistit jaké SubTypes existují pro aktuální MainType
    const relevantItems = allItems.filter(i => i.mainType === activeMainTab);
    const subTypes = new Set(['All']);
    relevantItems.forEach(i => subTypes.add(i.subType));

    // 2. Vytvořit tlačítka (seřadit abecedně, ale All první)
    const sortedSubs = Array.from(subTypes).sort((a,b) => a === 'All' ? -1 : a.localeCompare(b));

    sortedSubs.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = `sub-btn ${activeSubTab === sub ? 'active' : ''}`;
        btn.innerText = sub;
        btn.onclick = () => {
            activeSubTab = sub;
            updateSubNavigation(); // Překreslit active class
            updateView();
        };
        subNavContainer.appendChild(btn);
    });
}

function updateView() {
    renderTableHeaders();
    populateTraits(); // Traity jen pro aktuální výběr
    renderTable();
}

function renderTableHeaders() {
    const cols = tableColumns[activeMainTab] || tableColumns.equipment;
    const thead = document.getElementById('tableHead');
    thead.innerHTML = `<tr>${cols.map(c => 
        `<th onclick="setSort('${c.key}')">${c.label} ${getSortIcon(c.key)}</th>`
    ).join('')}</tr>`;
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const term = document.getElementById('searchBar').value.toLowerCase();
    const min = parseFloat(document.getElementById('minLevel').value);
    const max = parseFloat(document.getElementById('maxLevel').value);
    const trait = document.getElementById('traitFilter').value;

    // FILTROVÁNÍ
    let filtered = allItems.filter(item => {
        if (item.mainType !== activeMainTab) return false;
        if (activeSubTab !== 'All' && item.subType !== activeSubTab) return false;

        if (term && !item.name.toLowerCase().includes(term)) return false;
        if (trait && (!item.traits || !item.traits.includes(trait))) return false;
        
        // Level check (ignorujeme u Skills)
        if (activeMainTab !== 'skills') {
            if (!isNaN(min) && item.level < min) return false;
            if (!isNaN(max) && item.level > max) return false;
        }
        return true;
    });

    // ŘAZENÍ
    filtered.sort((a, b) => {
        let valA = a[currentSort.key] || "";
        let valB = b[currentSort.key] || "";
        
        // Číselné řazení
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if(!isNaN(numA) && !isNaN(numB)) {
            return currentSort.direction === 'asc' ? numA - numB : numB - numA;
        }
        return currentSort.direction === 'asc' 
            ? valA.toString().localeCompare(valB) 
            : valB.toString().localeCompare(valA);
    });

    // VYKRESLENÍ
    const cols = tableColumns[activeMainTab] || tableColumns.equipment;
    
    filtered.slice(0, 200).forEach(item => {
        const tr = document.createElement('tr');
        tr.onclick = () => showDetail(item);
        tr.innerHTML = cols.map(col => {
            let val = item[col.key];
            if(Array.isArray(val)) val = val.join(", ");
            if(val === undefined || val === null) val = "-";
            return `<td>${val}</td>`;
        }).join('');
        tbody.appendChild(tr);
    });
}

// --- POMOCNÉ FUNKCE ---
function setSort(key) {
    if (currentSort.key === key) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    else { currentSort.key = key; currentSort.direction = 'asc'; }
    updateView();
}

function getSortIcon(key) {
    if (currentSort.key !== key) return '<span style="opacity:0.2">↕</span>';
    return currentSort.direction === 'asc' ? '▲' : '▼';
}

function populateTraits() {
    const relevant = allItems.filter(i => i.mainType === activeMainTab);
    const traits = new Set();
    relevant.forEach(i => i.traits?.forEach(t => traits.add(t)));
    
    const select = document.getElementById('traitFilter');
    const current = select.value;
    select.innerHTML = '<option value="">All Traits</option>' + 
        Array.from(traits).sort().map(t => `<option value="${t}">${t}</option>`).join('');
    select.value = current;
}

function camelCaseToTitle(text) {
    return text.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
}

function showDetail(item) {
    const levelLabel = activeMainTab === 'spells' ? 'Rank' : 'Lvl';
    const content = document.getElementById('contentArea');
    
    // Ignorované klíče v tabulce statistik
    const ignored = ['name', 'description', 'traits', 'mainType', 'subType', 'category', 'heightened'];
    
    let statsHtml = Object.entries(item)
        .filter(([k, v]) => !ignored.includes(k) && typeof v !== 'object' && v !== "")
        .map(([k, v]) => `<div class="stat-box"><span class="stat-label">${camelCaseToTitle(k)}</span><span class="stat-value">${v}</span></div>`)
        .join('');

    // Heightened (pro kouzla)
    let heightenedHtml = "";
    if (item.heightened) {
        heightenedHtml = `<h4>Heightened</h4><ul>` + 
        item.heightened.map(h => `<li><strong>${h.level}:</strong> ${h.effect}</li>`).join('') + 
        `</ul>`;
    }

    content.innerHTML = `
        <div class="detail-header">
            <h1>${item.name}</h1>
            <span class="level-badge">${levelLabel} ${item.level}</span>
        </div>
        <div style="margin-bottom:15px; display:flex; flex-wrap:wrap; gap:5px">
            ${(item.traits||[]).map(t => `<span class="trait ${t.toLowerCase()}">${t}</span>`).join('')}
        </div>
        <div class="stats-grid">${statsHtml}</div>
        <hr style="border-color:#333; margin:20px 0">
        <div class="description-block" style="color:#ddd; line-height:1.6">
            ${item.description || "No description."}
            ${heightenedHtml}
        </div>
    `;
}

init();
