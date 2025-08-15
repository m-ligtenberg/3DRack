import ErrorService from './ErrorService.js';
import ConfigService from './ConfigService.js';

class ThreeJsService {
    constructor() {
        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._orbitControls = null;
        this._animationFrameId = null;
    }

    /**
     * Initialize Three.js scene
     * @param {HTMLElement} container - Rendering container
     */
    initScene(container) {
        try {
            // Validate container
            if (!container) {
                throw new Error('Invalid rendering container');
            }

            // Scene
            this._scene = new THREE.Scene();
            this._scene.background = new THREE.Color(0x1a1a1a);
            
            // Camera
            const aspectRatio = container.clientWidth / container.clientHeight;
            this._camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
            this._camera.position.set(50, 50, 100);
            
            // Renderer with performance optimizations
            this._renderer = new THREE.WebGLRenderer({ 
                antialias: ConfigService.get('rendering.antialias', true),
                powerPreference: 'high-performance'
            });
            this._renderer.setSize(container.clientWidth, container.clientHeight);
            this._renderer.shadowMap.enabled = true;
            this._renderer.shadowMap.type = THREE[ConfigService.get('rendering.shadowMapType', 'PCFSoftShadowMap')];
            
            // Replace existing content
            container.innerHTML = '';
            container.appendChild(this._renderer.domElement);
            
            // Orbit controls
            if (THREE.OrbitControls) {
                this._orbitControls = new THREE.OrbitControls(this._camera, this._renderer.domElement);
                this._orbitControls.enableDamping = true;
                this._orbitControls.dampingFactor = 0.05;
            }
            
            // Lighting
            this._setupLighting();
            
            // Grid
            this._addGrid();
            
            // Start render loop
            this._startAnimationLoop();
            
            // Resize handling
            window.addEventListener('resize', () => this._onWindowResize(container));
            
            return this;
        } catch (error) {
            ErrorService.handleError(error, { context: 'Three.js Scene Initialization' });
            return null;
        }
    }

    /**
     * Setup scene lighting
     * @private
     */
    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this._scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this._scene.add(directionalLight);
    }

    /**
     * Add grid to the scene
     * @private
     */
    _addGrid() {
        const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x444444);
        this._scene.add(gridHelper);
    }

    /**
     * Start animation render loop
     * @private
     */
    _startAnimationLoop() {
        const animate = () => {
            if (!this._renderer || !this._scene || !this._camera) return;
            
            this._animationFrameId = requestAnimationFrame(animate);
            
            if (this._orbitControls) {
                this._orbitControls.update();
            }
            
            this._renderer.render(this._scene, this._camera);
        };
        
        animate();
    }

    /**
     * Handle window resize
     * @param {HTMLElement} container - Rendering container
     * @private
     */
    _onWindowResize(container) {
        if (!this._camera || !this._renderer || !container) return;
        
        const aspectRatio = container.clientWidth / container.clientHeight;
        this._camera.aspect = aspectRatio;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(container.clientWidth, container.clientHeight);
    }

    /**
     * Add a 3D object to the scene
     * @param {THREE.Object3D} object - Object to add
     */
    addToScene(object) {
        if (!this._scene) {
            ErrorService.handleError(new Error('Scene not initialized'));
            return;
        }
        this._scene.add(object);
    }

    /**
     * Remove an object from the scene
     * @param {THREE.Object3D} object - Object to remove
     */
    removeFromScene(object) {
        if (!this._scene) return;
        this._scene.remove(object);
    }

    /**
     * Reset camera to view entire scene
     * @param {THREE.Object3D} object - Object to center on
     */
    resetCamera(object) {
        if (!object || !this._camera || !this._orbitControls) return;
        
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this._camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
        
        this._camera.position.set(
            center.x + cameraDistance * 0.5,
            center.y + cameraDistance * 0.5,
            center.z + cameraDistance
        );
        
        this._orbitControls.target.copy(center);
        this._orbitControls.update();
    }

    /**
     * Cleanup and dispose of resources
     */
    dispose() {
        // Cancel animation frame
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
        }
        
        // Dispose of renderer
        if (this._renderer) {
            this._renderer.dispose();
            this._renderer = null;
        }
        
        // Dispose of controls
        if (this._orbitControls) {
            this._orbitControls.dispose();
            this._orbitControls = null;
        }
        
        // Clear scene
        if (this._scene) {
            while (this._scene.children.length > 0) {
                const object = this._scene.children[0];
                this._scene.remove(object);
                
                // Dispose of geometries and materials
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
            this._scene = null;
        }
    }
}

// Singleton export
export default new ThreeJsService();