let scene, camera, renderer, coin;

function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera - ajustar posición
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0.8);
    document.getElementById('container').appendChild(renderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Cargar el modelo coin.glb
    loadCoinModel();
    
    // Start animation immediately
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function loadCoinModel() {
    console.log('Iniciando carga del modelo coin.glb...');
    
    // Verificar que GLTFLoader esté disponible
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader no está disponible');
        createFallbackCoin();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    
    // Intentar diferentes rutas del archivo
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
                
                // Verificar que el modelo tiene contenido
                if (!coin.children || coin.children.length === 0) {
                    console.warn('El modelo GLB parece estar vacío');
                    createFallbackCoin();
                    return;
                }
                
                // Ajustar escala y posición
                const box = new THREE.Box3().setFromObject(coin);
                const size = box.getSize(new THREE.Vector3());
                const maxDimension = Math.max(size.x, size.y, size.z);
                
                if (maxDimension > 0) {
                    const scale = 2 / maxDimension;
                    coin.scale.setScalar(scale);
                    
                    // Centrar la moneda
                    const center = box.getCenter(new THREE.Vector3());
                    coin.position.sub(center.multiplyScalar(scale));
                }
                
                scene.add(coin);
                console.log('Moneda agregada a la escena exitosamente');
            },
            function(progress) {
                if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(2);
                    console.log(`Progreso de carga: ${percent}%`);
                }
            },
            function(error) {
                console.error(`Error cargando desde ${currentPath}:`, error);
                
                // Intentar la siguiente ruta
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
    
    // Comenzar a intentar cargar
    tryLoadPath();
}

function createFallbackCoin() {
    console.log('Creando moneda de respaldo...');
    const geometry = new THREE.CylinderGeometry(1, 1, 0.15, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xffd700,
        shininess: 100
    });
    coin = new THREE.Mesh(geometry, material);
    scene.add(coin);
    console.log('Moneda de respaldo creada');
}

function animate() {
    requestAnimationFrame(animate);
    
    // Animar solo tu moneda coin.glb
    if (coin) {
        coin.rotation.y += 0.02;
        coin.rotation.x += 0.005;
        coin.position.y = Math.sin(Date.now() * 0.002) * 0.3;
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize the scene
init();
