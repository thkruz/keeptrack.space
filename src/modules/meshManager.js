(function () {
    if (settingsManager.noMeshManager) return;
    let meshManager = {};
    meshManager.selectedSatPosition = { x: 0, y: 0, z: 0 };
    let mvMatrix;
    let mvMatrixEmpty = mat4.create();
    let nMatrix;
    let nMatrixEmpty = mat3.create();

    meshManager.fileList = [];
    let meshList = [
        'sat2',
        's1u',
        's2u',
        's3u',
        'starlink',
        'iss',
        'gps',
        'aehf',
        'dsp',
        'galileo',
        'o3b',
        'orbcomm',
        'iridium',
        'globalstar',
        'debris0',
        'debris1',
        'debris2',
        'rocketbody',
    ];
    for (var i = 0; i < meshList.length; i++) {
        let meshFiles = {
            obj: `${settingsManager.installDirectory}meshes/${meshList[i]}.obj`,
            mtl: `${settingsManager.installDirectory}meshes/${meshList[i]}.mtl`,
        };
        meshManager.fileList.push(meshFiles);
    }

    // main shader program
    meshManager.fragShaderCode = `
    precision mediump float;

    varying vec3 vLightDirection;
    varying float vInSun;
    varying vec3 vTransformedNormal;
    varying vec2 vTextureCoord;
    varying vec4 vPosition;
    varying vec3 vAmbient;
    varying vec3 vDiffuse;
    varying vec3 vSpecular;
    varying float vSpecularExponent;

    void main(void) {
      float lightAmt = max(dot(vTransformedNormal, vLightDirection), 0.0);

      vec3 ambientColor = vDiffuse * 0.1;
      vec3 dirColor = vDiffuse * vAmbient * lightAmt * min(vInSun,1.0);
      vec3 specColor = vSpecular * lightAmt * min(vInSun,1.0);

      vec3 color = ambientColor + dirColor + specColor;

      gl_FragColor = vec4(color, 1.0);
    }
  `;
    meshManager.vertShaderCode = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec3 aSpecular;
    attribute float aSpecularExponent;
    attribute vec3 aAmbient;
    attribute vec3 aDiffuse;
    attribute vec2 aTextureCoord;

    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;
    uniform vec3 uLightDirection;
    uniform float uInSun;

    varying vec2 vTextureCoord;
    varying vec3 vTransformedNormal;
    varying vec4 vPosition;
    varying vec3 vLightDirection;
    varying float vInSun;

    varying vec3 vAmbient;
    varying vec3 vDiffuse;
    varying vec3 vSpecular;
    varying float vSpecularExponent;

    void main(void) {
      vLightDirection = uLightDirection;
      vAmbient = aAmbient;
      vDiffuse = aDiffuse;
      vSpecular = aSpecular;
      vSpecularExponent = aSpecularExponent;
      vInSun = uInSun;

      vPosition = uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
      gl_Position = uPMatrix * vPosition;
      vTextureCoord = aTextureCoord;
      vTransformedNormal  = uNormalMatrix * aVertexNormal;
    }
  `;
    meshManager.isReady = false;
    meshManager.init = () => {
        let p = OBJ.downloadModels(meshManager.fileList);

        p.then((models) => {
            for (var [name, mesh] of Object.entries(models)) {
                // console.log("Name:", name);
                // console.log("Mesh:", mesh);
            }
            meshManager.meshes = models;
            initShaders();
            initBuffers();
            meshManager.isReady = true;
        });
    };
    // main app object
    meshManager.meshes = {};
    meshManager.models = {};
    meshManager.mvMatrix = mat4.create();
    meshManager.mvMatrixStack = [];
    meshManager.pMatrix = mat4.create();
    meshManager.drawObject = (
        model,
        pMatrix,
        camMatrix,
        sat,
        isFacingNadir
    ) => {
        if (typeof model == 'undefined') return;

        // Meshes aren't finished loading
        if (!meshManager.loaded) return;

        // gl.bindVertexArray(meshManager.vao);

        let inSun = sat.isInSun();

        // Assigned an origin at 0,0,0
        mvMatrix = mvMatrixEmpty;
        mat4.identity(mvMatrix);

        // Move the mesh to its location in world space
        mat4.translate(
            mvMatrix,
            mvMatrix,
            vec3.fromValues(
                model.position.x,
                model.position.y,
                model.position.z
            )
        );

        // Rotate the Satellite to Face Nadir
        if (isFacingNadir) {
            mat4.rotateZ(mvMatrix, mvMatrix, longToYaw(sat.getTEARR().lon * RAD2DEG) + 180 * DEG2RAD);
        }

        // mat4.scale(
        //     mvMatrix,
        //     mvMatrix,
        //     vec3.fromValues(model.size.x, model.size.y, model.size.z)
        // );

        // Assign the normal matrix the opposite of the mvMatrix
        nMatrix = nMatrixEmpty;
        mat3.normalFromMat4(nMatrix, mvMatrix);

        gl.enable(gl.BLEND);

        // Use the mesh shader program
        gl.useProgram(meshManager.shaderProgram);

        // Not sure what this does?!
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Assign uniforms
        gl.uniform3fv(meshManager.shaderProgram.uLightDirection,earth.lightDirection);
        gl.uniformMatrix3fv(meshManager.shaderProgram.uNormalMatrix,false,nMatrix);
        gl.uniformMatrix4fv(meshManager.shaderProgram.uMvMatrix,false,mvMatrix);
        gl.uniformMatrix4fv(meshManager.shaderProgram.uPMatrix, false, pMatrix);
        gl.uniformMatrix4fv(meshManager.shaderProgram.uCamMatrix,false,camMatrix);
        gl.uniform1f(meshManager.shaderProgram.uInSun, inSun);

        // Assign vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);

        // Update Buffers
        meshManager.shaderProgram.applyAttributePointers(model);

        // Enable attributes
        meshManager.shaderProgram.enableVertexAttribArrays(model);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
        gl.drawElements(gl.TRIANGLES,model.mesh.indexBuffer.numItems,gl.UNSIGNED_SHORT,0);

        // Enable attributes
        meshManager.shaderProgram.disableVertexAttribArrays(model);

        gl.disable(gl.BLEND);
    };

    function initShaders() {
        // meshManager.vao = gl.createVertexArray();
        // gl.bindVertexArray(meshManager.vao);

        let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        let fragCode = meshManager.fragShaderCode;
        gl.shaderSource(fragShader, fragCode);
        gl.compileShader(fragShader);

        let vertShader = gl.createShader(gl.VERTEX_SHADER);
        let vertCode = meshManager.vertShaderCode;
        gl.shaderSource(vertShader, vertCode);
        gl.compileShader(vertShader);

        meshManager.shaderProgram = gl.createProgram();
        gl.attachShader(meshManager.shaderProgram, vertShader);
        gl.attachShader(meshManager.shaderProgram, fragShader);
        gl.linkProgram(meshManager.shaderProgram);

        if (
            !gl.getProgramParameter(meshManager.shaderProgram, gl.LINK_STATUS)
        ) {
            console.log('Could not initialise shaders');
        }
        gl.useProgram(meshManager.shaderProgram);

        const attrs = {
            aVertexPosition: OBJ.Layout.POSITION.key,
            aVertexNormal: OBJ.Layout.NORMAL.key,
            aTextureCoord: OBJ.Layout.UV.key,
            aAmbient: OBJ.Layout.AMBIENT.key,
            aDiffuse: OBJ.Layout.DIFFUSE.key,
            aSpecular: OBJ.Layout.SPECULAR.key,
            aSpecularExponent: OBJ.Layout.SPECULAR_EXPONENT.key,
        };

        meshManager.shaderProgram.attrIndices = {};

        meshManager.shaderProgram.uPMatrix = gl.getUniformLocation(
            meshManager.shaderProgram,
            'uPMatrix'
        );
        meshManager.shaderProgram.uCamMatrix = gl.getUniformLocation(
            meshManager.shaderProgram,
            'uCamMatrix'
        );
        meshManager.shaderProgram.uMvMatrix = gl.getUniformLocation(
            meshManager.shaderProgram,
            'uMvMatrix'
        );
        meshManager.shaderProgram.uNormalMatrix = gl.getUniformLocation(
            meshManager.shaderProgram,
            'uNormalMatrix'
        );
        meshManager.shaderProgram.uLightDirection = gl.getUniformLocation(
            meshManager.shaderProgram,
            'uLightDirection'
        );
        meshManager.shaderProgram.uInSun = gl.getUniformLocation(
            meshManager.shaderProgram,
            'uInSun'
        );

        meshManager.shaderProgram.applyAttributePointers = function (model) {
            const layout = model.mesh.vertexBuffer.layout;
            for (const attrName in attrs) {
                if (
                    !attrs.hasOwnProperty(attrName) ||
                    meshManager.shaderProgram.attrIndices[attrName] == -1
                ) {
                    continue;
                }
                const layoutKey = attrs[attrName];
                if (meshManager.shaderProgram.attrIndices[attrName] != -1) {
                    const attr = layout.attributeMap[layoutKey];
                    gl.vertexAttribPointer(
                        meshManager.shaderProgram.attrIndices[attrName],
                        attr.size,
                        gl[attr.type],
                        attr.normalized,
                        attr.stride,
                        attr.offset
                    );
                }
            }
        };
        meshManager.shaderProgram.enableVertexAttribArrays = function (model) {
          for (const attrName in attrs) {
            if (!attrs.hasOwnProperty(attrName)) {
                continue;
            }
            meshManager.shaderProgram.attrIndices[attrName] = gl.getAttribLocation(meshManager.shaderProgram, attrName);
            if (meshManager.shaderProgram.attrIndices[attrName] != -1) {
                gl.enableVertexAttribArray(meshManager.shaderProgram.attrIndices[attrName]);
            } else {
              console.warn(
                'Shader attribute "' +
                attrName +
                '" not found in shader. Is it undeclared or unused in the shader code?'
              );
            }
          }
        };
        meshManager.shaderProgram.disableVertexAttribArrays = function (model) {
            for (const attrName in attrs) {
                if (!attrs.hasOwnProperty(attrName)) {
                    continue;
                }
                meshManager.shaderProgram.attrIndices[
                    attrName
                ] = gl.getAttribLocation(meshManager.shaderProgram, attrName);
                if (meshManager.shaderProgram.attrIndices[attrName] != -1) {
                    gl.disableVertexAttribArray(
                        meshManager.shaderProgram.attrIndices[attrName]
                    );
                } else {
                    console.warn(
                        'Shader attribute "' +
                            attrName +
                            '" not found in shader. Is it undeclared or unused in the shader code?'
                    );
                }
            }
        };
    }
    function initBuffers() {
        var layout = new OBJ.Layout(
            OBJ.Layout.POSITION,
            OBJ.Layout.NORMAL,
            OBJ.Layout.AMBIENT,
            OBJ.Layout.DIFFUSE,
            OBJ.Layout.UV,
            OBJ.Layout.SPECULAR,
            OBJ.Layout.SPECULAR_EXPONENT
        );

        // initialize the mesh's buffers
        for (var mesh in meshManager.meshes) {
            // Create the vertex buffer for this mesh
            var vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            var vertexData = meshManager.meshes[mesh].makeBufferData(layout);
            gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
            vertexBuffer.numItems = vertexData.numItems;
            vertexBuffer.layout = layout;
            meshManager.meshes[mesh].vertexBuffer = vertexBuffer;

            // Create the index buffer for this mesh
            var indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            var indexData = meshManager.meshes[
                mesh
            ].makeIndexBufferDataForMaterials(
                ...Object.values(meshManager.meshes[mesh].materialIndices)
            );
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
            indexBuffer.numItems = indexData.numItems;
            meshManager.meshes[mesh].indexBuffer = indexBuffer;

            // this loops through the mesh names and creates new
            // model objects and setting their mesh to the current mesh
            meshManager.models[mesh] = {};
            meshManager.models[mesh].mesh = meshManager.meshes[mesh];
            // meshManager.models[mesh].size = meshManager.sizeInfo[mesh];
        }
        meshManager.loaded = true;
    }
    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = '';
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == 'x-shader/x-fragment') {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == 'x-shader/x-vertex') {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    window.meshManager = meshManager;
})();
