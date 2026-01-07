# Módulo de Chat
Comunicación en tiempo real a través de canales, grupos y mensajes directos.

## Estructura
- **Canal**: Espacio de conversación (público o privado).
- **Mensaje**: Unidad básica de comunicación.
- **Miembro**: Asociación de usuario a canal con roles específicos.

## Rutas
- `GET /canales`: Listado de canales disponibles para el usuario.
- `POST /canales`: Crear nuevo canal o grupo.
- `GET /canales/:id/mensajes`: Historial de mensajes.
