# Usage Examples

## Quick Start

### 1. Start Server

```bash
python server_simple.py
```

**Expected Output:**
```
============================================================
🚀 WebSocket Command Execution Server
============================================================
🌐 Server URL: ws://0.0.0.0:8765
📡 Listening on: 0.0.0.0:8765
⏳ Waiting for client connections...
============================================================
```

### 2. Start Client

**Terminal 2:**
```bash
python client_simple.py
```

**Expected Output:**
```
============================================================
🔌 WebSocket Command Client
============================================================
🌐 Enter WebSocket server URL (e.g., ws://localhost:8765): ws://localhost:8765

🔄 Connecting to ws://localhost:8765...

✅ Connected to server!

💡 Type your commands (or 'exit' to quit):
------------------------------------------------------------

$ 
```

## Example Session

### Basic Commands

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
Dockerfile.server
Dockerfile.client
docker-compose.yml

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

### Command with Arguments

```bash
$ ls -la
📤 Sent: ls -la

============================================================
📥 RESPONSE FROM SERVER
============================================================
✅ Status: SUCCESS

📄 Output:
total 48
drwxr-xr-x  12 user  staff   384 Feb 11 10:30 .
drwxr-xr-x  25 user  staff   800 Feb 11 09:15 ..
-rw-r--r--   1 user  staff   156 Feb 11 10:20 Dockerfile.client
-rw-r--r--   1 user  staff   201 Feb 11 10:20 Dockerfile.server
-rw-r--r--   1 user  staff  2845 Feb 11 10:25 client_simple.py
-rw-r--r--   1 user  staff   442 Feb 11 10:21 docker-compose.yml
-rw-r--r--   1 user  staff    32 Feb 11 09:00 requirements.txt
-rw-r--r--   1 user  staff  2156 Feb 11 10:18 server_simple.py

🔢 Exit Code: 0
============================================================
```

### Error Handling

```bash
$ invalid_command_xyz
📤 Sent: invalid_command_xyz

============================================================
📥 RESPONSE FROM SERVER
============================================================
❌ Status: ERROR

⚠️  Error:
/bin/sh: invalid_command_xyz: command not found

🔢 Exit Code: 127
============================================================
```

### Exit Client

```bash
$ exit
👋 Disconnecting...
```

## Multiple Clients

You can connect multiple clients to the same server simultaneously.

### Server Side

```
============================================================
🚀 WebSocket Command Execution Server
============================================================
🌐 Server URL: ws://0.0.0.0:8765
📡 Listening on: 0.0.0.0:8765
⏳ Waiting for client connections...
============================================================
✅ Client 140234567890 connected. Total clients: 1
✅ Client 140234567891 connected. Total clients: 2
📥 Received command from client 140234567890: ls
📤 Sent response to client 140234567890
📥 Received command from client 140234567891: pwd
📤 Sent response to client 140234567891
```

## Docker Usage

### Build and Run with Docker Compose

```bash
# Build and start both server and client
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Build and Run Server Separately

```bash
# Build server image
docker build -f Dockerfile.server -t websocket-server .

# Run server container
docker run -p 8765:8765 websocket-server
```

### Build and Run Client Separately

```bash
# Build client image
docker build -f Dockerfile.client -t websocket-client .

# Run client container (interactive)
docker run -it websocket-client python client_simple.py ws://host.docker.internal:8765
```

## Remote Connection

### Connect to Remote Server

If the server is running on a remote machine:

```bash
python client_simple.py ws://192.168.1.100:8765
```

Or enter the URL when prompted:

```
🌐 Enter WebSocket server URL: ws://192.168.1.100:8765
```

### Server Configuration for Remote Access

Make sure the server binds to `0.0.0.0` (not `localhost`) to accept remote connections:

```python
# In server_simple.py
host = "0.0.0.0"  # Accepts connections from any IP
port = 8765
```

### Firewall Configuration

Ensure port 8765 is open:

```bash
# Linux (ufw)
sudo ufw allow 8765/tcp

# macOS
# Allow in System Preferences > Security & Privacy > Firewall > Options
```

## Advanced Usage

### Using Command-line Arguments

```bash
# Client with URL argument
python client_simple.py ws://localhost:8765

# Connect to remote server
python client_simple.py ws://remote-server.com:8765
```

### Multiple Commands

```bash
$ echo "Hello World"
$ date
$ whoami
$ hostname
$ uname -a
```

### Piping and Redirection

```bash
$ ls | grep .py
$ cat requirements.txt
$ echo "test" > /tmp/test.txt
$ cat /tmp/test.txt
```

## Troubleshooting

### Server Not Starting

**Error:** `Address already in use`

**Solution:**
```bash
# Find process using port 8765
lsof -i :8765

# Kill the process
kill -9 <PID>

# Or use a different port in server_simple.py
```

### Client Cannot Connect

**Error:** `Could not connect to ws://localhost:8765`

**Solution:**
1. Verify server is running
2. Check server URL is correct
3. Ensure firewall allows connections
4. Try `ws://127.0.0.1:8765` instead of `ws://localhost:8765`

### Command Execution Timeout

If commands take too long, they may timeout. Consider adding timeout handling:

```python
# In server_simple.py, add timeout
process = await asyncio.wait_for(
    asyncio.create_subprocess_shell(...),
    timeout=30.0  # 30 seconds
)
```

## Best Practices

1. **Always start server before clients**
2. **Use `exit` to properly disconnect clients**
3. **Check server logs for connection issues**
4. **Use absolute paths in commands for consistency**
5. **Test commands locally before using in client**
6. **Monitor server output for errors**
7. **Keep client and server versions synchronized**
