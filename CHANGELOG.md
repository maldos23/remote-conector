# Changelog

## Version 2.0.0 - Simple Architecture (Feb 11, 2026)

### 🔄 Major Refactoring

**Breaking Changes:**
- Complete architecture overhaul to simplified client-server model
- Server now executes commands (previously only routed messages)
- Single client type that sends commands and receives responses
- Removed complex SOLID architecture layers

### ✨ New Files

**Core Components:**
- `server_simple.py` - WebSocket server that executes commands
- `client_simple.py` - WebSocket client that sends commands

**Docker Support:**
- `Dockerfile.server` - Server container configuration
- `Dockerfile.client` - Client container configuration
- `docker-compose.yml` - Docker orchestration

**Documentation:**
- `doc/ARCHITECTURE.md` - Updated for new simple architecture
- `doc/EXAMPLES.md` - Updated usage examples
- `doc/DOCKER.md` - New Docker deployment guide
- `README.md` - Rewritten for new architecture
- `README.es.md` - Spanish README

### 🗑️ Removed Files

**Old Architecture:**
- `src/` - Complete SOLID architecture directory removed
  - `src/domain/` - Domain models
  - `src/interfaces/` - Abstract interfaces
  - `src/infrastructure/` - Concrete implementations
  - `src/application/` - Business logic
  - `src/server/` - Old server implementation
  - `src/client/` - Old client implementations
  - `src/config.py` - Configuration module

**Old Entry Points:**
- `server.py` - Old server entry point
- `controller.py` - Controller client
- `executor.py` - Executor client
- `start_server.py` - Separated server launcher
- `start_controller.py` - Separated controller launcher
- `start_executor.py` - Separated executor launcher

**Orchestration:**
- `run.py` - Simple orchestrator
- `run_parallel.py` - Parallel orchestrator
- `start.sh` - Unix shell wrapper
- `start.bat` - Windows batch wrapper

**Old Documentation:**
- `CHANGELOG.md` - Old changelog
- `COMMUNICATION_FLOW.md` - Old flow diagrams
- `GETTING_STARTED.md` - Old tutorial
- `doc/ORCHESTRATORS.md` - Orchestration guide
- `doc/QUICKREF.md` - Quick reference
- `doc/VISUAL_GUIDE.txt` - Visual guide

**Utilities:**
- `test_connection.py` - Connection test script
- `help.sh` - Help script
- `.env.example` - Environment example file

### 🎯 Key Changes

**Architecture:**
- From: Controller → Server → Executor model
- To: Client → Server model (server executes commands)

**Message Flow:**
- From: Complex message routing with COMMAND, RESPONSE, CONNECT, DISCONNECT, HEARTBEAT types
- To: Simple JSON messages `{"command": "..."}` and `{"type": "response", ...}`

**Client Roles:**
- From: Separate CONTROLLER and EXECUTOR roles
- To: Single client type that sends commands

**Server Behavior:**
- From: Message router between controllers and executors
- To: Command executor that runs commands and returns results

**Deployment:**
- Added Docker support with Dockerfiles and docker-compose
- Simplified to two components (server and client)

### 📝 Features

**Retained:**
- ✅ WebSocket real-time communication
- ✅ Multiple simultaneous clients support
- ✅ Asynchronous command execution
- ✅ Interactive terminal interface
- ✅ Error handling and reporting

**New:**
- ✅ Docker containerization
- ✅ Docker Compose orchestration
- ✅ Simplified architecture
- ✅ Direct command execution on server
- ✅ Command-line URL argument support

**Removed:**
- ❌ SOLID architecture layers
- ❌ Dependency injection
- ❌ Abstract interfaces
- ❌ Message routing
- ❌ Client roles (controller/executor)
- ❌ Orchestration scripts
- ❌ Complex configuration

### 🔧 Technical Details

**Dependencies:**
- Kept: `websockets`, `python-dotenv`
- Removed: All other dependencies (pydantic, etc.)

**Code Reduction:**
- From: ~15+ files, complex architecture
- To: 2 main files, simple architecture
- Lines of code: Reduced by ~70%

**Complexity:**
- From: 5 architecture layers
- To: 2 simple components

### 📦 Migration Guide

**For Users:**

1. Stop old components:
   ```bash
   # Old way - no longer works
   python run.py
   ```

2. Start new components:
   ```bash
   # New way
   python server_simple.py  # Terminal 1
   python client_simple.py  # Terminal 2
   ```

3. Or use Docker:
   ```bash
   docker-compose up
   ```

**For Developers:**

- No migration needed - complete rewrite
- Old code archived in git history (Version 1.x.x)
- New code starts fresh with simple architecture

### ⚠️ Breaking Changes

**API Changes:**
- Message format changed completely
- No more client roles
- No more message types (COMMAND, RESPONSE, etc.)
- No more configuration files

**File Structure:**
- All old files removed
- New simplified structure
- Documentation restructured

**Deployment:**
- No more orchestration scripts
- Use Docker Compose instead
- Manual start or Docker only

### 🔐 Security

**Note:** Security features planned for future versions:
- Authentication
- Command validation
- TLS/SSL encryption (WSS)
- Rate limiting
- Audit logging

### 🎯 Rationale

This major refactoring was done to:
1. Simplify the architecture for easier understanding
2. Remove unnecessary complexity for the use case
3. Focus on core functionality (remote command execution)
4. Improve maintainability
5. Add Docker support for modern deployment
6. Make it easier for new users to get started

The previous SOLID architecture, while educational, was over-engineered for this simple use case.

---

## Version 1.x.x - SOLID Architecture (Previous)

See git history for previous versions with SOLID architecture.

**Key Features (Version 1.x.x):**
- 5-layer SOLID architecture
- Domain-Driven Design
- Controller and Executor client roles
- Message routing server
- Dependency injection
- Abstract interfaces
- Multiple orchestration options
- Extensive documentation

**Available in git history:** Tag `v1.x.x`
