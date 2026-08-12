# BoardSync - Functionality & Flowcharts

This document contains flowcharts and sequence diagrams that explain the core functionalities of the BoardSync application. You can use these visual diagrams (rendered via Mermaid) to present the system architecture and user flows to your clients.

## 1. High-Level System Architecture
This flowchart shows how the different parts of the BoardSync ecosystem interact with each other. It highlights the separation between the standard web server and the real-time signaling server.

```mermaid
flowchart TD
    Client[Client Browser]
    
    subgraph Next.js Server
        UI[Frontend UI - React 19]
        API[API Routes - Backend]
    end
    
    subgraph Real-time Server
        Signaling[Socket.IO Signaling]
    end
    
    DB[(MongoDB Database)]
    Ext[External Services \n AWS S3, Cloudinary, OpenAI]
    
    Client <-->|HTTPS (View & Actions)| UI
    Client <-->|REST API| API
    Client <-->|WebSocket (Join Meeting)| Signaling
    
    API <-->|Mongoose queries| DB
    API <-->|API Calls| Ext
    
    Client <-.->|WebRTC P2P Video/Audio| Peer[Other Meeting Participants]

    classDef server fill:#f9f,stroke:#333,stroke-width:2px;
    classDef db fill:#bbf,stroke:#333,stroke-width:2px;
    class Next.js Server,Real-time Server server;
    class DB db;
```

---

## 2. General User Journey
This flowchart demonstrates the typical journey of a user from logging in to interacting with the dashboard based on their role.

```mermaid
flowchart LR
    A([User Login / Register]) --> Auth{Authentication \n (NextAuth)}
    Auth -->|Success| RoleCheck{Role Check}
    Auth -->|Fail| A
    
    RoleCheck -->|Admin| C[Admin Dashboard]
    RoleCheck -->|Board Member| D[Member Dashboard]
    
    C --> E[Manage Users & Roles]
    C --> F[Schedule & Create Meetings]
    
    D --> G[View Upcoming Meetings]
    D --> H[Review Documents & Agendas]
    
    F --> I[System Emails Invites \n (Nodemailer)]
    I --> G
```

---

## 3. The Meeting Lifecycle
This shows the entire lifecycle of a single board meeting, from scheduling to post-meeting activities.

```mermaid
flowchart TD
    Start([Schedule Meeting]) --> Attach[Attach Agendas & Documents]
    Attach --> Invite[Send Invites & Collect RSVPs]
    
    Invite --> LiveMeeting{Meeting Starts}
    
    LiveMeeting --> Video[Real-time Video/Audio]
    LiveMeeting --> Chat[In-Meeting Chat]
    LiveMeeting --> Notes[Live Minute Taking]
    
    Video --> EndMeeting([End Meeting])
    Chat --> EndMeeting
    Notes --> EndMeeting
    
    EndMeeting --> AI[AI Processing \n (Summarize/Extract Actions)]
    AI --> GeneratePDF[Generate PDF Minutes]
    GeneratePDF --> Distribute[Distribute to Members]
    Distribute --> Tracking[Track Action Items]
```

---

## 4. Real-time Video Meeting Flow (WebRTC)
This sequence diagram is helpful for technically inclined clients. It explains how peer-to-peer video is established without passing heavy video streams through the server.

```mermaid
sequenceDiagram
    autonumber
    participant Participant A
    participant Signaling Server (Socket.IO)
    participant Participant B
    
    Participant A->>Signaling Server: Join Room (Meeting ID)
    Signaling Server->>Participant A: Current Participants List
    Signaling Server->>Participant B: Notify: Participant A Joined
    
    Note over Participant A, Participant B: WebRTC Handshake Begins
    
    Participant A->>Signaling Server: Send WebRTC Offer
    Signaling Server->>Participant B: Relay Offer
    
    Participant B->>Signaling Server: Send WebRTC Answer
    Signaling Server->>Participant A: Relay Answer
    
    Participant A->>Signaling Server: Send ICE Candidates (Network details)
    Signaling Server->>Participant B: Relay ICE Candidates
    
    Participant B->>Signaling Server: Send ICE Candidates (Network details)
    Signaling Server->>Participant A: Relay ICE Candidates
    
    Note over Participant A, Participant B: Direct P2P Connection Established!
    Participant A=>>Participant B: Direct Video/Audio Stream
```
