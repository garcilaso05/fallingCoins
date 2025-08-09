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
    
    // Calcular posición del título (centro = 90° para moneda 1)
    const titleRect = title.getBoundingClientRect();
    const titleCenter = titleRect.top + window.pageYOffset + (titleRect.height / 2);
    
    console.log(`Título centrado en: ${titleCenter}px`);
    
    // Primera moneda especial: desde 90° (título) hasta 180° (primer subtítulo)
    if (subtitles.length > 0) {
        const firstSubtitleRect = subtitles[0].getBoundingClientRect();
        const firstSubtitleCenter = firstSubtitleRect.top + window.pageYOffset + (firstSubtitleRect.height / 2);
        
        rotationRanges.push({
            coinIndex: 0,
            startPixel: titleCenter,
            endPixel: firstSubtitleCenter,
            startAngle: Math.PI / 2, // 90° - muestra la cara
            endAngle: Math.PI, // 180° - de canto
            direction: 'forward'
        });
        
        console.log(`Moneda 1: ${titleCenter}px (90°) → ${firstSubtitleCenter}px (180°)`);
    }
    
    // Sistema de alternancia: cada moneda de 0° a 180° consecutivamente
    for (let i = 0; i < subtitles.length - 1; i++) {
        const currentSubtitleRect = subtitles[i].getBoundingClientRect();
        const nextSubtitleRect = subtitles[i + 1].getBoundingClientRect();
        
        const currentCenter = currentSubtitleRect.top + window.pageYOffset + (currentSubtitleRect.height / 2);
        const nextCenter = nextSubtitleRect.top + window.pageYOffset + (nextSubtitleRect.height / 2);
        
        rotationRanges.push({
            coinIndex: i + 1,
            startPixel: currentCenter,
            endPixel: nextCenter,
            startAngle: 0, // Siempre empieza mostrando la cara
            endAngle: Math.PI, // Termina de canto
            direction: 'forward'
        });
        
        console.log(`Moneda ${i + 2}: ${currentCenter}px (0°) → ${nextCenter}px (180°)`);
    }
    
    // Última moneda: desde último subtítulo hasta el final
    if (subtitles.length > 0) {
        const lastSubtitleRect = subtitles[subtitles.length - 1].getBoundingClientRect();
        const lastCenter = lastSubtitleRect.top + window.pageYOffset + (lastSubtitleRect.height / 2);
        const documentHeight = document.documentElement.scrollHeight;
        
        rotationRanges.push({
            coinIndex: subtitles.length,
            startPixel: lastCenter,
            endPixel: documentHeight,
            startAngle: 0,
            endAngle: Math.PI,
            direction: 'forward'
        });
        
        console.log(`Moneda final: ${lastCenter}px (0°) → ${documentHeight}px (180°)`);
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
            const currentAngle = range.startAngle + (angleDiff * clampedProgress);
            
            // POSICIÓN Y SUAVE: Evitar salto inicial
            let coinY;
            if (range.coinIndex === 0 && scrollTop < range.startPixel + 100) {
                const transitionProgress = Math.min(1, (scrollTop - range.startPixel + 100) / 200);
                const initialY = 0;
                const targetY = 2 - (scrollTop / (document.documentElement.scrollHeight - window.innerHeight)) * 4;
                coinY = initialY + (targetY - initialY) * Math.max(0, transitionProgress);
            } else {
                const totalScrollPercent = scrollTop / (document.documentElement.scrollHeight - window.innerHeight);
                coinY = 2 - (totalScrollPercent * 4);
            }
            
            // CAMBIO SOLO AL FINAL DEL RANGO: cuando llegamos al subtítulo (endPixel)
            const distanceToSubtitle = Math.abs(scrollTop - range.endPixel);
            const isAtSubtitle = distanceToSubtitle < 5; // Muy cerca del subtítulo (5px)
            const isAt180Degrees = Math.abs(currentAngle - Math.PI) < 0.1; // Cerca de 180°
            
            const nextCoinIndex = range.coinIndex + 1;
            const hasNextCoin = nextCoinIndex < coins.length && nextCoinIndex < rotationRanges.length;
            
            // Solo cambiar cuando estemos EN el subtítulo Y cerca de 180°
            const shouldChangeCoin = isAtSubtitle && isAt180Degrees && hasNextCoin;
            
            return {
                coinIndex: range.coinIndex,
                nextCoinIndex: hasNextCoin ? nextCoinIndex : range.coinIndex,
                rotation: currentAngle,
                positionY: coinY,
                progress: clampedProgress,
                shouldChangeCoin: shouldChangeCoin,
                isNearSubtitle: distanceToSubtitle < 30 && hasNextCoin,
                correctCoinIndex: range.coinIndex,
                exactScrollPosition: scrollTop,
                currentAngleInDegrees: (currentAngle * 180 / Math.PI).toFixed(1),
                distanceToSubtitle: distanceToSubtitle.toFixed(1) // Para debug
            };
        }
    }
    
    // Si estamos antes del primer rango, mostrar primera moneda centrada
    if (scrollTop < rotationRanges[0]?.startPixel) {
        // Transición suave desde el centro hacia la posición inicial del primer rango
        const firstRange = rotationRanges[0];
        if (firstRange && scrollTop > firstRange.startPixel - 200) {
            // Zona de transición: 200px antes del primer range
            const transitionProgress = (scrollTop - (firstRange.startPixel - 200)) / 200;
            const startY = 0; // Centrado
            const endY = 1; // Posición del primer range
            const coinY = startY + (endY - startY) * Math.max(0, Math.min(1, transitionProgress));
            
            return {
                coinIndex: 0,
                rotation: Math.PI / 2, // 90° - cara visible
                positionY: coinY,
                progress: 0,
                shouldChangeCoin: false,
                correctCoinIndex: 0
            };
        } else {
            // Completamente al inicio - mantener centrado
            return {
                coinIndex: 0,
                rotation: Math.PI / 2, // 90° - cara visible
                positionY: 0, // Centrado perfectamente
                progress: 0,
                shouldChangeCoin: false,
                correctCoinIndex: 0
            };
        }
    }
    
    // Si estamos después del último rango, mostrar última moneda
    const lastRange = rotationRanges[rotationRanges.length - 1];
    return {
        coinIndex: lastRange ? lastRange.coinIndex : 0,
        rotation: lastRange ? lastRange.endAngle : Math.PI,
        positionY: -1,
        progress: 1,
        shouldChangeCoin: false,
        correctCoinIndex: lastRange ? lastRange.coinIndex : 0
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
        coins[0].position.set(0, 0, 0); // Empezar exactamente en el centro
        coins[0].rotation.x = Math.PI / 2; // Mostrar cara inicial (90°)
        currentCoinIndex = 0;
        console.log('✓ Primera moneda activada centrada y mostrando su cara (90°)');
        
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
    
    // VERIFICACIÓN CONTINUA: Asegurar que tenemos la moneda correcta para la posición actual
    if (coinState.correctCoinIndex !== currentCoinIndex && coins[coinState.correctCoinIndex]) {
        console.log(`🔄 Corrección automática: scroll rápido detectado`);
        
        coins.forEach((coin, index) => {
            if (coin) coin.visible = false;
        });
        
        currentCoinIndex = coinState.correctCoinIndex;
        const correctCoin = coins[currentCoinIndex];
        
        if (correctCoin) {
            correctCoin.position.set(0, coinState.positionY, 0);
            correctCoin.rotation.x = coinState.rotation;
            correctCoin.visible = true;
        }
    }
    
    // PRECARGAR cuando estemos cerca del subtítulo
    else if (coinState.isNearSubtitle && coins[coinState.nextCoinIndex]) {
        const currentCoin = coins[currentCoinIndex];
        const nextCoin = coins[coinState.nextCoinIndex];
        
        if (currentCoin && nextCoin) {
            // Sincronizar posición exacta
            nextCoin.position.copy(currentCoin.position);
            nextCoin.rotation.y = currentCoin.rotation.y;
            nextCoin.rotation.x = Math.PI; // Preparar de canto
            nextCoin.rotation.z = currentCoin.rotation.z;
        }
    }
    
    // CAMBIO SOLO EN EL SUBTÍTULO
    else if (coinState.shouldChangeCoin && coinState.nextCoinIndex !== currentCoinIndex) {
        
        console.log(`→ Cambio EN SUBTÍTULO a ${coinState.currentAngleInDegrees}° (distancia: ${coinState.distanceToSubtitle}px): moneda ${currentCoinIndex + 1} → ${coinState.nextCoinIndex + 1}`);
        
        const currentCoin = coins[currentCoinIndex];
        const nextCoin = coins[coinState.nextCoinIndex];
        
        if (currentCoin && nextCoin) {
            // Capturar estado exacto
            const exactPosition = currentCoin.position.clone();
            const exactRotationY = currentCoin.rotation.y;
            const exactRotationZ = currentCoin.rotation.z;
            
            // Cambio atómico
            currentCoin.visible = false;
            
            nextCoin.position.copy(exactPosition);
            nextCoin.rotation.y = exactRotationY;
            nextCoin.rotation.x = Math.PI; // Empezar de canto
            nextCoin.rotation.z = exactRotationZ;
            nextCoin.visible = true;
            
            currentCoinIndex = coinState.nextCoinIndex;
        }
    }
    
    // Asegurar exclusividad de visibilidad
    coins.forEach((coin, index) => {
        if (coin) {
            coin.visible = index === currentCoinIndex;
        }
    });
    
    const currentCoin = coins[currentCoinIndex];
    if (!currentCoin) return;
    
    // Aplicar transformaciones fluidas
    currentCoin.position.y = coinState.positionY;
    currentCoin.position.x = 0;
    currentCoin.position.z = 0;
    
    // Rotaciones
    currentCoin.rotation.y += 0.02;
    currentCoin.rotation.x = coinState.rotation;
    currentCoin.rotation.z = Math.sin(Date.now() * 0.001) * 0.05;
    
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
