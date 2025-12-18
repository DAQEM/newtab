/**
 * Service for interacting with Gmail
 */
export class GmailService {
    constructor() {
        this.pollIntervalId = null;
        this.userIndices = new Set([0]); // Default to user 0
    }

    setIndices(indices) {
        // Convert to Set of numbers
        this.userIndices = new Set(indices.map(i => parseInt(i, 10)));
        // If we want to strictly follow shortcuts, we might end up with no indices if no Gmail shortcuts.
        // But usually we want at least default polling or none.
        // If empty, we can stop polling? Or just poll nothing.

        // Restart polling to pick up new indices immediately
        if (this.pollIntervalId && this.lastCallback) {
            this.startPolling(this.lastCallback);
        }
    }

    /**
     * Fetches the unread count from the Gmail Atom feed for a specific user index.
     * @param {number} userIndex
     * @returns {Promise<number|null>} The unread count, or null if failed.
     */
    async getUnreadCount(userIndex = 0) {
        try {
            const feedUrl = `https://mail.google.com/mail/u/${userIndex}/feed/atom`;
            const response = await fetch(feedUrl);
            if (response.status === 401) {
                console.warn(`Gmail (u/${userIndex}): Not logged in`);
                return null;
            }
            if (!response.ok) {
                // 404 likely means user index invalid/not signed in
                return null;
            }

            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            const fullcountNode = xmlDoc.querySelector('fullcount');

            if (fullcountNode) {
                return parseInt(fullcountNode.textContent, 10);
            }
            return 0;
        } catch (error) {
            console.error(`Gmail Fetch Error (u/${userIndex}):`, error);
            return null;
        }
    }

    /**
     * Starts polling for unread count updates.
     * @param {function(Object): void} callback - Function to call with map { index: count }.
     * @param {number} intervalMs - Polling interval.
     */
    startPolling(callback, intervalMs = 300000) {
        this.lastCallback = callback;
        if (this.pollIntervalId) {
            clearInterval(this.pollIntervalId);
        }

        const poll = async () => {
            const counts = {};
            const promises = Array.from(this.userIndices).map(async (index) => {
                const count = await this.getUnreadCount(index);
                if (count !== null) {
                    counts[index] = count;
                }
            });
            await Promise.all(promises);
            callback(counts);
        };

        // Initial fetch
        poll();

        this.pollIntervalId = setInterval(poll, intervalMs);
    }

    stopPolling() {
        if (this.pollIntervalId) {
            clearInterval(this.pollIntervalId);
            this.pollIntervalId = null;
        }
    }
}
