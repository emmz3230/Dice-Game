import {CannonDice} from "./cannon-dice.js"
import {computeDiceHands} from "./bar-dice-hand.js"
//import {computeDiceHands} from "./10k-dice-hand.js"
import {ThrowIndicator,TimeIndicator} from "./throw-indicator.js"

export async function SimpleDice({THREE, renderer, scene, camera, raycasting, glbLoader, events, config}) {

    let diceUrl = config.diceUrl || `./assets/d6.glb`
    let diceGLB = await glbLoader.loadAsync(diceUrl);
    let die = diceGLB.scene;
    die.scale.multiplyScalar(config.diceScale)
    die.traverse(e => {
        if (e.isMesh) {
            e.castShadow = e.receiveShadow = true;
            if (config.diceRoughness !== undefined)
                e.material.roughness = config.diceRoughness;
            if (config.diceMetalness !== undefined)
                e.material.metalness = config.diceMetalness;
        }
    }
    )
    let vec3 = THREE.Vector3;
    let positions = [new vec3(0,2,0), new vec3(3,0,0), new vec3(-3,0,0), new vec3(1.7,-3,0), new vec3(-1.7,-3,0), ];
/*
    let targetRotations = {
        '1': new vec3(0,3,0),
        '2': new vec3(2,0,0),
        '3': new vec3(0,0,0),
        '4': new vec3(0,3,1),
        '5': new vec3(1,1,0),
        '6': new vec3(1,0,3),
    }
    for (let k in targetRotations)
        targetRotations[k].multiplyScalar(Math.PI * .5);
*/
    let hiliteUrl = config.selectionMeshUrl || `./assets/d6_hilight.glb`
    let hiliteGLB = await glbLoader.loadAsync(hiliteUrl);
    let selectionMesh = hiliteGLB.scene.children[0];
    selectionMesh.material.side = THREE.BackSide;
    selectionMesh.material.emissive.set(config.selectionEmissive || '#0f0')
    selectionMesh.material.blending = THREE.AdditiveBlending;
    selectionMesh.scale.multiplyScalar(config.selectionMeshScale || 1.1);
    selectionMesh.position.set(0, 0, 0)
    /*new THREE.Mesh(new THREE.BoxGeometry(.51,.51,.51),new THREE.MeshBasicMaterial({
        color: '#0f0',
        side: THREE.BackSide
    }))*/

    let rrng = (mmin=0, mmax=1) => (Math.random() * (mmax - mmin)) + mmin

    let cannonDice = new CannonDice({
        renderer,
        scene,
        camera,
        diceModel: die,
        config
    })
    let cdice = cannonDice.diceArray;
    cdice.forEach(d => {
        d.selectionMesh = selectionMesh.clone();
        d.mesh.add(d.selectionMesh);
        d.selectionMesh.dice = d;
        d.selectionMesh.visible = false;
        d.state = 'stop';
    }
    )

    function DiceTray() {
        let tray = this.tray = [];
        let updateHand = () => {
            let hands = this.hands = computeDiceHands(tray.map(d => d.value));

            config.onhandschanged && config.onhandschanged(hands);
            //expression.innerText = hands.length ? `${hands[0].name} score:${hands[0].score} display:${hands[0].display}` : 'none';
            
        }
        this.add = (die) => {
            tray.push(die)
            tray.sort((a,b)=>a.value-b.value)
            updateHand();
        }
        this.remove = (die) => {
            let i = tray.indexOf(die);
            if (i >= 0) {
                tray.splice(i, 1);
                die.held = false;
                die.endPosition.copy(die.startPosition);
                die.endScale.copy(die.baseScale);
                die.endQuaternion.copy(die.startQuaternion);
                die.isAnimating = true;
                die.selectionMesh.visible = false;
                updateHand();
            }
        }
        this.makeEmpty = () => {
            while (tray.length){
                this.remove(tray[0]);
            }
        }
        this.update = () => {
            let spots = document.getElementsByClassName('dice-spot')
            let rects = []
            let ground = cannonDice.ground;
            
            //if((!this.spotsOnGround)||(this.spotsOnGround.length<5)){
                let spotsOnGround = this.spotsOnGround =  []
                for (let i = 0; i < spots.length; i++) {
                    let sp = spots[i];
                    let r = sp.getBoundingClientRect();
                    let hits = raycasting.raycastObjectAtPixel(ground, r.x + (r.width * .5), r.y + (r.height * .5));
                    if (hits.length)
                        spotsOnGround.push(hits[0].point.clone());
                }
            //    return;
            //}
            
             //   let spotsOnGround = this.spotsOnGround
            let spacing = spotsOnGround[0].distanceTo(spotsOnGround[1]);
            tray.forEach( (die, i) => {
                die.endPosition.copy(spotsOnGround[i]);
                //set((i*2)-5.,.5,5);
                //die.endPosition.y = .5;
                if (spacing < 1.5) {
                    die.endScale.set(1, 1, 1).multiplyScalar(1.5 / spacing);
                }
                die.endPosition.lerp(camera.position, .25);
            }
            )
        }
    }

    let diceTray = new DiceTray()

    let selectionMeshes = cdice.map(d => d.selectionMesh)
    let clicked = false;

    let toggleDiceHold = (die) => {
        //o.object.dice.body.mass = held?0:1;
        //o.object.dice.body.collisionResponse = held?false:true;
        if (!die.held) {
            if (diceTray.tray.length > 4)
                return;
        }
        die.held = !die.held;
        die.selectionMesh.visible = die.held;
        config.refuelRenderer();
        if (die.held) {
            die.startPosition = die.mesh.position.clone();
            die.startQuaternion = die.mesh.quaternion.clone();
            die.endPosition = die.mesh.position.clone();

            let mat = new THREE.Matrix4().makeRotationFromQuaternion(die.startQuaternion);
            let saturate = (ix, iy, iz) => {
                let e = mat.elements;
                let ax = Math.abs(e[ix]);
                let ay = Math.abs(e[iy]);
                let az = Math.abs(e[iz]);
                if ((ax > ay) && (ax > az)) {
                    ax = e[ix] > 0 ? 1 : -1;
                    ay = az = 0;
                } else if ((ay > ax) && (ay > az)) {
                    ay = e[iy] > 0 ? 1 : -1;
                    ax = az = 0;
                } else {
                    az = e[iz] > 0 ? 1 : -1;
                    ax = ay = 0;
                }
                e[ix] = ax;
                e[iy] = ay;
                e[iz] = az;
            }
            saturate(0, 1, 2);
            saturate(4, 5, 6);
            saturate(8, 9, 10);
            die.endQuaternion = new THREE.Quaternion().setFromRotationMatrix(mat);
            //die.startQuaternion.clone();
            die.startScale.copy( die.baseScale );
            die.endScale.copy( die.baseScale );
            diceTray.add(die);
        } else {
            diceTray.remove(die)
        }
        diceTray.update()
    }

    let clickedDie;
    let tmp0,tmp1;
    if(config.debugClicks){
        tmp0 = new THREE.Mesh(new THREE.BoxGeometry(.51,.51,.51),new THREE.MeshBasicMaterial({
            color: '#0f0'
        }))
        scene.add(tmp0)
        tmp1 = new THREE.Mesh(new THREE.BoxGeometry(.51,.51,.51),new THREE.MeshBasicMaterial({
            color: '#f00'
        }))
        scene.add(tmp1)
    }
    
    let updateDebug=(e,tmp)=>{
        
        let ground = cannonDice.ground;
        let hits = raycasting.raycastObjectAtPixel(ground, e.x, e.y);
        if (hits.length){
            if(!tmp)return;
            tmp.position.copy(hits[0].point);
        }
    }
    
    let throwStart = new THREE.Vector3();
    let throwEnd = new THREE.Vector3();
    let inThrow = false;
    let pdown = (e) => {
        throwStart.set(e.x, e.y, 0);
        throwEnd.copy(throwStart);
       
        updateDebug( e,tmp0 )
        config.debugClicks && document.dispatchEvent(new CustomEvent('popmsg',{detail:'got pointerdown'}))
        //raycasting.onPointerMove(e)
        let hits = raycasting.raycaster.intersectObjects(selectionMeshes)
        let o = hits[0]
        clickedDie = null;
        inThrow = false;
        if (o) {
            let die = o.object.dice;
            clickedDie = die;
            config.debugClicks && document.dispatchEvent(new CustomEvent('popmsg',{detail:'got pointerdown DIE CLICKED'}))
        }else
            config.debugClicks && document.dispatchEvent(new CustomEvent('popmsg',{detail:'got pointerdown no hit'}))
    }
    
    let pmove = (e) => {
        if (e.buttons === 0)
            return
        throwEnd.set(e.x, e.y, 0);

        updateDebug( e, tmp1 )
        
        if(checkForThrow()){
            inThrow = true;
        }
    }

    let pup = (e) => {
        if(inThrow)
            return;

        updateDebug(e, tmp1 )
        
        //if(checkForThrow())
        //    return;
                    
        let hits = raycasting.raycaster.intersectObjects(selectionMeshes)
        let o = hits[0]
        config.debugClicks && document.dispatchEvent(new CustomEvent('popmsg',{detail:'got pointerUp'}))
        if (o) {
            let die = o.object.dice;
            if (die === clickedDie){
                config.ontogglehold && config.ontogglehold(die,cannonDice.diceArray.indexOf(die));
                    toggleDiceHold(die)
            }
        }
    }

    let rollClicked;

    function *GameLoop() {
        while (true) {
            yield 500;
        }
    }

    let gameLoop = GameLoop();


let throwIndicator = new ThrowIndicator({THREE,scene,config});

let timeIndicator = new TimeIndicator({THREE,scene,config});

    let nextUpdate = performance.now()
    events.frame = (dt) => {
        let time = performance.now();
        if (time >= nextUpdate) {
            let delay = gameLoop.next().value;
            if (!delay)
                nextUpdate = time;
            else
                nextUpdate += delay;
        }
        cannonDice.update(dt);
        config.needsRepaint = cannonDice.recorder.isPlaying;
        let diceMoving = false;
        cannonDice.diceArray.forEach(d=>d.isAnimating&&(diceMoving=true));
        if(cannonDice.recorder.isPlaying || diceMoving)
            config.refuelRenderer();
        timeIndicator.update()
    
    }

    //`https://cdn.glitch.global/6d72d05b-9d61-445c-841d-158305ad466f/cube.glb?v=1726587362240`
    //let txname = `https://cdn.glitch.global/6d72d05b-9d61-445c-841d-158305ad466f/holographic_ultra_dark_nighttime_arena_in_outer_s.jpg?v=1726588988477`
    //let txname = `https://cdn.glitch.global/6d72d05b-9d61-445c-841d-158305ad466f/oxTqLelBTDo54v1q7Rs_pc78N8XiEHoTaQVLhyKQP90.jpg?v=1726590937029`


    let checkForThrow=()=>{
        
        if (cannonDice.recorder.isRecording)
            return;
        if (cannonDice.recorder.isPlaying)
            return;

        if(!cannonDice.allowRoll){
            
            if (allDiceHeld()) {
                config.onallheld && config.onallheld();
            }
            return;
        }
        
        let strength = throwStart.distanceTo(throwEnd);
        let throwDragThreshold = 150
        if (strength > throwDragThreshold) {
        //    let allHeld = true;
        //    cannonDice.diceArray.forEach(d => (!d.held) && (allHeld = false));
            renderer.domElement.style.cursor = 'not-allowed'
            let throwDirection = throwEnd.sub(throwStart).normalize();
            let throwStrength = ((strength-throwDragThreshold) * 2)+10;
            config.ondicethrown && config.ondicethrown({throwDirection,throwStrength});
            if (allDiceHeld()) {
                //Dice tray is full so...
                //Empty the tray..  and start a new round...
                diceTray.makeEmpty();
            }
            cannonDice.throwMe(throwDirection, throwStrength);
            cannonDice.recorder.isPlaying = true;
            cannonDice.recorder.isRecording = true;

            renderer.domElement.style.cursor = 'grab';
            cannonDice.throwDirection = throwDirection;
            cannonDice.throwStrength = throwStrength;
            return true;
        }
    }
    
    let allDiceHeld =()=>{
        let allHeld = true;
        cannonDice.diceArray.forEach(d => (!d.held) && (allHeld = false));
        return allHeld;
    }
    window.addEventListener("resize", () => diceTray.update());

    renderer.domElement.addEventListener('pointermove', pmove);
    renderer.domElement.addEventListener('pointerup', pup);
    renderer.domElement.addEventListener('pointerdown', pdown);

    document.addEventListener('keydown', e => {
        if (e.code == 'KeyR') {
            cannonDice.simulationOn = false;
            cannonDice.recorder.isPlaying = true;
            cannonDice.recorder.playTime = 0;
        } else if (e.code == 'KeyT') {
            cannonDice.diceArray.forEach(d => d.mesh.children[0].quaternion.set(0, 0, 0, 1))
        }
    }
    )

    let newQ = (ax, ay, az, side) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(ax,ay,az), Math.PI * .5 * side)

    let sideQuats = [newQ(0, 0, 1, 1), newQ(1, 0, 0, 1), newQ(1, 0, 0, -1), newQ(0, 0, 1, -2), new THREE.Quaternion(), newQ(0, 0, 1, -1), ]

    let json = await (await fetch('./dice.json')).json();

    let forceDiceFace = (cd, i) => {

        cd.mesh.quaternion.copy(sideQuats[i - 1]);
        //set(0,0,0,1);
        cd.mesh.children[0].quaternion.set(0, 0, 0, 1);
        cd.body.quaternion.copy(cd.mesh.quaternion);
        cd.body.position.copy(cd.mesh.position);

    }

    let holdAll = ()=>{
        for (let i in cannonDice.diceArray) {
            let d = cannonDice.diceArray[i];
            if(!d.held)toggleDiceHold(d);
        }
    }
    let loadFromJSON = async (json) => {
        diceTray.makeEmpty();
        cannonDice.simulationOn = false;
        cannonDice.recorder.isRecording = false;
        cannonDice.recorder.isPlaying = false;
        json.base.forEach(hand => {
            for (let i in hand.dices) {
                let d = hand.dices[i];
                let cd = cannonDice.diceArray[parseInt(d.diceId) - 1];

                //d.face
                forceDiceFace(cd, d.face);
                cd.value = d.face;
                
                toggleDiceHold(cd);
            }
        }
        );
        for (let i in json.cubes) {
            let cube = json.cubes[i];
            let cd = cannonDice.diceArray[parseInt(cube.diceId) - 1];
            forceDiceFace(cd, parseInt(cube.face));
        }
        //console.log(json)
    }
    //loadFromJSON(json);

    cannonDice.simulationOn = true;
    cannonDice.recorder.isRecording = false;
    cannonDice.recorder.isPlaying = false;

    let handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.dataTransfer;
        const file = dt.files[0];
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => loadFromJSON(JSON.parse(reader.result));
        reader.onerror = () => output.textContent = 'Error reading file!';
    }
    expression.addEventListener('drop', handleDrop, false);

    return {
        diceModel: die,
        loadFromJSON,
        cannonDice,
        holdAll,
        diceTray,
        toggleDiceHold,
        allDiceHeld
    }
}
