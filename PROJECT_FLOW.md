# BoardSync - Project Architecture and Flow

## Overview
BoardSync is a full-stack web application designed for managing board meetings, minutes, action items, and real-time video conferencing. It is built using a modern React framework (Next.js) for the frontend and API, combined with a custom Node.js/Socket.IO server for real-time WebRTC signaling.

## Core Technologies
*   **Frontend**: Next.js (App Router), React 19, Tailwind CSS, Radix UI.
*   **Backend (REST API)**: Next.js API Routes (`app/api`).
*   **Database**: MongoDB (accessed via Mongoose).
*   **Real-time Communication**: Express + Socket.IO (`server.js`).
*   **WebRTC**: Browser-native WebRTC APIs for peer-to-peer video/audio.

---

## Architecture Flow

The application is split into two main servers running concurrently during development:

1.  **The Next.js Server (Port 3000)**: Handles serving the UI, static assets, and the RESTful API endpoints.
2.  **The Signaling Server (Port 4000)**: Handles WebRTC signaling via WebSockets (Socket.IO).

### 1. Data Management (CRUD Operations)
*   **Models**: Located in the `models/` directory, these define the MongoDB schema structure (e.g., `Meeting.ts`, `User.ts`, `Minutes.ts`).
*   **API Routes**: Located in `app/api/`, these Next.js route handlers process incoming HTTP requests from the frontend, interact with MongoDB using the defined models, and return JSON responses.
*   **Frontend Pages**: Located in `app/`, pages like `/dashboard`, `/meetings`, and `/minutes` fetch data from the API routes and render the UI components.

### 2. Authentication & Authorization
*   The project uses `next-auth` (v5 beta) and `bcryptjs` for secure user authentication and session management.
*   Users can register and log in (`/register`, `/login`), and protected routes enforce access control based on user roles (defined in `models/Role.ts`).

### 3. Real-Time Video Meetings (WebRTC Flow)
When a user joins a meeting with video/audio, the following flow occurs:
1.  **Join Room**: The user navigates to the meeting page and their browser connects to the Signaling Server (`server.js`) via Socket.IO.
2.  **Signaling**: The client emits a `join-room` event with the `meetingId`.
3.  **Peer Discovery**: The Signaling Server notifies other participants in the room (`user-joined`).
4.  **WebRTC Handshake**:
    *   The joining client creates an `RTCPeerConnection` for every existing participant.
    *   It generates an `offer` containing its media capabilities and sends it via the Signaling Server to the target peer.
    *   The peer receives the offer, creates an `answer`, and sends it back.
    *   Both peers exchange `ice-candidate` messages through the Signaling Server to establish the most direct network path (NAT traversal).
5.  **P2P Stream**: Once signaling is complete, a direct peer-to-peer connection is established. Video and audio streams are sent directly between browsers, bypassing the server.

### 4. Other Features
*   **Email Notifications**: `nodemailer` is configured for sending emails (e.g. meeting invites, password resets).
*   **File Storage**: Integrates with AWS S3 (`@aws-sdk/client-s3`) and Cloudinary for storing documents and avatars.
*   **PDF Generation**: Uses `jspdf` to generate downloadable meeting minutes and reports.
*   **AI Integration**: Contains `openai` dependency, suggesting AI features like summarizing meeting minutes or generating action items.

---

## Directory Structure Highlights
*   `/app`: Next.js App Router containing all UI pages (`/dashboard`, `/meetings`, etc.) and API endpoints (`/api`).
*   `/components`: Reusable React UI components.
*   `/models`: Mongoose database schemas.
*   `/lib`: Shared utility functions, database connection setup, etc.
*   `server.js`: The standalone Socket.IO signaling server for WebRTC.
*   `package.json`: Contains the scripts (`npm run dev` to start Next.js, `npm run server` to start the signaling server).
