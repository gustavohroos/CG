import { vertexShader, fragmentShader } from './shaders/obj_shaders.js';
import { loadObject } from './parsers.js';

import { terrainFS, terrainVS } from './shaders/terrain_shaders.js';
import { ballFS, ballVS } from './shaders/ball_shaders.js';
import { simpleFS, simpleVS } from './shaders/simple_shaders.js';

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
    const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
    const terrainProgramInfo = twgl.createProgramInfo(gl, [terrainVS, terrainFS]);
    const ballProgramInfo = twgl.createProgramInfo(gl, [ballVS, ballFS]);

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

    const height = 300;
    
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

    let cameraDistance = 800;

    let controls = new function() {
        this.t = 0;
        this.totalAnimationTime = 10;
        this.lightx = 0;
        this.lighty = -1000;
        this.lightz = -10;
        this.cameraX = 0;
        this.cameraY = 800;
        this.cameraZ = -500;
        this.cameraPanSpeed = 1;
        this.cameraZoomSpeed = 0.1;
        this.cameraMinDistance = 100;
        this.cameraMaxDistance = 1000;
        this.target = [0, 0, 0];
        this.time = 0;
        this.hour = 0;
    }

    var currentAnimationTime = 0;

    let gui = new dat.GUI();
    gui.add(controls, 't', 0, numCurves).listen();
    
    let controltotalAnimationTime = gui.add(controls, 'totalAnimationTime', 1, 100);
    controltotalAnimationTime.onChange(function(value) {
        running = false;
        currentAnimationTime = 0;
        controls.t = 0;
    });
    controltotalAnimationTime.domElement.id = "totalAnimationTime";
    let running = false;
    let runningDay = false;
    let buttons = { play:function(){ running=true },
                    pause: function() { running=false; },
                    reset: function() { running=false; controls.t = 0; currentAnimationTime = 0;},
                    lightconfig: function() { controls.lightx = 2, controls.lighty = -8, controls.lightz = -8;},
                    run_day: function() { runningDay = !runningDay;}
    };
    gui.add(buttons,'play');
    gui.add(buttons,'pause');
    gui.add(buttons,'reset');
    gui.add(buttons, 'lightconfig');
    gui.add(controls, 'lightx', -1000, 1000);
    gui.add(controls, 'lighty', -1000, 1000);
    gui.add(controls, 'lightz', -1000, 1000);
    gui.add(controls, 'cameraX', -1000, 1000);
    gui.add(controls, 'cameraY', 0, 1000);
    gui.add(controls, 'cameraZ', -1000, 1000);
    gui.add(controls, 'cameraPanSpeed', 0, 3);
    gui.add(buttons, 'run_day');
    let onChangeRunningDay = gui.add(controls, 'hour', 0, 24).listen();
    onChangeRunningDay.onChange(function(value) {
        const angle = degToRad((360 * value / 24) + 180);
        controls.lightx = Math.sin(angle) * 1000;
        controls.lighty = Math.cos(angle) * 1000;
    });

    canvas.addEventListener('mousemove', onMouseMove, false);
    canvas.addEventListener('mousedown',onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('wheel', onMouseWheel, false);
    document.addEventListener('keydown', onKeyDown, false);

    var isDragging = false;
    var lastMouseX = -1, lastMouseY = -1;

    function onMouseDown(event) {
        isDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
    
    function onMouseMove(event) {
        if (!isDragging) return;
        
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Update camera position based on mouse movement (pan)
        controls.cameraX += deltaX * controls.cameraPanSpeed;
        controls.cameraY -= deltaY * controls.cameraPanSpeed;
        
        // Update the camera's target position
        controls.target[0] += deltaX * controls.cameraPanSpeed;
        controls.target[1] -= deltaY * controls.cameraPanSpeed;
        
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
    
    function onMouseUp() {
        isDragging = false;
    }

    function onKeyDown(event) {
        console.log(event.keyCode);
        
        if (event.keyCode == 32) {
            onSpaceKeyPressed(event);
        }

    }
    var balls = [];
    const ballsRadius = 10;

    var cameraMatrix = m4.lookAt([0, 0, 0], [0, 0, 0], [0, 1, 0]); 
    var cameraPosition = [controls.cameraX, controls.cameraY, controls.cameraZ];

    function onSpaceKeyPressed(event) {
        // Shot a ball from the camera towards the mouse position
        const x = (lastMouseX / window.innerWidth) * 2 - 1;
        const y = (lastMouseY   / window.innerHeight) * 2 - 1;
        const z = 0.5;
        const pos = [x, y, z, 1];
        console.log(pos);
        const worldPos = m4.transformPoint(cameraMatrix, pos);
        const direction = m4.subtractVectors(worldPos, cameraPosition);
        const speed = 100;
        const velocity = m4.normalize(direction);

        let ball = twgl.primitives.createSphereBufferInfo(gl, ballsRadius+100, 64, 64);
        let ballWorldMatrix = m4.translation(worldPos[0], worldPos[1], worldPos[2]);
        balls.push([ball, ballWorldMatrix]);
    }

    function updateCameraPosition() {
        // Calculate the camera position based on spherical coordinates
        const theta = (lastMouseX / window.innerWidth) * 2 * Math.PI;
        const phi = (lastMouseY / window.innerHeight) * Math.PI;
      
        const x = controls.target[0] + cameraDistance * Math.sin(phi) * Math.cos(theta);
        const y = controls.target[1] + cameraDistance * Math.cos(phi);
        const z = controls.target[2] + cameraDistance * Math.sin(phi) * Math.sin(theta);
      
        // Update the camera position
        controls.cameraX = x;
        controls.cameraY = y;
        controls.cameraZ = z;
      }
      function onMouseWheel(event) {
        // Check if horizontal scrolling (X-axis)
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
          // Rotate the camera around the target based on horizontal scrolling
          const rotationSpeed = 0.005;
          const deltaX = event.deltaX * rotationSpeed;
      
          // Calculate the new camera position using spherical coordinates
          const theta = deltaX;
          const phi = 0; // No change in vertical angle
      
          // Update camera position
          rotateCameraAroundTarget(theta, phi);
        } else {
          // Vertical scrolling (Y-axis) for zoom
          cameraDistance -= event.deltaY * controls.cameraZoomSpeed;
      
          // Ensure a minimum and maximum camera distance
          cameraDistance = Math.max(controls.cameraMinDistance, Math.min(controls.cameraMaxDistance, cameraDistance));
        }
      
        // Update the camera position
        updateCameraPosition();
      }

    function rotateCameraAroundTarget(theta, phi) {
        // Calculate the camera's position based on spherical coordinates
        const x = controls.target[0] + cameraDistance * Math.sin(phi) * Math.cos(theta);
        const y = controls.target[1] + cameraDistance * Math.cos(phi);
        const z = controls.target[2] + cameraDistance * Math.sin(phi) * Math.sin(theta);
      
        // Update the camera position
        controls.cameraX = x;
        controls.cameraY = y;
        controls.cameraZ = z;
    }


    


    let ball = twgl.primitives.createSphereBufferInfo(gl, 10, 64, 64);
    let ballWorldMatrix = m4.translation(0, 40, 0);
    balls.push([ball, ballWorldMatrix]);

    function drawBalls(sharedUniforms) {
        for (const ball of balls) {
            gl.useProgram(ballProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, ballProgramInfo, ball[0]);
            twgl.setUniforms(ballProgramInfo, {
                u_world : ball[1],
            });
            twgl.setUniforms(ballProgramInfo, sharedUniforms);
            twgl.drawBufferInfo(gl, ball[0]);
        }
    }
    
    //   const terrainBufferInfo = twgl.primitives.createPlaneBufferInfo(
    //     gl,
    //     970,  // width
    //     970,  // height
    //     300,  // quads across
    //     300,  // quads down
    // );

    const terrainBufferInfo = twgl.primitives.createPlaneBufferInfo(
        gl,
        970,  // width
        970,  // height
        200,  // quads across
        200,  // quads down
    );
      
    const heightMapTexture = twgl.createTexture(gl, {
        src: 'data/heightmapper-1694729718236.png',
        minMag: gl.NEAREST,
        wrap: gl.CLAMP_TO_EDGE,
    });

    const normalMapTexture = twgl.createTexture(gl, {
        src: 'data/heightmapper-1694729718236.png',
        minMag: gl.NEAREST,
        wrap: gl.CLAMP_TO_EDGE,
    });

    let terrain_worldMatrix = m4.identity();

    function drawTerrain(sharedUniforms) {
        gl.useProgram(terrainProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, terrainProgramInfo, terrainBufferInfo);
        twgl.setUniforms(terrainProgramInfo, sharedUniforms);
        twgl.setUniformsAndBindTextures(terrainProgramInfo, {
            u_world : terrain_worldMatrix,
            displacementMap: heightMapTexture,
            normalMap : normalMapTexture
        });
        twgl.drawBufferInfo(gl, terrainBufferInfo);
    }

    function degToRad(d) {
        return d * Math.PI / 180;
    }
    
    requestAnimationFrame(render);

  // Draw the scene.
    function render(time) {
        time = time * 0.001;

        var deltaTime = time - then;
        
        var curveNum = Math.floor(controls.t);
        if (curveNum >= numCurves) {
            curveNum = numCurves - 1;
        }
        
        if (runningDay) {
            controls.hour += deltaTime * 2;
            if (controls.hour > 24) {
                controls.hour = 0;
            }

            const angle = degToRad(360 * controls.hour / 24 + 180);
            controls.lightx = Math.sin(angle) * 1000;
            controls.lighty = Math.cos(angle) * 1000;
        }
        
        
        if(!running) {
            controls.t = 0;
            deltaTime = 0;
            currentAnimationTime = 0;
            cameraPosition = [controls.cameraX, controls.cameraY, controls.cameraZ];
        } else {
            
            currentAnimationTime += deltaTime;
            
            if (currentAnimationTime > controls.totalAnimationTime) {
                currentAnimationTime = 0;
            }
            
            controls.t = (currentAnimationTime / controls.totalAnimationTime) * numCurves;
            if (controls.t > numCurves) controls.t = numCurves;
            cameraPosition = curves[curveNum](controls.t);
            controls.target = curves[curveNum](controls.t + 0.01);
        }

        then = time;
        
        var up = [0, 1, 0];
        cameraMatrix = m4.lookAt(cameraPosition, controls.target, up);
        
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        
        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        // Compute the projection matrix
        var fieldOfViewRadians = degToRad(60);
        var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        var projection = m4.perspective(fieldOfViewRadians, aspect, 0.1, 3000);        

        // Make a view matrix from the camera matrix.
        var view = m4.inverse(cameraMatrix);
        view = m4.yRotate(view, degToRad(0));

        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        gl.clearColor(14/255, 222/255, 237/255, 0.8);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const sharedUniforms = {
            u_lightDirection: m4.normalize([controls.lightx, controls.lighty, controls.lightz]),
            u_ambientLight: [0, 0, 0],
            u_lightWorldPos: [0, 0, 0],
            u_view: view,
            u_projection: projection,
            u_viewWorldPosition: cameraPosition,
            u_lightColor:            [0, 0, 0, 1],
            u_ambient:               [0, 0, 0, 1],
            u_specular:              [0, 0, 0, 1],
            u_shininess:             60,
            u_specularFactor:        1,
        };

        drawTerrain(sharedUniforms);
        drawBalls(sharedUniforms);

        gl.useProgram(programInfo.program);

        // calls gl.uniform
        twgl.setUniforms(programInfo, sharedUniforms);



        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();