# Docker Guide

## Overview

This project includes Docker support for easy deployment and containerization of both server and client components.

## Files

- `Dockerfile.server` - Server container configuration
- `Dockerfile.client` - Client container configuration
- `docker-compose.yml` - Orchestration for both containers

## Quick Start with Docker Compose

### Start Everything

```bash
# Build and start both server and client
docker-compose up --build
```

This will:
1. Build server image
2. Build client image
3. Start server container (port 8765)
4. Start client container (connects to server)

### Background Mode

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View server logs only
docker-compose logs -f server

# View client logs only
docker-compose logs -f client
```

### Stop Services

```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Server Container

### Build Server Image

```bash
docker build -f Dockerfile.server -t websocket-server .
```

### Run Server Container

```bash
# Run on default port 8765
docker run -p 8765:8765 websocket-server

# Run in background
docker run -d -p 8765:8765 --name ws-server websocket-server

# View logs
docker logs -f ws-server

# Stop server
docker stop ws-server

# Remove container
docker rm ws-server
```

### Server Container Details

- **Base Image**: `python:3.11-slim`
- **Working Directory**: `/app`
- **Exposed Port**: `8765`
- **Command**: `python server_simple.py`
- **Network**: Listens on `0.0.0.0` (accepts external connections)

## Client Container

### Build Client Image

```bash
docker build -f Dockerfile.client -t websocket-client .
```

### Run Client Container

```bash
# Interactive mode with local server
docker run -it websocket-client python client_simple.py ws://host.docker.internal:8765

# Connect to external server
docker run -it websocket-client python client_simple.py ws://192.168.1.100:8765

# Run in background (not recommended for interactive client)
docker run -d --name ws-client websocket-client
```

### Client Container Details

- **Base Image**: `python:3.11-slim`
- **Working Directory**: `/app`
- **Command**: `python client_simple.py`
- **Interactive**: Requires `-it` flag for terminal input

## Docker Compose Architecture

```yaml
services:
  server:
    - Exposes port 8765 to host
    - Runs on websocket-network
    - Auto-restarts unless stopped
    
  client:
    - Connects to server via internal network
    - Interactive terminal (stdin/tty)
    - Depends on server (starts after)
```

## Network Configuration

### Docker Network

```bash
# List networks
docker network ls

# Inspect websocket-network
docker network inspect remote-conector_websocket-network

# Containers on same network can communicate using service names
# Example: ws://server:8765
```

### Port Mapping

```bash
# Server exposes 8765
# Host machine can connect via:
# - ws://localhost:8765
# - ws://127.0.0.1:8765
# - ws://host.docker.internal:8765 (from containers)
```

## Multiple Clients

### Start Multiple Client Containers

```bash
# Start server
docker-compose up -d server

# Start multiple clients
docker run -it --network remote-conector_websocket-network websocket-client python client_simple.py ws://server:8765

# In another terminal
docker run -it --network remote-conector_websocket-network websocket-client python client_simple.py ws://server:8765
```

## Development with Docker

### Mount Local Files

```bash
# Server with live code updates
docker run -p 8765:8765 -v $(pwd)/server_simple.py:/app/server_simple.py websocket-server

# Client with live code updates
docker run -it -v $(pwd)/client_simple.py:/app/client_simple.py websocket-client
```

### Debug Mode

```bash
# Run with bash for debugging
docker run -it --entrypoint /bin/bash websocket-server

# Inside container
root@container:/app# python server_simple.py
```

## Production Deployment

### Build Production Images

```bash
# Tag with version
docker build -f Dockerfile.server -t websocket-server:1.0.0 .
docker build -f Dockerfile.client -t websocket-client:1.0.0 .

# Tag as latest
docker tag websocket-server:1.0.0 websocket-server:latest
docker tag websocket-client:1.0.0 websocket-client:latest
```

### Push to Registry

```bash
# Login to Docker Hub
docker login

# Tag for registry
docker tag websocket-server:latest username/websocket-server:latest

# Push to registry
docker push username/websocket-server:latest
```

### Deploy on Remote Server

```bash
# SSH to remote server
ssh user@remote-server

# Pull image
docker pull username/websocket-server:latest

# Run container
docker run -d -p 8765:8765 --name ws-server --restart unless-stopped username/websocket-server:latest
```

## Environment Variables

### Override Server Port

```yaml
# docker-compose.yml
services:
  server:
    environment:
      - PORT=9000
    ports:
      - "9000:9000"
```

### Override Client URL

```yaml
# docker-compose.yml
services:
  client:
    environment:
      - SERVER_URL=ws://server:9000
    command: python client_simple.py ws://server:9000
```

## Security Considerations

### Run as Non-Root User

```dockerfile
# Add to Dockerfile
RUN useradd -m -u 1000 appuser
USER appuser
```

### Read-Only Filesystem

```bash
docker run -p 8765:8765 --read-only --tmpfs /tmp websocket-server
```

### Resource Limits

```yaml
# docker-compose.yml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs ws-server

# Check if port is in use
lsof -i :8765

# Inspect container
docker inspect ws-server
```

### Network Issues

```bash
# Test connectivity from client to server
docker run -it --network remote-conector_websocket-network alpine ping server

# Check if server is listening
docker exec ws-server netstat -tulpn | grep 8765
```

### Permission Issues

```bash
# Run with current user
docker run --user $(id -u):$(id -g) websocket-server
```

## Useful Commands

```bash
# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune -a

# View container resource usage
docker stats

# Execute command in running container
docker exec -it ws-server bash

# Copy files from container
docker cp ws-server:/app/logs.txt ./logs.txt

# Save image to file
docker save websocket-server > websocket-server.tar

# Load image from file
docker load < websocket-server.tar
```

## Docker Compose Commands

```bash
# Build without cache
docker-compose build --no-cache

# Start specific service
docker-compose up server

# Scale services
docker-compose up --scale client=3

# View service status
docker-compose ps

# Restart services
docker-compose restart

# Pull latest images
docker-compose pull
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Docker Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build server
        run: docker build -f Dockerfile.server -t websocket-server .
      
      - name: Build client
        run: docker build -f Dockerfile.client -t websocket-client .
      
      - name: Test
        run: |
          docker-compose up -d
          sleep 5
          docker-compose logs
          docker-compose down
```

## Best Practices

1. **Use specific Python versions** in Dockerfile (e.g., `python:3.11-slim`)
2. **Minimize image size** by using slim base images
3. **Use .dockerignore** to exclude unnecessary files
4. **Run containers as non-root** for security
5. **Use health checks** to monitor container status
6. **Tag images with versions** for better version control
7. **Use multi-stage builds** for smaller production images
8. **Set resource limits** to prevent resource exhaustion
9. **Use docker-compose** for local development
10. **Use orchestration tools** (Kubernetes, Docker Swarm) for production
