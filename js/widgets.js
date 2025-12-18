/**
 * Widgets module for Clock, Search, and Weather
 */

import { translations } from './translations.js';

export class Widgets {
    constructor() {
        this.currentLang = 'en';
        this.dom = {
            clock: document.getElementById('clock'),
            greeting: document.getElementById('greeting'),
            weatherWidget: document.getElementById('weather-widget'),
            weatherDesc: document.getElementById('weather-desc'),
            weatherTemp: document.getElementById('weather-temp'),
            searchForm: document.getElementById('search-form'),
            searchInput: document.getElementById('search-input'),
            searchEngine: document.getElementById('search-engine')
        };
        
        this.init();
    }

    init() {
        this.startClock();
        this.setupSearch();
        this.fetchWeather();
    }

    updateLanguage(lang) {
        this.currentLang = lang || 'en';
        const t = translations[this.currentLang];
        
        // Update Search Placeholder
        this.dom.searchInput.placeholder = t.searchPlaceholder;
        
        // Refresh Clock & Greeting immediately
        this.updateClock(); // Refactored out of startClock if possible, or wait for interval
        
        // Re-render Weather if error/loading message is there
        // Actually weather description is from API usually, but errors are local
        // We'll leave weather as is unless we force re-fetch or mapping
        if (this.dom.weatherDesc.textContent === 'Loc Error' || this.dom.weatherDesc.textContent === 'Perm Denied') {
             // Refresh error text
        }
    }

    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        this.dom.clock.textContent = timeString;
        
        let greetingKey = 'greetingMorning';
        if (hours >= 12 && hours < 18) greetingKey = 'greetingAfternoon';
        else if (hours >= 18) greetingKey = 'greetingEvening';
        
        const t = translations[this.currentLang] || translations['en'];
        this.dom.greeting.textContent = t[greetingKey];
    }

    setupSearch() {
        this.dom.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = this.dom.searchInput.value.trim();
            const engine = this.dom.searchEngine.value;
            
            if (!query) return;
            
            let url = '';
            switch (engine) {
                case 'google':
                    url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                    break;
                case 'duckduckgo':
                    url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
                    break;
                case 'bing':
                    url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
                    break;
            }
            
            window.location.href = url;
        });
    }

    fetchWeather() {
        // Privacy-focused: No precise location, use IP-based estimate via Open-Meteo or similar if available.
        // For strictly client-side without API keys, Open-Meteo requires Lat/Lon.
        // We can use a free IP-to-Geo service like ipapi.co (might have rate limits) or just ask user.
        // To be safe and keep it simple for MVP, we'll try to get generic location from browser or default to a safe value.
        // Actually, let's use a very simple approach: `navigator.geolocation` if user permits.
        
        if (!navigator.geolocation) {
            this.dom.weatherWidget.classList.add('hidden');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.getWeather(latitude, longitude);
            },
            (error) => {
                console.error('Geolocation error:', error);
                const t = translations[this.currentLang] || translations['en'];
                let msg = t.weatherError;
                // We're hiding it now anyway on error as per user request
                this.dom.weatherWidget.classList.add('hidden');
            }
        );
    }

    async getWeather(lat, lon) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await response.json();
            
            if (data.current_weather) {
                const { temperature, weathercode } = data.current_weather;
                this.dom.weatherTemp.textContent = `${temperature}°C`;
                this.dom.weatherDesc.textContent = this.getWeatherDesc(weathercode);
            }
        } catch (e) {
            console.error('Weather fetch failed', e);
            this.dom.weatherWidget.classList.add('hidden');
        }
    }

    getWeatherDesc(code) {
        // Simple mapping for WMO codes
        if (code === 0) return 'Clear sky';
        if (code <= 3) return 'Partly cloudy';
        if (code <= 48) return 'Foggy';
        if (code <= 67) return 'Rainy';
        if (code <= 77) return 'Snowy';
        if (code <= 82) return 'Rain showers';
        if (code <= 99) return 'Thunderstorm';
        return 'Unknown';
    }
}
