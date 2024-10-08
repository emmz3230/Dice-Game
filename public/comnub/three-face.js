import {PLYLoader} from "three/addons/loaders/PLYLoader.js"
import {broadcastData} from "./main.js"

export async function ThreeFace(app) {
    let {glbLoader, camera, scene, broadcastData, THREE} = app;
    let v0 = new THREE.Vector3();
    let v1 = new THREE.Vector3();
    let face = await glbLoader.loadAsync(`./assets/fix_face.glb`)

    face = face.scene.children[0];

    let refLM = await (new PLYLoader()).loadAsync('./assets/fix_face.ply');

    let refPos = refLM.attributes.position.array;
    let refPts = []
    for (let i = 0; i < refPos.length; i += 3) {
        v0.set(refPos[i], refPos[i + 1], refPos[i + 2]);
        refPts.push(v0.clone())
    }
    let pos = face.geometry.attributes.position.array;

    let landmarkVertexMap = []
    let lvm = landmarkVertexMap;
    for (let i = 0; i < pos.length; i += 3) {
        v0.set(pos[i], pos[i + 1], pos[i + 2]);
        let best = 0;
        let bestDist = refPts[0].distanceTo(v0);
        for (let j = 1; j < refPts.length; j++) {
            let dist = refPts[j].distanceTo(v0);
            if (dist < bestDist) {
                bestDist = dist;
                best = j;
            }
        }
        lvm.push(best);
    }

    let players = {}
    let getPlayer = (evt) => {
        let id = evt.detail.peerId || 0;
        if (players[id])
            return players[id];

        let videoMaterial = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            //roughness: .9,
            //metalness: 0,
            map: new THREE.VideoTexture(evt.detail.video)
        });
        //let mesh = new THREE.Mesh(new THREE.BoxGeometry(),videoMaterial)
        let mesh = face.clone();
        mesh.geometry = mesh.geometry.clone();
        mesh.geometry.rotateX(Math.PI * .5);
        mesh.geometry.translate(0, .1, 0);
        mesh.material = videoMaterial;
        mesh.rotation.y = Math.PI;
        //let bx = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.VideoTexture(evt.detail.video)}))
        videoMaterial.map.colorSpace = 'srgb'
        let root = new THREE.Object3D();
        root.add(mesh);
        scene.add(root)
        root.rotation.order = 'YZX'
        mesh.rotation.x = Math.PI * -.5;
        mesh.rotation.z = Math.PI * -1;
/*
        if (!id) 
        {
            mesh.scale.multiplyScalar(.0025);
            root.position.z = -.07;
            root.position.y -= .055;
            camera.add(root);
            //mesh.material.transparent=true;
            // mesh.material.opacity = .25;
        } else*/
        {
            mesh.position.y = .02;
            mesh.position.z = -.01;
            mesh.scale.multiplyScalar(.005);
        }
        mesh.scale.multiplyScalar(2000)
        mesh.position.multiplyScalar(300)
        mesh.frustumCulled = false;
        players[id] = {
            mesh,
            root,
            id
        }
        players[id].localId = Object.keys(players).indexOf(''+id);
        
        return players[id]
    }

    let removePlayer = (evt) => {
        let player = getPlayer(evt);
        player.root.parent.remove(player.root);
        player.mesh.geometry.dispose();
        player.mesh.material.map.dispose();
        delete players[evt.detail.peerId || 0];
    }

    document.body.addEventListener('player-joined', (evt) => {
        let player = getPlayer(evt);
    }
    )

    document.body.addEventListener('player-left', (evt) => {
        removePlayer(evt);
    }
    )

    let remapFaceUvs = (player, landmarks) => {
        let lms = landmarks;

        if (lms) {
            let geom = player.mesh.geometry;
            let uvs = geom.attributes.uv.array;
            let pts = geom.attributes.position.array;
            for (let i = 0, j = 0, k = 0; i < uvs.length; i += 2,
            j++,
            k += 3) {
                let lm = lms[lvm[j]]
                uvs[i] = lm.x;
                //lms Math.random();
                uvs[i + 1] = 1. - lm.y;
                //Math.random();

                pts[k + 0] = lm.x - .5;
                pts[k + 1] = lm.y - .5;
                pts[k + 2] = lm.z;

            }
            geom.attributes.uv.needsUpdate = true;
            geom.attributes.position.needsUpdate = true;
        }
    }

    document.body.addEventListener('remote-data', evt => {
        let player = getPlayer(evt);
        let lms = evt.detail.data.landmarks;
        remapFaceUvs(player, lms);
        if (evt.detail.data.type == 'camera_transform') {
            let {position, rotation} = evt.detail.data;
            player.root.position.copy(position);
            player.root.rotation.set(rotation.x, rotation.y, rotation.z)
        }
    }
    )

    document.body.addEventListener('local-data', e => {
        let player = getPlayer(e);
        let lms = e.detail.data.landmarks;
        remapFaceUvs(player, lms);
        if (0)
            savePly(e.detail.data.landmarks)
    }
    )
}
