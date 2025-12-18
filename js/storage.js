/**
 * Storage module for handling data persistence
 */

// Default data
const DEFAULT_SHORTCUTS = [
    { name: 'Google', url: 'https://google.com' },
    { name: 'YouTube', url: 'https://youtube.com' }
];

const DEFAULT_PREFERENCES = {
    bgColor: '#1e1e1e',
    bgImage: null,
    theme: 'system',
    layout: 'grid',
    language: 'en'
};

/**
 * Loads data from storage
 * @returns {Promise<{shortcuts: Array, preferences: Object}>}
 */
export function loadData() {
    return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.warn('Chrome storage not available, using local mocks');
            resolve({
                shortcuts: DEFAULT_SHORTCUTS,
                preferences: DEFAULT_PREFERENCES
            });
            return;
        }

        chrome.storage.local.get(['shortcuts', 'preferences'], (result) => {
            const data = {
                shortcuts: result.shortcuts || DEFAULT_SHORTCUTS,
                preferences: { ...DEFAULT_PREFERENCES, ...result.preferences }
            };
            
            // If using defaults, save them to storage
            if (!result.shortcuts) {
                saveData(data.shortcuts, data.preferences);
            }
            
            resolve(data);
        });
    });
}

/**
 * Saves data to storage
 * @param {Array} shortcuts 
 * @param {Object} preferences 
 */
export function saveData(shortcuts, preferences) {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    chrome.storage.local.set({
        shortcuts: shortcuts,
        preferences: preferences
    });
}
