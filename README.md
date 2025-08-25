# FedesHub — Plataforma interna de gestión (MVP)

**Estado:** MVP en desarrollo  
**Stack:** Node.js (20.x), Sequelize ORM (6.x), PostgreSQL, Docker  
**Dominios de negocio:** Auth y roles, Cargos, Feders (personas), Asistencia, **Ausencias** (con cupos/asignaciones y aprobación), Células, Clientes, **Tareas** (con jerarquía y múltiples responsables), Calendario (personal + vista de disponibilidad), Notificaciones.

---

## 🎯 Objetivo del proyecto

FedesHub es la plataforma interna para coordinar el trabajo y la operación diaria en Fedes. El MVP cubre:

- **Identidad y permisos** (Auth, Roles/Permisos) para dividir responsabilidades sin fricción.  
- **Personas y organización** (Feders, Cargos, Células) con reglas simples: dentro de una célula, todos pueden editar lo de su célula.  
- **Tareas** con múltiples responsables, colaboradores y **subtareas (padre/hija)**, priorización simple e (opcional) aprobación.  
- **Ausencias** con **cupos asignados** (por RRHH/Admin), **uso contra cupos**, y **solicitudes de cupo** cuando alguien necesita más.  
- **Calendario personal** (todos crean eventos, nadie elimina eventos ajenos) y vista de disponibilidad de otros para agendar reuniones.  
- **Notificaciones** básicas para avisos de tareas/ausencias/eventos.

---

## 🧭 Decisiones clave de negocio (resumen ejecutable)

- **Roles:** `Admin`, `RRHH`, `C‑lever` (tridente de valor), `CuentasAnalista`, `Feder`, `Onboarding` (antes “Invitado”).  
- **Células:** no hay “líder” formal; **todos los miembros** pueden **ver y editar** el contenido de su célula. El tridente de valor (**C‑lever**) tiene acceso transversal.  
- **Calendario:** todos pueden **crear** eventos; el calendario es **personal**; nadie puede **eliminar** eventos de otro; todos pueden **ver disponibilidad** de otros.  
- **Ausencias:** todos los roles **ven las ausencias aprobadas** de todos.  
  - RRHH/Admin **asignan cupos** (días u horas) por tipo y vigencia.  
  - El usuario **usa** esos cupos para solicitar sus ausencias (requiere aprobación).  
  - Puede **solicitar cupos** si necesita más (flujo de “asignación de cupo”).  
  - **No Pagado** siempre está disponible (sin cupo previo) pero **requiere aprobación**.  
  - Ejemplos de política inicial: **Vacaciones** (15 días/año), **Tristeza** (5 días/año), **Examen** (32 horas/año).
- **Tareas:** se soporta **jerarquía** (tarea padre → subtareas), **múltiples responsables** (con opcional “líder”), y **colaboradores**. Si una tarea requiere aprobación, **quien la crea no la aprueba** (aplican reglas de rol).

---

## 🧩 Módulos implementados

1) **Auth**: usuarios, dominios de email, roles/tipos de rol, permisos por módulo/acción, mapeo rol‑permiso, revocación de JWT.  
2) **Cargos**: catálogo y asignación a Feders.  
3) **Feders (Personas)**: datos de la persona, estado, célula, modalidad laboral por día.  
4) **Asistencia**: check‑in/out y cierres.  
5) **Ausencias**: **Unidad** (día/hora), **Tipos** con reglas (`requiere_asignacion`, `permite_medio_dia`), **Cuotas** (asignadas por RRHH/Admin), **Consumos** al aprobar, **Solicitudes de cupo**.  
6) **Células**: estados, tipos de rol dentro de célula (para etiquetar, sin jerarquía), asignaciones.  
7) **Clientes**: tipos/estados, contactos.  
8) **Tareas**: estados, impacto/urgencia (para prioridad), comentarios/adjuntos, **responsables/colaboradores**, **subtareas**.  
9) **Calendario**: calendarios locales personales, eventos (con visibilidad), asistentes, vínculos con Google (placeholder).  
10) **Notificaciones**: tipos/canales/plantillas, envíos y preferencias.

---

## 🗃️ Modelo de datos (puntos destacados)

### Ausencias (novedades)

- `AusenciaUnidadTipo` (`dia`/`hora`).  
- `AusenciaTipo`: `unidad_id` (FK), `requiere_asignacion` (bool), `permite_medio_dia` (bool).  
- `Ausencia` agrega `duracion_horas` para tipos en horas (y un check: si es medio día, `fecha_desde = fecha_hasta`).  
- **Cuotas:** `AusenciaCuota` (cupo asignado a cada feder por tipo/unidad y vigencia), `AusenciaCuotaConsumo` (descuento al aprobar).  
- **Solicitud de cupo:** `AusenciaAsignacionSolicitud` + `AsignacionSolicitudEstado`.

### Tareas

- `Tarea.tarea_padre_id` (FK a `Tarea.id`, con check para evitar auto‑referencia), `TareaResponsable` (N:M con `Feder`, `es_lider` opcional), `TareaColaborador` (N:M).

En `backend/db/migrations` están:

> - **`20250819133013-0001-initial-schema`**: todo el esquema base (10 módulos) e **incluye** `tarea_padre_id`.
> - **`20250820132334-0002-ausencias-cuotas-y-asignaciones`**: extensión de Ausencias (unidades, cuotas, consumos, solicitudes).

---

## 🗂️ Estructura de carpetas

``` bash
backend/
  db/
    migrations/
      20250819133013-0001-initial-schema.cjs
      20250820132334-0002-ausencias-cuotas-y-asignaciones.js
    seeders/
      20250820142345-0001-auth-base.cjs
      20250820143008-0002-auth-permissions-map.cjs
      20250820143022-0100-core-catalogs.cjs
      20250820143028-0150-ausencias-catalogs.cjs
      20250820143036-0200-sample-initial-data.cjs
    README.sql (si aplica)
  src/
    core/
      config.cjs
    models/
      associations.js
      auth/
        User.js
        Rol.js
        UserRol.js
        Modulo.js
        AuthEmailDominio.js
        JwtRevocacion.js
        // ...Accion, Permiso, RolPermiso, RolTipo
      cargos/
        Cargo.js
        CargoAmbito.js
        FederCargo.js
      feders/
        Feder.js
        FederEstadoTipo.js
        FederModalidadDia.js
        ModalidadTrabajoTipo.js
        DiaSemana.js
      asistencia/
        AsistenciaRegistro.js
        AsistenciaOrigenTipo.js
        AsistenciaCierreMotivoTipo.js
      ausencias/
        AusenciaUnidadTipo.js
        AusenciaTipo.js
        AusenciaEstado.js
        MitadDiaTipo.js
        Ausencia.js
        AusenciaCuota.js
        AusenciaCuotaConsumo.js
        AusenciaAsignacionSolicitud.js
        AsignacionSolicitudEstado.js
      celulas/
        Celula.js
        CelulaEstado.js
        CelulaRolTipo.js
        CelulaRolAsignacion.js
      clientes/
        Cliente.js
        ClienteEstado.js
        ClienteTipo.js
        ClienteContacto.js
      tareas/
        Tarea.js
        TareaEstado.js
        ImpactoTipo.js
        UrgenciaTipo.js
        ComentarioTipo.js
        TareaAprobacionEstado.js
        TareaResponsable.js
        TareaColaborador.js
        TareaComentario.js
        TareaAdjunto.js
      calendario/
        CalendarioLocal.js
        CalendarioTipo.js
        VisibilidadTipo.js
        Evento.js
        EventoTipo.js
        EventoAsistente.js
        AsistenteTipo.js
        SyncDireccionTipo.js
        CalendarioVinculo.js
        GoogleCuenta.js
        GoogleCalendario.js
        GoogleWebhookCanal.js
        EventoSync.js
      notificaciones/
        Notificacion.js
        NotificacionTipo.js
        ImportanciaTipo.js
        CanalTipo.js
        ProveedorTipo.js
        EstadoEnvio.js
        NotificacionDestino.js
        NotificacionEnvio.js
        NotificacionPreferencia.js
        NotificacionPlantilla.js
    // luego /modules con controladores, servicios, validators y repositorios
docker/
  // docker-compose.yml, Dockerfile (si aplica en tu repo)
README.md
```

> La estructura exacta puede variar según el repo, pero el **esqueleto de modelos y migraciones** es el de arriba.

---

## ⚙️ Puesta en marcha (Docker)

### Variables de entorno

Configurar `src/core/config.cjs` para los perfiles `development` / `test` / `production`.  
Ejemplo mínimo (ya configurado en el repo):

- DB: `fedeshub` (PostgreSQL)  
- Usuario/Password: provistos por el `docker-compose.yml` del entorno local  
- Dialect: `postgres`

### Comandos dentro del contenedor `fedes-hub`

> Reemplazar el nombre si tu contenedor difiere.

```bash
# 1) Crear DB (si no existe)
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:create"

# 2) Migrar
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:migrate"

# 3) Semillas (seeders)
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:seed:all"
```

### Reset rápido de la base (útil en desarrollo)

```bash
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:drop"
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:create"
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:migrate"
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:seed:all"
```

### Undo selectivo

```bash
# Deshacer último seed (por archivo)
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:seed:undo"

# Deshacer todos los seeds
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:seed:undo:all"

# Deshacer última migración
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:migrate:undo"

# Deshacer todas las migraciones (vacía el esquema)
docker exec -it fedes-hub sh -lc "npx sequelize-cli db:migrate:undo:all"
```

---

## 🌱 Seeders incluidos (alineados a lo conversado)

> **Usuarios iniciales**:  
> `sistemas@fedes.ai` (Admin), `ralbanesi@fedes.ai` (RRHH), `epinotti@fedes.ai` (Feder), `gcanibano@fedes.ai` (CuentasAnalista).  
> Contraseñas: `changeme` (solo para dev; **cambiar en prod**).

1. **`20250820142345-0001-auth-base.cjs`**  
   - Dominios (`fedes.ai`), tipos de rol, módulos, acciones, roles base (incluye `C‑lever`), permisos por módulo/acción, mapeo rol‑permiso (por defecto).

2. **`20250820143008-0002-auth-permissions-map.cjs`**  
   - Ajustes de permisos para reglas clave:  
     - Calendario: todos `create`; nadie `delete` en eventos ajenos.  
     - Ausencias: todos `read` las **aprobadas**; RRHH/Admin pueden **asignar cupos** y **aprobar**.  
     - Células: miembros con **edición completa** de su célula; `C‑lever` con **acceso transversal**.

3. **`20250820143022-0100-core-catalogs.cjs`**  
   - Catálogos generales (estados de célula/feder, modalidades de trabajo, etc.).

4. **`20250820143028-0150-ausencias-catalogs.cjs`**  
   - **Unidades de ausencia** (`dia`, `hora`), estados de ausencia, mitad de día, estados de solicitud de cupo.  
   - Tipos de ausencia (política inicial): `vacaciones` (día), `tristeza` (día), `examen` (hora), `personal` (hora), `no_pagado` (día).  
   - Reglas: `no_pagado` disponible sin cupo, pero con aprobación.

5. **`20250820143036-0200-sample-initial-data.cjs`**  
   - Alta de **usuarios** (4), **célula** “Core”, **feders** (enlazados), **cliente demo**, **calendarios personales**.  
   - Asignación de **roles**: Admin, RRHH, CuentasAnalista, Feder.

> **Nota:** Si querés sembrar **cupos por persona** (vacaciones, tristeza, examen), se incluye un seeder opcional `0210-ausencias-default-quotas.cjs`. Está preparado para buscar usuarios existentes y crear cupos del año actual; activalo según tu necesidad.

---

## 🔒 Reglas de permisos (resumen)

- **Onboarding**: acceso muy limitado (login básico y creación de eventos personales).  
- **Feder**: operación diaria (tareas, calendario propio, ver ausencias aprobadas).  
- **CuentasAnalista**: permisos adicionales en módulo Clientes/Tareas de cliente.  
- **RRHH**: gestionar **cupos** y aprobar **ausencias**.  
- **C‑lever** (tridente de valor): acceso a la vista global de células y clientes (solo lectura + analítica, y edición donde aplique a estrategia).  
- **Admin**: superusuario.

> **Calendario:** create para todos, update/delete solo en eventos propios; lectura de disponibilidad ajena.  
> **Ausencias:** todos ven las aprobadas, **RRHH/Admin** aprueban; **no_pagado** requiere aprobación y no consume cupo.  
> **Tareas:** creador ≠ aprobador (cuando aplique), múltiples responsables, subtareas.

---

## 🛠️ Desarrollo

- **Estándares de código:** ESLint/Prettier (por incorporar), convenciones de nombres `snake_case` en DB y `camelCase` en JS.  
- **Asociaciones:** definidas en `src/models/associations.js`.  
- **Servicios/Controladores:** a completar iterativamente (API REST).

---

## 🧭 Roadmap corto

- API REST para Ausencias (cuotas, solicitudes y aprobación) y Tareas (aprobación cuando corresponda).  
- Integración Google Calendar (sincronización completa).  
- Métricas/Cuadros de mando para C‑lever.  
- Notificaciones push y email productivas.  
- UI: SPA/Next.js (fase siguiente).

---

## 👥 Créditos

- Reglas y validaciones afinadas en sesiones con **Romina Albanesi** y equipo.  
- Implementación técnica: **Enzo Pinotti**.

---

## 📄 Licencia

Privado (uso interno Fedes).
