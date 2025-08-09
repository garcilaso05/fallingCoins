let scene, camera, renderer;
let coins = []; // Array para almacenar todas las monedas
let currentCoinIndex = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;
let isAnimating = true;
let subtitlePositions = [];
let currentRotationTarget = 0;
let transitionProgress = 0;
let isTransitioning = false;

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
    
    // Cargar todas las monedas
    loadAllCoins();
    
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

function loadAllCoins() {
    console.log('Iniciando carga de todas las monedas...');
    
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader no está disponible');
        createFallbackCoins();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    const totalCoins = subtitlePositions.length > 0 ? subtitlePositions.length : 5; // Fallback a 5 monedas
    let coinsLoaded = 0;
    
    for (let i = 0; i < totalCoins; i++) {
        const coinPaths = [`./coin${i + 1}.glb`, `coin${i + 1}.glb`, `/coin${i + 1}.glb`];
        loadCoinWithFallback(loader, coinPaths, i, () => {
            coinsLoaded++;
            if (coinsLoaded === totalCoins) {
                console.log('Todas las monedas cargadas');
                setupInitialCoin();
            }
        });
    }
}

function loadCoinWithFallback(loader, paths, coinIndex, onComplete) {
    let pathIndex = 0;
    
    function tryLoadPath() {
        const currentPath = paths[pathIndex];
        console.log(`Intentando cargar moneda ${coinIndex + 1} desde: ${currentPath}`);
        
        loader.load(
            currentPath,
            function(gltf) {
                console.log(`Moneda ${coinIndex + 1} cargada exitosamente`);
                
                const coin = gltf.scene;
                
                if (!coin.children || coin.children.length === 0) {
                    console.warn(`Moneda ${coinIndex + 1} parece estar vacía`);
                    createFallbackCoin(coinIndex);
                } else {
                    setupCoinProperties(coin, coinIndex);
                }
                
                onComplete();
            },
            function(progress) {
                if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(2);
                    console.log(`Moneda ${coinIndex + 1} - Progreso: ${percent}%`);
                }
            },
            function(error) {
                console.error(`Error cargando moneda ${coinIndex + 1} desde ${currentPath}:`, error);
                
                pathIndex++;
                if (pathIndex < paths.length) {
                    console.log('Intentando siguiente ruta...');
                    tryLoadPath();
                } else {
                    console.log(`Todas las rutas fallaron para moneda ${coinIndex + 1}, creando respaldo`);
                    createFallbackCoin(coinIndex);
                    onComplete();
                }
            }
        );
    }
    
    tryLoadPath();
}

function createFallbackCoins() {
    const totalCoins = 5;
    for (let i = 0; i < totalCoins; i++) {
        createFallbackCoin(i);
    }
    setupInitialCoin();
}

function createFallbackCoin(index) {
    console.log(`Creando moneda de respaldo ${index + 1}...`);
    const geometry = new THREE.CylinderGeometry(1, 1, 0.15, 32);
    
    // Diferentes colores para distinguir las monedas
    const colors = [0xffd700, 0xc0c0c0, 0xcd7f32, 0xff6b35, 0x4ecdc4];
    const material = new THREE.MeshPhongMaterial({ 
        color: colors[index % colors.length],
        shininess: 100,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const coin = new THREE.Mesh(geometry, material);
    setupCoinProperties(coin, index);
}

function setupCoinProperties(coin, index) {
    // Ajustar escala
    const box = new THREE.Box3().setFromObject(coin);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    if (maxDimension > 0) {
        const scale = 1.5 / maxDimension;
        coin.scale.setScalar(scale);
    }
    
    // Posición inicial
    coin.position.set(0, 3, 0);
    
    // Inicialmente invisible excepto la primera
    coin.visible = index === 0;
    
    // Añadir al array de monedas
    coins[index] = coin;
    scene.add(coin);
    
    console.log(`Moneda ${index + 1} configurada`);
}

function setupInitialCoin() {
    if (coins.length > 0 && coins[0]) {
        console.log('Primera moneda lista para animación');
    }
}

function calculateCoinRotation() {
    if (subtitlePositions.length === 0) return { rotation: 0, sectionIndex: 0 };
    
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
        return { rotation: currentSubtitle.rotationTarget, sectionIndex: currentSection };
    }
    
    const sectionProgress = (targetScrollProgress - currentSubtitle.normalizedPosition) / 
                           (nextSubtitle.normalizedPosition - currentSubtitle.normalizedPosition);
    
    // Interpolación suave entre rotaciones (0 a 180º por sección)
    const rotationDifference = nextSubtitle.rotationTarget - currentSubtitle.rotationTarget;
    const targetRotation = currentSubtitle.rotationTarget + (rotationDifference * sectionProgress);
    
    return { 
        rotation: targetRotation, 
        sectionIndex: currentSection,
        sectionProgress: sectionProgress
    };
}

function handleCoinTransition(rotationData) {
    const { sectionIndex, sectionProgress } = rotationData;
    
    // Detectar cuando necesitamos cambiar de moneda
    const shouldTransition = Math.abs(sectionProgress - 0.5) < 0.1; // Cerca del punto medio (90º)
    
    if (shouldTransition && !isTransitioning) {
        const newCoinIndex = sectionIndex % coins.length;
        
        if (newCoinIndex !== currentCoinIndex && coins[newCoinIndex]) {
            startCoinTransition(newCoinIndex);
        }
    }
    
    // Manejar transición activa
    if (isTransitioning) {
        transitionProgress += 0.08;
        
        if (transitionProgress >= 1) {
            completeCoinTransition();
        } else {
            updateTransition();
        }
    }
}

function startCoinTransition(newIndex) {
    console.log(`Iniciando transición de moneda ${currentCoinIndex + 1} a ${newIndex + 1}`);
    
    isTransitioning = true;
    transitionProgress = 0;
    
    // Preparar nueva moneda
    if (coins[newIndex]) {
        coins[newIndex].position.copy(coins[currentCoinIndex].position);
        coins[newIndex].rotation.y = coins[currentCoinIndex].rotation.y;
        coins[newIndex].rotation.x = 0; // Empezar plana
        coins[newIndex].rotation.z = coins[currentCoinIndex].rotation.z;
        coins[newIndex].visible = true;
        
        // Hacer invisible la moneda actual gradualmente
        coins[newIndex].material.opacity = 0;
        coins[newIndex].material.transparent = true;
    }
}

function updateTransition() {
    const oldCoin = coins[currentCoinIndex];
    const newCoinIndex = (currentCoinIndex + 1) % coins.length;
    const newCoin = coins[newCoinIndex];
    
    if (oldCoin && newCoin) {
        // Fade out old coin, fade in new coin
        oldCoin.material.opacity = 1 - transitionProgress;
        newCoin.material.opacity = transitionProgress;
        
        // Sincronizar posiciones
        newCoin.position.copy(oldCoin.position);
        newCoin.rotation.y = oldCoin.rotation.y;
        newCoin.rotation.z = oldCoin.rotation.z;
    }
}

function completeCoinTransition() {
    const oldCoin = coins[currentCoinIndex];
    const newCoinIndex = (currentCoinIndex + 1) % coins.length;
    const newCoin = coins[newCoinIndex];
    
    // Finalizar transición
    if (oldCoin) {
        oldCoin.visible = false;
        oldCoin.material.opacity = 1;
    }
    
    if (newCoin) {
        newCoin.material.opacity = 1;
        newCoin.material.transparent = false;
    }
    
    currentCoinIndex = newCoinIndex;
    isTransitioning = false;
    transitionProgress = 0;
    
    console.log(`Transición completada. Moneda activa: ${currentCoinIndex + 1}`);
}

function animate() {
    requestAnimationFrame(animate);
    
    const currentCoin = coins[currentCoinIndex];
    if (currentCoin) {
        // Suavizar el progreso del scroll con interpolación
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;
        
        // MOVIMIENTO VERTICAL: Solo basado en el scroll
        const scrollRange = 8;
        currentCoin.position.y = 3 - (scrollProgress * scrollRange);
        
        // ROTACIÓN HORIZONTAL: Continua todo el tiempo
        currentCoin.rotation.y += 0.02;
        
        // ROTACIÓN VERTICAL: Basada en los subtítulos
        const rotationData = calculateCoinRotation();
        currentRotationTarget += (rotationData.rotation - currentRotationTarget) * 0.05;
        currentCoin.rotation.x = currentRotationTarget;
        
        // POSICIÓN X: Fija en el centro
        currentCoin.position.x = 0;
        
        // ROTACIÓN Z: Pequeña variación sutil
        currentCoin.rotation.z = Math.sin(Date.now() * 0.001) * 0.05;
        
        // Manejar transiciones entre monedas
        handleCoinTransition(rotationData);
        
        // Sincronizar moneda en transición si existe
        if (isTransitioning) {
            const newCoinIndex = (currentCoinIndex + 1) % coins.length;
            const newCoin = coins[newCoinIndex];
            if (newCoin && newCoin.visible) {
                newCoin.position.y = currentCoin.position.y;
                newCoin.rotation.y = currentCoin.rotation.y;
                newCoin.rotation.z = currentCoin.rotation.z;
            }
        }
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
