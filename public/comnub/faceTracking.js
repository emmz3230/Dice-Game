import { broadcastData } from './main.js';

let localStream;

export function initializeFaceTracking(callback) {
  const localVideo = document.getElementById('localVideo');
  const outputCanvas = document.getElementById('outputCanvas');
  const ctx = outputCanvas.getContext('2d');
let vidHigh ={
      width: { ideal: 640 },
      height: { ideal: 480 },
      //frameRate: { ideal: 15, max: 30 }
      frameRate: { ideal: 15, max: 30 }
    }
  let vidLow ={
      width: { ideal: 320 },
      height: { ideal: 240 },
      //frameRate: { ideal: 15, max: 30 }
      frameRate: { ideal: 10, max: 10 }    
  }

  let vid = vidLow;
  navigator.mediaDevices.getUserMedia({
    video: vid,
    audio: true
  }).then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;
    callback();

    outputCanvas.style.left = `${localVideo.offsetLeft-5}px`
    outputCanvas.style.top = `${localVideo.offsetTop-5}px`

    const faceMesh = new FaceMesh({
      locateFile: file => `./comnub/lib/face_mesh/${file}`
    //locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(results => {
      //ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          drawFaceLandmarks(document.getElementById('outputCanvas') , landmarks)
          broadcastData({ type: 'face_landmarks', landmarks });
        }
      }
    });

    const camera = new Camera(localVideo, {
      onFrame: async () => {
        let time=performance.now()
        //if(camera.lastUpdateTime<(time-500)){
          camera.lastUpdateTime = time;
          await faceMesh.send({ image: localVideo });
        //}
      },
      width: vid.width,
      height: vid.height
    });
    camera.lastUpdateTime=performance.now();
    camera.start();
  }).catch(error => {
    console.error('Error accessing media devices.', error);
  });
}

export function getLocalStream() {
  return localStream;
}

export function drawFaceLandmarks(outputCanvas ,landmarks) {
  //outputCanvas = document.getElementById('outputCanvas');
  const ctx = outputCanvas.getContext('2d');
  ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  landmarks.forEach(lm=>(lm.visibility===null)&&(lm.visibility=undefined));
  drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
  drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030' });
  drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYEBROW, { color: '#FF3030' });
  drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30' });
  drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYEBROW, { color: '#30FF30' });
  drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0' });
  drawConnectors(ctx, landmarks, FACEMESH_LIPS, { color: '#E0E0E0' });
  ctx.beginPath();
  ctx.moveTo(0,0)
  ctx.lineTo(outputCanvas.width, outputCanvas.height)
  ctx.stroke();
}
