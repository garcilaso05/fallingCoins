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
    console.log('Cargando tu modelo coin.glb...');
    
    const loader = new THREE.GLTFLoader();
    loadWithLoader(loader);
}

function loadWithLoader(loader) {
    loader.load(
        './coin.glb',
        function(gltf) {
            coin = gltf.scene;
            const box = new THREE.Box3().setFromObject(coin);
            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDimension;
            coin.scale.setScalar(scale);
            const center = box.getCenter(new THREE.Vector3());
            coin.position.sub(center.multiplyScalar(scale));
            scene.add(coin);
            console.log('Moneda cargada exitosamente');
        },
        undefined,
        function(error) {
            console.error('Error cargando coin.glb:', error);
        }
    );
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
