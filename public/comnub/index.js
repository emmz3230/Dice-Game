//import {initializeFaceTracking, getLocalStream, drawFaceLandmarks} from './faceTracking.js';

const videoEnabled = false;
const connections = {};

document.addEventListener("DOMContentLoaded", () => {
  //initializeFaceTracking(initializeConnection);
  initializeConnection();
});

export const rtcMesh = {};

let peerIsHost = (id) => {
  return rtcMesh.localId == rtcMesh.hostId;
};
function initializeConnection() {
  const peer = new Peer({
    host: window.location.hostname,
    port: window.location.port, //3333
    path: "/peerjs",
    secure: window.location.protocol === "https:",
  });
  setupKeyboardEvents(peer);
  peer.on("open", (id) => {
    console.log("My peer ID is: " + id);
    rtcMesh.hostId = rtcMesh.localId = id;
    fetchPeers(peer, id);
  });

  peer.on("call", (call) => {
    console.log("Receiving a call from:", call.peer);
    const localStream = getLocalStream();
    if (localStream) {
      console.log("Answering call from:", call.peer);
      call.answer(localStream);
      handleCall(call);
    } else {
      console.error("Local stream not available to answer call");
    }
  });

  peer.on("connection", (conn) => {
    console.log("Data connection established with:", conn.peer);
    handleConnection(conn);
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
  });

  peer.on("disconnected", () => {
    console.warn("Peer disconnected");
    peer.reconnect();
  });
}

//window.location.hostname,
//    port: 3333,

let showHost = () => {
  expression.innerText =
    "JOINED MESH:" +
    (rtcMesh.localId == rtcMesh.hostId ? "HOST" : "GUEST");
};

async function fetchPeers(peer, myId) {
  try {
    const response = await fetch(
      `https://${window.location.hostname}:${window.location.port}/peerjs/peers`
    );
    let peers = (rtcMesh.peers = await response.json());
    console.log("Fetched peers:", peers);
    rtcMesh.hostId = peers[0];
    showHost();
    connectToPeers(peer, peers, myId);
  } catch (error) {
    console.error("Error fetching peers:", error);
  }
}

function connectToPeers(peer, peers, myId) {
  if (videoEnabled) {
    const localStream = getLocalStream();
    if (!localStream) {
      console.error("Local stream not available for calling peers");
      return;
    }
  }
  peers.forEach((peerId) => {
    if (peerId !== myId && !connections[peerId]) {
      if (videoEnabled) {
        console.log("Calling peer:", peerId);
        const call = peer.call(peerId, localStream);
        handleCall(call);
      }
      console.log("Connecting to peer:", peerId);
      const conn = peer.connect(peerId);
      handleConnection(conn);
    }
  });
}

function handleCall(call) {
  if (!call) {
    console.error("Call object is null");
    return;
  }

  console.log("Handling call for peer:", call.peer);
  call.on("stream", (remoteStream) => {
    console.log("Stream received from:", call.peer);
    addRemoteStream(remoteStream, call.peer);
  });

  call.on("close", () => {
    console.log("Call closed with:", call.peer);
    removeRemoteStream(call.peer);
  });

  call.on("error", (err) => {
    console.error("Call error with:", call.peer, err);
  });
}

function handleConnection(conn) {
  if (!conn) {
    console.error("Connection object is null");
    return;
  }

  console.log("Handling data connection for peer:", conn.peer);
  conn.on("open", () => {
    connections[conn.peer] = conn;
  });
  conn.on("data", (data) => {
    let remoteVideo = document.getElementById(
      `remoteVideo_${conn.peer}`
    );
    document.body.dispatchEvent(
      new CustomEvent("remote-data", {
        detail: {
          data,
          peerId: conn.peer,
          video: remoteVideo,
        },
      })
    );
    //console.log('Received data from:', conn.peer, data);
    if (data.type === "face_landmarks") {
      drawFaceLandmarks(
        document.getElementById(`remoteOutputCanvas_${conn.peer}`),
        data.landmarks
      );
    } else if (data.type === "keydown" || data.type === "keyup") {
      console.log("Received keyboard event:", data);
      updateKeysDisplay(data);
    } else if (data.type === "roll") {
    }
  });

  conn.on("close", () => {
    console.log("Data connection closed with:", conn.peer);
    rtcMesh.peers.splice(rtcMesh.peers.indexOf(conn.peer), 1);
    rtcMesh.hostId = rtcMesh.peers[0];
    showHost();

    delete connections[conn.peer];
    removeRemoteStream(conn.peer);
  });

  conn.on("error", (err) => {
    console.error("Connection error with:", conn.peer, err);
  });
}

function addRemoteStream(stream, peerId) {
  console.log("Adding remote stream for:", peerId);
  if (!document.getElementById(`remoteVideo_${peerId}`)) {
    const remoteVideo = document.createElement("video");
    remoteVideo.id = `remoteVideo_${peerId}`;
    remoteVideo.srcObject = stream;
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;
    remoteVideo.muted = false;
    document.getElementById("remoteVideos").appendChild(remoteVideo);
    console.log(`Remote video element created for ${peerId}`);

    const remoteOutputCanvas = document.createElement("canvas");
    remoteOutputCanvas.id = `remoteOutputCanvas_${peerId}`;
    let { offsetLeft, offsetTop } = remoteVideo;
    remoteOutputCanvas.style.left = `${Math.ceil(offsetLeft - 5)}px`;
    remoteOutputCanvas.style.top = `${Math.ceil(offsetTop - 5)}px`;

    remoteOutputCanvas.classList.add("outputCanvas");
    document
      .getElementById("remoteVideos")
      .appendChild(remoteOutputCanvas);
    console.log(`Remote outputCanvas element created for ${peerId}`);
    document.body.dispatchEvent(
      new CustomEvent("player-joined", {
        detail: {
          peerId,
          video: remoteVideo,
        },
      })
    );
  } else {
    console.log(`Remote video element already exists for ${peerId}`);
  }
}

function removeRemoteStream(peerId) {
  console.log("Removing remote stream for:", peerId);
  const remoteVideo = document.getElementById(
    `remoteVideo_${peerId}`
  );
  const remoteCanvas = document.getElementById(
    `remoteOutputCanvas_${peerId}`
  );
  if (remoteVideo) {
    document.body.dispatchEvent(
      new CustomEvent("player-left", {
        detail: {
          peerId,
          video: remoteVideo,
        },
      })
    );

    remoteVideo.srcObject = null;
    document.getElementById("remoteVideos").removeChild(remoteVideo);
    console.log(`Remote video element removed for ${peerId}`);
  }
  if (remoteCanvas) {
    remoteVideo.srcObject = null;
    document.getElementById("remoteVideos").removeChild(remoteCanvas);
    console.log(`Remote canvas element removed for ${peerId}`);
  }
}

export function broadcastData(data) {
  //console.log('Broadcasting data:', data);
  document.body.dispatchEvent(
    new CustomEvent("local-data", {
      detail: {
        data,
        video: document.getElementById("localVideo"),
      },
    })
  );
  Object.values(connections).forEach((connection) => {
    connection.send(data);
    //console.log('Data sent to connection:', connection.peer);
  });
}

let kitems = [];
function updateKeysDisplay(data) {
  const keysElement = document.getElementById("keys");
  if (keysElement) {
    kitems.push(`<br>${data.peer}: ${data.key} ${data.type}`);
    while (kitems.length > 5) kitems.shift();
    keysElement.innerHTML = kitems.join("\n");
  }
}

function setupKeyboardEvents(peer) {
  window.addEventListener("keydown", (event) => {
    const data = {
      type: "keydown",
      key: event.key,
      peer: peer.id,
    };
    //console.log('Key down:', data);
    broadcastData(data);
  });

  window.addEventListener("keyup", (event) => {
    const data = {
      type: "keyup",
      key: event.key,
      peer: peer.id,
    };
    //console.log('Key up:', data);
    broadcastData(data);
  });
}
