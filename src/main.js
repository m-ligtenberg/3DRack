import AppController from './core/AppController.js';

// Application entry point
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize application
        window.AppController = AppController;

        // Expose services globally for debugging (optional)
        window.Services = {
            ErrorService: AppController._services.error,
            ConfigService: AppController._services.config,
            ThreeJsService: AppController._services.threeJs,
            ModuleDesignService: AppController._services.moduleDesign,
            FileUploadService: AppController._services.fileUpload,
            AIGenerationService: AppController._services.aiGeneration,
            ProjectManagementService: AppController._services.projectManagement
        };

        console.log('EuroRack 3D Modeler initialized');
    } catch (error) {
        console.error('Application initialization failed:', error);
    }
});