import { vertexShader, fragmentShader } from './shaders.js';
import { loadObject } from './parsers.js';

const vs = vertexShader;
const fs = fragmentShader;

console.log(vs ? 'vertex shader loaded' : 'vertex shader not loaded');
console.log(fs ? 'fragment shader loaded' : 'fragment shader not loaded');


async function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#canvas");
    // var gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true});
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // Tell the twgl to match position with a_position, n
    // normal with a_normal etc..
    twgl.setAttributePrefix("a_");

    
    // setup GLSL program
    var programInfo = twgl.createProgramInfo(gl, [vs, fs]);

    // create floor

    var chicken = await loadObject('animals/objects/chicken_001.obj', gl, programInfo);
    var horse = await loadObject('animals/objects/horse_001.obj', gl, programInfo);
    var kitty = await loadObject('animals/objects/kitty_001.obj', gl, programInfo);
    var dog = await loadObject('animals/objects/dog_001.obj', gl, programInfo);

    var tree = await loadObject('farm/objects/tree_001.obj', gl, programInfo);
    var house_1 = await loadObject('farm/objects/house_002.obj', gl, programInfo);
    var house_2 = await loadObject('farm/objects/house_003.obj', gl, programInfo);
    var stall = await loadObject('farm/objects/stall_001.obj', gl, programInfo);
    var stall_table = await loadObject('farm/objects/stall_table_001.obj', gl, programInfo);
    var shop = await loadObject('shop/botcher shop.obj', gl, programInfo);

    function degToRad(d) {
        return d * Math.PI / 180;
    }

    function rand(min, max) {
        if (max === undefined) {
        max = min;
        min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    function emod(x, n) {
        return x >= 0 ? (x % n) : ((n - (-x % n)) % n);
    }

    var fieldOfViewRadians = degToRad(60);




    function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
        var matrix = m4.translate(viewProjectionMatrix,
            translation[0],
            translation[1],
            translation[2]);
        matrix = m4.xRotate(matrix, xRotation);
        return m4.yRotate(matrix, yRotation);
    }

    function pointsSum(points) {
        var sum = [0, 0, 0];
        for (let i = 0; i < points.length; i++) {
            sum[0] += points[i][0];
            sum[1] += points[i][1];
            sum[2] += points[i][2];
        }
        return sum;
    }

    function mulScalar(p0, s) {
        return [
            p0[0] * s,
            p0[1] * s,
            p0[2] * s,
        ];
    }

    function bezier(p0, p1, p2, p3, t, i) {
        var mulScalarp0 = mulScalar(p0, (1 - t + i) ** 3);
        var mulScalarp1 = mulScalar(p1, 3 * (1 - t + i) ** 2 * (t - i));
        var mulScalarp2 = mulScalar(p2, 3 * (1 - t + i) * (t - i) ** 2);
        var mulScalarp3 = mulScalar(p3, (t - i) ** 3);
        
        return pointsSum([mulScalarp0, mulScalarp1, mulScalarp2, mulScalarp3]);
    }

    let showMenu = document.getElementById("show-menu-button");
    let menu = document.getElementById("buttons");

    showMenu.addEventListener("click", () => {
        menu.classList.toggle("visible");
    });
    
    const height = 1.5;
    
    var p0 = [-1.17, height, 19];
    var p1 = [-3.90, height, 11.69];
    var p2 = [-2.11, height, 7.33];
    var p3 = [2.15, height, 7.08];
    var p4 = [4.28, height, 6.95];
    var p5 = [5.97, height, 7.91];
    var p6 = [7.35, height, -0.25];
    var p7 = [8.05, height, -4.34];
    var p8 = [8.32, height, -8.66];
    var p9 = [-7.48, height, -12.63];
    var p10 = [-15.39, height, -14.61];
    var p11 = [-23.37, height, -15.51];
    var p12 = [-5.78, height, -2.04];

    var curves = [(t) => bezier(p0, p1, p2, p3, t, 0),
                (t) => bezier(p3, p4, p5, p6, t, 1),
                (t) => bezier(p6, p7, p8, p9, t, 2),
                (t) => bezier(p9, p10, p11, p12, t, 3)];

    var then = 0;
    const numCurves = 4;
    var t = 0;

    let totalAnimationTimeInput = document.getElementById("animation-time");
    let totalAnimationTime = parseFloat(totalAnimationTimeInput.value);
    let currentAnimationTime = 0;

    totalAnimationTimeInput.addEventListener("input", () => {
        totalAnimationTime = parseFloat(totalAnimationTimeInput.value);
    });


    let animationStepSlider = document.getElementById("animation-step-slider");
    let animationPercentage = document.getElementById("animation-percentage");
    var animationInterval = totalAnimationTimeInput.value;

    animationStepSlider.addEventListener("input", () => {
        currentAnimationTime = parseFloat(animationStepSlider.value) / 100 * totalAnimationTime;
        animationPercentage.textContent = `${animationStepSlider.value}%`;
        const animationStartTime = performance.now();
        clearInterval(animationInterval);

    });

    let startAnimationButton = document.getElementById("startButton");
    let resetAnimationButton = document.getElementById("resetButton");
    let running = false;

    startAnimationButton.addEventListener("click", () => {
        running = true;
        currentAnimationTime = 0;
        animationStepSlider.value = 0;
        let animationStartTime = performance.now();
        animationPercentage.textContent = `${animationStepSlider.value}%`;

        animationInterval = setInterval(function () {
  
            const currentTime = performance.now() - animationStartTime;
            const progressPercentage = (currentTime / totalAnimationTime) * 0.1;

            console.log(currentTime, progressPercentage)
      
      
            if (progressPercentage >= 100) {
              clearInterval(animationInterval);
              console.log("Animation completed");
              return;
            }
      
            animationPercentage.textContent = progressPercentage.toFixed(0) + "%";
            animationStepSlider.value = progressPercentage;
          }, 16);
    });

    resetAnimationButton.addEventListener("click", () => {
        clearInterval(animationInterval);
        clearInterval(animationInterval);
        running = false;
        currentAnimationTime = 0;
        animationStepSlider.value = 0;
        animationPercentage.textContent = `${animationStepSlider.value}%`;
    });

    
    
    requestAnimationFrame(render);

  // Draw the scene.
    function render(time) {
        time = time * 0.001;

        if(!running) {
            t = 0;
            deltaTime = 0;
            currentAnimationTime = 0;
        } else {
            var deltaTime = time - then;

            currentAnimationTime += deltaTime;
            
            if (currentAnimationTime > totalAnimationTime) {
                currentAnimationTime = 0;
            }

            t = (currentAnimationTime / totalAnimationTime) * numCurves;
            if (t > numCurves) t = numCurves;
        }
        
        then = time;

        var curveNum = Math.floor(t);

        twgl.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Compute the projection matrix
        var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        var projection = m4.perspective(fieldOfViewRadians, aspect, 0.1, 1000);

        
        console.log(t)
        var curveNum = Math.floor(t);
        if (curveNum >= numCurves) {
            curveNum = numCurves - 1;
        }

        var cameraPosition = curves[curveNum](t);
        var target = curves[curveNum](t + 0.01);
        var [x_horse, _y_horse, z_horse] = curves[curveNum](t + 0.1);
        var up = [0, 1, 0];
        var cameraMatrix = m4.lookAt(cameraPosition, target, up);

        // Make a view matrix from the camera matrix.
        var view = m4.inverse(cameraMatrix);
        view = m4.yRotate(view, degToRad(0));

        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        /* gl.enable(gl.CULL_FACE); */
        gl.enable(gl.DEPTH_TEST);

        gl.clearColor(29/255, 138/255, 58/255, 0.4);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const sharedUniforms = {
            u_lightDirection: m4.normalize([-10, 0, 20]),
            u_ambientLight: [0, 0, 0],
            u_lightWorldPos: [0, 100, -20],
            u_view: view,
            u_projection: projection,
            u_viewWorldPosition: cameraPosition,
            u_lightColor:            [0, 0, 1, 1],
            u_ambient:               [0, 0, 1, 1],
            u_specular:              [0, 0, 1, 1],
            u_shininess:             60,
            u_specularFactor:        1,
        };


        gl.useProgram(programInfo.program);

        // calls gl.uniform
        twgl.setUniforms(programInfo, sharedUniforms);

        // ANIMALS

        // chicken walking in circle
        // console.log(curves[curveNum](t + 0.1));

        var radius = 1;
        var angle = degToRad(360 * time * 0.1);
        var x_chicken = Math.cos(angle) * radius;
        var z_chicken = Math.sin(angle) * radius;

        var u_world_chicken = m4.translation(2,0,2);
        u_world_chicken = m4.translation(x_chicken - (t/4 % 5),0,z_chicken - (t/4 % 5));

        u_world_chicken = m4.yRotate(u_world_chicken, degToRad(5));

        for (const { bufferInfo, vao, material } of chicken) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_chicken,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_horse = m4.translation(x_horse,0,z_horse);
        u_world_horse = m4.yRotate(u_world_horse, degToRad(-30));

        for (const { bufferInfo, vao, material } of horse) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_horse,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_kitty = m4.translation(5,0,2);
        u_world_kitty = m4.yRotate(u_world_kitty, degToRad(-50));

        for (const { bufferInfo, vao, material } of kitty) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_kitty,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_dog = m4.translation(3+(time % 10),0,2+(time % 10));
        u_world_dog = m4.yRotate(u_world_dog, degToRad(50));

        for (const { bufferInfo, vao, material } of dog) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_dog,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }


        // STRUCTURES

        var u_world_house_1 = m4.translation(-10, 0, -10);
        u_world_house_1 = m4.yRotate(u_world_house_1, degToRad(-30));

        for (const { bufferInfo, vao, material } of house_1) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_house_1,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_house_2 = m4.translation(-10, 0, 10);
        u_world_house_2 = m4.yRotate(u_world_house_2, degToRad(30));

        for (const { bufferInfo, vao, material } of house_2) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_house_2,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_stall = m4.translation(-4, 0, 0);
        

        for (const { bufferInfo, vao, material } of stall) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_stall,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_stall_table = m4.translation(-4, 0, 0);

        for (const { bufferInfo, vao, material } of stall_table) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_stall_table,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_tree = m4.translation(0, 0, 0);

        for (const { bufferInfo, vao, material } of tree) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_tree,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        var u_world_shop = m4.translation(10, 0, 0);
        u_world_shop = m4.yRotate(u_world_shop, degToRad(180));

        for (const { bufferInfo, vao, material } of shop) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(programInfo, {
                u_world: u_world_shop,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }


        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();