class MinecraftViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.models = [];
        this.currentIndex = 0;
        this.currentModel = null;
        this.modelCount = 5; // Cambiado a 5 modelos
        
        // Mouse/Touch controls
        this.isLeftMouseDown = false;
        this.isRightMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.currentRotationX = 0;
        this.currentRotationY = 0;
        
        // Hold-to-change system (solo clic derecho)
        this.isHolding = false;
        this.holdStartTime = 0;
        this.holdDuration = 2000; // 2 segundos
        this.holdProgress = 0;
        this.isChanging = false;
        
        this.init();
        this.setupControls();
        this.loadModels();
    }
    
    init() {
        const container = document.getElementById('minecraft-viewer');
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.camera.position.set(0, 2, 5);
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(10, 10, 5);
        directionalLight1.castShadow = true;
        directionalLight1.shadow.mapSize.width = 2048;
        directionalLight1.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.3);
        directionalLight2.position.set(-5, 3, -5);
        this.scene.add(directionalLight2);
        
        // Start animation
        this.animate();
        
        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupControls() {
        const container = document.getElementById('minecraft-viewer');
        
        // Mouse events - separar clic izquierdo y derecho
        container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        container.addEventListener('mouseup', (e) => this.onMouseUp(e));
        container.addEventListener('mouseleave', (e) => this.onMouseUp(e));
        
        // Touch events (solo rotación)
        container.addEventListener('touchstart', (e) => this.onTouchStart(e));
        container.addEventListener('touchmove', (e) => this.onTouchMove(e));
        container.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Prevent context menu
        container.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    onMouseDown(event) {
        if (event.button === 0) { // Clic izquierdo - solo rotación
            this.isLeftMouseDown = true;
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
            console.log('🖱️ Clic izquierdo - modo rotación');
        } else if (event.button === 2) { // Clic derecho - cambio de modelo
            this.isRightMouseDown = true;
            this.startHold();
            console.log('🖱️ Clic derecho - iniciando hold para cambio');
        }
    }
    
    onMouseMove(event) {
        // Solo rotar con clic izquierdo
        if (!this.isLeftMouseDown) return;
        
        const deltaX = event.clientX - this.mouseX;
        const deltaY = event.clientY - this.mouseY;
        
        this.targetRotationY += deltaX * 0.01;
        this.targetRotationX += deltaY * 0.01;
        
        // Clamp X rotation
        this.targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.targetRotationX));
        
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }
    
    onMouseUp(event) {
        if (event.button === 0) { // Clic izquierdo
            this.isLeftMouseDown = false;
            console.log('🖱️ Clic izquierdo liberado');
        } else if (event.button === 2) { // Clic derecho
            this.isRightMouseDown = false;
            this.stopHold();
            console.log('🖱️ Clic derecho liberado');
        }
    }
    
    onTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.isLeftMouseDown = true; // Touch siempre rota
        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
        console.log('👆 Touch iniciado - modo rotación');
    }
    
    onTouchMove(event) {
        event.preventDefault();
        if (!this.isLeftMouseDown) return;
        
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.mouseX;
        const deltaY = touch.clientY - this.mouseY;
        
        this.targetRotationY += deltaX * 0.01;
        this.targetRotationX += deltaY * 0.01;
        
        this.targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.targetRotationX));
        
        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        this.isLeftMouseDown = false;
        console.log('👆 Touch terminado');
    }
    
    startHold() {
        this.isHolding = true;
        this.holdStartTime = Date.now();
        this.holdProgress = 0;
        
        const container = document.getElementById('minecraft-viewer');
        const overlay = document.getElementById('viewer-overlay');
        
        container.classList.add('holding');
        overlay.classList.add('active');
        
        console.log('🖱️ Hold iniciado (clic derecho)');
    }
    
    stopHold() {
        if (!this.isHolding) return;
        
        this.isHolding = false;
        this.holdProgress = 0;
        
        const container = document.getElementById('minecraft-viewer');
        const overlay = document.getElementById('viewer-overlay');
        const progressCircle = document.getElementById('progress-circle');
        
        container.classList.remove('holding');
        overlay.classList.remove('active');
        progressCircle.style.strokeDashoffset = '283';
        
        console.log('🖱️ Hold cancelado');
    }
    
    updateHoldProgress() {
        if (!this.isHolding) return;
        
        const elapsed = Date.now() - this.holdStartTime;
        this.holdProgress = elapsed / this.holdDuration;
        
        // Update progress ring
        const progressCircle = document.getElementById('progress-circle');
        const circumference = 283; // 2 * π * 45
        const offset = circumference - (this.holdProgress * circumference);
        progressCircle.style.strokeDashoffset = offset;
        
        // Check if completed
        if (this.holdProgress >= 1 && !this.isChanging) {
            this.changeModel();
        }
    }
    
    async changeModel() {
        this.isChanging = true;
        console.log('🔄 Cambiando modelo...');
        
        // Next model
        this.currentIndex = (this.currentIndex + 1) % this.modelCount;
        
        // Show new model
        this.showModel(this.currentIndex);
        
        // Reset hold state
        this.stopHold();
        
        // Brief delay to prevent immediate re-triggering
        setTimeout(() => {
            this.isChanging = false;
        }, 500);
    }
    
    async loadModels() {
        this.showLoading();
        
        // Initialize arrays
        for (let i = 0; i < this.modelCount; i++) {
            this.models[i] = null;
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
        console.log('🎮 Iniciando carga de modelos Minecraft...');
        
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('❌ GLTFLoader no disponible');
            this.createAllFallbackModels();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        for (let i = 0; i < this.modelCount; i++) {
            const modelNumber = i + 1;
            const modelName = `minecraft${modelNumber}`;
            
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
                    const gltf = await this.loadModel(loader, modelPath);
                    
                    console.log(`✅ ${modelName} cargado desde: ${modelPath}`);
                    
                    // Replace current model if it's showing
                    if (this.currentIndex === i && this.models[i]) {
                        this.scene.remove(this.models[i]);
                    }
                    
                    this.models[i] = gltf.scene;
                    this.setupModelProperties(this.models[i], i);
                    
                    // Show if current
                    if (this.currentIndex === i) {
                        this.showModel(i);
                    }
                    
                    modelLoaded = true;
                    break;
                    
                } catch (error) {
                    continue;
                }
            }
            
            if (!modelLoaded) {
                console.log(`⚠️ No se pudo cargar ${modelName}, usando fallback`);
                if (!this.models[i]) {
                    this.models[i] = this.createFallbackModel(modelNumber);
                    this.setupModelProperties(this.models[i], i);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('✨ Carga de modelos Minecraft completada');
    }
    
    loadModel(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(path, resolve, undefined, reject);
        });
    }
    
    createFallbackModel(index) {
        const colors = [
            0x8B4513, 0x228B22, 0x4169E1, 0xFF6347, 0x9932CC,
            0xFF8C00, 0x20B2AA, 0xDC143C, 0x32CD32, 0x1E90FF
        ];
        
        const group = new THREE.Group();
        
        // Main cube (Minecraft style)
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({ 
            color: colors[(index - 1) % colors.length],
            shininess: 30
        });
        
        const mainCube = new THREE.Mesh(geometry, material);
        mainCube.castShadow = true;
        mainCube.receiveShadow = true;
        group.add(mainCube);
        
        // Add some smaller cubes for detail
        for (let i = 0; i < 3; i++) {
            const smallGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            const smallMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffffff,
                opacity: 0.8,
                transparent: true
            });
            
            const smallCube = new THREE.Mesh(smallGeometry, smallMaterial);
            smallCube.position.set(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3
            );
            group.add(smallCube);
        }
        
        // Add edges for that Minecraft look
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000, 
            linewidth: 2
        });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        group.add(wireframe);
        
        console.log(`🎮 Modelo fallback Minecraft ${index} creado`);
        return group;
    }
    
    createAllFallbackModels() {
        for (let i = 0; i < this.modelCount; i++) {
            if (!this.models[i]) {
                this.models[i] = this.createFallbackModel(i + 1);
                this.setupModelProperties(this.models[i], i);
            }
        }
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
        
        // Scale to fit viewer nicely
        const maxDimension = Math.max(size.x, size.y, size.z);
        const targetSize = 3.5; // Larger for Minecraft models
        
        if (maxDimension > 0) {
            const scale = targetSize / maxDimension;
            model.scale.setScalar(scale);
        }
        
        // Position slightly above ground
        model.position.y = -center.y * model.scale.x + 0.2;
        
        model.visible = false;
        
        console.log(`📦 Modelo ${index + 1} configurado (escala: ${(targetSize / maxDimension).toFixed(3)})`);
    }
    
    showModel(index) {
        // Hide all models
        this.models.forEach(model => {
            if (model) {
                model.visible = false;
                this.scene.remove(model);
            }
        });
        
        // Show selected model
        this.currentModel = this.models[index];
        if (this.currentModel) {
            this.currentModel.visible = true;
            this.scene.add(this.currentModel);
            
            // Reset rotation to current state
            this.currentModel.rotation.x = this.currentRotationX;
            this.currentModel.rotation.y = this.currentRotationY;
            
            this.updateUI();
            console.log(`👁️ Mostrando minecraft${index + 1}`);
        }
    }
    
    updateUI() {
        const modelName = document.getElementById('model-name');
        const modelCounter = document.getElementById('model-counter');
        
        if (modelName) {
            modelName.textContent = `minecraft${this.currentIndex + 1}`;
        }
        if (modelCounter) {
            modelCounter.textContent = `${this.currentIndex + 1} / ${this.modelCount}`;
        }
    }
    
    showLoading() {
        const container = document.getElementById('minecraft-viewer');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'minecraft-loading';
        loadingDiv.innerHTML = `
            <div class="minecraft-loading-spinner"></div>
            <span>Cargando modelos...</span>
        `;
        container.appendChild(loadingDiv);
    }
    
    hideLoading() {
        const loadingDiv = document.querySelector('.minecraft-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update hold progress solo si hay clic derecho
        if (this.isRightMouseDown) {
            this.updateHoldProgress();
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
        const container = document.getElementById('minecraft-viewer');
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
            new MinecraftViewer();
        } catch (error) {
            console.error('💥 Error inicializando MinecraftViewer:', error);
        }
    }, 100);
});
