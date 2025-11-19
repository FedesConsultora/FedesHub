# FedesHub Codebase Structure Report

## Project Overview
- **Backend**: Node.js/Express with Sequelize ORM (not Django)
- **Frontend**: React with Vite
- **Database**: Sequelize models (appears to be PostgreSQL-compatible based on JSONB usage)
- **Architecture**: Modular structure with separate modules for each domain

---

## BACKEND STRUCTURE

### Core Files
- `/backend/src/app.js` - Main Express application setup
- `/backend/src/server.js` - Server initialization
- `/backend/src/router.js` - Dynamic module router that auto-loads routers from modules

### Models Location: `/backend/src/models/`

Each module has dedicated model files (Sequelize ORM):

#### **Tareas Module Models** (19 files)
Located at: `/backend/src/models/tareas/`
- **Tarea.js** - Main task model with:
  - cliente_id, hito_id, tarea_padre_id (parent task)
  - titulo, descripcion, estado_id
  - creado_por_feder_id, requiere_aprobacion, aprobacion_estado_id
  - aprobado_por_user_id, aprobado_at (approval tracking)
  - fecha_inicio, vencimiento (dates)
  - impacto_id, urgencia_id, prioridad_num (priority system)
  - progreso_pct (progress percentage)
  - orden_kanban, is_archivada, finalizada_at
  - Indexes: cliente_id, estado_id, hito_id, vencimiento, prioridad_num, tarea_padre_id

- **TareaResponsable.js** - Links feders to tasks (with es_lider flag)
- **TareaColaborador.js** - Collaborators on tasks (with optional rol)
- **TareaEstado.js** - Task status types (codigo, nombre)
- **TareaEtiqueta.js** - Tags/labels for tasks (color_hex support)
- **TareaEtiquetaAsig.js** - Junction table for task-tag assignments
- **TareaComentario.js** - Comments on tasks (with reply_to_id for threading)
- **TareaComentarioMencion.js** - User mentions in comments
- **TareaChecklistItem.js** - Checklist items with orden and is_done status
- **TareaAdjunto.js** - File attachments (drive_file_id, drive_url support)
- **TareaFavorito.js** - Favorite markers (per user)
- **TareaSeguidor.js** - Followers/watchers on tasks
- **TareaRelacion.js** - Task-to-task relationships
- **TareaRelacionTipo.js** - Types of task relationships
- **ImpactoTipo.js** - Impact levels (with puntos)
- **UrgenciaTipo.js** - Urgency levels (with puntos)
- **TareaKanbanPos.js** - Kanban board position tracking (per user, per stage)
- **TareaAprobacionEstado.js** - Approval workflow states
- **ComentarioTipo.js** - Comment type taxonomy

#### **Asistencia Module Models** (4 files)
Located at: `/backend/src/models/asistencia/`
- **AsistenciaRegistro.js** - Main attendance record:
  - feder_id, check_in_at, check_in_origen_id
  - check_out_at, check_out_origen_id
  - cierre_motivo_id, modalidad_id
  - comentario (notes)
  - Indexes: (feder_id, check_in_at), check_out_at, modalidad_id

- **AsistenciaOrigenTipo.js** - Attendance check-in/out source types
- **AsistenciaCierreMotivoTipo.js** - Reasons for closing attendance
- **MitadDiaTipo.js** - Half-day types

#### **Feders Module Models** (9 files)
Located at: `/backend/src/models/feders/`
- **Feder.js** - Main feder (employee/worker) model:
  - user_id, celula_id, estado_id
  - nombre, apellido, telefono, avatar_url
  - fecha_ingreso, fecha_egreso
  - is_activo (boolean)
  - **NEW - Encrypted ERP fields:**
    - nombre_legal, dni_tipo, dni_numero_enc (JSON AES-GCM)
    - cuil_cuit_enc (JSON AES-GCM), fecha_nacimiento
    - domicilio_json (JSONB: calle, nro, piso, cp, ciudad, provincia, pais)

- **FederEstadoTipo.js** - Feder status types
- **FederModalidadDia.js** - Work modality per day
- **ModalidadTrabajoTipo.js** - Work modality types (full-time, part-time, etc.)
- **DiaSemana.js** - Weekday enumeration
- **FederBanco.js** - Bank account information
- **FederEmergencia.js** - Emergency contacts
- **FirmaPerfil.js** - Digital signature profiles
- **ModelosFeders.md** - Documentation file

#### **Células Module Models** (5 files)
Located at: `/backend/src/models/celulas/`
- **Celula.js** - Main cell/department model:
  - nombre, slug (unique), descripcion
  - **NEW:** perfil_md (markdown profile), avatar_url, cover_url
  - estado_id
  - Indexes: estado_id, unique slug

- **CelulaEstado.js** - Cell status types
- **CelulaRolTipo.js** - Role types within cells
- **CelulaRolAsignacion.js** - Role assignments
- **ModelosCelulas.md** - Documentation

#### **Clientes Module Models** (6 files)
Located at: `/backend/src/models/clientes/`
- **Cliente.js** - Main client model:
  - celula_id, tipo_id, estado_id
  - nombre (unique), alias, email, telefono, sitio_web
  - descripcion, ponderacion (importance/weight)
  - Indexes: celula_id, tipo_id, estado_id, ponderacion

- **ClienteTipo.js** - Client type classifications
- **ClienteEstado.js** - Client status types
- **ClienteContacto.js** - Client contact information
- **ClienteHito.js** - Client milestones
- **ModelosClientes.md** - Documentation

---

### Modules Structure: `/backend/src/modules/`

Each module follows this pattern:
```
module/
  ├── router.js           # Express routes
  ├── controllers/        # HTTP handlers
  ├── services/           # Business logic
  ├── repositories/       # Data access
  └── validators.js       # Input validation
```

#### **Tareas Module** (`/backend/src/modules/tareas/`)

**Routes** (`router.js`):
- `GET /tareas/health` - Health check
- `GET /tareas/catalog` - Catalogs (estados, impactos, urgencias, clientes)
- `GET /tareas/compose` - Compose data
- `GET /tareas/` - List tasks (with filters)
- `GET /tareas/:id` - Get task detail
- `POST /tareas/` - Create task
- `PATCH /tareas/:id` - Update task
- `PATCH /tareas/:id/archive` - Archive task
- `PATCH /tareas/:id/estado` - Change state
- `PATCH /tareas/:id/aprobacion` - Approve/reject with workflow
- `PATCH /tareas/:id/kanban` - Kanban position
- `POST /tareas/:id/adjuntos/upload` - Upload files (multipart)
- `POST/DELETE /tareas/:id/responsables` - Add/remove responsible feders
- `POST/DELETE /tareas/:id/colaboradores` - Add/remove collaborators
- `POST /tareas/:id/responsables/leader` - Set task leader
- `POST/DELETE /tareas/:id/etiquetas` - Add/remove labels
- `GET/POST /tareas/:id/checklist` - Manage checklist
- `PATCH /tareas/:id/checklist/reorder` - Reorder checklist items
- `GET/POST /tareas/:id/comentarios` - Manage comments
- `GET/POST/DELETE /tareas/:id/adjuntos` - Manage task attachments
- `POST/DELETE /tareas/:id/relaciones` - Task relationships
- `POST /tareas/:id/favorite` - Toggle favorite
- `POST /tareas/:id/follow` - Toggle follower

**Service** (`services/tareas.service.js` - 1005 lines):
- `svcListCatalogos()` - Returns all task catalogs
- `svcCompose()` - Scopes clients by user's celula
- `svcListTareas()` - Advanced filtering with SQL:
  - Supports: q (search), cliente_id, hito_id, estado_id, responsable_feder_id
  - Date filtering (vencimiento), priority ordering
  - `solo_mias`, `include_archivadas` flags
  - Pagination with limit/offset
- `svcGetTarea()` - Task detail with full relationships
- `svcPostTarea()` - Create with auto-calculated priority
- `svcPatchTarea()` - Update with relationship management
- `svcPatchEstado()` - State transitions
- `svcPatchAprobacion()` - Approval workflow
- `svcAddResponsable/Colaborador/Etiqueta()` - Relationship additions
- `svcChecklist*()` - Checklist management with progress recalculation
- `svcComentarios*()` - Comment threading with mentions
- `svcAdjuntos*()` - File management with Google Drive integration
- `svcRelaciones*()` - Task linking

**Priority Calculation**:
```javascript
prioridad = (cliente_ponderacion * 100) + puntos_impacto + puntos_urgencia
```

#### **Asistencia Module** (`/backend/src/modules/asistencia/`)

**Routes** (`router.js`):
- `GET /asistencia/health` - Health check
- `GET /asistencia/catalog/origenes` - Check-in source types
- `GET /asistencia/catalog/cierre-motivos` - Close reasons
- `GET /asistencia/registros` - Global attendance records (report permission)
- `GET /asistencia/me/registros` - My attendance history
- `GET /asistencia/registros/:id` - Attendance detail
- `GET /asistencia/open` - Get open attendance by feder
- `POST /asistencia/check-in` - Manual check-in
- `PATCH /asistencia/registros/:id/check-out` - Check-out
- `PATCH /asistencia/registros/:id` - Adjust attendance
- `POST /asistencia/feder/:federId/force-close` - Force close
- `POST /asistencia/toggle` - Single-button check-in/out
- `GET /asistencia/me/*` - Personal endpoints
- `GET /asistencia/timeline-dia` - Timeline visualization
- `GET /asistencia/resumen/periodo` - Period summaries

**Service** (`services/asistencia.service.js`):
- Check-in/Check-out workflows
- Timeline generation (hourly breakdown)
- Period summaries and reports
- Attendance adjustment and corrections

#### **Feders Module** (`/backend/src/modules/feders/`)

**Routes** (`router.js`):
- `GET /feders/health` - Health check
- `GET /feders/overview` - Overview stats
- `GET /feders/self` - Current logged-in feder
- `GET /feders/by-user/:userId` - Feder by user ID
- `PATCH /feders/self` - Update own profile
- `GET /feders/catalog/*` - Estados, modalidades, días-semana
- `GET /feders/` - List all feders
- `GET /feders/:id` - Get feder detail
- `POST /feders/` - Create feder
- `PATCH /feders/:id` - Update feder
- `PATCH /feders/:id/active` - Activate/deactivate
- `DELETE /feders/:id` - Delete feder
- `POST /feders/:federId/avatar` - Upload avatar (multipart)
- `GET/PUT/PATCH/DELETE /feders/:federId/modalidad` - Work modality management
- `GET/PUT/PATCH /feders/:federId/firma-perfil` - Digital signature
- `GET/POST/PATCH/DELETE /feders/:federId/bancos` - Bank account management
- `GET/POST/PATCH/DELETE /feders/:federId/emergencias` - Emergency contacts

#### **Clientes Module** (`/backend/src/modules/clientes/`)

**Routes** (`router.js`):
- Similar CRUD structure to Feders
- Includes contactos (contacts) management
- Includes hitos (milestones) management
- Summary endpoints (resumen/estado, resumen/ponderacion, resumen/celula)

---

## FRONTEND STRUCTURE

### Main Directory: `/frontend/src/`

#### **Pages** (`/frontend/src/pages/`)
- **Tareas/** - Tasks management page
  - `TasksPage.jsx` - Main tasks list/kanban view
  - `TaskDetail.jsx` - Individual task detail view
  - `components/` - Task-specific components
    - `TareasFilters.jsx` - Advanced filtering
    - `KanbanBoard.jsx` - Kanban view
    - `TaskList.jsx` - List view
    - `CreateTaskModal.jsx` - Create task dialog
    - `TaskStatusCard.jsx` - Task status display
    - `TaskHeaderActions.jsx` - Task actions (edit, delete, etc.)
    - `TaskChecklist.jsx` - Checklist component
    - `TaskAttachments.jsx` - File attachments display
    - `SubtasksPanel.jsx` - Subtasks management
    - `ParticipantsEditor.jsx` - Manage responsible/collaborators
    - `AssignedPeople.jsx` - Display assigned people
    - `comments/` - Comment thread components
      - `index.jsx` - Comments container
      - `Composer.jsx` - Comment input
      - `CommentItem.jsx` - Comment display
      - `MentionTextArea.jsx` - @mention support
      - `AttachList.jsx` - Attachments in comments

  - `hooks/` - Custom React hooks
    - `useTareasList.js` - List management with filtering/pagination
    - `useSubtasks.js` - Subtask operations
    - `useTaskChecklist.js` - Checklist state management
    - `useTaskAttachments.js` - File attachment operations
    - `useTaskComments.js` - Comment management
    - `useTaskCompose.js` - Compose/initial data

- **Asistencia/** - Attendance page
  - `AsistenciaPage.jsx` - Main attendance UI
  - `timeline/`
    - `TimelineDay.jsx` - Daily timeline visualization

- **Feders/** - Employee/Feders management
  - `FedersListPage.jsx` - List of feders
  - `FedersOverviewPage.jsx` - Overview statistics
  - `FedersTabs.jsx` - Tab navigation

- **Clientes/** - Clients management
  - Similar structure to Feders

- **Other Pages**:
  - `Dashboard/` - Main dashboard
  - `Login/` - Authentication
  - `Calendario/` - Calendar integration
  - `Chat/` - Real-time messaging
  - `Admin/` - Administration interface
  - `Cargos/` - Positions/roles
  - `Ausencias/` - Absences management
  - `Notificaciones/` - Notifications
  - `Perfil/` - User profile
  - `Auth/` - Authentication pages
  - `passwordRecovery/` - Password reset

#### **Components** (`/frontend/src/components/`)
- **tasks/** - Reusable task components
  - All components mentioned above
- **asistencia/** - Attendance components
- **ausencias/** - Absence components
- **calendario/** - Calendar components
- **clients/** - Client components
- **chat/** - Chat components (desktop, mobile, shared, realtime)
- **common/** - Shared utilities
- **dashboard/** - Dashboard components
- **Header/** - Navigation header
- **Sidebar/** - Side navigation
- **AppGrid/** - Layout grid
- **modal/** - Modal/dialog provider
- **notifications/** - Notification components
- **toast/** - Toast messages
- **guards/** - Route guards
- **profile/** - Profile components
  - `FederProfileDrawer/` - Side drawer for feder profile

#### **API Clients** (`/frontend/src/api/`)
- **tareas.js**:
  ```javascript
  catalog() // Get catalogs (estados, impactos, urgencias, clientes)
  list(params) // List with filters
  get(id) // Get detail
  create(body) // Create
  update(id, body) // Update
  archive(id, on) // Archive toggle
  moveKanban(id, {stage, orden}) // Kanban movement
  setEstado(id, estado_id) // Change state
  setAprobacion(id, body) // Approval workflow
  addResp(id, feder_id, es_lider) // Add responsible
  delResp(id, federId) // Remove responsible
  addColab(id, feder_id, rol) // Add collaborator
  delColab(id, federId) // Remove collaborator
  addEtiqueta(id, etiqueta_id) // Add label
  delEtiqueta(id, etiquetaId) // Remove label
  getChecklist(id) // Get checklist
  addChecklist(id, titulo) // Add checklist item
  patchChecklistItem(itemId, patch) // Update checklist item
  deleteChecklistItem(itemId) // Delete checklist item
  reorderChecklist(id, orden) // Reorder checklist
  getComentarios(id) // Get comments
  postComentario(id, body) // Add comment
  getAdjuntos(id) // Get attachments
  postAdjunto(id, meta) // Add attachment metadata
  deleteAdjunto(adjId) // Delete attachment
  uploadAdjuntos(id, files) // Upload files (multipart)
  postRelacion(id, body) // Create task relationship
  deleteRelacion(id, relId) // Delete relationship
  toggleFavorito(id, on) // Toggle favorite
  toggleSeguidor(id, on) // Toggle follower
  listChildren(parentId, params) // Get subtasks
  createChild(parentId, body) // Create subtask
  ```

- **asistencia.js**:
  ```javascript
  // Me endpoints
  me.open() // Get my open attendance
  me.list(params) // My attendance history
  me.checkIn(body) // Check-in
  me.checkOut(body) // Check-out
  me.toggle(body) // Toggle check-in/out
  me.timelineDia(params) // My day timeline
  
  // Admin endpoints
  list(params) // All attendance records
  get(id) // Detail
  catalogOrigenes() // Check-in sources
  catalogCierreMotivos() // Close reasons
  timelineDia(params) // Global timeline
  ```

- **feders.js**:
  ```javascript
  catalog() // Estados, modalidades, días, células
  overview(params) // Overview statistics
  list(params) // List feders
  get(id) // Get detail
  getMine() // Current feder
  getByUserId(userId) // Feder by user
  update(id, payload) // Admin update
  updateSelf(payload) // Self update
  setActive(id, is_activo) // Activate/deactivate
  getModalidad(federId) // Work modality
  upsertModalidad(federId, body) // Update modality
  bulkSetModalidad(federId, items) // Bulk modality update
  removeModalidad(federId, diaId) // Remove modality
  getFirma(federId) // Get digital signature
  upsertFirma(federId, body) // Update signature
  listBancos(federId) // Bank accounts
  createBanco(federId, body) // Add bank
  updateBanco(federId, bankId, body) // Update bank
  deleteBanco(federId, bankId) // Delete bank
  listEmergencias(federId) // Emergency contacts
  createEmergencia(federId, body) // Add emergency contact
  updateEmergencia(federId, contactoId, body) // Update contact
  deleteEmergencia(federId, contactoId) // Delete contact
  uploadAvatar(federId, file) // Avatar upload (multipart)
  ```

- **clientes.js**:
  ```javascript
  catalog() // Tipos, estados, células, ponderaciones
  list(params) // List clients
  detail(id, params) // Get client detail
  get(id) // Simple get
  create(body) // Create
  update(id, body) // Update
  remove(id, {force}) // Delete
  assignCelula(id, celula_id) // Assign to cell
  listContactos(id, params) // Client contacts
  createContacto(id, body) // Add contact
  updateContacto(id, contactoId, body) // Update contact
  deleteContacto(id, contactoId) // Delete contact
  resumenEstado() // Summary by state
  resumenPonderacion() // Summary by weight
  resumenCelula() // Summary by cell
  ```

- **Other APIs**: ausencias.js, calendario.js, auth.js, chat.js, cargos.js, notificaciones.js, client.js (base HTTP client)

#### **Hooks** (`/frontend/src/hooks/`)
- Reusable React hooks (useTasksBoard, useContentEditable, etc.)

#### **Context** (`/frontend/src/context/`)
- React context providers (modal, toast, auth, etc.)

#### **Layouts** (`/frontend/src/layouts/`)
- Page layout components

#### **Router** (`/frontend/src/router/`)
- Route definitions and navigation

---

## KEY IMPLEMENTATION DETAILS

### Tareas Module - Current State

**Implementation Level**: FULLY IMPLEMENTED
- Complete CRUD operations
- Kanban board view with drag-and-drop
- List view with advanced filtering
- Detail view with:
  - Title/description editing
  - Status management
  - Approval workflow
  - Responsible person/leader assignment
  - Collaborator management
  - Label/tag system
  - Checklist with progress calculation
  - Comments with @mentions and threading
  - File attachments with Google Drive integration
  - Task relationships (depends-on, blocks, etc.)
  - Favorite/follow system
- Frontend hooks for state management
- API fully integrated

**Data Flow**:
1. Frontend calls `tareasApi.list(filters)` 
2. Backend `GET /tareas` executes complex SQL with scoping
3. Service applies row-level security based on user roles
4. Returns paginated results sorted by priority
5. Frontend renders in Kanban or List view

### Asistencia Module - Current State

**Implementation Level**: PARTIALLY IMPLEMENTED
- Basic check-in/check-out working
- Timeline visualization available
- Summary reports available
- "Me" (personal) endpoints implemented
- Admin/report endpoints available

### Feders Module - Current State

**Implementation Level**: FULLY IMPLEMENTED
- Complete CRUD operations
- Profile management with encryption for sensitive data (DNI, CUIL/CUIT)
- Work modality per-day scheduling
- Digital signature management
- Bank account management
- Emergency contacts management
- Avatar upload support
- Overview statistics

### Clientes Module - Current State

**Implementation Level**: FULLY IMPLEMENTED
- Complete CRUD operations
- Contact management
- Milestone management
- Cell assignment
- Summary statistics by:
  - State
  - Ponderacion (importance weight)
  - Cell/department

---

## SECURITY & PERMISSIONS

All routes are protected with:
- `requireAuth` - Middleware checking JWT/session
- `requirePermission(module, action)` - Permission checking

**Tareas Permissions**:
- `tareas:read` - List/view tasks
- `tareas:create` - Create tasks
- `tareas:update` - Update task fields
- `tareas:delete` - Archive tasks
- `tareas:approve` - Approve tasks
- `tareas:kanban` - Move on kanban
- `tareas:assign` - Assign people
- `tareas:label` - Manage labels
- `tareas:attach` - Upload files
- `tareas:comment` - Add comments
- `tareas:relate` - Create relationships

---

## DATABASE SCHEMA HIGHLIGHTS

- **Task Priority Calculation**: 
  - Base: `cliente.ponderacion * 100`
  - Plus: `impacto.puntos + urgencia.puntos`
  
- **Approvals**: Tasks can require approval workflow
  - Estados: pending, approved, rejected
  - Tracks who approved/rejected and when
  
- **Encryption**: Feder DNI/CUIL stored as JSON AES-GCM encrypted
  
- **Soft Features**:
  - Tasks can be archived (is_archivada flag)
  - Favorites and followers tracked per user
  - Kanban positions stored per user per stage
  - Comments support threading (reply_to_id)
  
- **Relationships**: Tasks can relate to other tasks with type system

---

## TECHNOLOGY STACK

**Backend**:
- Node.js/Express
- Sequelize ORM
- PostgreSQL (inferred from JSONB usage)
- Google Drive API (for file storage)
- Push notifications (FCM)

**Frontend**:
- React 18+
- React Router
- Vite (bundler)
- SCSS/CSS
- React Icons

**Additional**:
- Docker (Dockerfile present)
- Git version control

