// --- KONFIGURACE ---

// Definice sloupců pro každou záložku
const tableColumns = {
    equipment: [
        { key: 'name', label: 'Name' },
        { key: 'level', label: 'Level' },
        { key: 'price', label: 'Price' },
        { key: 'category', label: 'Category' }, // Pod-typ (Armor, Weapon...)
        { key: 'bulk', label: 'Bulk' },
        { key: 'source', label: 'Source' }    // <--- PŘIDÁNO
    ],
    medical: [
        { key: 'name', label: 'Name' },
        { key: 'level', label: 'Level' },
        { key: 'price', label: 'Price' },
        { key: 'category', label: 'Type' },
        { key: 'hands', label: 'Hands' },
        { key: 'source', label: 'Source' }
    ],
    services: [
        { key: 'name', label: 'Service Name' },
        { key: 'price', label: 'Price' },
        { key: 'frequency', label: 'Frequency' }, // Specifické pro služby
        { key: 'source', label: 'Source' }
    ],
    spells: [
        { key: 'name', label: 'Spell Name' },
        { key: 'level', label: 'Rank' },       // Zobrazíme jako Rank
        { key: 'traditions', label: 'Traditions' },
        { key: 'actions', label: 'Actions' },
        { key: 'source', label: 'Source' }
    ],
    skills: [
        { key: 'name', label: 'Skill Name' },
        { key: 'keyAttribute', label: 'Key Attr' },
        { key: 'category', label: 'Category' },
        { key: 'source', label: 'Source' }
    ]
};

// Mapování hlavních klíčů JSONu na naše záložky
// Pokud se JSON klíč jmenuje "medicalItems", půjde do záložky "medical"
const specialCategoryMap = {
    "medicalItems": "medical",
    "services": "services",
    "spells": "spells",
    "skills": "skills",
    "armor": "equipment",
    "techGear": "equipment",
    "weapons": "equipment"
};

// --- STAV ---
let allItems = [];
let activeTab = 'equipment';
let currentSort = { key: 'level', direction: 'asc' }; // Výchozí řazení podle levelu

// DOM Elements
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const traitFilter = document.getElementById('traitFilter');
const searchBar = document.getElementById('searchBar');
const contentArea = document.getElementById('contentArea');

// --- INIT ---
async function init() {
    try {
        const manifest = await (await fetch('data/manifest.json')).json();
        for (const file of manifest) {
            await loadFile(file);
        }
        
        // Seřadit defaultně podle jména
        allItems.sort((a, b) => a.name.localeCompare(b.name));
        
        // Nastavení tlačítek
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;
                
                // Při změně tabu resetujeme filtry, ale ne řazení (nebo podle preference)
                traitFilter.value = "";
                searchBar.value = "";
                updateView();
            });
        });

        // Event Listenery
        searchBar.addEventListener('input', updateTableOnly); // Optimalizace: jen překreslit tabulku
        traitFilter.addEventListener('change', updateTableOnly);
        document.getElementById('minLevel').addEventListener('input', updateTableOnly);
        document.getElementById('maxLevel').addEventListener('input', updateTableOnly);

        updateView();

    } catch (e) {
        console.error("Critical Error:", e);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error loading data. Check console (F12).</td></tr>`;
    }
}

async function loadFile(path) {
    try {
        const json = await (await fetch(path)).json();
        // Rekurzivní extrakce bez předpokladu typu souboru
        extractItems(json); 
    } catch (e) { console.error("Error loading file:", path, e); }
}

// Chytrá extrakce: Určuje typ (Equipment/Medical/Spell) podle klíče v JSONu
function extractItems(obj, parentKey = "") {
    for (const key in obj) {
        // Pokud narazíme na pole, podíváme se, jak se jmenuje klíč (např. "medicalItems")
        if (Array.isArray(obj[key])) {
            
            // Určení typu podle klíče (nebo fallback na rodiče)
            let type = specialCategoryMap[key] || specialCategoryMap[parentKey] || "equipment";
            
            obj[key].forEach(item => {
                item.mainType = type; // Důležité pro filtrování záložek
                
                // Oprava kategorie pro zobrazení
                if (!item.category) item.category = capitalize(key);
                
                // Normalizace Levelu a Ranku
                if (item.level === undefined) {
                    // Kouzla mají "rank", převedeme na level pro řazení
                    if (item.rank !== undefined) item.level = item.rank;
                    else item.level = 0; // Default (např. services)
                }

                allItems.push(item);
            });
        } else if (typeof obj[key] === 'object') {
            extractItems(obj[key], key); // Jdeme hlouběji
        }
    }
}

// --- RENDEROVÁNÍ ---

function updateView() {
    renderTableHeaders();
    populateTraits();
    renderTable();
}

function updateTableOnly() {
    renderTable();
}

function renderTableHeaders() {
    const columns = tableColumns[activeTab] || tableColumns['equipment'];
    
    tableHead.innerHTML = `<tr>
        ${columns.map(col => `
            <th onclick="changeSort('${col.key}')">
                ${col.label} ${getSortIcon(col.key)}
            </th>
        `).join('')}
    </tr>`;
}

function renderTable() {
    const tbody = tableBody;
    tbody.innerHTML = '';

    // 1. FILTROVÁNÍ
    let filtered = allItems.filter(item => {
        if (item.mainType !== activeTab) return false;

        const term = searchBar.value.toLowerCase();
        const min = parseFloat(document.getElementById('minLevel').value);
        const max = parseFloat(document.getElementById('maxLevel').value);
        const trait = traitFilter.value;

        // Text search
        if (term && !item.name.toLowerCase().includes(term)) return false;
        
        // Trait filter
        if (trait && (!item.traits || !item.traits.includes(trait))) return false;
        
        // Level filter (ignorujeme pro služby a skilly, pokud nemají level)
        if (activeTab !== 'services' && activeTab !== 'skills') {
            if (!isNaN(min) && item.level < min) return false;
            if (!isNaN(max) && item.level > max) return false;
        }

        return true;
    });

    // 2. ŘAZENÍ (Opravené pro čísla)
    filtered.sort((a, b) => {
        let valA = a[currentSort.key];
        let valB = b[currentSort.key];

        // Ošetření prázdných hodnot
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";

        // Pokus o převod na číslo pro správné řazení (aby 2 < 10)
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);

        let comparison = 0;
        
        if (!isNaN(numA) && !isNaN(numB)) {
            // Oba jsou čísla
            comparison = numA - numB;
        } else {
            // Porovnání jako text
            comparison = valA.toString().localeCompare(valB.toString());
        }

        return currentSort.direction === 'asc' ? comparison : -comparison;
    });

    // 3. VYKRESLENÍ
    const columns = tableColumns[activeTab] || tableColumns['equipment'];
    
    // Limit 200 pro výkon
    filtered.slice(0, 200).forEach(item => {
        const tr = document.createElement('tr');
        tr.onclick = () => showDetail(item);
        
        tr.innerHTML = columns.map(col => {
            let val = item[col.key];
            
            // Speciální formátování
            if (Array.isArray(val)) val = val.join(", "); 
            if (val === undefined || val === null) val = "-";
            
            return `<td>${val}</td>`;
        }).join('');
        
        tbody.appendChild(tr);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">No results found.</td></tr>';
    }
}

// --- POMOCNÉ FUNKCE ---

function changeSort(key) {
    if (currentSort.key === key) {
        // Toggle direction
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New sort key
        currentSort.key = key;
        currentSort.direction = 'asc';
    }
    updateView(); // Překreslit
}

function getSortIcon(key) {
    if (currentSort.key !== key) return '<span style="opacity:0.2; font-size:0.8em">⇅</span>';
    return currentSort.direction === 'asc' ? '▲' : '▼';
}

function populateTraits() {
    // Získat traity pouze pro aktuální tab
    const currentItems = allItems.filter(i => i.mainType === activeTab);
    const traits = new Set();
    
    currentItems.forEach(i => {
        if (i.traits && Array.isArray(i.traits)) {
            i.traits.forEach(t => traits.add(t));
        }
    });
    
    // Zachovat vybraný trait, pokud existuje v nové sadě
    const currentVal = traitFilter.value;
    
    traitFilter.innerHTML = '<option value="">All Traits</option>' + 
        Array.from(traits).sort().map(t => `<option value="${t}">${t}</option>`).join('');
        
    if (traits.has(currentVal)) {
        traitFilter.value = currentVal;
    }
}

function showDetail(item) {
    // Badge text (Level nebo Rank)
    const levelLabel = activeTab === 'spells' ? 'Rank' : 'Lvl';
    
    // Traits HTML
    const traitsHtml = (item.traits || []).map(t => `<span class="trait ${t.toLowerCase()}">${t}</span>`).join('');
    
    // Dynamické statistiky (vše kromě popisu a názvu)
    const ignoredKeys = ['name', 'description', 'traits', 'mainType', 'category'];
    const statsHtml = Object.entries(item)
        .filter(([key, val]) => !ignoredKeys.includes(key) && typeof val !== 'object' && val !== "")
        .map(([key, val]) => `
            <div class="stat-box">
                <span class="stat-label">${camelCaseToTitle(key)}</span>
                <span class="stat-value">${val}</span>
            </div>
        `).join('');

    contentArea.innerHTML = `
        <div class="detail-header">
            <h1>${item.name}</h1>
            <span class="level-badge">${levelLabel} ${item.level}</span>
        </div>
        
        <div style="margin-bottom:15px; display:flex; gap:5px; flex-wrap:wrap;">
            ${traitsHtml}
        </div>
        
        <div class="stats-grid">
            ${statsHtml}
        </div>
        
        <hr style="border-color:#333; margin:20px 0;">
        
        <div class="description-block" style="line-height:1.6; color:#ddd;">
            <h3>Description</h3>
            ${item.description || "No description provided."}
        </div>
    `;
}

function capitalize(s) {
    if(!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/([A-Z])/g, ' $1').trim();
}

function camelCaseToTitle(text) {
    const result = text.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// Spustit
init();
