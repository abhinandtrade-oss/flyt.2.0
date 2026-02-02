import { fetchContent, fetchAllContent } from './supabase-client.js';

export async function fetchSiteAssets() {
    try {
        // 1. Fetch Local Data (Default)
        let localData = {};
        try {
            const response = await fetch('assets/data/data.json');
            if (response.ok) {
                localData = await response.json();
            }
        } catch (e) {
            console.error("Local data load failed:", e);
        }

        // 2. Fetch DB Data (Overrides)
        // We fetch individual rows (like the dashboard) for consistency
        const dbData = await fetchAllContent();

        // 3. Merge (DB wins)
        return { ...localData, ...dbData };

    } catch (err) {
        console.error("Error loading site assets:", err);
    }
    return {};
}

/**
 * Applies assets to the DOM and handles hidden assets (value === "0")
 */
export async function applySiteAssets(idMap = {}) {
    const images = await fetchSiteAssets();
    if (!images) return;

    window.siteImages = images; // Cache globally if needed

    // Helper to handle hidden or apply value
    const handleElement = (el, val, type = 'src') => {
        if (!el) return;

        if (val === "0") {
            el.style.display = 'none';
        } else {
            // Restore display in case it was hidden (for dynamic updates if implemented)
            // But we usually just set it once.
            // el.style.display = ''; 

            if (type === 'src') {
                el.src = val;
            } else if (type === 'bg') {
                el.style.backgroundImage = `url(${val})`;
            }
        }
    };

    // 1. Handle explicit ID mappings
    for (const [id, key] of Object.entries(idMap)) {
        // Use querySelectorAll to handle duplicate IDs (e.g. cloned in sticky header)
        const elements = document.querySelectorAll(`[id="${id}"]`);
        elements.forEach(el => {
            if (images[key] !== undefined) {
                handleElement(el, images[key], id === 'weDoBg' ? 'bg' : 'src');
            }
        });
    }

    // 2. Handle data-img attribute
    document.querySelectorAll('[data-img]').forEach(el => {
        const key = el.getAttribute('data-img');
        if (images[key] !== undefined) {
            handleElement(el, images[key], (el.tagName === 'IMG' ? 'src' : 'bg'));
        }
    });

    // 3. Handle data-img-id attribute
    document.querySelectorAll('[data-img-id]').forEach(el => {
        const key = el.getAttribute('data-img-id');
        if (images[key] !== undefined) {
            handleElement(el, images[key], 'src');
        }
    });

    // 4. Handle elements where ID is the key itself (e.g., IM-123)
    document.querySelectorAll('img[id^="IM-"]').forEach(el => {
        const key = el.id;
        if (images[key] !== undefined) {
            handleElement(el, images[key], 'src');
        }
    });
}
