#!/usr/bin/env python3
"""
WebSocket Server - Sends commands to connected clients
Server has interactive terminal to send commands to clients for execution
"""

import asyncio
import json
import websockets
from typing import Set
from websockets.server import WebSocketServerProtocol

# Connected clients
connected_clients: Set[WebSocketServerProtocol] = set()
# Store responses from clients
client_responses = {}


async def handle_client(websocket: WebSocketServerProtocol):
    """Handle client connection and receive responses"""
    connected_clients.add(websocket)
    client_id = id(websocket)
    print(f"\n✅ Client {client_id} connected. Total clients: {len(connected_clients)}\n$ ", end="", flush=True)
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                # Store response from client
                if data.get("type") == "response":
                    client_responses[client_id] = data
                    
                    print(f"\n{'='*60}")
                    print(f"📥 RESPONSE FROM CLIENT {client_id}")
                    print("="*60)
                    
                    if data.get("status") == "success":
                        print("✅ Status: SUCCESS")
                        if data.get("output"):
                            print("\n📄 Output:")
                            print(data["output"])
                    else:
                        print("❌ Status: ERROR")
                        if data.get("error"):
                            print("\n⚠️  Error:")
                            print(data["error"])
                    
                    if "exit_code" in data:
                        print(f"\n🔢 Exit Code: {data['exit_code']}")
                    
                    print("="*60 + "\n")
                    print("$ ", end="", flush=True)
                    
            except json.JSONDecodeError:
                print(f"\n❌ Invalid JSON from client {client_id}\n$ ", end="", flush=True)
            except Exception as e:
                print(f"\n❌ Error handling message from client {client_id}: {e}\n$ ", end="", flush=True)
                
    except websockets.exceptions.ConnectionClosed:
        print(f"\n🔌 Client {client_id} disconnected\n$ ", end="", flush=True)
    finally:
        connected_clients.remove(websocket)
        print(f"\n👋 Client {client_id} removed. Total clients: {len(connected_clients)}\n$ ", end="", flush=True)


async def send_command_to_clients(command: str):
    """Send command to all connected clients"""
    if not connected_clients:
        print("⚠️  No clients connected. Waiting for clients...\n")
        return
    
    message = json.dumps({"type": "command", "command": command})
    
    # Send to all connected clients
    disconnected = set()
    for client in connected_clients:
        try:
            await client.send(message)
            client_id = id(client)
            print(f"📤 Sent command to client {client_id}")
        except Exception as e:
            print(f"❌ Failed to send to client {id(client)}: {e}")
            disconnected.add(client)
    
    # Remove disconnected clients
    for client in disconnected:
        connected_clients.discard(client)


async def interactive_terminal():
    """Interactive terminal for sending commands"""
    print("\n✅ Server ready! Waiting for client connections...")
    print("\n💡 Type commands to send to connected clients (or 'exit' to quit):")
    print("-"*60 + "\n")
    
    while True:
        try:
            # Read command from terminal
            command = await asyncio.get_event_loop().run_in_executor(
                None, input, "$ "
            )
            
            command = command.strip()
            
            if not command:
                continue
            
            if command.lower() in ["exit", "quit", "q"]:
                print("👋 Shutting down server...")
                break
            
            if command == "clients":
                print(f"\n📊 Connected clients: {len(connected_clients)}")
                for client in connected_clients:
                    print(f"  - Client {id(client)}")
                print()
                continue
            
            await send_command_to_clients(command)
            
        except EOFError:
            break
        except KeyboardInterrupt:
            print("\n👋 Shutting down server...")
            break


async def main():
    """Start WebSocket server"""
    host = "0.0.0.0"
    port = 8765
    
    print("="*60)
    print("🚀 WebSocket Command Server")
    print("="*60)
    print(f"🌐 Server URL: ws://{host}:{port}")
    print(f"📡 Listening on: {host}:{port}")
    print("="*60)
    
    server = await websockets.serve(handle_client, host, port)
    
    try:
        await interactive_terminal()
    finally:
        server.close()
        await server.wait_closed()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⛔ Server stopped by user")
