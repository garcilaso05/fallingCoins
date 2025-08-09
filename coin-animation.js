let scene, camera, renderer;
let coins = [];
let currentCoinIndex = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;
let coinsReady = false;
let rotationRanges = []; // Array con los rangos de rotación para cada moneda
let lastScrollTop = 0;

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
    
    // Crear monedas y calcular rangos
    createFallbackCoins();
    calculateRotationRanges();
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
        lastScrollTop = scrollTop;
        ticking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(updateScrollProgress);
            ticking = true;
        }
    });
}

function calculateRotationRanges() {
    console.log('Calculando rangos de rotación...');
    
    // Obtener posiciones de elementos clave
    const title = document.querySelector('.content h1');
    const subtitles = document.querySelectorAll('.content h2');
    
    if (!title) {
        console.error('No se encontró el título');
        return;
    }
    
    rotationRanges = [];
    
    // Calcular posición del título (inicio en 0°)
    const titleRect = title.getBoundingClientRect();
    const titleCenter = titleRect.top + window.pageYOffset + (titleRect.height / 2);
    
    console.log(`Título centrado en: ${titleCenter}px`);
    
    // Primera moneda: desde 0° (título) hasta 180° (primer subtítulo)
    if (subtitles.length > 0) {
        const firstSubtitleRect = subtitles[0].getBoundingClientRect();
        const firstSubtitleCenter = firstSubtitleRect.top + window.pageYOffset + (firstSubtitleRect.height / 2);
        
        rotationRanges.push({
            coinIndex: 0,
            startPixel: titleCenter,
            endPixel: firstSubtitleCenter,
            startAngle: 0, // 0°
            endAngle: Math.PI, // 180°
            direction: 'forward'
        });
        
        console.log(`Moneda 1: ${titleCenter}px (0°) → ${firstSubtitleCenter}px (180°)`);
    }
    
    // Resto de monedas: alternar entre 180°→360° y 0°→180°
    for (let i = 0; i < subtitles.length - 1; i++) {
        const currentSubtitleRect = subtitles[i].getBoundingClientRect();
        const nextSubtitleRect = subtitles[i + 1].getBoundingClientRect();
        
        const currentCenter = currentSubtitleRect.top + window.pageYOffset + (currentSubtitleRect.height / 2);
        const nextCenter = nextSubtitleRect.top + window.pageYOffset + (nextSubtitleRect.height / 2);
        
        // Alternar: par = 180°→360°(0°), impar = 0°→180°
        const isEven = i % 2 === 0;
        
        rotationRanges.push({
            coinIndex: i + 1,
            startPixel: currentCenter,
            endPixel: nextCenter,
            startAngle: isEven ? Math.PI : 0, // 180° o 0°
            endAngle: isEven ? Math.PI * 2 : Math.PI, // 360° o 180°
            direction: isEven ? 'forward' : 'forward'
        });
        
        console.log(`Moneda ${i + 2}: ${currentCenter}px (${isEven ? '180°' : '0°'}) → ${nextCenter}px (${isEven ? '360°' : '180°'})`);
    }
    
    // Última moneda: desde último subtítulo hasta el final
    if (subtitles.length > 0) {
        const lastSubtitleRect = subtitles[subtitles.length - 1].getBoundingClientRect();
        const lastCenter = lastSubtitleRect.top + window.pageYOffset + (lastSubtitleRect.height / 2);
        const documentHeight = document.documentElement.scrollHeight;
        
        const isLastEven = (subtitles.length - 1) % 2 === 0;
        
        rotationRanges.push({
            coinIndex: subtitles.length,
            startPixel: lastCenter,
            endPixel: documentHeight,
            startAngle: isLastEven ? 0 : Math.PI,
            endAngle: isLastEven ? Math.PI : Math.PI * 2,
            direction: 'forward'
        });
        
        console.log(`Moneda final: ${lastCenter}px → ${documentHeight}px`);
    }
    
    console.log('Rangos calculados:', rotationRanges);
}

function getCurrentCoinAndRotation(scrollTop) {
    // Encontrar en qué rango estamos
    for (let i = 0; i < rotationRanges.length; i++) {
        const range = rotationRanges[i];
        
        if (scrollTop >= range.startPixel && scrollTop <= range.endPixel) {
            // Calcular progreso dentro del rango (0 a 1)
            const progress = (scrollTop - range.startPixel) / (range.endPixel - range.startPixel);
            const clampedProgress = Math.max(0, Math.min(1, progress));
            
            // Calcular ángulo interpolado
            const angleDiff = range.endAngle - range.startAngle;
            let currentAngle = range.startAngle + (angleDiff * clampedProgress);
            
            // Normalizar ángulo a rango 0-2π
            currentAngle = currentAngle % (Math.PI * 2);
            if (currentAngle < 0) currentAngle += Math.PI * 2;
            
            // Calcular posición Y suave de la moneda
            const totalDocumentHeight = document.documentElement.scrollHeight;
            const viewportHeight = window.innerHeight;
            
            // Posición Y que se desliza suavemente de arriba a abajo
            const scrollPercent = scrollTop / (totalDocumentHeight - viewportHeight);
            const coinY = 3 - (scrollPercent * 6); // De Y=3 a Y=-3
            
            return {
                coinIndex: range.coinIndex,
                rotation: currentAngle,
                positionY: Math.max(-3, Math.min(3, coinY)), // Limitar rango
                progress: clampedProgress,
                range: range
            };
        }
    }
    
    // Si estamos antes del primer rango, mostrar primera moneda a 0°
    if (scrollTop < rotationRanges[0]?.startPixel) {
        return {
            coinIndex: 0,
            rotation: 0, // 0°
            positionY: 3,
            progress: 0
        };
    }
    
    // Si estamos después del último rango, mostrar última moneda
    const lastRange = rotationRanges[rotationRanges.length - 1];
    return {
        coinIndex: lastRange.coinIndex,
        rotation: lastRange.endAngle % (Math.PI * 2),
        positionY: -3,
        progress: 1
    };
}

function loadAllCoins() {
    console.log('Intentando cargar monedas GLB...');
    
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.log('GLTFLoader no disponible, usando monedas de respaldo');
        return; // Las monedas de respaldo ya están creadas
    }
    
    const loader = new THREE.GLTFLoader();
    const coinNames = ['esql', 'reloj', 'excel']; // Basado en #glb3D.txt
    
    // Intentar cargar solo las 3 monedas reales
    for (let i = 0; i < coinNames.length; i++) {
        const coinPaths = [`./coin${i + 1}.glb`, `coin${i + 1}.glb`];
        
        loadCoinWithFallback(loader, coinPaths, i, (success) => {
            if (success) {
                console.log(`Moneda GLB ${i + 1} (${coinNames[i]}) cargada y reemplazada`);
            }
        });
    }
}

function loadCoinWithFallback(loader, paths, coinIndex, onComplete) {
    let pathIndex = 0;
    
    function tryLoadPath() {
        const currentPath = paths[pathIndex];
        console.log(`Intentando cargar: ${currentPath}`);
        
        loader.load(
            currentPath,
            function(gltf) {
                console.log(`¡GLB cargado! Reemplazando moneda ${coinIndex + 1}`);
                
                // Remover moneda de respaldo actual
                if (coins[coinIndex]) {
                    scene.remove(coins[coinIndex]);
                }
                
                // Configurar nueva moneda GLB
                setupCoinProperties(gltf.scene, coinIndex);
                onComplete(true);
            },
            undefined,
            function(error) {
                console.log(`Error cargando ${currentPath}: ${error.message}`);
                pathIndex++;
                if (pathIndex < paths.length) {
                    tryLoadPath();
                } else {
                    console.log(`Manteniendo moneda de respaldo ${coinIndex + 1}`);
                    onComplete(false);
                }
            }
        );
    }
    
    tryLoadPath();
}

function createFallbackCoins() {
    console.log('Creando monedas de respaldo inmediatamente...');
    
    const coinData = [
        { color: 0xffd700, name: 'SQL' },
        { color: 0xc0c0c0, name: 'TIME' },
        { color: 0xcd7f32, name: 'XLS' },
        { color: 0xff6b35, name: 'COIN4' },
        { color: 0x4ecdc4, name: 'COIN5' },
        { color: 0x9b59b6, name: 'COIN6' }
    ];
    
    for (let i = 0; i < 6; i++) {
        createFallbackCoin(i, coinData[i]);
    }
    
    coinsReady = true;
    setupInitialCoin();
    console.log('6 monedas de respaldo creadas y listas');
}

function createFallbackCoin(index, data) {
    // Crear geometría de moneda
    const geometry = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: data.color,
        shininess: 100,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const coin = new THREE.Mesh(geometry, material);
    
    // Añadir texto en la moneda (opcional)
    const textGeometry = new THREE.RingGeometry(0.3, 1.0, 8);
    const textMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.3
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.rotation.x = Math.PI / 2;
    textMesh.position.y = 0.11;
    coin.add(textMesh);
    
    setupCoinProperties(coin, index);
    console.log(`Moneda respaldo ${index + 1} (${data.name}) creada`);
}

function setupCoinProperties(coin, index) {
    // Ajustar escala si es necesario
    const box = new THREE.Box3().setFromObject(coin);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    if (maxDimension > 2.5) { // Solo escalar si es muy grande
        const scale = 2.0 / maxDimension;
        coin.scale.setScalar(scale);
    }
    
    // Posición inicial visible
    coin.position.set(0, 0, 0);
    coin.rotation.set(0, 0, 0);
    
    // Solo primera moneda visible
    coin.visible = index === 0;
    
    coins[index] = coin;
    scene.add(coin);
    
    console.log(`Moneda ${index + 1} configurada y añadida a la escena`);
}

function setupInitialCoin() {
    if (coins.length > 0 && coins[0]) {
        coins[0].visible = true;
        currentCoinIndex = 0;
        totalRotation = 0;
        console.log('✓ Primera moneda activada y visible');
        
        // Intentar cargar GLB después
        loadAllCoins();
    } else {
        console.error('No hay monedas disponibles');
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!coinsReady || rotationRanges.length === 0) return;
    
    // Obtener estado actual basado en scroll
    const coinState = getCurrentCoinAndRotation(lastScrollTop);
    
    // Cambiar moneda si es necesario (solo cuando esté de canto - cerca de 90° o 270°)
    const rotationDegrees = (coinState.rotation * 180 / Math.PI) % 360;
    const isNearEdge = Math.abs(rotationDegrees - 90) < 10 || Math.abs(rotationDegrees - 270) < 10;
    
    if (coinState.coinIndex !== currentCoinIndex && isNearEdge) {
        if (coins[currentCoinIndex]) {
            coins[currentCoinIndex].visible = false;
        }
        
        currentCoinIndex = Math.min(coinState.coinIndex, coins.length - 1);
        
        if (coins[currentCoinIndex]) {
            coins[currentCoinIndex].visible = true;
            console.log(`→ Cambiando a moneda ${currentCoinIndex + 1} en ${rotationDegrees.toFixed(1)}°`);
        }
    }
    
    const currentCoin = coins[currentCoinIndex];
    if (!currentCoin) return;
    
    // Aplicar transformaciones suaves
    currentCoin.position.y = coinState.positionY;
    currentCoin.position.x = 0;
    currentCoin.position.z = 0;
    
    // Rotaciones
    currentCoin.rotation.y += 0.015; // Horizontal continua más lenta
    currentCoin.rotation.x = coinState.rotation; // Vertical basada en scroll
    currentCoin.rotation.z = 0;
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('coin-container');
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    
    // Recalcular rangos cuando cambie el tamaño
    setTimeout(() => {
        calculateRotationRanges();
    }, 100);
}

// Initialize the scene
init();
