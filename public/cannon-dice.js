import*as CANNON from "./lib/cannon-es.js";
import*as THREE from "three";
import*as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import GUI from "./lib/lil-gui.js"

let {sin, cos, PI, abs, max, min, floor, random} = Math;
let rrnd = (mmin=0, mmax=1) => (random() * (mmax - mmin)) + mmin;

let recorder = {
    isRecording: false,
    isPlaying: false,
    buffer: [],
    playTime: 0,
}

export function CannonDice({renderer, scene, camera, diceModel, config}) {
    const searchParams = new URLSearchParams(window.location.search);

    let containerEl = renderer.domElement.parentElement;
    const canvasEl = renderer.domElement;

    let diceMesh, simulation;

    this.simulationOn = false;
    this.allowRoll = true;
    let diceCount = 5;
    const euler = new CANNON.Vec3();

    if (searchParams.has('c'))
        diceCount = min(10, parseInt(searchParams.get('c')))

    let diceDirection = new CANNON.Vec3(0,1,0);
    let diceForce = config.diceForce || 10;

    let playFieldScale = config.playFieldScale || 4;

    let currentResult = new Array(diceCount).fill(0);

    const params = {
        // physics
        restitution: config.restitution || .3,
        friction: config.friction || .001,
    };

    let throwMe = (direction, force) => {
        direction && diceDirection.copy(direction);
        force && (diceForce = force);
        this.simulationOn = true;
        throwDice();
    }

    const diceArray = [];

    const floorPlanesArray = [];

    diceMesh = (diceModel && diceModel.clone()) || createDiceMesh();
    diceMesh.scale.multiplyScalar(2);

    let initPhysics = () => {
        const gravity = new CANNON.Vec3(0,-50,0);
        const allowSleep = true;
        simulation = new CANNON.World({
            allowSleep,
            gravity
        })
        simulation.defaultContactMaterial.restitution = params.restitution;
        simulation.defaultContactMaterial.friction = params.friction;

        recorder.isRecording = true;
        simulation.addEventListener('preStep', (e) => {
            if (recorder.isRecording) {
                diceArray.forEach(d => {
                    let q = d.body.quaternion;
                    let p = d.body.position;
                    recorder.buffer.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w)
                }
                )
                if (recorder.buffer.length > 100000) {
                    recorder.buffer.length = 0;
                    //alert('buf')
                    console.log("Throw too long.. rethrowing...")

                    throwDice();
                    // throw "Bad BuFfer Overflow!"
                }
            }
        }
        )
    }

    let createFloor = () => {
        for (let i = 0; i < 5; i++) {

            const body = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Plane(),
            });
            simulation.addBody(body);

            let mesh;
            if ((i === 0) || (config.debugWalls)) {

                mesh = new THREE.Mesh(new THREE.PlaneGeometry(100,100,100,100),new THREE.MeshStandardMaterial({
                    // opacity: .1,
                    //color:'#800',
                    //   side:THREE.DoubleSide,
                    roughness: config.floorRoughness || .9,
                    metalness: config.floorMetalness || 0,
                    map: new THREE.TextureLoader().load(config.floorTexture || './assets/leather-004-brown_d.jpg'),
                    roughnessMap: new THREE.TextureLoader().load(config.floorRoughnessMap || './assets/leather-004_r.jpg'),
                    normalMap: new THREE.TextureLoader().load(config.floorNormalMap || './assets/leather-004_n.jpg')
                }))
                mesh.material.map.colorSpace = 'srgb'
                if (i) {
                    mesh.material.color = 'red'
                    mesh.material.transparent = true;
                    mesh.material.opacity = .25;

                }
                let repeat = config.floorRepeat || 4;
                mesh.material.map.repeat.set(repeat, repeat)
                mesh.material.map.wrapS = mesh.material.map.wrapT = THREE.RepeatWrapping;
                scene.add(mesh);
                mesh.receiveShadow = true;

            }

            floorPlanesArray.push({
                body,
                mesh
            })
        }

        floorPositionUpdate();
    }

    let floorPositionUpdate = () => {
        floorPlanesArray.forEach( (f, fIdx) => {
            if (fIdx === 0) {
                f.body.position.y = 0;
                f.body.quaternion.setFromEuler(-.5 * PI, 0, 0);
            } else if (fIdx === 1) {
                f.body.quaternion.setFromEuler(0, .5 * PI, 0);
                f.body.position.x = -playFieldScale * containerEl.clientWidth / containerEl.clientHeight;
            } else if (fIdx === 2) {
                f.body.quaternion.setFromEuler(0, -.5 * PI, 0);
                f.body.position.x = playFieldScale * containerEl.clientWidth / containerEl.clientHeight;
            } else if (fIdx === 3) {
                f.body.quaternion.setFromEuler(0, PI, 0);
                f.body.position.z = playFieldScale;
                //*(4.5/6);
            } else if (fIdx === 4) {
                f.body.quaternion.setFromEuler(0, 0, 0);
                f.body.position.z = -playFieldScale;
            }
            if (f.mesh) {
                f.mesh.position.copy(f.body.position);
                f.mesh.quaternion.copy(f.body.quaternion);
            }
        }
        )
    }

    let createDice = () => {
        const mesh = diceMesh.clone();
        scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(.5,.5,.5));
        const mass = 1;
        const sleepTimeLimit = .02;

        const simulationBody = new CANNON.Body({
            mass,
            shape,
            sleepTimeLimit
        });
        let rot = simulation.bodies.length - 5;
        simulation.addBody(simulationBody);
        simulationBody.position.set(sin(rot * PI * 2 / 5) * 2, .5, cos(rot * PI * 2 / 5) * 2);
        mesh.position.copy(simulationBody.position)
        
        // simulationBody.rotation.set(0,rrnd(0,PI*2,0)
        return {
            mesh,
            body: simulationBody,
            baseScale: mesh.scale.clone(),
            startScale: mesh.scale.clone(),
            endScale: mesh.scale.clone(),
            startPos: [null, null, null]
        };
    }

    let determineSide = (body) => {
        body.quaternion.toEuler(euler);
        const eps = .1;
        let isZero = (angle) => abs(angle) < eps;
        let isHalfPi = (angle) => abs(angle - .5 * PI) < eps;
        let isMinusHalfPi = (angle) => abs(.5 * PI + angle) < eps;
        let isPiOrMinusPi = (angle) => (abs(PI - angle) < eps || abs(PI + angle) < eps);
        if (isZero(euler.z)) {
            if (isZero(euler.x))
                return 5;
            else if (isHalfPi(euler.x))
                return 2;
            else if (isMinusHalfPi(euler.x))
                return 3;
            else if (isPiOrMinusPi(euler.x))
                return 4;
            //else 
            // landed on edge => wait to fall on side and fire the event again
        } else if (isHalfPi(euler.z))
            return 1;
        else if (isMinusHalfPi(euler.z))
            return 6;
        //else
        // landed on edge => wait to fall on side and fire the event again
    }
    let fixDice = (desiredResult) => {
        if(config.desiredResult){
            desiredResult = config.desiredResult;
            config.desiredResult = null;
        }
        if (searchParams.has('r'))
            desiredResult = searchParams.get('r').split(',').map(e => parseInt(e));
        
        if (desiredResult && desiredResult.length) {
            //Correct the rolls to desired result
            diceArray.forEach( (die, i) => {
                if (die.held)
                    return;
                //currentResult[i] = determineSide(die.body[1]);
                let r = die.value;
                //currentResult[i];
                let d = desiredResult[i % desiredResult.length];
                let q = die.mesh.children[0].quaternion;
                q.set(0, 0, 0, 1)
                let fix = rollFixTable[d];
                if (fix[r]){
                    q.setFromAxisAngle(fix[r][0], fix[r][1]);
                }
                die.value = d;
            }
            )
        }
    }

    let addDiceEvents = (dice, diceIdx) => {
        //console.log("Adding events:", diceIdx)
        dice.body.addEventListener("sleep", (e) => {

            //b.allowSleep = false;

            // dice fall while simulating => check the results
            if (this.simulationOn) {
                let side = determineSide(e.target);
                if (!dice.held)
                    dice.value = side;
                if (!side) {
                    dice.body.allowSleep = true;
                    throwDice();
                    return;
                }
                let simFinished = true;
                diceArray.forEach(d => (!d.held) && (d.value = determineSide(d.body)))
                diceArray.forEach(d => {
                    //Check if all rolls have finished..
                    let b = d.body;
                    if (b.mass && (!d.held))
                        if ((!d.value) || (b.sleepState !== 2) || (b.velocity.length() > .0) || (b.angularVelocity.length() > .0))
                            simFinished = false;
                }
                )
                if (!simFinished)
                    return

                //console.log("res:", currentResult)
                //We have the throw result..
                //Now we have to adjust the initial rotation of the dice to make the result we want.

                config.onrollsimulated && config.onrollsimulated()
                fixDice()

                this.simulationOn = false;
                recorder.isRecording = false;

                throwDice();

                //Now do the playback.
            }

        }
        );
    }

    let vx = new THREE.Vector3(1,0,0)
    let vy = new THREE.Vector3(0,1,0)
    let vz = new THREE.Vector3(0,0,1)
    let p180 = PI;
    let p90 = PI * .5;
    let rollFixTable = {
        4: {
            2: [vy, p90],
            3: [vy, -p90],
            4: [vz, -p90],
            5: [vz, p90],
            6: [vy, p180],
        },
        2: {
            1: [vy, -p90],
            3: [vy, p180],
            4: [vx, -p90],
            5: [vx, p90],
            6: [vy, p90],
        },
        5: {
            1: [vy, p90],
            2: [vy, p180],
            4: [vx, p90],
            5: [vx, -p90],
            6: [vy, -p90],
        },
        6: {
            1: [vz, p90],
            2: [vx, p90],
            3: [vx, -p90],
            5: [vx, p180],
            6: [vz, -p90],
        },
        1: {
            1: [vz, -p90],
            2: [vx, -p90],
            3: [vx, p90],
            4: [vx, p180],
            6: [vz, p90],
        },
        3: {
            1: [vz, p180],
            2: [vy, -p90],
            3: [vy, p90],
            4: [vz, p90],
            5: [vz, -p90],
        },
    }
    let pos = new THREE.Vector3();
    let rot = new THREE.Quaternion();
    let update = (dt) => {
        if (this.simulationOn) {
            let allHeld = true;
            while (this.simulationOn) {
                simulation.step(1 / 60, 5000, 10);
                //Loop for 5 seconds at 60fps
                diceArray.forEach(d => (!d.held) && (allHeld = false))
                if (allHeld) {
                    this.simulationOn = false;
                    recorder.isRecording = false;
                    console.log("All held. stopping simulator.")
                    config.onAllHeld && config.onallheld();
                }
            }
        } else {
            /*
            physicsRender.fixedStep(undefined,10);
            for (const dice of diceArray) {
                dice.mesh.position.copy(dice.body[0].position)
                dice.mesh.quaternion.copy(dice.body[0].quaternion)
            }*/
            let rb = recorder.buffer;
            let frameSize = diceArray.length * 7;
            let frame = recorder.playTime / (1 / 60);
            let f0 = floor(frame);
            let f1 = f0 + 1;
            let fa = frame - f0;
            if ((f1 * frameSize) < rb.length) {
                let i = (frameSize * f0);
                let i0 = (frameSize * f1);
                for (const dice of diceArray) {
                    if (dice.held) {
                        i += 7;
                        i0 += 7;
                    } else {
                        dice.mesh.position.set(rb[i++], rb[i++], rb[i++]).lerp(pos.set(rb[i0++], rb[i0++], rb[i0++]), fa);
                        dice.mesh.quaternion.set(rb[i++], rb[i++], rb[i++], rb[i++]).slerp(rot.set(rb[i0++], rb[i0++], rb[i0++], rb[i0++]), fa);
                    }
                }
                recorder.playTime += dt;
            } else if(recorder.isPlaying){
                recorder.isPlaying = false;
                renderer.domElement.style.cursor = 'grab'
                config.onrollfinished && config.onrollfinished()
            }
            
            for (const dice of diceArray) {
                if (dice.held || dice.isAnimating) {
                    dice.mesh.position.lerp(dice.endPosition, dt * 10);
                    dice.mesh.scale.lerp(dice.endScale, dt * 10);
                    dice.mesh.quaternion.slerp(dice.endQuaternion, dt * 10);
                    dice.body.quaternion.copy(dice.mesh.quaternion);
                    dice.body.position.copy(dice.mesh.position);
                }
            }
        }
    }

    let throwDice = () => {
        let direction = diceDirection;
        let force = diceForce;
        const quaternion = new THREE.Quaternion();

        if (this.simulationOn) {

            recorder.isRecording = true;
            recorder.buffer.length = 0;
            recorder.playTime = 0;

            diceArray.forEach(d => {
                if (!d.held)
                    d.startPos = [rrnd(-.15, .15), rrnd(1.5, 1.8), rrnd(-.15, .15)];
            }
            );
        }

        diceArray.forEach( (d, dIdx) => {
            if(d.isAnimating){
                d.mesh.scale.copy(d.endScale);            
                d.isAnimating = false;
            }
            quaternion.setFromEuler(new THREE.Euler(2 * PI * d.startPos[0],0,2 * PI * d.startPos[1]));
            const iforce = force || (6 + 3 * d.startPos[2]);

            const b = d.body;
            b.velocity.setZero();
            b.angularVelocity.setZero();

            if (d.held) {
                return;
            }

            b.position = new CANNON.Vec3(0,5 + dIdx,0);
            if (direction) {
                b.position.x += direction.x * -3;
                b.position.z += direction.y * -3;
            }
            let forceVec = new CANNON.Vec3(-iforce,iforce,0);
            if (direction)
                forceVec.set(direction.x * iforce, direction.z * iforce, direction.y * iforce)

            b.applyImpulse(forceVec, new CANNON.Vec3(0,0,-.5));
            b.quaternion.copy(quaternion);
            b.allowSleep = true;
        }
        );
    }

    initPhysics();

    floorPositionUpdate();

    createFloor();

    for (let i = 0; i < diceCount; i++) {
        diceArray.push(createDice());
        addDiceEvents(diceArray[i], i);
    }

    //throwMe();
    //update();

    window.addEventListener("resize", floorPositionUpdate);

    Object.assign(this, {
        diceArray,
        params,
        update,
        throwMe,
        determineSide,
        recorder,
        ground: floorPlanesArray[0].mesh
    });
}
