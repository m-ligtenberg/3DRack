import ErrorService from './ErrorService.js';
import ConfigService from './ConfigService.js';

class FileUploadService {
    constructor() {
        // File type configurations
        this._allowedImageTypes = [
            'image/png', 
            'image/jpeg', 
            'image/webp', 
            'image/gif'
        ];

        this._allowedModelTypes = [
            'model/stl',
            'model/obj',
            'model/gltf-binary',
            'model/gltf+json'
        ];

        // Maximum file sizes
        this._maxImageSize = 10 * 1024 * 1024;  // 10MB
        this._maxModelSize = 50 * 1024 * 1024;  // 50MB
    }

    /**
     * Handle file upload
     * @param {File} file - File to upload
     * @returns {Promise<Object>} Processed file information
     */
    async processFile(file) {
        try {
            // Validate file
            this._validateFile(file);

            // Determine file type
            const fileType = this._determineFileType(file);

            // Process based on file type
            switch (fileType.category) {
                case 'image':
                    return await this._processImage(file);
                case 'model':
                    return await this._processModel(file);
                default:
                    throw new Error('Unsupported file type');
            }
        } catch (error) {
            ErrorService.handleError(error, { 
                context: 'File Upload', 
                fileName: file.name, 
                fileType: file.type 
            });
            return null;
        }
    }

    /**
     * Validate file against upload constraints
     * @param {File} file - File to validate
     * @private
     */
    _validateFile(file) {
        // Check file existence
        if (!file) {
            throw new Error('No file provided');
        }

        // Check file size
        const maxSize = this._determineMaxSize(file.type);
        if (file.size > maxSize) {
            throw new Error(`File exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
        }

        // Check file type
        const allowedTypes = this._determineAllowedTypes(file.type);
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Unsupported file type');
        }
    }

    /**
     * Determine maximum file size based on type
     * @param {string} fileType - MIME type of the file
     * @returns {number} Maximum file size in bytes
     * @private
     */
    _determineMaxSize(fileType) {
        if (this._allowedImageTypes.includes(fileType)) {
            return this._maxImageSize;
        }
        if (this._allowedModelTypes.includes(fileType)) {
            return this._maxModelSize;
        }
        return 5 * 1024 * 1024;  // Default 5MB
    }

    /**
     * Determine allowed file types
     * @param {string} fileType - MIME type of the file
     * @returns {string[]} Allowed file types
     * @private
     */
    _determineAllowedTypes(fileType) {
        if (fileType.startsWith('image/')) {
            return this._allowedImageTypes;
        }
        if (fileType.startsWith('model/')) {
            return this._allowedModelTypes;
        }
        return [];
    }

    /**
     * Determine file type category
     * @param {File} file - File to categorize
     * @returns {Object} File type information
     * @private
     */
    _determineFileType(file) {
        if (this._allowedImageTypes.includes(file.type)) {
            return { 
                category: 'image', 
                type: file.type 
            };
        }
        if (this._allowedModelTypes.includes(file.type)) {
            return { 
                category: 'model', 
                type: file.type 
            };
        }
        return { category: 'unknown', type: file.type };
    }

    /**
     * Process image file
     * @param {File} file - Image file to process
     * @returns {Promise<Object>} Processed image data
     * @private
     */
    async _processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                // Create image element to check dimensions
                const img = new Image();
                img.onload = () => {
                    const processedImage = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: event.target.result,
                        width: img.width,
                        height: img.height
                    };
                    
                    // Optional: Image preprocessing 
                    this._preprocessImage(processedImage);
                    
                    resolve(processedImage);
                };
                
                img.onerror = () => {
                    reject(new Error('Invalid image file'));
                };
                
                img.src = event.target.result;
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Preprocess image (optional transformations)
     * @param {Object} image - Processed image object
     * @private
     */
    _preprocessImage(image) {
        // Optional image preprocessing
        // Could include:
        // - Resize large images
        // - Convert to specific format
        // - Basic color/contrast adjustments
        
        // Example: Limit image dimensions
        const maxDimension = 2048;
        if (image.width > maxDimension || image.height > maxDimension) {
            const scale = Math.min(
                maxDimension / image.width, 
                maxDimension / image.height
            );
            
            image.preprocessed = {
                originalWidth: image.width,
                originalHeight: image.height,
                scaleFactor: scale
            };
        }
    }

    /**
     * Process 3D model file
     * @param {File} file - Model file to process
     * @returns {Promise<Object>} Processed model data
     * @private
     */
    async _processModel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const processedModel = {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: event.target.result
                };
                
                resolve(processedModel);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Upload file to server (optional)
     * @param {Object} processedFile - Processed file object
     * @returns {Promise<string>} Upload URL or identifier
     */
    async uploadToServer(processedFile) {
        // Placeholder for actual file upload logic
        // In a real application, this would use fetch or axios to upload to a server
        return new Promise((resolve, reject) => {
            try {
                // Simulate upload
                setTimeout(() => {
                    resolve(`https://example.com/uploads/${processedFile.id}`);
                }, 1000);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Compress image file
     * @param {Object} image - Processed image object
     * @param {Object} options - Compression options
     * @returns {Promise<Object>} Compressed image
     */
    async compressImage(image, options = {}) {
        const defaultOptions = {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.7
        };

        const compressionOptions = { ...defaultOptions, ...options };

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if needed
                if (width > compressionOptions.maxWidth) {
                    height *= compressionOptions.maxWidth / width;
                    width = compressionOptions.maxWidth;
                }

                if (height > compressionOptions.maxHeight) {
                    width *= compressionOptions.maxHeight / height;
                    height = compressionOptions.maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            ...image,
                            data: reader.result,
                            size: blob.size,
                            compressed: true
                        });
                    };
                    reader.readAsDataURL(blob);
                }, image.type, compressionOptions.quality);
            };

            img.onerror = () => reject(new Error('Image compression failed'));
            img.src = image.data;
        });
    }
}

// Singleton export
export default new FileUploadService();