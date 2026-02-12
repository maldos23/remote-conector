#!/usr/bin/env python3
"""
WebSocket Client - Connects to server and executes received commands
Client connects to server URL and executes commands sent by the server
"""

import asyncio
import json
import subprocess
import websockets
import sys
import os


def get_server_url() -> str:
    """Prompt user for server URL"""
    print("="*60)
    print("🔌 WebSocket Command Executor Client")
    print("="*60)
    
    # Priority 1: Command line argument
    if len(sys.argv) > 1:
        url = sys.argv[1]
        print(f"📡 Using URL from argument: {url}")
        return url
    
    # Priority 2: Environment variables
    server_host = os.getenv('SERVER_HOST')
    server_port = os.getenv('SERVER_PORT', '8765')
    
    if server_host:
        url = f"ws://{server_host}:{server_port}"
        print(f"📡 Using URL from environment: {url}")
        return url
    
    # Priority 3: Ask user
    url = input("🌐 Enter WebSocket server URL (e.g., ws://localhost:8765): ").strip()
    
    if not url:
        url = "ws://localhost:8765"
        print(f"⚙️  Using default: {url}")
    
    return url


async def execute_command(command: str) -> dict:
    """Execute shell command and return result"""
    try:
        print(f"\n⚙️  Executing command: {command}")
        
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        result = {
            "type": "response",
            "status": "success" if process.returncode == 0 else "error",
            "output": stdout.decode(),
            "error": stderr.decode(),
            "exit_code": process.returncode
        }
        
        print(f"✅ Command executed (exit code: {process.returncode})")
        
        return result
        
    except Exception as e:
        print(f"❌ Error executing command: {e}")
        return {
            "type": "response",
            "status": "error",
            "output": "",
            "error": str(e),
            "exit_code": -1
        }


async def listen_for_commands(websocket):
    """Listen for commands from server and execute them"""
    print("\n✅ Connected to server!")
    print("\n💡 Waiting for commands from server...")
    print("-"*60 + "\n")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data.get("type") == "command":
                    command = data.get("command", "")
                    
                    if not command:
                        continue
                    
                    print(f"\n📥 Received command from server: {command}")
                    
                    # Execute command
                    result = await execute_command(command)
                    
                    # Send response back to server
                    await websocket.send(json.dumps(result))
                    print(f"📤 Sent response to server\n")
                
            except json.JSONDecodeError:
                print("❌ Error: Invalid JSON from server")
            except Exception as e:
                print(f"❌ Error processing message: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print("\n🔌 Connection to server closed")


async def main():
    """Connect to WebSocket server"""
    server_url = get_server_url()
    
    print(f"\n🔄 Connecting to {server_url}...")
    
    try:
        async with websockets.connect(server_url) as websocket:
            await listen_for_commands(websocket)
            
    except ConnectionRefusedError:
        print(f"\n❌ Error: Could not connect to {server_url}")
        print("💡 Make sure the server is running")
    except Exception as e:
        print(f"\n❌ Connection error: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⛔ Client stopped by user")
