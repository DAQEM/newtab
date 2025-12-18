/**
 * Utility functions for the extension
 */

/**
 * Validates and formats a URL to ensure it has a protocol
 * @param {string} url - The URL to format
 * @returns {string} - The formatted URL
 */
export function formatUrl(url) {
    url = url.trim();
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
}

/**
 * Generates a favicon URL for a given domain
 * @param {string} url - The URL to get the favicon for
 * @returns {string} - The favicon URL
 */
export function getFaviconUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
    } catch (e) {
        return '';
    }
}

/**
 * Debounce function to limit rate of execution
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
