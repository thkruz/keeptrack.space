(function webpackUniversalModuleDefinition(root, factory) {
    if (typeof exports === 'object' && typeof module === 'object')
        module.exports = factory();
    else if (typeof define === 'function' && define.amd) define([], factory);
    else {
        var a = factory();
        for (var i in a)
            (typeof exports === 'object' ? exports : root)[i] = a[i];
    }
})(typeof self !== 'undefined' ? self : this, function () {
    return /******/ (function (modules) {
        // webpackBootstrap
        /******/ // The module cache
        /******/ var installedModules = {}; // The require function
        /******/
        /******/ /******/ function __webpack_require__(moduleId) {
            /******/
            /******/ // Check if module is in cache
            /******/ if (installedModules[moduleId]) {
                /******/ return installedModules[moduleId].exports;
                /******/
            } // Create a new module (and put it into the cache)
            /******/ /******/ var module = (installedModules[moduleId] = {
                /******/ i: moduleId,
                /******/ l: false,
                /******/ exports: {},
                /******/
            }); // Execute the module function
            /******/
            /******/ /******/ modules[moduleId].call(
                module.exports,
                module,
                module.exports,
                __webpack_require__
            ); // Flag the module as loaded
            /******/
            /******/ /******/ module.l = true; // Return the exports of the module
            /******/
            /******/ /******/ return module.exports;
            /******/
        } // expose the modules object (__webpack_modules__)
        /******/
        /******/
        /******/ /******/ __webpack_require__.m = modules; // expose the module cache
        /******/
        /******/ /******/ __webpack_require__.c = installedModules; // define getter function for harmony exports
        /******/
        /******/ /******/ __webpack_require__.d = function (
            exports,
            name,
            getter
        ) {
            /******/ if (!__webpack_require__.o(exports, name)) {
                /******/ Object.defineProperty(exports, name, {
                    enumerable: true,
                    get: getter,
                });
                /******/
            }
            /******/
        }; // define __esModule on exports
        /******/
        /******/ /******/ __webpack_require__.r = function (exports) {
            /******/ if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
                /******/ Object.defineProperty(exports, Symbol.toStringTag, {
                    value: 'Module',
                });
                /******/
            }
            /******/ Object.defineProperty(exports, '__esModule', {
                value: true,
            });
            /******/
        }; // create a fake namespace object // mode & 1: value is a module id, require it // mode & 2: merge all properties of value into the ns // mode & 4: return value when already ns object // mode & 8|1: behave like require
        /******/
        /******/ /******/ /******/ /******/ /******/ /******/ __webpack_require__.t = function (
            value,
            mode
        ) {
            /******/ if (mode & 1) value = __webpack_require__(value);
            /******/ if (mode & 8) return value;
            /******/ if (
                mode & 4 &&
                typeof value === 'object' &&
                value &&
                value.__esModule
            )
                return value;
            /******/ var ns = Object.create(null);
            /******/ __webpack_require__.r(ns);
            /******/ Object.defineProperty(ns, 'default', {
                enumerable: true,
                value: value,
            });
            /******/ if (mode & 2 && typeof value != 'string')
                for (var key in value)
                    __webpack_require__.d(
                        ns,
                        key,
                        function (key) {
                            return value[key];
                        }.bind(null, key)
                    );
            /******/ return ns;
            /******/
        }; // getDefaultExport function for compatibility with non-harmony modules
        /******/
        /******/ /******/ __webpack_require__.n = function (module) {
            /******/ var getter =
                module && module.__esModule
                    ? /******/ function getDefault() {
                          return module['default'];
                      }
                    : /******/ function getModuleExports() {
                          return module;
                      };
            /******/ __webpack_require__.d(getter, 'a', getter);
            /******/ return getter;
            /******/
        }; // Object.prototype.hasOwnProperty.call
        /******/
        /******/ /******/ __webpack_require__.o = function (object, property) {
            return Object.prototype.hasOwnProperty.call(object, property);
        }; // __webpack_public_path__
        /******/
        /******/ /******/ __webpack_require__.p = '/'; // Load entry module and return exports
        /******/
        /******/
        /******/ /******/ return __webpack_require__(
            (__webpack_require__.s = 0)
        );
        /******/
    })(
        /************************************************************************/
        /******/ {
            /***/ './src/index.ts':
                /*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
                /*! exports provided: OBJ, Attribute, DuplicateAttributeException, Layout, Material, MaterialLibrary, Mesh, TYPES, downloadModels, downloadMeshes, initMeshBuffers, deleteMeshBuffers, version */
                /***/ function (
                    module,
                    __webpack_exports__,
                    __webpack_require__
                ) {
                    'use strict';
                    __webpack_require__.r(__webpack_exports__);
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'OBJ',
                        function () {
                            return OBJ;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'version',
                        function () {
                            return version;
                        }
                    );
                    /* harmony import */ var _mesh__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
                        /*! ./mesh */ './src/mesh.ts'
                    );
                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'Mesh',
                        function () {
                            return _mesh__WEBPACK_IMPORTED_MODULE_0__[
                                'default'
                            ];
                        }
                    );

                    /* harmony import */ var _material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
                        /*! ./material */ './src/material.ts'
                    );
                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'Material',
                        function () {
                            return _material__WEBPACK_IMPORTED_MODULE_1__[
                                'Material'
                            ];
                        }
                    );

                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'MaterialLibrary',
                        function () {
                            return _material__WEBPACK_IMPORTED_MODULE_1__[
                                'MaterialLibrary'
                            ];
                        }
                    );

                    /* harmony import */ var _layout__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
                        /*! ./layout */ './src/layout.ts'
                    );
                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'Attribute',
                        function () {
                            return _layout__WEBPACK_IMPORTED_MODULE_2__[
                                'Attribute'
                            ];
                        }
                    );

                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'DuplicateAttributeException',
                        function () {
                            return _layout__WEBPACK_IMPORTED_MODULE_2__[
                                'DuplicateAttributeException'
                            ];
                        }
                    );

                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'Layout',
                        function () {
                            return _layout__WEBPACK_IMPORTED_MODULE_2__[
                                'Layout'
                            ];
                        }
                    );

                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'TYPES',
                        function () {
                            return _layout__WEBPACK_IMPORTED_MODULE_2__[
                                'TYPES'
                            ];
                        }
                    );

                    /* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
                        /*! ./utils */ './src/utils.ts'
                    );
                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'downloadModels',
                        function () {
                            return _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'downloadModels'
                            ];
                        }
                    );

                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'downloadMeshes',
                        function () {
                            return _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'downloadMeshes'
                            ];
                        }
                    );

                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'initMeshBuffers',
                        function () {
                            return _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'initMeshBuffers'
                            ];
                        }
                    );

                    /* harmony reexport (safe) */ __webpack_require__.d(
                        __webpack_exports__,
                        'deleteMeshBuffers',
                        function () {
                            return _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'deleteMeshBuffers'
                            ];
                        }
                    );

                    const version = '2.0.3';
                    const OBJ = {
                        Attribute:
                            _layout__WEBPACK_IMPORTED_MODULE_2__['Attribute'],
                        DuplicateAttributeException:
                            _layout__WEBPACK_IMPORTED_MODULE_2__[
                                'DuplicateAttributeException'
                            ],
                        Layout: _layout__WEBPACK_IMPORTED_MODULE_2__['Layout'],
                        Material:
                            _material__WEBPACK_IMPORTED_MODULE_1__['Material'],
                        MaterialLibrary:
                            _material__WEBPACK_IMPORTED_MODULE_1__[
                                'MaterialLibrary'
                            ],
                        Mesh: _mesh__WEBPACK_IMPORTED_MODULE_0__['default'],
                        TYPES: _layout__WEBPACK_IMPORTED_MODULE_2__['TYPES'],
                        downloadModels:
                            _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'downloadModels'
                            ],
                        downloadMeshes:
                            _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'downloadMeshes'
                            ],
                        initMeshBuffers:
                            _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'initMeshBuffers'
                            ],
                        deleteMeshBuffers:
                            _utils__WEBPACK_IMPORTED_MODULE_3__[
                                'deleteMeshBuffers'
                            ],
                        version,
                    };
                    /**
                     * @namespace
                     */

                    /***/
                },

            /***/ './src/layout.ts':
                /*!***********************!*\
  !*** ./src/layout.ts ***!
  \***********************/
                /*! exports provided: TYPES, DuplicateAttributeException, Attribute, Layout */
                /***/ function (
                    module,
                    __webpack_exports__,
                    __webpack_require__
                ) {
                    'use strict';
                    __webpack_require__.r(__webpack_exports__);
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'TYPES',
                        function () {
                            return TYPES;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'DuplicateAttributeException',
                        function () {
                            return DuplicateAttributeException;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'Attribute',
                        function () {
                            return Attribute;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'Layout',
                        function () {
                            return Layout;
                        }
                    );
                    var TYPES;
                    (function (TYPES) {
                        TYPES['BYTE'] = 'BYTE';
                        TYPES['UNSIGNED_BYTE'] = 'UNSIGNED_BYTE';
                        TYPES['SHORT'] = 'SHORT';
                        TYPES['UNSIGNED_SHORT'] = 'UNSIGNED_SHORT';
                        TYPES['FLOAT'] = 'FLOAT';
                    })(TYPES || (TYPES = {}));
                    /**
                     * An exception for when two or more of the same attributes are found in the
                     * same layout.
                     * @private
                     */
                    class DuplicateAttributeException extends Error {
                        /**
                         * Create a DuplicateAttributeException
                         * @param {Attribute} attribute - The attribute that was found more than
                         *        once in the {@link Layout}
                         */
                        constructor(attribute) {
                            super(
                                `found duplicate attribute: ${attribute.key}`
                            );
                        }
                    }
                    /**
                     * Represents how a vertex attribute should be packed into an buffer.
                     * @private
                     */
                    class Attribute {
                        /**
                         * Create an attribute. Do not call this directly, use the predefined
                         * constants.
                         * @param {string} key - The name of this attribute as if it were a key in
                         *        an Object. Use the camel case version of the upper snake case
                         *        const name.
                         * @param {number} size - The number of components per vertex attribute.
                         *        Must be 1, 2, 3, or 4.
                         * @param {string} type - The data type of each component for this
                         *        attribute. Possible values:<br/>
                         *        "BYTE": signed 8-bit integer, with values in [-128, 127]<br/>
                         *        "SHORT": signed 16-bit integer, with values in
                         *            [-32768, 32767]<br/>
                         *        "UNSIGNED_BYTE": unsigned 8-bit integer, with values in
                         *            [0, 255]<br/>
                         *        "UNSIGNED_SHORT": unsigned 16-bit integer, with values in
                         *            [0, 65535]<br/>
                         *        "FLOAT": 32-bit floating point number
                         * @param {boolean} normalized - Whether integer data values should be
                         *        normalized when being casted to a float.<br/>
                         *        If true, signed integers are normalized to [-1, 1].<br/>
                         *        If true, unsigned integers are normalized to [0, 1].<br/>
                         *        For type "FLOAT", this parameter has no effect.
                         */
                        constructor(key, size, type, normalized = false) {
                            this.key = key;
                            this.size = size;
                            this.type = type;
                            this.normalized = normalized;
                            switch (type) {
                                case 'BYTE':
                                case 'UNSIGNED_BYTE':
                                    this.sizeOfType = 1;
                                    break;
                                case 'SHORT':
                                case 'UNSIGNED_SHORT':
                                    this.sizeOfType = 2;
                                    break;
                                case 'FLOAT':
                                    this.sizeOfType = 4;
                                    break;
                                default:
                                    throw new Error(`Unknown gl type: ${type}`);
                            }
                            this.sizeInBytes = this.sizeOfType * size;
                        }
                    }
                    /**
                     * A class to represent the memory layout for a vertex attribute array. Used by
                     * {@link Mesh}'s TBD(...) method to generate a packed array from mesh data.
                     * <p>
                     * Layout can sort of be thought of as a C-style struct declaration.
                     * {@link Mesh}'s TBD(...) method will use the {@link Layout} instance to
                     * pack an array in the given attribute order.
                     * <p>
                     * Layout also is very helpful when calling a WebGL context's
                     * <code>vertexAttribPointer</code> method. If you've created a buffer using
                     * a Layout instance, then the same Layout instance can be used to determine
                     * the size, type, normalized, stride, and offset parameters for
                     * <code>vertexAttribPointer</code>.
                     * <p>
                     * For example:
                     * <pre><code>
                     *
                     * const index = glctx.getAttribLocation(shaderProgram, "pos");
                     * glctx.vertexAttribPointer(
                     *   layout.position.size,
                     *   glctx[layout.position.type],
                     *   layout.position.normalized,
                     *   layout.position.stride,
                     *   layout.position.offset);
                     * </code></pre>
                     * @see {@link Mesh}
                     */
                    class Layout {
                        /**
                         * Create a Layout object. This constructor will throw if any duplicate
                         * attributes are given.
                         * @param {Array} ...attributes - An ordered list of attributes that
                         *        describe the desired memory layout for each vertex attribute.
                         *        <p>
                         *
                         * @see {@link Mesh}
                         */
                        constructor(...attributes) {
                            this.attributes = attributes;
                            this.attributeMap = {};
                            let offset = 0;
                            let maxStrideMultiple = 0;
                            for (const attribute of attributes) {
                                if (this.attributeMap[attribute.key]) {
                                    throw new DuplicateAttributeException(
                                        attribute
                                    );
                                }
                                // Add padding to satisfy WebGL's requirement that all
                                // vertexAttribPointer calls have an offset that is a multiple of
                                // the type size.
                                if (offset % attribute.sizeOfType !== 0) {
                                    offset +=
                                        attribute.sizeOfType -
                                        (offset % attribute.sizeOfType);
                                    console.warn(
                                        'Layout requires padding before ' +
                                            attribute.key +
                                            ' attribute'
                                    );
                                }
                                this.attributeMap[attribute.key] = {
                                    attribute: attribute,
                                    size: attribute.size,
                                    type: attribute.type,
                                    normalized: attribute.normalized,
                                    offset: offset,
                                };
                                offset += attribute.sizeInBytes;
                                maxStrideMultiple = Math.max(
                                    maxStrideMultiple,
                                    attribute.sizeOfType
                                );
                            }
                            // Add padding to the end to satisfy WebGL's requirement that all
                            // vertexAttribPointer calls have a stride that is a multiple of the
                            // type size. Because we're putting differently sized attributes into
                            // the same buffer, it must be padded to a multiple of the largest
                            // type size.
                            if (offset % maxStrideMultiple !== 0) {
                                offset +=
                                    maxStrideMultiple -
                                    (offset % maxStrideMultiple);
                                console.warn(
                                    'Layout requires padding at the back'
                                );
                            }
                            this.stride = offset;
                            for (const attribute of attributes) {
                                this.attributeMap[
                                    attribute.key
                                ].stride = this.stride;
                            }
                        }
                    }
                    // Geometry attributes
                    /**
                     * Attribute layout to pack a vertex's x, y, & z as floats
                     *
                     * @see {@link Layout}
                     */
                    Layout.POSITION = new Attribute('position', 3, TYPES.FLOAT);
                    /**
                     * Attribute layout to pack a vertex's normal's x, y, & z as floats
                     *
                     * @see {@link Layout}
                     */
                    Layout.NORMAL = new Attribute('normal', 3, TYPES.FLOAT);
                    /**
                     * Attribute layout to pack a vertex's normal's x, y, & z as floats.
                     * <p>
                     * This value will be computed on-the-fly based on the texture coordinates.
                     * If no texture coordinates are available, the generated value will default to
                     * 0, 0, 0.
                     *
                     * @see {@link Layout}
                     */
                    Layout.TANGENT = new Attribute('tangent', 3, TYPES.FLOAT);
                    /**
                     * Attribute layout to pack a vertex's normal's bitangent x, y, & z as floats.
                     * <p>
                     * This value will be computed on-the-fly based on the texture coordinates.
                     * If no texture coordinates are available, the generated value will default to
                     * 0, 0, 0.
                     * @see {@link Layout}
                     */
                    Layout.BITANGENT = new Attribute(
                        'bitangent',
                        3,
                        TYPES.FLOAT
                    );
                    /**
                     * Attribute layout to pack a vertex's texture coordinates' u & v as floats
                     *
                     * @see {@link Layout}
                     */
                    Layout.UV = new Attribute('uv', 2, TYPES.FLOAT);
                    // Material attributes
                    /**
                     * Attribute layout to pack an unsigned short to be interpreted as a the index
                     * into a {@link Mesh}'s materials list.
                     * <p>
                     * The intention of this value is to send all of the {@link Mesh}'s materials
                     * into multiple shader uniforms and then reference the current one by this
                     * vertex attribute.
                     * <p>
                     * example glsl code:
                     *
                     * <pre><code>
                     *  // this is bound using MATERIAL_INDEX
                     *  attribute int materialIndex;
                     *
                     *  struct Material {
                     *    vec3 diffuse;
                     *    vec3 specular;
                     *    vec3 specularExponent;
                     *  };
                     *
                     *  uniform Material materials[MAX_MATERIALS];
                     *
                     *  // ...
                     *
                     *  vec3 diffuse = materials[materialIndex];
                     *
                     * </code></pre>
                     * TODO: More description & test to make sure subscripting by attributes even
                     * works for webgl
                     *
                     * @see {@link Layout}
                     */
                    Layout.MATERIAL_INDEX = new Attribute(
                        'materialIndex',
                        1,
                        TYPES.SHORT
                    );
                    Layout.MATERIAL_ENABLED = new Attribute(
                        'materialEnabled',
                        1,
                        TYPES.UNSIGNED_SHORT
                    );
                    Layout.AMBIENT = new Attribute('ambient', 3, TYPES.FLOAT);
                    Layout.DIFFUSE = new Attribute('diffuse', 3, TYPES.FLOAT);
                    Layout.SPECULAR = new Attribute('specular', 3, TYPES.FLOAT);
                    Layout.SPECULAR_EXPONENT = new Attribute(
                        'specularExponent',
                        3,
                        TYPES.FLOAT
                    );
                    Layout.EMISSIVE = new Attribute('emissive', 3, TYPES.FLOAT);
                    Layout.TRANSMISSION_FILTER = new Attribute(
                        'transmissionFilter',
                        3,
                        TYPES.FLOAT
                    );
                    Layout.DISSOLVE = new Attribute('dissolve', 1, TYPES.FLOAT);
                    Layout.ILLUMINATION = new Attribute(
                        'illumination',
                        1,
                        TYPES.UNSIGNED_SHORT
                    );
                    Layout.REFRACTION_INDEX = new Attribute(
                        'refractionIndex',
                        1,
                        TYPES.FLOAT
                    );
                    Layout.SHARPNESS = new Attribute(
                        'sharpness',
                        1,
                        TYPES.FLOAT
                    );
                    Layout.MAP_DIFFUSE = new Attribute(
                        'mapDiffuse',
                        1,
                        TYPES.SHORT
                    );
                    Layout.MAP_AMBIENT = new Attribute(
                        'mapAmbient',
                        1,
                        TYPES.SHORT
                    );
                    Layout.MAP_SPECULAR = new Attribute(
                        'mapSpecular',
                        1,
                        TYPES.SHORT
                    );
                    Layout.MAP_SPECULAR_EXPONENT = new Attribute(
                        'mapSpecularExponent',
                        1,
                        TYPES.SHORT
                    );
                    Layout.MAP_DISSOLVE = new Attribute(
                        'mapDissolve',
                        1,
                        TYPES.SHORT
                    );
                    Layout.ANTI_ALIASING = new Attribute(
                        'antiAliasing',
                        1,
                        TYPES.UNSIGNED_SHORT
                    );
                    Layout.MAP_BUMP = new Attribute('mapBump', 1, TYPES.SHORT);
                    Layout.MAP_DISPLACEMENT = new Attribute(
                        'mapDisplacement',
                        1,
                        TYPES.SHORT
                    );
                    Layout.MAP_DECAL = new Attribute(
                        'mapDecal',
                        1,
                        TYPES.SHORT
                    );
                    Layout.MAP_EMISSIVE = new Attribute(
                        'mapEmissive',
                        1,
                        TYPES.SHORT
                    );

                    /***/
                },

            /***/ './src/material.ts':
                /*!*************************!*\
  !*** ./src/material.ts ***!
  \*************************/
                /*! exports provided: Material, MaterialLibrary */
                /***/ function (
                    module,
                    __webpack_exports__,
                    __webpack_require__
                ) {
                    'use strict';
                    __webpack_require__.r(__webpack_exports__);
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'Material',
                        function () {
                            return Material;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'MaterialLibrary',
                        function () {
                            return MaterialLibrary;
                        }
                    );
                    /**
                     * The Material class.
                     */
                    class Material {
                        constructor(name) {
                            this.name = name;
                            /**
                             * Constructor
                             * @param {String} name the unique name of the material
                             */
                            // The values for the following attibutes
                            // are an array of R, G, B normalized values.
                            // Ka - Ambient Reflectivity
                            this.ambient = [0, 0, 0];
                            // Kd - Defuse Reflectivity
                            this.diffuse = [0, 0, 0];
                            // Ks
                            this.specular = [0, 0, 0];
                            // Ke
                            this.emissive = [0, 0, 0];
                            // Tf
                            this.transmissionFilter = [0, 0, 0];
                            // d
                            this.dissolve = 0;
                            // valid range is between 0 and 1000
                            this.specularExponent = 0;
                            // either d or Tr; valid values are normalized
                            this.transparency = 0;
                            // illum - the enum of the illumination model to use
                            this.illumination = 0;
                            // Ni - Set to "normal" (air).
                            this.refractionIndex = 1;
                            // sharpness
                            this.sharpness = 0;
                            // map_Kd
                            this.mapDiffuse = emptyTextureOptions();
                            // map_Ka
                            this.mapAmbient = emptyTextureOptions();
                            // map_Ks
                            this.mapSpecular = emptyTextureOptions();
                            // map_Ns
                            this.mapSpecularExponent = emptyTextureOptions();
                            // map_d
                            this.mapDissolve = emptyTextureOptions();
                            // map_aat
                            this.antiAliasing = false;
                            // map_bump or bump
                            this.mapBump = emptyTextureOptions();
                            // disp
                            this.mapDisplacement = emptyTextureOptions();
                            // decal
                            this.mapDecal = emptyTextureOptions();
                            // map_Ke
                            this.mapEmissive = emptyTextureOptions();
                            // refl - when the reflection type is a cube, there will be multiple refl
                            //        statements for each side of the cube. If it's a spherical
                            //        reflection, there should only ever be one.
                            this.mapReflections = [];
                        }
                    }
                    const SENTINEL_MATERIAL = new Material('sentinel');
                    /**
                     * https://en.wikipedia.org/wiki/Wavefront_.obj_file
                     * http://paulbourke.net/dataformats/mtl/
                     */
                    class MaterialLibrary {
                        constructor(data) {
                            this.data = data;
                            /**
                             * Constructs the Material Parser
                             * @param mtlData the MTL file contents
                             */
                            this.currentMaterial = SENTINEL_MATERIAL;
                            this.materials = {};
                            this.parse();
                        }
                        /* eslint-disable camelcase */
                        /* the function names here disobey camelCase conventions
     to make parsing/routing easier. see the parse function
     documentation for more information. */
                        /**
                         * Creates a new Material object and adds to the registry.
                         * @param tokens the tokens associated with the directive
                         */
                        parse_newmtl(tokens) {
                            const name = tokens[0];
                            // console.info('Parsing new Material:', name);
                            this.currentMaterial = new Material(name);
                            this.materials[name] = this.currentMaterial;
                        }
                        /**
                         * See the documenation for parse_Ka below for a better understanding.
                         *
                         * Given a list of possible color tokens, returns an array of R, G, and B
                         * color values.
                         *
                         * @param tokens the tokens associated with the directive
                         * @return {*} a 3 element array containing the R, G, and B values
                         * of the color.
                         */
                        parseColor(tokens) {
                            if (tokens[0] == 'spectral') {
                                throw new Error(
                                    'The MTL parser does not support spectral curve files. You will ' +
                                        'need to convert the MTL colors to either RGB or CIEXYZ.'
                                );
                            }
                            if (tokens[0] == 'xyz') {
                                throw new Error(
                                    'The MTL parser does not currently support XYZ colors. Either convert the ' +
                                        'XYZ values to RGB or create an issue to add support for XYZ'
                                );
                            }
                            // from my understanding of the spec, RGB values at this point
                            // will either be 3 floats or exactly 1 float, so that's the check
                            // that i'm going to perform here
                            if (tokens.length == 3) {
                                const [x, y, z] = tokens;
                                return [
                                    parseFloat(x),
                                    parseFloat(y),
                                    parseFloat(z),
                                ];
                            }
                            // Since tokens at this point has a length of 3, we're going to assume
                            // it's exactly 1, skipping the check for 2.
                            const value = parseFloat(tokens[0]);
                            // in this case, all values are equivalent
                            return [value, value, value];
                        }
                        /**
                         * Parse the ambient reflectivity
                         *
                         * A Ka directive can take one of three forms:
                         *   - Ka r g b
                         *   - Ka spectral file.rfl
                         *   - Ka xyz x y z
                         * These three forms are mutually exclusive in that only one
                         * declaration can exist per material. It is considered a syntax
                         * error otherwise.
                         *
                         * The "Ka" form specifies the ambient reflectivity using RGB values.
                         * The "g" and "b" values are optional. If only the "r" value is
                         * specified, then the "g" and "b" values are assigned the value of
                         * "r". Values are normally in the range 0.0 to 1.0. Values outside
                         * of this range increase or decrease the reflectivity accordingly.
                         *
                         * The "Ka spectral" form specifies the ambient reflectivity using a
                         * spectral curve. "file.rfl" is the name of the ".rfl" file containing
                         * the curve data. "factor" is an optional argument which is a multiplier
                         * for the values in the .rfl file and defaults to 1.0 if not specified.
                         *
                         * The "Ka xyz" form specifies the ambient reflectivity using CIEXYZ values.
                         * "x y z" are the values of the CIEXYZ color space. The "y" and "z" arguments
                         * are optional and take on the value of the "x" component if only "x" is
                         * specified. The "x y z" values are normally in the range of 0.0 to 1.0 and
                         * increase or decrease ambient reflectivity accordingly outside of that
                         * range.
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_Ka(tokens) {
                            this.currentMaterial.ambient = this.parseColor(
                                tokens
                            );
                        }
                        /**
                         * Diffuse Reflectivity
                         *
                         * Similar to the Ka directive. Simply replace "Ka" with "Kd" and the rules
                         * are the same
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_Kd(tokens) {
                            this.currentMaterial.diffuse = this.parseColor(
                                tokens
                            );
                        }
                        /**
                         * Spectral Reflectivity
                         *
                         * Similar to the Ka directive. Simply replace "Ks" with "Kd" and the rules
                         * are the same
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_Ks(tokens) {
                            this.currentMaterial.specular = this.parseColor(
                                tokens
                            );
                        }
                        /**
                         * Emissive
                         *
                         * The amount and color of light emitted by the object.
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_Ke(tokens) {
                            this.currentMaterial.emissive = this.parseColor(
                                tokens
                            );
                        }
                        /**
                         * Transmission Filter
                         *
                         * Any light passing through the object is filtered by the transmission
                         * filter, which only allows specific colors to pass through. For example, Tf
                         * 0 1 0 allows all of the green to pass through and filters out all of the
                         * red and blue.
                         *
                         * Similar to the Ka directive. Simply replace "Ks" with "Tf" and the rules
                         * are the same
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_Tf(tokens) {
                            this.currentMaterial.transmissionFilter = this.parseColor(
                                tokens
                            );
                        }
                        /**
                         * Specifies the dissolve for the current material.
                         *
                         * Statement: d [-halo] `factor`
                         *
                         * Example: "d 0.5"
                         *
                         * The factor is the amount this material dissolves into the background. A
                         * factor of 1.0 is fully opaque. This is the default when a new material is
                         * created. A factor of 0.0 is fully dissolved (completely transparent).
                         *
                         * Unlike a real transparent material, the dissolve does not depend upon
                         * material thickness nor does it have any spectral character. Dissolve works
                         * on all illumination models.
                         *
                         * The dissolve statement allows for an optional "-halo" flag which indicates
                         * that a dissolve is dependent on the surface orientation relative to the
                         * viewer. For example, a sphere with the following dissolve, "d -halo 0.0",
                         * will be fully dissolved at its center and will appear gradually more opaque
                         * toward its edge.
                         *
                         * "factor" is the minimum amount of dissolve applied to the material. The
                         * amount of dissolve will vary between 1.0 (fully opaque) and the specified
                         * "factor". The formula is:
                         *
                         *    dissolve = 1.0 - (N*v)(1.0-factor)
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_d(tokens) {
                            // this ignores the -halo option as I can't find any documentation on what
                            // it's supposed to be.
                            this.currentMaterial.dissolve = parseFloat(
                                tokens.pop() || '0'
                            );
                        }
                        /**
                         * The "illum" statement specifies the illumination model to use in the
                         * material. Illumination models are mathematical equations that represent
                         * various material lighting and shading effects.
                         *
                         * The illumination number can be a number from 0 to 10. The following are
                         * the list of illumination enumerations and their summaries:
                         * 0. Color on and Ambient off
                         * 1. Color on and Ambient on
                         * 2. Highlight on
                         * 3. Reflection on and Ray trace on
                         * 4. Transparency: Glass on, Reflection: Ray trace on
                         * 5. Reflection: Fresnel on and Ray trace on
                         * 6. Transparency: Refraction on, Reflection: Fresnel off and Ray trace on
                         * 7. Transparency: Refraction on, Reflection: Fresnel on and Ray trace on
                         * 8. Reflection on and Ray trace off
                         * 9. Transparency: Glass on, Reflection: Ray trace off
                         * 10. Casts shadows onto invisible surfaces
                         *
                         * Example: "illum 2" to specify the "Highlight on" model
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_illum(tokens) {
                            this.currentMaterial.illumination = parseInt(
                                tokens[0]
                            );
                        }
                        /**
                         * Optical Density (AKA Index of Refraction)
                         *
                         * Statement: Ni `index`
                         *
                         * Example: Ni 1.0
                         *
                         * Specifies the optical density for the surface. `index` is the value
                         * for the optical density. The values can range from 0.001 to 10.  A value of
                         * 1.0 means that light does not bend as it passes through an object.
                         * Increasing the optical_density increases the amount of bending. Glass has
                         * an index of refraction of about 1.5. Values of less than 1.0 produce
                         * bizarre results and are not recommended
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_Ni(tokens) {
                            this.currentMaterial.refractionIndex = parseFloat(
                                tokens[0]
                            );
                        }
                        /**
                         * Specifies the specular exponent for the current material. This defines the
                         * focus of the specular highlight.
                         *
                         * Statement: Ns `exponent`
                         *
                         * Example: "Ns 250"
                         *
                         * `exponent` is the value for the specular exponent. A high exponent results
                         * in a tight, concentrated highlight. Ns Values normally range from 0 to
                         * 1000.
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_Ns(tokens) {
                            this.currentMaterial.specularExponent = parseInt(
                                tokens[0]
                            );
                        }
                        /**
                         * Specifies the sharpness of the reflections from the local reflection map.
                         *
                         * Statement: sharpness `value`
                         *
                         * Example: "sharpness 100"
                         *
                         * If a material does not have a local reflection map defined in its material
                         * defintions, sharpness will apply to the global reflection map defined in
                         * PreView.
                         *
                         * `value` can be a number from 0 to 1000. The default is 60. A high value
                         * results in a clear reflection of objects in the reflection map.
                         *
                         * Tip: sharpness values greater than 100 introduce aliasing effects in
                         * flat surfaces that are viewed at a sharp angle.
                         *
                         * @param tokens the tokens associated with the directive
                         */
                        parse_sharpness(tokens) {
                            this.currentMaterial.sharpness = parseInt(
                                tokens[0]
                            );
                        }
                        /**
                         * Parses the -cc flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -cc flag
                         * @param options the Object of all image options
                         */
                        parse_cc(values, options) {
                            options.colorCorrection = values[0] == 'on';
                        }
                        /**
                         * Parses the -blendu flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -blendu flag
                         * @param options the Object of all image options
                         */
                        parse_blendu(values, options) {
                            options.horizontalBlending = values[0] == 'on';
                        }
                        /**
                         * Parses the -blendv flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -blendv flag
                         * @param options the Object of all image options
                         */
                        parse_blendv(values, options) {
                            options.verticalBlending = values[0] == 'on';
                        }
                        /**
                         * Parses the -boost flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -boost flag
                         * @param options the Object of all image options
                         */
                        parse_boost(values, options) {
                            options.boostMipMapSharpness = parseFloat(
                                values[0]
                            );
                        }
                        /**
                         * Parses the -mm flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -mm flag
                         * @param options the Object of all image options
                         */
                        parse_mm(values, options) {
                            options.modifyTextureMap.brightness = parseFloat(
                                values[0]
                            );
                            options.modifyTextureMap.contrast = parseFloat(
                                values[1]
                            );
                        }
                        /**
                         * Parses and sets the -o, -s, and -t  u, v, and w values
                         *
                         * @param values the values passed to the -o, -s, -t flag
                         * @param {Object} option the Object of either the -o, -s, -t option
                         * @param {Integer} defaultValue the Object of all image options
                         */
                        parse_ost(values, option, defaultValue) {
                            while (values.length < 3) {
                                values.push(defaultValue.toString());
                            }
                            option.u = parseFloat(values[0]);
                            option.v = parseFloat(values[1]);
                            option.w = parseFloat(values[2]);
                        }
                        /**
                         * Parses the -o flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -o flag
                         * @param options the Object of all image options
                         */
                        parse_o(values, options) {
                            this.parse_ost(values, options.offset, 0);
                        }
                        /**
                         * Parses the -s flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -s flag
                         * @param options the Object of all image options
                         */
                        parse_s(values, options) {
                            this.parse_ost(values, options.scale, 1);
                        }
                        /**
                         * Parses the -t flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -t flag
                         * @param options the Object of all image options
                         */
                        parse_t(values, options) {
                            this.parse_ost(values, options.turbulence, 0);
                        }
                        /**
                         * Parses the -texres flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -texres flag
                         * @param options the Object of all image options
                         */
                        parse_texres(values, options) {
                            options.textureResolution = parseFloat(values[0]);
                        }
                        /**
                         * Parses the -clamp flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -clamp flag
                         * @param options the Object of all image options
                         */
                        parse_clamp(values, options) {
                            options.clamp = values[0] == 'on';
                        }
                        /**
                         * Parses the -bm flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -bm flag
                         * @param options the Object of all image options
                         */
                        parse_bm(values, options) {
                            options.bumpMultiplier = parseFloat(values[0]);
                        }
                        /**
                         * Parses the -imfchan flag and updates the options object with the values.
                         *
                         * @param values the values passed to the -imfchan flag
                         * @param options the Object of all image options
                         */
                        parse_imfchan(values, options) {
                            options.imfChan = values[0];
                        }
                        /**
                         * This only exists for relection maps and denotes the type of reflection.
                         *
                         * @param values the values passed to the -type flag
                         * @param options the Object of all image options
                         */
                        parse_type(values, options) {
                            options.reflectionType = values[0];
                        }
                        /**
                         * Parses the texture's options and returns an options object with the info
                         *
                         * @param tokens all of the option tokens to pass to the texture
                         * @return {Object} a complete object of objects to apply to the texture
                         */
                        parseOptions(tokens) {
                            const options = emptyTextureOptions();
                            let option;
                            let values;
                            const optionsToValues = {};
                            tokens.reverse();
                            while (tokens.length) {
                                // token is guaranteed to exists here, hence the explicit "as"
                                const token = tokens.pop();
                                if (token.startsWith('-')) {
                                    option = token.substr(1);
                                    optionsToValues[option] = [];
                                } else if (option) {
                                    optionsToValues[option].push(token);
                                }
                            }
                            for (option in optionsToValues) {
                                if (!optionsToValues.hasOwnProperty(option)) {
                                    continue;
                                }
                                values = optionsToValues[option];
                                const optionMethod = this[`parse_${option}`];
                                if (optionMethod) {
                                    optionMethod.bind(this)(values, options);
                                }
                            }
                            return options;
                        }
                        /**
                         * Parses the given texture map line.
                         *
                         * @param tokens all of the tokens representing the texture
                         * @return a complete object of objects to apply to the texture
                         */
                        parseMap(tokens) {
                            // according to wikipedia:
                            // (https://en.wikipedia.org/wiki/Wavefront_.obj_file#Vendor_specific_alterations)
                            // there is at least one vendor that places the filename before the options
                            // rather than after (which is to spec). All options start with a '-'
                            // so if the first token doesn't start with a '-', we're going to assume
                            // it's the name of the map file.
                            let optionsString;
                            let filename = '';
                            if (!tokens[0].startsWith('-')) {
                                [filename, ...optionsString] = tokens;
                            } else {
                                filename = tokens.pop();
                                optionsString = tokens;
                            }
                            const options = this.parseOptions(optionsString);
                            options.filename = filename.replace(/\\/g, '/');
                            return options;
                        }
                        /**
                         * Parses the ambient map.
                         *
                         * @param tokens list of tokens for the map_Ka direcive
                         */
                        parse_map_Ka(tokens) {
                            this.currentMaterial.mapAmbient = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the diffuse map.
                         *
                         * @param tokens list of tokens for the map_Kd direcive
                         */
                        parse_map_Kd(tokens) {
                            this.currentMaterial.mapDiffuse = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the specular map.
                         *
                         * @param tokens list of tokens for the map_Ks direcive
                         */
                        parse_map_Ks(tokens) {
                            this.currentMaterial.mapSpecular = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the emissive map.
                         *
                         * @param tokens list of tokens for the map_Ke direcive
                         */
                        parse_map_Ke(tokens) {
                            this.currentMaterial.mapEmissive = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the specular exponent map.
                         *
                         * @param tokens list of tokens for the map_Ns direcive
                         */
                        parse_map_Ns(tokens) {
                            this.currentMaterial.mapSpecularExponent = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the dissolve map.
                         *
                         * @param tokens list of tokens for the map_d direcive
                         */
                        parse_map_d(tokens) {
                            this.currentMaterial.mapDissolve = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the anti-aliasing option.
                         *
                         * @param tokens list of tokens for the map_aat direcive
                         */
                        parse_map_aat(tokens) {
                            this.currentMaterial.antiAliasing =
                                tokens[0] == 'on';
                        }
                        /**
                         * Parses the bump map.
                         *
                         * @param tokens list of tokens for the map_bump direcive
                         */
                        parse_map_bump(tokens) {
                            this.currentMaterial.mapBump = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the bump map.
                         *
                         * @param tokens list of tokens for the bump direcive
                         */
                        parse_bump(tokens) {
                            this.parse_map_bump(tokens);
                        }
                        /**
                         * Parses the disp map.
                         *
                         * @param tokens list of tokens for the disp direcive
                         */
                        parse_disp(tokens) {
                            this.currentMaterial.mapDisplacement = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the decal map.
                         *
                         * @param tokens list of tokens for the map_decal direcive
                         */
                        parse_decal(tokens) {
                            this.currentMaterial.mapDecal = this.parseMap(
                                tokens
                            );
                        }
                        /**
                         * Parses the refl map.
                         *
                         * @param tokens list of tokens for the refl direcive
                         */
                        parse_refl(tokens) {
                            this.currentMaterial.mapReflections.push(
                                this.parseMap(tokens)
                            );
                        }
                        /**
                         * Parses the MTL file.
                         *
                         * Iterates line by line parsing each MTL directive.
                         *
                         * This function expects the first token in the line
                         * to be a valid MTL directive. That token is then used
                         * to try and run a method on this class. parse_[directive]
                         * E.g., the `newmtl` directive would try to call the method
                         * parse_newmtl. Each parsing function takes in the remaining
                         * list of tokens and updates the currentMaterial class with
                         * the attributes provided.
                         */
                        parse() {
                            const lines = this.data.split(/\r?\n/);
                            for (let line of lines) {
                                line = line.trim();
                                if (!line || line.startsWith('#')) {
                                    continue;
                                }
                                const [directive, ...tokens] = line.split(/\s/);
                                const parseMethod = this[`parse_${directive}`];
                                if (!parseMethod) {
                                    console.warn(
                                        `Don't know how to parse the directive: "${directive}"`
                                    );
                                    continue;
                                }
                                // console.log(`Parsing "${directive}" with tokens: ${tokens}`);
                                parseMethod.bind(this)(tokens);
                            }
                            // some cleanup. These don't need to be exposed as public data.
                            delete this.data;
                            this.currentMaterial = SENTINEL_MATERIAL;
                        }
                    }
                    function emptyTextureOptions() {
                        return {
                            colorCorrection: false,
                            horizontalBlending: true,
                            verticalBlending: true,
                            boostMipMapSharpness: 0,
                            modifyTextureMap: {
                                brightness: 0,
                                contrast: 1,
                            },
                            offset: { u: 0, v: 0, w: 0 },
                            scale: { u: 1, v: 1, w: 1 },
                            turbulence: { u: 0, v: 0, w: 0 },
                            clamp: false,
                            textureResolution: null,
                            bumpMultiplier: 1,
                            imfChan: null,
                            filename: '',
                        };
                    }

                    /***/
                },

            /***/ './src/mesh.ts':
                /*!*********************!*\
  !*** ./src/mesh.ts ***!
  \*********************/
                /*! exports provided: default */
                /***/ function (
                    module,
                    __webpack_exports__,
                    __webpack_require__
                ) {
                    'use strict';
                    __webpack_require__.r(__webpack_exports__);
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'default',
                        function () {
                            return Mesh;
                        }
                    );
                    /* harmony import */ var _layout__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
                        /*! ./layout */ './src/layout.ts'
                    );

                    /**
                     * The main Mesh class. The constructor will parse through the OBJ file data
                     * and collect the vertex, vertex normal, texture, and face information. This
                     * information can then be used later on when creating your VBOs. See
                     * OBJ.initMeshBuffers for an example of how to use the newly created Mesh
                     */
                    class Mesh {
                        /**
                         * Create a Mesh
                         * @param {String} objectData - a string representation of an OBJ file with
                         *     newlines preserved.
                         * @param {Object} options - a JS object containing valid options. See class
                         *     documentation for options.
                         * @param {bool} options.enableWTextureCoord - Texture coordinates can have
                         *     an optional "w" coordinate after the u and v coordinates. This extra
                         *     value can be used in order to perform fancy transformations on the
                         *     textures themselves. Default is to truncate to only the u an v
                         *     coordinates. Passing true will provide a default value of 0 in the
                         *     event that any or all texture coordinates don't provide a w value.
                         *     Always use the textureStride attribute in order to determine the
                         *     stride length of the texture coordinates when rendering the element
                         *     array.
                         * @param {bool} options.calcTangentsAndBitangents - Calculate the tangents
                         *     and bitangents when loading of the OBJ is completed. This adds two new
                         *     attributes to the Mesh instance: `tangents` and `bitangents`.
                         */
                        constructor(objectData, options) {
                            this.name = '';
                            this.indicesPerMaterial = [];
                            this.materialsByIndex = {};
                            this.tangents = [];
                            this.bitangents = [];
                            options = options || {};
                            options.materials = options.materials || {};
                            options.enableWTextureCoord = !!options.enableWTextureCoord;
                            // the list of unique vertex, normal, texture, attributes
                            this.vertexNormals = [];
                            this.textures = [];
                            // the indicies to draw the faces
                            this.indices = [];
                            this.textureStride = options.enableWTextureCoord
                                ? 3
                                : 2;
                            /*
        The OBJ file format does a sort of compression when saving a model in a
        program like Blender. There are at least 3 sections (4 including textures)
        within the file. Each line in a section begins with the same string:
          * 'v': indicates vertex section
          * 'vn': indicates vertex normal section
          * 'f': indicates the faces section
          * 'vt': indicates vertex texture section (if textures were used on the model)
        Each of the above sections (except for the faces section) is a list/set of
        unique vertices.

        Each line of the faces section contains a list of
        (vertex, [texture], normal) groups.

        **Note:** The following documentation will use a capital "V" Vertex to
        denote the above (vertex, [texture], normal) groups whereas a lowercase
        "v" vertex is used to denote an X, Y, Z coordinate.

        Some examples:
            // the texture index is optional, both formats are possible for models
            // without a texture applied
            f 1/25 18/46 12/31
            f 1//25 18//46 12//31

            // A 3 vertex face with texture indices
            f 16/92/11 14/101/22 1/69/1

            // A 4 vertex face
            f 16/92/11 40/109/40 38/114/38 14/101/22

        The first two lines are examples of a 3 vertex face without a texture applied.
        The second is an example of a 3 vertex face with a texture applied.
        The third is an example of a 4 vertex face. Note: a face can contain N
        number of vertices.

        Each number that appears in one of the groups is a 1-based index
        corresponding to an item from the other sections (meaning that indexing
        starts at one and *not* zero).

        For example:
            `f 16/92/11` is saying to
              - take the 16th element from the [v] vertex array
              - take the 92nd element from the [vt] texture array
              - take the 11th element from the [vn] normal array
            and together they make a unique vertex.
        Using all 3+ unique Vertices from the face line will produce a polygon.

        Now, you could just go through the OBJ file and create a new vertex for
        each face line and WebGL will draw what appears to be the same model.
        However, vertices will be overlapped and duplicated all over the place.

        Consider a cube in 3D space centered about the origin and each side is
        2 units long. The front face (with the positive Z-axis pointing towards
        you) would have a Top Right vertex (looking orthogonal to its normal)
        mapped at (1,1,1) The right face would have a Top Left vertex (looking
        orthogonal to its normal) at (1,1,1) and the top face would have a Bottom
        Right vertex (looking orthogonal to its normal) at (1,1,1). Each face
        has a vertex at the same coordinates, however, three distinct vertices
        will be drawn at the same spot.

        To solve the issue of duplicate Vertices (the `(vertex, [texture], normal)`
        groups), while iterating through the face lines, when a group is encountered
        the whole group string ('16/92/11') is checked to see if it exists in the
        packed.hashindices object, and if it doesn't, the indices it specifies
        are used to look up each attribute in the corresponding attribute arrays
        already created. The values are then copied to the corresponding unpacked
        array (flattened to play nice with WebGL's ELEMENT_ARRAY_BUFFER indexing),
        the group string is added to the hashindices set and the current unpacked
        index is used as this hashindices value so that the group of elements can
        be reused. The unpacked index is incremented. If the group string already
        exists in the hashindices object, its corresponding value is the index of
        that group and is appended to the unpacked indices array.
       */
                            const verts = [];
                            const vertNormals = [];
                            const textures = [];
                            const materialNamesByIndex = [];
                            const materialIndicesByName = {};
                            // keep track of what material we've seen last
                            let currentMaterialIndex = -1;
                            let currentObjectByMaterialIndex = 0;
                            // unpacking stuff
                            const unpacked = {
                                verts: [],
                                norms: [],
                                textures: [],
                                hashindices: {},
                                indices: [[]],
                                materialIndices: [],
                                index: 0,
                            };
                            const VERTEX_RE = /^v\s/;
                            const NORMAL_RE = /^vn\s/;
                            const TEXTURE_RE = /^vt\s/;
                            const FACE_RE = /^f\s/;
                            const WHITESPACE_RE = /\s+/;
                            const USE_MATERIAL_RE = /^usemtl/;
                            // array of lines separated by the newline
                            const lines = objectData.split('\n');
                            for (let line of lines) {
                                line = line.trim();
                                if (!line || line.startsWith('#')) {
                                    continue;
                                }
                                const elements = line.split(WHITESPACE_RE);
                                elements.shift();
                                if (VERTEX_RE.test(line)) {
                                    // if this is a vertex
                                    verts.push(...elements);
                                } else if (NORMAL_RE.test(line)) {
                                    // if this is a vertex normal
                                    vertNormals.push(...elements);
                                } else if (TEXTURE_RE.test(line)) {
                                    let coords = elements;
                                    // by default, the loader will only look at the U and V
                                    // coordinates of the vt declaration. So, this truncates the
                                    // elements to only those 2 values. If W texture coordinate
                                    // support is enabled, then the texture coordinate is
                                    // expected to have three values in it.
                                    if (
                                        elements.length > 2 &&
                                        !options.enableWTextureCoord
                                    ) {
                                        coords = elements.slice(0, 2);
                                    } else if (
                                        elements.length === 2 &&
                                        options.enableWTextureCoord
                                    ) {
                                        // If for some reason W texture coordinate support is enabled
                                        // and only the U and V coordinates are given, then we supply
                                        // the default value of 0 so that the stride length is correct
                                        // when the textures are unpacked below.
                                        coords.push('0');
                                    }
                                    textures.push(...coords);
                                } else if (USE_MATERIAL_RE.test(line)) {
                                    const materialName = elements[0];
                                    // check to see if we've ever seen it before
                                    if (
                                        !(materialName in materialIndicesByName)
                                    ) {
                                        // new material we've never seen
                                        materialNamesByIndex.push(materialName);
                                        materialIndicesByName[materialName] =
                                            materialNamesByIndex.length - 1;
                                        // push new array into indices
                                        // already contains an array at index zero, don't add
                                        if (
                                            materialIndicesByName[
                                                materialName
                                            ] > 0
                                        ) {
                                            unpacked.indices.push([]);
                                        }
                                    }
                                    // keep track of the current material index
                                    currentMaterialIndex =
                                        materialIndicesByName[materialName];
                                    // update current index array
                                    currentObjectByMaterialIndex = currentMaterialIndex;
                                } else if (FACE_RE.test(line)) {
                                    // if this is a face
                                    /*
                split this face into an array of Vertex groups
                for example:
                   f 16/92/11 14/101/22 1/69/1
                becomes:
                  ['16/92/11', '14/101/22', '1/69/1'];
                */
                                    const triangles = triangulate(elements);
                                    for (const triangle of triangles) {
                                        for (
                                            let j = 0, eleLen = triangle.length;
                                            j < eleLen;
                                            j++
                                        ) {
                                            const hash =
                                                triangle[j] +
                                                ',' +
                                                currentMaterialIndex;
                                            if (hash in unpacked.hashindices) {
                                                unpacked.indices[
                                                    currentObjectByMaterialIndex
                                                ].push(
                                                    unpacked.hashindices[hash]
                                                );
                                            } else {
                                                /*
                        Each element of the face line array is a Vertex which has its
                        attributes delimited by a forward slash. This will separate
                        each attribute into another array:
                            '19/92/11'
                        becomes:
                            Vertex = ['19', '92', '11'];
                        where
                            Vertex[0] is the vertex index
                            Vertex[1] is the texture index
                            Vertex[2] is the normal index
                         Think of faces having Vertices which are comprised of the
                         attributes location (v), texture (vt), and normal (vn).
                         */
                                                const vertex = triangle[
                                                    j
                                                ].split('/');
                                                // it's possible for faces to only specify the vertex
                                                // and the normal. In this case, vertex will only have
                                                // a length of 2 and not 3 and the normal will be the
                                                // second item in the list with an index of 1.
                                                const normalIndex =
                                                    vertex.length - 1;
                                                /*
                         The verts, textures, and vertNormals arrays each contain a
                         flattend array of coordinates.

                         Because it gets confusing by referring to Vertex and then
                         vertex (both are different in my descriptions) I will explain
                         what's going on using the vertexNormals array:

                         vertex[2] will contain the one-based index of the vertexNormals
                         section (vn). One is subtracted from this index number to play
                         nice with javascript's zero-based array indexing.

                         Because vertexNormal is a flattened array of x, y, z values,
                         simple pointer arithmetic is used to skip to the start of the
                         vertexNormal, then the offset is added to get the correct
                         component: +0 is x, +1 is y, +2 is z.

                         This same process is repeated for verts and textures.
                         */
                                                // Vertex position
                                                unpacked.verts.push(
                                                    +verts[
                                                        (+vertex[0] - 1) * 3 + 0
                                                    ]
                                                );
                                                unpacked.verts.push(
                                                    +verts[
                                                        (+vertex[0] - 1) * 3 + 1
                                                    ]
                                                );
                                                unpacked.verts.push(
                                                    +verts[
                                                        (+vertex[0] - 1) * 3 + 2
                                                    ]
                                                );
                                                // Vertex textures
                                                if (textures.length) {
                                                    const stride = options.enableWTextureCoord
                                                        ? 3
                                                        : 2;
                                                    unpacked.textures.push(
                                                        +textures[
                                                            (+vertex[1] - 1) *
                                                                stride +
                                                                0
                                                        ]
                                                    );
                                                    unpacked.textures.push(
                                                        +textures[
                                                            (+vertex[1] - 1) *
                                                                stride +
                                                                1
                                                        ]
                                                    );
                                                    if (
                                                        options.enableWTextureCoord
                                                    ) {
                                                        unpacked.textures.push(
                                                            +textures[
                                                                (+vertex[1] -
                                                                    1) *
                                                                    stride +
                                                                    2
                                                            ]
                                                        );
                                                    }
                                                }
                                                // Vertex normals
                                                unpacked.norms.push(
                                                    +vertNormals[
                                                        (+vertex[normalIndex] -
                                                            1) *
                                                            3 +
                                                            0
                                                    ]
                                                );
                                                unpacked.norms.push(
                                                    +vertNormals[
                                                        (+vertex[normalIndex] -
                                                            1) *
                                                            3 +
                                                            1
                                                    ]
                                                );
                                                unpacked.norms.push(
                                                    +vertNormals[
                                                        (+vertex[normalIndex] -
                                                            1) *
                                                            3 +
                                                            2
                                                    ]
                                                );
                                                // Vertex material indices
                                                unpacked.materialIndices.push(
                                                    currentMaterialIndex
                                                );
                                                // add the newly created Vertex to the list of indices
                                                unpacked.hashindices[hash] =
                                                    unpacked.index;
                                                unpacked.indices[
                                                    currentObjectByMaterialIndex
                                                ].push(
                                                    unpacked.hashindices[hash]
                                                );
                                                // increment the counter
                                                unpacked.index += 1;
                                            }
                                        }
                                    }
                                }
                            }
                            this.vertices = unpacked.verts;
                            this.vertexNormals = unpacked.norms;
                            this.textures = unpacked.textures;
                            this.vertexMaterialIndices =
                                unpacked.materialIndices;
                            this.indices =
                                unpacked.indices[currentObjectByMaterialIndex];
                            this.indicesPerMaterial = unpacked.indices;
                            this.materialNames = materialNamesByIndex;
                            this.materialIndices = materialIndicesByName;
                            this.materialsByIndex = {};
                            if (options.calcTangentsAndBitangents) {
                                this.calculateTangentsAndBitangents();
                            }
                        }
                        /**
                         * Calculates the tangents and bitangents of the mesh that forms an orthogonal basis together with the
                         * normal in the direction of the texture coordinates. These are useful for setting up the TBN matrix
                         * when distorting the normals through normal maps.
                         * Method derived from: http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/
                         *
                         * This method requires the normals and texture coordinates to be parsed and set up correctly.
                         * Adds the tangents and bitangents as members of the class instance.
                         */
                        calculateTangentsAndBitangents() {
                            console.assert(
                                !!(
                                    this.vertices &&
                                    this.vertices.length &&
                                    this.vertexNormals &&
                                    this.vertexNormals.length &&
                                    this.textures &&
                                    this.textures.length
                                ),
                                'Missing attributes for calculating tangents and bitangents'
                            );
                            const unpacked = {
                                tangents: [
                                    ...new Array(this.vertices.length),
                                ].map((_) => 0),
                                bitangents: [
                                    ...new Array(this.vertices.length),
                                ].map((_) => 0),
                            };
                            // Loop through all faces in the whole mesh
                            const indices = this.indices;
                            const vertices = this.vertices;
                            const normals = this.vertexNormals;
                            const uvs = this.textures;
                            for (let i = 0; i < indices.length; i += 3) {
                                const i0 = indices[i + 0];
                                const i1 = indices[i + 1];
                                const i2 = indices[i + 2];
                                const x_v0 = vertices[i0 * 3 + 0];
                                const y_v0 = vertices[i0 * 3 + 1];
                                const z_v0 = vertices[i0 * 3 + 2];
                                const x_uv0 = uvs[i0 * 2 + 0];
                                const y_uv0 = uvs[i0 * 2 + 1];
                                const x_v1 = vertices[i1 * 3 + 0];
                                const y_v1 = vertices[i1 * 3 + 1];
                                const z_v1 = vertices[i1 * 3 + 2];
                                const x_uv1 = uvs[i1 * 2 + 0];
                                const y_uv1 = uvs[i1 * 2 + 1];
                                const x_v2 = vertices[i2 * 3 + 0];
                                const y_v2 = vertices[i2 * 3 + 1];
                                const z_v2 = vertices[i2 * 3 + 2];
                                const x_uv2 = uvs[i2 * 2 + 0];
                                const y_uv2 = uvs[i2 * 2 + 1];
                                const x_deltaPos1 = x_v1 - x_v0;
                                const y_deltaPos1 = y_v1 - y_v0;
                                const z_deltaPos1 = z_v1 - z_v0;
                                const x_deltaPos2 = x_v2 - x_v0;
                                const y_deltaPos2 = y_v2 - y_v0;
                                const z_deltaPos2 = z_v2 - z_v0;
                                const x_uvDeltaPos1 = x_uv1 - x_uv0;
                                const y_uvDeltaPos1 = y_uv1 - y_uv0;
                                const x_uvDeltaPos2 = x_uv2 - x_uv0;
                                const y_uvDeltaPos2 = y_uv2 - y_uv0;
                                const rInv =
                                    x_uvDeltaPos1 * y_uvDeltaPos2 -
                                    y_uvDeltaPos1 * x_uvDeltaPos2;
                                const r =
                                    1.0 / Math.abs(rInv < 0.0001 ? 1.0 : rInv);
                                // Tangent
                                const x_tangent =
                                    (x_deltaPos1 * y_uvDeltaPos2 -
                                        x_deltaPos2 * y_uvDeltaPos1) *
                                    r;
                                const y_tangent =
                                    (y_deltaPos1 * y_uvDeltaPos2 -
                                        y_deltaPos2 * y_uvDeltaPos1) *
                                    r;
                                const z_tangent =
                                    (z_deltaPos1 * y_uvDeltaPos2 -
                                        z_deltaPos2 * y_uvDeltaPos1) *
                                    r;
                                // Bitangent
                                const x_bitangent =
                                    (x_deltaPos2 * x_uvDeltaPos1 -
                                        x_deltaPos1 * x_uvDeltaPos2) *
                                    r;
                                const y_bitangent =
                                    (y_deltaPos2 * x_uvDeltaPos1 -
                                        y_deltaPos1 * x_uvDeltaPos2) *
                                    r;
                                const z_bitangent =
                                    (z_deltaPos2 * x_uvDeltaPos1 -
                                        z_deltaPos1 * x_uvDeltaPos2) *
                                    r;
                                // Gram-Schmidt orthogonalize
                                //t = glm::normalize(t - n * glm:: dot(n, t));
                                const x_n0 = normals[i0 * 3 + 0];
                                const y_n0 = normals[i0 * 3 + 1];
                                const z_n0 = normals[i0 * 3 + 2];
                                const x_n1 = normals[i1 * 3 + 0];
                                const y_n1 = normals[i1 * 3 + 1];
                                const z_n1 = normals[i1 * 3 + 2];
                                const x_n2 = normals[i2 * 3 + 0];
                                const y_n2 = normals[i2 * 3 + 1];
                                const z_n2 = normals[i2 * 3 + 2];
                                // Tangent
                                const n0_dot_t =
                                    x_tangent * x_n0 +
                                    y_tangent * y_n0 +
                                    z_tangent * z_n0;
                                const n1_dot_t =
                                    x_tangent * x_n1 +
                                    y_tangent * y_n1 +
                                    z_tangent * z_n1;
                                const n2_dot_t =
                                    x_tangent * x_n2 +
                                    y_tangent * y_n2 +
                                    z_tangent * z_n2;
                                const x_resTangent0 =
                                    x_tangent - x_n0 * n0_dot_t;
                                const y_resTangent0 =
                                    y_tangent - y_n0 * n0_dot_t;
                                const z_resTangent0 =
                                    z_tangent - z_n0 * n0_dot_t;
                                const x_resTangent1 =
                                    x_tangent - x_n1 * n1_dot_t;
                                const y_resTangent1 =
                                    y_tangent - y_n1 * n1_dot_t;
                                const z_resTangent1 =
                                    z_tangent - z_n1 * n1_dot_t;
                                const x_resTangent2 =
                                    x_tangent - x_n2 * n2_dot_t;
                                const y_resTangent2 =
                                    y_tangent - y_n2 * n2_dot_t;
                                const z_resTangent2 =
                                    z_tangent - z_n2 * n2_dot_t;
                                const magTangent0 = Math.sqrt(
                                    x_resTangent0 * x_resTangent0 +
                                        y_resTangent0 * y_resTangent0 +
                                        z_resTangent0 * z_resTangent0
                                );
                                const magTangent1 = Math.sqrt(
                                    x_resTangent1 * x_resTangent1 +
                                        y_resTangent1 * y_resTangent1 +
                                        z_resTangent1 * z_resTangent1
                                );
                                const magTangent2 = Math.sqrt(
                                    x_resTangent2 * x_resTangent2 +
                                        y_resTangent2 * y_resTangent2 +
                                        z_resTangent2 * z_resTangent2
                                );
                                // Bitangent
                                const n0_dot_bt =
                                    x_bitangent * x_n0 +
                                    y_bitangent * y_n0 +
                                    z_bitangent * z_n0;
                                const n1_dot_bt =
                                    x_bitangent * x_n1 +
                                    y_bitangent * y_n1 +
                                    z_bitangent * z_n1;
                                const n2_dot_bt =
                                    x_bitangent * x_n2 +
                                    y_bitangent * y_n2 +
                                    z_bitangent * z_n2;
                                const x_resBitangent0 =
                                    x_bitangent - x_n0 * n0_dot_bt;
                                const y_resBitangent0 =
                                    y_bitangent - y_n0 * n0_dot_bt;
                                const z_resBitangent0 =
                                    z_bitangent - z_n0 * n0_dot_bt;
                                const x_resBitangent1 =
                                    x_bitangent - x_n1 * n1_dot_bt;
                                const y_resBitangent1 =
                                    y_bitangent - y_n1 * n1_dot_bt;
                                const z_resBitangent1 =
                                    z_bitangent - z_n1 * n1_dot_bt;
                                const x_resBitangent2 =
                                    x_bitangent - x_n2 * n2_dot_bt;
                                const y_resBitangent2 =
                                    y_bitangent - y_n2 * n2_dot_bt;
                                const z_resBitangent2 =
                                    z_bitangent - z_n2 * n2_dot_bt;
                                const magBitangent0 = Math.sqrt(
                                    x_resBitangent0 * x_resBitangent0 +
                                        y_resBitangent0 * y_resBitangent0 +
                                        z_resBitangent0 * z_resBitangent0
                                );
                                const magBitangent1 = Math.sqrt(
                                    x_resBitangent1 * x_resBitangent1 +
                                        y_resBitangent1 * y_resBitangent1 +
                                        z_resBitangent1 * z_resBitangent1
                                );
                                const magBitangent2 = Math.sqrt(
                                    x_resBitangent2 * x_resBitangent2 +
                                        y_resBitangent2 * y_resBitangent2 +
                                        z_resBitangent2 * z_resBitangent2
                                );
                                unpacked.tangents[i0 * 3 + 0] +=
                                    x_resTangent0 / magTangent0;
                                unpacked.tangents[i0 * 3 + 1] +=
                                    y_resTangent0 / magTangent0;
                                unpacked.tangents[i0 * 3 + 2] +=
                                    z_resTangent0 / magTangent0;
                                unpacked.tangents[i1 * 3 + 0] +=
                                    x_resTangent1 / magTangent1;
                                unpacked.tangents[i1 * 3 + 1] +=
                                    y_resTangent1 / magTangent1;
                                unpacked.tangents[i1 * 3 + 2] +=
                                    z_resTangent1 / magTangent1;
                                unpacked.tangents[i2 * 3 + 0] +=
                                    x_resTangent2 / magTangent2;
                                unpacked.tangents[i2 * 3 + 1] +=
                                    y_resTangent2 / magTangent2;
                                unpacked.tangents[i2 * 3 + 2] +=
                                    z_resTangent2 / magTangent2;
                                unpacked.bitangents[i0 * 3 + 0] +=
                                    x_resBitangent0 / magBitangent0;
                                unpacked.bitangents[i0 * 3 + 1] +=
                                    y_resBitangent0 / magBitangent0;
                                unpacked.bitangents[i0 * 3 + 2] +=
                                    z_resBitangent0 / magBitangent0;
                                unpacked.bitangents[i1 * 3 + 0] +=
                                    x_resBitangent1 / magBitangent1;
                                unpacked.bitangents[i1 * 3 + 1] +=
                                    y_resBitangent1 / magBitangent1;
                                unpacked.bitangents[i1 * 3 + 2] +=
                                    z_resBitangent1 / magBitangent1;
                                unpacked.bitangents[i2 * 3 + 0] +=
                                    x_resBitangent2 / magBitangent2;
                                unpacked.bitangents[i2 * 3 + 1] +=
                                    y_resBitangent2 / magBitangent2;
                                unpacked.bitangents[i2 * 3 + 2] +=
                                    z_resBitangent2 / magBitangent2;
                                // TODO: check handedness
                            }
                            this.tangents = unpacked.tangents;
                            this.bitangents = unpacked.bitangents;
                        }
                        /**
                         * @param layout - A {@link Layout} object that describes the
                         * desired memory layout of the generated buffer
                         * @return The packed array in the ... TODO
                         */
                        makeBufferData(layout) {
                            const numItems = this.vertices.length / 3;
                            const buffer = new ArrayBuffer(
                                layout.stride * numItems
                            );
                            buffer.numItems = numItems;
                            const dataView = new DataView(buffer);
                            for (
                                let i = 0, vertexOffset = 0;
                                i < numItems;
                                i++
                            ) {
                                vertexOffset = i * layout.stride;
                                // copy in the vertex data in the order and format given by the
                                // layout param
                                for (const attribute of layout.attributes) {
                                    const offset =
                                        vertexOffset +
                                        layout.attributeMap[attribute.key]
                                            .offset;
                                    switch (attribute.key) {
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].POSITION.key:
                                            dataView.setFloat32(
                                                offset,
                                                this.vertices[i * 3],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                this.vertices[i * 3 + 1],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 8,
                                                this.vertices[i * 3 + 2],
                                                true
                                            );
                                            break;
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].UV.key:
                                            dataView.setFloat32(
                                                offset,
                                                this.textures[i * 2],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                this.textures[i * 2 + 1],
                                                true
                                            );
                                            break;
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].NORMAL.key:
                                            dataView.setFloat32(
                                                offset,
                                                this.vertexNormals[i * 3],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                this.vertexNormals[i * 3 + 1],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 8,
                                                this.vertexNormals[i * 3 + 2],
                                                true
                                            );
                                            break;
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].MATERIAL_INDEX.key:
                                            dataView.setInt16(
                                                offset,
                                                this.vertexMaterialIndices[i],
                                                true
                                            );
                                            break;
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].AMBIENT.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.ambient[0],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                material.ambient[1],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 8,
                                                material.ambient[2],
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].DIFFUSE.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.diffuse[0],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                material.diffuse[1],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 8,
                                                material.diffuse[2],
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].SPECULAR.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.specular[0],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                material.specular[1],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 8,
                                                material.specular[2],
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].SPECULAR_EXPONENT.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.specularExponent,
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].EMISSIVE.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.emissive[0],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                material.emissive[1],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 8,
                                                material.emissive[2],
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].TRANSMISSION_FILTER.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.transmissionFilter[0],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 4,
                                                material.transmissionFilter[1],
                                                true
                                            );
                                            dataView.setFloat32(
                                                offset + 8,
                                                material.transmissionFilter[2],
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].DISSOLVE.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.dissolve,
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].ILLUMINATION.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setInt16(
                                                offset,
                                                material.illumination,
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].REFRACTION_INDEX.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.refractionIndex,
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].SHARPNESS.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setFloat32(
                                                offset,
                                                material.sharpness,
                                                true
                                            );
                                            break;
                                        }
                                        case _layout__WEBPACK_IMPORTED_MODULE_0__[
                                            'Layout'
                                        ].ANTI_ALIASING.key: {
                                            const materialIndex = this
                                                .vertexMaterialIndices[i];
                                            const material = this
                                                .materialsByIndex[
                                                materialIndex
                                            ];
                                            if (!material) {
                                                console.warn(
                                                    'Material "' +
                                                        this.materialNames[
                                                            materialIndex
                                                        ] +
                                                        '" not found in mesh. Did you forget to call addMaterialLibrary(...)?"'
                                                );
                                                break;
                                            }
                                            dataView.setInt16(
                                                offset,
                                                material.antiAliasing ? 1 : 0,
                                                true
                                            );
                                            break;
                                        }
                                    }
                                }
                            }
                            return buffer;
                        }
                        makeIndexBufferData() {
                            const buffer = new Uint16Array(this.indices);
                            buffer.numItems = this.indices.length;
                            return buffer;
                        }
                        makeIndexBufferDataForMaterials(...materialIndices) {
                            const indices = new Array().concat(
                                ...materialIndices.map(
                                    (mtlIdx) => this.indicesPerMaterial[mtlIdx]
                                )
                            );
                            const buffer = new Uint16Array(indices);
                            buffer.numItems = indices.length;
                            return buffer;
                        }
                        addMaterialLibrary(mtl) {
                            for (const name in mtl.materials) {
                                if (!(name in this.materialIndices)) {
                                    // This material is not referenced by the mesh
                                    continue;
                                }
                                const material = mtl.materials[name];
                                // Find the material index for this material
                                const materialIndex = this.materialIndices[
                                    material.name
                                ];
                                // Put the material into the materialsByIndex object at the right
                                // spot as determined when the obj file was parsed
                                this.materialsByIndex[materialIndex] = material;
                            }
                        }
                    }
                    function* triangulate(elements) {
                        if (elements.length <= 3) {
                            yield elements;
                        } else if (elements.length === 4) {
                            yield [elements[0], elements[1], elements[2]];
                            yield [elements[2], elements[3], elements[0]];
                        } else {
                            for (let i = 1; i < elements.length - 1; i++) {
                                yield [
                                    elements[0],
                                    elements[i],
                                    elements[i + 1],
                                ];
                            }
                        }
                    }

                    /***/
                },

            /***/ './src/utils.ts':
                /*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
                /*! exports provided: downloadModels, downloadMeshes, initMeshBuffers, deleteMeshBuffers */
                /***/ function (
                    module,
                    __webpack_exports__,
                    __webpack_require__
                ) {
                    'use strict';
                    __webpack_require__.r(__webpack_exports__);
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'downloadModels',
                        function () {
                            return downloadModels;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'downloadMeshes',
                        function () {
                            return downloadMeshes;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'initMeshBuffers',
                        function () {
                            return initMeshBuffers;
                        }
                    );
                    /* harmony export (binding) */ __webpack_require__.d(
                        __webpack_exports__,
                        'deleteMeshBuffers',
                        function () {
                            return deleteMeshBuffers;
                        }
                    );
                    /* harmony import */ var _mesh__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
                        /*! ./mesh */ './src/mesh.ts'
                    );
                    /* harmony import */ var _material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
                        /*! ./material */ './src/material.ts'
                    );

                    function downloadMtlTextures(mtl, root) {
                        const mapAttributes = [
                            'mapDiffuse',
                            'mapAmbient',
                            'mapSpecular',
                            'mapDissolve',
                            'mapBump',
                            'mapDisplacement',
                            'mapDecal',
                            'mapEmissive',
                        ];
                        if (!root.endsWith('/')) {
                            root += '/';
                        }
                        const textures = [];
                        for (const materialName in mtl.materials) {
                            if (!mtl.materials.hasOwnProperty(materialName)) {
                                continue;
                            }
                            const material = mtl.materials[materialName];
                            for (const attr of mapAttributes) {
                                const mapData = material[attr];
                                if (!mapData || !mapData.filename) {
                                    continue;
                                }
                                const url = root + mapData.filename;
                                textures.push(
                                    fetch(url)
                                        .then((response) => {
                                            if (!response.ok) {
                                                throw new Error();
                                            }
                                            return response.blob();
                                        })
                                        .then(function (data) {
                                            const image = new Image();
                                            image.src = URL.createObjectURL(
                                                data
                                            );
                                            mapData.texture = image;
                                            return new Promise(
                                                (resolve) =>
                                                    (image.onload = resolve)
                                            );
                                        })
                                        .catch(() => {
                                            console.error(
                                                `Unable to download texture: ${url}`
                                            );
                                        })
                                );
                            }
                        }
                        return Promise.all(textures);
                    }
                    function getMtl(modelOptions) {
                        if (!(typeof modelOptions.mtl === 'string')) {
                            return modelOptions.obj.replace(/\.obj$/, '.mtl');
                        }
                        return modelOptions.mtl;
                    }
                    /**
                     * Accepts a list of model request objects and returns a Promise that
                     * resolves when all models have been downloaded and parsed.
                     *
                     * The list of model objects follow this interface:
                     * {
                     *  obj: 'path/to/model.obj',
                     *  mtl: true | 'path/to/model.mtl',
                     *  downloadMtlTextures: true | false
                     *  mtlTextureRoot: '/models/suzanne/maps'
                     *  name: 'suzanne'
                     * }
                     *
                     * The `obj` attribute is required and should be the path to the
                     * model's .obj file relative to the current repo (absolute URLs are
                     * suggested).
                     *
                     * The `mtl` attribute is optional and can either be a boolean or
                     * a path to the model's .mtl file relative to the current URL. If
                     * the value is `true`, then the path and basename given for the `obj`
                     * attribute is used replacing the .obj suffix for .mtl
                     * E.g.: {obj: 'models/foo.obj', mtl: true} would search for 'models/foo.mtl'
                     *
                     * The `name` attribute is optional and is a human friendly name to be
                     * included with the parsed OBJ and MTL files. If not given, the base .obj
                     * filename will be used.
                     *
                     * The `downloadMtlTextures` attribute is a flag for automatically downloading
                     * any images found in the MTL file and attaching them to each Material
                     * created from that file. For example, if material.mapDiffuse is set (there
                     * was data in the MTL file), then material.mapDiffuse.texture will contain
                     * the downloaded image. This option defaults to `true`. By default, the MTL's
                     * URL will be used to determine the location of the images.
                     *
                     * The `mtlTextureRoot` attribute is optional and should point to the location
                     * on the server that this MTL's texture files are located. The default is to
                     * use the MTL file's location.
                     *
                     * @returns {Promise} the result of downloading the given list of models. The
                     * promise will resolve with an object whose keys are the names of the models
                     * and the value is its Mesh object. Each Mesh object will automatically
                     * have its addMaterialLibrary() method called to set the given MTL data (if given).
                     */
                    function downloadModels(models) {
                        const finished = [];
                        for (const model of models) {
                            if (!model.obj) {
                                throw new Error(
                                    '"obj" attribute of model object not set. The .obj file is required to be set ' +
                                        'in order to use downloadModels()'
                                );
                            }
                            const options = {
                                indicesPerMaterial: !!model.indicesPerMaterial,
                                calcTangentsAndBitangents: !!model.calcTangentsAndBitangents,
                            };
                            // if the name is not provided, dervive it from the given OBJ
                            let name = model.name;
                            if (!name) {
                                const parts = model.obj.split('/');
                                name = parts[parts.length - 1].replace(
                                    '.obj',
                                    ''
                                );
                            }
                            const namePromise = Promise.resolve(name);
                            const meshPromise = fetch(model.obj)
                                .then((response) => response.text())
                                .then((data) => {
                                    return new _mesh__WEBPACK_IMPORTED_MODULE_0__[
                                        'default'
                                    ](data, options);
                                });
                            let mtlPromise;
                            // Download MaterialLibrary file?
                            if (model.mtl) {
                                const mtl = getMtl(model);
                                mtlPromise = fetch(mtl)
                                    .then((response) => response.text())
                                    .then((data) => {
                                        const material = new _material__WEBPACK_IMPORTED_MODULE_1__[
                                            'MaterialLibrary'
                                        ](data);
                                        if (
                                            model.downloadMtlTextures !== false
                                        ) {
                                            let root = model.mtlTextureRoot;
                                            if (!root) {
                                                // get the directory of the MTL file as default
                                                root = mtl.substr(
                                                    0,
                                                    mtl.lastIndexOf('/')
                                                );
                                            }
                                            // downloadMtlTextures returns a Promise that
                                            // is resolved once all of the images it
                                            // contains are downloaded. These are then
                                            // attached to the map data objects
                                            return Promise.all([
                                                Promise.resolve(material),
                                                downloadMtlTextures(
                                                    material,
                                                    root
                                                ),
                                            ]);
                                        }
                                        return Promise.all([
                                            Promise.resolve(material),
                                            undefined,
                                        ]);
                                    })
                                    .then((value) => {
                                        return value[0];
                                    });
                            }
                            const parsed = [
                                namePromise,
                                meshPromise,
                                mtlPromise,
                            ];
                            finished.push(Promise.all(parsed));
                        }
                        return Promise.all(finished).then((ms) => {
                            // the "finished" promise is a list of name, Mesh instance,
                            // and MaterialLibary instance. This unpacks and returns an
                            // object mapping name to Mesh (Mesh points to MTL).
                            const models = {};
                            for (const model of ms) {
                                const [name, mesh, mtl] = model;
                                mesh.name = name;
                                if (mtl) {
                                    mesh.addMaterialLibrary(mtl);
                                }
                                models[name] = mesh;
                            }
                            return models;
                        });
                    }
                    /**
                     * Takes in an object of `mesh_name`, `'/url/to/OBJ/file'` pairs and a callback
                     * function. Each OBJ file will be ajaxed in and automatically converted to
                     * an OBJ.Mesh. When all files have successfully downloaded the callback
                     * function provided will be called and passed in an object containing
                     * the newly created meshes.
                     *
                     * **Note:** In order to use this function as a way to download meshes, a
                     * webserver of some sort must be used.
                     *
                     * @param {Object} nameAndAttrs an object where the key is the name of the mesh and the value is the url to that mesh's OBJ file
                     *
                     * @param {Function} completionCallback should contain a function that will take one parameter: an object array where the keys will be the unique object name and the value will be a Mesh object
                     *
                     * @param {Object} meshes In case other meshes are loaded separately or if a previously declared variable is desired to be used, pass in a (possibly empty) json object of the pattern: { '<mesh_name>': OBJ.Mesh }
                     *
                     */
                    function downloadMeshes(
                        nameAndURLs,
                        completionCallback,
                        meshes
                    ) {
                        if (meshes === undefined) {
                            meshes = {};
                        }
                        const completed = [];
                        for (const mesh_name in nameAndURLs) {
                            if (!nameAndURLs.hasOwnProperty(mesh_name)) {
                                continue;
                            }
                            const url = nameAndURLs[mesh_name];
                            completed.push(
                                fetch(url)
                                    .then((response) => response.text())
                                    .then((data) => {
                                        return [
                                            mesh_name,
                                            new _mesh__WEBPACK_IMPORTED_MODULE_0__[
                                                'default'
                                            ](data),
                                        ];
                                    })
                            );
                        }
                        Promise.all(completed).then((ms) => {
                            for (const [name, mesh] of ms) {
                                meshes[name] = mesh;
                            }
                            return completionCallback(meshes);
                        });
                    }
                    function _buildBuffer(gl, type, data, itemSize) {
                        const buffer = gl.createBuffer();
                        const arrayView =
                            type === gl.ARRAY_BUFFER
                                ? Float32Array
                                : Uint16Array;
                        gl.bindBuffer(type, buffer);
                        gl.bufferData(
                            type,
                            new arrayView(data),
                            gl.STATIC_DRAW
                        );
                        buffer.itemSize = itemSize;
                        buffer.numItems = data.length / itemSize;
                        return buffer;
                    }
                    /**
                     * Takes in the WebGL context and a Mesh, then creates and appends the buffers
                     * to the mesh object as attributes.
                     *
                     * @param {WebGLRenderingContext} gl the `canvas.getContext('webgl')` context instance
                     * @param {Mesh} mesh a single `OBJ.Mesh` instance
                     *
                     * The newly created mesh attributes are:
                     *
                     * Attrbute | Description
                     * :--- | ---
                     * **normalBuffer**       |contains the model&#39;s Vertex Normals
                     * normalBuffer.itemSize  |set to 3 items
                     * normalBuffer.numItems  |the total number of vertex normals
                     * |
                     * **textureBuffer**      |contains the model&#39;s Texture Coordinates
                     * textureBuffer.itemSize |set to 2 items
                     * textureBuffer.numItems |the number of texture coordinates
                     * |
                     * **vertexBuffer**       |contains the model&#39;s Vertex Position Coordinates (does not include w)
                     * vertexBuffer.itemSize  |set to 3 items
                     * vertexBuffer.numItems  |the total number of vertices
                     * |
                     * **indexBuffer**        |contains the indices of the faces
                     * indexBuffer.itemSize   |is set to 1
                     * indexBuffer.numItems   |the total number of indices
                     *
                     * A simple example (a lot of steps are missing, so don't copy and paste):
                     *
                     *     const gl   = canvas.getContext('webgl'),
                     *         mesh = OBJ.Mesh(obj_file_data);
                     *     // compile the shaders and create a shader program
                     *     const shaderProgram = gl.createProgram();
                     *     // compilation stuff here
                     *     ...
                     *     // make sure you have vertex, vertex normal, and texture coordinate
                     *     // attributes located in your shaders and attach them to the shader program
                     *     shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
                     *     gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
                     *
                     *     shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
                     *     gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
                     *
                     *     shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
                     *     gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
                     *
                     *     // create and initialize the vertex, vertex normal, and texture coordinate buffers
                     *     // and save on to the mesh object
                     *     OBJ.initMeshBuffers(gl, mesh);
                     *
                     *     // now to render the mesh
                     *     gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
                     *     gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
                     *     // it's possible that the mesh doesn't contain
                     *     // any texture coordinates (e.g. suzanne.obj in the development branch).
                     *     // in this case, the texture vertexAttribArray will need to be disabled
                     *     // before the call to drawElements
                     *     if(!mesh.textures.length){
                     *       gl.disableVertexAttribArray(shaderProgram.textureCoordAttribute);
                     *     }
                     *     else{
                     *       // if the texture vertexAttribArray has been previously
                     *       // disabled, then it needs to be re-enabled
                     *       gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
                     *       gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
                     *       gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
                     *     }
                     *
                     *     gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
                     *     gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
                     *
                     *     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
                     *     gl.drawElements(gl.TRIANGLES, model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
                     */
                    function initMeshBuffers(gl, mesh) {
                        mesh.normalBuffer = _buildBuffer(
                            gl,
                            gl.ARRAY_BUFFER,
                            mesh.vertexNormals,
                            3
                        );
                        mesh.textureBuffer = _buildBuffer(
                            gl,
                            gl.ARRAY_BUFFER,
                            mesh.textures,
                            mesh.textureStride
                        );
                        mesh.vertexBuffer = _buildBuffer(
                            gl,
                            gl.ARRAY_BUFFER,
                            mesh.vertices,
                            3
                        );
                        mesh.indexBuffer = _buildBuffer(
                            gl,
                            gl.ELEMENT_ARRAY_BUFFER,
                            mesh.indices,
                            1
                        );
                        return mesh;
                    }
                    function deleteMeshBuffers(gl, mesh) {
                        gl.deleteBuffer(mesh.normalBuffer);
                        gl.deleteBuffer(mesh.textureBuffer);
                        gl.deleteBuffer(mesh.vertexBuffer);
                        gl.deleteBuffer(mesh.indexBuffer);
                    }

                    /***/
                },

            /***/ 0:
                /*!****************************!*\
  !*** multi ./src/index.ts ***!
  \****************************/
                /*! no static exports found */
                /***/ function (module, exports, __webpack_require__) {
                    module.exports = __webpack_require__(
                        /*! /home/aaron/google_drive/projects/webgl-obj-loader/src/index.ts */ './src/index.ts'
                    );

                    /***/
                },

            /******/
        }
    );
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovLy93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2xheW91dC50cyIsIndlYnBhY2s6Ly8vLi9zcmMvbWF0ZXJpYWwudHMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21lc2gudHMiLCJ3ZWJwYWNrOi8vLy4vc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRCxPO1FDVkE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7OztRQUdBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwwQ0FBMEMsZ0NBQWdDO1FBQzFFO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0Esd0RBQXdELGtCQUFrQjtRQUMxRTtRQUNBLGlEQUFpRCxjQUFjO1FBQy9EOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQSx5Q0FBeUMsaUNBQWlDO1FBQzFFLGdIQUFnSCxtQkFBbUIsRUFBRTtRQUNySTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDJCQUEyQiwwQkFBMEIsRUFBRTtRQUN2RCxpQ0FBaUMsZUFBZTtRQUNoRDtRQUNBO1FBQ0E7O1FBRUE7UUFDQSxzREFBc0QsK0RBQStEOztRQUVySDtRQUNBOzs7UUFHQTtRQUNBOzs7Ozs7Ozs7Ozs7O0FDbEZBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFB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O1lBQ2xDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWxDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRTlCLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWxDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRTlCLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7WUFDaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNoQyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBRWhDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7WUFDaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNoQyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBRWhDLE1BQU0sYUFBYSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDcEMsTUFBTSxhQUFhLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUVwQyxNQUFNLGFBQWEsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLE1BQU0sYUFBYSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUM7WUFFcEMsTUFBTSxJQUFJLEdBQUcsYUFBYSxHQUFHLGFBQWEsR0FBRyxhQUFhLEdBQUcsYUFBYSxDQUFDO1lBQzNFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFckQsVUFBVTtZQUNWLE1BQU0sU0FBUyxHQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsR0FBRyxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sU0FBUyxHQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsR0FBRyxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sU0FBUyxHQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsR0FBRyxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRWxGLFlBQVk7WUFDWixNQUFNLFdBQVcsR0FBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLEdBQUcsV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwRixNQUFNLFdBQVcsR0FBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLEdBQUcsV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwRixNQUFNLFdBQVcsR0FBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLEdBQUcsV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVwRiw2QkFBNkI7WUFDN0IsOENBQThDO1lBQzlDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWpDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWpDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWpDLFVBQVU7WUFDVixNQUFNLFFBQVEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFNBQVMsR0FBRyxJQUFJLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQztZQUN4RSxNQUFNLFFBQVEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFNBQVMsR0FBRyxJQUFJLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQztZQUN4RSxNQUFNLFFBQVEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFNBQVMsR0FBRyxJQUFJLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQztZQUV4RSxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUVsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUVsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUNsRCxNQUFNLGFBQWEsR0FBRyxTQUFTLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQztZQUVsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUN6QixhQUFhLEdBQUcsYUFBYSxHQUFHLGFBQWEsR0FBRyxhQUFhLEdBQUcsYUFBYSxHQUFHLGFBQWEsQ0FDaEcsQ0FBQztZQUNGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQ3pCLGFBQWEsR0FBRyxhQUFhLEdBQUcsYUFBYSxHQUFHLGFBQWEsR0FBRyxhQUFhLEdBQUcsYUFBYSxDQUNoRyxDQUFDO1lBQ0YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDekIsYUFBYSxHQUFHLGFBQWEsR0FBRyxhQUFhLEdBQUcsYUFBYSxHQUFHLGFBQWEsR0FBRyxhQUFhLENBQ2hHLENBQUM7WUFFRixZQUFZO1lBQ1osTUFBTSxTQUFTLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxXQUFXLEdBQUcsSUFBSSxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDL0UsTUFBTSxTQUFTLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxXQUFXLEdBQUcsSUFBSSxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDL0UsTUFBTSxTQUFTLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxXQUFXLEdBQUcsSUFBSSxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFFL0UsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFDdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFDdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFFdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFDdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFDdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFFdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFDdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFDdkQsTUFBTSxlQUFlLEdBQUcsV0FBVyxHQUFHLElBQUksR0FBRyxTQUFTLENBQUM7WUFFdkQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDM0IsZUFBZSxHQUFHLGVBQWU7Z0JBQzdCLGVBQWUsR0FBRyxlQUFlO2dCQUNqQyxlQUFlLEdBQUcsZUFBZSxDQUN4QyxDQUFDO1lBQ0YsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDM0IsZUFBZSxHQUFHLGVBQWU7Z0JBQzdCLGVBQWUsR0FBRyxlQUFlO2dCQUNqQyxlQUFlLEdBQUcsZUFBZSxDQUN4QyxDQUFDO1lBQ0YsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDM0IsZUFBZSxHQUFHLGVBQWU7Z0JBQzdCLGVBQWUsR0FBRyxlQUFlO2dCQUNqQyxlQUFlLEdBQUcsZUFBZSxDQUN4QyxDQUFDO1lBRUYsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFDN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFDN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFFN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFDN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFDN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFFN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFDN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFDN0QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFFN0QsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGVBQWUsR0FBRyxhQUFhLENBQUM7WUFDbkUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGVBQWUsR0FBRyxhQUFhLENBQUM7WUFDbkUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLGVBQWUsR0FBRyxhQUFhLENBQUM7WUFFbkUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxH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SSxTQUFTLGVBQWUsQ0FBQyxFQUF5QixFQUFFLElBQVU7SUFDaEUsSUFBd0IsQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakcsSUFBd0IsQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzlHLElBQXdCLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVGLElBQXdCLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFbkcsT0FBTyxJQUF1QixDQUFDO0FBQ25DLENBQUM7QUFFTSxTQUFTLGlCQUFpQixDQUFDLEVBQXlCLEVBQUUsSUFBcUI7SUFDOUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDcEMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDdEMsQ0FBQyIsImZpbGUiOiJ3ZWJnbC1vYmotbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIHtcblx0XHR2YXIgYSA9IGZhY3RvcnkoKTtcblx0XHRmb3IodmFyIGkgaW4gYSkgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyA/IGV4cG9ydHMgOiByb290KVtpXSA9IGFbaV07XG5cdH1cbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzLCBmdW5jdGlvbigpIHtcbnJldHVybiAiLCIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIi9cIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDApO1xuIiwiaW1wb3J0IE1lc2gsIHtcbiAgICBNZXNoT3B0aW9ucyxcbiAgICBNYXRlcmlhbE5hbWVUb0luZGV4LFxuICAgIEluZGV4VG9NYXRlcmlhbCxcbiAgICBBcnJheUJ1ZmZlcldpdGhJdGVtU2l6ZSxcbiAgICBVaW50MTZBcnJheVdpdGhJdGVtU2l6ZSxcbn0gZnJvbSBcIi4vbWVzaFwiO1xuaW1wb3J0IHsgTWF0ZXJpYWwsIE1hdGVyaWFsTGlicmFyeSwgVmVjMywgVVZXLCBUZXh0dXJlTWFwRGF0YSB9IGZyb20gXCIuL21hdGVyaWFsXCI7XG5pbXBvcnQgeyBMYXlvdXQsIFRZUEVTLCBBdHRyaWJ1dGVJbmZvLCBEdXBsaWNhdGVBdHRyaWJ1dGVFeGNlcHRpb24sIEF0dHJpYnV0ZSB9IGZyb20gXCIuL2xheW91dFwiO1xuaW1wb3J0IHtcbiAgICBkb3dubG9hZE1vZGVscyxcbiAgICBkb3dubG9hZE1lc2hlcyxcbiAgICBpbml0TWVzaEJ1ZmZlcnMsXG4gICAgZGVsZXRlTWVzaEJ1ZmZlcnMsXG4gICAgRG93bmxvYWRNb2RlbHNPcHRpb25zLFxuICAgIE1lc2hNYXAsXG4gICAgTmFtZUFuZFVybHMsXG4gICAgRXh0ZW5kZWRHTEJ1ZmZlcixcbiAgICBNZXNoV2l0aEJ1ZmZlcnMsXG59IGZyb20gXCIuL3V0aWxzXCI7XG5cbmNvbnN0IHZlcnNpb24gPSBcIjIuMC4zXCI7XG5cbmV4cG9ydCBjb25zdCBPQkogPSB7XG4gICAgQXR0cmlidXRlLFxuICAgIER1cGxpY2F0ZUF0dHJpYnV0ZUV4Y2VwdGlvbixcbiAgICBMYXlvdXQsXG4gICAgTWF0ZXJpYWwsXG4gICAgTWF0ZXJpYWxMaWJyYXJ5LFxuICAgIE1lc2gsXG4gICAgVFlQRVMsXG4gICAgZG93bmxvYWRNb2RlbHMsXG4gICAgZG93bmxvYWRNZXNoZXMsXG4gICAgaW5pdE1lc2hCdWZmZXJzLFxuICAgIGRlbGV0ZU1lc2hCdWZmZXJzLFxuICAgIHZlcnNpb24sXG59O1xuXG4vKipcbiAqIEBuYW1lc3BhY2VcbiAqL1xuZXhwb3J0IHtcbiAgICBBcnJheUJ1ZmZlcldpdGhJdGVtU2l6ZSxcbiAgICBBdHRyaWJ1dGUsXG4gICAgQXR0cmlidXRlSW5mbyxcbiAgICBEb3dubG9hZE1vZGVsc09wdGlvbnMsXG4gICAgRHVwbGljYXRlQXR0cmlidXRlRXhjZXB0aW9uLFxuICAgIEV4dGVuZGVkR0xCdWZmZXIsXG4gICAgSW5kZXhUb01hdGVyaWFsLFxuICAgIExheW91dCxcbiAgICBNYXRlcmlhbCxcbiAgICBNYXRlcmlhbExpYnJhcnksXG4gICAgTWF0ZXJpYWxOYW1lVG9JbmRleCxcbiAgICBNZXNoLFxuICAgIE1lc2hNYXAsXG4gICAgTWVzaE9wdGlvbnMsXG4gICAgTWVzaFdpdGhCdWZmZXJzLFxuICAgIE5hbWVBbmRVcmxzLFxuICAgIFRleHR1cmVNYXBEYXRhLFxuICAgIFRZUEVTLFxuICAgIFVpbnQxNkFycmF5V2l0aEl0ZW1TaXplLFxuICAgIFVWVyxcbiAgICBWZWMzLFxuICAgIGRvd25sb2FkTW9kZWxzLFxuICAgIGRvd25sb2FkTWVzaGVzLFxuICAgIGluaXRNZXNoQnVmZmVycyxcbiAgICBkZWxldGVNZXNoQnVmZmVycyxcbiAgICB2ZXJzaW9uLFxufTtcbiIsImV4cG9ydCBlbnVtIFRZUEVTIHtcbiAgICBcIkJZVEVcIiA9IFwiQllURVwiLFxuICAgIFwiVU5TSUdORURfQllURVwiID0gXCJVTlNJR05FRF9CWVRFXCIsXG4gICAgXCJTSE9SVFwiID0gXCJTSE9SVFwiLFxuICAgIFwiVU5TSUdORURfU0hPUlRcIiA9IFwiVU5TSUdORURfU0hPUlRcIixcbiAgICBcIkZMT0FUXCIgPSBcIkZMT0FUXCIsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlSW5mbyB7XG4gICAgYXR0cmlidXRlOiBBdHRyaWJ1dGU7XG4gICAgc2l6ZTogQXR0cmlidXRlW1wic2l6ZVwiXTtcbiAgICB0eXBlOiBBdHRyaWJ1dGVbXCJ0eXBlXCJdO1xuICAgIG5vcm1hbGl6ZWQ6IEF0dHJpYnV0ZVtcIm5vcm1hbGl6ZWRcIl07XG4gICAgb2Zmc2V0OiBudW1iZXI7XG4gICAgc3RyaWRlOiBudW1iZXI7XG59XG5cbi8qKlxuICogQW4gZXhjZXB0aW9uIGZvciB3aGVuIHR3byBvciBtb3JlIG9mIHRoZSBzYW1lIGF0dHJpYnV0ZXMgYXJlIGZvdW5kIGluIHRoZVxuICogc2FtZSBsYXlvdXQuXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgY2xhc3MgRHVwbGljYXRlQXR0cmlidXRlRXhjZXB0aW9uIGV4dGVuZHMgRXJyb3Ige1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIER1cGxpY2F0ZUF0dHJpYnV0ZUV4Y2VwdGlvblxuICAgICAqIEBwYXJhbSB7QXR0cmlidXRlfSBhdHRyaWJ1dGUgLSBUaGUgYXR0cmlidXRlIHRoYXQgd2FzIGZvdW5kIG1vcmUgdGhhblxuICAgICAqICAgICAgICBvbmNlIGluIHRoZSB7QGxpbmsgTGF5b3V0fVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZTogQXR0cmlidXRlKSB7XG4gICAgICAgIHN1cGVyKGBmb3VuZCBkdXBsaWNhdGUgYXR0cmlidXRlOiAke2F0dHJpYnV0ZS5rZXl9YCk7XG4gICAgfVxufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgaG93IGEgdmVydGV4IGF0dHJpYnV0ZSBzaG91bGQgYmUgcGFja2VkIGludG8gYW4gYnVmZmVyLlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZSB7XG4gICAgcHVibGljIHNpemVPZlR5cGU6IG51bWJlcjtcbiAgICBwdWJsaWMgc2l6ZUluQnl0ZXM6IG51bWJlcjtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYW4gYXR0cmlidXRlLiBEbyBub3QgY2FsbCB0aGlzIGRpcmVjdGx5LCB1c2UgdGhlIHByZWRlZmluZWRcbiAgICAgKiBjb25zdGFudHMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIFRoZSBuYW1lIG9mIHRoaXMgYXR0cmlidXRlIGFzIGlmIGl0IHdlcmUgYSBrZXkgaW5cbiAgICAgKiAgICAgICAgYW4gT2JqZWN0LiBVc2UgdGhlIGNhbWVsIGNhc2UgdmVyc2lvbiBvZiB0aGUgdXBwZXIgc25ha2UgY2FzZVxuICAgICAqICAgICAgICBjb25zdCBuYW1lLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIC0gVGhlIG51bWJlciBvZiBjb21wb25lbnRzIHBlciB2ZXJ0ZXggYXR0cmlidXRlLlxuICAgICAqICAgICAgICBNdXN0IGJlIDEsIDIsIDMsIG9yIDQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUaGUgZGF0YSB0eXBlIG9mIGVhY2ggY29tcG9uZW50IGZvciB0aGlzXG4gICAgICogICAgICAgIGF0dHJpYnV0ZS4gUG9zc2libGUgdmFsdWVzOjxici8+XG4gICAgICogICAgICAgIFwiQllURVwiOiBzaWduZWQgOC1iaXQgaW50ZWdlciwgd2l0aCB2YWx1ZXMgaW4gWy0xMjgsIDEyN108YnIvPlxuICAgICAqICAgICAgICBcIlNIT1JUXCI6IHNpZ25lZCAxNi1iaXQgaW50ZWdlciwgd2l0aCB2YWx1ZXMgaW5cbiAgICAgKiAgICAgICAgICAgIFstMzI3NjgsIDMyNzY3XTxici8+XG4gICAgICogICAgICAgIFwiVU5TSUdORURfQllURVwiOiB1bnNpZ25lZCA4LWJpdCBpbnRlZ2VyLCB3aXRoIHZhbHVlcyBpblxuICAgICAqICAgICAgICAgICAgWzAsIDI1NV08YnIvPlxuICAgICAqICAgICAgICBcIlVOU0lHTkVEX1NIT1JUXCI6IHVuc2lnbmVkIDE2LWJpdCBpbnRlZ2VyLCB3aXRoIHZhbHVlcyBpblxuICAgICAqICAgICAgICAgICAgWzAsIDY1NTM1XTxici8+XG4gICAgICogICAgICAgIFwiRkxPQVRcIjogMzItYml0IGZsb2F0aW5nIHBvaW50IG51bWJlclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gbm9ybWFsaXplZCAtIFdoZXRoZXIgaW50ZWdlciBkYXRhIHZhbHVlcyBzaG91bGQgYmVcbiAgICAgKiAgICAgICAgbm9ybWFsaXplZCB3aGVuIGJlaW5nIGNhc3RlZCB0byBhIGZsb2F0Ljxici8+XG4gICAgICogICAgICAgIElmIHRydWUsIHNpZ25lZCBpbnRlZ2VycyBhcmUgbm9ybWFsaXplZCB0byBbLTEsIDFdLjxici8+XG4gICAgICogICAgICAgIElmIHRydWUsIHVuc2lnbmVkIGludGVnZXJzIGFyZSBub3JtYWxpemVkIHRvIFswLCAxXS48YnIvPlxuICAgICAqICAgICAgICBGb3IgdHlwZSBcIkZMT0FUXCIsIHRoaXMgcGFyYW1ldGVyIGhhcyBubyBlZmZlY3QuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IocHVibGljIGtleTogc3RyaW5nLCBwdWJsaWMgc2l6ZTogbnVtYmVyLCBwdWJsaWMgdHlwZTogVFlQRVMsIHB1YmxpYyBub3JtYWxpemVkOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwiQllURVwiOlxuICAgICAgICAgICAgY2FzZSBcIlVOU0lHTkVEX0JZVEVcIjpcbiAgICAgICAgICAgICAgICB0aGlzLnNpemVPZlR5cGUgPSAxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlNIT1JUXCI6XG4gICAgICAgICAgICBjYXNlIFwiVU5TSUdORURfU0hPUlRcIjpcbiAgICAgICAgICAgICAgICB0aGlzLnNpemVPZlR5cGUgPSAyO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIkZMT0FUXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zaXplT2ZUeXBlID0gNDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGdsIHR5cGU6ICR7dHlwZX1gKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNpemVJbkJ5dGVzID0gdGhpcy5zaXplT2ZUeXBlICogc2l6ZTtcbiAgICB9XG59XG5cbi8qKlxuICogQSBjbGFzcyB0byByZXByZXNlbnQgdGhlIG1lbW9yeSBsYXlvdXQgZm9yIGEgdmVydGV4IGF0dHJpYnV0ZSBhcnJheS4gVXNlZCBieVxuICoge0BsaW5rIE1lc2h9J3MgVEJEKC4uLikgbWV0aG9kIHRvIGdlbmVyYXRlIGEgcGFja2VkIGFycmF5IGZyb20gbWVzaCBkYXRhLlxuICogPHA+XG4gKiBMYXlvdXQgY2FuIHNvcnQgb2YgYmUgdGhvdWdodCBvZiBhcyBhIEMtc3R5bGUgc3RydWN0IGRlY2xhcmF0aW9uLlxuICoge0BsaW5rIE1lc2h9J3MgVEJEKC4uLikgbWV0aG9kIHdpbGwgdXNlIHRoZSB7QGxpbmsgTGF5b3V0fSBpbnN0YW5jZSB0b1xuICogcGFjayBhbiBhcnJheSBpbiB0aGUgZ2l2ZW4gYXR0cmlidXRlIG9yZGVyLlxuICogPHA+XG4gKiBMYXlvdXQgYWxzbyBpcyB2ZXJ5IGhlbHBmdWwgd2hlbiBjYWxsaW5nIGEgV2ViR0wgY29udGV4dCdzXG4gKiA8Y29kZT52ZXJ0ZXhBdHRyaWJQb2ludGVyPC9jb2RlPiBtZXRob2QuIElmIHlvdSd2ZSBjcmVhdGVkIGEgYnVmZmVyIHVzaW5nXG4gKiBhIExheW91dCBpbnN0YW5jZSwgdGhlbiB0aGUgc2FtZSBMYXlvdXQgaW5zdGFuY2UgY2FuIGJlIHVzZWQgdG8gZGV0ZXJtaW5lXG4gKiB0aGUgc2l6ZSwgdHlwZSwgbm9ybWFsaXplZCwgc3RyaWRlLCBhbmQgb2Zmc2V0IHBhcmFtZXRlcnMgZm9yXG4gKiA8Y29kZT52ZXJ0ZXhBdHRyaWJQb2ludGVyPC9jb2RlPi5cbiAqIDxwPlxuICogRm9yIGV4YW1wbGU6XG4gKiA8cHJlPjxjb2RlPlxuICpcbiAqIGNvbnN0IGluZGV4ID0gZ2xjdHguZ2V0QXR0cmliTG9jYXRpb24oc2hhZGVyUHJvZ3JhbSwgXCJwb3NcIik7XG4gKiBnbGN0eC52ZXJ0ZXhBdHRyaWJQb2ludGVyKFxuICogICBsYXlvdXQucG9zaXRpb24uc2l6ZSxcbiAqICAgZ2xjdHhbbGF5b3V0LnBvc2l0aW9uLnR5cGVdLFxuICogICBsYXlvdXQucG9zaXRpb24ubm9ybWFsaXplZCxcbiAqICAgbGF5b3V0LnBvc2l0aW9uLnN0cmlkZSxcbiAqICAgbGF5b3V0LnBvc2l0aW9uLm9mZnNldCk7XG4gKiA8L2NvZGU+PC9wcmU+XG4gKiBAc2VlIHtAbGluayBNZXNofVxuICovXG5leHBvcnQgY2xhc3MgTGF5b3V0IHtcbiAgICAvLyBHZW9tZXRyeSBhdHRyaWJ1dGVzXG4gICAgLyoqXG4gICAgICogQXR0cmlidXRlIGxheW91dCB0byBwYWNrIGEgdmVydGV4J3MgeCwgeSwgJiB6IGFzIGZsb2F0c1xuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgTGF5b3V0fVxuICAgICAqL1xuICAgIHN0YXRpYyBQT1NJVElPTiA9IG5ldyBBdHRyaWJ1dGUoXCJwb3NpdGlvblwiLCAzLCBUWVBFUy5GTE9BVCk7XG5cbiAgICAvKipcbiAgICAgKiBBdHRyaWJ1dGUgbGF5b3V0IHRvIHBhY2sgYSB2ZXJ0ZXgncyBub3JtYWwncyB4LCB5LCAmIHogYXMgZmxvYXRzXG4gICAgICpcbiAgICAgKiBAc2VlIHtAbGluayBMYXlvdXR9XG4gICAgICovXG4gICAgc3RhdGljIE5PUk1BTCA9IG5ldyBBdHRyaWJ1dGUoXCJub3JtYWxcIiwgMywgVFlQRVMuRkxPQVQpO1xuXG4gICAgLyoqXG4gICAgICogQXR0cmlidXRlIGxheW91dCB0byBwYWNrIGEgdmVydGV4J3Mgbm9ybWFsJ3MgeCwgeSwgJiB6IGFzIGZsb2F0cy5cbiAgICAgKiA8cD5cbiAgICAgKiBUaGlzIHZhbHVlIHdpbGwgYmUgY29tcHV0ZWQgb24tdGhlLWZseSBiYXNlZCBvbiB0aGUgdGV4dHVyZSBjb29yZGluYXRlcy5cbiAgICAgKiBJZiBubyB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFyZSBhdmFpbGFibGUsIHRoZSBnZW5lcmF0ZWQgdmFsdWUgd2lsbCBkZWZhdWx0IHRvXG4gICAgICogMCwgMCwgMC5cbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIExheW91dH1cbiAgICAgKi9cbiAgICBzdGF0aWMgVEFOR0VOVCA9IG5ldyBBdHRyaWJ1dGUoXCJ0YW5nZW50XCIsIDMsIFRZUEVTLkZMT0FUKTtcblxuICAgIC8qKlxuICAgICAqIEF0dHJpYnV0ZSBsYXlvdXQgdG8gcGFjayBhIHZlcnRleCdzIG5vcm1hbCdzIGJpdGFuZ2VudCB4LCB5LCAmIHogYXMgZmxvYXRzLlxuICAgICAqIDxwPlxuICAgICAqIFRoaXMgdmFsdWUgd2lsbCBiZSBjb21wdXRlZCBvbi10aGUtZmx5IGJhc2VkIG9uIHRoZSB0ZXh0dXJlIGNvb3JkaW5hdGVzLlxuICAgICAqIElmIG5vIHRleHR1cmUgY29vcmRpbmF0ZXMgYXJlIGF2YWlsYWJsZSwgdGhlIGdlbmVyYXRlZCB2YWx1ZSB3aWxsIGRlZmF1bHQgdG9cbiAgICAgKiAwLCAwLCAwLlxuICAgICAqIEBzZWUge0BsaW5rIExheW91dH1cbiAgICAgKi9cbiAgICBzdGF0aWMgQklUQU5HRU5UID0gbmV3IEF0dHJpYnV0ZShcImJpdGFuZ2VudFwiLCAzLCBUWVBFUy5GTE9BVCk7XG5cbiAgICAvKipcbiAgICAgKiBBdHRyaWJ1dGUgbGF5b3V0IHRvIHBhY2sgYSB2ZXJ0ZXgncyB0ZXh0dXJlIGNvb3JkaW5hdGVzJyB1ICYgdiBhcyBmbG9hdHNcbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIExheW91dH1cbiAgICAgKi9cbiAgICBzdGF0aWMgVVYgPSBuZXcgQXR0cmlidXRlKFwidXZcIiwgMiwgVFlQRVMuRkxPQVQpO1xuXG4gICAgLy8gTWF0ZXJpYWwgYXR0cmlidXRlc1xuXG4gICAgLyoqXG4gICAgICogQXR0cmlidXRlIGxheW91dCB0byBwYWNrIGFuIHVuc2lnbmVkIHNob3J0IHRvIGJlIGludGVycHJldGVkIGFzIGEgdGhlIGluZGV4XG4gICAgICogaW50byBhIHtAbGluayBNZXNofSdzIG1hdGVyaWFscyBsaXN0LlxuICAgICAqIDxwPlxuICAgICAqIFRoZSBpbnRlbnRpb24gb2YgdGhpcyB2YWx1ZSBpcyB0byBzZW5kIGFsbCBvZiB0aGUge0BsaW5rIE1lc2h9J3MgbWF0ZXJpYWxzXG4gICAgICogaW50byBtdWx0aXBsZSBzaGFkZXIgdW5pZm9ybXMgYW5kIHRoZW4gcmVmZXJlbmNlIHRoZSBjdXJyZW50IG9uZSBieSB0aGlzXG4gICAgICogdmVydGV4IGF0dHJpYnV0ZS5cbiAgICAgKiA8cD5cbiAgICAgKiBleGFtcGxlIGdsc2wgY29kZTpcbiAgICAgKlxuICAgICAqIDxwcmU+PGNvZGU+XG4gICAgICogIC8vIHRoaXMgaXMgYm91bmQgdXNpbmcgTUFURVJJQUxfSU5ERVhcbiAgICAgKiAgYXR0cmlidXRlIGludCBtYXRlcmlhbEluZGV4O1xuICAgICAqXG4gICAgICogIHN0cnVjdCBNYXRlcmlhbCB7XG4gICAgICogICAgdmVjMyBkaWZmdXNlO1xuICAgICAqICAgIHZlYzMgc3BlY3VsYXI7XG4gICAgICogICAgdmVjMyBzcGVjdWxhckV4cG9uZW50O1xuICAgICAqICB9O1xuICAgICAqXG4gICAgICogIHVuaWZvcm0gTWF0ZXJpYWwgbWF0ZXJpYWxzW01BWF9NQVRFUklBTFNdO1xuICAgICAqXG4gICAgICogIC8vIC4uLlxuICAgICAqXG4gICAgICogIHZlYzMgZGlmZnVzZSA9IG1hdGVyaWFsc1ttYXRlcmlhbEluZGV4XTtcbiAgICAgKlxuICAgICAqIDwvY29kZT48L3ByZT5cbiAgICAgKiBUT0RPOiBNb3JlIGRlc2NyaXB0aW9uICYgdGVzdCB0byBtYWtlIHN1cmUgc3Vic2NyaXB0aW5nIGJ5IGF0dHJpYnV0ZXMgZXZlblxuICAgICAqIHdvcmtzIGZvciB3ZWJnbFxuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgTGF5b3V0fVxuICAgICAqL1xuICAgIHN0YXRpYyBNQVRFUklBTF9JTkRFWCA9IG5ldyBBdHRyaWJ1dGUoXCJtYXRlcmlhbEluZGV4XCIsIDEsIFRZUEVTLlNIT1JUKTtcbiAgICBzdGF0aWMgTUFURVJJQUxfRU5BQkxFRCA9IG5ldyBBdHRyaWJ1dGUoXCJtYXRlcmlhbEVuYWJsZWRcIiwgMSwgVFlQRVMuVU5TSUdORURfU0hPUlQpO1xuICAgIHN0YXRpYyBBTUJJRU5UID0gbmV3IEF0dHJpYnV0ZShcImFtYmllbnRcIiwgMywgVFlQRVMuRkxPQVQpO1xuICAgIHN0YXRpYyBESUZGVVNFID0gbmV3IEF0dHJpYnV0ZShcImRpZmZ1c2VcIiwgMywgVFlQRVMuRkxPQVQpO1xuICAgIHN0YXRpYyBTUEVDVUxBUiA9IG5ldyBBdHRyaWJ1dGUoXCJzcGVjdWxhclwiLCAzLCBUWVBFUy5GTE9BVCk7XG4gICAgc3RhdGljIFNQRUNVTEFSX0VYUE9ORU5UID0gbmV3IEF0dHJpYnV0ZShcInNwZWN1bGFyRXhwb25lbnRcIiwgMywgVFlQRVMuRkxPQVQpO1xuICAgIHN0YXRpYyBFTUlTU0lWRSA9IG5ldyBBdHRyaWJ1dGUoXCJlbWlzc2l2ZVwiLCAzLCBUWVBFUy5GTE9BVCk7XG4gICAgc3RhdGljIFRSQU5TTUlTU0lPTl9GSUxURVIgPSBuZXcgQXR0cmlidXRlKFwidHJhbnNtaXNzaW9uRmlsdGVyXCIsIDMsIFRZUEVTLkZMT0FUKTtcbiAgICBzdGF0aWMgRElTU09MVkUgPSBuZXcgQXR0cmlidXRlKFwiZGlzc29sdmVcIiwgMSwgVFlQRVMuRkxPQVQpO1xuICAgIHN0YXRpYyBJTExVTUlOQVRJT04gPSBuZXcgQXR0cmlidXRlKFwiaWxsdW1pbmF0aW9uXCIsIDEsIFRZUEVTLlVOU0lHTkVEX1NIT1JUKTtcbiAgICBzdGF0aWMgUkVGUkFDVElPTl9JTkRFWCA9IG5ldyBBdHRyaWJ1dGUoXCJyZWZyYWN0aW9uSW5kZXhcIiwgMSwgVFlQRVMuRkxPQVQpO1xuICAgIHN0YXRpYyBTSEFSUE5FU1MgPSBuZXcgQXR0cmlidXRlKFwic2hhcnBuZXNzXCIsIDEsIFRZUEVTLkZMT0FUKTtcbiAgICBzdGF0aWMgTUFQX0RJRkZVU0UgPSBuZXcgQXR0cmlidXRlKFwibWFwRGlmZnVzZVwiLCAxLCBUWVBFUy5TSE9SVCk7XG4gICAgc3RhdGljIE1BUF9BTUJJRU5UID0gbmV3IEF0dHJpYnV0ZShcIm1hcEFtYmllbnRcIiwgMSwgVFlQRVMuU0hPUlQpO1xuICAgIHN0YXRpYyBNQVBfU1BFQ1VMQVIgPSBuZXcgQXR0cmlidXRlKFwibWFwU3BlY3VsYXJcIiwgMSwgVFlQRVMuU0hPUlQpO1xuICAgIHN0YXRpYyBNQVBfU1BFQ1VMQVJfRVhQT05FTlQgPSBuZXcgQXR0cmlidXRlKFwibWFwU3BlY3VsYXJFeHBvbmVudFwiLCAxLCBUWVBFUy5TSE9SVCk7XG4gICAgc3RhdGljIE1BUF9ESVNTT0xWRSA9IG5ldyBBdHRyaWJ1dGUoXCJtYXBEaXNzb2x2ZVwiLCAxLCBUWVBFUy5TSE9SVCk7XG4gICAgc3RhdGljIEFOVElfQUxJQVNJTkcgPSBuZXcgQXR0cmlidXRlKFwiYW50aUFsaWFzaW5nXCIsIDEsIFRZUEVTLlVOU0lHTkVEX1NIT1JUKTtcbiAgICBzdGF0aWMgTUFQX0JVTVAgPSBuZXcgQXR0cmlidXRlKFwibWFwQnVtcFwiLCAxLCBUWVBFUy5TSE9SVCk7XG4gICAgc3RhdGljIE1BUF9ESVNQTEFDRU1FTlQgPSBuZXcgQXR0cmlidXRlKFwibWFwRGlzcGxhY2VtZW50XCIsIDEsIFRZUEVTLlNIT1JUKTtcbiAgICBzdGF0aWMgTUFQX0RFQ0FMID0gbmV3IEF0dHJpYnV0ZShcIm1hcERlY2FsXCIsIDEsIFRZUEVTLlNIT1JUKTtcbiAgICBzdGF0aWMgTUFQX0VNSVNTSVZFID0gbmV3IEF0dHJpYnV0ZShcIm1hcEVtaXNzaXZlXCIsIDEsIFRZUEVTLlNIT1JUKTtcblxuICAgIHB1YmxpYyBzdHJpZGU6IG51bWJlcjtcbiAgICBwdWJsaWMgYXR0cmlidXRlczogQXR0cmlidXRlW107XG4gICAgcHVibGljIGF0dHJpYnV0ZU1hcDogeyBbaWR4OiBzdHJpbmddOiBBdHRyaWJ1dGVJbmZvIH07XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgTGF5b3V0IG9iamVjdC4gVGhpcyBjb25zdHJ1Y3RvciB3aWxsIHRocm93IGlmIGFueSBkdXBsaWNhdGVcbiAgICAgKiBhdHRyaWJ1dGVzIGFyZSBnaXZlbi5cbiAgICAgKiBAcGFyYW0ge0FycmF5fSAuLi5hdHRyaWJ1dGVzIC0gQW4gb3JkZXJlZCBsaXN0IG9mIGF0dHJpYnV0ZXMgdGhhdFxuICAgICAqICAgICAgICBkZXNjcmliZSB0aGUgZGVzaXJlZCBtZW1vcnkgbGF5b3V0IGZvciBlYWNoIHZlcnRleCBhdHRyaWJ1dGUuXG4gICAgICogICAgICAgIDxwPlxuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgTWVzaH1cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvciguLi5hdHRyaWJ1dGVzOiBBdHRyaWJ1dGVbXSkge1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZU1hcCA9IHt9O1xuICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICAgICAgbGV0IG1heFN0cmlkZU11bHRpcGxlID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBhdHRyaWJ1dGUgb2YgYXR0cmlidXRlcykge1xuICAgICAgICAgICAgaWYgKHRoaXMuYXR0cmlidXRlTWFwW2F0dHJpYnV0ZS5rZXldKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IER1cGxpY2F0ZUF0dHJpYnV0ZUV4Y2VwdGlvbihhdHRyaWJ1dGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWRkIHBhZGRpbmcgdG8gc2F0aXNmeSBXZWJHTCdzIHJlcXVpcmVtZW50IHRoYXQgYWxsXG4gICAgICAgICAgICAvLyB2ZXJ0ZXhBdHRyaWJQb2ludGVyIGNhbGxzIGhhdmUgYW4gb2Zmc2V0IHRoYXQgaXMgYSBtdWx0aXBsZSBvZlxuICAgICAgICAgICAgLy8gdGhlIHR5cGUgc2l6ZS5cbiAgICAgICAgICAgIGlmIChvZmZzZXQgJSBhdHRyaWJ1dGUuc2l6ZU9mVHlwZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIG9mZnNldCArPSBhdHRyaWJ1dGUuc2l6ZU9mVHlwZSAtIChvZmZzZXQgJSBhdHRyaWJ1dGUuc2l6ZU9mVHlwZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTGF5b3V0IHJlcXVpcmVzIHBhZGRpbmcgYmVmb3JlIFwiICsgYXR0cmlidXRlLmtleSArIFwiIGF0dHJpYnV0ZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlTWFwW2F0dHJpYnV0ZS5rZXldID0ge1xuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZTogYXR0cmlidXRlLFxuICAgICAgICAgICAgICAgIHNpemU6IGF0dHJpYnV0ZS5zaXplLFxuICAgICAgICAgICAgICAgIHR5cGU6IGF0dHJpYnV0ZS50eXBlLFxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWQ6IGF0dHJpYnV0ZS5ub3JtYWxpemVkLFxuICAgICAgICAgICAgICAgIG9mZnNldDogb2Zmc2V0LFxuICAgICAgICAgICAgfSBhcyBBdHRyaWJ1dGVJbmZvO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IGF0dHJpYnV0ZS5zaXplSW5CeXRlcztcbiAgICAgICAgICAgIG1heFN0cmlkZU11bHRpcGxlID0gTWF0aC5tYXgobWF4U3RyaWRlTXVsdGlwbGUsIGF0dHJpYnV0ZS5zaXplT2ZUeXBlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgcGFkZGluZyB0byB0aGUgZW5kIHRvIHNhdGlzZnkgV2ViR0wncyByZXF1aXJlbWVudCB0aGF0IGFsbFxuICAgICAgICAvLyB2ZXJ0ZXhBdHRyaWJQb2ludGVyIGNhbGxzIGhhdmUgYSBzdHJpZGUgdGhhdCBpcyBhIG11bHRpcGxlIG9mIHRoZVxuICAgICAgICAvLyB0eXBlIHNpemUuIEJlY2F1c2Ugd2UncmUgcHV0dGluZyBkaWZmZXJlbnRseSBzaXplZCBhdHRyaWJ1dGVzIGludG9cbiAgICAgICAgLy8gdGhlIHNhbWUgYnVmZmVyLCBpdCBtdXN0IGJlIHBhZGRlZCB0byBhIG11bHRpcGxlIG9mIHRoZSBsYXJnZXN0XG4gICAgICAgIC8vIHR5cGUgc2l6ZS5cbiAgICAgICAgaWYgKG9mZnNldCAlIG1heFN0cmlkZU11bHRpcGxlICE9PSAwKSB7XG4gICAgICAgICAgICBvZmZzZXQgKz0gbWF4U3RyaWRlTXVsdGlwbGUgLSAob2Zmc2V0ICUgbWF4U3RyaWRlTXVsdGlwbGUpO1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTGF5b3V0IHJlcXVpcmVzIHBhZGRpbmcgYXQgdGhlIGJhY2tcIik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdHJpZGUgPSBvZmZzZXQ7XG4gICAgICAgIGZvciAoY29uc3QgYXR0cmlidXRlIG9mIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlTWFwW2F0dHJpYnV0ZS5rZXldLnN0cmlkZSA9IHRoaXMuc3RyaWRlO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiZXhwb3J0IHR5cGUgVmVjMyA9IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXTtcblxuZXhwb3J0IGludGVyZmFjZSBVVlcge1xuICAgIHU6IG51bWJlcjtcbiAgICB2OiBudW1iZXI7XG4gICAgdzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRleHR1cmVNYXBEYXRhIHtcbiAgICBjb2xvckNvcnJlY3Rpb246IGJvb2xlYW47XG4gICAgaG9yaXpvbnRhbEJsZW5kaW5nOiBib29sZWFuO1xuICAgIHZlcnRpY2FsQmxlbmRpbmc6IGJvb2xlYW47XG4gICAgYm9vc3RNaXBNYXBTaGFycG5lc3M6IG51bWJlcjtcbiAgICBtb2RpZnlUZXh0dXJlTWFwOiB7XG4gICAgICAgIGJyaWdodG5lc3M6IG51bWJlcjtcbiAgICAgICAgY29udHJhc3Q6IG51bWJlcjtcbiAgICB9O1xuICAgIG9mZnNldDogVVZXO1xuICAgIHNjYWxlOiBVVlc7XG4gICAgdHVyYnVsZW5jZTogVVZXO1xuICAgIGNsYW1wOiBib29sZWFuO1xuICAgIHRleHR1cmVSZXNvbHV0aW9uOiBudW1iZXIgfCBudWxsO1xuICAgIGJ1bXBNdWx0aXBsaWVyOiBudW1iZXI7XG4gICAgaW1mQ2hhbjogc3RyaW5nIHwgbnVsbDtcbiAgICBmaWxlbmFtZTogc3RyaW5nO1xuICAgIHJlZmxlY3Rpb25UeXBlPzogc3RyaW5nO1xuICAgIHRleHR1cmU/OiBIVE1MSW1hZ2VFbGVtZW50O1xufVxuXG4vKipcbiAqIFRoZSBNYXRlcmlhbCBjbGFzcy5cbiAqL1xuZXhwb3J0IGNsYXNzIE1hdGVyaWFsIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIHRoZSB1bmlxdWUgbmFtZSBvZiB0aGUgbWF0ZXJpYWxcbiAgICAgKi9cbiAgICAvLyBUaGUgdmFsdWVzIGZvciB0aGUgZm9sbG93aW5nIGF0dGlidXRlc1xuICAgIC8vIGFyZSBhbiBhcnJheSBvZiBSLCBHLCBCIG5vcm1hbGl6ZWQgdmFsdWVzLlxuICAgIC8vIEthIC0gQW1iaWVudCBSZWZsZWN0aXZpdHlcbiAgICBhbWJpZW50OiBWZWMzID0gWzAsIDAsIDBdO1xuICAgIC8vIEtkIC0gRGVmdXNlIFJlZmxlY3Rpdml0eVxuICAgIGRpZmZ1c2U6IFZlYzMgPSBbMCwgMCwgMF07XG4gICAgLy8gS3NcbiAgICBzcGVjdWxhcjogVmVjMyA9IFswLCAwLCAwXTtcbiAgICAvLyBLZVxuICAgIGVtaXNzaXZlOiBWZWMzID0gWzAsIDAsIDBdO1xuICAgIC8vIFRmXG4gICAgdHJhbnNtaXNzaW9uRmlsdGVyOiBWZWMzID0gWzAsIDAsIDBdO1xuICAgIC8vIGRcbiAgICBkaXNzb2x2ZTogbnVtYmVyID0gMDtcbiAgICAvLyB2YWxpZCByYW5nZSBpcyBiZXR3ZWVuIDAgYW5kIDEwMDBcbiAgICBzcGVjdWxhckV4cG9uZW50OiBudW1iZXIgPSAwO1xuICAgIC8vIGVpdGhlciBkIG9yIFRyOyB2YWxpZCB2YWx1ZXMgYXJlIG5vcm1hbGl6ZWRcbiAgICB0cmFuc3BhcmVuY3k6IG51bWJlciA9IDA7XG4gICAgLy8gaWxsdW0gLSB0aGUgZW51bSBvZiB0aGUgaWxsdW1pbmF0aW9uIG1vZGVsIHRvIHVzZVxuICAgIGlsbHVtaW5hdGlvbjogbnVtYmVyID0gMDtcbiAgICAvLyBOaSAtIFNldCB0byBcIm5vcm1hbFwiIChhaXIpLlxuICAgIHJlZnJhY3Rpb25JbmRleDogbnVtYmVyID0gMTtcbiAgICAvLyBzaGFycG5lc3NcbiAgICBzaGFycG5lc3M6IG51bWJlciA9IDA7XG4gICAgLy8gbWFwX0tkXG4gICAgbWFwRGlmZnVzZTogVGV4dHVyZU1hcERhdGEgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XG4gICAgLy8gbWFwX0thXG4gICAgbWFwQW1iaWVudDogVGV4dHVyZU1hcERhdGEgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XG4gICAgLy8gbWFwX0tzXG4gICAgbWFwU3BlY3VsYXI6IFRleHR1cmVNYXBEYXRhID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xuICAgIC8vIG1hcF9Oc1xuICAgIG1hcFNwZWN1bGFyRXhwb25lbnQ6IFRleHR1cmVNYXBEYXRhID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xuICAgIC8vIG1hcF9kXG4gICAgbWFwRGlzc29sdmU6IFRleHR1cmVNYXBEYXRhID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xuICAgIC8vIG1hcF9hYXRcbiAgICBhbnRpQWxpYXNpbmc6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAvLyBtYXBfYnVtcCBvciBidW1wXG4gICAgbWFwQnVtcDogVGV4dHVyZU1hcERhdGEgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XG4gICAgLy8gZGlzcFxuICAgIG1hcERpc3BsYWNlbWVudDogVGV4dHVyZU1hcERhdGEgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XG4gICAgLy8gZGVjYWxcbiAgICBtYXBEZWNhbDogVGV4dHVyZU1hcERhdGEgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XG4gICAgLy8gbWFwX0tlXG4gICAgbWFwRW1pc3NpdmU6IFRleHR1cmVNYXBEYXRhID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xuICAgIC8vIHJlZmwgLSB3aGVuIHRoZSByZWZsZWN0aW9uIHR5cGUgaXMgYSBjdWJlLCB0aGVyZSB3aWxsIGJlIG11bHRpcGxlIHJlZmxcbiAgICAvLyAgICAgICAgc3RhdGVtZW50cyBmb3IgZWFjaCBzaWRlIG9mIHRoZSBjdWJlLiBJZiBpdCdzIGEgc3BoZXJpY2FsXG4gICAgLy8gICAgICAgIHJlZmxlY3Rpb24sIHRoZXJlIHNob3VsZCBvbmx5IGV2ZXIgYmUgb25lLlxuICAgIG1hcFJlZmxlY3Rpb25zOiBUZXh0dXJlTWFwRGF0YVtdID0gW107XG4gICAgY29uc3RydWN0b3IocHVibGljIG5hbWU6IHN0cmluZykge31cbn1cblxuY29uc3QgU0VOVElORUxfTUFURVJJQUwgPSBuZXcgTWF0ZXJpYWwoXCJzZW50aW5lbFwiKTtcblxuLyoqXG4gKiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XYXZlZnJvbnRfLm9ial9maWxlXG4gKiBodHRwOi8vcGF1bGJvdXJrZS5uZXQvZGF0YWZvcm1hdHMvbXRsL1xuICovXG5leHBvcnQgY2xhc3MgTWF0ZXJpYWxMaWJyYXJ5IHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIHRoZSBNYXRlcmlhbCBQYXJzZXJcbiAgICAgKiBAcGFyYW0gbXRsRGF0YSB0aGUgTVRMIGZpbGUgY29udGVudHNcbiAgICAgKi9cbiAgICBwdWJsaWMgY3VycmVudE1hdGVyaWFsOiBNYXRlcmlhbCA9IFNFTlRJTkVMX01BVEVSSUFMO1xuICAgIHB1YmxpYyBtYXRlcmlhbHM6IHsgW2s6IHN0cmluZ106IE1hdGVyaWFsIH0gPSB7fTtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBkYXRhOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5wYXJzZSgpO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xuICAgIC8qIHRoZSBmdW5jdGlvbiBuYW1lcyBoZXJlIGRpc29iZXkgY2FtZWxDYXNlIGNvbnZlbnRpb25zXG4gICAgIHRvIG1ha2UgcGFyc2luZy9yb3V0aW5nIGVhc2llci4gc2VlIHRoZSBwYXJzZSBmdW5jdGlvblxuICAgICBkb2N1bWVudGF0aW9uIGZvciBtb3JlIGluZm9ybWF0aW9uLiAqL1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBNYXRlcmlhbCBvYmplY3QgYW5kIGFkZHMgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxuICAgICAqL1xuICAgIHBhcnNlX25ld210bCh0b2tlbnM6IHN0cmluZ1tdKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0b2tlbnNbMF07XG4gICAgICAgIC8vIGNvbnNvbGUuaW5mbygnUGFyc2luZyBuZXcgTWF0ZXJpYWw6JywgbmFtZSk7XG5cbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwgPSBuZXcgTWF0ZXJpYWwobmFtZSk7XG4gICAgICAgIHRoaXMubWF0ZXJpYWxzW25hbWVdID0gdGhpcy5jdXJyZW50TWF0ZXJpYWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VlIHRoZSBkb2N1bWVuYXRpb24gZm9yIHBhcnNlX0thIGJlbG93IGZvciBhIGJldHRlciB1bmRlcnN0YW5kaW5nLlxuICAgICAqXG4gICAgICogR2l2ZW4gYSBsaXN0IG9mIHBvc3NpYmxlIGNvbG9yIHRva2VucywgcmV0dXJucyBhbiBhcnJheSBvZiBSLCBHLCBhbmQgQlxuICAgICAqIGNvbG9yIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxuICAgICAqIEByZXR1cm4geyp9IGEgMyBlbGVtZW50IGFycmF5IGNvbnRhaW5pbmcgdGhlIFIsIEcsIGFuZCBCIHZhbHVlc1xuICAgICAqIG9mIHRoZSBjb2xvci5cbiAgICAgKi9cbiAgICBwYXJzZUNvbG9yKHRva2Vuczogc3RyaW5nW10pOiBWZWMzIHtcbiAgICAgICAgaWYgKHRva2Vuc1swXSA9PSBcInNwZWN0cmFsXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBcIlRoZSBNVEwgcGFyc2VyIGRvZXMgbm90IHN1cHBvcnQgc3BlY3RyYWwgY3VydmUgZmlsZXMuIFlvdSB3aWxsIFwiICtcbiAgICAgICAgICAgICAgICAgICAgXCJuZWVkIHRvIGNvbnZlcnQgdGhlIE1UTCBjb2xvcnMgdG8gZWl0aGVyIFJHQiBvciBDSUVYWVouXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2Vuc1swXSA9PSBcInh5elwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgXCJUaGUgTVRMIHBhcnNlciBkb2VzIG5vdCBjdXJyZW50bHkgc3VwcG9ydCBYWVogY29sb3JzLiBFaXRoZXIgY29udmVydCB0aGUgXCIgK1xuICAgICAgICAgICAgICAgICAgICBcIlhZWiB2YWx1ZXMgdG8gUkdCIG9yIGNyZWF0ZSBhbiBpc3N1ZSB0byBhZGQgc3VwcG9ydCBmb3IgWFlaXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZnJvbSBteSB1bmRlcnN0YW5kaW5nIG9mIHRoZSBzcGVjLCBSR0IgdmFsdWVzIGF0IHRoaXMgcG9pbnRcbiAgICAgICAgLy8gd2lsbCBlaXRoZXIgYmUgMyBmbG9hdHMgb3IgZXhhY3RseSAxIGZsb2F0LCBzbyB0aGF0J3MgdGhlIGNoZWNrXG4gICAgICAgIC8vIHRoYXQgaSdtIGdvaW5nIHRvIHBlcmZvcm0gaGVyZVxuICAgICAgICBpZiAodG9rZW5zLmxlbmd0aCA9PSAzKSB7XG4gICAgICAgICAgICBjb25zdCBbeCwgeSwgel0gPSB0b2tlbnM7XG4gICAgICAgICAgICByZXR1cm4gW3BhcnNlRmxvYXQoeCksIHBhcnNlRmxvYXQoeSksIHBhcnNlRmxvYXQoeildO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2luY2UgdG9rZW5zIGF0IHRoaXMgcG9pbnQgaGFzIGEgbGVuZ3RoIG9mIDMsIHdlJ3JlIGdvaW5nIHRvIGFzc3VtZVxuICAgICAgICAvLyBpdCdzIGV4YWN0bHkgMSwgc2tpcHBpbmcgdGhlIGNoZWNrIGZvciAyLlxuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcnNlRmxvYXQodG9rZW5zWzBdKTtcbiAgICAgICAgLy8gaW4gdGhpcyBjYXNlLCBhbGwgdmFsdWVzIGFyZSBlcXVpdmFsZW50XG4gICAgICAgIHJldHVybiBbdmFsdWUsIHZhbHVlLCB2YWx1ZV07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2UgdGhlIGFtYmllbnQgcmVmbGVjdGl2aXR5XG4gICAgICpcbiAgICAgKiBBIEthIGRpcmVjdGl2ZSBjYW4gdGFrZSBvbmUgb2YgdGhyZWUgZm9ybXM6XG4gICAgICogICAtIEthIHIgZyBiXG4gICAgICogICAtIEthIHNwZWN0cmFsIGZpbGUucmZsXG4gICAgICogICAtIEthIHh5eiB4IHkgelxuICAgICAqIFRoZXNlIHRocmVlIGZvcm1zIGFyZSBtdXR1YWxseSBleGNsdXNpdmUgaW4gdGhhdCBvbmx5IG9uZVxuICAgICAqIGRlY2xhcmF0aW9uIGNhbiBleGlzdCBwZXIgbWF0ZXJpYWwuIEl0IGlzIGNvbnNpZGVyZWQgYSBzeW50YXhcbiAgICAgKiBlcnJvciBvdGhlcndpc2UuXG4gICAgICpcbiAgICAgKiBUaGUgXCJLYVwiIGZvcm0gc3BlY2lmaWVzIHRoZSBhbWJpZW50IHJlZmxlY3Rpdml0eSB1c2luZyBSR0IgdmFsdWVzLlxuICAgICAqIFRoZSBcImdcIiBhbmQgXCJiXCIgdmFsdWVzIGFyZSBvcHRpb25hbC4gSWYgb25seSB0aGUgXCJyXCIgdmFsdWUgaXNcbiAgICAgKiBzcGVjaWZpZWQsIHRoZW4gdGhlIFwiZ1wiIGFuZCBcImJcIiB2YWx1ZXMgYXJlIGFzc2lnbmVkIHRoZSB2YWx1ZSBvZlxuICAgICAqIFwiclwiLiBWYWx1ZXMgYXJlIG5vcm1hbGx5IGluIHRoZSByYW5nZSAwLjAgdG8gMS4wLiBWYWx1ZXMgb3V0c2lkZVxuICAgICAqIG9mIHRoaXMgcmFuZ2UgaW5jcmVhc2Ugb3IgZGVjcmVhc2UgdGhlIHJlZmxlY3Rpdml0eSBhY2NvcmRpbmdseS5cbiAgICAgKlxuICAgICAqIFRoZSBcIkthIHNwZWN0cmFsXCIgZm9ybSBzcGVjaWZpZXMgdGhlIGFtYmllbnQgcmVmbGVjdGl2aXR5IHVzaW5nIGFcbiAgICAgKiBzcGVjdHJhbCBjdXJ2ZS4gXCJmaWxlLnJmbFwiIGlzIHRoZSBuYW1lIG9mIHRoZSBcIi5yZmxcIiBmaWxlIGNvbnRhaW5pbmdcbiAgICAgKiB0aGUgY3VydmUgZGF0YS4gXCJmYWN0b3JcIiBpcyBhbiBvcHRpb25hbCBhcmd1bWVudCB3aGljaCBpcyBhIG11bHRpcGxpZXJcbiAgICAgKiBmb3IgdGhlIHZhbHVlcyBpbiB0aGUgLnJmbCBmaWxlIGFuZCBkZWZhdWx0cyB0byAxLjAgaWYgbm90IHNwZWNpZmllZC5cbiAgICAgKlxuICAgICAqIFRoZSBcIkthIHh5elwiIGZvcm0gc3BlY2lmaWVzIHRoZSBhbWJpZW50IHJlZmxlY3Rpdml0eSB1c2luZyBDSUVYWVogdmFsdWVzLlxuICAgICAqIFwieCB5IHpcIiBhcmUgdGhlIHZhbHVlcyBvZiB0aGUgQ0lFWFlaIGNvbG9yIHNwYWNlLiBUaGUgXCJ5XCIgYW5kIFwielwiIGFyZ3VtZW50c1xuICAgICAqIGFyZSBvcHRpb25hbCBhbmQgdGFrZSBvbiB0aGUgdmFsdWUgb2YgdGhlIFwieFwiIGNvbXBvbmVudCBpZiBvbmx5IFwieFwiIGlzXG4gICAgICogc3BlY2lmaWVkLiBUaGUgXCJ4IHkgelwiIHZhbHVlcyBhcmUgbm9ybWFsbHkgaW4gdGhlIHJhbmdlIG9mIDAuMCB0byAxLjAgYW5kXG4gICAgICogaW5jcmVhc2Ugb3IgZGVjcmVhc2UgYW1iaWVudCByZWZsZWN0aXZpdHkgYWNjb3JkaW5nbHkgb3V0c2lkZSBvZiB0aGF0XG4gICAgICogcmFuZ2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9LYSh0b2tlbnM6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLmFtYmllbnQgPSB0aGlzLnBhcnNlQ29sb3IodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEaWZmdXNlIFJlZmxlY3Rpdml0eVxuICAgICAqXG4gICAgICogU2ltaWxhciB0byB0aGUgS2EgZGlyZWN0aXZlLiBTaW1wbHkgcmVwbGFjZSBcIkthXCIgd2l0aCBcIktkXCIgYW5kIHRoZSBydWxlc1xuICAgICAqIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VucyB0aGUgdG9rZW5zIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGlyZWN0aXZlXG4gICAgICovXG4gICAgcGFyc2VfS2QodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5kaWZmdXNlID0gdGhpcy5wYXJzZUNvbG9yKHRva2Vucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3BlY3RyYWwgUmVmbGVjdGl2aXR5XG4gICAgICpcbiAgICAgKiBTaW1pbGFyIHRvIHRoZSBLYSBkaXJlY3RpdmUuIFNpbXBseSByZXBsYWNlIFwiS3NcIiB3aXRoIFwiS2RcIiBhbmQgdGhlIHJ1bGVzXG4gICAgICogYXJlIHRoZSBzYW1lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9Lcyh0b2tlbnM6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLnNwZWN1bGFyID0gdGhpcy5wYXJzZUNvbG9yKHRva2Vucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW1pc3NpdmVcbiAgICAgKlxuICAgICAqIFRoZSBhbW91bnQgYW5kIGNvbG9yIG9mIGxpZ2h0IGVtaXR0ZWQgYnkgdGhlIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxuICAgICAqL1xuICAgIHBhcnNlX0tlKHRva2Vuczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuZW1pc3NpdmUgPSB0aGlzLnBhcnNlQ29sb3IodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc21pc3Npb24gRmlsdGVyXG4gICAgICpcbiAgICAgKiBBbnkgbGlnaHQgcGFzc2luZyB0aHJvdWdoIHRoZSBvYmplY3QgaXMgZmlsdGVyZWQgYnkgdGhlIHRyYW5zbWlzc2lvblxuICAgICAqIGZpbHRlciwgd2hpY2ggb25seSBhbGxvd3Mgc3BlY2lmaWMgY29sb3JzIHRvIHBhc3MgdGhyb3VnaC4gRm9yIGV4YW1wbGUsIFRmXG4gICAgICogMCAxIDAgYWxsb3dzIGFsbCBvZiB0aGUgZ3JlZW4gdG8gcGFzcyB0aHJvdWdoIGFuZCBmaWx0ZXJzIG91dCBhbGwgb2YgdGhlXG4gICAgICogcmVkIGFuZCBibHVlLlxuICAgICAqXG4gICAgICogU2ltaWxhciB0byB0aGUgS2EgZGlyZWN0aXZlLiBTaW1wbHkgcmVwbGFjZSBcIktzXCIgd2l0aCBcIlRmXCIgYW5kIHRoZSBydWxlc1xuICAgICAqIGFyZSB0aGUgc2FtZVxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VucyB0aGUgdG9rZW5zIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGlyZWN0aXZlXG4gICAgICovXG4gICAgcGFyc2VfVGYodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC50cmFuc21pc3Npb25GaWx0ZXIgPSB0aGlzLnBhcnNlQ29sb3IodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTcGVjaWZpZXMgdGhlIGRpc3NvbHZlIGZvciB0aGUgY3VycmVudCBtYXRlcmlhbC5cbiAgICAgKlxuICAgICAqIFN0YXRlbWVudDogZCBbLWhhbG9dIGBmYWN0b3JgXG4gICAgICpcbiAgICAgKiBFeGFtcGxlOiBcImQgMC41XCJcbiAgICAgKlxuICAgICAqIFRoZSBmYWN0b3IgaXMgdGhlIGFtb3VudCB0aGlzIG1hdGVyaWFsIGRpc3NvbHZlcyBpbnRvIHRoZSBiYWNrZ3JvdW5kLiBBXG4gICAgICogZmFjdG9yIG9mIDEuMCBpcyBmdWxseSBvcGFxdWUuIFRoaXMgaXMgdGhlIGRlZmF1bHQgd2hlbiBhIG5ldyBtYXRlcmlhbCBpc1xuICAgICAqIGNyZWF0ZWQuIEEgZmFjdG9yIG9mIDAuMCBpcyBmdWxseSBkaXNzb2x2ZWQgKGNvbXBsZXRlbHkgdHJhbnNwYXJlbnQpLlxuICAgICAqXG4gICAgICogVW5saWtlIGEgcmVhbCB0cmFuc3BhcmVudCBtYXRlcmlhbCwgdGhlIGRpc3NvbHZlIGRvZXMgbm90IGRlcGVuZCB1cG9uXG4gICAgICogbWF0ZXJpYWwgdGhpY2tuZXNzIG5vciBkb2VzIGl0IGhhdmUgYW55IHNwZWN0cmFsIGNoYXJhY3Rlci4gRGlzc29sdmUgd29ya3NcbiAgICAgKiBvbiBhbGwgaWxsdW1pbmF0aW9uIG1vZGVscy5cbiAgICAgKlxuICAgICAqIFRoZSBkaXNzb2x2ZSBzdGF0ZW1lbnQgYWxsb3dzIGZvciBhbiBvcHRpb25hbCBcIi1oYWxvXCIgZmxhZyB3aGljaCBpbmRpY2F0ZXNcbiAgICAgKiB0aGF0IGEgZGlzc29sdmUgaXMgZGVwZW5kZW50IG9uIHRoZSBzdXJmYWNlIG9yaWVudGF0aW9uIHJlbGF0aXZlIHRvIHRoZVxuICAgICAqIHZpZXdlci4gRm9yIGV4YW1wbGUsIGEgc3BoZXJlIHdpdGggdGhlIGZvbGxvd2luZyBkaXNzb2x2ZSwgXCJkIC1oYWxvIDAuMFwiLFxuICAgICAqIHdpbGwgYmUgZnVsbHkgZGlzc29sdmVkIGF0IGl0cyBjZW50ZXIgYW5kIHdpbGwgYXBwZWFyIGdyYWR1YWxseSBtb3JlIG9wYXF1ZVxuICAgICAqIHRvd2FyZCBpdHMgZWRnZS5cbiAgICAgKlxuICAgICAqIFwiZmFjdG9yXCIgaXMgdGhlIG1pbmltdW0gYW1vdW50IG9mIGRpc3NvbHZlIGFwcGxpZWQgdG8gdGhlIG1hdGVyaWFsLiBUaGVcbiAgICAgKiBhbW91bnQgb2YgZGlzc29sdmUgd2lsbCB2YXJ5IGJldHdlZW4gMS4wIChmdWxseSBvcGFxdWUpIGFuZCB0aGUgc3BlY2lmaWVkXG4gICAgICogXCJmYWN0b3JcIi4gVGhlIGZvcm11bGEgaXM6XG4gICAgICpcbiAgICAgKiAgICBkaXNzb2x2ZSA9IDEuMCAtIChOKnYpKDEuMC1mYWN0b3IpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9kKHRva2Vuczogc3RyaW5nW10pIHtcbiAgICAgICAgLy8gdGhpcyBpZ25vcmVzIHRoZSAtaGFsbyBvcHRpb24gYXMgSSBjYW4ndCBmaW5kIGFueSBkb2N1bWVudGF0aW9uIG9uIHdoYXRcbiAgICAgICAgLy8gaXQncyBzdXBwb3NlZCB0byBiZS5cbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuZGlzc29sdmUgPSBwYXJzZUZsb2F0KHRva2Vucy5wb3AoKSB8fCBcIjBcIik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIFwiaWxsdW1cIiBzdGF0ZW1lbnQgc3BlY2lmaWVzIHRoZSBpbGx1bWluYXRpb24gbW9kZWwgdG8gdXNlIGluIHRoZVxuICAgICAqIG1hdGVyaWFsLiBJbGx1bWluYXRpb24gbW9kZWxzIGFyZSBtYXRoZW1hdGljYWwgZXF1YXRpb25zIHRoYXQgcmVwcmVzZW50XG4gICAgICogdmFyaW91cyBtYXRlcmlhbCBsaWdodGluZyBhbmQgc2hhZGluZyBlZmZlY3RzLlxuICAgICAqXG4gICAgICogVGhlIGlsbHVtaW5hdGlvbiBudW1iZXIgY2FuIGJlIGEgbnVtYmVyIGZyb20gMCB0byAxMC4gVGhlIGZvbGxvd2luZyBhcmVcbiAgICAgKiB0aGUgbGlzdCBvZiBpbGx1bWluYXRpb24gZW51bWVyYXRpb25zIGFuZCB0aGVpciBzdW1tYXJpZXM6XG4gICAgICogMC4gQ29sb3Igb24gYW5kIEFtYmllbnQgb2ZmXG4gICAgICogMS4gQ29sb3Igb24gYW5kIEFtYmllbnQgb25cbiAgICAgKiAyLiBIaWdobGlnaHQgb25cbiAgICAgKiAzLiBSZWZsZWN0aW9uIG9uIGFuZCBSYXkgdHJhY2Ugb25cbiAgICAgKiA0LiBUcmFuc3BhcmVuY3k6IEdsYXNzIG9uLCBSZWZsZWN0aW9uOiBSYXkgdHJhY2Ugb25cbiAgICAgKiA1LiBSZWZsZWN0aW9uOiBGcmVzbmVsIG9uIGFuZCBSYXkgdHJhY2Ugb25cbiAgICAgKiA2LiBUcmFuc3BhcmVuY3k6IFJlZnJhY3Rpb24gb24sIFJlZmxlY3Rpb246IEZyZXNuZWwgb2ZmIGFuZCBSYXkgdHJhY2Ugb25cbiAgICAgKiA3LiBUcmFuc3BhcmVuY3k6IFJlZnJhY3Rpb24gb24sIFJlZmxlY3Rpb246IEZyZXNuZWwgb24gYW5kIFJheSB0cmFjZSBvblxuICAgICAqIDguIFJlZmxlY3Rpb24gb24gYW5kIFJheSB0cmFjZSBvZmZcbiAgICAgKiA5LiBUcmFuc3BhcmVuY3k6IEdsYXNzIG9uLCBSZWZsZWN0aW9uOiBSYXkgdHJhY2Ugb2ZmXG4gICAgICogMTAuIENhc3RzIHNoYWRvd3Mgb250byBpbnZpc2libGUgc3VyZmFjZXNcbiAgICAgKlxuICAgICAqIEV4YW1wbGU6IFwiaWxsdW0gMlwiIHRvIHNwZWNpZnkgdGhlIFwiSGlnaGxpZ2h0IG9uXCIgbW9kZWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxuICAgICAqL1xuICAgIHBhcnNlX2lsbHVtKHRva2Vuczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuaWxsdW1pbmF0aW9uID0gcGFyc2VJbnQodG9rZW5zWzBdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPcHRpY2FsIERlbnNpdHkgKEFLQSBJbmRleCBvZiBSZWZyYWN0aW9uKVxuICAgICAqXG4gICAgICogU3RhdGVtZW50OiBOaSBgaW5kZXhgXG4gICAgICpcbiAgICAgKiBFeGFtcGxlOiBOaSAxLjBcbiAgICAgKlxuICAgICAqIFNwZWNpZmllcyB0aGUgb3B0aWNhbCBkZW5zaXR5IGZvciB0aGUgc3VyZmFjZS4gYGluZGV4YCBpcyB0aGUgdmFsdWVcbiAgICAgKiBmb3IgdGhlIG9wdGljYWwgZGVuc2l0eS4gVGhlIHZhbHVlcyBjYW4gcmFuZ2UgZnJvbSAwLjAwMSB0byAxMC4gIEEgdmFsdWUgb2ZcbiAgICAgKiAxLjAgbWVhbnMgdGhhdCBsaWdodCBkb2VzIG5vdCBiZW5kIGFzIGl0IHBhc3NlcyB0aHJvdWdoIGFuIG9iamVjdC5cbiAgICAgKiBJbmNyZWFzaW5nIHRoZSBvcHRpY2FsX2RlbnNpdHkgaW5jcmVhc2VzIHRoZSBhbW91bnQgb2YgYmVuZGluZy4gR2xhc3MgaGFzXG4gICAgICogYW4gaW5kZXggb2YgcmVmcmFjdGlvbiBvZiBhYm91dCAxLjUuIFZhbHVlcyBvZiBsZXNzIHRoYW4gMS4wIHByb2R1Y2VcbiAgICAgKiBiaXphcnJlIHJlc3VsdHMgYW5kIGFyZSBub3QgcmVjb21tZW5kZWRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxuICAgICAqL1xuICAgIHBhcnNlX05pKHRva2Vuczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwucmVmcmFjdGlvbkluZGV4ID0gcGFyc2VGbG9hdCh0b2tlbnNbMF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNwZWNpZmllcyB0aGUgc3BlY3VsYXIgZXhwb25lbnQgZm9yIHRoZSBjdXJyZW50IG1hdGVyaWFsLiBUaGlzIGRlZmluZXMgdGhlXG4gICAgICogZm9jdXMgb2YgdGhlIHNwZWN1bGFyIGhpZ2hsaWdodC5cbiAgICAgKlxuICAgICAqIFN0YXRlbWVudDogTnMgYGV4cG9uZW50YFxuICAgICAqXG4gICAgICogRXhhbXBsZTogXCJOcyAyNTBcIlxuICAgICAqXG4gICAgICogYGV4cG9uZW50YCBpcyB0aGUgdmFsdWUgZm9yIHRoZSBzcGVjdWxhciBleHBvbmVudC4gQSBoaWdoIGV4cG9uZW50IHJlc3VsdHNcbiAgICAgKiBpbiBhIHRpZ2h0LCBjb25jZW50cmF0ZWQgaGlnaGxpZ2h0LiBOcyBWYWx1ZXMgbm9ybWFsbHkgcmFuZ2UgZnJvbSAwIHRvXG4gICAgICogMTAwMC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxuICAgICAqL1xuICAgIHBhcnNlX05zKHRva2Vuczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuc3BlY3VsYXJFeHBvbmVudCA9IHBhcnNlSW50KHRva2Vuc1swXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3BlY2lmaWVzIHRoZSBzaGFycG5lc3Mgb2YgdGhlIHJlZmxlY3Rpb25zIGZyb20gdGhlIGxvY2FsIHJlZmxlY3Rpb24gbWFwLlxuICAgICAqXG4gICAgICogU3RhdGVtZW50OiBzaGFycG5lc3MgYHZhbHVlYFxuICAgICAqXG4gICAgICogRXhhbXBsZTogXCJzaGFycG5lc3MgMTAwXCJcbiAgICAgKlxuICAgICAqIElmIGEgbWF0ZXJpYWwgZG9lcyBub3QgaGF2ZSBhIGxvY2FsIHJlZmxlY3Rpb24gbWFwIGRlZmluZWQgaW4gaXRzIG1hdGVyaWFsXG4gICAgICogZGVmaW50aW9ucywgc2hhcnBuZXNzIHdpbGwgYXBwbHkgdG8gdGhlIGdsb2JhbCByZWZsZWN0aW9uIG1hcCBkZWZpbmVkIGluXG4gICAgICogUHJlVmlldy5cbiAgICAgKlxuICAgICAqIGB2YWx1ZWAgY2FuIGJlIGEgbnVtYmVyIGZyb20gMCB0byAxMDAwLiBUaGUgZGVmYXVsdCBpcyA2MC4gQSBoaWdoIHZhbHVlXG4gICAgICogcmVzdWx0cyBpbiBhIGNsZWFyIHJlZmxlY3Rpb24gb2Ygb2JqZWN0cyBpbiB0aGUgcmVmbGVjdGlvbiBtYXAuXG4gICAgICpcbiAgICAgKiBUaXA6IHNoYXJwbmVzcyB2YWx1ZXMgZ3JlYXRlciB0aGFuIDEwMCBpbnRyb2R1Y2UgYWxpYXNpbmcgZWZmZWN0cyBpblxuICAgICAqIGZsYXQgc3VyZmFjZXMgdGhhdCBhcmUgdmlld2VkIGF0IGEgc2hhcnAgYW5nbGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9zaGFycG5lc3ModG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5zaGFycG5lc3MgPSBwYXJzZUludCh0b2tlbnNbMF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgLWNjIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1jYyBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX2NjKHZhbHVlczogc3RyaW5nW10sIG9wdGlvbnM6IFRleHR1cmVNYXBEYXRhKSB7XG4gICAgICAgIG9wdGlvbnMuY29sb3JDb3JyZWN0aW9uID0gdmFsdWVzWzBdID09IFwib25cIjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIC1ibGVuZHUgZmxhZyBhbmQgdXBkYXRlcyB0aGUgb3B0aW9ucyBvYmplY3Qgd2l0aCB0aGUgdmFsdWVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLWJsZW5kdSBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX2JsZW5kdSh2YWx1ZXM6IHN0cmluZ1tdLCBvcHRpb25zOiBUZXh0dXJlTWFwRGF0YSkge1xuICAgICAgICBvcHRpb25zLmhvcml6b250YWxCbGVuZGluZyA9IHZhbHVlc1swXSA9PSBcIm9uXCI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSAtYmxlbmR2IGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1ibGVuZHYgZmxhZ1xuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcbiAgICAgKi9cbiAgICBwYXJzZV9ibGVuZHYodmFsdWVzOiBzdHJpbmdbXSwgb3B0aW9uczogVGV4dHVyZU1hcERhdGEpIHtcbiAgICAgICAgb3B0aW9ucy52ZXJ0aWNhbEJsZW5kaW5nID0gdmFsdWVzWzBdID09IFwib25cIjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIC1ib29zdCBmbGFnIGFuZCB1cGRhdGVzIHRoZSBvcHRpb25zIG9iamVjdCB3aXRoIHRoZSB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtYm9vc3QgZmxhZ1xuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcbiAgICAgKi9cbiAgICBwYXJzZV9ib29zdCh2YWx1ZXM6IHN0cmluZ1tdLCBvcHRpb25zOiBUZXh0dXJlTWFwRGF0YSkge1xuICAgICAgICBvcHRpb25zLmJvb3N0TWlwTWFwU2hhcnBuZXNzID0gcGFyc2VGbG9hdCh2YWx1ZXNbMF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgLW1tIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1tbSBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX21tKHZhbHVlczogc3RyaW5nW10sIG9wdGlvbnM6IFRleHR1cmVNYXBEYXRhKSB7XG4gICAgICAgIG9wdGlvbnMubW9kaWZ5VGV4dHVyZU1hcC5icmlnaHRuZXNzID0gcGFyc2VGbG9hdCh2YWx1ZXNbMF0pO1xuICAgICAgICBvcHRpb25zLm1vZGlmeVRleHR1cmVNYXAuY29udHJhc3QgPSBwYXJzZUZsb2F0KHZhbHVlc1sxXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuZCBzZXRzIHRoZSAtbywgLXMsIGFuZCAtdCAgdSwgdiwgYW5kIHcgdmFsdWVzXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtbywgLXMsIC10IGZsYWdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uIHRoZSBPYmplY3Qgb2YgZWl0aGVyIHRoZSAtbywgLXMsIC10IG9wdGlvblxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gZGVmYXVsdFZhbHVlIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcbiAgICAgKi9cbiAgICBwYXJzZV9vc3QodmFsdWVzOiBzdHJpbmdbXSwgb3B0aW9uOiBVVlcsIGRlZmF1bHRWYWx1ZTogbnVtYmVyKSB7XG4gICAgICAgIHdoaWxlICh2YWx1ZXMubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgdmFsdWVzLnB1c2goZGVmYXVsdFZhbHVlLnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0aW9uLnUgPSBwYXJzZUZsb2F0KHZhbHVlc1swXSk7XG4gICAgICAgIG9wdGlvbi52ID0gcGFyc2VGbG9hdCh2YWx1ZXNbMV0pO1xuICAgICAgICBvcHRpb24udyA9IHBhcnNlRmxvYXQodmFsdWVzWzJdKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIC1vIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1vIGZsYWdcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB0aGUgT2JqZWN0IG9mIGFsbCBpbWFnZSBvcHRpb25zXG4gICAgICovXG4gICAgcGFyc2Vfbyh2YWx1ZXM6IHN0cmluZ1tdLCBvcHRpb25zOiBUZXh0dXJlTWFwRGF0YSkge1xuICAgICAgICB0aGlzLnBhcnNlX29zdCh2YWx1ZXMsIG9wdGlvbnMub2Zmc2V0LCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIC1zIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1zIGZsYWdcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB0aGUgT2JqZWN0IG9mIGFsbCBpbWFnZSBvcHRpb25zXG4gICAgICovXG4gICAgcGFyc2Vfcyh2YWx1ZXM6IHN0cmluZ1tdLCBvcHRpb25zOiBUZXh0dXJlTWFwRGF0YSkge1xuICAgICAgICB0aGlzLnBhcnNlX29zdCh2YWx1ZXMsIG9wdGlvbnMuc2NhbGUsIDEpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgLXQgZmxhZyBhbmQgdXBkYXRlcyB0aGUgb3B0aW9ucyBvYmplY3Qgd2l0aCB0aGUgdmFsdWVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLXQgZmxhZ1xuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcbiAgICAgKi9cbiAgICBwYXJzZV90KHZhbHVlczogc3RyaW5nW10sIG9wdGlvbnM6IFRleHR1cmVNYXBEYXRhKSB7XG4gICAgICAgIHRoaXMucGFyc2Vfb3N0KHZhbHVlcywgb3B0aW9ucy50dXJidWxlbmNlLCAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIC10ZXhyZXMgZmxhZyBhbmQgdXBkYXRlcyB0aGUgb3B0aW9ucyBvYmplY3Qgd2l0aCB0aGUgdmFsdWVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLXRleHJlcyBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX3RleHJlcyh2YWx1ZXM6IHN0cmluZ1tdLCBvcHRpb25zOiBUZXh0dXJlTWFwRGF0YSkge1xuICAgICAgICBvcHRpb25zLnRleHR1cmVSZXNvbHV0aW9uID0gcGFyc2VGbG9hdCh2YWx1ZXNbMF0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgLWNsYW1wIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1jbGFtcCBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX2NsYW1wKHZhbHVlczogc3RyaW5nW10sIG9wdGlvbnM6IFRleHR1cmVNYXBEYXRhKSB7XG4gICAgICAgIG9wdGlvbnMuY2xhbXAgPSB2YWx1ZXNbMF0gPT0gXCJvblwiO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgLWJtIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1ibSBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX2JtKHZhbHVlczogc3RyaW5nW10sIG9wdGlvbnM6IFRleHR1cmVNYXBEYXRhKSB7XG4gICAgICAgIG9wdGlvbnMuYnVtcE11bHRpcGxpZXIgPSBwYXJzZUZsb2F0KHZhbHVlc1swXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSAtaW1mY2hhbiBmbGFnIGFuZCB1cGRhdGVzIHRoZSBvcHRpb25zIG9iamVjdCB3aXRoIHRoZSB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtaW1mY2hhbiBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX2ltZmNoYW4odmFsdWVzOiBzdHJpbmdbXSwgb3B0aW9uczogVGV4dHVyZU1hcERhdGEpIHtcbiAgICAgICAgb3B0aW9ucy5pbWZDaGFuID0gdmFsdWVzWzBdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoaXMgb25seSBleGlzdHMgZm9yIHJlbGVjdGlvbiBtYXBzIGFuZCBkZW5vdGVzIHRoZSB0eXBlIG9mIHJlZmxlY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtdHlwZSBmbGFnXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xuICAgICAqL1xuICAgIHBhcnNlX3R5cGUodmFsdWVzOiBzdHJpbmdbXSwgb3B0aW9uczogVGV4dHVyZU1hcERhdGEpIHtcbiAgICAgICAgb3B0aW9ucy5yZWZsZWN0aW9uVHlwZSA9IHZhbHVlc1swXTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIHRleHR1cmUncyBvcHRpb25zIGFuZCByZXR1cm5zIGFuIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIGluZm9cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgYWxsIG9mIHRoZSBvcHRpb24gdG9rZW5zIHRvIHBhc3MgdG8gdGhlIHRleHR1cmVcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGEgY29tcGxldGUgb2JqZWN0IG9mIG9iamVjdHMgdG8gYXBwbHkgdG8gdGhlIHRleHR1cmVcbiAgICAgKi9cbiAgICBwYXJzZU9wdGlvbnModG9rZW5zOiBzdHJpbmdbXSk6IFRleHR1cmVNYXBEYXRhIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGVtcHR5VGV4dHVyZU9wdGlvbnMoKTtcblxuICAgICAgICBsZXQgb3B0aW9uO1xuICAgICAgICBsZXQgdmFsdWVzO1xuICAgICAgICBjb25zdCBvcHRpb25zVG9WYWx1ZXM6IHsgW2s6IHN0cmluZ106IHN0cmluZ1tdIH0gPSB7fTtcblxuICAgICAgICB0b2tlbnMucmV2ZXJzZSgpO1xuXG4gICAgICAgIHdoaWxlICh0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyB0b2tlbiBpcyBndWFyYW50ZWVkIHRvIGV4aXN0cyBoZXJlLCBoZW5jZSB0aGUgZXhwbGljaXQgXCJhc1wiXG4gICAgICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vucy5wb3AoKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgICAgIGlmICh0b2tlbi5zdGFydHNXaXRoKFwiLVwiKSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbiA9IHRva2VuLnN1YnN0cigxKTtcbiAgICAgICAgICAgICAgICBvcHRpb25zVG9WYWx1ZXNbb3B0aW9uXSA9IFtdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb24pIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zVG9WYWx1ZXNbb3B0aW9uXS5wdXNoKHRva2VuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAob3B0aW9uIGluIG9wdGlvbnNUb1ZhbHVlcykge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zVG9WYWx1ZXMuaGFzT3duUHJvcGVydHkob3B0aW9uKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWVzID0gb3B0aW9uc1RvVmFsdWVzW29wdGlvbl07XG4gICAgICAgICAgICBjb25zdCBvcHRpb25NZXRob2QgPSAodGhpcyBhcyBhbnkpW2BwYXJzZV8ke29wdGlvbn1gXTtcbiAgICAgICAgICAgIGlmIChvcHRpb25NZXRob2QpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25NZXRob2QuYmluZCh0aGlzKSh2YWx1ZXMsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBnaXZlbiB0ZXh0dXJlIG1hcCBsaW5lLlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VucyBhbGwgb2YgdGhlIHRva2VucyByZXByZXNlbnRpbmcgdGhlIHRleHR1cmVcbiAgICAgKiBAcmV0dXJuIGEgY29tcGxldGUgb2JqZWN0IG9mIG9iamVjdHMgdG8gYXBwbHkgdG8gdGhlIHRleHR1cmVcbiAgICAgKi9cbiAgICBwYXJzZU1hcCh0b2tlbnM6IHN0cmluZ1tdKTogVGV4dHVyZU1hcERhdGEge1xuICAgICAgICAvLyBhY2NvcmRpbmcgdG8gd2lraXBlZGlhOlxuICAgICAgICAvLyAoaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2F2ZWZyb250Xy5vYmpfZmlsZSNWZW5kb3Jfc3BlY2lmaWNfYWx0ZXJhdGlvbnMpXG4gICAgICAgIC8vIHRoZXJlIGlzIGF0IGxlYXN0IG9uZSB2ZW5kb3IgdGhhdCBwbGFjZXMgdGhlIGZpbGVuYW1lIGJlZm9yZSB0aGUgb3B0aW9uc1xuICAgICAgICAvLyByYXRoZXIgdGhhbiBhZnRlciAod2hpY2ggaXMgdG8gc3BlYykuIEFsbCBvcHRpb25zIHN0YXJ0IHdpdGggYSAnLSdcbiAgICAgICAgLy8gc28gaWYgdGhlIGZpcnN0IHRva2VuIGRvZXNuJ3Qgc3RhcnQgd2l0aCBhICctJywgd2UncmUgZ29pbmcgdG8gYXNzdW1lXG4gICAgICAgIC8vIGl0J3MgdGhlIG5hbWUgb2YgdGhlIG1hcCBmaWxlLlxuICAgICAgICBsZXQgb3B0aW9uc1N0cmluZztcbiAgICAgICAgbGV0IGZpbGVuYW1lID0gXCJcIjtcbiAgICAgICAgaWYgKCF0b2tlbnNbMF0uc3RhcnRzV2l0aChcIi1cIikpIHtcbiAgICAgICAgICAgIFtmaWxlbmFtZSwgLi4ub3B0aW9uc1N0cmluZ10gPSB0b2tlbnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9IHRva2Vucy5wb3AoKSBhcyBzdHJpbmc7XG4gICAgICAgICAgICBvcHRpb25zU3RyaW5nID0gdG9rZW5zO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMucGFyc2VPcHRpb25zKG9wdGlvbnNTdHJpbmcpO1xuICAgICAgICBvcHRpb25zLmZpbGVuYW1lID0gZmlsZW5hbWUucmVwbGFjZSgvXFxcXC9nLCBcIi9cIik7XG5cbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBhbWJpZW50IG1hcC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfS2EgZGlyZWNpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9tYXBfS2EodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBBbWJpZW50ID0gdGhpcy5wYXJzZU1hcCh0b2tlbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgZGlmZnVzZSBtYXAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5zIGxpc3Qgb2YgdG9rZW5zIGZvciB0aGUgbWFwX0tkIGRpcmVjaXZlXG4gICAgICovXG4gICAgcGFyc2VfbWFwX0tkKHRva2Vuczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwubWFwRGlmZnVzZSA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIHNwZWN1bGFyIG1hcC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfS3MgZGlyZWNpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9tYXBfS3ModG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBTcGVjdWxhciA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGVtaXNzaXZlIG1hcC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfS2UgZGlyZWNpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9tYXBfS2UodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBFbWlzc2l2ZSA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIHNwZWN1bGFyIGV4cG9uZW50IG1hcC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfTnMgZGlyZWNpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9tYXBfTnModG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBTcGVjdWxhckV4cG9uZW50ID0gdGhpcy5wYXJzZU1hcCh0b2tlbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgZGlzc29sdmUgbWFwLlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIG1hcF9kIGRpcmVjaXZlXG4gICAgICovXG4gICAgcGFyc2VfbWFwX2QodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBEaXNzb2x2ZSA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGFudGktYWxpYXNpbmcgb3B0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIG1hcF9hYXQgZGlyZWNpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9tYXBfYWF0KHRva2Vuczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuYW50aUFsaWFzaW5nID0gdG9rZW5zWzBdID09IFwib25cIjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGJ1bXAgbWFwLlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIG1hcF9idW1wIGRpcmVjaXZlXG4gICAgICovXG4gICAgcGFyc2VfbWFwX2J1bXAodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBCdW1wID0gdGhpcy5wYXJzZU1hcCh0b2tlbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgYnVtcCBtYXAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5zIGxpc3Qgb2YgdG9rZW5zIGZvciB0aGUgYnVtcCBkaXJlY2l2ZVxuICAgICAqL1xuICAgIHBhcnNlX2J1bXAodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLnBhcnNlX21hcF9idW1wKHRva2Vucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBkaXNwIG1hcC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBkaXNwIGRpcmVjaXZlXG4gICAgICovXG4gICAgcGFyc2VfZGlzcCh0b2tlbnM6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLm1hcERpc3BsYWNlbWVudCA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgdGhlIGRlY2FsIG1hcC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfZGVjYWwgZGlyZWNpdmVcbiAgICAgKi9cbiAgICBwYXJzZV9kZWNhbCh0b2tlbnM6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLm1hcERlY2FsID0gdGhpcy5wYXJzZU1hcCh0b2tlbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyB0aGUgcmVmbCBtYXAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5zIGxpc3Qgb2YgdG9rZW5zIGZvciB0aGUgcmVmbCBkaXJlY2l2ZVxuICAgICAqL1xuICAgIHBhcnNlX3JlZmwodG9rZW5zOiBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBSZWZsZWN0aW9ucy5wdXNoKHRoaXMucGFyc2VNYXAodG9rZW5zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIHRoZSBNVEwgZmlsZS5cbiAgICAgKlxuICAgICAqIEl0ZXJhdGVzIGxpbmUgYnkgbGluZSBwYXJzaW5nIGVhY2ggTVRMIGRpcmVjdGl2ZS5cbiAgICAgKlxuICAgICAqIFRoaXMgZnVuY3Rpb24gZXhwZWN0cyB0aGUgZmlyc3QgdG9rZW4gaW4gdGhlIGxpbmVcbiAgICAgKiB0byBiZSBhIHZhbGlkIE1UTCBkaXJlY3RpdmUuIFRoYXQgdG9rZW4gaXMgdGhlbiB1c2VkXG4gICAgICogdG8gdHJ5IGFuZCBydW4gYSBtZXRob2Qgb24gdGhpcyBjbGFzcy4gcGFyc2VfW2RpcmVjdGl2ZV1cbiAgICAgKiBFLmcuLCB0aGUgYG5ld210bGAgZGlyZWN0aXZlIHdvdWxkIHRyeSB0byBjYWxsIHRoZSBtZXRob2RcbiAgICAgKiBwYXJzZV9uZXdtdGwuIEVhY2ggcGFyc2luZyBmdW5jdGlvbiB0YWtlcyBpbiB0aGUgcmVtYWluaW5nXG4gICAgICogbGlzdCBvZiB0b2tlbnMgYW5kIHVwZGF0ZXMgdGhlIGN1cnJlbnRNYXRlcmlhbCBjbGFzcyB3aXRoXG4gICAgICogdGhlIGF0dHJpYnV0ZXMgcHJvdmlkZWQuXG4gICAgICovXG4gICAgcGFyc2UoKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gdGhpcy5kYXRhLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgICAgIGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgICAgIGlmICghbGluZSB8fCBsaW5lLnN0YXJ0c1dpdGgoXCIjXCIpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IFtkaXJlY3RpdmUsIC4uLnRva2Vuc10gPSBsaW5lLnNwbGl0KC9cXHMvKTtcblxuICAgICAgICAgICAgY29uc3QgcGFyc2VNZXRob2QgPSAodGhpcyBhcyBhbnkpW2BwYXJzZV8ke2RpcmVjdGl2ZX1gXTtcblxuICAgICAgICAgICAgaWYgKCFwYXJzZU1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgRG9uJ3Qga25vdyBob3cgdG8gcGFyc2UgdGhlIGRpcmVjdGl2ZTogXCIke2RpcmVjdGl2ZX1cImApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhgUGFyc2luZyBcIiR7ZGlyZWN0aXZlfVwiIHdpdGggdG9rZW5zOiAke3Rva2Vuc31gKTtcbiAgICAgICAgICAgIHBhcnNlTWV0aG9kLmJpbmQodGhpcykodG9rZW5zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNvbWUgY2xlYW51cC4gVGhlc2UgZG9uJ3QgbmVlZCB0byBiZSBleHBvc2VkIGFzIHB1YmxpYyBkYXRhLlxuICAgICAgICBkZWxldGUgdGhpcy5kYXRhO1xuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbCA9IFNFTlRJTkVMX01BVEVSSUFMO1xuICAgIH1cblxuICAgIC8qIGVzbGludC1lbmFibGUgY2FtZWxjYXNlKi9cbn1cblxuZnVuY3Rpb24gZW1wdHlUZXh0dXJlT3B0aW9ucygpOiBUZXh0dXJlTWFwRGF0YSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY29sb3JDb3JyZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgaG9yaXpvbnRhbEJsZW5kaW5nOiB0cnVlLFxuICAgICAgICB2ZXJ0aWNhbEJsZW5kaW5nOiB0cnVlLFxuICAgICAgICBib29zdE1pcE1hcFNoYXJwbmVzczogMCxcbiAgICAgICAgbW9kaWZ5VGV4dHVyZU1hcDoge1xuICAgICAgICAgICAgYnJpZ2h0bmVzczogMCxcbiAgICAgICAgICAgIGNvbnRyYXN0OiAxLFxuICAgICAgICB9LFxuICAgICAgICBvZmZzZXQ6IHsgdTogMCwgdjogMCwgdzogMCB9LFxuICAgICAgICBzY2FsZTogeyB1OiAxLCB2OiAxLCB3OiAxIH0sXG4gICAgICAgIHR1cmJ1bGVuY2U6IHsgdTogMCwgdjogMCwgdzogMCB9LFxuICAgICAgICBjbGFtcDogZmFsc2UsXG4gICAgICAgIHRleHR1cmVSZXNvbHV0aW9uOiBudWxsLFxuICAgICAgICBidW1wTXVsdGlwbGllcjogMSxcbiAgICAgICAgaW1mQ2hhbjogbnVsbCxcbiAgICAgICAgZmlsZW5hbWU6IFwiXCIsXG4gICAgfTtcbn1cbiIsImltcG9ydCB7IExheW91dCB9IGZyb20gXCIuL2xheW91dFwiO1xuaW1wb3J0IHsgTWF0ZXJpYWwsIE1hdGVyaWFsTGlicmFyeSB9IGZyb20gXCIuL21hdGVyaWFsXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzaE9wdGlvbnMge1xuICAgIGVuYWJsZVdUZXh0dXJlQ29vcmQ/OiBib29sZWFuO1xuICAgIGNhbGNUYW5nZW50c0FuZEJpdGFuZ2VudHM/OiBib29sZWFuO1xuICAgIG1hdGVyaWFscz86IHsgW2tleTogc3RyaW5nXTogTWF0ZXJpYWwgfTtcbn1cblxuaW50ZXJmYWNlIFVucGFja2VkQXR0cnMge1xuICAgIHZlcnRzOiBudW1iZXJbXTtcbiAgICBub3JtczogbnVtYmVyW107XG4gICAgdGV4dHVyZXM6IG51bWJlcltdO1xuICAgIGhhc2hpbmRpY2VzOiB7IFtrOiBzdHJpbmddOiBudW1iZXIgfTtcbiAgICBpbmRpY2VzOiBudW1iZXJbXVtdO1xuICAgIG1hdGVyaWFsSW5kaWNlczogbnVtYmVyW107XG4gICAgaW5kZXg6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYXRlcmlhbE5hbWVUb0luZGV4IHtcbiAgICBbazogc3RyaW5nXTogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4VG9NYXRlcmlhbCB7XG4gICAgW2s6IG51bWJlcl06IE1hdGVyaWFsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFycmF5QnVmZmVyV2l0aEl0ZW1TaXplIGV4dGVuZHMgQXJyYXlCdWZmZXIge1xuICAgIG51bUl0ZW1zPzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVpbnQxNkFycmF5V2l0aEl0ZW1TaXplIGV4dGVuZHMgVWludDE2QXJyYXkge1xuICAgIG51bUl0ZW1zPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRoZSBtYWluIE1lc2ggY2xhc3MuIFRoZSBjb25zdHJ1Y3RvciB3aWxsIHBhcnNlIHRocm91Z2ggdGhlIE9CSiBmaWxlIGRhdGFcbiAqIGFuZCBjb2xsZWN0IHRoZSB2ZXJ0ZXgsIHZlcnRleCBub3JtYWwsIHRleHR1cmUsIGFuZCBmYWNlIGluZm9ybWF0aW9uLiBUaGlzXG4gKiBpbmZvcm1hdGlvbiBjYW4gdGhlbiBiZSB1c2VkIGxhdGVyIG9uIHdoZW4gY3JlYXRpbmcgeW91ciBWQk9zLiBTZWVcbiAqIE9CSi5pbml0TWVzaEJ1ZmZlcnMgZm9yIGFuIGV4YW1wbGUgb2YgaG93IHRvIHVzZSB0aGUgbmV3bHkgY3JlYXRlZCBNZXNoXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1lc2gge1xuICAgIHB1YmxpYyB2ZXJ0aWNlczogbnVtYmVyW107XG4gICAgcHVibGljIHZlcnRleE5vcm1hbHM6IG51bWJlcltdO1xuICAgIHB1YmxpYyB0ZXh0dXJlczogbnVtYmVyW107XG4gICAgcHVibGljIGluZGljZXM6IG51bWJlcltdO1xuICAgIHB1YmxpYyBuYW1lOiBzdHJpbmcgPSBcIlwiO1xuICAgIHB1YmxpYyB2ZXJ0ZXhNYXRlcmlhbEluZGljZXM6IG51bWJlcltdO1xuICAgIHB1YmxpYyBpbmRpY2VzUGVyTWF0ZXJpYWw6IG51bWJlcltdW10gPSBbXTtcbiAgICBwdWJsaWMgbWF0ZXJpYWxOYW1lczogc3RyaW5nW107XG4gICAgcHVibGljIG1hdGVyaWFsSW5kaWNlczogTWF0ZXJpYWxOYW1lVG9JbmRleDtcbiAgICBwdWJsaWMgbWF0ZXJpYWxzQnlJbmRleDogSW5kZXhUb01hdGVyaWFsID0ge307XG4gICAgcHVibGljIHRhbmdlbnRzOiBudW1iZXJbXSA9IFtdO1xuICAgIHB1YmxpYyBiaXRhbmdlbnRzOiBudW1iZXJbXSA9IFtdO1xuICAgIHB1YmxpYyB0ZXh0dXJlU3RyaWRlOiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBNZXNoXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdERhdGEgLSBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPQkogZmlsZSB3aXRoXG4gICAgICogICAgIG5ld2xpbmVzIHByZXNlcnZlZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIGEgSlMgb2JqZWN0IGNvbnRhaW5pbmcgdmFsaWQgb3B0aW9ucy4gU2VlIGNsYXNzXG4gICAgICogICAgIGRvY3VtZW50YXRpb24gZm9yIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtib29sfSBvcHRpb25zLmVuYWJsZVdUZXh0dXJlQ29vcmQgLSBUZXh0dXJlIGNvb3JkaW5hdGVzIGNhbiBoYXZlXG4gICAgICogICAgIGFuIG9wdGlvbmFsIFwid1wiIGNvb3JkaW5hdGUgYWZ0ZXIgdGhlIHUgYW5kIHYgY29vcmRpbmF0ZXMuIFRoaXMgZXh0cmFcbiAgICAgKiAgICAgdmFsdWUgY2FuIGJlIHVzZWQgaW4gb3JkZXIgdG8gcGVyZm9ybSBmYW5jeSB0cmFuc2Zvcm1hdGlvbnMgb24gdGhlXG4gICAgICogICAgIHRleHR1cmVzIHRoZW1zZWx2ZXMuIERlZmF1bHQgaXMgdG8gdHJ1bmNhdGUgdG8gb25seSB0aGUgdSBhbiB2XG4gICAgICogICAgIGNvb3JkaW5hdGVzLiBQYXNzaW5nIHRydWUgd2lsbCBwcm92aWRlIGEgZGVmYXVsdCB2YWx1ZSBvZiAwIGluIHRoZVxuICAgICAqICAgICBldmVudCB0aGF0IGFueSBvciBhbGwgdGV4dHVyZSBjb29yZGluYXRlcyBkb24ndCBwcm92aWRlIGEgdyB2YWx1ZS5cbiAgICAgKiAgICAgQWx3YXlzIHVzZSB0aGUgdGV4dHVyZVN0cmlkZSBhdHRyaWJ1dGUgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIHRoZVxuICAgICAqICAgICBzdHJpZGUgbGVuZ3RoIG9mIHRoZSB0ZXh0dXJlIGNvb3JkaW5hdGVzIHdoZW4gcmVuZGVyaW5nIHRoZSBlbGVtZW50XG4gICAgICogICAgIGFycmF5LlxuICAgICAqIEBwYXJhbSB7Ym9vbH0gb3B0aW9ucy5jYWxjVGFuZ2VudHNBbmRCaXRhbmdlbnRzIC0gQ2FsY3VsYXRlIHRoZSB0YW5nZW50c1xuICAgICAqICAgICBhbmQgYml0YW5nZW50cyB3aGVuIGxvYWRpbmcgb2YgdGhlIE9CSiBpcyBjb21wbGV0ZWQuIFRoaXMgYWRkcyB0d28gbmV3XG4gICAgICogICAgIGF0dHJpYnV0ZXMgdG8gdGhlIE1lc2ggaW5zdGFuY2U6IGB0YW5nZW50c2AgYW5kIGBiaXRhbmdlbnRzYC5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihvYmplY3REYXRhOiBzdHJpbmcsIG9wdGlvbnM/OiBNZXNoT3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb3B0aW9ucy5tYXRlcmlhbHMgPSBvcHRpb25zLm1hdGVyaWFscyB8fCB7fTtcbiAgICAgICAgb3B0aW9ucy5lbmFibGVXVGV4dHVyZUNvb3JkID0gISFvcHRpb25zLmVuYWJsZVdUZXh0dXJlQ29vcmQ7XG5cbiAgICAgICAgLy8gdGhlIGxpc3Qgb2YgdW5pcXVlIHZlcnRleCwgbm9ybWFsLCB0ZXh0dXJlLCBhdHRyaWJ1dGVzXG4gICAgICAgIHRoaXMudmVydGV4Tm9ybWFscyA9IFtdO1xuICAgICAgICB0aGlzLnRleHR1cmVzID0gW107XG4gICAgICAgIC8vIHRoZSBpbmRpY2llcyB0byBkcmF3IHRoZSBmYWNlc1xuICAgICAgICB0aGlzLmluZGljZXMgPSBbXTtcbiAgICAgICAgdGhpcy50ZXh0dXJlU3RyaWRlID0gb3B0aW9ucy5lbmFibGVXVGV4dHVyZUNvb3JkID8gMyA6IDI7XG5cbiAgICAgICAgLypcbiAgICAgICAgVGhlIE9CSiBmaWxlIGZvcm1hdCBkb2VzIGEgc29ydCBvZiBjb21wcmVzc2lvbiB3aGVuIHNhdmluZyBhIG1vZGVsIGluIGFcbiAgICAgICAgcHJvZ3JhbSBsaWtlIEJsZW5kZXIuIFRoZXJlIGFyZSBhdCBsZWFzdCAzIHNlY3Rpb25zICg0IGluY2x1ZGluZyB0ZXh0dXJlcylcbiAgICAgICAgd2l0aGluIHRoZSBmaWxlLiBFYWNoIGxpbmUgaW4gYSBzZWN0aW9uIGJlZ2lucyB3aXRoIHRoZSBzYW1lIHN0cmluZzpcbiAgICAgICAgICAqICd2JzogaW5kaWNhdGVzIHZlcnRleCBzZWN0aW9uXG4gICAgICAgICAgKiAndm4nOiBpbmRpY2F0ZXMgdmVydGV4IG5vcm1hbCBzZWN0aW9uXG4gICAgICAgICAgKiAnZic6IGluZGljYXRlcyB0aGUgZmFjZXMgc2VjdGlvblxuICAgICAgICAgICogJ3Z0JzogaW5kaWNhdGVzIHZlcnRleCB0ZXh0dXJlIHNlY3Rpb24gKGlmIHRleHR1cmVzIHdlcmUgdXNlZCBvbiB0aGUgbW9kZWwpXG4gICAgICAgIEVhY2ggb2YgdGhlIGFib3ZlIHNlY3Rpb25zIChleGNlcHQgZm9yIHRoZSBmYWNlcyBzZWN0aW9uKSBpcyBhIGxpc3Qvc2V0IG9mXG4gICAgICAgIHVuaXF1ZSB2ZXJ0aWNlcy5cblxuICAgICAgICBFYWNoIGxpbmUgb2YgdGhlIGZhY2VzIHNlY3Rpb24gY29udGFpbnMgYSBsaXN0IG9mXG4gICAgICAgICh2ZXJ0ZXgsIFt0ZXh0dXJlXSwgbm9ybWFsKSBncm91cHMuXG5cbiAgICAgICAgKipOb3RlOioqIFRoZSBmb2xsb3dpbmcgZG9jdW1lbnRhdGlvbiB3aWxsIHVzZSBhIGNhcGl0YWwgXCJWXCIgVmVydGV4IHRvXG4gICAgICAgIGRlbm90ZSB0aGUgYWJvdmUgKHZlcnRleCwgW3RleHR1cmVdLCBub3JtYWwpIGdyb3VwcyB3aGVyZWFzIGEgbG93ZXJjYXNlXG4gICAgICAgIFwidlwiIHZlcnRleCBpcyB1c2VkIHRvIGRlbm90ZSBhbiBYLCBZLCBaIGNvb3JkaW5hdGUuXG5cbiAgICAgICAgU29tZSBleGFtcGxlczpcbiAgICAgICAgICAgIC8vIHRoZSB0ZXh0dXJlIGluZGV4IGlzIG9wdGlvbmFsLCBib3RoIGZvcm1hdHMgYXJlIHBvc3NpYmxlIGZvciBtb2RlbHNcbiAgICAgICAgICAgIC8vIHdpdGhvdXQgYSB0ZXh0dXJlIGFwcGxpZWRcbiAgICAgICAgICAgIGYgMS8yNSAxOC80NiAxMi8zMVxuICAgICAgICAgICAgZiAxLy8yNSAxOC8vNDYgMTIvLzMxXG5cbiAgICAgICAgICAgIC8vIEEgMyB2ZXJ0ZXggZmFjZSB3aXRoIHRleHR1cmUgaW5kaWNlc1xuICAgICAgICAgICAgZiAxNi85Mi8xMSAxNC8xMDEvMjIgMS82OS8xXG5cbiAgICAgICAgICAgIC8vIEEgNCB2ZXJ0ZXggZmFjZVxuICAgICAgICAgICAgZiAxNi85Mi8xMSA0MC8xMDkvNDAgMzgvMTE0LzM4IDE0LzEwMS8yMlxuXG4gICAgICAgIFRoZSBmaXJzdCB0d28gbGluZXMgYXJlIGV4YW1wbGVzIG9mIGEgMyB2ZXJ0ZXggZmFjZSB3aXRob3V0IGEgdGV4dHVyZSBhcHBsaWVkLlxuICAgICAgICBUaGUgc2Vjb25kIGlzIGFuIGV4YW1wbGUgb2YgYSAzIHZlcnRleCBmYWNlIHdpdGggYSB0ZXh0dXJlIGFwcGxpZWQuXG4gICAgICAgIFRoZSB0aGlyZCBpcyBhbiBleGFtcGxlIG9mIGEgNCB2ZXJ0ZXggZmFjZS4gTm90ZTogYSBmYWNlIGNhbiBjb250YWluIE5cbiAgICAgICAgbnVtYmVyIG9mIHZlcnRpY2VzLlxuXG4gICAgICAgIEVhY2ggbnVtYmVyIHRoYXQgYXBwZWFycyBpbiBvbmUgb2YgdGhlIGdyb3VwcyBpcyBhIDEtYmFzZWQgaW5kZXhcbiAgICAgICAgY29ycmVzcG9uZGluZyB0byBhbiBpdGVtIGZyb20gdGhlIG90aGVyIHNlY3Rpb25zIChtZWFuaW5nIHRoYXQgaW5kZXhpbmdcbiAgICAgICAgc3RhcnRzIGF0IG9uZSBhbmQgKm5vdCogemVybykuXG5cbiAgICAgICAgRm9yIGV4YW1wbGU6XG4gICAgICAgICAgICBgZiAxNi85Mi8xMWAgaXMgc2F5aW5nIHRvXG4gICAgICAgICAgICAgIC0gdGFrZSB0aGUgMTZ0aCBlbGVtZW50IGZyb20gdGhlIFt2XSB2ZXJ0ZXggYXJyYXlcbiAgICAgICAgICAgICAgLSB0YWtlIHRoZSA5Mm5kIGVsZW1lbnQgZnJvbSB0aGUgW3Z0XSB0ZXh0dXJlIGFycmF5XG4gICAgICAgICAgICAgIC0gdGFrZSB0aGUgMTF0aCBlbGVtZW50IGZyb20gdGhlIFt2bl0gbm9ybWFsIGFycmF5XG4gICAgICAgICAgICBhbmQgdG9nZXRoZXIgdGhleSBtYWtlIGEgdW5pcXVlIHZlcnRleC5cbiAgICAgICAgVXNpbmcgYWxsIDMrIHVuaXF1ZSBWZXJ0aWNlcyBmcm9tIHRoZSBmYWNlIGxpbmUgd2lsbCBwcm9kdWNlIGEgcG9seWdvbi5cblxuICAgICAgICBOb3csIHlvdSBjb3VsZCBqdXN0IGdvIHRocm91Z2ggdGhlIE9CSiBmaWxlIGFuZCBjcmVhdGUgYSBuZXcgdmVydGV4IGZvclxuICAgICAgICBlYWNoIGZhY2UgbGluZSBhbmQgV2ViR0wgd2lsbCBkcmF3IHdoYXQgYXBwZWFycyB0byBiZSB0aGUgc2FtZSBtb2RlbC5cbiAgICAgICAgSG93ZXZlciwgdmVydGljZXMgd2lsbCBiZSBvdmVybGFwcGVkIGFuZCBkdXBsaWNhdGVkIGFsbCBvdmVyIHRoZSBwbGFjZS5cblxuICAgICAgICBDb25zaWRlciBhIGN1YmUgaW4gM0Qgc3BhY2UgY2VudGVyZWQgYWJvdXQgdGhlIG9yaWdpbiBhbmQgZWFjaCBzaWRlIGlzXG4gICAgICAgIDIgdW5pdHMgbG9uZy4gVGhlIGZyb250IGZhY2UgKHdpdGggdGhlIHBvc2l0aXZlIFotYXhpcyBwb2ludGluZyB0b3dhcmRzXG4gICAgICAgIHlvdSkgd291bGQgaGF2ZSBhIFRvcCBSaWdodCB2ZXJ0ZXggKGxvb2tpbmcgb3J0aG9nb25hbCB0byBpdHMgbm9ybWFsKVxuICAgICAgICBtYXBwZWQgYXQgKDEsMSwxKSBUaGUgcmlnaHQgZmFjZSB3b3VsZCBoYXZlIGEgVG9wIExlZnQgdmVydGV4IChsb29raW5nXG4gICAgICAgIG9ydGhvZ29uYWwgdG8gaXRzIG5vcm1hbCkgYXQgKDEsMSwxKSBhbmQgdGhlIHRvcCBmYWNlIHdvdWxkIGhhdmUgYSBCb3R0b21cbiAgICAgICAgUmlnaHQgdmVydGV4IChsb29raW5nIG9ydGhvZ29uYWwgdG8gaXRzIG5vcm1hbCkgYXQgKDEsMSwxKS4gRWFjaCBmYWNlXG4gICAgICAgIGhhcyBhIHZlcnRleCBhdCB0aGUgc2FtZSBjb29yZGluYXRlcywgaG93ZXZlciwgdGhyZWUgZGlzdGluY3QgdmVydGljZXNcbiAgICAgICAgd2lsbCBiZSBkcmF3biBhdCB0aGUgc2FtZSBzcG90LlxuXG4gICAgICAgIFRvIHNvbHZlIHRoZSBpc3N1ZSBvZiBkdXBsaWNhdGUgVmVydGljZXMgKHRoZSBgKHZlcnRleCwgW3RleHR1cmVdLCBub3JtYWwpYFxuICAgICAgICBncm91cHMpLCB3aGlsZSBpdGVyYXRpbmcgdGhyb3VnaCB0aGUgZmFjZSBsaW5lcywgd2hlbiBhIGdyb3VwIGlzIGVuY291bnRlcmVkXG4gICAgICAgIHRoZSB3aG9sZSBncm91cCBzdHJpbmcgKCcxNi85Mi8xMScpIGlzIGNoZWNrZWQgdG8gc2VlIGlmIGl0IGV4aXN0cyBpbiB0aGVcbiAgICAgICAgcGFja2VkLmhhc2hpbmRpY2VzIG9iamVjdCwgYW5kIGlmIGl0IGRvZXNuJ3QsIHRoZSBpbmRpY2VzIGl0IHNwZWNpZmllc1xuICAgICAgICBhcmUgdXNlZCB0byBsb29rIHVwIGVhY2ggYXR0cmlidXRlIGluIHRoZSBjb3JyZXNwb25kaW5nIGF0dHJpYnV0ZSBhcnJheXNcbiAgICAgICAgYWxyZWFkeSBjcmVhdGVkLiBUaGUgdmFsdWVzIGFyZSB0aGVuIGNvcGllZCB0byB0aGUgY29ycmVzcG9uZGluZyB1bnBhY2tlZFxuICAgICAgICBhcnJheSAoZmxhdHRlbmVkIHRvIHBsYXkgbmljZSB3aXRoIFdlYkdMJ3MgRUxFTUVOVF9BUlJBWV9CVUZGRVIgaW5kZXhpbmcpLFxuICAgICAgICB0aGUgZ3JvdXAgc3RyaW5nIGlzIGFkZGVkIHRvIHRoZSBoYXNoaW5kaWNlcyBzZXQgYW5kIHRoZSBjdXJyZW50IHVucGFja2VkXG4gICAgICAgIGluZGV4IGlzIHVzZWQgYXMgdGhpcyBoYXNoaW5kaWNlcyB2YWx1ZSBzbyB0aGF0IHRoZSBncm91cCBvZiBlbGVtZW50cyBjYW5cbiAgICAgICAgYmUgcmV1c2VkLiBUaGUgdW5wYWNrZWQgaW5kZXggaXMgaW5jcmVtZW50ZWQuIElmIHRoZSBncm91cCBzdHJpbmcgYWxyZWFkeVxuICAgICAgICBleGlzdHMgaW4gdGhlIGhhc2hpbmRpY2VzIG9iamVjdCwgaXRzIGNvcnJlc3BvbmRpbmcgdmFsdWUgaXMgdGhlIGluZGV4IG9mXG4gICAgICAgIHRoYXQgZ3JvdXAgYW5kIGlzIGFwcGVuZGVkIHRvIHRoZSB1bnBhY2tlZCBpbmRpY2VzIGFycmF5LlxuICAgICAgICovXG4gICAgICAgIGNvbnN0IHZlcnRzID0gW107XG4gICAgICAgIGNvbnN0IHZlcnROb3JtYWxzID0gW107XG4gICAgICAgIGNvbnN0IHRleHR1cmVzID0gW107XG4gICAgICAgIGNvbnN0IG1hdGVyaWFsTmFtZXNCeUluZGV4ID0gW107XG4gICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kaWNlc0J5TmFtZTogTWF0ZXJpYWxOYW1lVG9JbmRleCA9IHt9O1xuICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIHdoYXQgbWF0ZXJpYWwgd2UndmUgc2VlbiBsYXN0XG4gICAgICAgIGxldCBjdXJyZW50TWF0ZXJpYWxJbmRleCA9IC0xO1xuICAgICAgICBsZXQgY3VycmVudE9iamVjdEJ5TWF0ZXJpYWxJbmRleCA9IDA7XG4gICAgICAgIC8vIHVucGFja2luZyBzdHVmZlxuICAgICAgICBjb25zdCB1bnBhY2tlZDogVW5wYWNrZWRBdHRycyA9IHtcbiAgICAgICAgICAgIHZlcnRzOiBbXSxcbiAgICAgICAgICAgIG5vcm1zOiBbXSxcbiAgICAgICAgICAgIHRleHR1cmVzOiBbXSxcbiAgICAgICAgICAgIGhhc2hpbmRpY2VzOiB7fSxcbiAgICAgICAgICAgIGluZGljZXM6IFtbXV0sXG4gICAgICAgICAgICBtYXRlcmlhbEluZGljZXM6IFtdLFxuICAgICAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgVkVSVEVYX1JFID0gL152XFxzLztcbiAgICAgICAgY29uc3QgTk9STUFMX1JFID0gL152blxccy87XG4gICAgICAgIGNvbnN0IFRFWFRVUkVfUkUgPSAvXnZ0XFxzLztcbiAgICAgICAgY29uc3QgRkFDRV9SRSA9IC9eZlxccy87XG4gICAgICAgIGNvbnN0IFdISVRFU1BBQ0VfUkUgPSAvXFxzKy87XG4gICAgICAgIGNvbnN0IFVTRV9NQVRFUklBTF9SRSA9IC9edXNlbXRsLztcblxuICAgICAgICAvLyBhcnJheSBvZiBsaW5lcyBzZXBhcmF0ZWQgYnkgdGhlIG5ld2xpbmVcbiAgICAgICAgY29uc3QgbGluZXMgPSBvYmplY3REYXRhLnNwbGl0KFwiXFxuXCIpO1xuXG4gICAgICAgIGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgICAgIGlmICghbGluZSB8fCBsaW5lLnN0YXJ0c1dpdGgoXCIjXCIpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBlbGVtZW50cyA9IGxpbmUuc3BsaXQoV0hJVEVTUEFDRV9SRSk7XG4gICAgICAgICAgICBlbGVtZW50cy5zaGlmdCgpO1xuXG4gICAgICAgICAgICBpZiAoVkVSVEVYX1JFLnRlc3QobGluZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiB0aGlzIGlzIGEgdmVydGV4XG4gICAgICAgICAgICAgICAgdmVydHMucHVzaCguLi5lbGVtZW50cyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE5PUk1BTF9SRS50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyBhIHZlcnRleCBub3JtYWxcbiAgICAgICAgICAgICAgICB2ZXJ0Tm9ybWFscy5wdXNoKC4uLmVsZW1lbnRzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoVEVYVFVSRV9SRS50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgbGV0IGNvb3JkcyA9IGVsZW1lbnRzO1xuICAgICAgICAgICAgICAgIC8vIGJ5IGRlZmF1bHQsIHRoZSBsb2FkZXIgd2lsbCBvbmx5IGxvb2sgYXQgdGhlIFUgYW5kIFZcbiAgICAgICAgICAgICAgICAvLyBjb29yZGluYXRlcyBvZiB0aGUgdnQgZGVjbGFyYXRpb24uIFNvLCB0aGlzIHRydW5jYXRlcyB0aGVcbiAgICAgICAgICAgICAgICAvLyBlbGVtZW50cyB0byBvbmx5IHRob3NlIDIgdmFsdWVzLiBJZiBXIHRleHR1cmUgY29vcmRpbmF0ZVxuICAgICAgICAgICAgICAgIC8vIHN1cHBvcnQgaXMgZW5hYmxlZCwgdGhlbiB0aGUgdGV4dHVyZSBjb29yZGluYXRlIGlzXG4gICAgICAgICAgICAgICAgLy8gZXhwZWN0ZWQgdG8gaGF2ZSB0aHJlZSB2YWx1ZXMgaW4gaXQuXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCA+IDIgJiYgIW9wdGlvbnMuZW5hYmxlV1RleHR1cmVDb29yZCkge1xuICAgICAgICAgICAgICAgICAgICBjb29yZHMgPSBlbGVtZW50cy5zbGljZSgwLCAyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnRzLmxlbmd0aCA9PT0gMiAmJiBvcHRpb25zLmVuYWJsZVdUZXh0dXJlQ29vcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgZm9yIHNvbWUgcmVhc29uIFcgdGV4dHVyZSBjb29yZGluYXRlIHN1cHBvcnQgaXMgZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICAvLyBhbmQgb25seSB0aGUgVSBhbmQgViBjb29yZGluYXRlcyBhcmUgZ2l2ZW4sIHRoZW4gd2Ugc3VwcGx5XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBkZWZhdWx0IHZhbHVlIG9mIDAgc28gdGhhdCB0aGUgc3RyaWRlIGxlbmd0aCBpcyBjb3JyZWN0XG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIHRleHR1cmVzIGFyZSB1bnBhY2tlZCBiZWxvdy5cbiAgICAgICAgICAgICAgICAgICAgY29vcmRzLnB1c2goXCIwXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0ZXh0dXJlcy5wdXNoKC4uLmNvb3Jkcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFVTRV9NQVRFUklBTF9SRS50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxOYW1lID0gZWxlbWVudHNbMF07XG5cbiAgICAgICAgICAgICAgICAvLyBjaGVjayB0byBzZWUgaWYgd2UndmUgZXZlciBzZWVuIGl0IGJlZm9yZVxuICAgICAgICAgICAgICAgIGlmICghKG1hdGVyaWFsTmFtZSBpbiBtYXRlcmlhbEluZGljZXNCeU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5ldyBtYXRlcmlhbCB3ZSd2ZSBuZXZlciBzZWVuXG4gICAgICAgICAgICAgICAgICAgIG1hdGVyaWFsTmFtZXNCeUluZGV4LnB1c2gobWF0ZXJpYWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgbWF0ZXJpYWxJbmRpY2VzQnlOYW1lW21hdGVyaWFsTmFtZV0gPSBtYXRlcmlhbE5hbWVzQnlJbmRleC5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAvLyBwdXNoIG5ldyBhcnJheSBpbnRvIGluZGljZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxyZWFkeSBjb250YWlucyBhbiBhcnJheSBhdCBpbmRleCB6ZXJvLCBkb24ndCBhZGRcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGVyaWFsSW5kaWNlc0J5TmFtZVttYXRlcmlhbE5hbWVdID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQuaW5kaWNlcy5wdXNoKFtdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIHRoZSBjdXJyZW50IG1hdGVyaWFsIGluZGV4XG4gICAgICAgICAgICAgICAgY3VycmVudE1hdGVyaWFsSW5kZXggPSBtYXRlcmlhbEluZGljZXNCeU5hbWVbbWF0ZXJpYWxOYW1lXTtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgY3VycmVudCBpbmRleCBhcnJheVxuICAgICAgICAgICAgICAgIGN1cnJlbnRPYmplY3RCeU1hdGVyaWFsSW5kZXggPSBjdXJyZW50TWF0ZXJpYWxJbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoRkFDRV9SRS50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyBhIGZhY2VcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgIHNwbGl0IHRoaXMgZmFjZSBpbnRvIGFuIGFycmF5IG9mIFZlcnRleCBncm91cHNcbiAgICAgICAgICAgICAgICBmb3IgZXhhbXBsZTpcbiAgICAgICAgICAgICAgICAgICBmIDE2LzkyLzExIDE0LzEwMS8yMiAxLzY5LzFcbiAgICAgICAgICAgICAgICBiZWNvbWVzOlxuICAgICAgICAgICAgICAgICAgWycxNi85Mi8xMScsICcxNC8xMDEvMjInLCAnMS82OS8xJ107XG4gICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgIGNvbnN0IHRyaWFuZ2xlcyA9IHRyaWFuZ3VsYXRlKGVsZW1lbnRzKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRyaWFuZ2xlIG9mIHRyaWFuZ2xlcykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMCwgZWxlTGVuID0gdHJpYW5nbGUubGVuZ3RoOyBqIDwgZWxlTGVuOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc2ggPSB0cmlhbmdsZVtqXSArIFwiLFwiICsgY3VycmVudE1hdGVyaWFsSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzaCBpbiB1bnBhY2tlZC5oYXNoaW5kaWNlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLmluZGljZXNbY3VycmVudE9iamVjdEJ5TWF0ZXJpYWxJbmRleF0ucHVzaCh1bnBhY2tlZC5oYXNoaW5kaWNlc1toYXNoXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICBFYWNoIGVsZW1lbnQgb2YgdGhlIGZhY2UgbGluZSBhcnJheSBpcyBhIFZlcnRleCB3aGljaCBoYXMgaXRzXG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzIGRlbGltaXRlZCBieSBhIGZvcndhcmQgc2xhc2guIFRoaXMgd2lsbCBzZXBhcmF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgZWFjaCBhdHRyaWJ1dGUgaW50byBhbm90aGVyIGFycmF5OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICcxOS85Mi8xMSdcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlY29tZXM6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVmVydGV4ID0gWycxOScsICc5MicsICcxMSddO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBWZXJ0ZXhbMF0gaXMgdGhlIHZlcnRleCBpbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZlcnRleFsxXSBpcyB0aGUgdGV4dHVyZSBpbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZlcnRleFsyXSBpcyB0aGUgbm9ybWFsIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICAgVGhpbmsgb2YgZmFjZXMgaGF2aW5nIFZlcnRpY2VzIHdoaWNoIGFyZSBjb21wcmlzZWQgb2YgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlcyBsb2NhdGlvbiAodiksIHRleHR1cmUgKHZ0KSwgYW5kIG5vcm1hbCAodm4pLlxuICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVydGV4ID0gdHJpYW5nbGVbal0uc3BsaXQoXCIvXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0J3MgcG9zc2libGUgZm9yIGZhY2VzIHRvIG9ubHkgc3BlY2lmeSB0aGUgdmVydGV4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBub3JtYWwuIEluIHRoaXMgY2FzZSwgdmVydGV4IHdpbGwgb25seSBoYXZlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYSBsZW5ndGggb2YgMiBhbmQgbm90IDMgYW5kIHRoZSBub3JtYWwgd2lsbCBiZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZWNvbmQgaXRlbSBpbiB0aGUgbGlzdCB3aXRoIGFuIGluZGV4IG9mIDEuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9ybWFsSW5kZXggPSB2ZXJ0ZXgubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSB2ZXJ0cywgdGV4dHVyZXMsIGFuZCB2ZXJ0Tm9ybWFscyBhcnJheXMgZWFjaCBjb250YWluIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICBmbGF0dGVuZCBhcnJheSBvZiBjb29yZGluYXRlcy5cblxuICAgICAgICAgICAgICAgICAgICAgICAgIEJlY2F1c2UgaXQgZ2V0cyBjb25mdXNpbmcgYnkgcmVmZXJyaW5nIHRvIFZlcnRleCBhbmQgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRleCAoYm90aCBhcmUgZGlmZmVyZW50IGluIG15IGRlc2NyaXB0aW9ucykgSSB3aWxsIGV4cGxhaW5cbiAgICAgICAgICAgICAgICAgICAgICAgICB3aGF0J3MgZ29pbmcgb24gdXNpbmcgdGhlIHZlcnRleE5vcm1hbHMgYXJyYXk6XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0ZXhbMl0gd2lsbCBjb250YWluIHRoZSBvbmUtYmFzZWQgaW5kZXggb2YgdGhlIHZlcnRleE5vcm1hbHNcbiAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uICh2bikuIE9uZSBpcyBzdWJ0cmFjdGVkIGZyb20gdGhpcyBpbmRleCBudW1iZXIgdG8gcGxheVxuICAgICAgICAgICAgICAgICAgICAgICAgIG5pY2Ugd2l0aCBqYXZhc2NyaXB0J3MgemVyby1iYXNlZCBhcnJheSBpbmRleGluZy5cblxuICAgICAgICAgICAgICAgICAgICAgICAgIEJlY2F1c2UgdmVydGV4Tm9ybWFsIGlzIGEgZmxhdHRlbmVkIGFycmF5IG9mIHgsIHksIHogdmFsdWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHNpbXBsZSBwb2ludGVyIGFyaXRobWV0aWMgaXMgdXNlZCB0byBza2lwIHRvIHRoZSBzdGFydCBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0ZXhOb3JtYWwsIHRoZW4gdGhlIG9mZnNldCBpcyBhZGRlZCB0byBnZXQgdGhlIGNvcnJlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6ICswIGlzIHgsICsxIGlzIHksICsyIGlzIHouXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICBUaGlzIHNhbWUgcHJvY2VzcyBpcyByZXBlYXRlZCBmb3IgdmVydHMgYW5kIHRleHR1cmVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmVydGV4IHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudmVydHMucHVzaCgrdmVydHNbKCt2ZXJ0ZXhbMF0gLSAxKSAqIDMgKyAwXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudmVydHMucHVzaCgrdmVydHNbKCt2ZXJ0ZXhbMF0gLSAxKSAqIDMgKyAxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudmVydHMucHVzaCgrdmVydHNbKCt2ZXJ0ZXhbMF0gLSAxKSAqIDMgKyAyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmVydGV4IHRleHR1cmVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHR1cmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHJpZGUgPSBvcHRpb25zLmVuYWJsZVdUZXh0dXJlQ29vcmQgPyAzIDogMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudGV4dHVyZXMucHVzaCgrdGV4dHVyZXNbKCt2ZXJ0ZXhbMV0gLSAxKSAqIHN0cmlkZSArIDBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudGV4dHVyZXMucHVzaCgrdGV4dHVyZXNbKCt2ZXJ0ZXhbMV0gLSAxKSAqIHN0cmlkZSArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZW5hYmxlV1RleHR1cmVDb29yZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudGV4dHVyZXMucHVzaCgrdGV4dHVyZXNbKCt2ZXJ0ZXhbMV0gLSAxKSAqIHN0cmlkZSArIDJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWZXJ0ZXggbm9ybWFsc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLm5vcm1zLnB1c2goK3ZlcnROb3JtYWxzWygrdmVydGV4W25vcm1hbEluZGV4XSAtIDEpICogMyArIDBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC5ub3Jtcy5wdXNoKCt2ZXJ0Tm9ybWFsc1soK3ZlcnRleFtub3JtYWxJbmRleF0gLSAxKSAqIDMgKyAxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQubm9ybXMucHVzaCgrdmVydE5vcm1hbHNbKCt2ZXJ0ZXhbbm9ybWFsSW5kZXhdIC0gMSkgKiAzICsgMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFZlcnRleCBtYXRlcmlhbCBpbmRpY2VzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQubWF0ZXJpYWxJbmRpY2VzLnB1c2goY3VycmVudE1hdGVyaWFsSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkZCB0aGUgbmV3bHkgY3JlYXRlZCBWZXJ0ZXggdG8gdGhlIGxpc3Qgb2YgaW5kaWNlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLmhhc2hpbmRpY2VzW2hhc2hdID0gdW5wYWNrZWQuaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQuaW5kaWNlc1tjdXJyZW50T2JqZWN0QnlNYXRlcmlhbEluZGV4XS5wdXNoKHVucGFja2VkLmhhc2hpbmRpY2VzW2hhc2hdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbmNyZW1lbnQgdGhlIGNvdW50ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC5pbmRleCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudmVydGljZXMgPSB1bnBhY2tlZC52ZXJ0cztcbiAgICAgICAgdGhpcy52ZXJ0ZXhOb3JtYWxzID0gdW5wYWNrZWQubm9ybXM7XG4gICAgICAgIHRoaXMudGV4dHVyZXMgPSB1bnBhY2tlZC50ZXh0dXJlcztcbiAgICAgICAgdGhpcy52ZXJ0ZXhNYXRlcmlhbEluZGljZXMgPSB1bnBhY2tlZC5tYXRlcmlhbEluZGljZXM7XG4gICAgICAgIHRoaXMuaW5kaWNlcyA9IHVucGFja2VkLmluZGljZXNbY3VycmVudE9iamVjdEJ5TWF0ZXJpYWxJbmRleF07XG4gICAgICAgIHRoaXMuaW5kaWNlc1Blck1hdGVyaWFsID0gdW5wYWNrZWQuaW5kaWNlcztcblxuICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXMgPSBtYXRlcmlhbE5hbWVzQnlJbmRleDtcbiAgICAgICAgdGhpcy5tYXRlcmlhbEluZGljZXMgPSBtYXRlcmlhbEluZGljZXNCeU5hbWU7XG4gICAgICAgIHRoaXMubWF0ZXJpYWxzQnlJbmRleCA9IHt9O1xuXG4gICAgICAgIGlmIChvcHRpb25zLmNhbGNUYW5nZW50c0FuZEJpdGFuZ2VudHMpIHtcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGFuZ2VudHNBbmRCaXRhbmdlbnRzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSB0YW5nZW50cyBhbmQgYml0YW5nZW50cyBvZiB0aGUgbWVzaCB0aGF0IGZvcm1zIGFuIG9ydGhvZ29uYWwgYmFzaXMgdG9nZXRoZXIgd2l0aCB0aGVcbiAgICAgKiBub3JtYWwgaW4gdGhlIGRpcmVjdGlvbiBvZiB0aGUgdGV4dHVyZSBjb29yZGluYXRlcy4gVGhlc2UgYXJlIHVzZWZ1bCBmb3Igc2V0dGluZyB1cCB0aGUgVEJOIG1hdHJpeFxuICAgICAqIHdoZW4gZGlzdG9ydGluZyB0aGUgbm9ybWFscyB0aHJvdWdoIG5vcm1hbCBtYXBzLlxuICAgICAqIE1ldGhvZCBkZXJpdmVkIGZyb206IGh0dHA6Ly93d3cub3BlbmdsLXR1dG9yaWFsLm9yZy9pbnRlcm1lZGlhdGUtdHV0b3JpYWxzL3R1dG9yaWFsLTEzLW5vcm1hbC1tYXBwaW5nL1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgcmVxdWlyZXMgdGhlIG5vcm1hbHMgYW5kIHRleHR1cmUgY29vcmRpbmF0ZXMgdG8gYmUgcGFyc2VkIGFuZCBzZXQgdXAgY29ycmVjdGx5LlxuICAgICAqIEFkZHMgdGhlIHRhbmdlbnRzIGFuZCBiaXRhbmdlbnRzIGFzIG1lbWJlcnMgb2YgdGhlIGNsYXNzIGluc3RhbmNlLlxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVRhbmdlbnRzQW5kQml0YW5nZW50cygpIHtcbiAgICAgICAgY29uc29sZS5hc3NlcnQoXG4gICAgICAgICAgICAhIShcbiAgICAgICAgICAgICAgICB0aGlzLnZlcnRpY2VzICYmXG4gICAgICAgICAgICAgICAgdGhpcy52ZXJ0aWNlcy5sZW5ndGggJiZcbiAgICAgICAgICAgICAgICB0aGlzLnZlcnRleE5vcm1hbHMgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnZlcnRleE5vcm1hbHMubGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgdGhpcy50ZXh0dXJlcyAmJlxuICAgICAgICAgICAgICAgIHRoaXMudGV4dHVyZXMubGVuZ3RoXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgXCJNaXNzaW5nIGF0dHJpYnV0ZXMgZm9yIGNhbGN1bGF0aW5nIHRhbmdlbnRzIGFuZCBiaXRhbmdlbnRzXCIsXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgdW5wYWNrZWQgPSB7XG4gICAgICAgICAgICB0YW5nZW50czogWy4uLm5ldyBBcnJheSh0aGlzLnZlcnRpY2VzLmxlbmd0aCldLm1hcChfID0+IDApLFxuICAgICAgICAgICAgYml0YW5nZW50czogWy4uLm5ldyBBcnJheSh0aGlzLnZlcnRpY2VzLmxlbmd0aCldLm1hcChfID0+IDApLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIExvb3AgdGhyb3VnaCBhbGwgZmFjZXMgaW4gdGhlIHdob2xlIG1lc2hcbiAgICAgICAgY29uc3QgaW5kaWNlcyA9IHRoaXMuaW5kaWNlcztcbiAgICAgICAgY29uc3QgdmVydGljZXMgPSB0aGlzLnZlcnRpY2VzO1xuICAgICAgICBjb25zdCBub3JtYWxzID0gdGhpcy52ZXJ0ZXhOb3JtYWxzO1xuICAgICAgICBjb25zdCB1dnMgPSB0aGlzLnRleHR1cmVzO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kaWNlcy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICAgICAgY29uc3QgaTAgPSBpbmRpY2VzW2kgKyAwXTtcbiAgICAgICAgICAgIGNvbnN0IGkxID0gaW5kaWNlc1tpICsgMV07XG4gICAgICAgICAgICBjb25zdCBpMiA9IGluZGljZXNbaSArIDJdO1xuXG4gICAgICAgICAgICBjb25zdCB4X3YwID0gdmVydGljZXNbaTAgKiAzICsgMF07XG4gICAgICAgICAgICBjb25zdCB5X3YwID0gdmVydGljZXNbaTAgKiAzICsgMV07XG4gICAgICAgICAgICBjb25zdCB6X3YwID0gdmVydGljZXNbaTAgKiAzICsgMl07XG5cbiAgICAgICAgICAgIGNvbnN0IHhfdXYwID0gdXZzW2kwICogMiArIDBdO1xuICAgICAgICAgICAgY29uc3QgeV91djAgPSB1dnNbaTAgKiAyICsgMV07XG5cbiAgICAgICAgICAgIGNvbnN0IHhfdjEgPSB2ZXJ0aWNlc1tpMSAqIDMgKyAwXTtcbiAgICAgICAgICAgIGNvbnN0IHlfdjEgPSB2ZXJ0aWNlc1tpMSAqIDMgKyAxXTtcbiAgICAgICAgICAgIGNvbnN0IHpfdjEgPSB2ZXJ0aWNlc1tpMSAqIDMgKyAyXTtcblxuICAgICAgICAgICAgY29uc3QgeF91djEgPSB1dnNbaTEgKiAyICsgMF07XG4gICAgICAgICAgICBjb25zdCB5X3V2MSA9IHV2c1tpMSAqIDIgKyAxXTtcblxuICAgICAgICAgICAgY29uc3QgeF92MiA9IHZlcnRpY2VzW2kyICogMyArIDBdO1xuICAgICAgICAgICAgY29uc3QgeV92MiA9IHZlcnRpY2VzW2kyICogMyArIDFdO1xuICAgICAgICAgICAgY29uc3Qgel92MiA9IHZlcnRpY2VzW2kyICogMyArIDJdO1xuXG4gICAgICAgICAgICBjb25zdCB4X3V2MiA9IHV2c1tpMiAqIDIgKyAwXTtcbiAgICAgICAgICAgIGNvbnN0IHlfdXYyID0gdXZzW2kyICogMiArIDFdO1xuXG4gICAgICAgICAgICBjb25zdCB4X2RlbHRhUG9zMSA9IHhfdjEgLSB4X3YwO1xuICAgICAgICAgICAgY29uc3QgeV9kZWx0YVBvczEgPSB5X3YxIC0geV92MDtcbiAgICAgICAgICAgIGNvbnN0IHpfZGVsdGFQb3MxID0gel92MSAtIHpfdjA7XG5cbiAgICAgICAgICAgIGNvbnN0IHhfZGVsdGFQb3MyID0geF92MiAtIHhfdjA7XG4gICAgICAgICAgICBjb25zdCB5X2RlbHRhUG9zMiA9IHlfdjIgLSB5X3YwO1xuICAgICAgICAgICAgY29uc3Qgel9kZWx0YVBvczIgPSB6X3YyIC0gel92MDtcblxuICAgICAgICAgICAgY29uc3QgeF91dkRlbHRhUG9zMSA9IHhfdXYxIC0geF91djA7XG4gICAgICAgICAgICBjb25zdCB5X3V2RGVsdGFQb3MxID0geV91djEgLSB5X3V2MDtcblxuICAgICAgICAgICAgY29uc3QgeF91dkRlbHRhUG9zMiA9IHhfdXYyIC0geF91djA7XG4gICAgICAgICAgICBjb25zdCB5X3V2RGVsdGFQb3MyID0geV91djIgLSB5X3V2MDtcblxuICAgICAgICAgICAgY29uc3QgckludiA9IHhfdXZEZWx0YVBvczEgKiB5X3V2RGVsdGFQb3MyIC0geV91dkRlbHRhUG9zMSAqIHhfdXZEZWx0YVBvczI7XG4gICAgICAgICAgICBjb25zdCByID0gMS4wIC8gTWF0aC5hYnMockludiA8IDAuMDAwMSA/IDEuMCA6IHJJbnYpO1xuXG4gICAgICAgICAgICAvLyBUYW5nZW50XG4gICAgICAgICAgICBjb25zdCB4X3RhbmdlbnQgPSAoeF9kZWx0YVBvczEgKiB5X3V2RGVsdGFQb3MyIC0geF9kZWx0YVBvczIgKiB5X3V2RGVsdGFQb3MxKSAqIHI7XG4gICAgICAgICAgICBjb25zdCB5X3RhbmdlbnQgPSAoeV9kZWx0YVBvczEgKiB5X3V2RGVsdGFQb3MyIC0geV9kZWx0YVBvczIgKiB5X3V2RGVsdGFQb3MxKSAqIHI7XG4gICAgICAgICAgICBjb25zdCB6X3RhbmdlbnQgPSAoel9kZWx0YVBvczEgKiB5X3V2RGVsdGFQb3MyIC0gel9kZWx0YVBvczIgKiB5X3V2RGVsdGFQb3MxKSAqIHI7XG5cbiAgICAgICAgICAgIC8vIEJpdGFuZ2VudFxuICAgICAgICAgICAgY29uc3QgeF9iaXRhbmdlbnQgPSAoeF9kZWx0YVBvczIgKiB4X3V2RGVsdGFQb3MxIC0geF9kZWx0YVBvczEgKiB4X3V2RGVsdGFQb3MyKSAqIHI7XG4gICAgICAgICAgICBjb25zdCB5X2JpdGFuZ2VudCA9ICh5X2RlbHRhUG9zMiAqIHhfdXZEZWx0YVBvczEgLSB5X2RlbHRhUG9zMSAqIHhfdXZEZWx0YVBvczIpICogcjtcbiAgICAgICAgICAgIGNvbnN0IHpfYml0YW5nZW50ID0gKHpfZGVsdGFQb3MyICogeF91dkRlbHRhUG9zMSAtIHpfZGVsdGFQb3MxICogeF91dkRlbHRhUG9zMikgKiByO1xuXG4gICAgICAgICAgICAvLyBHcmFtLVNjaG1pZHQgb3J0aG9nb25hbGl6ZVxuICAgICAgICAgICAgLy90ID0gZ2xtOjpub3JtYWxpemUodCAtIG4gKiBnbG06OiBkb3QobiwgdCkpO1xuICAgICAgICAgICAgY29uc3QgeF9uMCA9IG5vcm1hbHNbaTAgKiAzICsgMF07XG4gICAgICAgICAgICBjb25zdCB5X24wID0gbm9ybWFsc1tpMCAqIDMgKyAxXTtcbiAgICAgICAgICAgIGNvbnN0IHpfbjAgPSBub3JtYWxzW2kwICogMyArIDJdO1xuXG4gICAgICAgICAgICBjb25zdCB4X24xID0gbm9ybWFsc1tpMSAqIDMgKyAwXTtcbiAgICAgICAgICAgIGNvbnN0IHlfbjEgPSBub3JtYWxzW2kxICogMyArIDFdO1xuICAgICAgICAgICAgY29uc3Qgel9uMSA9IG5vcm1hbHNbaTEgKiAzICsgMl07XG5cbiAgICAgICAgICAgIGNvbnN0IHhfbjIgPSBub3JtYWxzW2kyICogMyArIDBdO1xuICAgICAgICAgICAgY29uc3QgeV9uMiA9IG5vcm1hbHNbaTIgKiAzICsgMV07XG4gICAgICAgICAgICBjb25zdCB6X24yID0gbm9ybWFsc1tpMiAqIDMgKyAyXTtcblxuICAgICAgICAgICAgLy8gVGFuZ2VudFxuICAgICAgICAgICAgY29uc3QgbjBfZG90X3QgPSB4X3RhbmdlbnQgKiB4X24wICsgeV90YW5nZW50ICogeV9uMCArIHpfdGFuZ2VudCAqIHpfbjA7XG4gICAgICAgICAgICBjb25zdCBuMV9kb3RfdCA9IHhfdGFuZ2VudCAqIHhfbjEgKyB5X3RhbmdlbnQgKiB5X24xICsgel90YW5nZW50ICogel9uMTtcbiAgICAgICAgICAgIGNvbnN0IG4yX2RvdF90ID0geF90YW5nZW50ICogeF9uMiArIHlfdGFuZ2VudCAqIHlfbjIgKyB6X3RhbmdlbnQgKiB6X24yO1xuXG4gICAgICAgICAgICBjb25zdCB4X3Jlc1RhbmdlbnQwID0geF90YW5nZW50IC0geF9uMCAqIG4wX2RvdF90O1xuICAgICAgICAgICAgY29uc3QgeV9yZXNUYW5nZW50MCA9IHlfdGFuZ2VudCAtIHlfbjAgKiBuMF9kb3RfdDtcbiAgICAgICAgICAgIGNvbnN0IHpfcmVzVGFuZ2VudDAgPSB6X3RhbmdlbnQgLSB6X24wICogbjBfZG90X3Q7XG5cbiAgICAgICAgICAgIGNvbnN0IHhfcmVzVGFuZ2VudDEgPSB4X3RhbmdlbnQgLSB4X24xICogbjFfZG90X3Q7XG4gICAgICAgICAgICBjb25zdCB5X3Jlc1RhbmdlbnQxID0geV90YW5nZW50IC0geV9uMSAqIG4xX2RvdF90O1xuICAgICAgICAgICAgY29uc3Qgel9yZXNUYW5nZW50MSA9IHpfdGFuZ2VudCAtIHpfbjEgKiBuMV9kb3RfdDtcblxuICAgICAgICAgICAgY29uc3QgeF9yZXNUYW5nZW50MiA9IHhfdGFuZ2VudCAtIHhfbjIgKiBuMl9kb3RfdDtcbiAgICAgICAgICAgIGNvbnN0IHlfcmVzVGFuZ2VudDIgPSB5X3RhbmdlbnQgLSB5X24yICogbjJfZG90X3Q7XG4gICAgICAgICAgICBjb25zdCB6X3Jlc1RhbmdlbnQyID0gel90YW5nZW50IC0gel9uMiAqIG4yX2RvdF90O1xuXG4gICAgICAgICAgICBjb25zdCBtYWdUYW5nZW50MCA9IE1hdGguc3FydChcbiAgICAgICAgICAgICAgICB4X3Jlc1RhbmdlbnQwICogeF9yZXNUYW5nZW50MCArIHlfcmVzVGFuZ2VudDAgKiB5X3Jlc1RhbmdlbnQwICsgel9yZXNUYW5nZW50MCAqIHpfcmVzVGFuZ2VudDAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3QgbWFnVGFuZ2VudDEgPSBNYXRoLnNxcnQoXG4gICAgICAgICAgICAgICAgeF9yZXNUYW5nZW50MSAqIHhfcmVzVGFuZ2VudDEgKyB5X3Jlc1RhbmdlbnQxICogeV9yZXNUYW5nZW50MSArIHpfcmVzVGFuZ2VudDEgKiB6X3Jlc1RhbmdlbnQxLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IG1hZ1RhbmdlbnQyID0gTWF0aC5zcXJ0KFxuICAgICAgICAgICAgICAgIHhfcmVzVGFuZ2VudDIgKiB4X3Jlc1RhbmdlbnQyICsgeV9yZXNUYW5nZW50MiAqIHlfcmVzVGFuZ2VudDIgKyB6X3Jlc1RhbmdlbnQyICogel9yZXNUYW5nZW50MixcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8vIEJpdGFuZ2VudFxuICAgICAgICAgICAgY29uc3QgbjBfZG90X2J0ID0geF9iaXRhbmdlbnQgKiB4X24wICsgeV9iaXRhbmdlbnQgKiB5X24wICsgel9iaXRhbmdlbnQgKiB6X24wO1xuICAgICAgICAgICAgY29uc3QgbjFfZG90X2J0ID0geF9iaXRhbmdlbnQgKiB4X24xICsgeV9iaXRhbmdlbnQgKiB5X24xICsgel9iaXRhbmdlbnQgKiB6X24xO1xuICAgICAgICAgICAgY29uc3QgbjJfZG90X2J0ID0geF9iaXRhbmdlbnQgKiB4X24yICsgeV9iaXRhbmdlbnQgKiB5X24yICsgel9iaXRhbmdlbnQgKiB6X24yO1xuXG4gICAgICAgICAgICBjb25zdCB4X3Jlc0JpdGFuZ2VudDAgPSB4X2JpdGFuZ2VudCAtIHhfbjAgKiBuMF9kb3RfYnQ7XG4gICAgICAgICAgICBjb25zdCB5X3Jlc0JpdGFuZ2VudDAgPSB5X2JpdGFuZ2VudCAtIHlfbjAgKiBuMF9kb3RfYnQ7XG4gICAgICAgICAgICBjb25zdCB6X3Jlc0JpdGFuZ2VudDAgPSB6X2JpdGFuZ2VudCAtIHpfbjAgKiBuMF9kb3RfYnQ7XG5cbiAgICAgICAgICAgIGNvbnN0IHhfcmVzQml0YW5nZW50MSA9IHhfYml0YW5nZW50IC0geF9uMSAqIG4xX2RvdF9idDtcbiAgICAgICAgICAgIGNvbnN0IHlfcmVzQml0YW5nZW50MSA9IHlfYml0YW5nZW50IC0geV9uMSAqIG4xX2RvdF9idDtcbiAgICAgICAgICAgIGNvbnN0IHpfcmVzQml0YW5nZW50MSA9IHpfYml0YW5nZW50IC0gel9uMSAqIG4xX2RvdF9idDtcblxuICAgICAgICAgICAgY29uc3QgeF9yZXNCaXRhbmdlbnQyID0geF9iaXRhbmdlbnQgLSB4X24yICogbjJfZG90X2J0O1xuICAgICAgICAgICAgY29uc3QgeV9yZXNCaXRhbmdlbnQyID0geV9iaXRhbmdlbnQgLSB5X24yICogbjJfZG90X2J0O1xuICAgICAgICAgICAgY29uc3Qgel9yZXNCaXRhbmdlbnQyID0gel9iaXRhbmdlbnQgLSB6X24yICogbjJfZG90X2J0O1xuXG4gICAgICAgICAgICBjb25zdCBtYWdCaXRhbmdlbnQwID0gTWF0aC5zcXJ0KFxuICAgICAgICAgICAgICAgIHhfcmVzQml0YW5nZW50MCAqIHhfcmVzQml0YW5nZW50MCArXG4gICAgICAgICAgICAgICAgICAgIHlfcmVzQml0YW5nZW50MCAqIHlfcmVzQml0YW5nZW50MCArXG4gICAgICAgICAgICAgICAgICAgIHpfcmVzQml0YW5nZW50MCAqIHpfcmVzQml0YW5nZW50MCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBtYWdCaXRhbmdlbnQxID0gTWF0aC5zcXJ0KFxuICAgICAgICAgICAgICAgIHhfcmVzQml0YW5nZW50MSAqIHhfcmVzQml0YW5nZW50MSArXG4gICAgICAgICAgICAgICAgICAgIHlfcmVzQml0YW5nZW50MSAqIHlfcmVzQml0YW5nZW50MSArXG4gICAgICAgICAgICAgICAgICAgIHpfcmVzQml0YW5nZW50MSAqIHpfcmVzQml0YW5nZW50MSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBtYWdCaXRhbmdlbnQyID0gTWF0aC5zcXJ0KFxuICAgICAgICAgICAgICAgIHhfcmVzQml0YW5nZW50MiAqIHhfcmVzQml0YW5nZW50MiArXG4gICAgICAgICAgICAgICAgICAgIHlfcmVzQml0YW5nZW50MiAqIHlfcmVzQml0YW5nZW50MiArXG4gICAgICAgICAgICAgICAgICAgIHpfcmVzQml0YW5nZW50MiAqIHpfcmVzQml0YW5nZW50MixcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHVucGFja2VkLnRhbmdlbnRzW2kwICogMyArIDBdICs9IHhfcmVzVGFuZ2VudDAgLyBtYWdUYW5nZW50MDtcbiAgICAgICAgICAgIHVucGFja2VkLnRhbmdlbnRzW2kwICogMyArIDFdICs9IHlfcmVzVGFuZ2VudDAgLyBtYWdUYW5nZW50MDtcbiAgICAgICAgICAgIHVucGFja2VkLnRhbmdlbnRzW2kwICogMyArIDJdICs9IHpfcmVzVGFuZ2VudDAgLyBtYWdUYW5nZW50MDtcblxuICAgICAgICAgICAgdW5wYWNrZWQudGFuZ2VudHNbaTEgKiAzICsgMF0gKz0geF9yZXNUYW5nZW50MSAvIG1hZ1RhbmdlbnQxO1xuICAgICAgICAgICAgdW5wYWNrZWQudGFuZ2VudHNbaTEgKiAzICsgMV0gKz0geV9yZXNUYW5nZW50MSAvIG1hZ1RhbmdlbnQxO1xuICAgICAgICAgICAgdW5wYWNrZWQudGFuZ2VudHNbaTEgKiAzICsgMl0gKz0gel9yZXNUYW5nZW50MSAvIG1hZ1RhbmdlbnQxO1xuXG4gICAgICAgICAgICB1bnBhY2tlZC50YW5nZW50c1tpMiAqIDMgKyAwXSArPSB4X3Jlc1RhbmdlbnQyIC8gbWFnVGFuZ2VudDI7XG4gICAgICAgICAgICB1bnBhY2tlZC50YW5nZW50c1tpMiAqIDMgKyAxXSArPSB5X3Jlc1RhbmdlbnQyIC8gbWFnVGFuZ2VudDI7XG4gICAgICAgICAgICB1bnBhY2tlZC50YW5nZW50c1tpMiAqIDMgKyAyXSArPSB6X3Jlc1RhbmdlbnQyIC8gbWFnVGFuZ2VudDI7XG5cbiAgICAgICAgICAgIHVucGFja2VkLmJpdGFuZ2VudHNbaTAgKiAzICsgMF0gKz0geF9yZXNCaXRhbmdlbnQwIC8gbWFnQml0YW5nZW50MDtcbiAgICAgICAgICAgIHVucGFja2VkLmJpdGFuZ2VudHNbaTAgKiAzICsgMV0gKz0geV9yZXNCaXRhbmdlbnQwIC8gbWFnQml0YW5nZW50MDtcbiAgICAgICAgICAgIHVucGFja2VkLmJpdGFuZ2VudHNbaTAgKiAzICsgMl0gKz0gel9yZXNCaXRhbmdlbnQwIC8gbWFnQml0YW5nZW50MDtcblxuICAgICAgICAgICAgdW5wYWNrZWQuYml0YW5nZW50c1tpMSAqIDMgKyAwXSArPSB4X3Jlc0JpdGFuZ2VudDEgLyBtYWdCaXRhbmdlbnQxO1xuICAgICAgICAgICAgdW5wYWNrZWQuYml0YW5nZW50c1tpMSAqIDMgKyAxXSArPSB5X3Jlc0JpdGFuZ2VudDEgLyBtYWdCaXRhbmdlbnQxO1xuICAgICAgICAgICAgdW5wYWNrZWQuYml0YW5nZW50c1tpMSAqIDMgKyAyXSArPSB6X3Jlc0JpdGFuZ2VudDEgLyBtYWdCaXRhbmdlbnQxO1xuXG4gICAgICAgICAgICB1bnBhY2tlZC5iaXRhbmdlbnRzW2kyICogMyArIDBdICs9IHhfcmVzQml0YW5nZW50MiAvIG1hZ0JpdGFuZ2VudDI7XG4gICAgICAgICAgICB1bnBhY2tlZC5iaXRhbmdlbnRzW2kyICogMyArIDFdICs9IHlfcmVzQml0YW5nZW50MiAvIG1hZ0JpdGFuZ2VudDI7XG4gICAgICAgICAgICB1bnBhY2tlZC5iaXRhbmdlbnRzW2kyICogMyArIDJdICs9IHpfcmVzQml0YW5nZW50MiAvIG1hZ0JpdGFuZ2VudDI7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGhhbmRlZG5lc3NcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudGFuZ2VudHMgPSB1bnBhY2tlZC50YW5nZW50cztcbiAgICAgICAgdGhpcy5iaXRhbmdlbnRzID0gdW5wYWNrZWQuYml0YW5nZW50cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gbGF5b3V0IC0gQSB7QGxpbmsgTGF5b3V0fSBvYmplY3QgdGhhdCBkZXNjcmliZXMgdGhlXG4gICAgICogZGVzaXJlZCBtZW1vcnkgbGF5b3V0IG9mIHRoZSBnZW5lcmF0ZWQgYnVmZmVyXG4gICAgICogQHJldHVybiBUaGUgcGFja2VkIGFycmF5IGluIHRoZSAuLi4gVE9ET1xuICAgICAqL1xuICAgIG1ha2VCdWZmZXJEYXRhKGxheW91dDogTGF5b3V0KTogQXJyYXlCdWZmZXJXaXRoSXRlbVNpemUge1xuICAgICAgICBjb25zdCBudW1JdGVtcyA9IHRoaXMudmVydGljZXMubGVuZ3RoIC8gMztcbiAgICAgICAgY29uc3QgYnVmZmVyOiBBcnJheUJ1ZmZlcldpdGhJdGVtU2l6ZSA9IG5ldyBBcnJheUJ1ZmZlcihsYXlvdXQuc3RyaWRlICogbnVtSXRlbXMpO1xuICAgICAgICBidWZmZXIubnVtSXRlbXMgPSBudW1JdGVtcztcbiAgICAgICAgY29uc3QgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIHZlcnRleE9mZnNldCA9IDA7IGkgPCBudW1JdGVtczsgaSsrKSB7XG4gICAgICAgICAgICB2ZXJ0ZXhPZmZzZXQgPSBpICogbGF5b3V0LnN0cmlkZTtcbiAgICAgICAgICAgIC8vIGNvcHkgaW4gdGhlIHZlcnRleCBkYXRhIGluIHRoZSBvcmRlciBhbmQgZm9ybWF0IGdpdmVuIGJ5IHRoZVxuICAgICAgICAgICAgLy8gbGF5b3V0IHBhcmFtXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHJpYnV0ZSBvZiBsYXlvdXQuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHZlcnRleE9mZnNldCArIGxheW91dC5hdHRyaWJ1dGVNYXBbYXR0cmlidXRlLmtleV0ub2Zmc2V0O1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXR0cmlidXRlLmtleSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIExheW91dC5QT1NJVElPTi5rZXk6XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgdGhpcy52ZXJ0aWNlc1tpICogM10sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA0LCB0aGlzLnZlcnRpY2VzW2kgKiAzICsgMV0sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA4LCB0aGlzLnZlcnRpY2VzW2kgKiAzICsgMl0sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTGF5b3V0LlVWLmtleTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0LCB0aGlzLnRleHR1cmVzW2kgKiAyXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDQsIHRoaXMudGV4dHVyZXNbaSAqIDIgKyAxXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBMYXlvdXQuTk9STUFMLmtleTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0LCB0aGlzLnZlcnRleE5vcm1hbHNbaSAqIDNdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0ICsgNCwgdGhpcy52ZXJ0ZXhOb3JtYWxzW2kgKiAzICsgMV0sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA4LCB0aGlzLnZlcnRleE5vcm1hbHNbaSAqIDMgKyAyXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBMYXlvdXQuTUFURVJJQUxfSU5ERVgua2V5OlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0SW50MTYob2Zmc2V0LCB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBMYXlvdXQuQU1CSUVOVC5rZXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRlcmlhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01hdGVyaWFsIFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXNbbWF0ZXJpYWxJbmRleF0gK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1wiIG5vdCBmb3VuZCBpbiBtZXNoLiBEaWQgeW91IGZvcmdldCB0byBjYWxsIGFkZE1hdGVyaWFsTGlicmFyeSguLi4pP1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQsIG1hdGVyaWFsLmFtYmllbnRbMF0sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA0LCBtYXRlcmlhbC5hbWJpZW50WzFdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0ICsgOCwgbWF0ZXJpYWwuYW1iaWVudFsyXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIExheW91dC5ESUZGVVNFLmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwuZGlmZnVzZVswXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDQsIG1hdGVyaWFsLmRpZmZ1c2VbMV0sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA4LCBtYXRlcmlhbC5kaWZmdXNlWzJdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTGF5b3V0LlNQRUNVTEFSLmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwuc3BlY3VsYXJbMF0sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA0LCBtYXRlcmlhbC5zcGVjdWxhclsxXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDgsIG1hdGVyaWFsLnNwZWN1bGFyWzJdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTGF5b3V0LlNQRUNVTEFSX0VYUE9ORU5ULmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwuc3BlY3VsYXJFeHBvbmVudCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIExheW91dC5FTUlTU0lWRS5rZXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRlcmlhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01hdGVyaWFsIFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXNbbWF0ZXJpYWxJbmRleF0gK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1wiIG5vdCBmb3VuZCBpbiBtZXNoLiBEaWQgeW91IGZvcmdldCB0byBjYWxsIGFkZE1hdGVyaWFsTGlicmFyeSguLi4pP1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQsIG1hdGVyaWFsLmVtaXNzaXZlWzBdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0ICsgNCwgbWF0ZXJpYWwuZW1pc3NpdmVbMV0sIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA4LCBtYXRlcmlhbC5lbWlzc2l2ZVsyXSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIExheW91dC5UUkFOU01JU1NJT05fRklMVEVSLmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwudHJhbnNtaXNzaW9uRmlsdGVyWzBdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0ICsgNCwgbWF0ZXJpYWwudHJhbnNtaXNzaW9uRmlsdGVyWzFdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0ICsgOCwgbWF0ZXJpYWwudHJhbnNtaXNzaW9uRmlsdGVyWzJdLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTGF5b3V0LkRJU1NPTFZFLmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwuZGlzc29sdmUsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBMYXlvdXQuSUxMVU1JTkFUSU9OLmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRJbnQxNihvZmZzZXQsIG1hdGVyaWFsLmlsbHVtaW5hdGlvbiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIExheW91dC5SRUZSQUNUSU9OX0lOREVYLmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwucmVmcmFjdGlvbkluZGV4LCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTGF5b3V0LlNIQVJQTkVTUy5rZXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRlcmlhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01hdGVyaWFsIFwiJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXNbbWF0ZXJpYWxJbmRleF0gK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1wiIG5vdCBmb3VuZCBpbiBtZXNoLiBEaWQgeW91IGZvcmdldCB0byBjYWxsIGFkZE1hdGVyaWFsTGlicmFyeSguLi4pP1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQsIG1hdGVyaWFsLnNoYXJwbmVzcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIExheW91dC5BTlRJX0FMSUFTSU5HLmtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWF0ZXJpYWwgXCInICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRJbnQxNihvZmZzZXQsIG1hdGVyaWFsLmFudGlBbGlhc2luZyA/IDEgOiAwLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgbWFrZUluZGV4QnVmZmVyRGF0YSgpOiBVaW50MTZBcnJheVdpdGhJdGVtU2l6ZSB7XG4gICAgICAgIGNvbnN0IGJ1ZmZlcjogVWludDE2QXJyYXlXaXRoSXRlbVNpemUgPSBuZXcgVWludDE2QXJyYXkodGhpcy5pbmRpY2VzKTtcbiAgICAgICAgYnVmZmVyLm51bUl0ZW1zID0gdGhpcy5pbmRpY2VzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICBtYWtlSW5kZXhCdWZmZXJEYXRhRm9yTWF0ZXJpYWxzKC4uLm1hdGVyaWFsSW5kaWNlczogQXJyYXk8bnVtYmVyPik6IFVpbnQxNkFycmF5V2l0aEl0ZW1TaXplIHtcbiAgICAgICAgY29uc3QgaW5kaWNlczogbnVtYmVyW10gPSBuZXcgQXJyYXk8bnVtYmVyPigpLmNvbmNhdChcbiAgICAgICAgICAgIC4uLm1hdGVyaWFsSW5kaWNlcy5tYXAobXRsSWR4ID0+IHRoaXMuaW5kaWNlc1Blck1hdGVyaWFsW210bElkeF0pLFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBidWZmZXI6IFVpbnQxNkFycmF5V2l0aEl0ZW1TaXplID0gbmV3IFVpbnQxNkFycmF5KGluZGljZXMpO1xuICAgICAgICBidWZmZXIubnVtSXRlbXMgPSBpbmRpY2VzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICBhZGRNYXRlcmlhbExpYnJhcnkobXRsOiBNYXRlcmlhbExpYnJhcnkpIHtcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIGluIG10bC5tYXRlcmlhbHMpIHtcbiAgICAgICAgICAgIGlmICghKG5hbWUgaW4gdGhpcy5tYXRlcmlhbEluZGljZXMpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBtYXRlcmlhbCBpcyBub3QgcmVmZXJlbmNlZCBieSB0aGUgbWVzaFxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBtYXRlcmlhbCA9IG10bC5tYXRlcmlhbHNbbmFtZV07XG5cbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIG1hdGVyaWFsIGluZGV4IGZvciB0aGlzIG1hdGVyaWFsXG4gICAgICAgICAgICBjb25zdCBtYXRlcmlhbEluZGV4ID0gdGhpcy5tYXRlcmlhbEluZGljZXNbbWF0ZXJpYWwubmFtZV07XG5cbiAgICAgICAgICAgIC8vIFB1dCB0aGUgbWF0ZXJpYWwgaW50byB0aGUgbWF0ZXJpYWxzQnlJbmRleCBvYmplY3QgYXQgdGhlIHJpZ2h0XG4gICAgICAgICAgICAvLyBzcG90IGFzIGRldGVybWluZWQgd2hlbiB0aGUgb2JqIGZpbGUgd2FzIHBhcnNlZFxuICAgICAgICAgICAgdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdID0gbWF0ZXJpYWw7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uKiB0cmlhbmd1bGF0ZShlbGVtZW50czogc3RyaW5nW10pIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoIDw9IDMpIHtcbiAgICAgICAgeWllbGQgZWxlbWVudHM7XG4gICAgfSBlbHNlIGlmIChlbGVtZW50cy5sZW5ndGggPT09IDQpIHtcbiAgICAgICAgeWllbGQgW2VsZW1lbnRzWzBdLCBlbGVtZW50c1sxXSwgZWxlbWVudHNbMl1dO1xuICAgICAgICB5aWVsZCBbZWxlbWVudHNbMl0sIGVsZW1lbnRzWzNdLCBlbGVtZW50c1swXV07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBlbGVtZW50cy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgIHlpZWxkIFtlbGVtZW50c1swXSwgZWxlbWVudHNbaV0sIGVsZW1lbnRzW2kgKyAxXV07XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgTWVzaCBmcm9tIFwiLi9tZXNoXCI7XG5pbXBvcnQgeyBNYXRlcmlhbExpYnJhcnksIFRleHR1cmVNYXBEYXRhIH0gZnJvbSBcIi4vbWF0ZXJpYWxcIjtcblxuZnVuY3Rpb24gZG93bmxvYWRNdGxUZXh0dXJlcyhtdGw6IE1hdGVyaWFsTGlicmFyeSwgcm9vdDogc3RyaW5nKSB7XG4gICAgY29uc3QgbWFwQXR0cmlidXRlcyA9IFtcbiAgICAgICAgXCJtYXBEaWZmdXNlXCIsXG4gICAgICAgIFwibWFwQW1iaWVudFwiLFxuICAgICAgICBcIm1hcFNwZWN1bGFyXCIsXG4gICAgICAgIFwibWFwRGlzc29sdmVcIixcbiAgICAgICAgXCJtYXBCdW1wXCIsXG4gICAgICAgIFwibWFwRGlzcGxhY2VtZW50XCIsXG4gICAgICAgIFwibWFwRGVjYWxcIixcbiAgICAgICAgXCJtYXBFbWlzc2l2ZVwiLFxuICAgIF07XG4gICAgaWYgKCFyb290LmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgICByb290ICs9IFwiL1wiO1xuICAgIH1cbiAgICBjb25zdCB0ZXh0dXJlcyA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBtYXRlcmlhbE5hbWUgaW4gbXRsLm1hdGVyaWFscykge1xuICAgICAgICBpZiAoIW10bC5tYXRlcmlhbHMuaGFzT3duUHJvcGVydHkobWF0ZXJpYWxOYW1lKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSBtdGwubWF0ZXJpYWxzW21hdGVyaWFsTmFtZV07XG5cbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIG1hcEF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcERhdGEgPSAobWF0ZXJpYWwgYXMgYW55KVthdHRyXSBhcyBUZXh0dXJlTWFwRGF0YTtcbiAgICAgICAgICAgIGlmICghbWFwRGF0YSB8fCAhbWFwRGF0YS5maWxlbmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdXJsID0gcm9vdCArIG1hcERhdGEuZmlsZW5hbWU7XG4gICAgICAgICAgICB0ZXh0dXJlcy5wdXNoKFxuICAgICAgICAgICAgICAgIGZldGNoKHVybClcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXBEYXRhLnRleHR1cmUgPSBpbWFnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IChpbWFnZS5vbmxvYWQgPSByZXNvbHZlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBVbmFibGUgdG8gZG93bmxvYWQgdGV4dHVyZTogJHt1cmx9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLmFsbCh0ZXh0dXJlcyk7XG59XG5cbmZ1bmN0aW9uIGdldE10bChtb2RlbE9wdGlvbnM6IERvd25sb2FkTW9kZWxzT3B0aW9ucyk6IHN0cmluZyB7XG4gICAgaWYgKCEodHlwZW9mIG1vZGVsT3B0aW9ucy5tdGwgPT09IFwic3RyaW5nXCIpKSB7XG4gICAgICAgIHJldHVybiBtb2RlbE9wdGlvbnMub2JqLnJlcGxhY2UoL1xcLm9iaiQvLCBcIi5tdGxcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vZGVsT3B0aW9ucy5tdGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG93bmxvYWRNb2RlbHNPcHRpb25zIHtcbiAgICBvYmo6IHN0cmluZztcbiAgICBtdGw/OiBib29sZWFuIHwgc3RyaW5nO1xuICAgIGRvd25sb2FkTXRsVGV4dHVyZXM/OiBib29sZWFuO1xuICAgIG10bFRleHR1cmVSb290Pzogc3RyaW5nO1xuICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgaW5kaWNlc1Blck1hdGVyaWFsPzogYm9vbGVhbjtcbiAgICBjYWxjVGFuZ2VudHNBbmRCaXRhbmdlbnRzPzogYm9vbGVhbjtcbn1cblxudHlwZSBNb2RlbFByb21pc2VzID0gW1Byb21pc2U8c3RyaW5nPiwgUHJvbWlzZTxNZXNoPiwgdW5kZWZpbmVkIHwgUHJvbWlzZTxNYXRlcmlhbExpYnJhcnk+XTtcbmV4cG9ydCB0eXBlIE1lc2hNYXAgPSB7IFtuYW1lOiBzdHJpbmddOiBNZXNoIH07XG4vKipcbiAqIEFjY2VwdHMgYSBsaXN0IG9mIG1vZGVsIHJlcXVlc3Qgb2JqZWN0cyBhbmQgcmV0dXJucyBhIFByb21pc2UgdGhhdFxuICogcmVzb2x2ZXMgd2hlbiBhbGwgbW9kZWxzIGhhdmUgYmVlbiBkb3dubG9hZGVkIGFuZCBwYXJzZWQuXG4gKlxuICogVGhlIGxpc3Qgb2YgbW9kZWwgb2JqZWN0cyBmb2xsb3cgdGhpcyBpbnRlcmZhY2U6XG4gKiB7XG4gKiAgb2JqOiAncGF0aC90by9tb2RlbC5vYmonLFxuICogIG10bDogdHJ1ZSB8ICdwYXRoL3RvL21vZGVsLm10bCcsXG4gKiAgZG93bmxvYWRNdGxUZXh0dXJlczogdHJ1ZSB8IGZhbHNlXG4gKiAgbXRsVGV4dHVyZVJvb3Q6ICcvbW9kZWxzL3N1emFubmUvbWFwcydcbiAqICBuYW1lOiAnc3V6YW5uZSdcbiAqIH1cbiAqXG4gKiBUaGUgYG9iamAgYXR0cmlidXRlIGlzIHJlcXVpcmVkIGFuZCBzaG91bGQgYmUgdGhlIHBhdGggdG8gdGhlXG4gKiBtb2RlbCdzIC5vYmogZmlsZSByZWxhdGl2ZSB0byB0aGUgY3VycmVudCByZXBvIChhYnNvbHV0ZSBVUkxzIGFyZVxuICogc3VnZ2VzdGVkKS5cbiAqXG4gKiBUaGUgYG10bGAgYXR0cmlidXRlIGlzIG9wdGlvbmFsIGFuZCBjYW4gZWl0aGVyIGJlIGEgYm9vbGVhbiBvclxuICogYSBwYXRoIHRvIHRoZSBtb2RlbCdzIC5tdGwgZmlsZSByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuIElmXG4gKiB0aGUgdmFsdWUgaXMgYHRydWVgLCB0aGVuIHRoZSBwYXRoIGFuZCBiYXNlbmFtZSBnaXZlbiBmb3IgdGhlIGBvYmpgXG4gKiBhdHRyaWJ1dGUgaXMgdXNlZCByZXBsYWNpbmcgdGhlIC5vYmogc3VmZml4IGZvciAubXRsXG4gKiBFLmcuOiB7b2JqOiAnbW9kZWxzL2Zvby5vYmonLCBtdGw6IHRydWV9IHdvdWxkIHNlYXJjaCBmb3IgJ21vZGVscy9mb28ubXRsJ1xuICpcbiAqIFRoZSBgbmFtZWAgYXR0cmlidXRlIGlzIG9wdGlvbmFsIGFuZCBpcyBhIGh1bWFuIGZyaWVuZGx5IG5hbWUgdG8gYmVcbiAqIGluY2x1ZGVkIHdpdGggdGhlIHBhcnNlZCBPQkogYW5kIE1UTCBmaWxlcy4gSWYgbm90IGdpdmVuLCB0aGUgYmFzZSAub2JqXG4gKiBmaWxlbmFtZSB3aWxsIGJlIHVzZWQuXG4gKlxuICogVGhlIGBkb3dubG9hZE10bFRleHR1cmVzYCBhdHRyaWJ1dGUgaXMgYSBmbGFnIGZvciBhdXRvbWF0aWNhbGx5IGRvd25sb2FkaW5nXG4gKiBhbnkgaW1hZ2VzIGZvdW5kIGluIHRoZSBNVEwgZmlsZSBhbmQgYXR0YWNoaW5nIHRoZW0gdG8gZWFjaCBNYXRlcmlhbFxuICogY3JlYXRlZCBmcm9tIHRoYXQgZmlsZS4gRm9yIGV4YW1wbGUsIGlmIG1hdGVyaWFsLm1hcERpZmZ1c2UgaXMgc2V0ICh0aGVyZVxuICogd2FzIGRhdGEgaW4gdGhlIE1UTCBmaWxlKSwgdGhlbiBtYXRlcmlhbC5tYXBEaWZmdXNlLnRleHR1cmUgd2lsbCBjb250YWluXG4gKiB0aGUgZG93bmxvYWRlZCBpbWFnZS4gVGhpcyBvcHRpb24gZGVmYXVsdHMgdG8gYHRydWVgLiBCeSBkZWZhdWx0LCB0aGUgTVRMJ3NcbiAqIFVSTCB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBsb2NhdGlvbiBvZiB0aGUgaW1hZ2VzLlxuICpcbiAqIFRoZSBgbXRsVGV4dHVyZVJvb3RgIGF0dHJpYnV0ZSBpcyBvcHRpb25hbCBhbmQgc2hvdWxkIHBvaW50IHRvIHRoZSBsb2NhdGlvblxuICogb24gdGhlIHNlcnZlciB0aGF0IHRoaXMgTVRMJ3MgdGV4dHVyZSBmaWxlcyBhcmUgbG9jYXRlZC4gVGhlIGRlZmF1bHQgaXMgdG9cbiAqIHVzZSB0aGUgTVRMIGZpbGUncyBsb2NhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gdGhlIHJlc3VsdCBvZiBkb3dubG9hZGluZyB0aGUgZ2l2ZW4gbGlzdCBvZiBtb2RlbHMuIFRoZVxuICogcHJvbWlzZSB3aWxsIHJlc29sdmUgd2l0aCBhbiBvYmplY3Qgd2hvc2Uga2V5cyBhcmUgdGhlIG5hbWVzIG9mIHRoZSBtb2RlbHNcbiAqIGFuZCB0aGUgdmFsdWUgaXMgaXRzIE1lc2ggb2JqZWN0LiBFYWNoIE1lc2ggb2JqZWN0IHdpbGwgYXV0b21hdGljYWxseVxuICogaGF2ZSBpdHMgYWRkTWF0ZXJpYWxMaWJyYXJ5KCkgbWV0aG9kIGNhbGxlZCB0byBzZXQgdGhlIGdpdmVuIE1UTCBkYXRhIChpZiBnaXZlbikuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkb3dubG9hZE1vZGVscyhtb2RlbHM6IERvd25sb2FkTW9kZWxzT3B0aW9uc1tdKTogUHJvbWlzZTxNZXNoTWFwPiB7XG4gICAgY29uc3QgZmluaXNoZWQgPSBbXTtcblxuICAgIGZvciAoY29uc3QgbW9kZWwgb2YgbW9kZWxzKSB7XG4gICAgICAgIGlmICghbW9kZWwub2JqKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgJ1wib2JqXCIgYXR0cmlidXRlIG9mIG1vZGVsIG9iamVjdCBub3Qgc2V0LiBUaGUgLm9iaiBmaWxlIGlzIHJlcXVpcmVkIHRvIGJlIHNldCAnICtcbiAgICAgICAgICAgICAgICAgICAgXCJpbiBvcmRlciB0byB1c2UgZG93bmxvYWRNb2RlbHMoKVwiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBpbmRpY2VzUGVyTWF0ZXJpYWw6ICEhbW9kZWwuaW5kaWNlc1Blck1hdGVyaWFsLFxuICAgICAgICAgICAgY2FsY1RhbmdlbnRzQW5kQml0YW5nZW50czogISFtb2RlbC5jYWxjVGFuZ2VudHNBbmRCaXRhbmdlbnRzLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGlmIHRoZSBuYW1lIGlzIG5vdCBwcm92aWRlZCwgZGVydml2ZSBpdCBmcm9tIHRoZSBnaXZlbiBPQkpcbiAgICAgICAgbGV0IG5hbWUgPSBtb2RlbC5uYW1lO1xuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gbW9kZWwub2JqLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgICAgIG5hbWUgPSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXS5yZXBsYWNlKFwiLm9ialwiLCBcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuYW1lUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShuYW1lKTtcblxuICAgICAgICBjb25zdCBtZXNoUHJvbWlzZSA9IGZldGNoKG1vZGVsLm9iailcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLnRleHQoKSlcbiAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgTWVzaChkYXRhLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBtdGxQcm9taXNlO1xuICAgICAgICAvLyBEb3dubG9hZCBNYXRlcmlhbExpYnJhcnkgZmlsZT9cbiAgICAgICAgaWYgKG1vZGVsLm10bCkge1xuICAgICAgICAgICAgY29uc3QgbXRsID0gZ2V0TXRsKG1vZGVsKTtcbiAgICAgICAgICAgIG10bFByb21pc2UgPSBmZXRjaChtdGwpXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UudGV4dCgpKVxuICAgICAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgICAgICAoZGF0YTogc3RyaW5nKTogUHJvbWlzZTxbTWF0ZXJpYWxMaWJyYXJ5LCBhbnldPiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbCA9IG5ldyBNYXRlcmlhbExpYnJhcnkoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9kZWwuZG93bmxvYWRNdGxUZXh0dXJlcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm9vdCA9IG1vZGVsLm10bFRleHR1cmVSb290O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcm9vdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIGRpcmVjdG9yeSBvZiB0aGUgTVRMIGZpbGUgYXMgZGVmYXVsdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290ID0gbXRsLnN1YnN0cigwLCBtdGwubGFzdEluZGV4T2YoXCIvXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZG93bmxvYWRNdGxUZXh0dXJlcyByZXR1cm5zIGEgUHJvbWlzZSB0aGF0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXMgcmVzb2x2ZWQgb25jZSBhbGwgb2YgdGhlIGltYWdlcyBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnRhaW5zIGFyZSBkb3dubG9hZGVkLiBUaGVzZSBhcmUgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGF0dGFjaGVkIHRvIHRoZSBtYXAgZGF0YSBvYmplY3RzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtQcm9taXNlLnJlc29sdmUobWF0ZXJpYWwpLCBkb3dubG9hZE10bFRleHR1cmVzKG1hdGVyaWFsLCByb290KV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtQcm9taXNlLnJlc29sdmUobWF0ZXJpYWwpLCB1bmRlZmluZWRdKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgLnRoZW4oKHZhbHVlOiBbTWF0ZXJpYWxMaWJyYXJ5LCBhbnldKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVswXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcnNlZDogTW9kZWxQcm9taXNlcyA9IFtuYW1lUHJvbWlzZSwgbWVzaFByb21pc2UsIG10bFByb21pc2VdO1xuICAgICAgICBmaW5pc2hlZC5wdXNoKFByb21pc2UuYWxsPHN0cmluZywgTWVzaCwgTWF0ZXJpYWxMaWJyYXJ5IHwgdW5kZWZpbmVkPihwYXJzZWQpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoZmluaXNoZWQpLnRoZW4obXMgPT4ge1xuICAgICAgICAvLyB0aGUgXCJmaW5pc2hlZFwiIHByb21pc2UgaXMgYSBsaXN0IG9mIG5hbWUsIE1lc2ggaW5zdGFuY2UsXG4gICAgICAgIC8vIGFuZCBNYXRlcmlhbExpYmFyeSBpbnN0YW5jZS4gVGhpcyB1bnBhY2tzIGFuZCByZXR1cm5zIGFuXG4gICAgICAgIC8vIG9iamVjdCBtYXBwaW5nIG5hbWUgdG8gTWVzaCAoTWVzaCBwb2ludHMgdG8gTVRMKS5cbiAgICAgICAgY29uc3QgbW9kZWxzOiBNZXNoTWFwID0ge307XG5cbiAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBtcykge1xuICAgICAgICAgICAgY29uc3QgW25hbWUsIG1lc2gsIG10bF0gPSBtb2RlbDtcbiAgICAgICAgICAgIG1lc2gubmFtZSA9IG5hbWU7XG4gICAgICAgICAgICBpZiAobXRsKSB7XG4gICAgICAgICAgICAgICAgbWVzaC5hZGRNYXRlcmlhbExpYnJhcnkobXRsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1vZGVsc1tuYW1lXSA9IG1lc2g7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9kZWxzO1xuICAgIH0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5hbWVBbmRVcmxzIHtcbiAgICBbbWVzaE5hbWU6IHN0cmluZ106IHN0cmluZztcbn1cblxuLyoqXG4gKiBUYWtlcyBpbiBhbiBvYmplY3Qgb2YgYG1lc2hfbmFtZWAsIGAnL3VybC90by9PQkovZmlsZSdgIHBhaXJzIGFuZCBhIGNhbGxiYWNrXG4gKiBmdW5jdGlvbi4gRWFjaCBPQkogZmlsZSB3aWxsIGJlIGFqYXhlZCBpbiBhbmQgYXV0b21hdGljYWxseSBjb252ZXJ0ZWQgdG9cbiAqIGFuIE9CSi5NZXNoLiBXaGVuIGFsbCBmaWxlcyBoYXZlIHN1Y2Nlc3NmdWxseSBkb3dubG9hZGVkIHRoZSBjYWxsYmFja1xuICogZnVuY3Rpb24gcHJvdmlkZWQgd2lsbCBiZSBjYWxsZWQgYW5kIHBhc3NlZCBpbiBhbiBvYmplY3QgY29udGFpbmluZ1xuICogdGhlIG5ld2x5IGNyZWF0ZWQgbWVzaGVzLlxuICpcbiAqICoqTm90ZToqKiBJbiBvcmRlciB0byB1c2UgdGhpcyBmdW5jdGlvbiBhcyBhIHdheSB0byBkb3dubG9hZCBtZXNoZXMsIGFcbiAqIHdlYnNlcnZlciBvZiBzb21lIHNvcnQgbXVzdCBiZSB1c2VkLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBuYW1lQW5kQXR0cnMgYW4gb2JqZWN0IHdoZXJlIHRoZSBrZXkgaXMgdGhlIG5hbWUgb2YgdGhlIG1lc2ggYW5kIHRoZSB2YWx1ZSBpcyB0aGUgdXJsIHRvIHRoYXQgbWVzaCdzIE9CSiBmaWxlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29tcGxldGlvbkNhbGxiYWNrIHNob3VsZCBjb250YWluIGEgZnVuY3Rpb24gdGhhdCB3aWxsIHRha2Ugb25lIHBhcmFtZXRlcjogYW4gb2JqZWN0IGFycmF5IHdoZXJlIHRoZSBrZXlzIHdpbGwgYmUgdGhlIHVuaXF1ZSBvYmplY3QgbmFtZSBhbmQgdGhlIHZhbHVlIHdpbGwgYmUgYSBNZXNoIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNoZXMgSW4gY2FzZSBvdGhlciBtZXNoZXMgYXJlIGxvYWRlZCBzZXBhcmF0ZWx5IG9yIGlmIGEgcHJldmlvdXNseSBkZWNsYXJlZCB2YXJpYWJsZSBpcyBkZXNpcmVkIHRvIGJlIHVzZWQsIHBhc3MgaW4gYSAocG9zc2libHkgZW1wdHkpIGpzb24gb2JqZWN0IG9mIHRoZSBwYXR0ZXJuOiB7ICc8bWVzaF9uYW1lPic6IE9CSi5NZXNoIH1cbiAqXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkb3dubG9hZE1lc2hlcyhcbiAgICBuYW1lQW5kVVJMczogTmFtZUFuZFVybHMsXG4gICAgY29tcGxldGlvbkNhbGxiYWNrOiAobWVzaGVzOiBNZXNoTWFwKSA9PiB2b2lkLFxuICAgIG1lc2hlczogTWVzaE1hcCxcbikge1xuICAgIGlmIChtZXNoZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtZXNoZXMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21wbGV0ZWQ6IFByb21pc2U8W3N0cmluZywgTWVzaF0+W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgbWVzaF9uYW1lIGluIG5hbWVBbmRVUkxzKSB7XG4gICAgICAgIGlmICghbmFtZUFuZFVSTHMuaGFzT3duUHJvcGVydHkobWVzaF9uYW1lKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXJsID0gbmFtZUFuZFVSTHNbbWVzaF9uYW1lXTtcbiAgICAgICAgY29tcGxldGVkLnB1c2goXG4gICAgICAgICAgICBmZXRjaCh1cmwpXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UudGV4dCgpKVxuICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW21lc2hfbmFtZSwgbmV3IE1lc2goZGF0YSldIGFzIFtzdHJpbmcsIE1lc2hdO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICApO1xuICAgIH1cblxuICAgIFByb21pc2UuYWxsKGNvbXBsZXRlZCkudGhlbihtcyA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgW25hbWUsIG1lc2hdIG9mIG1zKSB7XG4gICAgICAgICAgICBtZXNoZXNbbmFtZV0gPSBtZXNoO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbXBsZXRpb25DYWxsYmFjayhtZXNoZXMpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuZGVkR0xCdWZmZXIgZXh0ZW5kcyBXZWJHTEJ1ZmZlciB7XG4gICAgaXRlbVNpemU6IG51bWJlcjtcbiAgICBudW1JdGVtczogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiBfYnVpbGRCdWZmZXIoZ2w6IFdlYkdMUmVuZGVyaW5nQ29udGV4dCwgdHlwZTogR0xlbnVtLCBkYXRhOiBudW1iZXJbXSwgaXRlbVNpemU6IG51bWJlcik6IEV4dGVuZGVkR0xCdWZmZXIge1xuICAgIGNvbnN0IGJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpIGFzIEV4dGVuZGVkR0xCdWZmZXI7XG4gICAgY29uc3QgYXJyYXlWaWV3ID0gdHlwZSA9PT0gZ2wuQVJSQVlfQlVGRkVSID8gRmxvYXQzMkFycmF5IDogVWludDE2QXJyYXk7XG4gICAgZ2wuYmluZEJ1ZmZlcih0eXBlLCBidWZmZXIpO1xuICAgIGdsLmJ1ZmZlckRhdGEodHlwZSwgbmV3IGFycmF5VmlldyhkYXRhKSwgZ2wuU1RBVElDX0RSQVcpO1xuICAgIGJ1ZmZlci5pdGVtU2l6ZSA9IGl0ZW1TaXplO1xuICAgIGJ1ZmZlci5udW1JdGVtcyA9IGRhdGEubGVuZ3RoIC8gaXRlbVNpemU7XG4gICAgcmV0dXJuIGJ1ZmZlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNoV2l0aEJ1ZmZlcnMgZXh0ZW5kcyBNZXNoIHtcbiAgICBub3JtYWxCdWZmZXI6IEV4dGVuZGVkR0xCdWZmZXI7XG4gICAgdGV4dHVyZUJ1ZmZlcjogRXh0ZW5kZWRHTEJ1ZmZlcjtcbiAgICB2ZXJ0ZXhCdWZmZXI6IEV4dGVuZGVkR0xCdWZmZXI7XG4gICAgaW5kZXhCdWZmZXI6IEV4dGVuZGVkR0xCdWZmZXI7XG59XG5cbi8qKlxuICogVGFrZXMgaW4gdGhlIFdlYkdMIGNvbnRleHQgYW5kIGEgTWVzaCwgdGhlbiBjcmVhdGVzIGFuZCBhcHBlbmRzIHRoZSBidWZmZXJzXG4gKiB0byB0aGUgbWVzaCBvYmplY3QgYXMgYXR0cmlidXRlcy5cbiAqXG4gKiBAcGFyYW0ge1dlYkdMUmVuZGVyaW5nQ29udGV4dH0gZ2wgdGhlIGBjYW52YXMuZ2V0Q29udGV4dCgnd2ViZ2wnKWAgY29udGV4dCBpbnN0YW5jZVxuICogQHBhcmFtIHtNZXNofSBtZXNoIGEgc2luZ2xlIGBPQkouTWVzaGAgaW5zdGFuY2VcbiAqXG4gKiBUaGUgbmV3bHkgY3JlYXRlZCBtZXNoIGF0dHJpYnV0ZXMgYXJlOlxuICpcbiAqIEF0dHJidXRlIHwgRGVzY3JpcHRpb25cbiAqIDotLS0gfCAtLS1cbiAqICoqbm9ybWFsQnVmZmVyKiogICAgICAgfGNvbnRhaW5zIHRoZSBtb2RlbCYjMzk7cyBWZXJ0ZXggTm9ybWFsc1xuICogbm9ybWFsQnVmZmVyLml0ZW1TaXplICB8c2V0IHRvIDMgaXRlbXNcbiAqIG5vcm1hbEJ1ZmZlci5udW1JdGVtcyAgfHRoZSB0b3RhbCBudW1iZXIgb2YgdmVydGV4IG5vcm1hbHNcbiAqIHxcbiAqICoqdGV4dHVyZUJ1ZmZlcioqICAgICAgfGNvbnRhaW5zIHRoZSBtb2RlbCYjMzk7cyBUZXh0dXJlIENvb3JkaW5hdGVzXG4gKiB0ZXh0dXJlQnVmZmVyLml0ZW1TaXplIHxzZXQgdG8gMiBpdGVtc1xuICogdGV4dHVyZUJ1ZmZlci5udW1JdGVtcyB8dGhlIG51bWJlciBvZiB0ZXh0dXJlIGNvb3JkaW5hdGVzXG4gKiB8XG4gKiAqKnZlcnRleEJ1ZmZlcioqICAgICAgIHxjb250YWlucyB0aGUgbW9kZWwmIzM5O3MgVmVydGV4IFBvc2l0aW9uIENvb3JkaW5hdGVzIChkb2VzIG5vdCBpbmNsdWRlIHcpXG4gKiB2ZXJ0ZXhCdWZmZXIuaXRlbVNpemUgIHxzZXQgdG8gMyBpdGVtc1xuICogdmVydGV4QnVmZmVyLm51bUl0ZW1zICB8dGhlIHRvdGFsIG51bWJlciBvZiB2ZXJ0aWNlc1xuICogfFxuICogKippbmRleEJ1ZmZlcioqICAgICAgICB8Y29udGFpbnMgdGhlIGluZGljZXMgb2YgdGhlIGZhY2VzXG4gKiBpbmRleEJ1ZmZlci5pdGVtU2l6ZSAgIHxpcyBzZXQgdG8gMVxuICogaW5kZXhCdWZmZXIubnVtSXRlbXMgICB8dGhlIHRvdGFsIG51bWJlciBvZiBpbmRpY2VzXG4gKlxuICogQSBzaW1wbGUgZXhhbXBsZSAoYSBsb3Qgb2Ygc3RlcHMgYXJlIG1pc3NpbmcsIHNvIGRvbid0IGNvcHkgYW5kIHBhc3RlKTpcbiAqXG4gKiAgICAgY29uc3QgZ2wgICA9IGNhbnZhcy5nZXRDb250ZXh0KCd3ZWJnbCcpLFxuICogICAgICAgICBtZXNoID0gT0JKLk1lc2gob2JqX2ZpbGVfZGF0YSk7XG4gKiAgICAgLy8gY29tcGlsZSB0aGUgc2hhZGVycyBhbmQgY3JlYXRlIGEgc2hhZGVyIHByb2dyYW1cbiAqICAgICBjb25zdCBzaGFkZXJQcm9ncmFtID0gZ2wuY3JlYXRlUHJvZ3JhbSgpO1xuICogICAgIC8vIGNvbXBpbGF0aW9uIHN0dWZmIGhlcmVcbiAqICAgICAuLi5cbiAqICAgICAvLyBtYWtlIHN1cmUgeW91IGhhdmUgdmVydGV4LCB2ZXJ0ZXggbm9ybWFsLCBhbmQgdGV4dHVyZSBjb29yZGluYXRlXG4gKiAgICAgLy8gYXR0cmlidXRlcyBsb2NhdGVkIGluIHlvdXIgc2hhZGVycyBhbmQgYXR0YWNoIHRoZW0gdG8gdGhlIHNoYWRlciBwcm9ncmFtXG4gKiAgICAgc2hhZGVyUHJvZ3JhbS52ZXJ0ZXhQb3NpdGlvbkF0dHJpYnV0ZSA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHNoYWRlclByb2dyYW0sIFwiYVZlcnRleFBvc2l0aW9uXCIpO1xuICogICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHNoYWRlclByb2dyYW0udmVydGV4UG9zaXRpb25BdHRyaWJ1dGUpO1xuICpcbiAqICAgICBzaGFkZXJQcm9ncmFtLnZlcnRleE5vcm1hbEF0dHJpYnV0ZSA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHNoYWRlclByb2dyYW0sIFwiYVZlcnRleE5vcm1hbFwiKTtcbiAqICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShzaGFkZXJQcm9ncmFtLnZlcnRleE5vcm1hbEF0dHJpYnV0ZSk7XG4gKlxuICogICAgIHNoYWRlclByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24oc2hhZGVyUHJvZ3JhbSwgXCJhVGV4dHVyZUNvb3JkXCIpO1xuICogICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHNoYWRlclByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlKTtcbiAqXG4gKiAgICAgLy8gY3JlYXRlIGFuZCBpbml0aWFsaXplIHRoZSB2ZXJ0ZXgsIHZlcnRleCBub3JtYWwsIGFuZCB0ZXh0dXJlIGNvb3JkaW5hdGUgYnVmZmVyc1xuICogICAgIC8vIGFuZCBzYXZlIG9uIHRvIHRoZSBtZXNoIG9iamVjdFxuICogICAgIE9CSi5pbml0TWVzaEJ1ZmZlcnMoZ2wsIG1lc2gpO1xuICpcbiAqICAgICAvLyBub3cgdG8gcmVuZGVyIHRoZSBtZXNoXG4gKiAgICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIG1lc2gudmVydGV4QnVmZmVyKTtcbiAqICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHNoYWRlclByb2dyYW0udmVydGV4UG9zaXRpb25BdHRyaWJ1dGUsIG1lc2gudmVydGV4QnVmZmVyLml0ZW1TaXplLCBnbC5GTE9BVCwgZmFsc2UsIDAsIDApO1xuICogICAgIC8vIGl0J3MgcG9zc2libGUgdGhhdCB0aGUgbWVzaCBkb2Vzbid0IGNvbnRhaW5cbiAqICAgICAvLyBhbnkgdGV4dHVyZSBjb29yZGluYXRlcyAoZS5nLiBzdXphbm5lLm9iaiBpbiB0aGUgZGV2ZWxvcG1lbnQgYnJhbmNoKS5cbiAqICAgICAvLyBpbiB0aGlzIGNhc2UsIHRoZSB0ZXh0dXJlIHZlcnRleEF0dHJpYkFycmF5IHdpbGwgbmVlZCB0byBiZSBkaXNhYmxlZFxuICogICAgIC8vIGJlZm9yZSB0aGUgY2FsbCB0byBkcmF3RWxlbWVudHNcbiAqICAgICBpZighbWVzaC50ZXh0dXJlcy5sZW5ndGgpe1xuICogICAgICAgZ2wuZGlzYWJsZVZlcnRleEF0dHJpYkFycmF5KHNoYWRlclByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlKTtcbiAqICAgICB9XG4gKiAgICAgZWxzZXtcbiAqICAgICAgIC8vIGlmIHRoZSB0ZXh0dXJlIHZlcnRleEF0dHJpYkFycmF5IGhhcyBiZWVuIHByZXZpb3VzbHlcbiAqICAgICAgIC8vIGRpc2FibGVkLCB0aGVuIGl0IG5lZWRzIHRvIGJlIHJlLWVuYWJsZWRcbiAqICAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHNoYWRlclByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlKTtcbiAqICAgICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCBtZXNoLnRleHR1cmVCdWZmZXIpO1xuICogICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihzaGFkZXJQcm9ncmFtLnRleHR1cmVDb29yZEF0dHJpYnV0ZSwgbWVzaC50ZXh0dXJlQnVmZmVyLml0ZW1TaXplLCBnbC5GTE9BVCwgZmFsc2UsIDAsIDApO1xuICogICAgIH1cbiAqXG4gKiAgICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIG1lc2gubm9ybWFsQnVmZmVyKTtcbiAqICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHNoYWRlclByb2dyYW0udmVydGV4Tm9ybWFsQXR0cmlidXRlLCBtZXNoLm5vcm1hbEJ1ZmZlci5pdGVtU2l6ZSwgZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcbiAqXG4gKiAgICAgZ2wuYmluZEJ1ZmZlcihnbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiwgbW9kZWwubWVzaC5pbmRleEJ1ZmZlcik7XG4gKiAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsLlRSSUFOR0xFUywgbW9kZWwubWVzaC5pbmRleEJ1ZmZlci5udW1JdGVtcywgZ2wuVU5TSUdORURfU0hPUlQsIDApO1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdE1lc2hCdWZmZXJzKGdsOiBXZWJHTFJlbmRlcmluZ0NvbnRleHQsIG1lc2g6IE1lc2gpOiBNZXNoV2l0aEJ1ZmZlcnMge1xuICAgIChtZXNoIGFzIE1lc2hXaXRoQnVmZmVycykubm9ybWFsQnVmZmVyID0gX2J1aWxkQnVmZmVyKGdsLCBnbC5BUlJBWV9CVUZGRVIsIG1lc2gudmVydGV4Tm9ybWFscywgMyk7XG4gICAgKG1lc2ggYXMgTWVzaFdpdGhCdWZmZXJzKS50ZXh0dXJlQnVmZmVyID0gX2J1aWxkQnVmZmVyKGdsLCBnbC5BUlJBWV9CVUZGRVIsIG1lc2gudGV4dHVyZXMsIG1lc2gudGV4dHVyZVN0cmlkZSk7XG4gICAgKG1lc2ggYXMgTWVzaFdpdGhCdWZmZXJzKS52ZXJ0ZXhCdWZmZXIgPSBfYnVpbGRCdWZmZXIoZ2wsIGdsLkFSUkFZX0JVRkZFUiwgbWVzaC52ZXJ0aWNlcywgMyk7XG4gICAgKG1lc2ggYXMgTWVzaFdpdGhCdWZmZXJzKS5pbmRleEJ1ZmZlciA9IF9idWlsZEJ1ZmZlcihnbCwgZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIG1lc2guaW5kaWNlcywgMSk7XG5cbiAgICByZXR1cm4gbWVzaCBhcyBNZXNoV2l0aEJ1ZmZlcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWxldGVNZXNoQnVmZmVycyhnbDogV2ViR0xSZW5kZXJpbmdDb250ZXh0LCBtZXNoOiBNZXNoV2l0aEJ1ZmZlcnMpIHtcbiAgICBnbC5kZWxldGVCdWZmZXIobWVzaC5ub3JtYWxCdWZmZXIpO1xuICAgIGdsLmRlbGV0ZUJ1ZmZlcihtZXNoLnRleHR1cmVCdWZmZXIpO1xuICAgIGdsLmRlbGV0ZUJ1ZmZlcihtZXNoLnZlcnRleEJ1ZmZlcik7XG4gICAgZ2wuZGVsZXRlQnVmZmVyKG1lc2guaW5kZXhCdWZmZXIpO1xufVxuIl0sInNvdXJjZVJvb3QiOiIifQ==
