/**
 * UI module for handling DOM manipulations
 */
import { languages, translations } from './translations.js';
import { getFaviconUrl } from './utils.js';

export class UI {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = this.cacheDOM();
        this.bindEvents();
        this.setupContextMenu();
        this.initLanguageSelect();
        this.editingIndex = -1;
    }

    cacheDOM() {
        return {
            app: document.getElementById('app'),
            shortcutsContainer: document.getElementById('shortcuts-container'),
            addShortcutBtn: document.getElementById('add-shortcut-btn'),
            settingsTrigger: document.getElementById('settings-trigger'),
            settingsModal: document.getElementById('settings-modal'),
            shortcutModal: document.getElementById('shortcut-modal'),
            closeModals: document.querySelectorAll('.close-modal'),
            bgColorPicker: document.getElementById('bg-color-picker'),
            bgImageUpload: document.getElementById('bg-image-upload'),
            clearBgImageBtn: document.getElementById('clear-bg-image'),
            themeSelect: document.getElementById('theme-select'),
            layoutSelect: document.getElementById('layout-select'),
            languageSelect: document.getElementById('language-select'),
            exportDataBtn: document.getElementById('export-data'),
            importDataBtn: document.getElementById('import-data-btn'),
            importDataInput: document.getElementById('import-data-input'),
            saveShortcutBtn: document.getElementById('save-shortcut'),
            deleteShortcutBtn: document.getElementById('delete-shortcut'),
            shortcutNameInput: document.getElementById('shortcut-name'),
            shortcutUrlInput: document.getElementById('shortcut-url'),
            shortcutModalTitle: document.getElementById('shortcut-modal-title')
        };
    }

    bindEvents() {
        const { 
            settingsTrigger, 
            addShortcutBtn, 
            closeModals, 
            bgColorPicker, 
            saveShortcutBtn, 
            deleteShortcutBtn 
        } = this.elements;

        settingsTrigger.addEventListener('click', () => this.openModal(this.elements.settingsModal));
        addShortcutBtn.addEventListener('click', () => this.openShortcutModal());
        
        closeModals.forEach(btn => 
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')))
        );

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });

        bgColorPicker.addEventListener('input', (e) => {
            if (this.callbacks.onBgColorChange) {
                this.callbacks.onBgColorChange(e.target.value);
            }
        });

        const { bgImageUpload, clearBgImageBtn, themeSelect, layoutSelect, languageSelect } = this.elements;

        bgImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && this.callbacks.onBgImageChange) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.callbacks.onBgImageChange(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        clearBgImageBtn.addEventListener('click', () => {
            if (this.callbacks.onBgImageChange) {
                this.callbacks.onBgImageChange(null);
                bgImageUpload.value = ''; // Reset input
            }
        });

        themeSelect.addEventListener('change', (e) => {
            if (this.callbacks.onThemeChange) {
                this.callbacks.onThemeChange(e.target.value);
            }
        });

        layoutSelect.addEventListener('change', (e) => {
           if (this.callbacks.onLayoutChange) {
               this.callbacks.onLayoutChange(e.target.value);
           }
        });

        languageSelect.addEventListener('change', (e) => {
            if (this.callbacks.onLanguageChange) {
                this.callbacks.onLanguageChange(e.target.value);
            }
        });

        const { exportDataBtn, importDataBtn, importDataInput } = this.elements;

        exportDataBtn.addEventListener('click', () => {
            if (this.callbacks.onExportData) {
                this.callbacks.onExportData();
            }
        });

        importDataBtn.addEventListener('click', () => {
            importDataInput.click();
        });

        importDataInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && this.callbacks.onImportData) {
                const reader = new FileReader();
                reader.onload = (event) => {
                     try {
                         const data = JSON.parse(event.target.result);
                         this.callbacks.onImportData(data);
                     } catch (err) {
                         alert('Invalid JSON file');
                     }
                };
                reader.readAsText(file);
            }
            e.target.value = ''; // Reset
        });
        
        // Save on modal close or specific events? For now we rely on explicit changes calls
        // But we might want to trigger a general save when settings modal closes
        // However, Main.js saves on callbacks, so it should be fine.

        saveShortcutBtn.addEventListener('click', () => this.handleSaveShortcut());
        deleteShortcutBtn.addEventListener('click', () => this.handleDeleteShortcut());
    }


    renderShortcuts(shortcuts) {
        // Remove existing shortcuts
        const existingShortcuts = document.querySelectorAll('.shortcut-card');
        existingShortcuts.forEach(el => el.remove());

        shortcuts.forEach((shortcut, index) => {
            const card = document.createElement('a');
            card.className = 'shortcut-card';
            card.href = shortcut.url;
            card.draggable = true;
            card.dataset.index = index;
            
            const faviconUrl = getFaviconUrl(shortcut.url);
            // Fallback icon logic...
            const fallbackIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PGxpbmUgeDE9IjEyIiB5MT0iOCIgeDI9IjEyIiB5Mj0iMTYiPjwvbGluZT48bGluZSB4MT0iOCIgeTE9IjEyIiB4Mj0iMTYiIHkyPSIxMiI+PC9saW5lPjwvc3ZnPg==';

            card.innerHTML = `
                <img src="${faviconUrl}" alt="${shortcut.name}" class="shortcut-icon" onerror="this.src='${fallbackIcon}'">
                <span class="shortcut-name">${shortcut.name}</span>
            `;

            // Drag Events
            card.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
            card.addEventListener('dragover', (e) => this.handleDragOver(e));
            card.addEventListener('drop', (e) => this.handleDrop(e, index));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
            // Context Menu
            card.addEventListener('contextmenu', (e) => this.handleContextMenu(e, index, shortcut));

            this.elements.shortcutsContainer.insertBefore(card, this.elements.addShortcutBtn);
        });
    }

    handleDragStart(e, index) {
        e.dataTransfer.setData('text/plain', index);
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e, targetIndex) {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (fromIndex !== targetIndex && this.callbacks.onShortcutReorder) {
            this.callbacks.onShortcutReorder(fromIndex, targetIndex);
        }
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    setupContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'context-menu';
        this.contextMenu.className = 'hidden';
        this.contextMenu.innerHTML = `
            <div class="menu-item" id="ctx-edit">Edit</div>
            <div class="menu-item" id="ctx-delete">Delete</div>
        `;
        // Content injected dynamically based on lang now, or we init with default
        this.updateContextMenu('en'); // Default init
        document.body.appendChild(this.contextMenu);

        // Hide when clicking elsewhere
        window.addEventListener('click', () => this.contextMenu.classList.add('hidden'));
        
        // Bind actions
        this.contextMenu.querySelector('#ctx-edit').addEventListener('click', () => {
            if (this.ctxTargetIndex !== -1) {
                this.openShortcutModal(this.ctxTargetIndex, this.ctxTargetShortcut);
            }
        });
        
        this.contextMenu.querySelector('#ctx-delete').addEventListener('click', () => {
            if (this.ctxTargetIndex !== -1) {
                const lang = this.currentLang || 'en';
                const t = translations[lang];
                if (confirm(t.confirmDelete)) {
                     if (this.callbacks.onShortcutDelete) {
                        this.callbacks.onShortcutDelete(this.ctxTargetIndex);
                    }
                }
            }
        });
    }

    handleContextMenu(e, index, shortcut) {
        e.preventDefault();
        this.ctxTargetIndex = index;
        this.ctxTargetShortcut = shortcut;
        
        this.contextMenu.style.top = `${e.clientY}px`;
        this.contextMenu.style.left = `${e.clientX}px`;
        this.contextMenu.classList.remove('hidden');
    }

    applyPreferences(preferences) {
        // Background
        if (preferences.bgImage) {
            document.body.style.backgroundImage = `url('${preferences.bgImage}')`;
            this.elements.clearBgImageBtn.classList.remove('hidden');
        } else {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = preferences.bgColor;
            this.elements.clearBgImageBtn.classList.add('hidden');
        }
        
        this.elements.bgColorPicker.value = preferences.bgColor;

        // Theme
        document.body.classList.remove('light-theme', 'dark-theme');
        if (preferences.theme === 'light') {
            document.body.classList.add('light-theme');
        } else if (preferences.theme === 'system') {
             if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                 document.body.classList.add('light-theme');
             }
        }
        this.elements.themeSelect.value = preferences.theme;

        // Layout
        this.elements.shortcutsContainer.classList.remove('layout-grid', 'layout-list', 'layout-minimal');
        this.elements.shortcutsContainer.classList.add(`layout-${preferences.layout}`);
        this.elements.layoutSelect.value = preferences.layout;

        // Language
        if (preferences.language) {
            this.currentLang = preferences.language;
            this.applyLanguage(preferences.language);
        }
    }

    initLanguageSelect() {
        const select = this.elements.languageSelect;
        select.innerHTML = '';
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            select.appendChild(option);
        });
    }

    applyLanguage(lang) {
        if (!translations[lang]) lang = 'en';
        this.currentLang = lang;
        const t = translations[lang];

        // Update RTL
        document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update static elements with data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                el.textContent = t[key];
            }
        });

        // Update Placeholders
        this.elements.shortcutNameInput.placeholder = t.name;
        this.elements.shortcutUrlInput.placeholder = t.url;
        this.elements.importDataBtn.textContent = t.importSettings;
        this.elements.exportDataBtn.textContent = t.exportSettings;
        this.elements.clearBgImageBtn.textContent = t.removeImage;

        // Update Context Menu
        this.updateContextMenu(lang);

        // Update Language Select Value
        this.elements.languageSelect.value = lang;
    }

    updateContextMenu(lang) {
        if (!translations[lang]) lang = 'en';
        const t = translations[lang];
        
        // We assume context menu has 2 children: edit and delete
        // See setupContextMenu for structure: #ctx-edit, #ctx-delete
        const editBtn = this.contextMenu.querySelector('#ctx-edit');
        const deleteBtn = this.contextMenu.querySelector('#ctx-delete');
        
        if (editBtn) editBtn.textContent = t.edit;
        if (deleteBtn) deleteBtn.textContent = t.delete;
    }

    openModal(modal) {
        modal.classList.remove('hidden');
    }

    closeModal(modal) {
        modal.classList.add('hidden');
    }

    openShortcutModal(index = -1, shortcut = null) {
        this.editingIndex = index;
        const { shortcutNameInput, shortcutUrlInput, shortcutModalTitle, deleteShortcutBtn, shortcutModal } = this.elements;

        if (index >= 0 && shortcut) {
            shortcutNameInput.value = shortcut.name;
            shortcutUrlInput.value = shortcut.url;
            shortcutModalTitle.setAttribute('data-i18n', 'editShortcut');
            shortcutModalTitle.textContent = translations[this.currentLang || 'en'].editShortcut;
            deleteShortcutBtn.classList.remove('hidden');
        } else {
            shortcutNameInput.value = '';
            shortcutUrlInput.value = '';
            shortcutModalTitle.setAttribute('data-i18n', 'addShortcut');
            shortcutModalTitle.textContent = translations[this.currentLang || 'en'].addShortcut;
            deleteShortcutBtn.classList.add('hidden');
        }
        this.openModal(shortcutModal);
        shortcutNameInput.focus();
    }

    handleSaveShortcut() {
        const name = this.elements.shortcutNameInput.value.trim();
        const url = this.elements.shortcutUrlInput.value.trim();

        if (!name || !url) {
            alert('Please fill in both fields');
            return;
        }

        if (this.callbacks.onShortcutSave) {
            this.callbacks.onShortcutSave(this.editingIndex, name, url);
        }

        this.closeModal(this.elements.shortcutModal);
    }

    handleDeleteShortcut() {
        if (this.editingIndex >= 0) {
            if (confirm('Are you sure you want to delete this shortcut?')) {
                if (this.callbacks.onShortcutDelete) {
                    this.callbacks.onShortcutDelete(this.editingIndex);
                }
                this.closeModal(this.elements.shortcutModal);
            }
        }
    }
}
