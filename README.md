# WebSocket Remote Command Execution

A simple Python WebSocket-based system for remote command execution. The server executes commands received from clients and returns the results.

## 🎯 Features

- **Simple Architecture**: Server sends commands, clients execute them
- **Real-time Communication**: WebSocket protocol for instant command execution
- **Multiple Clients**: Send commands to multiple executor clients simultaneously
- **Interactive Server Terminal**: User-friendly command interface on server
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Asynchronous**: Built with asyncio for efficient performance

## 🏗️ Architecture

```
┌─────────────────┐          ┌─────────────────┐
│  WebSocket      │◄────────►│  WebSocket      │
│  Server         │          │  Client         │
│  - Sends cmds   │          │  - Executes cmds│
│  - Has terminal │          │  - Returns      │
│    interface    │          │    responses    │
└─────────────────┘          └─────────────────┘
```

**How it works:**
1. Client connects to server via WebSocket
2. Server sends command to client: `{"type": "command", "command": "ls -la"}`
3. Client executes command using shell subprocess
4. Client returns result: `{"type": "response", "status": "success", "output": "...", "exit_code": 0}`
5. Server displays result

## 📋 Requirements

- Python 3.11 or higher
- pip (Python package manager)
- Docker (optional, for containerized deployment)

## 🚀 Quick Start

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd remote-conector
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Usage

#### 1. Start Client (in one or more terminals)

```bash
python client_simple.py
```

The client will prompt for the server URL:
```
🌐 Enter WebSocket server URL (e.g., ws://localhost:8765): 
```

Enter `ws://localhost:8765` or press Enter for default.

Expected output:
```
✅ Connected to server!
💡 Waiting for commands from server...
```

#### 2. Start Server (interactive terminal)

```bash
python server_simple.py
```

Expected output:
```
============================================================
🚀 WebSocket Command Server
============================================================
🌐 Server URL: ws://0.0.0.0:8765
📡 Listening on: 0.0.0.0:8765
============================================================
✅ Server ready! Waiting for client connections...

💡 Type commands to send to connected clients (or 'exit' to quit):
$ 
```

#### 3. Send Commands from Server

Type commands in the server terminal:
```bash
$ ls -la
$ pwd
$ echo "Hello World"
$ date
$ clients  # Special command to see connected clients
```

Type `exit` to shut down server.

## 🐳 Docker Usage

### Using Docker Compose (Recommended)

```bash
# Build and start both server and client
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Docker Directly

**Server:**
```bash
docker build -f Dockerfile.server -t websocket-server .
docker run -p 8765:8765 websocket-server
```

**Client:**
```bash
docker build -f Dockerfile.client -t websocket-client .
docker run -it websocket-client python client_simple.py ws://host.docker.internal:8765
```

## 📖 Documentation

- [Architecture](doc/ARCHITECTURE.md) - System architecture and design
- [Examples](doc/EXAMPLES.md) - Usage examples and scenarios
- [Docker Guide](doc/DOCKER.md) - Docker deployment guide

## 🔧 Configuration

### Server Configuration

Edit [server_simple.py](server_simple.py):
```python
host = "0.0.0.0"  # Listen on all interfaces
port = 8765       # WebSocket port
```

### Client Configuration

Pass URL as argument:
```bash
python client_simple.py ws://192.168.1.100:8765
```

## 🌐 Remote Connection

### Server Setup (for remote access)

1. Ensure server binds to `0.0.0.0` (not `localhost`)
2. Open firewall port 8765
3. Note your server's IP address

### Client Connection

```bash
python client_simple.py ws://<server-ip>:8765
```

Example:
```bash
python client_simple.py ws://192.168.1.100:8765
```

## ⚠️ Security Warning

**This implementation executes arbitrary shell commands. Use with caution!**

For production use, implement:
- Authentication (API keys, tokens)
- Command validation and whitelisting
- TLS/SSL encryption (WSS protocol)
- User permission controls
- Rate limiting
- Command audit logging

## 🧪 Example Session

```bash
$ ls
📤 Sent: ls

============================================================
📥 RESPONSE FROM SERVER
============================================================
✅ Status: SUCCESS

📄 Output:
client_simple.py
server_simple.py
requirements.txt

🔢 Exit Code: 0
============================================================

$ pwd
📤 Sent: pwd

============================================================
📥 RESPONSE FROM SERVER
============================================================
✅ Status: SUCCESS

📄 Output:
/Users/ginomissaelromero/remote-conector

🔢 Exit Code: 0
============================================================
```

## 📁 Project Structure

```
remote-conector/
├── server_simple.py       # WebSocket server (executes commands)
├── client_simple.py       # WebSocket client (sends commands)
├── requirements.txt       # Python dependencies
├── Dockerfile.server      # Server container
├── Dockerfile.client      # Client container
├── docker-compose.yml     # Docker orchestration
├── doc/                   # Documentation
│   ├── ARCHITECTURE.md    # System architecture
│   ├── EXAMPLES.md        # Usage examples
│   └── DOCKER.md          # Docker guide
└── README.md              # This file
```

## 🛠️ Troubleshooting

### Server won't start
- Check if port 8765 is already in use: `lsof -i :8765`
- Kill existing process or change port

### Client can't connect
- Verify server is running
- Check server URL is correct
- Ensure firewall allows connections
- Try `ws://127.0.0.1:8765` instead of `ws://localhost:8765`

### Command fails
- Check if command is valid on server's OS
- Verify command syntax
- Check server logs for error details

## 📝 License

This project is provided as-is for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📧 Support

For issues or questions, please check the [documentation](doc/) or open an issue on GitHub.

---

[🇪🇸 Leer en Español](README.es.md)
