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
 * Loads data from storage (Sync with Local fallback/migration)
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

        // Fetch from both Sync and Local
        chrome.storage.sync.get(['shortcuts', 'preferences'], (syncResult) => {
            chrome.storage.local.get(['shortcuts', 'preferences', 'bgImage'], (localResult) => {
                
                let shortcuts = syncResult.shortcuts;
                let preferences = syncResult.preferences;

                // Migration: If Sync is empty but Local has data, use Local
                // We check if shortcuts is undefined to detect empty sync
                const isSyncEmpty = !shortcuts && !preferences;
                if (isSyncEmpty && (localResult.shortcuts || localResult.preferences)) {
                    shortcuts = localResult.shortcuts;
                    preferences = localResult.preferences;
                }

                // Initialize defaults
                shortcuts = shortcuts || DEFAULT_SHORTCUTS;
                preferences = { ...DEFAULT_PREFERENCES, ...preferences };

                // Always load heavy bgImage from Local
                const storedBgImage = localResult.bgImage || (localResult.preferences && localResult.preferences.bgImage);
                
                if (storedBgImage) {
                    preferences.bgImage = storedBgImage;
                }

                resolve({ shortcuts, preferences });
            });
        });
    });
}

/**
 * Saves data to storage
 * Shortcuts & Settings -> Sync
 * Background Image -> Local (due to size limits)
 * @param {Array} shortcuts 
 * @param {Object} preferences 
 */
export function saveData(shortcuts, preferences) {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    // Separate bgImage from other preferences
    const { bgImage, ...syncPreferences } = preferences;

    // Save lightweight data to Sync
    chrome.storage.sync.set({
        shortcuts: shortcuts,
        preferences: syncPreferences
    });

    // Save heavy image to Local
    chrome.storage.local.set({
        bgImage: bgImage
    });
}
