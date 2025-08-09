let scene, camera, renderer, coin;
let scrollProgress = 0;
let targetScrollProgress = 0;
let isAnimating = true;

function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera - ajustar para vista lateral
    camera = new THREE.PerspectiveCamera(75, window.innerWidth * 0.4 / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);
    
    // Create renderer - usar el contenedor específico
    const container = document.getElementById('coin-container');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    // Add lighting - más dramática para la moneda
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffd700, 1.2);
    directionalLight.position.set(3, 5, 3);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    rimLight.position.set(-3, -2, 1);
    scene.add(rimLight);
    
    // Cargar el modelo coin.glb
    loadCoinModel();
    
    // Setup scroll listener
    setupScrollListener();
    
    // Start animation
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function setupScrollListener() {
    let ticking = false;
    
    function updateScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        // Calcular progreso del scroll (0 a 1)
        targetScrollProgress = Math.max(0, Math.min(1, scrollTop / scrollHeight));
        
        ticking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(updateScrollProgress);
            ticking = true;
        }
    });
}

function loadCoinModel() {
    console.log('Iniciando carga del modelo coin.glb...');
    
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader no está disponible');
        createFallbackCoin();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    const possiblePaths = ['./coin.glb', 'coin.glb', '/coin.glb'];
    let currentPathIndex = 0;
    
    function tryLoadPath() {
        const currentPath = possiblePaths[currentPathIndex];
        console.log(`Intentando cargar desde: ${currentPath}`);
        
        loader.load(
            currentPath,
            function(gltf) {
                console.log('¡Archivo coin.glb cargado exitosamente!', gltf);
                
                coin = gltf.scene;
                
                if (!coin.children || coin.children.length === 0) {
                    console.warn('El modelo GLB parece estar vacío');
                    createFallbackCoin();
                    return;
                }
                
                setupCoinProperties();
            },
            function(progress) {
                if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(2);
                    console.log(`Progreso de carga: ${percent}%`);
                }
            },
            function(error) {
                console.error(`Error cargando desde ${currentPath}:`, error);
                
                currentPathIndex++;
                if (currentPathIndex < possiblePaths.length) {
                    console.log('Intentando siguiente ruta...');
                    tryLoadPath();
                } else {
                    console.log('Todas las rutas fallaron, creando moneda de respaldo');
                    createFallbackCoin();
                }
            }
        );
    }
    
    tryLoadPath();
}

function createFallbackCoin() {
    console.log('Creando moneda de respaldo...');
    const geometry = new THREE.CylinderGeometry(1, 1, 0.15, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xffd700,
        shininess: 100,
        metalness: 0.8,
        roughness: 0.2
    });
    coin = new THREE.Mesh(geometry, material);
    setupCoinProperties();
}

function setupCoinProperties() {
    // Ajustar escala y posición inicial
    const box = new THREE.Box3().setFromObject(coin);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    if (maxDimension > 0) {
        const scale = 1.5 / maxDimension;
        coin.scale.setScalar(scale);
    }
    
    // Posición inicial (parte superior de la pantalla)
    coin.position.set(0, 3, 0);
    
    scene.add(coin);
    console.log('Moneda configurada y agregada a la escena');
}

function animate() {
    requestAnimationFrame(animate);
    
    if (coin) {
        // Suavizar el progreso del scroll con interpolación
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.1;
        
        // Calcular posición Y basada en el scroll (de arriba hacia abajo)
        const scrollRange = 8; // Rango total de movimiento
        coin.position.y = 3 - (scrollProgress * scrollRange);
        
        // Rotación continua pero influenciada por el scroll
        const baseRotationSpeed = 0.02;
        const scrollInfluence = Math.abs(targetScrollProgress - scrollProgress) * 0.1;
        
        coin.rotation.y += baseRotationSpeed + scrollInfluence;
        coin.rotation.x += (baseRotationSpeed * 0.3) + (scrollInfluence * 0.5);
        
        // Oscilación lateral sutil para simular caída por aire
        const sideFloat = Math.sin(Date.now() * 0.003) * 0.2;
        coin.position.x = sideFloat * (1 + scrollProgress * 0.5);
        
        // Rotación en Z para efecto de caída más realista
        coin.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
        
        // Pequeña variación en la escala para efecto de "respiración"
        const breathe = 1 + Math.sin(Date.now() * 0.004) * 0.05;
        coin.scale.multiplyScalar(breathe);
        coin.scale.multiplyScalar(1/breathe); // Resetear para el próximo frame
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('coin-container');
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
}

// Initialize the scene
init();
