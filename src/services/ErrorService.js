class ErrorService {
    constructor() {
        this.errorHandlers = [];
        this.errorLogger = console.error;
    }

    /**
     * Register a global error handler
     * @param {Function} handler - Error handling function
     */
    registerErrorHandler(handler) {
        this.errorHandlers.push(handler);
    }

    /**
     * Log and handle an error
     * @param {Error|string} error - The error to handle
     * @param {Object} context - Additional context for the error
     */
    handleError(error, context = {}) {
        const errorObj = error instanceof Error 
            ? error 
            : new Error(error);

        // Log the error
        this.errorLogger(`[EuroRack Error] ${errorObj.message}`, {
            ...context,
            timestamp: new Date().toISOString(),
            stack: errorObj.stack
        });

        // Notify registered handlers
        this.errorHandlers.forEach(handler => {
            try {
                handler(errorObj, context);
            } catch (handlerError) {
                console.error('Error in error handler:', handlerError);
            }
        });

        // Provide user-friendly error feedback
        this.displayUserFriendlyError(errorObj);
    }

    /**
     * Display a user-friendly error message
     * @param {Error} error - The error to display
     */
    displayUserFriendlyError(error) {
        const errorMap = {
            'NetworkError': 'Unable to connect to server. Please check your internet connection.',
            'ValidationError': 'Invalid input. Please check your module specifications.',
            'AIGenerationError': 'Model generation failed. Please try again or adjust your parameters.',
            'FileUploadError': 'File upload failed. Please check the file and try again.'
        };

        const userMessage = errorMap[error.name] || 'An unexpected error occurred. Please try again.';
        
        // Create a toast or modal notification
        const errorContainer = document.getElementById('error-notification');
        if (errorContainer) {
            errorContainer.textContent = userMessage;
            errorContainer.classList.add('show');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorContainer.classList.remove('show');
            }, 5000);
        }
    }

    /**
     * Validate input against a schema
     * @param {*} input - The input to validate
     * @param {Object} schema - Validation schema
     * @returns {boolean} - Whether the input is valid
     */
    validateInput(input, schema) {
        try {
            // Basic validation logic - can be expanded
            Object.keys(schema).forEach(key => {
                if (schema[key].required && !input[key]) {
                    throw new Error(`Missing required field: ${key}`);
                }
                
                if (schema[key].type && typeof input[key] !== schema[key].type) {
                    throw new Error(`Invalid type for ${key}: expected ${schema[key].type}`);
                }
                
                if (schema[key].min !== undefined && input[key] < schema[key].min) {
                    throw new Error(`${key} must be at least ${schema[key].min}`);
                }
                
                if (schema[key].max !== undefined && input[key] > schema[key].max) {
                    throw new Error(`${key} must be at most ${schema[key].max}`);
                }
            });
            
            return true;
        } catch (error) {
            this.handleError(error, { input, schema });
            return false;
        }
    }
}

// Singleton export
export default new ErrorService();