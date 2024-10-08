import { getLocalStream, drawFaceLandmarks } from './faceTracking.js';

const peer = new Peer({
  host: window.location.hostname,
  port: 3333,
  path: '/peerjs',
  secure: window.location.protocol === 'https:'
});

const connections = {};

export function initializeConnection() {
  peer.on('open', id => {
    console.log('My peer ID is: ' + id);
    fetchPeers(id);
  });

  peer.on('call', call => {
    const localStream = getLocalStream();
    if (localStream) {
      call.answer(localStream);
      handleCall(call);
    } else {
      console.error('Local stream not available to answer call');
    }
  });

  peer.on('connection', conn => {
    handleConnection(conn);
  });
}

async function fetchPeers(myId) {
  try {
    const response = await fetch('/peerjs/peers');
    const peers = await response.json();
    connectToPeers(peers, myId);
  } catch (error) {
    console.error('Error fetching peers:', error);
  }
}

function connectToPeers(peers, myId) {
  const localStream = getLocalStream();
  if (!localStream) {
    console.error('Local stream not available for calling peers');
    return;
  }
  peers.forEach(peerId => {
    if (peerId !== myId && !connections[peerId]) {
      const call = peer.call(peerId, localStream);
      handleCall(call);
      const conn = peer.connect(peerId);
      handleConnection(conn);
    }
  });
}

function handleCall(call) {
  call.on('stream', remoteStream => {
    addRemoteStream(remoteStream, call.peer);
  });

  call.on('close', () => {
    removeRemoteStream(call.peer);
  });

  call.on('error', err => {
    console.error('Call error with:', call.peer, err);
  });
}

function handleConnection(conn) {
  connections[conn.peer] = conn;
  conn.on('data', data => {
    if (data.type === 'face_landmarks') {
      drawFaceLandmarks(data.landmarks);
    }
    handleReceivedData(data);
  });

  conn.on('close', () => {
    delete connections[conn.peer];
    removeRemoteStream(conn.peer);
  });

  conn.on('error', err => {
    console.error('Connection error with:', conn.peer, err);
  });
}

function addRemoteStream(stream, peerId) {
  if (!document.getElementById(`remoteVideo_${peerId}`)) {
    const remoteVideo = document.createElement('video');
    remoteVideo.id = `remoteVideo_${peerId}`;
    remoteVideo.srcObject = stream;
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;
    document.getElementById('remoteVideos').appendChild(remoteVideo);
  }
}

function removeRemoteStream(peerId) {
  const remoteVideo = document.getElementById(`remoteVideo_${peerId}`);
  if (remoteVideo) {
    remoteVideo.srcObject = null;
    document.getElementById('remoteVideos').removeChild(remoteVideo);
  }
}

export function broadcastData(data) {
  Object.values(connections).forEach(connection => {
    connection.send(data);
  });
}

function handleReceivedData(data) {
  if (data.type === 'face_landmarks') {
    drawFaceLandmarks(data.landmarks);
  }
}
