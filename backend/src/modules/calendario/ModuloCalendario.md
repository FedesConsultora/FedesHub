# Módulo de Calendario
Gestión de eventos, calendarios locales y sincronización con Google Calendar.

## Estructura
- **CalendarioLocal**: Calendario gestionado por FedesHub.
- **Evento**: Citas, reuniones o hitos en el tiempo.
- **Vínculo**: Sincronización entre calendarios locales y remotos.

## Rutas
- `GET /`: Listado de calendarios.
- `GET /eventos`: Listado de eventos por rango.
- `POST /eventos`: Crear evento.
