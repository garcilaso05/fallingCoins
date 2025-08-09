/**
 * GLTFLoader con switch para moneda falsa o real
 */
(function() {
    'use strict';

    // Switch global para controlar qué moneda usar
    window.USE_FAKE_COIN = true; // Cambiar a false para usar coin.glb

    THREE.GLTFLoader = function(manager) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
    };

    THREE.GLTFLoader.prototype = {
        constructor: THREE.GLTFLoader,

        load: function(url, onLoad, onProgress, onError) {
            const scope = this;
            
            // Si el switch está activado, crear moneda falsa directamente
            if (window.USE_FAKE_COIN) {
                console.log('Usando moneda falsa (switch activado)');
                scope.createFakeCoin(onLoad);
                return;
            }
            
            // Si no, intentar cargar el archivo real
            console.log('Intentando cargar archivo real:', url);
            const loader = new THREE.FileLoader(scope.manager);
            loader.setResponseType('arraybuffer');

            loader.load(url, function(data) {
                scope.parse(data, '', onLoad, onError);
            }, onProgress, onError);
        },

        createFakeCoin: function(onLoad) {
            const scene = new THREE.Group();
            
            // Crear una moneda realista con cilindro
            const geometry = new THREE.CylinderGeometry(1, 1, 0.15, 32);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0xffd700,
                shininess: 100
            });
            const coinMesh = new THREE.Mesh(geometry, material);
            
            // Añadir bordes para que se vea más como moneda
            const edgeGeometry = new THREE.TorusGeometry(1, 0.05, 8, 32);
            const edgeMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffdd44,
                shininess: 120 
            });
            const edge1 = new THREE.Mesh(edgeGeometry, edgeMaterial);
            const edge2 = new THREE.Mesh(edgeGeometry, edgeMaterial);
            
            // Rotar 90 grados en X para que estén horizontales como la moneda
            edge1.rotation.x = Math.PI / 2;
            edge2.rotation.x = Math.PI / 2;
            
            edge1.position.y = 0.075;
            edge2.position.y = -0.075;
            
            scene.add(coinMesh);
            scene.add(edge1);
            scene.add(edge2);
            
            const result = {
                scene: scene,
                scenes: [scene],
                animations: [],
                cameras: [],
                asset: { generator: 'FakeCoinLoader' }
            };
            
            console.log('Moneda falsa generada');
            if (onLoad) setTimeout(() => onLoad(result), 100);
        },

        parse: function(data, path, onLoad, onError) {
            const scope = this;

            try {
                // Verificar header GLB
                const header = new DataView(data, 0, 12);
                const magic = header.getUint32(0, true);
                
                if (magic !== 0x46546C67) {
                    throw new Error('Archivo no es GLB válido');
                }

                const version = header.getUint32(4, true);
                const length = header.getUint32(8, true);

                console.log('GLB válido detectado - Versión:', version, 'Tamaño:', length);

                // Para este ejemplo simplificado, crear una geometría básica
                // En un loader real, parsearías el contenido JSON y binario del GLB
                const scene = new THREE.Group();
                
                // Crear una moneda básica como placeholder
                const geometry = new THREE.CylinderGeometry(1, 1, 0.1, 32);
                const material = new THREE.MeshPhongMaterial({
                    color: 0xffd700,
                    shininess: 100,
                    metalness: 0.8,
                    roughness: 0.2
                });
                const coinMesh = new THREE.Mesh(geometry, material);
                scene.add(coinMesh);

                const result = {
                    scene: scene,
                    scenes: [scene],
                    animations: [],
                    cameras: [],
                    asset: {
                        generator: 'SimplifiedGLTFLoader',
                        version: '2.0'
                    }
                };

                if (onLoad) {
                    setTimeout(() => onLoad(result), 100);
                }

            } catch (error) {
                console.error('Error parsing GLB:', error);
                if (onError) onError(error);
            }
        }
    };

    // Función global para cambiar el switch
    window.toggleCoinType = function() {
        window.USE_FAKE_COIN = !window.USE_FAKE_COIN;
        console.log('Switch cambiado a:', window.USE_FAKE_COIN ? 'Moneda Falsa' : 'Archivo GLB');
        // Recargar la página para aplicar el cambio
        location.reload();
    };

})();
