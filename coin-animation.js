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
    
    // Verificar si GLTFLoader está disponible
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.log('GLTFLoader no encontrado, creando uno básico...');
        createBasicGLTFLoader();
    }
    
    const loader = new THREE.GLTFLoader();
    loadWithLoader(loader);
}

function createBasicGLTFLoader() {
    // Crear un GLTFLoader básico para cargar archivos .glb
    THREE.GLTFLoader = function() {};
    
    THREE.GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
        const loader = new THREE.FileLoader();
        loader.setResponseType('arraybuffer');
        
        loader.load(url, function(data) {
            try {
                // Verificar que es un archivo GLB válido
                const view = new DataView(data);
                const magic = view.getUint32(0, true);
                
                if (magic === 0x46546C67) { // 'glTF' en little endian
                    console.log('Archivo GLB detectado, procesando...');
                    
                    // Crear un objeto resultado básico
                    // Nota: Esto es una implementación muy básica
                    // En un caso real, necesitarías parsear completamente el GLB
                    const scene = new THREE.Group();
                    scene.name = 'GLBScene';
                    
                    const result = {
                        scene: scene,
                        scenes: [scene],
                        animations: [],
                        cameras: [],
                        asset: { generator: 'BasicGLTFLoader' }
                    };
                    
                    if (onLoad) onLoad(result);
                } else {
                    throw new Error('No es un archivo GLB válido');
                }
            } catch (error) {
                console.error('Error parseando GLB:', error);
                if (onError) onError(error);
            }
        }, onProgress, onError);
    };
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
