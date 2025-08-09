let scene, camera, renderer;
let coins = [];
let currentCoinIndex = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;
let subtitlePositions = [];
let coinsReady = false;
let rotationCounter = 0; // Contador preciso para rotaciones

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
    
    // Primero calcular subtítulos, luego cargar monedas
    calculateSubtitlePositions();
    loadAllCoins();
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
    
    subtitles.forEach((subtitle, index) => {
        const rect = subtitle.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const absolutePosition = rect.top + scrollTop;
        
        // Convertir a progreso normalizado (0-1)
        const normalizedPosition = absolutePosition / document.documentElement.scrollHeight;
        
        subtitlePositions.push({
            element: subtitle,
            normalizedPosition: normalizedPosition,
            absolutePosition: absolutePosition,
            coinIndex: index, // Cada subtítulo corresponde a una moneda
            rotationTarget: (index + 1) * Math.PI // 180º acumulativo por subtítulo
        });
        
        console.log(`Subtítulo ${index}: "${subtitle.textContent.substring(0, 30)}..." en posición ${normalizedPosition.toFixed(3)}`);
    });
    
    console.log(`Total de ${subtitlePositions.length} subtítulos detectados`);
}

// ...existing code...

function loadAllCoins() {
    console.log('Precargando todas las monedas...');
    
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader no está disponible');
        createFallbackCoins();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    const totalCoins = Math.max(subtitlePositions.length + 1, 6); // +1 para moneda inicial
    let coinsLoaded = 0;
    
    console.log(`Cargando ${totalCoins} monedas...`);
    
    for (let i = 0; i < totalCoins; i++) {
        const coinPaths = [`./coin${i + 1}.glb`, `coin${i + 1}.glb`, `/coin${i + 1}.glb`];
        loadCoinWithFallback(loader, coinPaths, i, () => {
            coinsLoaded++;
            console.log(`Monedas cargadas: ${coinsLoaded}/${totalCoins}`);
            if (coinsLoaded === totalCoins) {
                console.log('Todas las monedas precargadas exitosamente');
                coinsReady = true;
                setupInitialCoin();
            }
        });
    }
}

// ...existing code...

function setupCoinProperties(coin, index) {
    // ...existing code...
    
    // Posición inicial - la moneda empieza visible al lado del título
    coin.position.set(0, 0, 0);
    coin.rotation.set(0, 0, 0);
    
    // Solo la primera moneda visible inicialmente
    coin.visible = false;
    
    // Añadir al array
    coins[index] = coin;
    scene.add(coin);
    
    console.log(`Moneda ${index + 1} precargada y lista`);
}

function setupInitialCoin() {
    if (coins.length > 0 && coins[0]) {
        coins[0].visible = true;
        coins[0].rotation.x = 0; // Mostrar cara inicial
        currentCoinIndex = 0;
        rotationCounter = 0;
        console.log('Primera moneda activada mostrando su cara');
    }
}

function calculatePreciseRotation() {
    // Encontrar entre qué subtítulos estamos
    let currentSection = -1;
    let nextSection = 0;
    let sectionProgress = 0;
    
    // Determinar sección actual basándose en scroll
    for (let i = 0; i < subtitlePositions.length; i++) {
        if (targetScrollProgress <= subtitlePositions[i].normalizedPosition) {
            nextSection = i;
            currentSection = i - 1;
            break;
        }
    }
    
    // Si estamos después del último subtítulo
    if (currentSection === -1 && nextSection === 0) {
        currentSection = subtitlePositions.length - 1;
        nextSection = subtitlePositions.length;
    }
    
    // Calcular progreso dentro de la sección
    if (currentSection >= 0 && nextSection < subtitlePositions.length) {
        const startPos = currentSection >= 0 ? subtitlePositions[currentSection].normalizedPosition : 0;
        const endPos = subtitlePositions[nextSection].normalizedPosition;
        const sectionSize = endPos - startPos;
        
        if (sectionSize > 0) {
            sectionProgress = (targetScrollProgress - startPos) / sectionSize;
            sectionProgress = Math.max(0, Math.min(1, sectionProgress));
        }
    } else if (nextSection >= subtitlePositions.length) {
        // Después del último subtítulo
        sectionProgress = 1;
        nextSection = subtitlePositions.length - 1;
    }
    
    // Calcular rotación exacta: cada sección = exactamente 180°
    const baseRotation = Math.max(0, currentSection + 1) * Math.PI;
    const currentRotation = baseRotation + (sectionProgress * Math.PI);
    
    return {
        rotation: currentRotation,
        sectionIndex: Math.max(0, nextSection),
        sectionProgress: sectionProgress,
        shouldChangeCoin: sectionProgress >= 0.95 && nextSection !== currentCoinIndex
    };
}

function changeCoinPrecisely(newIndex) {
    if (newIndex >= coins.length || !coins[newIndex]) return;
    
    console.log(`Cambio preciso: moneda ${currentCoinIndex + 1} → ${newIndex + 1}`);
    
    // Ocultar moneda actual
    if (coins[currentCoinIndex]) {
        coins[currentCoinIndex].visible = false;
    }
    
    // Mostrar nueva moneda
    const oldCoin = coins[currentCoinIndex];
    const newCoin = coins[newIndex];
    
    // Sincronizar posición Y
    newCoin.position.y = oldCoin.position.y;
    newCoin.position.x = 0;
    newCoin.position.z = 0;
    
    // Mantener rotación Y continua
    newCoin.rotation.y = oldCoin.rotation.y;
    newCoin.rotation.x = 0; // Nueva moneda empieza plana (cara visible)
    newCoin.rotation.z = 0;
    
    newCoin.visible = true;
    currentCoinIndex = newIndex;
    
    // Resetear contador de rotación para la nueva moneda
    rotationCounter = newIndex * Math.PI;
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!coinsReady || !coins[currentCoinIndex]) return;
    
    const currentCoin = coins[currentCoinIndex];
    
    // Suavizar scroll con interpolación más responsive
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.12;
    
    // MOVIMIENTO VERTICAL: Más amplio para dar más tiempo a las rotaciones
    const scrollRange = 12;
    currentCoin.position.y = 2 - (scrollProgress * scrollRange);
    
    // ROTACIÓN HORIZONTAL: Continua y suave
    currentCoin.rotation.y += 0.015;
    
    // ROTACIÓN VERTICAL: Exactamente 180° por sección
    const rotationData = calculatePreciseRotation();
    
    // Interpolar suavemente hacia la rotación objetivo
    const targetRotation = rotationData.rotation;
    rotationCounter += (targetRotation - rotationCounter) * 0.08;
    currentCoin.rotation.x = rotationCounter;
    
    // POSICIÓN X: Centrada
    currentCoin.position.x = 0;
    
    // Verificar cambio de moneda cuando esté casi de canto (95% de 180°)
    if (rotationData.shouldChangeCoin) {
        changeCoinPrecisely(rotationData.sectionIndex);
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('coin-container');
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    
    // Recalcular posiciones de subtítulos después del resize
    setTimeout(calculateSubtitlePositions, 200);
}

// Initialize the scene
init();
