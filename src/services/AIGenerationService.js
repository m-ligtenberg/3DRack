import ErrorService from './ErrorService.js';
import ConfigService from './ConfigService.js';
import FileUploadService from './FileUploadService.js';
import ModuleDesignService from './ModuleDesignService.js';

class AIGenerationService {
    constructor() {
        // AI service configurations
        this._aiServices = [
            {
                name: 'Meshy',
                endpoint: 'https://api.meshy.ai/v1/generation',
                apiKey: null,
                supportedInputTypes: ['image', '3d_sketch']
            },
            {
                name: 'TripoSR',
                endpoint: 'https://api.triposr.ai/generate',
                apiKey: null,
                supportedInputTypes: ['image']
            },
            {
                name: 'Sloyd',
                endpoint: 'https://api.sloyd.ai/generate',
                apiKey: null,
                supportedInputTypes: ['image', 'dimensions']
            }
        ];

        // Generation quality presets
        this._qualityPresets = {
            draft: {
                resolution: 256,
                detailLevel: 'low',
                optimizationLevel: 'fast'
            },
            standard: {
                resolution: 512,
                detailLevel: 'medium',
                optimizationLevel: 'balanced'
            },
            high: {
                resolution: 1024,
                detailLevel: 'high',
                optimizationLevel: 'detailed'
            }
        };

        // Model validation schema
        this._modelSchema = {
            inputType: {
                required: true,
                validator: this._validateInputType.bind(this)
            },
            dimensions: {
                width: { type: 'number', min: 10, max: 500 },
                height: { type: 'number', min: 10, max: 500 },
                depth: { type: 'number', min: 10, max: 500 }
            },
            images: {
                required: true,
                type: 'array',
                minLength: 1,
                maxLength: 5
            },
            qualityPreset: {
                required: false,
                type: 'string',
                allowedValues: ['draft', 'standard', 'high']
            }
        };
    }

    /**
     * Generate 3D model using AI services
     * @param {Object} generationSpec - Model generation specification
     * @returns {Promise<Object>} Generated 3D model
     */
    async generateModel(generationSpec) {
        try {
            // Validate generation specification
            const validationResult = this._validateGenerationSpec(generationSpec);
            if (!validationResult.isValid) {
                throw new Error(`Invalid generation specification: ${validationResult.errors.join(', ')}`);
            }

            // Prepare generation request
            const preparedRequest = await this._prepareGenerationRequest(generationSpec);

            // Try multiple AI services with fallback
            const generatedModel = await this._tryAIServices(preparedRequest);

            // Post-process the generated model
            const processedModel = await this._postProcessModel(generatedModel);

            return processedModel;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'AI Model Generation', 
                inputSpec: generationSpec 
            });
            return null;
        }
    }

    /**
     * Validate generation specification
     * @param {Object} spec - Generation specification
     * @returns {Object} Validation result
     * @private
     */
    _validateGenerationSpec(spec) {
        const errors = [];

        // Check each field in the schema
        Object.keys(this._modelSchema).forEach(key => {
            const fieldSchema = this._modelSchema[key];
            const value = spec[key];

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

            // Allowed values validation
            if (fieldSchema.allowedValues && !fieldSchema.allowedValues.includes(value)) {
                errors.push(`${key} must be one of: ${fieldSchema.allowedValues.join(', ')}`);
            }

            // Array length validation
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
                errors.push(`${key} must have at least ${fieldSchema.minLength} items`);
            }

            if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
                errors.push(`${key} must have at most ${fieldSchema.maxLength} items`);
            }

            // Custom validators
            if (fieldSchema.validator && typeof fieldSchema.validator === 'function') {
                const customValidation = fieldSchema.validator(value);
                if (!customValidation.isValid) {
                    errors.push(...customValidation.errors);
                }
            }

            // Validate dimensions
            if (key === 'dimensions') {
                ['width', 'height', 'depth'].forEach(dim => {
                    const dimValue = value[dim];
                    const dimSchema = fieldSchema[dim];

                    if (dimValue === undefined) {
                        errors.push(`Dimension ${dim} is required`);
                        return;
                    }

                    if (dimSchema.min !== undefined && dimValue < dimSchema.min) {
                        errors.push(`${dim} must be at least ${dimSchema.min}`);
                    }

                    if (dimSchema.max !== undefined && dimValue > dimSchema.max) {
                        errors.push(`${dim} must be at most ${dimSchema.max}`);
                    }
                });
            }

            // Validate images
            if (key === 'images') {
                value.forEach((image, index) => {
                    // Validate each image using FileUploadService
                    try {
                        FileUploadService.processFile(image);
                    } catch (imageError) {
                        errors.push(`Invalid image at index ${index}: ${imageError.message}`);
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
     * Validate input type for AI generation
     * @param {string} inputType - Input type to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateInputType(inputType) {
        const supportedTypes = ['image', '3d_sketch', 'dimensions'];
        
        return {
            isValid: supportedTypes.includes(inputType),
            errors: supportedTypes.includes(inputType) 
                ? [] 
                : [`Invalid input type. Supported types: ${supportedTypes.join(', ')}`]
        };
    }

    /**
     * Prepare generation request
     * @param {Object} spec - Generation specification
     * @returns {Promise<Object>} Prepared generation request
     * @private
     */
    async _prepareGenerationRequest(spec) {
        // Preprocess images
        const processedImages = await Promise.all(
            spec.images.map(image => 
                FileUploadService.compressImage(image, {
                    maxWidth: 1024,
                    maxHeight: 1024,
                    quality: 0.8
                })
            )
        );

        // Get quality preset
        const qualityPreset = this._qualityPresets[spec.qualityPreset || 'standard'];

        return {
            inputType: spec.inputType,
            images: processedImages,
            dimensions: spec.dimensions,
            qualityPreset: qualityPreset
        };
    }

    /**
     * Try multiple AI services with fallback mechanism
     * @param {Object} request - Prepared generation request
     * @returns {Promise<Object>} Generated 3D model
     * @private
     */
    async _tryAIServices(request) {
        for (const service of this._aiServices) {
            try {
                // Check if service supports input type
                if (!service.supportedInputTypes.includes(request.inputType)) {
                    continue;
                }

                // Attempt generation
                const generatedModel = await this._generateWithService(service, request);
                
                if (generatedModel) {
                    return generatedModel;
                }
            } catch (error) {
                // Log service failure, continue to next service
                console.warn(`AI Service ${service.name} failed:`, error);
                continue;
            }
        }

        throw new Error('No AI service could generate the model');
    }

    /**
     * Generate model with a specific AI service
     * @param {Object} service - AI service configuration
     * @param {Object} request - Generation request
     * @returns {Promise<Object>} Generated model
     * @private
     */
    async _generateWithService(service, request) {
        // Simulate AI generation request
        return new Promise((resolve, reject) => {
            // In a real implementation, this would be an actual API call
            setTimeout(() => {
                // Mock generation with some validation
                if (!service.apiKey) {
                    reject(new Error(`No API key for ${service.name}`));
                    return;
                }

                // Simulate successful generation
                const generatedModel = {
                    id: `model_${Date.now()}`,
                    service: service.name,
                    inputType: request.inputType,
                    dimensions: request.dimensions,
                    qualityPreset: request.qualityPreset,
                    metadata: {
                        createdAt: Date.now(),
                        preprocessedImages: request.images.length
                    }
                };

                resolve(generatedModel);
            }, 2000 + Math.random() * 3000);  // Simulate variable generation time
        });
    }

    /**
     * Post-process generated model
     * @param {Object} generatedModel - Raw generated model
     * @returns {Promise<Object>} Processed model
     * @private
     */
    async _postProcessModel(generatedModel) {
        try {
            // Create 3D representation
            const threeModel = this._create3DModelRepresentation(generatedModel);

            // Optimize mesh
            const optimizedModel = await this._optimizeMesh(threeModel);

            // Add additional metadata
            optimizedModel.processingMetadata = {
                optimizationLevel: generatedModel.qualityPreset.optimizationLevel,
                processingTime: Date.now() - generatedModel.metadata.createdAt
            };

            return optimizedModel;
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Model Post-Processing', 
                model: generatedModel 
            });
            return null;
        }
    }

    /**
     * Create 3D model representation
     * @param {Object} generatedModel - Generated model details
     * @returns {THREE.Group} 3D model representation
     * @private
     */
    _create3DModelRepresentation(generatedModel) {
        const moduleSpec = {
            name: `AI Generated Module (${generatedModel.service})`,
            width: Math.round(generatedModel.dimensions.width / 5.08),  // Convert mm to HP
            height: generatedModel.dimensions.height,
            depth: generatedModel.dimensions.depth
        };

        // Use ModuleDesignService to create 3D representation
        return ModuleDesignService.create3DModel(moduleSpec);
    }

    /**
     * Optimize generated mesh
     * @param {THREE.Group} model - 3D model to optimize
     * @returns {Promise<THREE.Group>} Optimized model
     * @private
     */
    async _optimizeMesh(model) {
        return new Promise((resolve) => {
            // Placeholder for mesh optimization
            // In a real implementation, this would use libraries like three-mesh-bvh
            
            // Simple optimization simulation
            const optimizationSteps = [
                'Reducing polygon count',
                'Smoothing surfaces',
                'Optimizing geometry',
                'Generating LOD (Level of Detail)'
            ];

            optimizationSteps.forEach((step, index) => {
                setTimeout(() => {
                    if (index === optimizationSteps.length - 1) {
                        resolve(model);
                    }
                }, 500 * (index + 1));
            });
        });
    }

    /**
     * Validate generated model against Eurorack standards
     * @param {Object} model - Generated model
     * @returns {Object} Validation results
     */
    validateEurorackCompliance(model) {
        const complianceChecks = {
            widthInHP: {
                passed: model.width >= 2 && model.width <= 42,
                message: 'Width must be between 2 and 42 HP'
            },
            height: {
                passed: model.height >= 100 && model.height <= 150,
                message: 'Height must be between 100mm and 150mm'
            },
            depth: {
                passed: model.depth >= 20 && model.depth <= 45,
                message: 'Depth must be between 20mm and 45mm'
            }
        };

        return {
            isCompliant: Object.values(complianceChecks).every(check => check.passed),
            checks: complianceChecks
        };
    }

    /**
     * Export generated model
     * @param {Object} model - Model to export
     * @param {string} format - Export format (stl, obj, glb)
     * @returns {Promise<string>} Exported model data
     */
    async exportModel(model, format = 'stl') {
        try {
            // Simulate model export
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // In a real implementation, this would use a proper 3D export library
                    const exportFormats = ['stl', 'obj', 'glb'];
                    
                    if (!exportFormats.includes(format)) {
                        reject(new Error(`Unsupported export format: ${format}`));
                        return;
                    }

                    // Mock export data
                    const mockExportData = `${format.toUpperCase()} model export data for ${model.name}`;
                    resolve(mockExportData);
                }, 1000);
            });
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'Model Export', 
                model: model, 
                format: format 
            });
            return null;
        }
    }
}

// Singleton export
export default new AIGenerationService();