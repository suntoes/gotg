/*__crafted with <3 by suntoes for Maya Chess__*/

import { OrbitControls } from './gotg-lib/orbit-controls.js'
import * as utils from './gotg-lib/game-maths.js'
import * as loaders from './gotg-lib/model-loader.js'
import PieceHelper from './gotg-lib/piece_structure/index.js'
import { FENLoader, convertToFEN } from './gotg-lib/board-loader.js'

let container = document.getElementById('gotg-board')
let renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
let camera = new THREE.PerspectiveCamera(
  70,
  container.clientWidth / container.clientHeight,
  0.01,
  100
)

let scene = new THREE.Scene()
let raycaster = new THREE.Raycaster()
let mouseClick = new THREE.Vector2()
let isCastingRay = false
let selectedPiece
let moveSet = []

let tileSize = 1
let darkTone = 0x808080
let lightTone = 0xfafafa

let TileUUIDs = new Set()
let BoardState = 
  JSON.parse(localStorage.getItem('game-of-the-gods-session'))
  || FENLoader() 

const rmvDash = str => str.split("-")[0] || ""

const handleWindowResize = () => {
  const {clientWidth, clientHeight} = container
  if(clientWidth && clientHeight && camera) {
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(clientWidth,clientHeight)
  }
}

const updateGui = boardState => {
  const gui = document.getElementById('gotg-gui')
  const { remainingMoves, currentTurn } = utils.TurnCountToSystem(boardState.turnCount)
  let announcement = 
    boardState.winner
    ? boardState.winner === 'l'
      ? 'Light won the game'
      : 'Dark won the game'
    : (currentTurn === 'l' ? 'light' : 'dark')
      + ' to move ' + remainingMoves + 'x'
  
  gui.innerText = announcement
}

const init = () => {
  Promise.all([
    loaders.ModelLoaderOBJ('./gotg-models/temple.obj'), // 0
    loaders.ModelLoaderOBJ('./gotg-models/leader.obj'),
    loaders.ModelLoaderOBJ('./gotg-models/defender.obj'),
    loaders.ModelLoaderOBJ('./gotg-models/captain.obj'),
    loaders.ModelLoaderOBJ('./gotg-models/guardian.obj'), // 4
    loaders.ModelLoaderOBJ('./gotg-models/attacker.obj'),
    loaders.ModelLoaderOBJ('./gotg-models/attacker-1.obj'),
    loaders.ModelLoaderOBJ('./gotg-models/attacker-2.obj'),
    loaders.ModelLoaderOBJ('./gotg-models/defender-1.obj'), // 8
      loaders.ModelLoaderOBJ('./gotg-models/board.obj')
  ]).then(Meshes => {
      let piece
      let isBlack

      const GeneratePiece = (meshIndex, cp, variation = 0) => {
        isBlack = cp === cp.toUpperCase() // our board is coded so that uppercase represents black pieces
        piece = Meshes[meshIndex].clone()
          // piece.rotateY(utils.DegToRad(30));
          piece.scale.divide(new THREE.Vector3(1, 1, 1)) // downscales the piece by dimensions of n
          // @ts-ignore
          piece.material = new THREE.MeshPhongMaterial({
          color: isBlack ? darkTone : lightTone,
          side: THREE.DoubleSide,
          reflectivity: 0.5
        })
        piece.name = cp + (variation ? '-' + variation : '')
        piece.castShadow = true //default is false
        piece.receiveShadow = false //default
        scene.add(piece)
      }

      // Generate all temples and board
      GeneratePiece(9, 'board')
      GeneratePiece(0, 'tmp')
      GeneratePiece(0, 'tmp', 1)
      GeneratePiece(0, 'TMP')
      GeneratePiece(0, 'TMP', 1)

      // Generate all possible pieces including variations
      for (let piece in BoardState.pieces) {
        switch (piece) {
        case 'l':
        case 'L':
          GeneratePiece(1, piece)
          break
        case 'd':
        case 'D':
          GeneratePiece(2, piece)
          GeneratePiece(8, piece, 1)
          break
        case 'c':
        case 'C':
          GeneratePiece(3, piece)
          break
        case 'g':
        case 'G':
          GeneratePiece(4, piece)
          break
        case 'a':
        case 'A':
          GeneratePiece(5, piece)
          GeneratePiece(6, piece, 1)
          GeneratePiece(7, piece, 2)
          break
        default:
          break
        }
      }

//      setIsLoading(false)
        updateGui(BoardState)
    })

  const containerRatio = container.clientWidth / container.clientHeight
  camera.position.z = containerRatio > 1.1 ? 0 : 6.49
  camera.position.y = containerRatio > 1.1 ? 30 : 30
  camera.position.x = containerRatio > 1.1 ? 1.49 : 1
  camera.zoom = containerRatio > 1.1 ? 1.9 : 1.3
  camera.fov = 70
  camera.updateProjectionMatrix()

  // Create the board
  let count = 0
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 8; j++) {
      const vertices = [1, 1, 1, -1, 1, -1, 1, -1, -1]

      const indices = [2, 1, 0]
      const tileGeom = new THREE.PolyhedronGeometry(
        vertices,
        indices,
        tileSize,
        0
      )
      const material = new THREE.MeshPhongMaterial({
        color: i % 2 ? lightTone : darkTone,
        side: THREE.DoubleSide,
        wireframe: false
      })
      const tileMesh = new THREE.Mesh(tileGeom, material)

      tileMesh.name = 'tile-' + count
      count++

      // Fixed for custom board
      tileMesh.rotateX(utils.DegToRad(i % 2 ? 35 : 55)) // 35, 45
      tileMesh.rotateY(utils.DegToRad(i % 2 ? 0 : 45)) // 0, 45
      tileMesh.rotateZ(utils.DegToRad(i % 2 ? 45 : 0)) // 45, 0

      // Fixed for board to center
      tileMesh.position.set(
        i * tileSize * 0.8125 - j * tileSize * 0.8125 + 0.25,
        -0.5 / 2,
        j * tileSize * 1.41 + (i % 2 ? 0 : 0.47) - 1.67
      )
      tileMesh.receiveShadow = true

      scene.add(tileMesh)
      TileUUIDs.add(tileMesh.uuid)
    }
  }

  const color = 0xffffff
  const intensity = 1
  const light = new THREE.DirectionalLight(color, intensity)
  light.position.set(15, 10, 10)
  //Set up shadow properties for the light
  light.shadow.mapSize.width = 2024 // default
  light.shadow.mapSize.height = 2024 // default
  light.shadow.camera.near = 1 // default
  light.shadow.camera.far = 50 // default
  light.shadow.camera.right = -20
  light.shadow.camera.left = 20
  light.shadow.camera.top = -20
  light.shadow.camera.bottom = 20
  // light.target.position.set(-5, 0, 0);
  light.castShadow = true // default false
  scene.add(light)
  scene.add(light.target)

  scene.add(new THREE.AmbientLight(0x404040))
  scene.background = null

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap // default THREE.PCFShadowMap

  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setAnimationLoop(updateFunc)

  const _container = container
  if (_container) {
    _container.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, _container)
    controls.target.set(3.5, 0, 3.5)
    controls.update()
  }

  window.addEventListener('click', onMouseClick, false)
}

function onMouseClick(event) {
  mouseClick.x = (event.clientX / container.clientWidth) * 2 - 1
  mouseClick.y = -(event.clientY / container.clientHeight) * 2 + 1
  isCastingRay = true
}

let funcIsNotLoaded = true
// pieces get placed on the board
const updateFunc = time => {
  BoardState = BoardState

  // some board function passed to state provided
  if (funcIsNotLoaded) {

    const resetThis = () => {
      BoardState = FENLoader()
      moveSet = []
      selectedPiece = null
      isCastingRay = false
      localStorage.removeItem('game-of-the-gods-session')
    }

    document.getElementById('gotg-reset').onclick = resetThis
    funcIsNotLoaded = false
  }

  // Set up the board
  for (let i = 0; i < scene.children.length; i++) {
    const child = scene.children[i]

    if (rmvDash(child.name) === 'tile') {
      // Tile condition
      const isLight = (Math.floor(i / 8) * 7) % 2
      if (moveSet.some(move => move.indexes.includes(i))) child.material.color.set(0xff4545) // shows possible moves
      else if (child.material)  child.material.color.set(isLight ? lightTone : darkTone) // @ts-ignore
    } else if (rmvDash(child.name).toLowerCase() === 'tmp') {

      let templeIndex
      switch (child.name) {
        case 'tmp':
          templeIndex = 7
          break
        case 'tmp-1':
          templeIndex = 52
          break
        case 'TMP':
          templeIndex = 120
          break
        case 'TMP-1':
          templeIndex = 75
          break
        default:
          templeIndex = -1
         break
      }
      child.position.y = 0.075
      child.position.x = scene.children[templeIndex].position.x
      child.position.z = scene.children[templeIndex].position.z
    } else if (child.name === 'board') {
      //Board condition
      child.rotation.y = utils.DegToRad(30)
      child.position.x = 3.5
      child.position.y = 0.05
      child.position.z = 3.5
      child.material.color.set(0xb0b0b0)
    } else if (child.material) {
      // Piece condition
      const name = rmvDash(child.name)
      const _variation = Number(child.name.split('-')[1]) || 0
      const { base, indexes, variation, rotateY } = BoardState.pieces[name]
      // const isShown = name === "a" && _variation === variation
      const isShown = _variation === variation

      child.position.y = isShown ? 0.0875 : 999
      child.position.x = scene.children[base].position.x
      child.position.z = scene.children[base].position.z
      child.material.visible = isShown
      child.material.transparent = true
      // Lift chess piece on select or not
      if (name === selectedPiece) {
        child.material.opacity = Math.round(Math.abs(Math.sin(time/400)) * 100)/100
        // child.position.y = 3 + Math.sin(time / 200) / 10
        // child.rotation.y += 1 / 50
      } else {
        child.rotation.y = utils.DegToRad(rotateY)
        child.material.opacity = 1
        }
      }
  }

  // Handle clicks
  if (isCastingRay && !BoardState.winner) {
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouseClick, camera)

    // calculate objects intersecting the picking ray
    const intersects = raycaster
      .intersectObjects(scene.children)
      .filter(({object}) => rmvDash(object.name) !== 'tmp')

    const pieceIntersects = intersects
      .filter(({ object }) =>
        rmvDash(object.name) !== 'tile' 
        && object.name !== 'board'
      )
    const nearestPieceIntersect = pieceIntersects[0]
    const nearestIntersect = intersects[0]?.object?.name || ""
    const nearestInteresectIsTile = rmvDash(nearestIntersect) === 'tile'
    const possibleTileNumber = Number(nearestIntersect.split('-')[1] || -1)
    const possibleMove = moveSet.filter(move => move.indexes.includes(possibleTileNumber))[0]

    if (nearestInteresectIsTile && possibleMove) { // If valid move
      BoardState.pieces[selectedPiece] = {
        base: possibleMove.base,
        indexes: possibleMove.indexes,
        restrict: possibleMove?.restrict || [],
        variation: possibleMove.variation,
        rotateY:
        BoardState.pieces[selectedPiece].rotateY + possibleMove.rotateY
      }
      BoardState.turnCount = BoardState.turnCount + 1
      BoardState.winner =
        utils.DetectWinByTemple(BoardState) ||
        utils.DetectWinByCrush(BoardState) ||
        utils.DetectWinByTrap(BoardState)

      selectedPiece = undefined
      moveSet = []
      updateGui(BoardState)
      localStorage.setItem('game-of-the-gods-session', JSON.stringify(BoardState))
    } else if (nearestPieceIntersect) { // If player picked a piece
      const select = rmvDash(nearestPieceIntersect.object.name)
      const { currentTurn: turn } = utils.TurnCountToSystem(
        BoardState.turnCount
      )

      const turnPieceIsPicked =
        (turn === 'l' && PieceHelper.isLight(select)) 
          || (turn === 'd' && PieceHelper.isDark(select))
      //|| true
      if (turnPieceIsPicked) { // If picked piece is equal to turn side
        const tmpSelectedPiece = rmvDash(nearestPieceIntersect.object.name)
        const rawMoveSet = PieceHelper.getMoveSet(tmpSelectedPiece, BoardState)
        const validatedMoveSet = utils.ValidateMoveSet(
          tmpSelectedPiece,
          rawMoveSet,
          BoardState 
        )

        if(typeof(validatedMoveSet) === "object") {
          selectedPiece = tmpSelectedPiece
          moveSet = validatedMoveSet
        } else {
          // Once validatedMoveset is falsey, it returns new id of piece on temple/needs to be moved
          const newTmpSelectedPiece = validatedMoveSet
          const newRawMoveSet = PieceHelper.getMoveSet(newTmpSelectedPiece, BoardState)
          const newValidatedMoveSet = utils.ValidateMoveSet(
            newTmpSelectedPiece,
            newRawMoveSet,
            BoardState
          )

          if(typeof(newValidatedMoveSet) === "object") {
            moveSet = newValidatedMoveSet
            selectedPiece = newTmpSelectedPiece
          }
        }
      }
    } else if (intersects.length) {
      // If player cliked to nothing
      // selectedPiece = undefined
      // moveSet = []
          
      // Uncomment at your own risk, it will cause a bug
    }

    isCastingRay = false
  }

  renderer.setClearColor(0xffffff, 0)
  renderer.render(scene, camera)
}

init()

window.removeEventListener('resize', handleWindowResize)
window.addEventListener('resize', handleWindowResize, false)
