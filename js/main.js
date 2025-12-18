/**
 * Main entry point for the extension
 */
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
            onBgColorChange: (color) => {
                this.preferences.bgColor = color;
                // Clear image if color is explicitly set (optional UX choice)
                // this.preferences.bgImage = null; 
                this.ui.applyPreferences(this.preferences);
                this.save();
            },
            onBgImageChange: (dataUrl) => {
                this.preferences.bgImage = dataUrl;
                this.ui.applyPreferences(this.preferences);
                this.save();
            },
            onThemeChange: (theme) => {
                this.preferences.theme = theme;
                this.ui.applyPreferences(this.preferences);
                this.save();
            },
            onLayoutChange: (layout) => {
                this.preferences.layout = layout;
                this.save();
                this.ui.applyPreferences(this.preferences);
            },
            onLanguageChange: (lang) => {
                this.preferences.language = lang;
                this.save();
                this.ui.applyPreferences(this.preferences);
                this.widgets.updateLanguage(lang);
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
                this.ui.renderShortcuts(this.shortcuts);
            },
            onShortcutDelete: (index) => {
                this.shortcuts.splice(index, 1);
                this.save();
                this.ui.renderShortcuts(this.shortcuts);
            }
        });

        // Initialize Widgets
        this.widgets = new Widgets();

        // Initial Render
        this.ui.renderShortcuts(this.shortcuts);
        this.ui.applyPreferences(this.preferences);
        if (this.preferences.language) {
            this.widgets.updateLanguage(this.preferences.language);
        }
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
