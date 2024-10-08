const express = require('express');
const {ExpressPeerServer} = require('peer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const httpPort = 3333;
const httpsPort = 3334;

// Load SSL/TLS certificate and key
const privateKey = fs.readFileSync('ssl/private.key', 'utf8');
const certificate = fs.readFileSync('ssl/certificate.crt', 'utf8');
const credentials = {
    key: privateKey,
    cert: certificate
};

let peers = {};

// Function to broadcast peers to all connected clients
const broadcastPeers = () => {
    const peerIds = Object.keys(peers);
    peerIds.forEach(peerId => {
        const client = peers[peerId];
        if (client && client.getSocket()) {
            try {
                client.getSocket().send(JSON.stringify({
                    type: 'peers',
                    peers: peerIds
                }));
            } catch (error) {
                console.error(`Error broadcasting to peer ${peerId}:`, error);
            }
        }
    }
    );
}
;

// Reusable function to host PeerJS and serve static files
const Host = (app, transport, port) => {
    const peerServer = ExpressPeerServer(transport, {
        debug: true,
        path: '/'
    });

    // Mount PeerJS at /peerjs and serve static files
    app.use('/peerjs', peerServer);
    app.use(express.static(path.join(__dirname, 'public')));

    // Start the server on the given port
    transport.listen(port, () => {
        console.log(`Server running on port ${port}`);
    }
    );

    // Serve the main index.html file
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    );

    // Handle peer connection events
    peerServer.on('connection', (client) => {
        peers[client.getId()] = client;
        console.log(`New peer connected: ${client.getId()}`);
        broadcastPeers();
    }
    );

    // Handle peer disconnection events
    peerServer.on('disconnect', (client) => {
        delete peers[client.getId()];
        console.log(`Peer disconnected: ${client.getId()}`);
        broadcastPeers();
    }
    );

    // API to fetch connected peers
    app.get('/peerjs/peers', (req, res) => res.json(Object.keys(peers)));
}
;

// Create HTTPS server and host the PeerJS server
const httpsTransport = https.createServer(credentials, app);
Host(app, httpsTransport, httpsPort);

// HTTP server to redirect all traffic to HTTPS
http.createServer( (req, res) => {
    res.writeHead(301, {
        "Location": `https://${req.headers.host}${req.url}`
    });
    res.end();
}
).listen(httpPort, () => {
    console.log(`HTTP server running on port ${httpPort} and redirecting to HTTPS`);
}
);
