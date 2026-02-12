# Ejecución Remota de Comandos por WebSocket

Un sistema simple basado en WebSocket con Python para ejecución remota de comandos. El servidor ejecuta los comandos recibidos de los clientes y devuelve los resultados.

## 🎯 Características

- **Arquitectura Simple**: Servidor envía comandos, clientes los ejecutan
- **Comunicación en Tiempo Real**: Protocolo WebSocket para ejecución instantánea de comandos
- **Múltiples Clientes**: Envía comandos a múltiples clientes ejecutores simultáneamente
- **Terminal Interactiva del Servidor**: Interfaz de usuario amigable en el servidor
- **Soporte Docker**: Despliegue fácil con Docker y Docker Compose
- **Asíncrono**: Construido con asyncio para rendimiento eficiente

## 🏗️ Arquitectura

```
┌─────────────────┐          ┌─────────────────┐
│  Servidor       │◄────────►│  Cliente        │
│  WebSocket      │          │  WebSocket      │
│  - Envía cmds   │          │  - Ejecuta cmds │
│  - Terminal     │          │  - Retorna      │
│    interactiva  │          │    respuestas   │
└─────────────────┘          └─────────────────┘
```

**Cómo funciona:**
1. El cliente se conecta al servidor vía WebSocket
2. El servidor envía comando al cliente: `{"type": "command", "command": "ls -la"}`
3. El cliente ejecuta el comando usando subprocess de shell
4. El cliente retorna el resultado: `{"type": "response", "status": "success", "output": "...", "exit_code": 0}`
5. El servidor muestra el resultado

## 📋 Requisitos

- Python 3.11 o superior
- pip (gestor de paquetes de Python)
- Docker (opcional, para despliegue containerizado)

## 🚀 Inicio Rápido

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd remote-conector
   ```

2. **Crear entorno virtual:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # En Windows: .venv\Scripts\activate
   ```

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

### Uso

#### 1. Iniciar Cliente (en una o más terminales)

```bash
python client_simple.py
```

El cliente solicitará la URL del servidor:
```
🌐 Enter WebSocket server URL (e.g., ws://localhost:8765): 
```

Ingresa `ws://localhost:8765` o presiona Enter para usar el predeterminado.

Salida esperada:
```
✅ Connected to server!
💡 Waiting for commands from server...
```

#### 2. Iniciar Servidor (terminal interactiva)

```bash
python server_simple.py
```

Salida esperada:
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

#### 3. Enviar Comandos desde el Servidor

Escribe comandos en la terminal del servidor:
```bash
$ ls -la
$ pwd
$ echo "Hola Mundo"
$ date
$ clients  # Comando especial para ver clientes conectados
```

Escribe `exit` para apagar el servidor.

## 🐳 Uso con Docker

### Usando Docker Compose (Recomendado)

```bash
# Construir e iniciar servidor y cliente
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

### Usando Docker Directamente

**Servidor:**
```bash
docker build -f Dockerfile.server -t websocket-server .
docker run -p 8765:8765 websocket-server
```

**Cliente:**
```bash
docker build -f Dockerfile.client -t websocket-client .
docker run -it websocket-client python client_simple.py ws://host.docker.internal:8765
```

## 📖 Documentación

- [Arquitectura](doc/ARCHITECTURE.md) - Arquitectura y diseño del sistema (en inglés)
- [Ejemplos](doc/EXAMPLES.md) - Ejemplos de uso y escenarios (en inglés)
- [Guía Docker](doc/DOCKER.md) - Guía de despliegue Docker (en inglés)

## 🔧 Configuración

### Configuración del Servidor

Editar [server_simple.py](server_simple.py):
```python
host = "0.0.0.0"  # Escuchar en todas las interfaces
port = 8765       # Puerto WebSocket
```

### Configuración del Cliente

Pasar URL como argumento:
```bash
python client_simple.py ws://192.168.1.100:8765
```

## 🌐 Conexión Remota

### Configuración del Servidor (para acceso remoto)

1. Asegurar que el servidor se vincule a `0.0.0.0` (no `localhost`)
2. Abrir puerto 8765 en el firewall
3. Anotar la dirección IP del servidor

### Conexión del Cliente

```bash
python client_simple.py ws://<ip-del-servidor>:8765
```

Ejemplo:
```bash
python client_simple.py ws://192.168.1.100:8765
```

## ⚠️ Advertencia de Seguridad

**¡Esta implementación ejecuta comandos de shell arbitrarios. Usar con precaución!**

Para uso en producción, implementar:
- Autenticación (claves API, tokens)
- Validación de comandos y lista blanca
- Cifrado TLS/SSL (protocolo WSS)
- Controles de permisos de usuario
- Limitación de tasa
- Registro de auditoría de comandos

## 🧪 Sesión de Ejemplo

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

## 📁 Estructura del Proyecto

```
remote-conector/
├── server_simple.py       # Servidor WebSocket (ejecuta comandos)
├── client_simple.py       # Cliente WebSocket (envía comandos)
├── requirements.txt       # Dependencias de Python
├── Dockerfile.server      # Contenedor del servidor
├── Dockerfile.client      # Contenedor del cliente
├── docker-compose.yml     # Orquestación Docker
├── doc/                   # Documentación
│   ├── ARCHITECTURE.md    # Arquitectura del sistema
│   ├── EXAMPLES.md        # Ejemplos de uso
│   └── DOCKER.md          # Guía Docker
└── README.md              # Este archivo
```

## 🛠️ Solución de Problemas

### El servidor no inicia
- Verificar si el puerto 8765 ya está en uso: `lsof -i :8765`
- Matar el proceso existente o cambiar el puerto

### El cliente no puede conectar
- Verificar que el servidor esté ejecutándose
- Verificar que la URL del servidor sea correcta
- Asegurar que el firewall permita conexiones
- Probar `ws://127.0.0.1:8765` en lugar de `ws://localhost:8765`

### El comando falla
- Verificar si el comando es válido en el SO del servidor
- Verificar la sintaxis del comando
- Revisar los logs del servidor para detalles del error

## 📝 Licencia

Este proyecto se proporciona tal cual para propósitos educativos.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor siéntete libre de enviar issues o pull requests.

## 📧 Soporte

Para problemas o preguntas, por favor revisa la [documentación](doc/) o abre un issue en GitHub.

---

[🇬🇧 Read in English](README.md)
