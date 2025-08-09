/**
 * @author Don McCurdy / https://www.donmccurdy.com
 */

THREE.GLTFLoader = ( function () {

	function GLTFLoader( manager ) {

		THREE.Loader.call( this, manager );

		this.dracoLoader = null;
		this.ktx2Loader = null;
		this.meshoptDecoder = null;

		this.pluginCallbacks = [];

		this.register( function ( parser ) {

			return new GLTFMaterialsClearcoatExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFTextureBasisUExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFTextureWebPExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsSheenExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsTransmissionExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsVolumeExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsIorExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsEmissiveStrengthExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsBumpExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsAnisotropyExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsIridescenceExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsSpecularExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsSpecularGlossinessExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsUnlitExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsPBRSpecularGlossinessExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsVariantsExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMeshoptCompression( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMeshGpuInstancing( parser );

		} );

	}

	GLTFLoader.prototype = Object.assign( Object.create( THREE.Loader.prototype ), {

		constructor: GLTFLoader,

		load: function ( url, onLoad, onProgress, onError ) {

			var scope = this;

			var resourcePath;

			if ( this.resourcePath !== '' ) {

				resourcePath = this.resourcePath;

			} else if ( this.path !== '' ) {

				resourcePath = this.path;

			} else {

				resourcePath = THREE.LoaderUtils.extractUrlBase( url );

			}

			// Tells the LoadingManager to track an extra item, which resolves after
			// the model is fully loaded. This means the count of items loaded will
			// be incorrect, but ensures manager.onLoad() does not fire early.
			this.manager.itemStart( url );

			var _onError = function ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );
				scope.manager.itemEnd( url );

			};

			var loader = new THREE.FileLoader( this.manager );

			loader.setPath( this.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );

			loader.load( url, function ( data ) {

				try {

					scope.parse( data, resourcePath, function ( gltf ) {

						onLoad( gltf );

						scope.manager.itemEnd( url );

					}, _onError );

				} catch ( e ) {

					_onError( e );

				}

			}, onProgress, _onError );

		},

		setDRACOLoader: function ( dracoLoader ) {

			this.dracoLoader = dracoLoader;
			return this;

		},

		setKTX2Loader: function ( ktx2Loader ) {

			this.ktx2Loader = ktx2Loader;
			return this;

		},

		setMeshoptDecoder: function ( meshoptDecoder ) {

			this.meshoptDecoder = meshoptDecoder;
			return this;

		},

		register: function ( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) === - 1 ) {

				this.pluginCallbacks.push( callback );

			}

			return this;

		},

		unregister: function ( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) !== - 1 ) {

				this.pluginCallbacks.splice( this.pluginCallbacks.indexOf( callback ), 1 );

			}

			return this;

		},

		parse: function ( data, path, onLoad, onError ) {

			var content;
			var extensions = {};
			var plugins = {};
			var json;

			if ( typeof data === 'string' ) {

				content = data;

			} else {

				var magic = THREE.LoaderUtils.decodeText( new Uint8Array( data, 0, 4 ) );

				if ( magic === 'glTF' ) {

					extensions[ EXTENSIONS.KHR_BINARY_GLTF ] = new GLTFBinaryExtension( data );
					content = extensions[ EXTENSIONS.KHR_BINARY_GLTF ].content;

				} else {

					content = THREE.LoaderUtils.decodeText( new Uint8Array( data ) );

				}

			}

			try {

				json = JSON.parse( content );

			} catch ( error ) {

				if ( onError ) onError( error );
				return;

			}

			if ( json.asset === undefined || json.asset.version[ 0 ] < 2 ) {

				if ( onError ) onError( new Error( 'THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.' ) );
				return;

			}

			var parser = new GLTFParser( json, {

				path: path || this.resourcePath || '',
				crossOrigin: this.crossOrigin,
				requestHeader: this.requestHeader,
				manager: this.manager,
				ktx2Loader: this.ktx2Loader,
				meshoptDecoder: this.meshoptDecoder

			} );

			parser.fileLoader.setRequestHeader( this.requestHeader );

			for ( var i = 0; i < this.pluginCallbacks.length; i ++ ) {

				var plugin = this.pluginCallbacks[ i ]( parser );
				plugins[ plugin.name ] = plugin;

				// Workaround to avoid determining as unknown extension
				// in addUnknownExtensionsToUserData().
				// Remove this workaround if we move all the existing
				// extension handlers to plugin system
				extensions[ plugin.name ] = true;

			}

			if ( json.extensionsUsed ) {

				for ( var i = 0; i < json.extensionsUsed.length; ++ i ) {

					var extensionName = json.extensionsUsed[ i ];
					var extensionsRequired = json.extensionsRequired || [];

					switch ( extensionName ) {

						case EXTENSIONS.KHR_MATERIALS_UNLIT:
							extensions[ extensionName ] = new GLTFMaterialsUnlitExtension();
							break;

						case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
							extensions[ extensionName ] = new GLTFDracoMeshCompressionExtension( json, this.dracoLoader );
							break;

						case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
							extensions[ extensionName ] = new GLTFTextureTransformExtension();
							break;

						case EXTENSIONS.KHR_MESH_QUANTIZATION:
							extensions[ extensionName ] = new GLTFMeshQuantizationExtension();
							break;

						default:

							if ( extensionsRequired.indexOf( extensionName ) >= 0 && plugins[ extensionName ] === undefined ) {

								console.warn( 'THREE.GLTFLoader: Unknown extension "' + extensionName + '".' );

							}

					}

				}

			}

			parser.setExtensions( extensions );
			parser.setPlugins( plugins );
			parser.parse( onLoad, onError );

		}

	} );

	/* GLTFREGISTRY */

	function GLTFRegistry() {

		var objects = {};

		return	{

			get: function ( key ) {

				return objects[ key ];

			},

			add: function ( key, object ) {

				objects[ key ] = object;

			},

			remove: function ( key ) {

				delete objects[ key ];

			},

			removeAll: function () {

				objects = {};

			}

		};

	}

	/*********************************/
	/********** EXTENSIONS ***********/
	/*********************************/

	var EXTENSIONS = {
		KHR_BINARY_GLTF: 'KHR_binary_glTF',
		KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
		KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
		KHR_MATERIALS_CLEARCOAT: 'KHR_materials_clearcoat',
		KHR_MATERIALS_IOR: 'KHR_materials_ior',
		KHR_MATERIALS_SHEEN: 'KHR_materials_sheen',
		KHR_MATERIALS_SPECULAR: 'KHR_materials_specular',
		KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
		KHR_MATERIALS_IRIDESCENCE: 'KHR_materials_iridescence',
		KHR_MATERIALS_ANISOTROPY: 'KHR_materials_anisotropy',
		KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
		KHR_MATERIALS_VOLUME: 'KHR_materials_volume',
		KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
		KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
		KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
		KHR_MATERIALS_EMISSIVE_STRENGTH: 'KHR_materials_emissive_strength',
		EXT_TEXTURE_WEBP: 'EXT_texture_webp',
		EXT_TEXTURE_AVIF: 'EXT_texture_avif',
		EXT_MESHOPT_COMPRESSION: 'EXT_meshopt_compression',
		EXT_MESH_GPU_INSTANCING: 'EXT_mesh_gpu_instancing'
	};

	// Nota: Esta es una versión simplificada del GLTFLoader oficial
	// Para funcionalidad completa, descarga el archivo oficial desde:
	// https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/js/loaders/GLTFLoader.js

	function GLTFBinaryExtension( data ) {

		this.name = EXTENSIONS.KHR_BINARY_GLTF;
		this.content = null;
		this.body = null;

		var headerView = new DataView( data, 0, 12 );
		var textDecoder = new TextDecoder();

		this.header = {
			magic: textDecoder.decode( new Uint8Array( data.slice( 0, 4 ) ) ),
			version: headerView.getUint32( 4, true ),
			length: headerView.getUint32( 8, true )
		};

		if ( this.header.magic !== 'glTF' ) {

			throw new Error( 'THREE.GLTFLoader: Unsupported glTF-Binary header.' );

		} else if ( this.header.version < 2.0 ) {

			throw new Error( 'THREE.GLTFLoader: Legacy binary file detected.' );

		}

		var chunkContentsLength = this.header.length - 12;
		var chunkView = new DataView( data, 12 );
		var chunkIndex = 0;

		while ( chunkIndex < chunkContentsLength ) {

			var chunkLength = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			var chunkType = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			if ( chunkType === 0x4E4F534A ) {

				var contentArray = new Uint8Array( data, 12 + chunkIndex, chunkLength );
				this.content = textDecoder.decode( contentArray );

			} else if ( chunkType === 0x004E4942 ) {

				var byteOffset = 12 + chunkIndex;
				this.body = data.slice( byteOffset, byteOffset + chunkLength );

			}

			chunkIndex += chunkLength;

		}

		if ( this.content === null ) {

			throw new Error( 'THREE.GLTFLoader: JSON content not found.' );

		}

	}

	// Parser simplificado para manejar GLB básico
	function GLTFParser( json, options ) {
		this.json = json;
		this.options = options;
	}

	GLTFParser.prototype = {
		parse: function( onLoad, onError ) {
			// Implementación muy básica - crear un grupo vacío
			const scene = new THREE.Group();
			const result = {
				scene: scene,
				scenes: [scene],
				animations: [],
				cameras: [],
				asset: this.json.asset || {}
			};
			
			if (onLoad) onLoad(result);
		},
		
		setExtensions: function(extensions) {
			this.extensions = extensions;
		},
		
		setPlugins: function(plugins) {
			this.plugins = plugins;
		}
	};

	return GLTFLoader;

} )();
