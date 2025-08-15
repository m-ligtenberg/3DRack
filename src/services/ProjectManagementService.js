import ErrorService from './ErrorService.js';
import ConfigService from './ConfigService.js';
import ModuleDesignService from './ModuleDesignService.js';
import FileUploadService from './FileUploadService.js';

class ProjectManagementService {
    constructor() {
        // Project storage key
        this._storageKey = 'eurorack_projects_v1';
        
        // Project schema for validation
        this._projectSchema = {
            name: { 
                required: true, 
                type: 'string', 
                minLength: 1, 
                maxLength: 100 
            },
            description: {
                required: false,
                type: 'string',
                maxLength: 500
            },
            modules: {
                required: true,
                type: 'array',
                minLength: 1
            },
            rack: {
                width: { 
                    required: true, 
                    type: 'number', 
                    min: 84,  // Minimum 84HP 
                    max: 168  // Maximum 168HP
                },
                powerSupply: {
                    required: true,
                    validator: this._validatePowerSupply.bind(this)
                }
            },
            metadata: {
                createdAt: { type: 'number' },
                updatedAt: { type: 'number' },
                version: { type: 'number', default: 1 }
            }
        };

        // Local cache for projects
        this._projectCache = new Map();
    }

    /**
     * Create a new project
     * @param {Object} projectSpec - Project specification
     * @returns {Object} Created project
     */
    createProject(projectSpec) {
        try {
            // Validate project specification
            const validationResult = this._validateProjectSpec(projectSpec);
            
            if (!validationResult.isValid) {
                throw new Error(`Invalid project specification: ${validationResult.errors.join(', ')}`);
            }

            // Normalize project specification
            const project = this._normalizeProjectSpec(projectSpec);

            // Generate unique project ID
            project.id = this._generateProjectId();

            // Save project
            this._saveProject(project);

            return project;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Creation', 
                inputSpec: projectSpec 
            });
            return null;
        }
    }

    /**
     * Generate a unique project ID
     * @returns {string} Unique project identifier
     * @private
     */
    _generateProjectId() {
        return `prj_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
    }

    /**
     * Validate project specification
     * @param {Object} projectSpec - Project specification to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateProjectSpec(projectSpec) {
        const errors = [];

        // Check each field in the schema
        Object.keys(this._projectSchema).forEach(key => {
            const fieldSchema = this._projectSchema[key];
            const value = projectSpec[key];

            // Check required fields
            if (fieldSchema.required && (value === undefined || value === null)) {
                errors.push(`${key} is required`);
                return;
            }

            // Skip optional fields if not provided
            if (value === undefined) return;

            // Type checking
            if (fieldSchema.type && typeof value !== fieldSchema.type) {
                errors.push(`${key} must be of type ${fieldSchema.type}`);
                return;
            }

            // String length validation
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
                errors.push(`${key} must be at least ${fieldSchema.minLength} characters`);
            }

            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
                errors.push(`${key} must be at most ${fieldSchema.maxLength} characters`);
            }

            // Number range validation
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

            // Validate modules
            if (key === 'modules') {
                value.forEach((module, index) => {
                    const moduleValidation = ModuleDesignService.createModule(module);
                    if (!moduleValidation) {
                        errors.push(`Invalid module at index ${index}`);
                    }
                });
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate power supply specifications
     * @param {Object} powerSupply - Power supply specification
     * @returns {Object} Validation result
     * @private
     */
    _validatePowerSupply(powerSupply) {
        const errors = [];
        const requiredRails = ['+12V', '-12V', '+5V'];
        const maxCurrentPerRail = 2000;  // 2A per rail

        requiredRails.forEach(rail => {
            if (!powerSupply[rail]) {
                errors.push(`Missing power supply specification for ${rail}`);
                return;
            }

            const current = powerSupply[rail];
            
            if (typeof current !== 'number') {
                errors.push(`Power supply current for ${rail} must be a number`);
                return;
            }

            if (current < 0) {
                errors.push(`Power supply current for ${rail} cannot be negative`);
            }

            if (current > maxCurrentPerRail) {
                errors.push(`Power supply current for ${rail} cannot exceed ${maxCurrentPerRail}mA`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Normalize project specification
     * @param {Object} projectSpec - Raw project specification
     * @returns {Object} Normalized project specification
     * @private
     */
    _normalizeProjectSpec(projectSpec) {
        const now = Date.now();
        
        return {
            name: projectSpec.name.trim(),
            description: projectSpec.description ? projectSpec.description.trim() : '',
            modules: projectSpec.modules.map(module => 
                ModuleDesignService.createModule(module)
            ),
            rack: {
                width: Math.round(projectSpec.rack.width),
                powerSupply: {
                    '+12V': projectSpec.rack.powerSupply['+12V'],
                    '-12V': projectSpec.rack.powerSupply['-12V'],
                    '+5V': projectSpec.rack.powerSupply['+5V']
                }
            },
            metadata: {
                createdAt: now,
                updatedAt: now,
                version: 1
            }
        };
    }

    /**
     * Save project to storage
     * @param {Object} project - Project to save
     * @private
     */
    _saveProject(project) {
        try {
            // Retrieve existing projects
            const projects = this._getProjects();
            
            // Add or update project
            const existingIndex = projects.findIndex(p => p.id === project.id);
            if (existingIndex !== -1) {
                projects[existingIndex] = project;
            } else {
                projects.push(project);
            }

            // Save to local storage
            localStorage.setItem(this._storageKey, JSON.stringify(projects));
            
            // Update cache
            this._projectCache.set(project.id, project);
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Saving', 
                project: project 
            });
        }
    }

    /**
     * Retrieve all projects
     * @returns {Array} List of projects
     */
    getProjects() {
        try {
            // Retrieve from local storage
            const projects = this._getProjects();
            
            // Sort by most recently updated
            return projects.sort((a, b) => 
                b.metadata.updatedAt - a.metadata.updatedAt
            );
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Retrieval' 
            });
            return [];
        }
    }

    /**
     * Get a specific project by ID
     * @param {string} projectId - Project identifier
     * @returns {Object|null} Project details
     */
    getProjectById(projectId) {
        try {
            // Check cache first
            if (this._projectCache.has(projectId)) {
                return this._projectCache.get(projectId);
            }

            // Retrieve from storage
            const projects = this._getProjects();
            const project = projects.find(p => p.id === projectId);
            
            if (project) {
                // Cache the project
                this._projectCache.set(projectId, project);
                return project;
            }

            return null;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Retrieval', 
                projectId: projectId 
            });
            return null;
        }
    }

    /**
     * Update an existing project
     * @param {string} projectId - Project identifier
     * @param {Object} updates - Project updates
     * @returns {Object|null} Updated project
     */
    updateProject(projectId, updates) {
        try {
            // Retrieve existing project
            const project = this.getProjectById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            // Merge updates
            const updatedProject = {
                ...project,
                ...updates,
                metadata: {
                    ...project.metadata,
                    updatedAt: Date.now(),
                    version: (project.metadata.version || 0) + 1
                }
            };

            // Validate updated project
            const validationResult = this._validateProjectSpec(updatedProject);
            if (!validationResult.isValid) {
                throw new Error(`Invalid project updates: ${validationResult.errors.join(', ')}`);
            }

            // Save updated project
            this._saveProject(updatedProject);

            return updatedProject;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Update', 
                projectId: projectId, 
                updates: updates 
            });
            return null;
        }
    }

    /**
     * Delete a project
     * @param {string} projectId - Project identifier
     */
    deleteProject(projectId) {
        try {
            // Retrieve existing projects
            const projects = this._getProjects();
            
            // Remove project
            const filteredProjects = projects.filter(p => p.id !== projectId);
            
            // Save updated projects
            localStorage.setItem(this._storageKey, JSON.stringify(filteredProjects));
            
            // Remove from cache
            this._projectCache.delete(projectId);
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Deletion', 
                projectId: projectId 
            });
        }
    }

    /**
     * Export project to file
     * @param {string} projectId - Project identifier
     * @param {string} format - Export format (json, csv)
     * @returns {string} Exported project data
     */
    exportProject(projectId, format = 'json') {
        try {
            const project = this.getProjectById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify(project, null, 2);
                case 'csv':
                    return this._exportToCSV(project);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Export', 
                projectId: projectId, 
                format: format 
            });
            return null;
        }
    }

    /**
     * Convert project to CSV format
     * @param {Object} project - Project to export
     * @returns {string} CSV representation
     * @private
     */
    _exportToCSV(project) {
        const rows = [
            ['Project Name', project.name],
            ['Description', project.description],
            ['Created At', new Date(project.metadata.createdAt).toISOString()],
            ['Updated At', new Date(project.metadata.updatedAt).toISOString()],
            ['Rack Width', project.rack.width],
            ['Modules Count', project.modules.length]
        ];

        // Add power supply details
        Object.entries(project.rack.powerSupply).forEach(([rail, current]) => {
            rows.push([`Power Supply ${rail}`, current]);
        });

        // Add module details
        rows.push(['', '']);
        rows.push(['Modules:']);
        rows.push(['Name', 'Width (HP)', 'Height (mm)', 'Depth (mm)']);
        
        project.modules.forEach(module => {
            rows.push([
                module.name, 
                module.width, 
                module.height, 
                module.depth
            ]);
        });

        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Import project from file
     * @param {File} file - Project file to import
     * @returns {Object|null} Imported project
     */
    async importProject(file) {
        try {
            // Use FileUploadService to process the file
            const processedFile = await FileUploadService.processFile(file);
            
            if (!processedFile) {
                throw new Error('File processing failed');
            }

            // Parse project data
            let projectData;
            try {
                projectData = JSON.parse(
                    processedFile.type === 'application/json' 
                        ? processedFile.data 
                        : new TextDecoder().decode(processedFile.data)
                );
            } catch (parseError) {
                throw new Error('Invalid project file format');
            }

            // Validate and create project
            return this.createProject(projectData);
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Project Import', 
                fileName: file.name 
            });
            return null;
        }
    }

    /**
     * Retrieve projects from local storage
     * @returns {Array} List of projects
     * @private
     */
    _getProjects() {
        try {
            const storedProjects = localStorage.getItem(this._storageKey);
            return storedProjects ? JSON.parse(storedProjects) : [];
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Storage Retrieval' 
            });
            return [];
        }
    }

    /**
     * Calculate total power consumption for a project
     * @param {string} projectId - Project identifier
     * @returns {Object} Power consumption breakdown
     */
    calculatePowerConsumption(projectId) {
        try {
            const project = this.getProjectById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            const powerConsumption = {
                '+12V': 0,
                '-12V': 0,
                '+5V': 0,
                total: 0
            };

            // Sum power draw for each module
            project.modules.forEach(module => {
                if (module.powerDraw) {
                    Object.entries(module.powerDraw).forEach(([rail, draw]) => {
                        powerConsumption[rail] += draw;
                    });
                }
            });

            // Calculate total
            powerConsumption.total = 
                powerConsumption['+12V'] + 
                Math.abs(powerConsumption['-12V']) + 
                powerConsumption['+5V'];

            return powerConsumption;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Power Consumption Calculation', 
                projectId: projectId 
            });
            return null;
        }
    }

    /**
     * Validate rack space utilization
     * @param {string} projectId - Project identifier
     * @returns {Object} Rack utilization details
     */
    validateRackUtilization(projectId) {
        try {
            const project = this.getProjectById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            // Calculate total HP used
            const totalHP = project.modules.reduce((sum, module) => sum + module.width, 0);
            
            // Check against rack width
            const rackWidthHP = project.rack.width / 5.08;  // Convert mm to HP
            const utilizationPercentage = (totalHP / rackWidthHP) * 100;

            return {
                totalHP: totalHP,
                rackWidthHP: rackWidthHP,
                utilizationPercentage: Math.round(utilizationPercentage),
                isOverUtilized: utilizationPercentage > 100,
                remainingHP: Math.max(0, rackWidthHP - totalHP)
            };
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Rack Utilization Validation', 
                projectId: projectId 
            });
            return null;
        }
    }
}

// Singleton export
export default new ProjectManagementService();