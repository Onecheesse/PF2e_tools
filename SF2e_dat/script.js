// --- KONFIGURACE ---
// Definice sloupců pro tabulku pro každou kategorii
const tableColumns = {
    equipment: [
        { key: 'name', label: 'Name' },
        { key: 'level', label: 'Level' },
        { key: 'price', label: 'Price' },
        { key: 'category', label: 'Type' },
        { key: 'bulk', label: 'Bulk' }
    ],
    spells: [
        { key: 'name', label: 'Spell Name' },
        { key: 'level', label: 'Rank' }, // Ve spells je level ve skutečnosti Rank
        { key: 'traditions', label: 'Traditions' },
        { key: 'actions', label: 'Actions' }
    ],
    skills: [
        { key: 'name', label: 'Skill Name' },
        { key: 'keyAttribute', label: 'Key Attr' },
        { key: 'category', label: 'Category' }
    ]
};

// Mapování pro překlad dat
const categoryMap = { "armor": "equipment", "techGear": "equipment", "weapons": "equipment", "spells": "spells", "skills": "skills" };

// --- STAV APLIKACE ---
let allItems = [];
let activeTab = 'equipment'; // Výchozí tab (už ne 'all')
let currentSort = { key: 'name', direction: 'asc' }; // Stav řazení

// DOM Elementy
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const traitFilter = document.getElementById('traitFilter');
const searchBar = document.getElementById('searchBar');
const contentArea = document.getElementById('contentArea');

// --- INIT ---
async function init() {
    try {
        const manifest = await (await fetch('data/manifest.json')).json();
        for (const file of manifest) await loadFile(file);
        
        // Po načtení seřadíme a zobrazíme výchozí tab
        updateView();
        
        // Event Listenery pro tlačítka menu
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;
                
                // Reset filtrů a řazení při změně tabu
                currentSort = { key: 'name', direction: 'asc' };
                traitFilter.value = "";
                updateView();
            });
        });

        // Listenery pro filtry
        searchBar.addEventListener('input', renderTable);
        traitFilter.addEventListener('change', renderTable);
        document.getElementById('minLevel').addEventListener('input', renderTable);
        document.getElementById('maxLevel').addEventListener('input', renderTable);

    } catch (e) { console.error(e); }
}

async function loadFile(path) {
    try {
        const json = await (await fetch(path)).json();
        const rootKey = Object.keys(json)[0];
        const type = categoryMap[rootKey] || "other";
        
        // Rekurzivní extrakce
        extractItems(json, type);
    } catch (e) { console.error("Chyba souboru:", path); }
}

function extractItems(obj, mainType, catName = "") {
    for (const key in obj) {
        if (Array.isArray(obj[key])) {
            obj[key].forEach(item => {
                item.mainType = mainType;
                item.category = catName ? capitalize(catName) : capitalize(key);
                if (item.level === undefined) item.level = item.rank || 0;
                allItems.push(item);
            });
        } else if (typeof obj[key] === 'object') {
            extractItems(obj[key], mainType, key);
        }
    }
}

// --- HLAVNÍ LOGIKA ZOBRAZENÍ ---

function updateView() {
    // 1. Překreslit hlavičku tabulky podle aktivního tabu
    renderTableHeaders();
    
    // 2. Aktualizovat Traity v roletce (jen pro tuto kategorii)
    populateTraits();
    
    // 3. Vykreslit data
    renderTable();
}

function renderTableHeaders() {
    const columns = tableColumns[activeTab];
    tableHead.innerHTML = `<tr>
        ${columns.map(col => `<th onclick="sortTable('${col.key}')">${col.label} ${getSortIcon(col.key)}</th>`).join('')}
    </tr>`;
}

function renderTable() {
    const tbody = tableBody;
    tbody.innerHTML = '';

    // 1. Filtrace
    let filtered = allItems.filter(item => {
        if (item.mainType !== activeTab) return false;
        
        const term = searchBar.value.toLowerCase();
        const min = parseInt(document.getElementById('minLevel').value) || -1;
        const max = parseInt(document.getElementById('maxLevel').value) || 100;
        const trait = traitFilter.value;

        if (term && !item.name.toLowerCase().includes(term)) return false;
        if (trait && (!item.traits || !item.traits.includes(trait))) return false;
        if (item.mainType !== 'skills' && (item.level < min || item.level > max)) return false;

        return true;
    });

    // 2. Řazení
    filtered.sort((a, b) => {
        let valA = a[currentSort.key] || "";
        let valB = b[currentSort.key] || "";
        
        // Detekce čísel pro správné řazení
        if (!isNaN(parseFloat(valA)) && isFinite(valA)) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // 3. Vykreslení řádků
    const columns = tableColumns[activeTab];
    filtered.slice(0, 200).forEach(item => { // Limit 200 pro výkon
        const tr = document.createElement('tr');
        tr.onclick = () => showDetail(item);
        
        tr.innerHTML = columns.map(col => {
            let val = item[col.key];
            if (Array.isArray(val)) val = val.join(", "); // Pro tradice
            if (val === undefined || val === null) val = "-";
            return `<td>${val}</td>`;
        }).join('');
        
        tbody.appendChild(tr);
    });
}

// --- POMOCNÉ FUNKCE ---

function sortTable(key) {
    if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        currentSort.direction = 'asc';
    }
    updateView(); // Překreslit s novým řazením
}

function getSortIcon(key) {
    if (currentSort.key !== key) return '<span style="opacity:0.3">↕</span>';
    return currentSort.direction === 'asc' ? '▲' : '▼';
}

function populateTraits() {
    const currentItems = allItems.filter(i => i.mainType === activeTab);
    const traits = new Set();
    currentItems.forEach(i => i.traits?.forEach(t => traits.add(t)));
    
    traitFilter.innerHTML = '<option value="">All Traits</option>' + 
        Array.from(traits).sort().map(t => `<option value="${t}">${t}</option>`).join('');
}

function showDetail(item) {
    // Zvýraznění řádku (volitelné)
    // ... vykreslení detailu (stejné jako minule, jen CSS se postará o layout) ...
     const html = `
        <div class="detail-header">
            <h1>${item.name}</h1>
            <span class="level-badge">${activeTab === 'spells' ? 'Rank' : 'Lvl'} ${item.level}</span>
        </div>
        <div style="margin-bottom:15px">
            ${(item.traits || []).map(t => `<span class="trait ${t.toLowerCase()}">${t}</span>`).join('')}
        </div>
        <p><i>${item.description || "No description."}</i></p>
        <div class="stats-grid">
            ${Object.entries(item).map(([k,v]) => {
                if(['name','description','traits','mainType','source'].includes(k)) return '';
                if(typeof v === 'object') return '';
                return `<div class="stat-box"><span class="stat-label">${k}</span><span class="stat-value">${v}</span></div>`;
            }).join('')}
        </div>
    `;
    contentArea.innerHTML = html;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1).replace(/([A-Z])/g, ' $1').trim(); }

init();
