# Real-Time Collaborative Editor

A collaborative workspace where people can work on the same document at the same time, without having to refresh the page or worry about losing each other's changes.

The idea behind this project is simple: make teamwork easier by allowing multiple users to edit, share, and manage documents together in real time.

Whether it's working on a college assignment, sharing notes, or collaborating on a project, everyone stays in sync while working on the same document.

## ✨ What can you do with it?

- **Create an account and log in** – Users can securely access their own workspaces.
- **Create workspaces** – Organize documents and collaborate with other people in one place.
- **Edit together** – Multiple users can work on the same document simultaneously.
- **No editing conflicts** – Yjs (CRDT) handles simultaneous changes and keeps everyone's content in sync.
- **See who's online** – View other users' presence, avatars, and live cursors.
- **Rich text editing** – Format documents with headings, lists, bold text, links, and more.
- **Add comments** – Share feedback and discuss changes directly within documents.
- **View previous versions** – Keep track of document changes and restore earlier versions.
- **Manage permissions** – Give users view, comment, or edit access.
- **Stay connected** – WebSockets make sure updates are delivered instantly.

## 🧰 Technologies Used

| Technology | How it's used |
|---|---|
| Next.js | Building the frontend and application pages |
| WebSockets | Keeping users connected and syncing changes |
| Yjs (CRDT) | Handling simultaneous edits without conflicts |
| PostgreSQL | Storing users, workspaces, and documents |
| Prisma | Managing database operations |
| Redis | Caching and supporting multiple server instances |

## 🏗️ How does it work?

The application is designed around real-time communication.

1. A user creates a workspace and invites others to collaborate.
2. Everyone opens the same document.
3. When someone makes a change, Yjs tracks the update.
4. WebSockets send that update to the other connected users.
5. Yjs automatically merges concurrent changes so everyone sees a consistent document.
6. PostgreSQL keeps the data available even after users leave.
7. Redis helps coordinate updates when the application runs across multiple server instances.

## 📁 Project Structure

```text
collaborative-editor/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
│
├── backend/
│   ├── auth/
│   ├── workspaces/
│   ├── documents/
│   ├── websocket/
│   └── comments/
│
├── prisma/
│   └── schema.prisma
│
├── docker-compose.yml
├── .env.example
└── README.md
```

*The structure above is a suggested layout. Update it to match the actual project folders.*

## 🚀 Getting Started

Want to run the project locally? Follow these steps.

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- PostgreSQL
- Redis
- Git

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd collaborative-editor
```

### 2. Install dependencies

```bash
npm install
```

If frontend and backend have separate package files, install dependencies in each directory.

### 3. Set up environment variables

Create a `.env` file and add your database and Redis connection details.

```env
DATABASE_URL="your_postgresql_connection_url"
REDIS_URL="redis://localhost:6379"
```

Add the remaining configuration required by your application.

### 4. Set up the database

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Start the application

Run the frontend, backend, and WebSocket services using their respective development scripts.

Open the application in your browser:

```text
http://localhost:3000
```

*Note: Update the commands according to your actual npm scripts and project configuration.*

## 🧪 Testing the Collaboration

One of the best ways to test this project is to open it in two different browser windows.

1. Log in using two different user accounts.
2. Create a workspace and share it with the second user.
3. Open the same document in both browsers.
4. Start typing in one browser.
5. Check whether the changes appear in the other browser instantly.
6. Try editing the same section from both browsers.
7. Check live cursors, comments, permissions, and version history.

This helps verify that the real-time collaboration features work as expected.

## 🌱 Future Improvements

There is always room to make the platform better. Some improvements planned for the future include:

- Offline editing with automatic synchronization.
- Document export in PDF and DOCX formats.
- File and folder management.
- Improved workspace notifications.
- Better collaboration analytics.
- AI-powered writing suggestions.

