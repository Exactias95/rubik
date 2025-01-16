/*
Andrea Dainese
Alan Bimbati
Fabrizio Ceravolo
*/
function Rubik(element, dimensions, background)
 {

  dimensions = dimensions || 3;
  background = background || 0x303030;

  var width = element.innerWidth(),
      height = element.innerHeight();

  var debug = false;

  /*** three.js boilerplate ***/
  var scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000),
      renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setClearColor(background, 1.0);
  renderer.setSize(width, height);
  renderer.shadowMapEnabled = true;
  element.append(renderer.domElement);

  camera.position = new THREE.Vector3(-20, 20, 30);
  camera.lookAt(scene.position);
  THREE.Object3D._threexDomEvent.camera(camera);
  
  
  //carico la texture per la skybox
  SkyBoxTexture=new THREE.TextureLoader().load('Texture/color2.jpg' );
	SBT=new THREE.MeshBasicMaterial( { map: SkyBoxTexture,side:THREE.BackSide } );
	BoxGeo = new THREE.SphereGeometry(100,750,750);
	skybox = new THREE.Mesh(BoxGeo, SBT);
  //Luci
  scene.add(new THREE.AmbientLight(0xffffff));
  //aggiungo la skybox alla scena
  scene.add(skybox);
  //Controlli Camera
  var orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
  //Abilita la rotazione della camera
  function enableCameraControl() 
  {
    orbitControl.noRotate = false;
  }
  //Disabilita la rotazione della camera
  function disableCameraControl()
  {
    orbitControl.noRotate = true;
  }

  //Aggiungo gli assi  
  if(debug) {
    scene.add(new THREE.AxisHelper( 20 ));
  }


  //Prendo come grandezza della scena la largezza e l'altezza dello scermo
  var SCREEN_HEIGHT = window.innerHeight;
  var SCREEN_WIDTH = window.innerWidth;

  var raycaster = new THREE.Raycaster(),
  projector = new THREE.Projector();
  
  
  //Funzione per far ruotare i cubi
  function isMouseOverCube(mouseX, mouseY) {
    var directionVector = new THREE.Vector3();
	//normalizzazione 
    var x = ( mouseX / SCREEN_WIDTH ) * 2 - 1;
    var y = -( mouseY / SCREEN_HEIGHT ) * 2 + 1;

    directionVector.set(x, y, 1);

    projector.unprojectVector(directionVector, camera);
    directionVector.sub(camera.position);
    directionVector.normalize();
    raycaster.set(camera.position, directionVector);

    return raycaster.intersectObjects(allCubes, true).length > 0;
  }

  //Ritorna l'asse per il vettore v
  function principalComponent(v) {
    var maxAxis = 'x',
        max = Math.abs(v.x);
    if(Math.abs(v.y) > max) {
      maxAxis = 'y';
      max = Math.abs(v.y);
    }
    if(Math.abs(v.z) > max) {
      maxAxis = 'z';
      max = Math.abs(v.z);
    }
    return maxAxis;
  }


  //Ogni volta che sposto il mouse verso il basso creo un vettore che posso utilizzare per il verso della rotazione
  var clickVector, clickFace;

  //Tiene traccia dell'ultimo movimento valido
  var lastCube;

  var onCubeMouseDown = function(e, cube) {
    disableCameraControl();

    //Controlla se il movimento è valido
    if(true || !isMoving) {
      clickVector = cube.rubikPosition.clone();
      
      var centroid = e.targetFace.centroid.clone();
      centroid.applyMatrix4(cube.matrixWorld);

      //controllo su quale faccia ho cliccato
      if(nearlyEqual(Math.abs(centroid.x), maxExtent))
        clickFace = 'x';
      else if(nearlyEqual(Math.abs(centroid.y), maxExtent))
        clickFace = 'y';
      else if(nearlyEqual(Math.abs(centroid.z), maxExtent))
        clickFace = 'z';    
    }  
  };

  //Matrice degli assi che utilizzo per ogni azione di rotazione
  //    F a c e
  // D    X Y Z
  // r  X - Z Y
  // a  Y Z - X
  // g  Z Y X -
  var transitions = {
    'x': {'y': 'z', 'z': 'y'},
    'y': {'x': 'z', 'z': 'x'},
    'z': {'x': 'y', 'y': 'x'}
  }

  var onCubeMouseUp = function(e, cube) {

    if(clickVector) {
      var dragVector = cube.rubikPosition.clone();
      dragVector.sub(clickVector);

      //In caso che il vettore creato col click del mouse sia troppo piccolo annulla l'azione
      if(dragVector.length() > cubeSize) {

        //Rotazione
        var dragVectorOtherAxes = dragVector.clone();
        dragVectorOtherAxes[clickFace] = 0;

        var maxAxis = principalComponent(dragVectorOtherAxes);

        var rotateAxis = transitions[clickFace][maxAxis],
            direction = dragVector[maxAxis] >= 0 ? 1 : -1;
        
        //Inverture la dirazione della rotazione per comandi più intuitivi
        if(clickFace == 'z' && rotateAxis == 'x' || 
           clickFace == 'x' && rotateAxis == 'z' ||
           clickFace == 'y' && rotateAxis == 'z')
          direction *= -1;

        if(clickFace == 'x' && clickVector.x > 0 ||
           clickFace == 'y' && clickVector.y < 0 ||
           clickFace == 'z' && clickVector.z < 0)
          direction *= -1;

        pushMove(cube, clickVector.clone(), rotateAxis, direction);
        startNextMove();
        enableCameraControl();
      } else {
        console.log("Drag me some more please!");
      }
    }
  };

  //In caso il vettore rotazione è fuori dal cubo sposto la camera
  var onCubeMouseOut = function(e, cube) {
    lastCube = cube;
  }

  element.on('mouseup', function(e) {
    if(!isMouseOverCube(e.clientX, e.clientY)) {
      if(lastCube)
        onCubeMouseUp(e, lastCube);
    }
  });

  //costruisco i 27 cubi
  //vettore utilizzato per colorare le 6 faccie dei cubi in modo diverso
  var colours = [0xC41E3A, 0x009E60, 0x0051BA, 0xFF5800, 0xFFD500, 0xFFFFFF],
      faceMaterials = colours.map(function(c) {
        return new THREE.MeshLambertMaterial({ color: c , ambient: c });
      }),
      cubeMaterials = new THREE.MeshFaceMaterial(faceMaterials);

  var cubeSize = 3,
      spacing = 0.5;

  var increment = cubeSize + spacing,
      maxExtent = (cubeSize * dimensions + spacing * (dimensions - 1)) / 2, 
      allCubes = [];

  function newCube(x, y, z) {
    var cubeGeometry = new THREE.CubeGeometry(cubeSize, cubeSize, cubeSize);
    var cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
    cube.castShadow = true;

    cube.position = new THREE.Vector3(x, y, z);
    cube.rubikPosition = cube.position.clone();

    cube.on('mousedown', function(e) {
      onCubeMouseDown(e, cube);
    });

    cube.on('mouseup', function(e) {
      onCubeMouseUp(e, cube);
    });

    cube.on('mouseout', function(e) {
      onCubeMouseOut(e, cube);
    });

    scene.add(cube);
    allCubes.push(cube);
  }
  //posizionamento dei cubi
  var positionOffset = (dimensions - 1) / 2;
  for(var i = 0; i < dimensions; i ++) {
    for(var j = 0; j < dimensions; j ++) {
      for(var k = 0; k < dimensions; k ++) {

        var x = (i - positionOffset) * increment,
            y = (j - positionOffset) * increment,
            z = (k - positionOffset) * increment;

        newCube(x, y, z);
      }
    }
  }

  //Tratto la transizione degli stati

  var moveEvents = $({});

  //Mantiene in coda le azione fatte per risolvere il cubo quando si clicca su solve
  var moveQueue = [],
      completedMoveStack = [],
      currentMove;

  //controlla se siamo propio in mezzo a una transizione
  var isMoving = false,
      moveAxis, moveN, moveDirection,
      rotationSpeed = 0.2;

  var pivot = new THREE.Object3D(),
      activeGroup = [];

  function nearlyEqual(a, b, d) {
    d = d || 0.001;
    return Math.abs(a - b) <= d;
  }

  //selezione il piano per il clickVector per gli assi 
  function setActiveGroup(axis) {
    if(clickVector) {
      activeGroup = [];

      allCubes.forEach(function(cube) {
        if(nearlyEqual(cube.rubikPosition[axis], clickVector[axis])) { 
          activeGroup.push(cube);
        }
      });
    } else {
      console.log("Nothing to move!");
    }
  }

  var pushMove = function(cube, clickVector, axis, direction) {
    moveQueue.push({ cube: cube, vector: clickVector, axis: axis, direction: direction });
  }

  var startNextMove = function() {
    var nextMove = moveQueue.pop();

    if(nextMove) {
      clickVector = nextMove.vector;
      
      var direction = nextMove.direction || 1,
          axis = nextMove.axis;

      if(clickVector) {

        if(!isMoving) {
          isMoving = true;
          moveAxis = axis;
          moveDirection = direction;

          setActiveGroup(axis);

          pivot.rotation.set(0,0,0);
          pivot.updateMatrixWorld();
          scene.add(pivot);

          activeGroup.forEach(function(e) {
            THREE.SceneUtils.attach(e, scene, pivot);
          });

          currentMove = nextMove;
        } else {
          console.log("Already moving!");
        }
      } else {
        console.log("Nothing to move!");
      }
    } else {
      moveEvents.trigger('deplete');
    }
  }

  function doMove() {
    //mi blocco la rotazione "come se fosse uno scatto del vero cubo"
    if(pivot.rotation[moveAxis] >= Math.PI / 2) {
      pivot.rotation[moveAxis] = Math.PI / 2;
      moveComplete();
    } else if(pivot.rotation[moveAxis] <= Math.PI / -2) {
      pivot.rotation[moveAxis] = Math.PI / -2;
      moveComplete()
    } else {
      pivot.rotation[moveAxis] += (moveDirection * rotationSpeed);
    }
  }

  var moveComplete = function() {
    isMoving = false;
    moveAxis, moveN, moveDirection = undefined;
    clickVector = undefined;

    pivot.updateMatrixWorld();
    scene.remove(pivot);
    activeGroup.forEach(function(cube) {
      cube.updateMatrixWorld();

      cube.rubikPosition = cube.position.clone();
      cube.rubikPosition.applyMatrix4(pivot.matrixWorld);

      THREE.SceneUtils.detach(cube, pivot, scene);
    });

    completedMoveStack.push(currentMove);

    moveEvents.trigger('complete');

    startNextMove();
  }


  function render() {

    if(isMoving) {
      doMove();
    } 

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  render();

  //Public API
  return {
    shuffle: function() {
      function randomAxis() {
        return ['x', 'y', 'z'][randomInt(0,2)];
      }

      function randomDirection() {
        var x = randomInt(0,1);
        if(x == 0) x = -1;
        return x;
      }

      function randomCube() {
        var i = randomInt(0, allCubes.length - 1);
        return allCubes[i];
      }

      var nMoves = randomInt(10, 40);
      for(var i = 0; i < nMoves; i ++) {
        var cube = randomCube();
        pushMove(cube, cube.position.clone(), randomAxis(), randomDirection());
      }

      startNextMove();
    },

    //utilizza la coda di azione svolte per risolvere il cubo quanto si clicca su "risolvi"
    solve: function() {
      if(!isMoving) {
        completedMoveStack.forEach(function(move) {
          pushMove(move.cube, move.vector, move.axis, move.direction * -1);
        });

        completedMoveStack = [];

        moveEvents.one('deplete', function() {
          completedMoveStack = [];
        });

        startNextMove();
      }
    },

    //Rivede l'ultima rotazione
    undo: function() {
      if(!isMoving) {
        var lastMove = completedMoveStack.pop();
        if(lastMove) {
          //Clona
          var stackToRestore = completedMoveStack.slice(0);
          pushMove(lastMove.cube, lastMove.vector, lastMove.axis, lastMove.direction * -1);

          moveEvents.one('complete', function() {
            completedMoveStack = stackToRestore;
          });

          startNextMove();
        }
      }
    }
  }
}

