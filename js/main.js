/**
 * Main entry point for the extension
 */
import { GmailService } from './gmail.js';
import { loadData, saveData } from './storage.js';
import { UI } from './ui.js';
import { formatUrl } from './utils.js';
import { Widgets } from './widgets.js';


class App {
    constructor() {
        this.shortcuts = [];
        this.preferences = {};
        this.ui = null;
        this.widgets = null;
    }

    async init() {
        // Load data
        const data = await loadData();
        this.shortcuts = data.shortcuts;
        this.preferences = data.preferences;

        // Initialize UI with callbacks
        this.ui = new UI({
            onThemeChange: (theme) => {
                this.preferences.theme = theme;
                this.save();
                this.ui.applyPreferences(this.preferences);
            },
            onBgColorChange: (color) => {
                this.preferences.bgColor = color;
                this.save();
                this.ui.applyPreferences(this.preferences);
            },
            onBgImageChange: (dataUrl) => {
                this.preferences.bgImage = dataUrl;
                // No sync for large image, storage module handles this check.
                this.save();
                this.ui.applyPreferences(this.preferences);
            },
            onLayoutChange: (layout) => {
                this.preferences.layout = layout;
                this.save();
                this.ui.applyPreferences(this.preferences);
                this.ui.renderShortcuts(this.shortcuts);
            },
            onLanguageChange: (lang) => {
                this.preferences.language = lang;
                this.save();
                this.ui.applyPreferences(this.preferences);
                this.widgets.updateLanguage(lang);
            },
            onWeatherConfigChange: (updates) => {
                if ('enabled' in updates) this.preferences.weatherEnabled = updates.enabled;
                if ('city' in updates) this.preferences.weatherCity = updates.city;
                if ('unit' in updates) this.preferences.weatherUnit = updates.unit;
                this.save();
                this.widgets.updatePreferences(this.preferences);
            },
            onShortcutReorder: (fromIndex, toIndex) => {
                const [moved] = this.shortcuts.splice(fromIndex, 1);
                this.shortcuts.splice(toIndex, 0, moved);
                this.save();
                this.ui.renderShortcuts(this.shortcuts); // Re-render to ensure DOM matches state perfectly
            },
            onSettingsSave: () => {
                this.save();
            },
            onExportData: () => {
                const data = {
                    shortcuts: this.shortcuts,
                    preferences: this.preferences,
                    timestamp: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'newtab-settings.json';
                a.click();
                URL.revokeObjectURL(url);
            },
            onImportData: (data) => {
                if (data.shortcuts && Array.isArray(data.shortcuts)) {
                    this.shortcuts = data.shortcuts;
                }
                if (data.preferences) {
                    this.preferences = { ...this.preferences, ...data.preferences };
                }
                this.save();
                this.ui.renderShortcuts(this.shortcuts);
                this.ui.applyPreferences(this.preferences);
                if (this.preferences.language) {
                    this.widgets.updateLanguage(this.preferences.language);
                }
                alert('Settings imported successfully!');
            },
            onShortcutSave: (index, name, url) => {
                const formattedUrl = formatUrl(url);
                if (index >= 0) {
                    this.shortcuts[index] = { name, url: formattedUrl };
                } else {
                    this.shortcuts.push({ name, url: formattedUrl });
                }
                this.save();
                this.updateGmailService();
                this.ui.renderShortcuts(this.shortcuts);
            },
            onShortcutDelete: (index) => {
                this.shortcuts.splice(index, 1);
                this.save();
                this.updateGmailService();
                this.ui.renderShortcuts(this.shortcuts);
            },
            onUnsplashConfigChange: (updates) => {
                // Merge the updates (bgAttribution or unsplashClientId) into preferences
                this.preferences = { ...this.preferences, ...updates };
                this.save();
                this.ui.applyPreferences(this.preferences);
            },
        });

        // Initialize Widgets
        this.widgets = new Widgets({});



        // Initial Render
        this.ui.renderShortcuts(this.shortcuts);
        this.ui.applyPreferences(this.preferences);
        if (this.preferences.language) {
            this.widgets.updateLanguage(this.preferences.language);
        }
        // Pass preferences to widgets
        this.widgets.updatePreferences(this.preferences);

        // Initialize Gmail Service
        this.gmailService = new GmailService();

        // Initial setup of indices
        this.updateGmailService();

        this.gmailService.startPolling((counts) => {
            this.ui.updateGmailCount(counts);
        });
    }

    updateGmailService() {
        const indices = new Set();
        this.shortcuts.forEach(s => {
            if (s.url.includes('mail.google.com')) {
                const match = s.url.match(/\/u\/(\d+)\//);
                if (match) {
                    indices.add(match[1]);
                } else {
                    indices.add(0); // Default if just mail.google.com
                }
            }
        });
        this.gmailService.setIndices(Array.from(indices));
    }

    save() {
        saveData(this.shortcuts, this.preferences);
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
