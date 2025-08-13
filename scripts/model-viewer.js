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
        this.loadedCount = 0;
        
        // Get configuration from script tag
        const script = document.querySelector('script[data-models]');
        this.modelPrefix = script.getAttribute('data-models');
        this.modelCount = parseInt(script.getAttribute('data-count'));
        
        // Distancia base de cámara según tipo de modelo
        this.baseCameraZ = this.modelPrefix === 'SQL' ? 6 : 4;
        
        console.log(`Inicializando ModelViewer: ${this.modelPrefix}, count: ${this.modelCount}`);
        
        this.init();
        this.setupControls();
        this.startLoadingModels();
    }
    
    init() {
        const container = document.getElementById('model-viewer');
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera - AJUSTAR POSICIÓN PARA MEJOR VISTA
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        // Usar distancia configurable
        this.camera.position.set(0, 1.2, this.baseCameraZ);
        this.camera.lookAt(0, 0.5, 0);
        
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
        
        // Add lights - MEJORAR ILUMINACIÓN
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 8, 5);
        directionalLight1.castShadow = true;
        directionalLight1.shadow.mapSize.width = 2048;
        directionalLight1.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.4);
        directionalLight2.position.set(-5, 2, -3);
        this.scene.add(directionalLight2);
        
        const directionalLight3 = new THREE.DirectionalLight(0xff6644, 0.3);
        directionalLight3.position.set(2, -2, -5);
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
    
    startLoadingModels() {
        this.showLoading();
        
        // Initialize arrays
        for (let i = 0; i < this.modelCount; i++) {
            this.models[i] = null;
            this.animations[i] = [];
            this.mixers[i] = null;
        }
        
        // Create first fallback model immediately and show it
        this.models[0] = this.createFallbackModel(1);
        this.setupModelProperties(this.models[0], 0);
        this.showModel(0);
        this.hideLoading();
        this.updateControls();
        
        // Load real models in the background one by one
        this.loadModelsSequentially();
    }
    
    async loadModelsSequentially() {
        console.log('🔄 Iniciando carga secuencial de modelos...');
        
        // Check if GLTFLoader is available
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('❌ GLTFLoader no disponible, usando solo modelos de respaldo');
            this.createAllFallbackModels();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        for (let i = 0; i < this.modelCount; i++) {
            const modelNumber = i + 1;
            const modelName = `${this.modelPrefix}${modelNumber}`;
            
            // Rutas posibles donde buscar el modelo
            const possiblePaths = [
                `./models/${modelName}.glb`,
                `./assets/${modelName}.glb`,
                `./${modelName}.glb`,
                `models/${modelName}.glb`,
                `assets/${modelName}.glb`,
                `${modelName}.glb`
            ];
            
            console.log(`🔍 Intentando cargar modelo ${modelNumber}: ${modelName}`);
            console.log(`📂 Rutas a probar:`, possiblePaths);
            
            let modelLoaded = false;
            
            for (const modelPath of possiblePaths) {
                try {
                    console.log(`📥 Probando ruta: ${modelPath}`);
                    const gltf = await this.loadModel(loader, modelPath);
                    
                    console.log(`✅ ¡Modelo ${modelNumber} cargado desde: ${modelPath}!`);
                    
                    // Replace fallback or create new model
                    if (this.models[i] && this.currentIndex === i) {
                        // Currently showing, need to replace carefully
                        this.scene.remove(this.models[i]);
                    }
                    
                    this.models[i] = gltf.scene;
                    
                    // Store animations if any
                    if (gltf.animations && gltf.animations.length > 0) {
                        this.animations[i] = gltf.animations;
                        console.log(`🎬 Modelo ${modelNumber} tiene ${gltf.animations.length} animaciones`);
                    } else {
                        this.animations[i] = [];
                        console.log(`📝 Modelo ${modelNumber} sin animaciones`);
                    }
                    
                    // Setup model properties
                    this.setupModelProperties(this.models[i], i);
                    
                    // If this is the current model, show it
                    if (this.currentIndex === i) {
                        this.showModel(i);
                    }
                    
                    this.loadedCount++;
                    modelLoaded = true;
                    break; // Salir del loop de rutas si se cargó correctamente
                    
                } catch (error) {
                    console.log(`❌ Error con ${modelPath}: ${error.message}`);
                    continue; // Probar siguiente ruta
                }
            }
            
            if (!modelLoaded) {
                console.log(`⚠️ No se pudo cargar ${modelName} desde ninguna ruta, manteniendo fallback`);
                
                // Create fallback if not exists
                if (!this.models[i]) {
                    this.models[i] = this.createFallbackModel(modelNumber);
                    this.setupModelProperties(this.models[i], i);
                }
            }
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log(`✨ Carga completada: ${this.loadedCount}/${this.modelCount} modelos reales cargados`);
    }
    
    createAllFallbackModels() {
        console.log('🎨 Creando todos los modelos de respaldo...');
        
        for (let i = 0; i < this.modelCount; i++) {
            if (!this.models[i]) {
                this.models[i] = this.createFallbackModel(i + 1);
                this.setupModelProperties(this.models[i], i);
            }
        }
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
    
    createFallbackModel(index) {
        const colors = [0x3b82f6, 0x10b981, 0x8b5cf6, 0xf59e0b, 0x6366f1];
        
        // Create a more interesting fallback
        const group = new THREE.Group();
        
        // Main shape - TAMAÑOS CONSISTENTES
        const geometry = this.modelPrefix === 'M' ? 
            new THREE.SphereGeometry(1.0, 16, 16) : // Esferas estándar para mascotas
            new THREE.BoxGeometry(1.2, 1.2, 1.2);   // Cubos estándar para SQL
            
        const material = new THREE.MeshPhongMaterial({ 
            color: colors[(index - 1) % colors.length],
            shininess: 100
        });
        
        const mainMesh = new THREE.Mesh(geometry, material);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;
        group.add(mainMesh);
        
        // Add some details - proporcionales
        const detailGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const detailMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            opacity: 0.8,
            transparent: true
        });
        
        for (let i = 0; i < 3; i++) {
            const detail = new THREE.Mesh(detailGeometry, detailMaterial);
            detail.position.set(
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5
            );
            group.add(detail);
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
        
        console.log(`🎨 Modelo fallback ${index} (${this.modelPrefix}) creado - tamaño equilibrado`);
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
        
        // 1. Centrar el modelo en torno al origen
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center); // Ahora el centro geométrico queda en (0,0,0)
        
        // 2. Calcular tamaño máximo original
        const size = box.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z) || 1;
        
        // 3. Calcular dimensiones visibles con la cámara actual
        const distance = this.camera.position.z; // Aproximación (modelo centrado en z=0)
        const fovRad = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
        const visibleHeight = 2 * distance * Math.tan(fovRad);
        const visibleWidth = visibleHeight * this.camera.aspect;
        
        // 4. Margen (fill ratio)
        const fill = 0.85; // 85% del área visible
        const maxFit = Math.min(visibleHeight, visibleWidth) * fill;
        
        // 5. Escala adaptativa
        const scale = maxFit / maxDimension;
        model.scale.setScalar(scale);
        
        // 6. Recalcular bounding box tras escalar para apoyar base en y=0
        const scaledBox = new THREE.Box3().setFromObject(model);
        const minY = scaledBox.min.y;
        model.position.y -= minY; // Base a y=0
        
        // 7. Guardar oculto inicialmente
        model.visible = false;
        
        console.log(
            `📏 [${this.modelPrefix}] Modelo ${index + 1}: maxDim=${maxDimension.toFixed(3)} ` +
            `visH=${visibleHeight.toFixed(3)} visW=${visibleWidth.toFixed(3)} scale=${scale.toFixed(3)}`
        );
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
            
            // Setup animations if available - NO ROTACIÓN MANUAL
            this.setupAnimations(index);
            
            // Update UI
            this.updateUI();
            this.updateControls();
            
            console.log(`👁️ Mostrando modelo ${index + 1}: ${this.modelPrefix}${index + 1}`);
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
                console.log(`🎬 Reproduciendo animación ${clipIndex + 1} de ${clip.name || 'Sin nombre'} para modelo ${index + 1}`);
            });
            
            console.log(`✨ ${this.animations[index].length} animaciones iniciadas para modelo ${index + 1}`);
        } else {
            console.log(`📝 Modelo ${index + 1} sin animaciones para reproducir`);
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
            Preparando visualizador...
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
        
        // Update animations - SOLO LAS ANIMACIONES DEL GLB, NO ROTACIÓN MANUAL
        if (this.mixers[this.currentIndex]) {
            this.mixers[this.currentIndex].update(delta);
        }
        
        // NO rotar manualmente el modelo - solo reproducir animaciones programadas
        
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
        try {
            new ModelViewer();
        } catch (error) {
            console.error('💥 Error inicializando ModelViewer:', error);
        }
    }, 100);
});
