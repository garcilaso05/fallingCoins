let scene, camera, renderer;
let coins = [];
let currentCoinIndex = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;
let subtitlePositions = [];
let currentRotationTarget = 0;
let coinsReady = false;

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
    console.log('Precargando todas las monedas...');
    
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader no está disponible');
        createFallbackCoins();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    const totalCoins = Math.max(subtitlePositions.length, 5);
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
    coin.rotation.set(0, 0, 0);
    
    // NUNCA tocar los materiales - mantener propiedades originales
    // Solo controlar visibilidad
    coin.visible = false;
    
    // Añadir al array
    coins[index] = coin;
    scene.add(coin);
    
    console.log(`Moneda ${index + 1} precargada y lista`);
}

function setupInitialCoin() {
    if (coins.length > 0 && coins[0]) {
        coins[0].visible = true;
        currentCoinIndex = 0;
        console.log('Primera moneda activada');
    }
}

function calculateCoinRotation() {
    if (subtitlePositions.length === 0) return { rotation: 0, sectionIndex: 0 };
    
    // Calcular en qué sección estamos basándose en el scroll
    const totalSections = subtitlePositions.length - 1;
    const currentSection = targetScrollProgress * totalSections;
    const sectionIndex = Math.floor(currentSection);
    const sectionProgress = currentSection - sectionIndex;
    
    // Cada sección = 180 grados (Math.PI radianes)
    const totalRotation = sectionIndex * Math.PI + sectionProgress * Math.PI;
    
    return { 
        rotation: totalRotation, 
        sectionIndex: Math.min(sectionIndex, totalSections - 1),
        sectionProgress: sectionProgress
    };
}

function checkCoinChange(rotationData) {
    if (!coinsReady) return;
    
    const { sectionIndex, sectionProgress } = rotationData;
    
    // Cambiar cuando completamos 180° (sectionProgress >= 1.0)
    const shouldChangeToNext = sectionProgress >= 0.98 && sectionIndex > currentCoinIndex;
    const shouldChangeToPrev = sectionProgress <= 0.02 && sectionIndex < currentCoinIndex;
    
    if (shouldChangeToNext || shouldChangeToPrev) {
        const newCoinIndex = Math.min(sectionIndex, coins.length - 1);
        
        if (newCoinIndex !== currentCoinIndex && coins[newCoinIndex]) {
            switchToCoin(newCoinIndex);
        }
    }
}

function switchToCoin(newIndex) {
    console.log(`Cambiando a moneda ${newIndex + 1}`);
    
    // Ocultar moneda actual
    if (coins[currentCoinIndex]) {
        coins[currentCoinIndex].visible = false;
    }
    
    // Mostrar nueva moneda
    if (coins[newIndex]) {
        const oldCoin = coins[currentCoinIndex];
        const newCoin = coins[newIndex];
        
        // Copiar solo posición Y y rotación Y (horizontal)
        newCoin.position.y = oldCoin.position.y;
        newCoin.position.x = 0;
        newCoin.position.z = 0;
        
        newCoin.rotation.y = oldCoin.rotation.y;
        newCoin.rotation.x = 0; // Nueva moneda empieza en 0°
        newCoin.rotation.z = 0;
        
        newCoin.visible = true;
        currentCoinIndex = newIndex;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!coinsReady || !coins[currentCoinIndex]) return;
    
    const currentCoin = coins[currentCoinIndex];
    
    // Suavizar scroll
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;
    
    // MOVIMIENTO VERTICAL: Solo Y
    const scrollRange = 8;
    currentCoin.position.y = 3 - (scrollProgress * scrollRange);
    
    // ROTACIÓN HORIZONTAL: Continua
    currentCoin.rotation.y += 0.02;
    
    // ROTACIÓN VERTICAL: Basada en subtítulos
    const rotationData = calculateCoinRotation();
    currentRotationTarget += (rotationData.rotation - currentRotationTarget) * 0.05;
    currentCoin.rotation.x = currentRotationTarget;
    
    // POSICIÓN X fija
    currentCoin.position.x = 0;
    
    // Verificar cambio de moneda
    checkCoinChange(rotationData);
    
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
