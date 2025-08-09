let scene, camera, renderer;
let coins = [];
let currentCoinIndex = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;
let coinsReady = false;
let totalRotation = 0;
let lastScrollProgress = 0;

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
    
    // Simplificar: crear monedas de respaldo inmediatamente
    createFallbackCoins();
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
    
    if (!coinsReady) {
        console.log('Esperando monedas...');
        return;
    }
    
    if (!coins[currentCoinIndex]) {
        console.log('Moneda actual no existe:', currentCoinIndex);
        return;
    }
    
    const currentCoin = coins[currentCoinIndex];
    
    // Suavizar scroll
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.1;
    
    // MOVIMIENTO VERTICAL
    const scrollRange = 8;
    currentCoin.position.y = 1 - (scrollProgress * scrollRange);
    
    // ROTACIÓN HORIZONTAL continua
    currentCoin.rotation.y += 0.02;
    
    // ROTACIÓN VERTICAL basada en scroll
    const scrollDelta = Math.abs(targetScrollProgress - lastScrollProgress);
    if (scrollDelta > 0.0001) {
        totalRotation += scrollDelta * 5; // Velocidad de rotación
        currentCoin.rotation.x = totalRotation;
        
        // Cambiar moneda cada 180° (Math.PI)
        const rotationsCompleted = Math.floor(totalRotation / Math.PI);
        const targetCoinIndex = Math.min(rotationsCompleted, coins.length - 1);
        
        if (targetCoinIndex !== currentCoinIndex && coins[targetCoinIndex]) {
            console.log(`→ Cambiando a moneda ${targetCoinIndex + 1}`);
            
            // Ocultar actual
            coins[currentCoinIndex].visible = false;
            
            // Mostrar nueva
            const newCoin = coins[targetCoinIndex];
            newCoin.position.copy(currentCoin.position);
            newCoin.rotation.y = currentCoin.rotation.y;
            newCoin.rotation.x = 0; // Nueva moneda plana
            newCoin.rotation.z = 0;
            newCoin.visible = true;
            
            currentCoinIndex = targetCoinIndex;
            totalRotation = 0; // Reset
        }
    }
    
    lastScrollProgress = targetScrollProgress;
    currentCoin.position.x = 0;
    
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
