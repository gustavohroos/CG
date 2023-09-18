import { loadObject } from './parsers.js';

import { terrainFS, terrainVS } from './shaders/terrain_shaders.js';
import { ballFS, ballVS } from './shaders/ball_shaders.js';
import { objFS, objVS } from './shaders/obj_shaders.js';

const audioFiles = [
    'data/audios/1.mp3',
    'data/audios/2.mp3',
    'data/audios/3.mp3',
    // 'data/audios/4.mp3',
    'data/audios/5.mp3',
    'data/audios/6.mp3',
    // 'data/audios/7.mp3',
    // 'data/audios/8.mp3',
    // 'data/audios/9.mp3',
    // 'data/audios/10.mp3',
    // 'data/audios/11.mp3',
];

const audioContext = new (window.AudioContext)();

function pointsSum(points) {
    let sum = [0, 0, 0];
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
    let mulScalarp0 = mulScalar(p0, (1 - t + i) ** 3);
    let mulScalarp1 = mulScalar(p1, 3 * (1 - t + i) ** 2 * (t - i));
    let mulScalarp2 = mulScalar(p2, 3 * (1 - t + i) * (t - i) ** 2);
    let mulScalarp3 = mulScalar(p3, (t - i) ** 3);
    
    return pointsSum([mulScalarp0, mulScalarp1, mulScalarp2, mulScalarp3]);
}

function degToRad(d) {
    return d * Math.PI / 180;
}

function lemniscateOfBernoulli(t) {
    const a = 100;
    const b = 100;
    const x = a * Math.sqrt(2) * Math.cos(t) / (Math.sin(t) ** 2 + 1);
    const z = b * Math.sqrt(2) * Math.cos(t) * Math.sin(t) / (Math.sin(t) ** 2 + 1);
    return [x, 1000, z];
}


async function playAudioFile(audioFile, volume = 1.0) {
    try {
        const response = await fetch(audioFile);
        const data = await response.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(data);
        
        const audioSource = audioContext.createBufferSource();
        const gainNode = audioContext.createGain(); // Create a GainNode
        gainNode.gain.value = volume; // Set the volume
        
        audioSource.buffer = buffer;
        audioSource.connect(gainNode); // Connect the source to the gain node
        gainNode.connect(audioContext.destination); // Connect the gain node to the destination
        audioSource.start();
    } catch (error) {
        console.error('Error loading audio file:', error);
    }
}

function playRandomAudio() {
    const randomAudioFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];
    
    if (randomAudioFile) {
        return playAudioFile(randomAudioFile, 1)
            .then(() => true)
            .catch(() => false);
    }
    return false;
}





async function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    let canvas = document.querySelector("#canvas");
    let gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // Tell the twgl to match position with a_position, n
    // normal with a_normal etc..
    twgl.setAttributePrefix("a_");

    
    const v3 = twgl.v3;
    // setup GLSL program

    const terrainProgramInfo = twgl.createProgramInfo(gl, [terrainVS, terrainFS]);
    const ballProgramInfo = twgl.createProgramInfo(gl, [ballVS, ballFS]);
    const birdProgramInfo = twgl.createProgramInfo(gl, [objVS, objFS]);

    

    const height = 300;
    const numCurves = 4;
    
    const curves = [(t) => bezier(p0, p1, p2, p3, t, 0),
                (t) => bezier(p3, p4, p5, p6, t, 1),
                (t) => bezier(p6, p7, p8, p9, t, 2),
                (t) => bezier(p9, p10, p11, p12, t, 3)];


    let p0 = [-1.17, height, 19];
    let p1 = [-3.90, height, 11.69];
    let p2 = [-2.11, height, 7.33];
    let p3 = [2.15, height, 7.08];
    let p4 = [4.28, height, 6.95];
    let p5 = [5.97, height, 7.91];
    let p6 = [7.35, height, -0.25];
    let p7 = [8.05, height, -4.34];
    let p8 = [8.32, height, -8.66];
    let p9 = [-7.48, height, -12.63];
    let p10 = [-15.39, height, -14.61];
    let p11 = [-23.37, height, -15.51];
    let p12 = [-5.78, height, -2.04];

    const terrainBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 4096, 4096, 200, 200);
    const planeBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 10000, 10000, 1, 1);

    let terrain_worldMatrix = m4.identity();
    let plane_worldMatrix = m4.identity();

    
    const heightMapImage = await loadImage('data/images/Terrain/Height Map PNG.png');
    const imageHandleContext = document.createElement('canvas').getContext("2d", { willReadFrequently: true });
    imageHandleContext.canvas.width = heightMapImage.width;
    imageHandleContext.canvas.height = heightMapImage.height;
    imageHandleContext.drawImage(heightMapImage, 0, 0, heightMapImage.width, heightMapImage.height);
    const imgData = imageHandleContext.getImageData(0, 0, heightMapImage.width, heightMapImage.height);

    // generate normals from height data
    const displacementScale = 1000;
    const data = new Uint8Array(imgData.data.length);
    for (let z = 0; z < imgData.height; ++z) {
        for (let x = 0; x < imgData.width; ++x) {
            const off = (z * heightMapImage.width + x) * 4;
            const h0 = imgData.data[off];
            const h1 = imgData.data[off + 40] || 0;  // being lazy at edge
            const h2 = imgData.data[off + imgData.width * 4] || 0; // being lazy at edge
            const p0 = [x    , h0 * displacementScale / 255, z    ];
            const p1 = [x + 1, h1 * displacementScale / 255, z    ];
            const p2 = [x    , h2 * displacementScale / 255, z + 1];
            const v0 = v3.normalize(v3.subtract(p1, p0));
            const v1 = v3.normalize(v3.subtract(p2, p0));
            const normal = v3.normalize(v3.cross(v0, v1));
            data[off + 0] = (normal[0] * 0.5 + 0.5) * 255;
            data[off + 1] = (normal[1] * 0.5 + 0.5) * 255;
            data[off + 2] = (normal[2] * 0.5 + 0.5) * 255;
            data[off + 3] = h0;
        }
    } 

    const heightMapTexture = twgl.createTexture(gl, {
        src: data,
        width: imgData.width,
        minMag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
    });

    let then = 0;

    let controls = new function() {
        this.t = 0;
        this.t_birds = 0;
        this.totalAnimationTime = 10;
        this.lightx = -700;
        this.lighty = 100;
        this.lightz = -10;
        this.cameraX = 0;
        this.cameraY = 500;
        this.cameraZ = -1000;
        this.cameraPanSpeed = 1;
        this.cameraZoomSpeed = 0.1;
        this.cameraMinDistance = 100;
        this.cameraMaxDistance = 1000;
        this.target = [0, 0, 0];
        this.hour = 9;
        this.kc = 0.3;
        this.kl = 0.001;
        this.kq = 0.0001;
        this.ballsSpeed = 500;
        this.ballsRadius = 10;
        this.birdsSpeed = 100;
    }

    let currentAnimationTime = 0;

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
                    run_day: function() { runningDay = !runningDay;},
                    remove_balls: function() { balls = [];},
    };
    gui.add(buttons,'play');
    gui.add(buttons,'pause');
    gui.add(buttons,'reset');
    gui.add(buttons, 'lightconfig');
    gui.add(controls, 'lightx', -1000, 1000);
    gui.add(controls, 'lighty', -1000, 1000);
    gui.add(controls, 'lightz', -1000, 1000);
    gui.add(controls, 'cameraX', -1000, 1000);
    gui.add(controls, 'cameraY', -200, 10000);
    gui.add(controls, 'cameraZ', -1000, 1000);
    gui.add(controls, 'cameraPanSpeed', 0, 3);
    gui.add(buttons, 'run_day');
    let onChangeRunningDay = gui.add(controls, 'hour', 0, 24).listen();
    onChangeRunningDay.onChange(function(value) {
        const angle = degToRad((360 * value / 24) + 180);
        controls.lightx = Math.sin(angle) * 1000;
        controls.lighty = Math.cos(angle) * 1000;
        console.log(controls.lightx, controls.lighty);
    });
    gui.add(buttons, 'remove_balls');


    canvas.addEventListener('mousemove', onMouseMove, false);
    canvas.addEventListener('mousedown',onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    // canvas.addEventListener('wheel', onMouseWheel, false);
    document.addEventListener('keydown', onKeyDown, false);

    let isDragging = false;
    let lastMouseX = -1, lastMouseY = -1;

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
    let balls = []; // Array para armazenar informações das bolas

    let cameraMatrix = m4.lookAt([0, 0, 0], [0, 0, 0], [0, 1, 0]); 
    let cameraPosition = [controls.cameraX, controls.cameraY, controls.cameraZ];

    function onSpaceKeyPressed(event) {
        launchBall(lastMouseX, lastMouseY);
    }

    function chooseColor() {
        let choices = [
            [1, 0, 0,], // red
            [0, 1, 0], // green
            [0, 0, 1], // blue
            [1, 1, 0], // yellow
            [1, 0, 1], // magenta
            [0, 1, 1], // cyan
            [1, 1, 1], // white
        ];
        let index = Math.floor(Math.random() * choices.length);
        return choices[index];
      }

    function createBall(position, velocity, timeToReach) {
        const ball = twgl.primitives.createSphereBufferInfo(gl, controls.ballsRadius, 64, 64);
        const ballWorldMatrix = m4.translation(position[0], position[1], position[2]);
        const color = chooseColor();
        const ballData = {
            ballInfo: ball,
            worldMatrix: ballWorldMatrix,
            velocity: velocity,
            timeToReach: timeToReach,
            color: color,
            lightColor: color,
            hitted: 0,
        };
        balls.push(ballData);
        return ballData;
    }

    function launchBall() {
        const startPosition = cameraPosition;
        const targetPosition = [Math.random() * 1000 - 500, 0, Math.random() * 1000 - 500];
        
        // Calculate the direction from the current position to the target position
        const direction = m4.subtractVectors(targetPosition, startPosition);
        
        // Calculate the velocity required to reach the target position in a certain time frame
        const speed = controls.ballsSpeed; // Adjust the speed as needed
        const timeToReach = m4.length(direction) / speed;
        const velocity = m4.normalize(direction);

        const isPlaying = playRandomAudio();
        if (isPlaying) {
            if (balls.length >= 5){
                balls.splice(0, 1);
            }
            createBall(startPosition, velocity, timeToReach);
        }
    }

    let ballsLastTime = 0;

    function updateBalls(time) {
        const deltaTime = time - ballsLastTime;
        ballsLastTime = time;
        for (let i = balls.length - 1; i >= 0; i--) {
            const ballData = balls[i];
            if (ballData.worldMatrix[13] == -100) continue;
            if (ballData.timeToReach > 0) {
                ballData.velocity = m4.normalize(ballData.velocity); 
                const translation = mulScalar(ballData.velocity, controls.ballsSpeed * deltaTime);
                ballData.worldMatrix = m4.translate(ballData.worldMatrix, translation[0], translation[1], translation[2]);
                ballData.timeToReach -= deltaTime;

                const ballPosition = [ballData.worldMatrix[12], ballData.worldMatrix[13], ballData.worldMatrix[14]];
                const terrainHeight = getTerrainHeightAt(ballPosition[0], ballPosition[2]);

                if (ballPosition[1] <= terrainHeight * 1000 + controls.ballsRadius) {
                    const distance = m4.length(m4.subtractVectors(cameraPosition, ballPosition));
                    const volume = 1 / (distance) * 400; 
                    const clampedVolume = Math.min(1, Math.max(0, volume));
                    
                    playAudioFile('data/audios/boing.mp3', clampedVolume);
                    ballData.hitted += 1;
                    ballData.velocity = [Math.random() * 2 - 1,
                                         -ballData.velocity[1], 
                                         Math.random() * 2 - 1]; 
                    ballData.timeToReach = Infinity;
                    ballData.color = chooseColor();
                    ballData.lightColor = ballData.color;
                }
                if (ballData.hitted > 10) {      
                    ballData.worldMatrix[13] = -100;
                }
            }
        }
    }

    function getTerrainHeightAt(x, z) {

        x = Math.floor(x + heightMapImage.width / 2);
        z = Math.floor(z + heightMapImage.height / 2);
    
        const imageData = imageHandleContext.getImageData(x, z, 1, 1).data;

        const red = imageData[0];

        return red / 255;
    }

    function drawBalls(sharedUniforms) {
        for (let i = balls.length - 1; i >= 0; i--) {
            const ballData = balls[i];

            gl.useProgram(ballProgramInfo.program);
            twgl.setBuffersAndAttributes(gl, ballProgramInfo, ballData.ballInfo);
            twgl.setUniforms(ballProgramInfo, {
                u_world: ballData.worldMatrix,
                u_color: ballData.color,
                u_lightColor: ballData.lightColor,
            });

            twgl.setUniforms(ballProgramInfo, sharedUniforms);
            twgl.drawBufferInfo(gl, ballData.ballInfo);
        }
    }

    
    

    function drawTerrain(sharedUniforms, worldMatrix, buffer = terrainBufferInfo) {
        gl.useProgram(terrainProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, terrainProgramInfo, buffer);
        twgl.setUniforms(terrainProgramInfo, sharedUniforms);
        twgl.setUniformsAndBindTextures(terrainProgramInfo, {
            u_world: worldMatrix,
            displacementMap: heightMapTexture,
        });
        twgl.drawBufferInfo(gl, buffer);
    }

    let birdsLastTime = 0;
    let birds = [];

    // createBird();

    var bird = await loadObject('models/bird/bird.obj', gl, birdProgramInfo);
    const { bufferInfo, vao, material } = bird[1];
    console.log(bufferInfo, vao, material)

    createBall([2048, 100, 2048], [0, 0, 0], 1);
    createBall([-2048, 100, -2048], [0, 0, 0], 1);


    requestAnimationFrame(render);

  // Draw the scene.
    function render(time) {
        time = time * 0.001;

        let deltaTime = time - then;
        
        let curveNum = Math.floor(controls.t);
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

        
        let up = [0, 1, 0];
        cameraMatrix = m4.lookAt(cameraPosition, controls.target, up);
        
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        
        let fieldOfViewRadians = degToRad(60);
        let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 4000;
        let projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);        
        
        let view = m4.inverse(cameraMatrix);
        view = m4.yRotate(view, degToRad(0));
        
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        
        gl.clearColor(0.43, 0.84, 0.87, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // preenche o array de bolas para sempre ter 5 bolas
        while (balls.length < 5) {
            createBall([0,-100,0], [0,0,0], 1);
        }


        let ballsPositions = [];
        let ballsColors = [];
        for (let ball of balls) {
            ballsPositions.push(ball.worldMatrix[12]);
            ballsPositions.push(ball.worldMatrix[13]);
            ballsPositions.push(ball.worldMatrix[14]);
            ballsColors.push(ball.lightColor[0]);
            ballsColors.push(ball.lightColor[1]);
            ballsColors.push(ball.lightColor[2]);
        }
            
        const sharedUniforms = {
            u_lightDirection: m4.normalize([controls.lightx, controls.lighty, controls.lightz]),
            
            u_ballsPositions: ballsPositions,
            u_ballsColors: ballsColors,
            
            u_ambientLightIntensity: 0.2,
            u_ambientLightColor: [1., 1., 1.],
            
            u_view: view,
            u_projection: projection,
            u_viewWorldPosition: cameraPosition,
            u_displacementScale: 1000.,
            
            u_specular: 0.3,
            u_kc: controls.kc,
            u_kl: controls.kl,
            u_kq: controls.kq,
        };

        drawTerrain(sharedUniforms, plane_worldMatrix, planeBufferInfo);
        drawTerrain(sharedUniforms, terrain_worldMatrix);

        // updateBirds(time);
        // drawBirds(sharedUniforms, time);

        let u_world_bird = m4.translation(0, 600, 0);

        // make the birds fly in a lemniscate of bernoulli
        const birdPosition = lemniscateOfBernoulli(time);
        // const birdDirection = m4.subtractVectors(birdTarget, birdPosition);
        // const birdSpeed = controls.birdsSpeed;
        // const birdVelocity = m4.normalize(birdDirection);
        u_world_bird = m4.translate(u_world_bird, birdPosition[0], birdPosition[1], birdPosition[2]);




        for (const { bufferInfo, vao, material } of bird) {
            // console.log(bufferInfo, vao, material)
            gl.bindVertexArray(vao);
            twgl.setUniforms(birdProgramInfo, {
                u_world: u_world_bird,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }

        updateBalls(time); 

        drawBalls(sharedUniforms);
        
        
        
        requestAnimationFrame(render);
        then = time;
    }
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = _ => resolve(img);
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

main();