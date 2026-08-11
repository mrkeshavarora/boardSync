This project now includes a signalling server (server.js) to support WebRTC audio/video meetings using Socket.IO.

Quick start

1. Install dependencies (already done):
   npm install

2. Run signalling server (in one terminal):
   npm run server
   - This starts the Express + Socket.IO signalling server on port 4000 by default. To change port, set SIGNALING_PORT env var.

3. Run Next.js app (in another terminal):
   npm run dev

Server endpoints

POST /meetings
  - Create a new meeting. Returns { id, title }
GET /meetings/:id
  - Get meeting metadata

Socket.IO events (signalling)

Client -> Server:
- join-room: { meetingId, user }
- offer: { to, from, description }
- answer: { to, from, description }
- ice-candidate: { to, from, candidate }
- leave-room: { meetingId }

Server -> Client:
- user-joined: { socketId, user }
- current-participants: { participants: [socketId...] }
- offer, answer, ice-candidate forwarded
- user-left: { socketId }

Frontend integration example (React)

Below is an example React hook / snippet to integrate into a meeting page. It uses socket.io-client and the browser RTCPeerConnection API.

Important:
- This is a minimal example for demonstration. Production apps need error handling, authentication, TURN servers, UI polish, and server-side persistence.
- Use a TURN server in production to support NAT traversal for some participants. Example public STUN servers are used in the example but are not enough for all scenarios.

Example (use inside a React component):

// import io from 'socket.io-client';
// const socket = io('http://localhost:4000');

// Basic WebRTC flow:
// - On join, emit 'join-room' with meetingId
// - Server returns current participants and notifies others with 'user-joined'
// - For each existing participant, create RTCPeerConnection, add local tracks, create offer and send via 'offer' event
// - When receiving an 'offer', create RTCPeerConnection, set remote desc, create answer and send via 'answer'
// - Exchange ICE candidates via 'ice-candidate' events

/*
const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
    // Add TURN servers here for production
  ]
};

const peerConnections = {}; // map socketId => RTCPeerConnection

async function joinMeeting(meetingId, localVideoEl, remoteVideosContainer, user) {
  const socket = io('http://localhost:4000');

  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideoEl.srcObject = localStream;

  socket.on('connect', () => console.log('connected to signalling', socket.id));

  socket.on('current-participants', ({ participants }) => {
    // create offers to existing participants
    participants.forEach((otherId) => createOfferFor(otherId));
  });

  socket.on('user-joined', ({ socketId }) => {
    // a new participant joined — optional: create offer or wait for them
    console.log('user joined', socketId);
  });

  socket.on('offer', async ({ from, description }) => {
    // received offer -> create pc, set remote desc, create answer
    const pc = createPeerConnection(from);
    await pc.setRemoteDescription(description);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { to: from, from: socket.id, description: pc.localDescription });
  });

  socket.on('answer', async ({ from, description }) => {
    const pc = peerConnections[from];
    if (!pc) return console.warn('No pc for', from);
    await pc.setRemoteDescription(description);
  });

  socket.on('ice-candidate', ({ from, candidate }) => {
    const pc = peerConnections[from];
    if (!pc) return;
    pc.addIceCandidate(candidate).catch((e) => console.warn('ICE add failed', e));
  });

  socket.on('user-left', ({ socketId }) => {
    // remove remote video and close peer connection
    if (peerConnections[socketId]) {
      peerConnections[socketId].close();
      delete peerConnections[socketId];
      const el = document.getElementById('remote-' + socketId);
      if (el) el.remove();
    }
  });

  socket.emit('join-room', { meetingId, user });

  function createPeerConnection(peerSocketId) {
    const pc = new RTCPeerConnection(pcConfig);
    peerConnections[peerSocketId] = pc;

    // send local ICE candidates to peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { to: peerSocketId, from: socket.id, candidate: event.candidate });
      }
    };

    // attach remote stream to a new video element
    pc.ontrack = (event) => {
      let remoteEl = document.getElementById('remote-' + peerSocketId);
      if (!remoteEl) {
        remoteEl = document.createElement('video');
        remoteEl.id = 'remote-' + peerSocketId;
        remoteEl.autoplay = true;
        remoteEl.playsInline = true;
        remoteVideosContainer.appendChild(remoteEl);
      }
      remoteEl.srcObject = event.streams[0];
    };

    // add local tracks
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    return pc;
  }

  async function createOfferFor(peerSocketId) {
    const pc = createPeerConnection(peerSocketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { to: peerSocketId, from: socket.id, description: pc.localDescription });
  }

  return {
    socket,
    leave: () => {
      socket.emit('leave-room', { meetingId });
      Object.values(peerConnections).forEach((pc) => pc.close());
    }
  };
}
*/

What was added

- server.js: signalling server + minimal REST to create meetings
- package.json: added "server" script
- Installed packages: express, socket.io, cors, uuid, socket.io-client

Next steps / recommendations

- Integrate the above client code into your Next.js meeting page: when a meeting is created, call POST /meetings to get an id, then navigate to /meetings/{id} and run the client code to join the room.
- Add authentication so only invited users can join meetings.
- Use a TURN server (coturn or a managed TURN service) for reliable connectivity across NAT/firewalls.
- Persist meetings and participants in your DB (MongoDB is in this project) if needed.
- Add UI controls to toggle camera/mic, mute/unmute, and screen sharing (getDisplayMedia).

If you'd like, next actions can be:
- Add a ready-made React component into the app/ pages to demo creating and joining meetings with video elements wired up (Recommended).
- Add TURN server support and environment integration.
- Add authentication checks for meeting creation/joining.

Which next step should be done now? (use the options below)

- Add frontend demo page (Recommended)
- Add TURN server integration guidance only
- Stop here (I've got what I need)
