document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const app = document.getElementById('app');
    const shortcutsContainer = document.getElementById('shortcuts-container');
    const addShortcutBtn = document.getElementById('add-shortcut-btn');
    const settingsTrigger = document.getElementById('settings-trigger');
    const settingsModal = document.getElementById('settings-modal');
    const shortcutModal = document.getElementById('shortcut-modal');
    const closeModals = document.querySelectorAll('.close-modal');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const saveShortcutBtn = document.getElementById('save-shortcut');
    const deleteShortcutBtn = document.getElementById('delete-shortcut');
    const shortcutNameInput = document.getElementById('shortcut-name');
    const shortcutUrlInput = document.getElementById('shortcut-url');
    const shortcutModalTitle = document.getElementById('shortcut-modal-title');

    // State
    let shortcuts = [];
    let preferences = {
        bgColor: '#1e1e1e'
    };
    let editingIndex = -1;

    // Load Data
    loadData();

    // Event Listeners
    settingsTrigger.addEventListener('click', () => openModal(settingsModal));
    addShortcutBtn.addEventListener('click', () => openShortcutModal());
    closeModals.forEach(btn => btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal'))));
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    bgColorPicker.addEventListener('input', (e) => {
        preferences.bgColor = e.target.value;
        applyPreferences();
    });

    bgColorPicker.addEventListener('change', () => {
        saveData();
    });

    saveShortcutBtn.addEventListener('click', saveShortcut);
    deleteShortcutBtn.addEventListener('click', deleteShortcut);

    // Functions
    function loadData() {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.warn('Chrome storage not available, using local mocks');
            shortcuts = [
                { name: 'Google', url: 'https://google.com' },
                { name: 'YouTube', url: 'https://youtube.com' }
            ];
            preferences = { bgColor: '#1e1e1e' };
            renderShortcuts();
            applyPreferences();
            return;
        }

        chrome.storage.sync.get(['shortcuts', 'preferences'], (result) => {
            if (result.shortcuts) {
                shortcuts = result.shortcuts;
            } else {
                // Default shortcuts
                shortcuts = [
                    { name: 'Google', url: 'https://google.com' },
                    { name: 'YouTube', url: 'https://youtube.com' }
                ];
                saveData(); // Save defaults
            }

            if (result.preferences) {
                preferences = { ...preferences, ...result.preferences };
            }

            renderShortcuts();
            applyPreferences();
        });
    }

    function saveData() {
        chrome.storage.sync.set({
            shortcuts: shortcuts,
            preferences: preferences
        });
    }

    function applyPreferences() {
        document.body.style.backgroundColor = preferences.bgColor;
        bgColorPicker.value = preferences.bgColor;
        
        // Dynamic text color based on background brightness could be added here
        // For now assuming dark themes mostly or user will pick compatible colors
    }

    function renderShortcuts() {
        // Remove existing shortcuts (but keep add button)
        const existingShortcuts = document.querySelectorAll('.shortcut-card');
        existingShortcuts.forEach(el => el.remove());

        shortcuts.forEach((shortcut, index) => {
            const card = document.createElement('a');
            card.className = 'shortcut-card';
            card.href = shortcut.url;
            
            // Get favicon
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${shortcut.url}`;
            
            card.innerHTML = `
                <button class="edit-btn" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <img src="${faviconUrl}" alt="${shortcut.name}" class="shortcut-icon" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PGxpbmUgeDE9IjEyIiB5MT0iOCIgeDI9IjEyIiB5Mj0iMTYiPjwvbGluZT48bGluZSB4MT0iOCIgeTE9IjEyIiB4Mj0iMTYiIHkyPSIxMiI+PC9saW5lPjwvc3ZnPg=='">
                <span class="shortcut-name">${shortcut.name}</span>
            `;

            // Prevent navigation when clicking edit
            card.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openShortcutModal(index);
            });

            shortcutsContainer.insertBefore(card, addShortcutBtn);
        });
    }

    function openModal(modal) {
        modal.classList.remove('hidden');
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
    }

    function openShortcutModal(index = -1) {
        editingIndex = index;
        if (index >= 0) {
            const shortcut = shortcuts[index];
            shortcutNameInput.value = shortcut.name;
            shortcutUrlInput.value = shortcut.url;
            shortcutModalTitle.textContent = 'Edit Shortcut';
            deleteShortcutBtn.classList.remove('hidden');
        } else {
            shortcutNameInput.value = '';
            shortcutUrlInput.value = '';
            shortcutModalTitle.textContent = 'Add Shortcut';
            deleteShortcutBtn.classList.add('hidden');
        }
        openModal(shortcutModal);
        shortcutNameInput.focus();
    }

    function saveShortcut() {
        const name = shortcutNameInput.value.trim();
        let url = shortcutUrlInput.value.trim();

        if (!name || !url) {
            alert('Please fill in both fields');
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        if (editingIndex >= 0) {
            shortcuts[editingIndex] = { name, url };
        } else {
            shortcuts.push({ name, url });
        }

        saveData();
        renderShortcuts();
        closeModal(shortcutModal);
    }

    function deleteShortcut() {
        if (editingIndex >= 0) {
            if (confirm('Are you sure you want to delete this shortcut?')) {
                shortcuts.splice(editingIndex, 1);
                saveData();
                renderShortcuts();
                closeModal(shortcutModal);
            }
        }
    }
});
