// If a key is missing in this list, it won't be displayed in the stat grid.
const fieldLabels = {
    "price": "Price",
    "level": "Level",
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
    "source": "Source"
};

// --- STATE ---
let allItems = []; // Stores all loaded items

// --- DOM ELEMENTS ---
const searchBar = document.getElementById('searchBar');
const resultsList = document.getElementById('resultsList');
const contentArea = document.getElementById('contentArea');

// --- INITIALIZATION ---
async function init() {
    try {
        // 1. Fetch the manifest (list of files)
        const manifestResponse = await fetch('data/manifest.json');
        if (!manifestResponse.ok) throw new Error("Could not load manifest.json");
        
        const fileList = await manifestResponse.json();

        // 2. Load every file in the manifest
        for (const filePath of fileList) {
            await loadFile(filePath);
        }

        // 3. Sort items alphabetically
        allItems.sort((a, b) => a.name.localeCompare(b.name));

        console.log(`Database loaded: ${allItems.length} items found.`);
        renderList(allItems);

    } catch (error) {
        console.error("Critical Error:", error);
        resultsList.innerHTML = `<li style="color:red; padding:1rem;">Error loading data.<br>Make sure you are running a Local Server (CORS).</li>`;
    }
}

// Fetch a single JSON file and extract items from it
async function loadFile(path) {
    try {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`Failed to load ${path}`);
        
        const json = await resp.json();
        
        // Flatten the structure (find items deep inside categories)
        extractItemsRecursive(json);
        
    } catch (err) {
        console.error(err);
    }
}

// Recursive function to dig through nested categories
function extractItemsRecursive(obj, parentCategory = "General") {
    for (const key in obj) {
        const value = obj[key];

        if (Array.isArray(value)) {
            // We found an Array! Assuming this contains our items.
            value.forEach(item => {
                // Ensure every item has a category (inherit from parent key if missing)
                if (!item.category) item.category = camelCaseToTitle(parentCategory || key);
                allItems.push(item);
            });
        } else if (typeof value === 'object' && value !== null) {
            // It's another folder/object, dig deeper
            extractItemsRecursive(value, key);
        }
    }
}

// --- RENDERING UI ---

function renderList(items) {
    resultsList.innerHTML = '';
    
    // Performance optimization: Only render first 100 if list is huge (optional)
    const displayItems = items; 

    displayItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <strong>${item.name}</strong>
            <small>Lvl ${item.level} • ${item.category}</small>
        `;
        li.addEventListener('click', () => renderDetail(item));
        resultsList.appendChild(li);
    });
}

function renderDetail(item) {
    // 1. Format Traits
    let traitsHtml = '';
    if (item.traits && item.traits.length > 0) {
        traitsHtml = item.traits.map(t => `<span class="trait ${t.toLowerCase()}">${t}</span>`).join('');
    }

    // 2. Generate Stats Grid dynamically
    let statsHtml = '<div class="stats-grid">';
    
    // Loop through our config "fieldLabels"
    for (const [key, label] of Object.entries(fieldLabels)) {
        // Only show if the item actually has this data
        if (item[key] !== undefined && item[key] !== null && item[key] !== "") {
            statsHtml += `
                <div class="stat-box">
                    <span class="stat-label">${label}</span>
                    <span class="stat-value">${item[key]}</span>
                </div>
            `;
        }
    }
    statsHtml += '</div>';

    // 3. Inject into HTML
    contentArea.innerHTML = `
        <div class="detail-header">
            <h1>${item.name}</h1>
            <span class="level-badge">Level ${item.level}</span>
        </div>
        
        <div class="traits-container">${traitsHtml}</div>
        
        ${statsHtml}

        <hr>
        
        <div class="description-block">
            <h3>Description</h3>
            <p>${item.description || "No description provided."}</p>
        </div>
    `;
}

// --- UTILS ---

// Helper: Convert "lightArmor" to "Light Armor"
function camelCaseToTitle(text) {
    const result = text.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// --- SEARCH ---
searchBar.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allItems.filter(item => 
        item.name.toLowerCase().includes(term) || 
        (item.category && item.category.toLowerCase().includes(term))
    );
    renderList(filtered);
});

// Start the app
init();