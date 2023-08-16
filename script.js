import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

const axesHelper = new THREE.AxesHelper( 5 );

const canvas = document.getElementById('canvas');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
const renderer = new THREE.WebGLRenderer({canvas: canvas});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor( 0xffffff, 1 );
document.body.appendChild( renderer.domElement );
scene.add( axesHelper );

const light = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( light );

const directedLight = new THREE.DirectionalLight( 0xffffff, 10 );
directedLight.position.set( 0, 1, 0 );
scene.add( directedLight );


const spotLight = new THREE.SpotLight( 0xffffff );
spotLight.position.set( 100, 1000, 100 );
scene.add( spotLight );


async function loadObject(path) {
  return new Promise((resolve, reject) => {
    const mtlLoader = new MTLLoader();
    mtlLoader.load('shop/botcher shop.mtl', function (materials) {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load('shop/botcher shop.obj', function (object) {
        loadedObject = object;
        scene.add(object);
        resolve(object); // Resolve the Promise with the loaded object
      }, null, reject);
    });
  });
}

var loadedObject = await loadObject('shop/botcher shop.obj');

loadedObject.translateZ(-3);
loadedObject.translateX(-4);
loadedObject.rotateY(degToRad(-45));

const floorSize = 15;

const floorTexture = new THREE.TextureLoader().load('shop/floor.jpg');

floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set( floorSize/3, floorSize/3 );

const planeMesh = new THREE.Mesh(
  new THREE.PlaneGeometry( floorSize, floorSize, 1, 1 ),
  new THREE.MeshBasicMaterial( { map: floorTexture } )
);

planeMesh.rotateX( - Math.PI / 2 );
console.log(loadedObject.position);
console.log(planeMesh.position);
planeMesh.TranslateZ = loadedObject.position.z;
planeMesh.TranslateY = loadedObject.position.y
planeMesh.TranslateX = loadedObject.position.x
console.log(planeMesh.position);
scene.add( planeMesh );


var p0 = [0.29, 0.94, 0];
var p1 = [1.95, 3.35, 0];
var p2 = [1.74, 1.79, 0];
var p3 = [2.52, 2.83, 0];
var p4 = [2.91, 3.35, 0];
var p5 = [3.35, 4.24, 0];
var p6 = [4.39, 3.79, 0];
var p7 = [4.91, 3.57, 0];
var p8 = [5.33, 3.11, 0];
var p9 = [5.85, 4.05, 0];
var p10 = [6.11, 4.52, 0];
var p11 = [6.27, 5.10, 0];
var p12 = [7.82, 4.45, 0];

const curve1 = new THREE.CubicBezierCurve3(
	new THREE.Vector3( p0[0], p0[1], p0[2] ),
	new THREE.Vector3( p1[0], p1[1], p1[2] ),
  new THREE.Vector3( p2[0], p2[1], p2[2] ),
  new THREE.Vector3( p3[0], p3[1], p3[2] ),
);

const curve2 = new THREE.CubicBezierCurve3(
  new THREE.Vector3( p3[0], p3[1], p3[2] ),
  new THREE.Vector3( p4[0], p4[1], p4[2] ),
  new THREE.Vector3( p5[0], p5[1], p5[2] ),
  new THREE.Vector3( p6[0], p6[1], p6[2] ),
);

const curve3 = new THREE.CubicBezierCurve3(
  new THREE.Vector3( p6[0], p6[1], p6[2] ),
  new THREE.Vector3( p7[0], p7[1], p7[2] ),
  new THREE.Vector3( p8[0], p8[1], p8[2] ),
  new THREE.Vector3( p9[0], p9[1], p9[2] ),
);

const curve4 = new THREE.CubicBezierCurve3(
  new THREE.Vector3( p9[0], p9[1], p9[2] ),
  new THREE.Vector3( p10[0], p10[1], p10[2] ),
  new THREE.Vector3( p11[0], p11[1], p11[2] ),
  new THREE.Vector3( p12[0], p12[1], p12[2] ),
);

function drawCurve(curve) {
  const points = curve.getPoints( 50 );
  const geometry = new THREE.BufferGeometry().setFromPoints( points );
  const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
  const curveObject = new THREE.Line( geometry, material );
  scene.add( curveObject );
}

drawCurve(curve1);
drawCurve(curve2);
drawCurve(curve3);
drawCurve(curve4);


camera.position.z = 4;
camera.position.x = 8;
camera.position.y = 8;



function animate() {
  var time = Date.now() * 0.001;
  // console.log('animating');
  requestAnimationFrame( animate );

  // camera.position.x = 10 * Math.sin( degToRad( time * 10 ) );
  // camera.position.z = 10 * Math.cos( degToRad( time * 10 ) );
  camera.lookAt( loadedObject.position );

  renderer.render( scene, camera );
}
animate();


