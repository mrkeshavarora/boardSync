const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory meeting store (for demo). Replace with DB in production.
const meetings = new Map();

app.post('/meetings', (req, res) => {
  // create a new meeting and return id and optional metadata
  const id = uuidv4();
  const { title } = req.body || {};
  meetings.set(id, { id, title: title || 'Untitled Meeting', participants: [] });
  res.json({ id, title: title || 'Untitled Meeting' });
});

app.get('/meetings/:id', (req, res) => {
  const id = req.params.id;
  const meeting = meetings.get(id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  res.json(meeting);
});

const server = http.createServer(app);

// Socket.IO server for WebRTC signalling
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Room -> Set of socket ids
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join-room', ({ meetingId, user }) => {
    console.log(`Socket ${socket.id} joining meeting ${meetingId}`);
    socket.join(meetingId);

    // track participants
    if (!rooms.has(meetingId)) rooms.set(meetingId, new Set());
    const set = rooms.get(meetingId);
    set.add(socket.id);

    // notify others
    socket.to(meetingId).emit('user-joined', { socketId: socket.id, user });

    // send current participants to joining socket
    const participants = Array.from(set).filter((id) => id !== socket.id);
    socket.emit('current-participants', { participants });
  });

  socket.on('offer', ({ to, from, description, userName }) => {
    console.log(`Offer from ${from} to ${to}`);
    // Forward userName so the receiving peer can display the sender's name
    io.to(to).emit('offer', { from, description, userName });
  });

  socket.on('answer', ({ to, from, description }) => {
    console.log(`Answer from ${from} to ${to}`);
    io.to(to).emit('answer', { from, description });
  });

  socket.on('ice-candidate', ({ to, from, candidate }) => {
    // relay ICE candidate
    io.to(to).emit('ice-candidate', { from, candidate });
  });

  socket.on('speech-caption', ({ meetingId, senderName, text }) => {
    socket.to(meetingId).emit('speech-caption', { senderName, text, timestamp: new Date().toISOString() });
  });

  socket.on('speaking', ({ meetingId, isSpeaking }) => {
    socket.to(meetingId).emit('user-speaking', { peerId: socket.id, isSpeaking });
  });

  socket.on('host-control', ({ meetingId, targetPeerId, action }) => {
    socket.to(meetingId).emit('host-control', { targetPeerId, action });
  });

  socket.on('transcript:partial', (data) => {
    // Broadcast to everyone ELSE in the room — sender already shows it via local-transcript event
    socket.to(data.meetingId).emit('transcript:partial', data);
  });

  socket.on('transcript:final', (data) => {
    // Broadcast to everyone ELSE in the room — sender already shows it via local-transcript event
    socket.to(data.meetingId).emit('transcript:final', data);
  });

  socket.on('transcript:error', (data) => {
    io.to(data.meetingId).emit('transcript:error', data);
  });

  socket.on('transcript:started', (data) => {
    io.to(data.meetingId).emit('transcript:started', data);
  });

  socket.on('transcript:stopped', (data) => {
    io.to(data.meetingId).emit('transcript:stopped', data);
  });

  socket.on('leave-room', ({ meetingId }) => {
    socket.leave(meetingId);
    if (rooms.has(meetingId)) {
      const set = rooms.get(meetingId);
      set.delete(socket.id);
      socket.to(meetingId).emit('user-left', { socketId: socket.id });
      if (set.size === 0) rooms.delete(meetingId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
    // remove from any rooms
    for (const [meetingId, set] of rooms.entries()) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        socket.to(meetingId).emit('user-left', { socketId: socket.id });
        if (set.size === 0) rooms.delete(meetingId);
      }
    }
  });
});

const PORT = process.env.SIGNALING_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Signalling server running on port ${PORT}`);
});

// Keep-alive: prevent Render free tier from sleeping (pings itself every 14 min)
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    require('https').get(RENDER_URL, (res) => {
      console.log(`Keep-alive ping: ${res.statusCode}`);
    }).on('error', (err) => {
      console.warn('Keep-alive ping failed:', err.message);
    });
  }, 14 * 60 * 1000);
}
