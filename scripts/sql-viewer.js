class SQLViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.models = [];
        this.mixers = [];
        this.animations = [];
        this.currentIndex = 0;
        this.currentModel = null;
        this.modelCount = 5;
        this.loadedCount = 0;
        this.clock = new THREE.Clock();
        
        // Animation control
        this.animationsPlaying = true;
        this.animationSpeed = 1.0;
        this.modelScale = 0.1; // Changed from 0.3 to 0.1 (which will display as 1.0x)
        this.baseScales = []; // Store original scales for each model
        
        // Mouse controls for rotation
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.currentRotationX = 0;
        this.currentRotationY = 0;
        this.isMouseDown = false;
        
        this.init();
        this.setupControls();
        this.loadModels();
    }
    
    init() {
        const container = document.getElementById('sql-3d-viewer');
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.camera.position.set(0, 2, 6);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            premultipliedAlpha: false
        });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 10, 5);
        directionalLight1.castShadow = true;
        directionalLight1.shadow.mapSize.width = 2048;
        directionalLight1.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.3);
        directionalLight2.position.set(-5, 3, -5);
        this.scene.add(directionalLight2);
        
        const directionalLight3 = new THREE.DirectionalLight(0xff6644, 0.2);
        directionalLight3.position.set(0, -5, 3);
        this.scene.add(directionalLight3);
        
        // Setup mouse controls
        this.setupMouseControls();
        
        // Start animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupMouseControls() {
        const container = document.getElementById('sql-3d-viewer');
        
        container.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;
            
            const deltaX = e.clientX - this.mouseX;
            const deltaY = e.clientY - this.mouseY;
            
            this.targetRotationY += deltaX * 0.01;
            this.targetRotationX += deltaY * 0.01;
            
            this.targetRotationX = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.targetRotationX));
            
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        container.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        
        container.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
        });
        
        // Touch events
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.isMouseDown = true;
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
        });
        
        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isMouseDown) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.mouseX;
            const deltaY = touch.clientY - this.mouseY;
            
            this.targetRotationY += deltaX * 0.01;
            this.targetRotationX += deltaY * 0.01;
            
            this.targetRotationX = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.targetRotationX));
            
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
        });
        
        container.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isMouseDown = false;
        });
    }
    
    setupControls() {
        // Navigation controls
        document.getElementById('prev-model').addEventListener('click', () => {
            this.previousModel();
        });
        
        document.getElementById('next-model').addEventListener('click', () => {
            this.nextModel();
        });
        
        // Size control - FIXED SCALING DISPLAY
        const sizeSlider = document.getElementById('size-slider');
        const sizeValue = document.getElementById('size-value');
        
        sizeSlider.addEventListener('input', (e) => {
            this.modelScale = parseFloat(e.target.value);
            // Display scale multiplied by 10 to show 0.1 as 1.0x
            const displayScale = this.modelScale * 10;
            sizeValue.textContent = `${displayScale.toFixed(1)}x`;
            this.updateModelScale();
        });
        
        // Initialize the display value correctly
        const initialDisplayScale = this.modelScale * 10;
        sizeValue.textContent = `${initialDisplayScale.toFixed(1)}x`;
        
        // Animation controls
        document.getElementById('play-pause-btn').addEventListener('click', () => {
            this.toggleAnimations();
        });
        
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        
        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            speedValue.textContent = `${this.animationSpeed.toFixed(1)}x`;
            this.updateAnimationSpeed();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.previousModel();
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextModel();
            }
            if (e.key === ' ') {
                e.preventDefault();
                this.toggleAnimations();
            }
        });
    }
    
    async loadModels() {
        this.showLoading();
        
        // Initialize arrays
        for (let i = 0; i < this.modelCount; i++) {
            this.models[i] = null;
            this.mixers[i] = null;
            this.animations[i] = [];
        }
        
        // Create first fallback and show it
        this.models[0] = this.createFallbackModel(1);
        this.setupModelProperties(this.models[0], 0);
        this.showModel(0);
        this.hideLoading();
        
        // Load real models
        this.loadModelsSequentially();
    }
    
    async loadModelsSequentially() {
        console.log('🔄 Iniciando carga secuencial de modelos SQL...');
        
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('❌ GLTFLoader no disponible, usando solo modelos de respaldo');
            this.createAllFallbackModels();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        for (let i = 0; i < this.modelCount; i++) {
            const modelNumber = i + 1;
            const modelName = `SQL${modelNumber}`;
            
            const possiblePaths = [
                `./models/${modelName}.glb`,
                `./assets/${modelName}.glb`,
                `./${modelName}.glb`,
                `models/${modelName}.glb`,
                `assets/${modelName}.glb`,
                `${modelName}.glb`
            ];
            
            console.log(`🔍 Cargando ${modelName}...`);
            
            let modelLoaded = false;
            
            for (const modelPath of possiblePaths) {
                try {
                    console.log(`📥 Probando ruta: ${modelPath}`);
                    const gltf = await this.loadModel(loader, modelPath);
                    
                    console.log(`✅ ¡Modelo ${modelNumber} cargado desde: ${modelPath}!`);
                    
                    // Replace fallback
                    if (this.models[i] && this.currentIndex === i) {
                        this.scene.remove(this.models[i]);
                    }
                    
                    this.models[i] = gltf.scene;
                    
                    // Store animations
                    if (gltf.animations && gltf.animations.length > 0) {
                        this.animations[i] = gltf.animations;
                        console.log(`🎬 Modelo ${modelNumber} tiene ${gltf.animations.length} animaciones`);
                    } else {
                        this.animations[i] = [];
                        console.log(`📝 Modelo ${modelNumber} sin animaciones`);
                    }
                    
                    this.setupModelProperties(this.models[i], i);
                    
                    // If this is the current model, show it
                    if (this.currentIndex === i) {
                        this.showModel(i);
                    }
                    
                    this.loadedCount++;
                    modelLoaded = true;
                    break;
                    
                } catch (error) {
                    console.log(`❌ Error con ${modelPath}: ${error.message}`);
                    continue;
                }
            }
            
            if (!modelLoaded) {
                console.log(`⚠️ No se pudo cargar ${modelName}, manteniendo fallback`);
            }
            
            // Small delay between loads
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`✨ Carga completada: ${this.loadedCount}/${this.modelCount} modelos reales cargados`);
    }
    
    loadModel(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => resolve(gltf),
                (progress) => {
                    if (progress.total > 0) {
                        const percentage = (progress.loaded / progress.total * 100).toFixed(1);
                        console.log(`📊 Progreso ${path}: ${percentage}%`);
                    }
                },
                (error) => reject(error)
            );
        });
    }
    
    createAllFallbackModels() {
        console.log('🎨 Creando todos los modelos de respaldo SQL...');
        
        for (let i = 0; i < this.modelCount; i++) {
            if (!this.models[i]) {
                this.models[i] = this.createFallbackModel(i + 1);
                this.setupModelProperties(this.models[i], i);
            }
        }
    }
    
    createFallbackModel(index) {
        const colors = [0x3b82f6, 0x10b981, 0x8b5cf6, 0xf59e0b, 0x6366f1];
        
        const group = new THREE.Group();
        
        // Main database cylinder
        const geometry = new THREE.CylinderGeometry(1.2, 1.2, 2, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: colors[(index - 1) % colors.length],
            shininess: 100
        });
        
        const mainMesh = new THREE.Mesh(geometry, material);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;
        group.add(mainMesh);
        
        // Add database layers
        for (let i = 0; i < 3; i++) {
            const layerGeometry = new THREE.CylinderGeometry(1.3, 1.3, 0.1, 16);
            const layerMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffffff,
                opacity: 0.8,
                transparent: true
            });
            
            const layer = new THREE.Mesh(layerGeometry, layerMaterial);
            layer.position.y = -0.6 + (i * 0.6);
            group.add(layer);
        }
        
        // Add wireframe
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            opacity: 0.3, 
            transparent: true 
        });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        group.add(wireframe);
        
        console.log(`🎨 Modelo fallback SQL${index} creado`);
        return group;
    }
    
    setupModelProperties(model, index) {
        // Enable shadows
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        model.position.sub(center);
        
        // Scale to fit viewer - MUCH SMALLER BASE SIZE
        const maxDimension = Math.max(size.x, size.y, size.z);
        const targetSize = 1.0; // Reduced from 2.5 to 1.0
        
        if (maxDimension > 0) {
            const scale = targetSize / maxDimension;
            model.scale.setScalar(scale);
            // Store the base scale for this model
            this.baseScales[index] = scale;
        }
        
        // Position at MIDDLE HEIGHT instead of ground level
        const scaledBox = new THREE.Box3().setFromObject(model);
        const boxCenter = scaledBox.getCenter(new THREE.Vector3());
        // Position model so its center is at y=0, not its bottom
        model.position.y = -boxCenter.y;
        
        model.visible = false;
        
        console.log(`📏 Modelo SQL ${index + 1} configurado con tamaño base reducido y centrado verticalmente`);
    }
    
    showModel(index) {
        // Stop current animations
        if (this.mixers[this.currentIndex]) {
            this.mixers[this.currentIndex].stopAllAction();
            this.mixers[this.currentIndex] = null;
        }
        
        // Hide current model
        if (this.currentModel) {
            this.currentModel.visible = false;
            this.scene.remove(this.currentModel);
        }
        
        // Show new model
        this.currentIndex = index;
        this.currentModel = this.models[index];
        
        if (this.currentModel) {
            this.currentModel.visible = true;
            this.scene.add(this.currentModel);
            
            // Apply current scale
            this.updateModelScale();
            
            // Setup animations
            this.setupAnimations(index);
            
            // Update UI
            this.updateUI();
            
            console.log(`👁️ Mostrando modelo SQL${index + 1}`);
        }
    }
    
    setupAnimations(index) {
        if (this.animations[index] && this.animations[index].length > 0) {
            const mixer = new THREE.AnimationMixer(this.currentModel);
            this.mixers[index] = mixer;
            
            // Play all animations
            this.animations[index].forEach((clip, clipIndex) => {
                const action = mixer.clipAction(clip);
                action.setLoop(THREE.LoopRepeat);
                action.timeScale = this.animationSpeed;
                
                if (this.animationsPlaying) {
                    action.play();
                }
                
                console.log(`🎬 Configurando animación ${clipIndex + 1} para SQL${index + 1}`);
            });
            
            console.log(`✨ ${this.animations[index].length} animaciones configuradas para SQL${index + 1}`);
        } else {
            console.log(`📝 SQL${index + 1} sin animaciones`);
        }
    }
    
    updateModelScale() {
        if (this.currentModel && this.baseScales[this.currentIndex]) {
            // Use the stored base scale instead of current scale
            const baseScale = this.baseScales[this.currentIndex];
            this.currentModel.scale.setScalar(baseScale * this.modelScale);
        }
    }
    
    updateAnimationSpeed() {
        if (this.mixers[this.currentIndex]) {
            this.mixers[this.currentIndex]._actions.forEach(action => {
                action.timeScale = this.animationSpeed;
            });
        }
    }
    
    toggleAnimations() {
        this.animationsPlaying = !this.animationsPlaying;
        const btn = document.getElementById('play-pause-btn');
        
        if (this.animationsPlaying) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pausar Animaciones';
            if (this.mixers[this.currentIndex]) {
                this.mixers[this.currentIndex]._actions.forEach(action => {
                    action.play();
                });
            }
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> Reproducir Animaciones';
            if (this.mixers[this.currentIndex]) {
                this.mixers[this.currentIndex]._actions.forEach(action => {
                    action.stop();
                });
            }
        }
    }
    
    nextModel() {
        const nextIndex = (this.currentIndex + 1) % this.modelCount;
        this.showModel(nextIndex);
    }
    
    previousModel() {
        const prevIndex = (this.currentIndex - 1 + this.modelCount) % this.modelCount;
        this.showModel(prevIndex);
    }
    
    updateUI() {
        const modelTitle = document.getElementById('model-title');
        const modelCounter = document.getElementById('model-counter');
        
        if (modelTitle) {
            modelTitle.textContent = `SQL${this.currentIndex + 1}`;
        }
        if (modelCounter) {
            modelCounter.textContent = `${this.currentIndex + 1} / ${this.modelCount}`;
        }
    }
    
    showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Update animations
        if (this.mixers[this.currentIndex] && this.animationsPlaying) {
            this.mixers[this.currentIndex].update(delta);
        }
        
        // Smooth rotation interpolation
        this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.1;
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;
        
        // Apply rotation to current model
        if (this.currentModel) {
            this.currentModel.rotation.x = this.currentRotationX;
            this.currentModel.rotation.y = this.currentRotationY;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const container = document.getElementById('sql-3d-viewer');
        if (container) {
            this.camera.aspect = container.offsetWidth / container.offsetHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            new SQLViewer();
        } catch (error) {
            console.error('💥 Error inicializando SQLViewer:', error);
        }
    }, 100);
});
