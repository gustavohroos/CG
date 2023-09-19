import { loadObject } from './parsers.js';
import { terrainFS, terrainVS } from './shaders/terrain_shaders.js';
import { ballFS, ballVS } from './shaders/ball_shaders.js';
import { objFS, objVS } from './shaders/obj_shaders.js';
import { boxFS, boxVS } from './shaders/box_shaders.js';

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
    const a = 1000;
    const b = 1000;
    const x = a * Math.sqrt(2) * Math.cos(t) / (Math.sin(t) ** 2 + 1);
    const z = b * Math.sqrt(2) * Math.cos(t) * Math.sin(t) / (Math.sin(t) ** 2 + 1);
    return [x, 300, z];
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

function updateRemainingBirdsCount(length) {
    const remainingBirdsElement = document.getElementById('remaining-birds-count');
    remainingBirdsElement.textContent = length;
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
    const boxProgramInfo = twgl.createProgramInfo(gl, [boxVS, boxFS]);

    const height = 300;
    const numCurves = 4;
    
    const curves = [(t) => bezier(p0, p1, p2, p3, t, 0),
                (t) => bezier(p3, p4, p5, p6, t, 1),
                (t) => bezier(p6, p7, p8, p9, t, 2),
                (t) => bezier(p9, p10, p11, p12, t, 3)];

    let p0 = [1257, height, -1716];
    let p1 = [1024, height, 914];
    let p2 = [-740, height, -1217];
    let p3 = [-828, height, 349];
    let p4 = [-872, height, 1132];
    let p5 = [-471, height, 2371];
    let p6 = [-102, height, 193];
    let p7 = [82, height, -895];
    let p8 = [148, height, -2184];
    let p9 = [966, height, -200];
    let p10 = [1376, height, 791];
    let p11 = [1728, height, 2006];
    let p12 = [136, height, 152];

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
        this.totalAnimationTime = 50;
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
        this.ballsSpeed = 650;
        this.ballsRadius = 10;
        this.birdsSpeed = 300;
    }

    let currentAnimationTime = 0;

    let gui = new dat.GUI();
    gui.add(controls, 't', 0, numCurves).listen();
    
    let controltotalAnimationTime = gui.add(controls, 'totalAnimationTime', 1, 100).name('animation time');
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
                    reset: function() { running=false; controls.t = 0; currentAnimationTime = 0; 
                        controls.cameraX = oldPosition[0];
                        controls.cameraY = oldPosition[1];
                        controls.cameraZ = oldPosition[2];
                        controls.target = oldTarget;},
                    lightconfig: function() { controls.lightx = 2, controls.lighty = -8, controls.lightz = -8;},
                    runDay: function() { runningDay = !runningDay;},
                    removeBalls: function() { balls = [];},
                    addBird: function() { createBird();},
                    removeBirds: function() { birds = [];},
    };
    gui.add(buttons,'play');
    gui.add(buttons,'pause');
    gui.add(buttons,'reset');
    gui.add(controls, 'ballsSpeed', 100, 1000).name('balls speed');
    gui.add(controls, 'lightx', -1000, 1000).name('light x').listen();
    gui.add(controls, 'lighty', -1000, 1000).name('light y').listen();
    gui.add(controls, 'lightz', -1000, 1000).name('light z').listen();
    gui.add(controls, 'cameraX', -1000, 1000).name('camera x').listen();
    gui.add(controls, 'cameraY', -200, 5000).name('camera y').listen();
    gui.add(controls, 'cameraZ', -1000, 1000).name('camera z').listen();
    gui.add(controls, 'cameraPanSpeed', 0, 3).name('camera pan speed');
    gui.add(buttons, 'runDay').name('run 24h cycle of light');
    let onChangeRunningDay = gui.add(controls, 'hour', 0, 24).listen();
    onChangeRunningDay.onChange(function(value) {
        const angle = degToRad((360 * value / 24) + 180);
        controls.lightx = Math.sin(angle) * 1000;
        controls.lighty = Math.cos(angle) * 1000;
        console.log(controls.lightx, controls.lighty);
    });
    gui.add(buttons, 'removeBalls').name('remove all balls');
    gui.add(buttons, 'addBird').name('add 1 bird');
    gui.add(buttons, 'removeBirds').name('remove all birds');


    canvas.addEventListener('mousemove', onMouseMove, false);
    canvas.addEventListener('mousedown',onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('keydown', onKeyDown, false);

    let isDragging = false;
    let lastMouseX = -1, lastMouseY = -1;

    function onMouseDown(event) {
        isDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
    
    function onMouseMove(event) {
        if (!isDragging && !running) return;
        
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Update camera position based on mouse movement (pan)
        controls.cameraX += deltaX * controls.cameraPanSpeed;
        controls.cameraY -= deltaY * controls.cameraPanSpeed;
        
        // Update the camera's target position
        controls.target[0] += deltaX * controls.cameraPanSpeed;
        controls.target[1] -= deltaY * controls.cameraPanSpeed;
        controls.target[2]
        
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
    
    function onMouseUp() {
        isDragging = false;
    }

    function onKeyDown(event) {        
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

    function createBall(position, velocity) {
        const ball = twgl.primitives.createSphereBufferInfo(gl, controls.ballsRadius, 64, 64);
        const ballWorldMatrix = m4.translation(position[0], position[1], position[2]);
        const color = chooseColor();
        const ballData = {
            ballInfo: ball,
            worldMatrix: ballWorldMatrix,
            velocity: velocity,
            color: color,
            lightColor: color,
            hitted: 0,
        };
        balls.push(ballData);
        return ballData;
    }

    function launchBall() {
        const startPosition = cameraPosition;
        let velocity;

        if (running) {
            const direction = m4.subtractVectors(controls.target, startPosition);
            velocity = m4.normalize(direction);
        } else {
            const targetPosition = [Math.random() * 1000 - 500, 0, Math.random() * 1000 - 500];
            const direction = m4.subtractVectors(targetPosition, startPosition);
            velocity = m4.normalize(direction);
        }

        const isPlaying = playAudioFile('data/audios/shot.mp3', 0.2);
        if (isPlaying) {
            if (balls.length >= 5){
                balls.splice(0, 1);
            }
            createBall(startPosition, velocity);
        }
        playAudioFile('data/audios/reload.mp3', 0.4);
    }

    let ballsLastTime = 0;

    function updateBalls(time) {
        const deltaTime = time - ballsLastTime;
        ballsLastTime = time;
        for (let i = balls.length - 1; i >= 0; i--) {
            const ballData = balls[i];
            if (ballData.worldMatrix[13] == -100) continue;
            ballData.velocity = m4.normalize(ballData.velocity); 
            const translation = mulScalar(ballData.velocity, controls.ballsSpeed * deltaTime);
            ballData.worldMatrix = m4.translate(ballData.worldMatrix, translation[0], translation[1], translation[2]);

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
                ballData.color = chooseColor();
                ballData.lightColor = ballData.color;
            }
            if (ballData.hitted > 10) {      
                ballData.worldMatrix[13] = -100;
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
    
    let birds = [];
    async function createBird(position = null, isStatic = false) {
        let center;
        position ? center = position : center = [Math.random() * 5000 - 2500, 300, Math.random() * 5000 - 2500];
        let bird = await loadObject('models/bird/bird.obj', gl, birdProgramInfo);
        const worldMatrix = m4.translation(center[0], center[1], center[2]);
        const color = chooseColor();

        bird.worldMatrix = worldMatrix;
        bird.color = color;
        bird.center = center;
        bird.isStatic = isStatic;
        bird.box = createFrameBox(bird);
        birds.push(bird);
        return bird;
    }

    let birdsLastTime = 0;

    function updateBirds(time) {
        const deltaTime = time - birdsLastTime;
        birdsLastTime = time;
        for (let i = birds.length - 1; i >= 0; i--) {
            const birdData = birds[i];
            if (birdData.isStatic) continue;
            birdData.worldMatrix = m4.translate(birdData.worldMatrix, 0, 0, controls.birdsSpeed * deltaTime);
            if (birdData.worldMatrix[14] > 4096) {
                birdData.worldMatrix[14] = -4096;
            }
            updateBox(birdData);
        }
    }

    let boxes = [];

    function createFrameBox(bird){
        gl.useProgram(boxProgramInfo.program);
        const birdWorldMatrix = bird.worldMatrix;
        const birdBox = twgl.primitives.createCubeBufferInfo(gl, 100);
        const birdBoxWorldMatrix = m4.translation(birdWorldMatrix[12], birdWorldMatrix[13], birdWorldMatrix[14]);
        const birdBoxData = {
            birdBoxInfo: birdBox,
            worldMatrix: birdBoxWorldMatrix,
            width: 100,
        };
        boxes.push(birdBoxData);
        return birdBoxData;
    }

    function drawBoxes(sharedUniforms) {
        gl.useProgram(boxProgramInfo.program);
        for (let i = boxes.length - 1; i >= 0; i--) {
            const birdBoxData = boxes[i];
            twgl.setBuffersAndAttributes(gl, boxProgramInfo, birdBoxData.birdBoxInfo);
            twgl.setUniforms(boxProgramInfo, {
                u_world: birdBoxData.worldMatrix,
                u_color: [1, 0, 0, 0.6],
            });
            twgl.setUniforms(boxProgramInfo, sharedUniforms);
            twgl.drawBufferInfo(gl, birdBoxData.birdBoxInfo);
        }
    }

    function updateBox(birdData) {
        const birdWorldMatrix = birdData.worldMatrix;
        birdData.box.worldMatrix = m4.translation(birdWorldMatrix[12], birdWorldMatrix[13], birdWorldMatrix[14]);
    }

    function drawBirds(sharedUniforms) {
        for (let i = birds.length - 1; i >= 0; i--) {
            const birdData = birds[i];
            gl.useProgram(birdProgramInfo.program);
            for ( const { bufferInfo, vao, material } of birdData) {
                gl.bindVertexArray(vao);
                twgl.setUniforms(birdProgramInfo, {
                    u_world: birdData.worldMatrix,
                    u_color: birdData.color,
                }, material);
                twgl.setUniforms(birdProgramInfo, sharedUniforms);
                twgl.drawBufferInfo(gl, bufferInfo);
            }
        }
    }

    function checkCollisions() {
        for (let i = balls.length - 1; i >= 0; i--) {
            const ballPosition = [balls[i].worldMatrix[12], balls[i].worldMatrix[13], balls[i].worldMatrix[14]];
    
            for (let j = birds.length - 1; j >= 0; j--) {
                const birdBox = birds[j].box;
                const birdBoxPosition = [birdBox.worldMatrix[12], birdBox.worldMatrix[13], birdBox.worldMatrix[14]];
    
                // Check for AABB collision
                if (
                    ballPosition[0] - controls.ballsRadius < birdBoxPosition[0] + birdBox.width / 2 &&
                    ballPosition[0] + controls.ballsRadius > birdBoxPosition[0] - birdBox.width / 2 &&
                    ballPosition[1] - controls.ballsRadius < birdBoxPosition[1] + birdBox.width / 2 &&
                    ballPosition[1] + controls.ballsRadius > birdBoxPosition[1] - birdBox.width / 2 &&
                    ballPosition[2] - controls.ballsRadius < birdBoxPosition[2] + birdBox.width / 2 &&
                    ballPosition[2] + controls.ballsRadius > birdBoxPosition[2] - birdBox.width / 2
                ) {
                    birds.splice(j, 1);
                    boxes.splice(j, 1);
                }
            }
        }
    }
    
    for (let i = 0; i < 10; i++) await createBird();

    let oldPosition = null;
    let oldTarget = null;

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
            oldPosition = null;
            oldTarget = null;
        } else {
            if (oldPosition == null) {
                oldPosition = cameraPosition; 
                oldTarget = controls.target;
            }
            currentAnimationTime += deltaTime;
            if (currentAnimationTime > controls.totalAnimationTime) {
                currentAnimationTime = 0;
            }
            controls.t = (currentAnimationTime / controls.totalAnimationTime) * numCurves;
            if (controls.t > numCurves) controls.t = numCurves;
            cameraPosition = curves[curveNum](controls.t);
            controls.target = curves[curveNum](controls.t + 0.01);
            controls.cameraX = cameraPosition[0];
            controls.cameraY = cameraPosition[1];
            controls.cameraZ = cameraPosition[2];
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
        const zFar = 10000;
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
            createBall([0,-100,0], [0,0,0]);
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
            u_ambientLightIntensity: 0.1,
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

        updateBirds(time);
        updateBalls(time); 
        checkCollisions();
        drawBirds(sharedUniforms, time);
        // drawBoxes(sharedUniforms); 
        drawBalls(sharedUniforms);

        updateRemainingBirdsCount(birds.length);       
        
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