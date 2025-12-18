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
        this.initUnsplash();
        this.editingIndex = -1;
        this.gmailCounts = {};
    }

    isGmailUrl(url) {
        return url.includes('mail.google.com');
    }

    updateGmailCount(counts) {
        this.gmailCounts = counts || {};

        // Find all shortcut cards that link to Gmail
        const cards = this.elements.shortcutsContainer.querySelectorAll('.shortcut-card');
        cards.forEach(card => {
            const url = card.getAttribute('href');
            if (this.isGmailUrl(url)) {
                // Determine user index
                let index = 0;
                const match = url.match(/\/u\/(\d+)\//);
                if (match) {
                    index = parseInt(match[1], 10);
                }

                // Remove existing
                const existingBadge = card.querySelector('.shortcut-badge');
                if (existingBadge) existingBadge.remove();

                // Get count for this user
                const count = this.gmailCounts[index];

                if (count !== undefined && count > 0) {
                    const badge = document.createElement('div');
                    badge.className = 'shortcut-badge';
                    badge.textContent = count > 99 ? '99+' : count;
                    card.appendChild(badge);
                }
            }
        });
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
            shortcutNameInput: document.getElementById('shortcut-name'),
            shortcutUrlInput: document.getElementById('shortcut-url'),
            shortcutModalTitle: document.getElementById('shortcut-modal-title'),
            unsplashApiKeyInput: document.getElementById('unsplash-api-key'),
            unsplashSearchInput: document.getElementById('unsplash-search-input'),
            unsplashSearchBtn: document.getElementById('unsplash-search-btn'),
            unsplashSearchContainer: document.getElementById('unsplash-search-container'),
            unsplashResults: document.getElementById('unsplash-results'),
            paginationDots: document.getElementById('pagination-dots'),
            bgAttribution: document.getElementById('bg-attribution')
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

        const shortcutsContainer = this.elements.shortcutsContainer;

        // Scroll listener for pagination dots
        shortcutsContainer.addEventListener('scroll', () => {
            // Only relevant for grid layout with slides
            if (this.elements.layoutSelect.value === 'grid') {
                const width = shortcutsContainer.clientWidth;
                if (width > 0) {
                    const page = Math.round(shortcutsContainer.scrollLeft / width);
                    this.updateActiveDot(page);
                }
            }
        });

        settingsTrigger.addEventListener('click', () => this.openModal(this.elements.settingsModal));
        addShortcutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openShortcutModal();
        });

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
                    // 1. Remove attribution (since it's now a local file, not Unsplash)
                    if (this.callbacks.onUnsplashConfigChange) {
                        this.callbacks.onUnsplashConfigChange({ bgAttribution: null });
                    }

                    // 2. Set the image
                    this.callbacks.onBgImageChange(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        clearBgImageBtn.addEventListener('click', () => {
            if (this.callbacks.onBgImageChange) {
                // 1. Remove the image
                this.callbacks.onBgImageChange(null);

                // 2. Remove the attribution
                if (this.callbacks.onUnsplashConfigChange) {
                    this.callbacks.onUnsplashConfigChange({ bgAttribution: null });
                }

                bgImageUpload.value = '';
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

        // Weather Settings
        const weatherEnabledCheck = document.getElementById('weather-enabled-check');
        const weatherConfigContainer = document.getElementById('weather-config-container');
        const weatherCityInput = document.getElementById('weather-city-input');
        const weatherUnitSelect = document.getElementById('weather-unit-select');

        weatherEnabledCheck.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            if (enabled) {
                weatherConfigContainer.classList.remove('hidden');
            } else {
                weatherConfigContainer.classList.add('hidden');
            }
            if (this.callbacks.onWeatherConfigChange) {
                this.callbacks.onWeatherConfigChange({ enabled: enabled });
            }
        });

        // Debounce map/save would be better, but change is fine for MVP input
        weatherCityInput.addEventListener('change', (e) => {
            if (this.callbacks.onWeatherConfigChange) {
                this.callbacks.onWeatherConfigChange({ city: e.target.value });
            }
        });

        weatherUnitSelect.addEventListener('change', (e) => {
            if (this.callbacks.onWeatherConfigChange) {
                this.callbacks.onWeatherConfigChange({ unit: e.target.value });
            }
        });
    }

    initUnsplash() {
        const { unsplashApiKeyInput, unsplashSearchBtn, unsplashSearchInput } = this.elements;

        unsplashApiKeyInput.addEventListener('change', (e) => {
            const val = e.target.value.trim();
            if (this.callbacks.onUnsplashConfigChange) {
                this.callbacks.onUnsplashConfigChange({ unsplashClientId: val });
            }
        });

        unsplashSearchBtn.addEventListener('click', () => {
            const query = unsplashSearchInput.value.trim();
            if (query) this.searchUnsplash(query);
        });

        unsplashSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = unsplashSearchInput.value.trim();
                if (query) this.searchUnsplash(query);
            }
        });
    }

    async searchUnsplash(query) {
        // Need current keys from somewhere? We can access input value directly or rely on stored preferences if passed back.
        // For simplicity, read input. If empty, warn.
        const clientId = this.elements.unsplashApiKeyInput.value.trim();
        const t = translations[this.currentLang || 'en'];

        if (!clientId) {
            alert(t.setApiKeyFirst || 'Please set API Key');
            return;
        }

        this.elements.unsplashResults.classList.remove('hidden');
        this.elements.unsplashResults.innerHTML = 'Loading...';

        try {
            const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`, {
                headers: {
                    'Authorization': `Client-ID ${clientId}`
                }
            });

            if (!res.ok) throw new Error(res.statusText);

            const data = await res.json();
            this.renderUnsplashResults(data.results);
        } catch (err) {
            console.error(err);
            this.elements.unsplashResults.innerHTML = 'Error: ' + err.message;
        }
    }

    renderUnsplashResults(photos) {
        const container = this.elements.unsplashResults;
        const t = translations[this.currentLang || 'en'];
        container.innerHTML = '';

        if (!photos || photos.length === 0) {
            container.innerHTML = t.noResults;
            return;
        }

        photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.urls.thumb;
            img.className = 'unsplash-thumb';
            img.title = `Photo by ${photo.user.name}`;
            img.addEventListener('click', () => {
                // 1. Update the background image URL
                if (this.callbacks.onBgImageChange) {
                    this.callbacks.onBgImageChange(photo.urls.full);
                }

                // 2. Update the attribution details
                if (this.callbacks.onUnsplashConfigChange) {
                    this.callbacks.onUnsplashConfigChange({
                        bgAttribution: {
                            name: photo.user.name,
                            username: photo.user.username,
                            link: photo.links.html
                        }
                    });
                }

                // 3. Trigger Unsplash download tracking
                const clientId = this.elements.unsplashApiKeyInput.value.trim();
                if (clientId && photo.links.download_location) {
                    fetch(photo.links.download_location, {
                        headers: { 'Authorization': `Client-ID ${clientId}` }
                    }).catch(console.error);
                }
            });
            container.appendChild(img);
        });
    }


    renderShortcuts(shortcuts) {
        // Clear container
        this.elements.shortcutsContainer.innerHTML = '';
        this.elements.paginationDots.innerHTML = '';

        const layout = this.elements.layoutSelect.value || 'grid';

        if (layout === 'grid') {
            // Pagination Logic: 10 items per page (5x2)
            const itemsPerPage = 10;
            let totalItems = shortcuts.length + 1; // +1 for Add Button
            let numPages = Math.ceil(totalItems / itemsPerPage);
            if (numPages < 1) numPages = 1;

            for (let i = 0; i < numPages; i++) {
                // Create Slide
                const slide = document.createElement('div');
                slide.className = 'shortcut-slide';

                const start = i * itemsPerPage;
                const end = start + itemsPerPage;
                const pageShortcuts = shortcuts.slice(start, end);

                pageShortcuts.forEach((shortcut, idx) => {
                    const absIndex = start + idx;
                    const card = this.createShortcutCard(shortcut, absIndex);
                    slide.appendChild(card);
                });

                // Append Add Button to last page/slot
                if (slide.children.length < itemsPerPage) {
                    slide.appendChild(this.elements.addShortcutBtn);
                    this.elements.addShortcutBtn.style.display = 'flex';
                }
                this.elements.shortcutsContainer.appendChild(slide);

                // Create Dot only if multiple pages
                if (numPages > 1) {
                    const dot = document.createElement('div');
                    dot.className = 'pagination-dot';
                    if (i === 0) dot.classList.add('active');
                    dot.addEventListener('click', () => {
                        this.elements.shortcutsContainer.scrollTo({
                            left: i * this.elements.shortcutsContainer.clientWidth,
                            behavior: 'smooth'
                        });
                    });
                    this.elements.paginationDots.appendChild(dot);
                }
            }

        } else {
            // List Layout
            shortcuts.forEach((shortcut, index) => {
                const card = this.createShortcutCard(shortcut, index);
                this.elements.shortcutsContainer.appendChild(card);
            });
            this.elements.shortcutsContainer.appendChild(this.elements.addShortcutBtn);
            this.elements.addShortcutBtn.style.display = 'flex';
        }
    }

    updateActiveDot(pageIndex) {
        const dots = this.elements.paginationDots.children;
        for (let i = 0; i < dots.length; i++) {
            if (i === pageIndex) dots[i].classList.add('active');
            else dots[i].classList.remove('active');
        }
    }

    createShortcutCard(shortcut, index) {
        const card = document.createElement('a');
        card.className = 'shortcut-card';
        card.href = shortcut.url;
        card.draggable = true;
        card.dataset.index = index;

        const faviconUrl = getFaviconUrl(shortcut.url);
        const fallbackIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PGxpbmUgeDE9IjEyIiB5MT0iOCIgeDI9IjEyIiB5Mj0iMTYiPjwvbGluZT48bGluZSB4MT0iOCIgeTE9IjEyIiB4Mj0iMTYiIHkyPSIxMiI+PC9saW5lPjwvc3ZnPg==';

        card.innerHTML = `
            <img src="${faviconUrl}" alt="${shortcut.name}" class="shortcut-icon" onerror="this.src='${fallbackIcon}'">
            <span class="shortcut-name">${shortcut.name}</span>
        `;

        // Check for Gmail badge
        if (this.isGmailUrl(shortcut.url)) {
            let index = 0;
            const match = shortcut.url.match(/\/u\/(\d+)\//);
            if (match) index = parseInt(match[1], 10);

            const count = this.gmailCounts ? this.gmailCounts[index] : null;

            if (count && count > 0) {
                const badge = document.createElement('div');
                badge.className = 'shortcut-badge';
                badge.textContent = count > 99 ? '99+' : count;
                card.appendChild(badge);
            }
        }

        // Drag Events
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
        card.addEventListener('dragover', (e) => this.handleDragOver(e));
        card.addEventListener('drop', (e) => this.handleDrop(e, index));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        // Context Menu
        card.addEventListener('contextmenu', (e) => this.handleContextMenu(e, index, shortcut));
        return card;
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

        // Attribution
        if (preferences.bgAttribution) {
            const { name, username, link } = preferences.bgAttribution;
            const t = translations[this.currentLang || 'en'];
            const text = t.photographerCredit.replace('{name}', name);
            // We use standard Unsplash tracking links (utm_source=Minimal_New_Tab&utm_medium=referral)
            // But for MVP simple link is fine, though we should adhere to API guidelines.
            // "AppName" needs to be replaced with your app name.
            const utm = '?utm_source=Minimal_New_Tab&utm_medium=referral';
            this.elements.bgAttribution.innerHTML = `
                <a href="${link}${utm}" target="_blank">${text}</a>
            `;
            this.elements.bgAttribution.classList.remove('hidden');
        } else {
            this.elements.bgAttribution.classList.add('hidden');
            this.elements.bgAttribution.innerHTML = '';
        }

        if (preferences.unsplashClientId) {
            this.elements.unsplashApiKeyInput.value = preferences.unsplashClientId;
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

        // Weather
        if (preferences.weatherEnabled) {
            document.getElementById('weather-enabled-check').checked = true;
            document.getElementById('weather-config-container').classList.remove('hidden');
        } else {
            document.getElementById('weather-enabled-check').checked = false;
            document.getElementById('weather-config-container').classList.add('hidden');
        }

        if (preferences.weatherCity) {
            document.getElementById('weather-city-input').value = preferences.weatherCity;
        }
        if (preferences.weatherUnit) {
            document.getElementById('weather-unit-select').value = preferences.weatherUnit;
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
        const t = { ...translations['en'], ...translations[lang] };

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

        const lang = this.currentLang || 'en';
        const t = translations[lang] || translations['en'];

        if (index >= 0 && shortcut) {
            shortcutNameInput.value = shortcut.name;
            shortcutUrlInput.value = shortcut.url;
            shortcutModalTitle.setAttribute('data-i18n', 'editShortcut');
            shortcutModalTitle.textContent = t.editShortcut;
            deleteShortcutBtn.classList.remove('hidden');
        } else {
            shortcutNameInput.value = '';
            shortcutUrlInput.value = '';
            shortcutModalTitle.setAttribute('data-i18n', 'addShortcut');
            shortcutModalTitle.textContent = t.addShortcut;
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
