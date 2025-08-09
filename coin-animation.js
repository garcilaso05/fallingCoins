let scene, camera, renderer, coin;
let scrollProgress = 0;
let targetScrollProgress = 0;
let isAnimating = true;
let subtitlePositions = [];
let currentRotationTarget = 0;

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
    
    // Calculate subtitle positions and setup scroll listener
    calculateSubtitlePositions();
    setupScrollListener();
    
    // Start animation
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function calculateSubtitlePositions() {
    // Obtener todos los h2 (subtítulos)
    const subtitles = document.querySelectorAll('.content h2');
    subtitlePositions = [];
    
    const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    subtitles.forEach((subtitle, index) => {
        const rect = subtitle.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const absolutePosition = rect.top + scrollTop;
        
        // Convertir a progreso normalizado (0-1)
        const normalizedPosition = absolutePosition / (document.documentElement.scrollHeight);
        
        subtitlePositions.push({
            element: subtitle,
            normalizedPosition: normalizedPosition,
            absolutePosition: absolutePosition,
            rotationTarget: index * Math.PI // 180º por cada subtítulo
        });
        
        console.log(`Subtítulo ${index}: "${subtitle.textContent}" en posición ${normalizedPosition.toFixed(3)}`);
    });
    
    // Añadir posición inicial (arriba de todo)
    subtitlePositions.unshift({
        element: null,
        normalizedPosition: 0,
        absolutePosition: 0,
        rotationTarget: 0
    });
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
    
    // Recalcular posiciones en resize
    window.addEventListener('resize', function() {
        setTimeout(calculateSubtitlePositions, 100);
    });
}

function calculateCoinRotation() {
    if (subtitlePositions.length === 0) return 0;
    
    // Encontrar entre qué subtítulos estamos
    let currentSection = 0;
    for (let i = 0; i < subtitlePositions.length - 1; i++) {
        if (targetScrollProgress >= subtitlePositions[i].normalizedPosition && 
            targetScrollProgress <= subtitlePositions[i + 1].normalizedPosition) {
            currentSection = i;
            break;
        }
    }
    
    // Si estamos después del último subtítulo
    if (targetScrollProgress > subtitlePositions[subtitlePositions.length - 1].normalizedPosition) {
        currentSection = subtitlePositions.length - 1;
    }
    
    // Calcular progreso entre los dos subtítulos
    const currentSubtitle = subtitlePositions[currentSection];
    const nextSubtitle = subtitlePositions[currentSection + 1];
    
    if (!nextSubtitle) {
        return currentSubtitle.rotationTarget;
    }
    
    const sectionProgress = (targetScrollProgress - currentSubtitle.normalizedPosition) / 
                           (nextSubtitle.normalizedPosition - currentSubtitle.normalizedPosition);
    
    // Interpolación suave entre rotaciones (0 a 180º por sección)
    const rotationDifference = nextSubtitle.rotationTarget - currentSubtitle.rotationTarget;
    const targetRotation = currentSubtitle.rotationTarget + (rotationDifference * sectionProgress);
    
    return targetRotation;
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
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;
        
        // MOVIMIENTO VERTICAL: Solo basado en el scroll
        const scrollRange = 8; // Rango total de movimiento vertical
        coin.position.y = 3 - (scrollProgress * scrollRange);
        
        // ROTACIÓN HORIZONTAL: Continua todo el tiempo
        coin.rotation.y += 0.02;
        
        // ROTACIÓN VERTICAL: Basada en los subtítulos (180º entre cada uno)
        const targetVerticalRotation = calculateCoinRotation();
        currentRotationTarget += (targetVerticalRotation - currentRotationTarget) * 0.05;
        coin.rotation.x = currentRotationTarget;
        
        // POSICIÓN X: Fija en el centro (sin oscilación lateral)
        coin.position.x = 0;
        
        // ROTACIÓN Z: Pequeña variación sutil para naturalidad
        coin.rotation.z = Math.sin(Date.now() * 0.001) * 0.05;
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('coin-container');
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    
    // Recalcular posiciones de subtítulos después del resize
    setTimeout(calculateSubtitlePositions, 100);
}

// Initialize the scene
init();
