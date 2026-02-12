# WebSocket Remote Command Execution - Architecture

## Overview

This is a simplified client-server architecture where:
- **Server**: Sends commands to connected clients via interactive terminal
- **Client**: Connects to server and executes received commands

## Architecture Diagram

```
┌─────────────────┐          ┌─────────────────┐
│                 │          │                 │
│  WebSocket      │◄────────►│  WebSocket      │
│  Server         │          │  Client         │
│                 │          │                 │
│  - Sends cmds   │          │  - Executes cmds│
│  - Interactive  │          │  - Returns      │
│    terminal     │          │    responses    │
└─────────────────┘          └─────────────────┘
```

## Components

### Server (`server_simple.py`)

**Responsibilities:**
- Listen for WebSocket connections on port 8765
- Accept multiple client connections simultaneously
- Provide interactive terminal interface for sending commands
- Send commands to all connected clients
- Receive and display execution results from clients

**Key Functions:**
- `interactive_terminal()`: Interactive command prompt interface
- `send_command_to_clients()`: Broadcasts commands to all connected clients
- `handle_client()`: Manages client connections and receives responses
- `main()`: Starts the WebSocket server

**Message Format:**
- Output to clients: `{"type": "command", "command": "ls -la"}`
- Input from clients: `{"type": "response", "status": "success|error", "output": "...", "error": "...", "exit_code": 0}`

### Client (`client_simple.py`)

**Responsibilities:**
- Connect to WebSocket server URL
- Listen for commands from server
- Execute received commands using shell subprocess
- Send execution results back to server

**Key Functions:**
- `get_server_url()`: Prompts user for server URL or uses argument
- `execute_command()`: Executes shell commands asynchronously
- `listen_for_commands()`: Listens for commands and executes them
- `main()`: Connects to server and starts listening

**Usage:**
```bash
# Interactive mode (prompts for URL)
python client_simple.py

# Direct URL argument
python client_simple.py ws://localhost:8765
```

## Communication Flow

```
1. Client starts → Prompts for server URL
2. Client connects to server
3. Server accepts connection
4. Client sends command: {"command": "ls"}
5. Server executes command
6. Server sends response: {"type": "response", "status": "success", "output": "..."}
7. Client displays result
8. Repeat steps 4-7
    │                       │───── COMMAND ────────►│
    │                       │      "ls -la"         │
    │                       │                       │
```

## Data Flow

```
Client Input (Terminal)
    │
    ▼
JSON Message {"command": "..."}
    │
    ▼
WebSocket Connection
    │
    ▼
Server Receives Message
    │
    ▼
Command Execution (subprocess)
    │
    ▼
JSON Response {"type": "response", ...}
    │
    ▼
WebSocket Connection
    │
    ▼
Client Displays Result
```

## Technology Stack

- **Python 3.11+**: Programming language
- **websockets**: WebSocket library for async communication
- **asyncio**: Asynchronous I/O framework
- **subprocess**: Command execution
- **Docker**: Containerization (optional)

## Design Principles

### Simplicity
- Single responsibility per component
- Minimal dependencies
- Clear separation of concerns

### Asynchronous
- Non-blocking I/O operations
- Multiple concurrent client connections
- Async command execution

### Extensibility
- Easy to add authentication
- Can add command validation
- Supports custom message types

## Security Considerations

⚠️ **Warning**: This implementation executes arbitrary commands. In production:

1. **Add Authentication**: Verify client identity before accepting commands
2. **Command Validation**: Whitelist allowed commands
3. **User Permissions**: Run server with limited user permissions
4. **Network Security**: Use TLS/SSL for encrypted communication
5. **Input Sanitization**: Validate and sanitize command inputs
6. **Rate Limiting**: Prevent command flooding
7. **Logging**: Log all command executions for audit

## Docker Deployment

The system includes Docker support for easy deployment:

### Server Container
- Exposes port 8765
- Runs command execution server
- Isolated environment

### Client Container
- Connects to server container
- Interactive terminal access
- Can connect to external servers

### Docker Compose
- Orchestrates both containers
- Automatic networking
- Easy scaling

## Future Enhancements

- Authentication system
- Command history
- File transfer support
- Encrypted communication (WSS)
- Web-based client interface
- Command queuing
