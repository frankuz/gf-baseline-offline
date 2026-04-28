// IndexedDB operations for response storage

export const db = {
    // Database configuration
    dbName: 'small_farmers_baseline_db',
    dbVersion: 1,
    storeName: 'responses',
    
    // Database instance
    dbInstance: null,
    
    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.dbInstance = event.target.result;
                resolve(this.dbInstance);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create responses store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    
                    // Create indexes
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('full_name', 'full_name', { unique: false });
                }
            };
        });
    },
    
    // Get database instance (initialize if needed)
    async getDB() {
        if (!this.dbInstance) {
            await this.init();
        }
        return this.dbInstance;
    },
    
    // Save a response
    async saveResponse(response) {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.put(response);
            
            request.onsuccess = () => {
                resolve(response);
            };
            
            request.onerror = (event) => {
                console.error('Save response error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Get all responses
    async getAllResponses() {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();
            
            request.onsuccess = () => {
                const responses = request.result || [];
                // Sort by timestamp (newest first)
                responses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(responses);
            };
            
            request.onerror = (event) => {
                console.error('Get all responses error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Get response by ID
    async getResponseById(id) {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('Get response error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Delete response by ID
    async deleteResponse(id) {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error('Delete response error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Delete all responses
    async deleteAllResponses() {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error('Delete all responses error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Get responses count
    async getResponsesCount() {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.count();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (event) => {
                console.error('Count responses error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Search responses by name
    async searchResponsesByName(searchTerm) {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();
            
            request.onsuccess = () => {
                const responses = request.result || [];
                const filtered = responses.filter(response => {
                    const name = response.full_name || '';
                    return name.toLowerCase().includes(searchTerm.toLowerCase());
                });
                
                // Sort by timestamp (newest first)
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(filtered);
            };
            
            request.onerror = (event) => {
                console.error('Search responses error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Get responses in date range
    async getResponsesByDateRange(startDate, endDate) {
        const db = await this.getDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();
            
            request.onsuccess = () => {
                const responses = request.result || [];
                const filtered = responses.filter(response => {
                    const responseDate = new Date(response.timestamp);
                    return responseDate >= new Date(startDate) && responseDate <= new Date(endDate);
                });
                
                // Sort by timestamp (newest first)
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(filtered);
            };
            
            request.onerror = (event) => {
                console.error('Date range search error:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    // Export responses as JSON
    async exportResponsesAsJSON() {
        const responses = await this.getAllResponses();
        return JSON.stringify(responses, null, 2);
    },
    
    // Import responses from JSON
    async importResponsesFromJSON(jsonString) {
        try {
            const responses = JSON.parse(jsonString);
            
            if (!Array.isArray(responses)) {
                throw new Error('Invalid data format');
            }
            
            const db = await this.getDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            // Import each response
            for (const response of responses) {
                await new Promise((resolve, reject) => {
                    const request = store.put(response);
                    request.onsuccess = resolve;
                    request.onerror = reject;
                });
            }
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }
};
