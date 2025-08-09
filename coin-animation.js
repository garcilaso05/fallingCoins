let scene, camera, renderer;
let coins = [];
let currentCoinIndex = 0;
let scrollProgress = 0;
let targetScrollProgress = 0;
let coinsReady = false;
let totalRotation = 0; // Contador simple de rotación total
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
    
    // Simplificar: cargar monedas primero, después setup
    loadAllCoins();
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
    console.log('Cargando monedas...');
    
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader no está disponible');
        createFallbackCoins();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    const totalCoins = 6; // Número fijo de monedas
    let coinsLoaded = 0;
    
    for (let i = 0; i < totalCoins; i++) {
        const coinPaths = [`./coin${i + 1}.glb`, `coin${i + 1}.glb`, `/coin${i + 1}.glb`];
        loadCoinWithFallback(loader, coinPaths, i, () => {
            coinsLoaded++;
            console.log(`Monedas cargadas: ${coinsLoaded}/${totalCoins}`);
            if (coinsLoaded === totalCoins) {
                console.log('Todas las monedas cargadas');
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
        console.log(`Cargando moneda ${coinIndex + 1}: ${currentPath}`);
        
        loader.load(
            currentPath,
            function(gltf) {
                console.log(`Moneda ${coinIndex + 1} cargada`);
                setupCoinProperties(gltf.scene, coinIndex);
                onComplete();
            },
            undefined,
            function(error) {
                console.error(`Error moneda ${coinIndex + 1}:`, error);
                pathIndex++;
                if (pathIndex < paths.length) {
                    tryLoadPath();
                } else {
                    createFallbackCoin(coinIndex);
                    onComplete();
                }
            }
        );
    }
    
    tryLoadPath();
}

function createFallbackCoins() {
    for (let i = 0; i < 6; i++) {
        createFallbackCoin(i);
    }
    coinsReady = true;
    setupInitialCoin();
}

function createFallbackCoin(index) {
    console.log(`Creando moneda respaldo ${index + 1}`);
    const geometry = new THREE.CylinderGeometry(1, 1, 0.15, 32);
    const colors = [0xffd700, 0xc0c0c0, 0xcd7f32, 0xff6b35, 0x4ecdc4, 0x9b59b6];
    const material = new THREE.MeshPhongMaterial({ 
        color: colors[index % colors.length],
        shininess: 100
    });
    const coin = new THREE.Mesh(geometry, material);
    setupCoinProperties(coin, index);
}

function setupCoinProperties(coin, index) {
    // Escalar moneda
    const box = new THREE.Box3().setFromObject(coin);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    if (maxDimension > 0) {
        const scale = 1.5 / maxDimension;
        coin.scale.setScalar(scale);
    }
    
    // Posición inicial
    coin.position.set(0, 2, 0);
    coin.rotation.set(0, 0, 0);
    
    // Solo primera moneda visible
    coin.visible = index === 0;
    
    coins[index] = coin;
    scene.add(coin);
    
    console.log(`Moneda ${index + 1} lista`);
}

function setupInitialCoin() {
    if (coins.length > 0 && coins[0]) {
        coins[0].visible = true;
        currentCoinIndex = 0;
        totalRotation = 0;
        console.log('Primera moneda activada');
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!coinsReady || !coins[currentCoinIndex]) return;
    
    const currentCoin = coins[currentCoinIndex];
    
    // Suavizar scroll
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.1;
    
    // MOVIMIENTO VERTICAL basado en scroll
    const scrollRange = 10;
    currentCoin.position.y = 2 - (scrollProgress * scrollRange);
    
    // ROTACIÓN HORIZONTAL continua
    currentCoin.rotation.y += 0.02;
    
    // ROTACIÓN VERTICAL basada en diferencia de scroll
    const scrollDelta = Math.abs(targetScrollProgress - lastScrollProgress);
    if (scrollDelta > 0.001) { // Solo rotar si hay movimiento real
        totalRotation += scrollDelta * 8; // Factor de multiplicación para controlar velocidad
        currentCoin.rotation.x = totalRotation;
        
        // Verificar si completamos 180° (Math.PI radianes)
        const rotationsCompleted = Math.floor(totalRotation / Math.PI);
        const targetCoinIndex = Math.min(rotationsCompleted, coins.length - 1);
        
        // Cambiar moneda si es necesario
        if (targetCoinIndex !== currentCoinIndex && coins[targetCoinIndex]) {
            console.log(`Cambiando a moneda ${targetCoinIndex + 1} después de ${rotationsCompleted} rotaciones`);
            
            // Ocultar actual
            coins[currentCoinIndex].visible = false;
            
            // Mostrar nueva
            const newCoin = coins[targetCoinIndex];
            newCoin.position.copy(currentCoin.position);
            newCoin.rotation.y = currentCoin.rotation.y;
            newCoin.rotation.x = 0; // Nueva moneda empieza plana
            newCoin.rotation.z = 0;
            newCoin.visible = true;
            
            currentCoinIndex = targetCoinIndex;
            totalRotation = 0; // Resetear contador para nueva moneda
        }
    }
    
    lastScrollProgress = targetScrollProgress;
    
    // POSICIÓN X centrada
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
