// EuroRack 3D Modeler Application
class EuroRackApp {
    constructor() {
        this.currentModule = this.getDefaultModule();
        this.uploadedImages = [];
        this.controls = [];
        this.rackModules = [];
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.orbitControls = null;
        this.currentModel = null;
        this.isDarkTheme = true;
        this.addControlMode = null;
        this.currentRackSize = 104;
        
        this.eurorackData = {
            hpUnit: 5.08,
            standardHeight: 128.5,
            powerRails: ["+12V", "-12V", "+5V"],
            commonWidths: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 42],
            caseSizes: [
                {name: "84HP", width: 427.32, maxModules: 42},
                {name: "104HP", width: 528.32, maxModules: 52},
                {name: "168HP", width: 852.64, maxModules: 84}
            ]
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeThreeJS();
        this.updateHPRuler();
        this.updateRackGrid();
        this.setupDragAndDrop();
        this.initializePanelLayout();
        this.updateControlsList();
    }
    
    getDefaultModule() {
        return {
            name: "Untitled Module",
            width: 4,
            height: 128.5,
            depth: 25,
            powerDraw: {"+12V": 0, "-12V": 0, "+5V": 0},
            controls: [],
            mountingHoles: [],
            images: []
        };
    }
    
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }
        
        // Module specifications
        const moduleName = document.getElementById('moduleName');
        if (moduleName) {
            moduleName.addEventListener('input', (e) => {
                this.currentModule.name = e.target.value;
            });
        }
        
        const moduleWidth = document.getElementById('moduleWidth');
        if (moduleWidth) {
            moduleWidth.addEventListener('change', (e) => {
                this.currentModule.width = parseInt(e.target.value);
                this.updateHPRuler();
                this.updatePanelLayout();
            });
        }
        
        const moduleHeight = document.getElementById('moduleHeight');
        if (moduleHeight) {
            moduleHeight.addEventListener('input', (e) => {
                this.currentModule.height = parseFloat(e.target.value);
                this.updatePanelLayout();
            });
        }
        
        const moduleDepth = document.getElementById('moduleDepth');
        if (moduleDepth) {
            moduleDepth.addEventListener('input', (e) => {
                this.currentModule.depth = parseFloat(e.target.value);
            });
        }
        
        // Power requirements
        ['power12V', 'powerNeg12V', 'power5V'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    const rail = id === 'power12V' ? '+12V' : id === 'powerNeg12V' ? '-12V' : '+5V';
                    this.currentModule.powerDraw[rail] = parseInt(e.target.value) || 0;
                });
            }
        });
        
        // Layout controls
        const addKnob = document.getElementById('addKnob');
        if (addKnob) {
            addKnob.addEventListener('click', (e) => {
                e.preventDefault();
                this.setAddControlMode('knob');
            });
        }
        
        const addJack = document.getElementById('addJack');
        if (addJack) {
            addJack.addEventListener('click', (e) => {
                e.preventDefault();
                this.setAddControlMode('jack');
            });
        }
        
        const addSwitch = document.getElementById('addSwitch');
        if (addSwitch) {
            addSwitch.addEventListener('click', (e) => {
                e.preventDefault();
                this.setAddControlMode('switch');
            });
        }
        
        const clearControls = document.getElementById('clearControls');
        if (clearControls) {
            clearControls.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearControls();
            });
        }
        
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
        }
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // 3D Model generation
        const generateModel = document.getElementById('generateModel');
        if (generateModel) {
            generateModel.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateModel();
            });
        }
        
        // 3D Viewer controls
        const resetCamera = document.getElementById('resetCamera');
        if (resetCamera) {
            resetCamera.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetCamera();
            });
        }
        
        const toggleWireframe = document.getElementById('toggleWireframe');
        if (toggleWireframe) {
            toggleWireframe.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleWireframe();
            });
        }
        
        const toggleMeasurements = document.getElementById('toggleMeasurements');
        if (toggleMeasurements) {
            toggleMeasurements.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMeasurements();
            });
        }
        
        const viewMode = document.getElementById('viewMode');
        if (viewMode) {
            viewMode.addEventListener('change', (e) => this.changeViewMode(e.target.value));
        }
        
        // Export controls
        const exportSTL = document.getElementById('exportSTL');
        if (exportSTL) {
            exportSTL.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportModel('stl');
            });
        }
        
        const exportOBJ = document.getElementById('exportOBJ');
        if (exportOBJ) {
            exportOBJ.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportModel('obj');
            });
        }
        
        const exportGLB = document.getElementById('exportGLB');
        if (exportGLB) {
            exportGLB.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportModel('glb');
            });
        }
        
        const screenshotModel = document.getElementById('screenshotModel');
        if (screenshotModel) {
            screenshotModel.addEventListener('click', (e) => {
                e.preventDefault();
                this.screenshotModel();
            });
        }
        
        // Rack controls
        const rackSize = document.getElementById('rackSize');
        if (rackSize) {
            rackSize.addEventListener('change', (e) => {
                this.currentRackSize = parseInt(e.target.value);
                this.updateRackGrid();
            });
        }
        
        const addToLibrary = document.getElementById('addToLibrary');
        if (addToLibrary) {
            addToLibrary.addEventListener('click', (e) => {
                e.preventDefault();
                this.addModuleToLibrary();
            });
        }
        
        const exportRack = document.getElementById('exportRack');
        if (exportRack) {
            exportRack.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportRack();
            });
        }
        
        // Project management
        const saveProject = document.getElementById('saveProject');
        if (saveProject) {
            saveProject.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveProject();
            });
        }
        
        const loadProject = document.getElementById('loadProject');
        if (loadProject) {
            loadProject.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadProject();
            });
        }
    }
    
    switchTab(tabName) {
        if (!tabName) return;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('tab-btn--active'));
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('tab-btn--active');
        }
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('tab-content--active'));
        const activeContent = document.getElementById(tabName);
        if (activeContent) {
            activeContent.classList.add('tab-content--active');
        }
    }
    
    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.documentElement.setAttribute('data-color-scheme', this.isDarkTheme ? 'dark' : 'light');
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.isDarkTheme ? '☀️' : '🌙';
        }
    }
    
    updateHPRuler() {
        const width = this.currentModule.width;
        const maxWidth = 42; // Maximum common HP width
        const percentage = (width / maxWidth) * 100;
        
        const indicator = document.getElementById('hpIndicator');
        if (indicator) {
            indicator.style.width = `${percentage}%`;
        }
        
        // Update labels
        const labelsContainer = document.getElementById('hpLabels');
        if (labelsContainer) {
            labelsContainer.innerHTML = '';
            
            const steps = [0, 4, 8, 12, 16, 20, 24, 28, 32, 42];
            steps.forEach(step => {
                const label = document.createElement('span');
                label.textContent = `${step}HP`;
                label.style.fontSize = 'var(--font-size-xs)';
                if (step === width) {
                    label.style.color = 'var(--color-primary)';
                    label.style.fontWeight = 'var(--font-weight-bold)';
                }
                labelsContainer.appendChild(label);
            });
        }
    }
    
    initializePanelLayout() {
        const panelPreview = document.getElementById('panelPreview');
        if (panelPreview) {
            panelPreview.addEventListener('click', (e) => this.handlePanelClick(e));
        }
        this.updatePanelLayout();
    }
    
    updatePanelLayout() {
        const preview = document.getElementById('panelPreview');
        if (!preview) return;
        
        const widthMm = this.currentModule.width * this.eurorackData.hpUnit;
        const heightMm = this.currentModule.height;
        
        // Set aspect ratio based on actual dimensions
        const aspectRatio = widthMm / heightMm;
        preview.style.aspectRatio = aspectRatio;
        preview.style.minHeight = '200px';
        
        // Clear existing controls
        preview.querySelectorAll('.control-element').forEach(el => el.remove());
        
        // Add controls
        this.controls.forEach((control, index) => {
            this.addControlToPreview(control, index);
        });
    }
    
    setAddControlMode(type) {
        this.addControlMode = type;
        const panelPreview = document.getElementById('panelPreview');
        if (panelPreview) {
            panelPreview.style.cursor = 'crosshair';
        }
        
        // Update button states
        document.querySelectorAll('.layout-toolbar .btn').forEach(btn => btn.classList.remove('btn--primary'));
        if (type === 'knob') {
            const btn = document.getElementById('addKnob');
            if (btn) btn.classList.add('btn--primary');
        } else if (type === 'jack') {
            const btn = document.getElementById('addJack');
            if (btn) btn.classList.add('btn--primary');
        } else if (type === 'switch') {
            const btn = document.getElementById('addSwitch');
            if (btn) btn.classList.add('btn--primary');
        }
    }
    
    handlePanelClick(e) {
        if (!this.addControlMode) return;
        
        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        const control = {
            type: this.addControlMode,
            x: x,
            y: y,
            label: `${this.addControlMode} ${this.controls.length + 1}`,
            id: Date.now()
        };
        
        this.controls.push(control);
        this.addControlToPreview(control, this.controls.length - 1);
        this.updateControlsList();
        
        // Reset mode
        this.addControlMode = null;
        const panelPreview = document.getElementById('panelPreview');
        if (panelPreview) {
            panelPreview.style.cursor = 'default';
        }
        document.querySelectorAll('.layout-toolbar .btn').forEach(btn => btn.classList.remove('btn--primary'));
    }
    
    addControlToPreview(control, index) {
        const preview = document.getElementById('panelPreview');
        if (!preview) return;
        
        const element = document.createElement('div');
        element.className = `control-element control-element--${control.type}`;
        element.style.left = `${control.x}%`;
        element.style.top = `${control.y}%`;
        element.title = control.label;
        element.textContent = control.type === 'knob' ? '⚪' : control.type === 'jack' ? '●' : '▢';
        element.dataset.index = index;
        
        // Make draggable
        element.addEventListener('mousedown', (e) => this.startDragControl(e, index));
        
        preview.appendChild(element);
    }
    
    startDragControl(e, index) {
        e.preventDefault();
        const preview = document.getElementById('panelPreview');
        const element = e.target;
        
        const onMouseMove = (e) => {
            const rect = preview.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            
            element.style.left = `${x}%`;
            element.style.top = `${y}%`;
            
            if (this.controls[index]) {
                this.controls[index].x = x;
                this.controls[index].y = y;
            }
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    clearControls() {
        this.controls = [];
        this.updatePanelLayout();
        this.updateControlsList();
    }
    
    updateControlsList() {
        const container = document.getElementById('controlsList');
        if (!container) return;
        
        const existingList = container.querySelector('.controls-items');
        if (existingList) existingList.remove();
        
        const empty = container.querySelector('.controls-empty');
        
        if (this.controls.length === 0) {
            if (empty) empty.style.display = 'block';
            return;
        }
        
        if (empty) empty.style.display = 'none';
        
        const list = document.createElement('div');
        list.className = 'controls-items';
        
        this.controls.forEach((control, index) => {
            const item = document.createElement('div');
            item.className = 'control-item';
            item.innerHTML = `
                <span>${control.label}</span>
                <button class="control-remove" data-index="${index}">×</button>
            `;
            
            const removeBtn = item.querySelector('.control-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.controls.splice(index, 1);
                    this.updatePanelLayout();
                    this.updateControlsList();
                });
            }
            
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }
    
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }
    
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        this.handleFiles(files);
    }
    
    handleFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const image = {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        data: e.target.result,
                        type: file.type
                    };
                    this.uploadedImages.push(image);
                    this.updateImageGallery();
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    updateImageGallery() {
        const gallery = document.getElementById('imageGallery');
        if (!gallery) return;
        
        gallery.innerHTML = '';
        
        this.uploadedImages.forEach(image => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'image-thumbnail';
            thumbnail.innerHTML = `
                <img src="${image.data}" alt="${image.name}">
                <button class="image-remove" data-id="${image.id}">×</button>
            `;
            
            const removeBtn = thumbnail.querySelector('.image-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.uploadedImages = this.uploadedImages.filter(img => img.id !== image.id);
                    this.updateImageGallery();
                });
            }
            
            gallery.appendChild(thumbnail);
        });
    }
    
    initializeThreeJS() {
        const container = document.getElementById('threeContainer');
        if (!container) return;
        
        try {
            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a1a);
            
            // Camera
            this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            this.camera.position.set(50, 50, 100);
            
            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(this.renderer.domElement);
            
            // Controls
            if (THREE.OrbitControls) {
                this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.orbitControls.enableDamping = true;
                this.orbitControls.dampingFactor = 0.05;
            }
            
            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(50, 100, 50);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            this.scene.add(directionalLight);
            
            // Grid
            const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x444444);
            this.scene.add(gridHelper);
            
            // Handle resize
            window.addEventListener('resize', () => this.onWindowResize());
            
            // Start render loop
            this.animate();
            
        } catch (error) {
            console.error('Failed to initialize Three.js:', error);
            const container = document.getElementById('threeContainer');
            if (container) {
                container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary);">3D Viewer initialization failed. Three.js may not be loaded properly.</div>';
            }
        }
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const container = document.getElementById('threeContainer');
        if (container) {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
    
    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        requestAnimationFrame(() => this.animate());
        
        if (this.orbitControls) {
            this.orbitControls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    async generateModel() {
        const btn = document.getElementById('generateModel');
        if (btn) {
            btn.classList.add('loading');
        }
        
        // Show progress modal
        this.showProgressModal();
        
        try {
            // Simulate AI processing
            await this.simulateAIGeneration();
            
            // Create 3D model
            this.createModuleModel();
            
            // Hide overlay
            const overlay = document.getElementById('viewerOverlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
            
        } catch (error) {
            console.error('Model generation failed:', error);
            alert('Failed to generate 3D model. Please try again.');
        } finally {
            if (btn) {
                btn.classList.remove('loading');
            }
            this.hideProgressModal();
        }
    }
    
    async simulateAIGeneration() {
        const steps = [
            'Initializing AI service...',
            'Processing module specifications...',
            'Analyzing uploaded images...',
            'Generating 3D geometry...',
            'Optimizing mesh structure...',
            'Applying materials and textures...',
            'Finalizing 3D model...'
        ];
        
        for (let i = 0; i < steps.length; i++) {
            const progressText = document.getElementById('progressText');
            const progressFill = document.getElementById('progressFill');
            
            if (progressText) {
                progressText.textContent = steps[i];
            }
            if (progressFill) {
                progressFill.style.width = `${((i + 1) / steps.length) * 100}%`;
            }
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        }
    }
    
    createModuleModel() {
        if (!this.scene) return;
        
        // Remove existing model
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }
        
        const widthMm = this.currentModule.width * this.eurorackData.hpUnit;
        const heightMm = this.currentModule.height;
        const depthMm = this.currentModule.depth;
        
        // Create module group
        this.currentModel = new THREE.Group();
        
        // Main panel
        const panelGeometry = new THREE.BoxGeometry(widthMm, heightMm, 2);
        const panelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.z = depthMm / 2 - 1;
        this.currentModel.add(panel);
        
        // PCB
        const pcbGeometry = new THREE.BoxGeometry(widthMm - 4, heightMm - 10, 1.6);
        const pcbMaterial = new THREE.MeshLambertMaterial({ color: 0x0a5d0a });
        const pcb = new THREE.Mesh(pcbGeometry, pcbMaterial);
        pcb.position.z = depthMm / 2 - 10;
        this.currentModel.add(pcb);
        
        // Housing
        const housingGeometry = new THREE.BoxGeometry(widthMm, heightMm, depthMm);
        const housingMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x222222,
            transparent: true,
            opacity: 0.3 
        });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        this.currentModel.add(housing);
        
        // Add controls
        this.controls.forEach(control => {
            this.addControlToModel(control, widthMm, heightMm);
        });
        
        // Position model
        this.currentModel.position.set(0, 0, 0);
        this.scene.add(this.currentModel);
        
        this.resetCamera();
    }
    
    addControlToModel(control, widthMm, heightMm) {
        if (!this.currentModel) return;
        
        const x = (control.x / 100) * widthMm - widthMm / 2;
        const y = heightMm / 2 - (control.y / 100) * heightMm;
        const z = this.currentModule.depth / 2 + 1;
        
        let geometry, material, mesh;
        
        switch (control.type) {
            case 'knob':
                geometry = new THREE.CylinderGeometry(4, 4, 6, 16);
                material = new THREE.MeshLambertMaterial({ color: 0x666666 });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, y, z);
                break;
                
            case 'jack':
                geometry = new THREE.CylinderGeometry(3, 3, 8, 16);
                material = new THREE.MeshLambertMaterial({ color: 0x000000 });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, y, z);
                break;
                
            case 'switch':
                geometry = new THREE.BoxGeometry(6, 12, 4);
                material = new THREE.MeshLambertMaterial({ color: 0x444444 });
                mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, y, z);
                break;
        }
        
        if (mesh) {
            this.currentModel.add(mesh);
        }
    }
    
    showProgressModal() {
        const modal = document.getElementById('progressModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
    }
    
    hideProgressModal() {
        const modal = document.getElementById('progressModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    resetCamera() {
        if (!this.currentModel || !this.camera || !this.orbitControls) return;
        
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
        
        this.camera.position.set(
            center.x + cameraDistance * 0.5,
            center.y + cameraDistance * 0.5,
            center.z + cameraDistance
        );
        
        this.orbitControls.target.copy(center);
        this.orbitControls.update();
    }
    
    toggleWireframe() {
        if (!this.currentModel) return;
        
        this.currentModel.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                child.material.wireframe = !child.material.wireframe;
            }
        });
    }
    
    toggleMeasurements() {
        const overlay = document.getElementById('measurementsOverlay');
        if (!overlay) return;
        
        if (overlay.classList.contains('visible')) {
            overlay.classList.remove('visible');
        } else {
            overlay.classList.add('visible');
            this.updateMeasurements();
        }
    }
    
    updateMeasurements() {
        const overlay = document.getElementById('measurementsOverlay');
        if (!overlay) return;
        
        const widthMm = this.currentModule.width * this.eurorackData.hpUnit;
        
        overlay.innerHTML = `
            <div><strong>Module Dimensions</strong></div>
            <div>Width: ${this.currentModule.width} HP (${widthMm.toFixed(2)} mm)</div>
            <div>Height: ${this.currentModule.height} mm</div>
            <div>Depth: ${this.currentModule.depth} mm</div>
            <div>Controls: ${this.controls.length}</div>
            <div>Power: +12V: ${this.currentModule.powerDraw['+12V']}mA, -12V: ${this.currentModule.powerDraw['-12V']}mA</div>
        `;
    }
    
    changeViewMode(mode) {
        if (!this.camera) return;
        
        const container = document.getElementById('threeContainer');
        if (!container) return;
        
        if (mode === 'orthographic') {
            const aspect = container.clientWidth / container.clientHeight;
            const frustumSize = 100;
            
            this.camera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                frustumSize / -2,
                1,
                1000
            );
        } else {
            this.camera = new THREE.PerspectiveCamera(
                75,
                container.clientWidth / container.clientHeight,
                0.1,
                1000
            );
        }
        
        this.camera.position.set(50, 50, 100);
        if (this.orbitControls) {
            this.orbitControls.object = this.camera;
        }
        this.resetCamera();
    }
    
    exportModel(format) {
        if (!this.currentModel) {
            alert('No model to export. Please generate a 3D model first.');
            return;
        }
        
        let data, filename, mimeType;
        
        switch (format) {
            case 'stl':
                data = this.generateSTLData();
                filename = `${this.currentModule.name || 'module'}.stl`;
                mimeType = 'application/octet-stream';
                break;
                
            case 'obj':
                data = this.generateOBJData();
                filename = `${this.currentModule.name || 'module'}.obj`;
                mimeType = 'text/plain';
                break;
                
            case 'glb':
                data = this.generateGLBData();
                filename = `${this.currentModule.name || 'module'}.glb`;
                mimeType = 'application/octet-stream';
                break;
        }
        
        this.downloadFile(data, filename, mimeType);
    }
    
    generateSTLData() {
        const widthMm = this.currentModule.width * this.eurorackData.hpUnit;
        return `solid ${this.currentModule.name || 'module'}
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex ${widthMm} 0 0
    vertex ${widthMm} ${this.currentModule.height} 0
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex ${widthMm} ${this.currentModule.height} 0
    vertex 0 ${this.currentModule.height} 0
  endloop
endfacet
endsolid ${this.currentModule.name || 'module'}`;
    }
    
    generateOBJData() {
        const widthMm = this.currentModule.width * this.eurorackData.hpUnit;
        return `# Eurorack Module: ${this.currentModule.name}
# Generated by EuroRack 3D Modeler
# Dimensions: ${this.currentModule.width}HP (${widthMm}mm) x ${this.currentModule.height}mm x ${this.currentModule.depth}mm

v 0.0 0.0 0.0
v ${widthMm} 0.0 0.0
v ${widthMm} ${this.currentModule.height} 0.0
v 0.0 ${this.currentModule.height} 0.0

f 1 2 3 4`;
    }
    
    generateGLBData() {
        return 'GLB_BINARY_DATA_PLACEHOLDER_FOR_' + (this.currentModule.name || 'module').toUpperCase();
    }
    
    screenshotModel() {
        if (!this.renderer) {
            alert('3D viewer not initialized');
            return;
        }
        
        const canvas = this.renderer.domElement;
        const link = document.createElement('a');
        link.download = `${this.currentModule.name || 'module'}_screenshot.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
    
    downloadFile(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    updateRackGrid() {
        const rackView = document.getElementById('rackView');
        if (rackView) {
            const widthMm = this.currentRackSize * this.eurorackData.hpUnit;
            rackView.style.width = `${widthMm}px`;
            rackView.style.minWidth = `${widthMm}px`;
        }
    }
    
    addModuleToLibrary() {
        if (!this.currentModel) {
            alert('Please generate a 3D model first.');
            return;
        }
        
        const module = { ...this.currentModule };
        module.id = Date.now();
        module.controls = [...this.controls];
        
        const libraryItem = document.createElement('div');
        libraryItem.className = 'library-module';
        libraryItem.draggable = true;
        libraryItem.dataset.moduleId = module.id;
        
        const widthMm = module.width * this.eurorackData.hpUnit;
        
        libraryItem.innerHTML = `
            <div class="library-module-name">${module.name || 'Untitled Module'}</div>
            <div class="library-module-specs">
                ${module.width}HP (${widthMm.toFixed(1)}mm) × ${module.height}mm × ${module.depth}mm<br>
                Power: +12V: ${module.powerDraw['+12V']}mA, -12V: ${module.powerDraw['-12V']}mA
            </div>
        `;
        
        libraryItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', module.id);
        });
        
        const library = document.getElementById('moduleLibrary');
        if (library) {
            const empty = library.querySelector('.library-empty');
            if (empty) empty.style.display = 'none';
            
            library.appendChild(libraryItem);
        }
        
        // Store module data
        this.rackModules.push(module);
    }
    
    exportRack() {
        const rackData = {
            size: this.currentRackSize,
            modules: this.rackModules,
            powerConsumption: this.calculateTotalPower(),
            exportDate: new Date().toISOString()
        };
        
        const data = JSON.stringify(rackData, null, 2);
        this.downloadFile(data, 'eurorack_configuration.json', 'application/json');
    }
    
    calculateTotalPower() {
        return this.rackModules.reduce((total, module) => {
            total['+12V'] += module.powerDraw['+12V'] || 0;
            total['-12V'] += module.powerDraw['-12V'] || 0;
            total['+5V'] += module.powerDraw['+5V'] || 0;
            return total;
        }, {'+12V': 0, '-12V': 0, '+5V': 0});
    }
    
    saveProject() {
        const project = {
            name: this.currentModule.name || 'Untitled Project',
            currentModule: this.currentModule,
            controls: this.controls,
            uploadedImages: this.uploadedImages,
            rackModules: this.rackModules,
            rackSize: this.currentRackSize,
            version: '1.0',
            saveDate: new Date().toISOString()
        };
        
        const data = JSON.stringify(project, null, 2);
        this.downloadFile(data, `${project.name.replace(/\s+/g, '_')}_project.json`, 'application/json');
    }
    
    loadProject() {
        const input = document.getElementById('projectInput');
        if (!input) return;
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const project = JSON.parse(e.target.result);
                    this.loadProjectData(project);
                } catch (error) {
                    alert('Failed to load project file. Please check the file format.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    loadProjectData(project) {
        this.currentModule = project.currentModule || this.getDefaultModule();
        this.controls = project.controls || [];
        this.uploadedImages = project.uploadedImages || [];
        this.rackModules = project.rackModules || [];
        this.currentRackSize = project.rackSize || 104;
        
        // Update UI
        const moduleName = document.getElementById('moduleName');
        if (moduleName) moduleName.value = this.currentModule.name || '';
        
        const moduleWidth = document.getElementById('moduleWidth');
        if (moduleWidth) moduleWidth.value = this.currentModule.width;
        
        const moduleHeight = document.getElementById('moduleHeight');
        if (moduleHeight) moduleHeight.value = this.currentModule.height;
        
        const moduleDepth = document.getElementById('moduleDepth');
        if (moduleDepth) moduleDepth.value = this.currentModule.depth;
        
        const power12V = document.getElementById('power12V');
        if (power12V) power12V.value = this.currentModule.powerDraw['+12V'];
        
        const powerNeg12V = document.getElementById('powerNeg12V');
        if (powerNeg12V) powerNeg12V.value = this.currentModule.powerDraw['-12V'];
        
        const power5V = document.getElementById('power5V');
        if (power5V) power5V.value = this.currentModule.powerDraw['+5V'];
        
        const rackSize = document.getElementById('rackSize');
        if (rackSize) rackSize.value = this.currentRackSize;
        
        this.updateHPRuler();
        this.updatePanelLayout();
        this.updateControlsList();
        this.updateImageGallery();
        this.updateRackGrid();
        
        alert('Project loaded successfully!');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EuroRackApp();
});