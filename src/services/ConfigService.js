class ConfigService {
    constructor() {
        // Default configuration
        this._config = {
            // Eurorack standards
            hpUnit: 5.08,  // Horizontal Pitch unit in mm
            standardHeight: 128.5,  // Standard module height in mm
            powerRails: ['+12V', '-12V', '+5V'],
            
            // Rendering settings
            rendering: {
                antialias: true,
                shadowMapType: 'PCFSoftShadowMap',
                maxRenderQuality: 'high',
            },
            
            // AI generation settings
            aiGeneration: {
                maxImageSize: 10 * 1024 * 1024,  // 10MB
                supportedImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
                maxGenerationTime: 60000,  // 60 seconds
            },
            
            // User interface
            ui: {
                theme: 'dark',
                language: 'en',
                accessibilityMode: false,
            },
            
            // Export settings
            export: {
                supportedFormats: ['stl', 'obj', 'glb', '3mf'],
                defaultFormat: 'stl',
                maxExportSize: 100 * 1024 * 1024,  // 100MB
            }
        };
    }

    /**
     * Get a configuration value
     * @param {string} key - Dot-separated config path
     * @param {*} defaultValue - Fallback value if not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue) {
        return this._getNestedValue(this._config, key) ?? defaultValue;
    }

    /**
     * Set a configuration value
     * @param {string} key - Dot-separated config path
     * @param {*} value - Value to set
     */
    set(key, value) {
        this._setNestedValue(this._config, key, value);
    }

    /**
     * Internal method to get nested object value
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => 
            acc && acc[part], obj);
    }

    /**
     * Internal method to set nested object value
     * @private
     */
    _setNestedValue(obj, path, value) {
        const parts = path.split('.');
        const last = parts.pop();
        const parent = parts.reduce((acc, part) => {
            acc[part] = acc[part] || {};
            return acc[part];
        }, obj);
        parent[last] = value;
    }

    /**
     * Reset to default configuration
     */
    reset() {
        this._config = JSON.parse(JSON.stringify(this._initialConfig));
    }

    /**
     * Validate and load user configuration
     * @param {Object} userConfig - User-provided configuration
     */
    loadUserConfig(userConfig) {
        // Deep merge with validation
        this._config = this._deepMerge(this._config, userConfig);
    }

    /**
     * Deep merge utility
     * @private
     */
    _deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = this._deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    /**
     * Check if a value is an object
     * @private
     */
    _isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
}

// Singleton export
export default new ConfigService();