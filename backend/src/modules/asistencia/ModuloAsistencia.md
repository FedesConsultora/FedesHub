# Módulo de Asistencia
Módulo para el registro de check-in / check-out, gestión de planes semanales y reportes de tiempo trabajado.

## Rutas
- `GET /registros`: Listado global de registros.
- `POST /check-in`: Registrar entrada.
- `PATCH /registros/:id/check-out`: Registrar salida.
- `GET /resumen/periodo`: Reporte de horas por feder.
