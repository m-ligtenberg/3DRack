import ErrorService from '../services/ErrorService.js';
import ConfigService from '../services/ConfigService.js';
import ThreeJsService from '../services/ThreeJsService.js';
import ModuleDesignService from '../services/ModuleDesignService.js';
import FileUploadService from '../services/FileUploadService.js';
import AIGenerationService from '../services/AIGenerationService.js';
import ProjectManagementService from '../services/ProjectManagementService.js';

class AppController {
    constructor() {
        // Service references
        this._services = {
            error: ErrorService,
            config: ConfigService,
            threeJs: ThreeJsService,
            moduleDesign: ModuleDesignService,
            fileUpload: FileUploadService,
            aiGeneration: AIGenerationService,
            projectManagement: ProjectManagementService
        };

        // Application state
        this._state = {
            currentProject: null,
            currentModule: null,
            uiMode: 'design',
            theme: 'dark'
        };

        // Event listeners
        this._eventListeners = new Map();

        // Initialize application
        this._initialize();
    }

    /**
     * Initialize application
     * @private
     */
    _initialize() {
        try {
            // Setup global error handling
            this._setupErrorHandling();

            // Load configuration
            this._loadConfiguration();

            // Setup UI
            this._setupUI();

            // Initialize services
            this._initializeServices();

            // Trigger initial render
            this._render();
        } catch (error) {
            this._services.error.handleError(error, { 
                context: 'Application Initialization' 
            });
        }
    }

    /**
     * Setup global error handling
     * @private
     */
    _setupErrorHandling() {
        // Register global error handler
        this._services.error.registerErrorHandler((error, context) => {
            // Log to console
            console.error('Global Error Handler:', error, context);

            // Display user-friendly notification
            this._displayErrorNotification(error.message);
        });

        // Setup global error event listeners
        window.addEventListener('error', (event) => {
            this._services.error.handleError(new Error(event.message), {
                context: 'Unhandled Error',
                filename: event.filename,
                lineno: event.lineno
            });
        });
    }

    /**
     * Load application configuration
     * @private
     */
    _loadConfiguration() {
        try {
            // Load user configuration if exists
            const userConfig = this._loadUserConfig();
            
            if (userConfig) {
                this._services.config.loadUserConfig(userConfig);
            }

            // Set initial theme
            this._state.theme = this._services.config.get('ui.theme', 'dark');
            this._applyTheme(this._state.theme);
        } catch (error) {
            this._services.error.handleError(error, { 
                context: 'Configuration Loading' 
            });
        }
    }

    /**
     * Load user configuration from local storage
     * @returns {Object|null} User configuration
     * @private
     */
    _loadUserConfig() {
        try {
            const storedConfig = localStorage.getItem('eurorack_user_config');
            return storedConfig ? JSON.parse(storedConfig) : null;
        } catch (error) {
            this._services.error.handleError(error, { 
                context: 'User Configuration Load' 
            });
            return null;
        }
    }

    /**
     * Setup UI and event listeners
     * @private
     */
    _setupUI() {
        // Theme toggle
        this._bindThemeToggle();

        // Navigation and mode switching
        this._setupNavigation();

        // File upload handling
        this._setupFileUpload();

        // 3D viewer setup
        this._setup3DViewer();
    }

    /**
     * Bind theme toggle functionality
     * @private
     */
    _bindThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this._state.theme = this._state.theme === 'dark' ? 'light' : 'dark';
                this._applyTheme(this._state.theme);
                
                // Save to config
                this._services.config.set('ui.theme', this._state.theme);
            });
        }
    }

    /**
     * Apply theme to application
     * @param {string} theme - Theme to apply
     * @private
     */
    _applyTheme(theme) {
        document.documentElement.setAttribute('data-color-scheme', theme);
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Setup navigation and mode switching
     * @private
     */
    _setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this._switchMode(mode);
            });
        });
    }

    /**
     * Switch application mode
     * @param {string} mode - Application mode
     * @private
     */
    _switchMode(mode) {
        this._state.uiMode = mode;
        
        // Update UI based on mode
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${mode}Section`);
        if (activeSection) {
            activeSection.classList.add('active');
        }
    }

    /**
     * Setup file upload handling
     * @private
     */
    _setupFileUpload() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                
                try {
                    const processedFiles = await Promise.all(
                        files.map(file => this._services.fileUpload.processFile(file))
                    );
                    
                    // Handle processed files based on current mode
                    switch (this._state.uiMode) {
                        case 'design':
                            this._handleDesignModeUpload(processedFiles);
                            break;
                        case 'project':
                            this._handleProjectModeUpload(processedFiles);
                            break;
                        case 'ai-generation':
                            this._handleAIGenerationUpload(processedFiles);
                            break;
                    }
                } catch (error) {
                    this._services.error.handleError(error, { 
                        context: 'File Upload', 
                        mode: this._state.uiMode 
                    });
                }
            });
        }
    }

    /**
     * Handle file upload in design mode
     * @param {Array} processedFiles - Processed files
     * @private
     */
    _handleDesignModeUpload(processedFiles) {
        const images = processedFiles.filter(file => 
            file && file.type.startsWith('image/')
        );
        
        if (images.length > 0) {
            // Update current module with uploaded images
            this._updateCurrentModuleImages(images);
            
            // Update UI
            this._updateImageGallery(images);
        }
    }

    /**
     * Handle file upload in project mode
     * @param {Array} processedFiles - Processed files
     * @private
     */
    _handleProjectModeUpload(processedFiles) {
        const projectFiles = processedFiles.filter(file => 
            file && (file.type === 'application/json' || file.name.endsWith('.prj'))
        );
        
        if (projectFiles.length > 0) {
            // Import project
            projectFiles.forEach(async (file) => {
                const importedProject = await this._services.projectManagement.importProject(file);
                
                if (importedProject) {
                    this._loadProject(importedProject);
                }
            });
        }
    }

    /**
     * Handle file upload in AI generation mode
     * @param {Array} processedFiles - Processed files
     * @private
     */
    _handleAIGenerationUpload(processedFiles) {
        const images = processedFiles.filter(file => 
            file && file.type.startsWith('image/')
        );
        
        if (images.length > 0) {
            // Prepare AI generation
            this._prepareAIGeneration(images);
        }
    }

    /**
     * Setup 3D viewer
     * @private
     */
    _setup3DViewer() {
        const viewerContainer = document.getElementById('threeContainer');
        if (viewerContainer) {
            // Initialize Three.js scene
            this._services.threeJs.initScene(viewerContainer);
        }
    }

    /**
     * Initialize services
     * @private
     */
    _initializeServices() {
        // Additional service initialization if needed
        // For example, checking API keys, loading default configurations
    }

    /**
     * Render application state
     * @private
     */
    _render() {
        // Update UI based on current state
        this._updateUIState();
    }

    /**
     * Update UI state
     * @private
     */
    _updateUIState() {
        // Update project details
        if (this._state.currentProject) {
            this._updateProjectDetails(this._state.currentProject);
        }

        // Update module details
        if (this._state.currentModule) {
            this._updateModuleDetails(this._state.currentModule);
        }
    }

    /**
     * Update project details in UI
     * @param {Object} project - Current project
     * @private
     */
    _updateProjectDetails(project) {
        const projectNameEl = document.getElementById('projectName');
        const projectDescriptionEl = document.getElementById('projectDescription');
        
        if (projectNameEl) projectNameEl.textContent = project.name;
        if (projectDescriptionEl) projectDescriptionEl.textContent = project.description;
    }

    /**
     * Update module details in UI
     * @param {Object} module - Current module
     * @private
     */
    _updateModuleDetails(module) {
        const moduleNameInput = document.getElementById('moduleName');
        const moduleWidthInput = document.getElementById('moduleWidth');
        const moduleHeightInput = document.getElementById('moduleHeight');
        const moduleDepthInput = document.getElementById('moduleDepth');
        
        if (moduleNameInput) moduleNameInput.value = module.name;
        if (moduleWidthInput) moduleWidthInput.value = module.width;
        if (moduleHeightInput) moduleHeightInput.value = module.height;
        if (moduleDepthInput) moduleDepthInput.value = module.depth;
    }

    /**
     * Update current module images
     * @param {Array} images - Uploaded images
     * @private
     */
    _updateCurrentModuleImages(images) {
        if (!this._state.currentModule) {
            this._state.currentModule = this._services.moduleDesign.createModule({
                name: 'New Module',
                width: 4,
                height: 128.5,
                depth: 25
            });
        }

        // Add images to current module
        this._state.currentModule.images = [
            ...(this._state.currentModule.images || []),
            ...images
        ];
    }

    /**
     * Update image gallery
     * @param {Array} images - Images to display
     * @private
     */
    _updateImageGallery(images) {
        const gallery = document.getElementById('imageGallery');
        if (!gallery) return;

        images.forEach(image => {
            const imageEl = document.createElement('div');
            imageEl.className = 'image-thumbnail';
            imageEl.innerHTML = `
                <img src="${image.data}" alt="${image.name}">
                <button class="image-remove">×</button>
            `;

            const removeBtn = imageEl.querySelector('.image-remove');
            removeBtn.addEventListener('click', () => {
                // Remove image from current module and gallery
                this._state.currentModule.images = 
                    this._state.currentModule.images.filter(img => img.id !== image.id);
                imageEl.remove();
            });

            gallery.appendChild(imageEl);
        });
    }

    /**
     * Prepare AI generation
     * @param {Array} images - Images for AI generation
     * @private
     */
    _prepareAIGeneration(images) {
        // Show AI generation modal
        const aiGenerationModal = document.getElementById('aiGenerationModal');
        if (aiGenerationModal) {
            aiGenerationModal.classList.remove('hidden');
        }

        // Populate image preview
        const imagePreview = document.getElementById('aiImagePreview');
        if (imagePreview) {
            imagePreview.innerHTML = '';
            images.forEach(image => {
                const img = document.createElement('img');
                img.src = image.data;
                img.alt = image.name;
                imagePreview.appendChild(img);
            });
        }

        // Setup AI generation button
        const generateBtn = document.getElementById('startAIGeneration');
        if (generateBtn) {
            generateBtn.onclick = async () => {
                try {
                    // Get module dimensions
                    const widthInput = document.getElementById('aiModelWidth');
                    const heightInput = document.getElementById('aiModelHeight');
                    const depthInput = document.getElementById('aiModelDepth');

                    const generationSpec = {
                        inputType: 'image',
                        images: images,
                        dimensions: {
                            width: parseFloat(widthInput.value),
                            height: parseFloat(heightInput.value),
                            depth: parseFloat(depthInput.value)
                        },
                        qualityPreset: 'standard'
                    };

                    // Generate model
                    const generatedModel = await this._services.aiGeneration.generateModel(generationSpec);

                    if (generatedModel) {
                        // Add to current project or create new project
                        this._handleGeneratedModel(generatedModel);
                    }
                } catch (error) {
                    this._services.error.handleError(error, { 
                        context: 'AI Model Generation' 
                    });
                }
            };
        }
    }

    /**
     * Handle generated AI model
     * @param {Object} generatedModel - Generated model
     * @private
     */
    _handleGeneratedModel(generatedModel) {
        // Create or update current project
        if (!this._state.currentProject) {
            this._state.currentProject = this._services.projectManagement.createProject({
                name: `AI Generated Project`,
                description: 'Created from AI-generated module',
                modules: [],
                rack: {
                    width: 104,
                    powerSupply: {
                        '+12V': 0,
                        '-12V': 0,
                        '+5V': 0
                    }
                }
            });
        }

        // Create module from generated model
        const module = this._services.moduleDesign.createModule({
            name: generatedModel.service + ' Module',
            width: generatedModel.dimensions.width / 5.08,
            height: generatedModel.dimensions.height,
            depth: generatedModel.dimensions.depth
        });

        // Add module to project
        this._state.currentProject.modules.push(module);

        // Update project in storage
        this._services.projectManagement.updateProject(
            this._state.currentProject.id, 
            this._state.currentProject
        );

        // Render 3D model
        const threeModel = this._services.moduleDesign.create3DModel(module);
        if (threeModel) {
            // Clear previous models
            this._services.threeJs.removeFromScene(this._state.currentModel);
            
            // Add new model
            this._services.threeJs.addToScene(threeModel);
            this._services.threeJs.resetCamera(threeModel);
            
            // Store current model
            this._state.currentModel = threeModel;
        }

        // Close AI generation modal
        const aiGenerationModal = document.getElementById('aiGenerationModal');
        if (aiGenerationModal) {
            aiGenerationModal.classList.add('hidden');
        }
    }

    /**
     * Load a project
     * @param {Object} project - Project to load
     * @private
     */
    _loadProject(project) {
        // Set current project
        this._state.currentProject = project;

        // Render first module in 3D viewer
        if (project.modules && project.modules.length > 0) {
            const firstModule = project.modules[0];
            const threeModel = this._services.moduleDesign.create3DModel(firstModule);
            
            if (threeModel) {
                // Clear previous models
                this._services.threeJs.removeFromScene(this._state.currentModel);
                
                // Add new model
                this._services.threeJs.addToScene(threeModel);
                this._services.threeJs.resetCamera(threeModel);
                
                // Store current model
                this._state.currentModel = threeModel;
            }
        }

        // Update UI
        this._render();
    }

    /**
     * Display error notification
     * @param {string} message - Error message
     * @private
     */
    _displayErrorNotification(message) {
        const notificationContainer = document.getElementById('errorNotification');
        if (notificationContainer) {
            notificationContainer.textContent = message;
            notificationContainer.classList.add('show');

            // Auto-hide after 5 seconds
            setTimeout(() => {
                notificationContainer.classList.remove('show');
            }, 5000);
        }
    }

    /**
     * Add event listener
     * @param {string} eventName - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(eventName, callback) {
        if (!this._eventListeners.has(eventName)) {
            this._eventListeners.set(eventName, []);
        }
        this._eventListeners.get(eventName).push(callback);
    }

    /**
     * Trigger an event
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     * @private
     */
    _triggerEvent(eventName, data) {
        const listeners = this._eventListeners.get(eventName) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                this._services.error.handleError(error, { 
                    context: `Event ${eventName} Listener` 
                });
            }
        });
    }
}

// Singleton export
export default new AppController();