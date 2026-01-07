# Módulo de Clientes
Gestión de clientes, contactos y categorización comercial.

## Estructura
- **Cliente**: Entidad principal.
- **Contacto**: Personas asociadas a la empresa.
- **Tipos**: Categorización por ponderación (A, B, C, etc).

## Rutas
- `GET /catalog`: Catálogos de tipos y estados.
- `GET /`: Listado de clientes.
- `POST /`: Crear cliente.
- `PATCH /:id`: Actualizar cliente.