/**
 * Widgets module for Clock, Search, and Weather
 */

import { translations } from './translations.js';

export class Widgets {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.currentLang = 'en';
        this.preferences = {};
        this.dom = {
            clock: document.getElementById('clock'),
            greeting: document.getElementById('greeting'),
            weatherWidget: document.getElementById('weather-widget'),
            weatherDesc: document.getElementById('weather-desc'),
            weatherTemp: document.getElementById('weather-temp'),
            weatherIcon: document.getElementById('weather-icon'),
            searchForm: document.getElementById('search-form'),
            searchInput: document.getElementById('search-input'),
            searchEngine: document.getElementById('search-engine')
        };
        
        this.init();
    }

    init() {
        this.startClock();
        this.setupSearch();
        // Weather fetch is deferred until preferences are applied
    }

    updatePreferences(preferences) {
        this.preferences = preferences;
        this.refreshWeather();
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


    refreshWeather() {
        const { weatherEnabled, weatherCity, weatherUnit } = this.preferences;
        
        if (!weatherEnabled) {
             this.dom.weatherWidget.classList.add('hidden');
             return;
        }

        this.dom.weatherWidget.classList.remove('hidden');
        this.dom.weatherDesc.textContent = 'Loading...';

        if (weatherCity) {
            this.fetchWeatherByCity(weatherCity);
        } else {
            this.fetchWeatherByGeo();
        }
    }

    fetchWeatherByGeo() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.getWeather(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error('Geolocation error:', error);
                // Fallback or error state
                this.dom.weatherDesc.textContent = 'Loc Error';
                 this.dom.weatherWidget.classList.remove('hidden');
            }
        );
    }

    async fetchWeatherByCity(city) {
        try {
            const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const data = await resp.json();
            if (data.results && data.results.length > 0) {
                const { latitude, longitude } = data.results[0];
                this.getWeather(latitude, longitude);
            } else {
                this.dom.weatherDesc.textContent = 'City not found';
            }
        } catch (e) {
            this.dom.weatherDesc.textContent = 'Error';
        }
    }

    async getWeather(lat, lon) {
        try {
            const unit = this.preferences.weatherUnit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : '';
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true${unit}`);
            const data = await response.json();
            
            if (data.current_weather) {
                const { temperature, weathercode } = data.current_weather;
                const unitSymbol = this.preferences.weatherUnit === 'fahrenheit' ? '°F' : '°C';
                this.dom.weatherTemp.textContent = `${temperature}${unitSymbol}`;
                this.dom.weatherDesc.textContent = this.getWeatherDesc(weathercode);
            }
        } catch (e) {
            console.error('Weather fetch failed', e);
            this.dom.weatherDesc.textContent = 'Error';
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
