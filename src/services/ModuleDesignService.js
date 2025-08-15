import ErrorService from './ErrorService.js';
import ConfigService from './ConfigService.js';
import ThreeJsService from './ThreeJsService.js';

class ModuleDesignService {
    constructor() {
        // Eurorack module design constants
        this._standards = {
            hpUnit: 5.08,  // Horizontal Pitch unit in mm
            standardHeight: 128.5,  // Standard module height in mm
            maxWidth: 42 * 5.08,  // Maximum width in mm (42HP)
            powerConnectors: ['+12V', '-12V', '+5V']
        };

        // Validation schemas
        this._moduleSchema = {
            name: { 
                required: true, 
                type: 'string', 
                minLength: 1, 
                maxLength: 50 
            },
            width: { 
                required: true, 
                type: 'number', 
                min: 2,  // Minimum 2HP 
                max: 42  // Maximum 42HP
            },
            height: { 
                required: true, 
                type: 'number', 
                min: 100,  // Minimum practical height
                max: 150  // Maximum practical height
            },
            depth: { 
                required: true, 
                type: 'number', 
                min: 20,  // Minimum depth
                max: 45   // Maximum depth
            },
            powerDraw: {
                required: false,
                validator: this._validatePowerDraw.bind(this)
            }
        };
    }

    /**
     * Create a new module design
     * @param {Object} moduleSpec - Module specification
     * @returns {Object} Validated module design
     */
    createModule(moduleSpec) {
        try {
            // Validate input against schema
            const validationResult = this._validateModuleSpec(moduleSpec);
            
            if (!validationResult.isValid) {
                throw new Error(`Invalid module specification: ${validationResult.errors.join(', ')}`);
            }

            // Normalize and sanitize module specification
            const normalizedModule = this._normalizeModuleSpec(moduleSpec);

            // Calculate derived properties
            normalizedModule.hpWidth = normalizedModule.width * this._standards.hpUnit;
            normalizedModule.volumeCm3 = this._calculateVolume(normalizedModule);
            
            return normalizedModule;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Module Design Creation', 
                inputSpec: moduleSpec 
            });
            return null;
        }
    }

    /**
     * Validate module specification against design rules
     * @param {Object} moduleSpec - Module specification to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateModuleSpec(moduleSpec) {
        const errors = [];

        // Check each field in the schema
        Object.keys(this._moduleSchema).forEach(key => {
            const fieldSchema = this._moduleSchema[key];
            const value = moduleSpec[key];

            // Check required fields
            if (fieldSchema.required && (value === undefined || value === null)) {
                errors.push(`${key} is required`);
                return;
            }

            // Type checking
            if (fieldSchema.type && typeof value !== fieldSchema.type) {
                errors.push(`${key} must be of type ${fieldSchema.type}`);
                return;
            }

            // Min/Max checking for numbers
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
                errors.push(`${key} must be at least ${fieldSchema.min}`);
            }

            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
                errors.push(`${key} must be at most ${fieldSchema.max}`);
            }

            // Custom validators
            if (fieldSchema.validator && typeof fieldSchema.validator === 'function') {
                const customValidation = fieldSchema.validator(value);
                if (!customValidation.isValid) {
                    errors.push(...customValidation.errors);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate power draw specifications
     * @param {Object} powerDraw - Power draw specification
     * @returns {Object} Validation result
     * @private
     */
    _validatePowerDraw(powerDraw) {
        const errors = [];
        const maxPowerPerRail = 500;  // mA

        this._standards.powerConnectors.forEach(rail => {
            const draw = powerDraw[rail] || 0;
            
            if (typeof draw !== 'number') {
                errors.push(`Power draw for ${rail} must be a number`);
                return;
            }

            if (draw < 0) {
                errors.push(`Power draw for ${rail} cannot be negative`);
            }

            if (draw > maxPowerPerRail) {
                errors.push(`Power draw for ${rail} cannot exceed ${maxPowerPerRail}mA`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Normalize and sanitize module specification
     * @param {Object} moduleSpec - Raw module specification
     * @returns {Object} Normalized module specification
     * @private
     */
    _normalizeModuleSpec(moduleSpec) {
        return {
            name: moduleSpec.name.trim(),
            width: Math.round(moduleSpec.width),
            height: Math.round(moduleSpec.height),
            depth: Math.round(moduleSpec.depth),
            powerDraw: moduleSpec.powerDraw ? { 
                '+12V': moduleSpec.powerDraw['+12V'] || 0,
                '-12V': moduleSpec.powerDraw['-12V'] || 0,
                '+5V': moduleSpec.powerDraw['+5V'] || 0
            } : { '+12V': 0, '-12V': 0, '+5V': 0 },
            controls: moduleSpec.controls || [],
            images: moduleSpec.images || []
        };
    }

    /**
     * Calculate module volume
     * @param {Object} module - Normalized module specification
     * @returns {number} Volume in cubic centimeters
     * @private
     */
    _calculateVolume(module) {
        return (
            module.width * this._standards.hpUnit * 
            module.height / 10 * 
            module.depth / 10
        );
    }

    /**
     * Generate 3D representation of the module
     * @param {Object} moduleSpec - Module specification
     * @returns {THREE.Group} 3D module representation
     */
    create3DModel(moduleSpec) {
        try {
            // Validate module first
            const module = this.createModule(moduleSpec);
            if (!module) {
                throw new Error('Invalid module specification');
            }

            // Create module group
            const moduleGroup = new THREE.Group();

            // Panel
            const panelGeometry = new THREE.BoxGeometry(
                module.width * this._standards.hpUnit, 
                module.height, 
                2
            );
            const panelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            moduleGroup.add(panel);

            // Add controls
            module.controls.forEach(control => {
                this._addControlTo3DModel(moduleGroup, control, module);
            });

            return moduleGroup;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: '3D Module Model Generation', 
                moduleSpec: moduleSpec 
            });
            return null;
        }
    }

    /**
     * Add a control to the 3D module model
     * @param {THREE.Group} moduleGroup - Module group to add control to
     * @param {Object} control - Control specification
     * @param {Object} module - Module specification
     * @private
     */
    _addControlTo3DModel(moduleGroup, control, module) {
        const width = module.width * this._standards.hpUnit;
        const height = module.height;

        // Convert percentage position to 3D coordinates
        const x = (control.x / 100 * width) - (width / 2);
        const y = (height / 2) - (control.y / 100 * height);
        const z = module.depth / 2 + 1;

        let geometry, material, mesh;

        switch (control.type) {
            case 'knob':
                geometry = new THREE.CylinderGeometry(4, 4, 6, 16);
                material = new THREE.MeshLambertMaterial({ color: 0x666666 });
                break;
            case 'jack':
                geometry = new THREE.CylinderGeometry(3, 3, 8, 16);
                material = new THREE.MeshLambertMaterial({ color: 0x000000 });
                break;
            case 'switch':
                geometry = new THREE.BoxGeometry(6, 12, 4);
                material = new THREE.MeshLambertMaterial({ color: 0x444444 });
                break;
            default:
                return;
        }

        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        moduleGroup.add(mesh);
    }

    /**
     * Export module specifications
     * @param {Object} moduleSpec - Module specification
     * @param {string} format - Export format (json, csv)
     * @returns {string} Exported module data
     */
    exportModule(moduleSpec, format = 'json') {
        const module = this.createModule(moduleSpec);
        if (!module) {
            throw new Error('Cannot export invalid module');
        }

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(module, null, 2);
            case 'csv':
                return this._exportToCSV(module);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Convert module to CSV format
     * @param {Object} module - Normalized module specification
     * @returns {string} CSV representation
     * @private
     */
    _exportToCSV(module) {
        const rows = [
            ['Property', 'Value'],
            ['Name', module.name],
            ['Width (HP)', module.width],
            ['Width (mm)', module.hpWidth],
            ['Height (mm)', module.height],
            ['Depth (mm)', module.depth],
            ['Volume (cm³)', module.volumeCm3],
            ['+12V Power Draw (mA)', module.powerDraw['+12V']],
            ['-12V Power Draw (mA)', module.powerDraw['-12V']],
            ['+5V Power Draw (mA)', module.powerDraw['+5V']]
        ];

        return rows.map(row => row.join(',')).join('\n');
    }
}

// Singleton export
export default new ModuleDesignService();