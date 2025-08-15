class DIContainer {
    constructor() {
        this._services = new Map();
        this._factories = new Map();
    }

    /**
     * Register a service
     * @param {string} name - Service name
     * @param {*} service - Service instance or factory function
     */
    register(name, service) {
        if (typeof service === 'function') {
            this._factories.set(name, service);
        } else {
            this._services.set(name, service);
        }
        return this;
    }

    /**
     * Get a service
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        // Check if service is already instantiated
        if (this._services.has(name)) {
            return this._services.get(name);
        }

        // Check if there's a factory for this service
        if (this._factories.has(name)) {
            const factory = this._factories.get(name);
            const service = factory(this);
            this._services.set(name, service);
            return service;
        }

        throw new Error(`Service '${name}' not found`);
    }

    /**
     * Create a factory method that lazily instantiates services
     * @param {string} name - Service name
     * @param {Function} factory - Factory function
     * @returns {Function} Lazy loading factory method
     */
    factory(name, factory) {
        this.register(name, factory);
        return () => this.get(name);
    }

    /**
     * Clear all registered services
     */
    clear() {
        this._services.clear();
        this._factories.clear();
    }
}

// Singleton export
export default new DIContainer();