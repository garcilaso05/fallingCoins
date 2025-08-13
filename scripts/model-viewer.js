class ModelViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentModel = null;
        this.models = [];
        this.animations = [];
        this.mixers = [];
        this.currentIndex = 0;
        this.isLoading = false;
        this.clock = new THREE.Clock();
        
        // Get configuration from script tag
        const script = document.querySelector('script[data-models]');
        this.modelPrefix = script.getAttribute('data-models');
        this.modelCount = parseInt(script.getAttribute('data-count'));
        
        this.init();
        this.setupControls();
        this.preloadModels();
    }
    
    init() {
        const container = document.getElementById('model-viewer');
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.camera.position.set(0, 1, 4);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            premultipliedAlpha: false
        });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.setClearColor(0x000000, 0); // Completely transparent
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 5, 5);
        directionalLight1.castShadow = true;
        directionalLight1.shadow.mapSize.width = 2048;
        directionalLight1.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.3);
        directionalLight2.position.set(-5, -3, 2);
        this.scene.add(directionalLight2);
        
        const directionalLight3 = new THREE.DirectionalLight(0xff6644, 0.2);
        directionalLight3.position.set(2, -5, -3);
        this.scene.add(directionalLight3);
        
        // Start animation loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupControls() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.previousModel();
            });
            
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextModel();
            });
        }
        
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
        });
    }
    
    async preloadModels() {
        this.showLoading();
        
        const loader = new THREE.GLTFLoader();
        
        for (let i = 1; i <= this.modelCount; i++) {
            try {
                const modelPath = `./models/${this.modelPrefix}${i}.glb`;
                console.log(`Cargando: ${modelPath}`);
                
                const gltf = await this.loadModel(loader, modelPath);
                this.models[i - 1] = gltf.scene;
                
                // Store animations if any
                if (gltf.animations && gltf.animations.length > 0) {
                    this.animations[i - 1] = gltf.animations;
                    console.log(`${this.modelPrefix}${i} tiene ${gltf.animations.length} animaciones`);
                } else {
                    this.animations[i - 1] = [];
                }
                
                // Setup model properties
                this.setupModelProperties(this.models[i - 1], i - 1);
                
                console.log(`${this.modelPrefix}${i} cargado exitosamente`);
            } catch (error) {
                console.log(`Error cargando ${this.modelPrefix}${i}, creando modelo de respaldo`);
                this.models[i - 1] = this.createFallbackModel(i);
                this.animations[i - 1] = [];
            }
        }
        
        // Show first model
        this.showModel(0);
        this.hideLoading();
        this.updateControls();
        console.log(`${this.models.length} modelos listos`);
    }
    
    loadModel(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => resolve(gltf),
                (progress) => {
                    console.log(`Progreso: ${(progress.loaded / progress.total * 100)}%`);
                },
                (error) => reject(error)
            );
        });
    }
    
    createFallbackModel(index) {
        const colors = [0x3b82f6, 0x10b981, 0x8b5cf6, 0xf59e0b, 0x6366f1];
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({ 
            color: colors[(index - 1) % colors.length],
            shininess: 100 
        });
        
        const model = new THREE.Mesh(geometry, material);
        model.castShadow = true;
        model.receiveShadow = true;
        
        // Add some details
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            opacity: 0.3, 
            transparent: true 
        });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        model.add(wireframe);
        
        return model;
    }
    
    setupModelProperties(model, index) {
        // Enable shadows
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // Scale appropriately
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        let targetSize = 3;
        
        // Adjust target size based on model type
        if (this.modelPrefix === 'M') {
            targetSize = 2.5; // Smaller for mascots
        }
        
        if (maxDimension > targetSize) {
            const scale = targetSize / maxDimension;
            model.scale.setScalar(scale);
        } else if (maxDimension < targetSize * 0.5) {
            const scale = targetSize * 0.7 / maxDimension;
            model.scale.setScalar(scale);
        }
        
        // Position slightly above ground
        model.position.y = -center.y * model.scale.x + 0.1;
        
        // Initially hide
        model.visible = false;
    }
    
    showModel(index) {
        // Stop current animations
        if (this.mixers[this.currentIndex]) {
            this.mixers[this.currentIndex].stopAllAction();
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
            
            // Setup animations if available
            this.setupAnimations(index);
            
            // Update UI
            this.updateUI();
            this.updateControls();
            
            console.log(`Mostrando modelo ${index + 1}: ${this.modelPrefix}${index + 1}`);
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
                action.play();
                console.log(`Reproduciendo animación ${clipIndex + 1} para ${this.modelPrefix}${index + 1}`);
            });
        }
    }
    
    updateUI() {
        const modelName = document.getElementById('model-name');
        const modelCounter = document.getElementById('model-counter');
        
        if (modelName) {
            modelName.textContent = `${this.modelPrefix}${this.currentIndex + 1}`;
        }
        if (modelCounter) {
            modelCounter.textContent = `${this.currentIndex + 1} / ${this.modelCount}`;
        }
    }
    
    updateControls() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.isLoading;
        }
        if (nextBtn) {
            nextBtn.disabled = this.isLoading;
        }
    }
    
    nextModel() {
        if (this.isLoading) return;
        const nextIndex = (this.currentIndex + 1) % this.modelCount;
        this.showModel(nextIndex);
    }
    
    previousModel() {
        if (this.isLoading) return;
        const prevIndex = (this.currentIndex - 1 + this.modelCount) % this.modelCount;
        this.showModel(prevIndex);
    }
    
    showLoading() {
        this.isLoading = true;
        const container = document.getElementById('model-viewer');
        
        // Remove existing loading div
        const existingLoading = container.querySelector('.model-loading');
        if (existingLoading) {
            existingLoading.remove();
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'model-loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            Cargando modelos...
        `;
        container.appendChild(loadingDiv);
        this.updateControls();
    }
    
    hideLoading() {
        this.isLoading = false;
        const loadingDiv = document.querySelector('.model-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
        this.updateControls();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Update animations
        if (this.mixers[this.currentIndex]) {
            this.mixers[this.currentIndex].update(delta);
        }
        
        // Rotate current model slowly
        if (this.currentModel && this.currentModel.visible) {
            this.currentModel.rotation.y += 0.005;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const container = document.getElementById('model-viewer');
        if (container) {
            this.camera.aspect = container.offsetWidth / container.offsetHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        }
    }
}

// Initialize viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure all elements are loaded
    setTimeout(() => {
        new ModelViewer();
    }, 100);
});
