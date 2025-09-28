# Storage de documentos — `src/core/storage`

> Diseño de almacenamiento de archivos y media para **FedesHub** con foco en Clientes/Tareas y activos de Personas (avatares), incluyendo contratos mínimos de API, estructura de carpetas, reglas de nombres, versionado, reconciliación y permisos.

---

## Objetivos

- Guardar **archivos por Tarea**, dentro de una jerarquía **Clientes → Tareas** en *FedesHub (Carpetas de Clientes)*.
- Que **el nombre de la carpeta no sea el ID** sino **`nombre de la tarea + nombre del cliente`** (en formato seguro/slug).
- Soportar **avatares e imágenes** de **Feders**, **Clientes** y **Células**.
- Mantener un **vínculo consistente con la base** de datos (vía rutas relativas, checksums y referencias).
- Ser **idempotente** ante semillas y datos preexistentes.  
- Dejar claro **qué API** expone `src/core/storage` para el resto del backend.

> Nota: La base entera existe en `.sql` y los seeders/modelos principales están listados; este README explica **cómo nos enlazamos** a esas entidades, sin requerir cambios disruptivos.

---

## Arquitectura (overview)

- **Drivers** (`src/core/storage/drivers/`): capa de E/S. Inicial: `fs` (filesystem local o share montado). Futuro: `s3`, `gdrive`.  
- **Service** (`src/core/storage/service.ts`): orquesta rutas, slugs, versionado, metadatos y permisos.  
- **Repos** (`src/core/storage/repos/`): acceso a DB (e.g. `TareaAdjunto`, `Feder`, `Cliente`, etc.).  
- **Jobs/Scripts**: `storage:reconcile`, `storage:backfill-avatars`, etc.

---

## Jerarquía de carpetas en FedesHub

Raíz (configurable por ENV: `FEDESHUB_ROOT`):

```
{FEDESHUB_ROOT}/
├─ Clientes/
│  ├─ {clienteSlug}/
│  │  ├─ _assets/                # logo, brandbook, etc.
│  │  └─ tareas/
│  │     └─ {tareaSlug}__{clienteSlug}/
│  │        ├─ 000_README.md
│  │        ├─ _meta.json        # metadatos (ids, nombres, slugs, alias previos)
│  │        ├─ adjuntos/         # archivos "vigentes" (puntero a última versión)
│  │        ├─ versions/         # historial inmutable (timestamped)
│  │        ├─ fuentes/          # opcional: PSD/AI/fig, etc.
│  │        ├─ entregables/      # opcional: finales para cliente
│  │        └─ tmp/              # staging temporal (limpieza automática)
│  └─ ...
├─ Personas/
│  └─ {federSlug}/
│     ├─ avatar/
│     │  ├─ current.jpg|png
│     │  └─ versions/{YYYYMMDD_HHMMSS}.{ext}
│     └─ docs/                   # CV, certificados, etc. (opcional)
└─ Celulas/
   └─ {celulaSlug}/              # cover/avatar (si aplica)
```

### Por qué `{tareaSlug}__{clienteSlug}`
- Evita IDs en el nombre y mejora la **buscabilidad** humana.  
- Al concatenar ambos slugs:
  - Se reduce la probabilidad de colisiones entre tareas con títulos similares en clientes distintos.
  - El patrón doble guion bajo `__` nos da un separador fácil de parsear.

---

## Slugs y reglas de nombres

### Regla de **slugify**
- Normalizar a **NFD** y remover diacríticos.
- Lowercase, trim, reemplazar secuencias no `a–z0–9` por `-`.
- Colapsar guiones repetidos, y recortar a 80 chars (configurable).
- Sin sufijos `.`, espacios finales ni nombres reservados (`con`, `aux`, etc. en Windows).

```ts
export function slugify(input: string): string {
  return (input || '')
    .normalize('NFD').replace(/\p{Diacritic}+/gu, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
```

### Carpeta de tarea (formato)
```
taskFolder := `${slugify(tarea.titulo)}__${slugify(cliente.nombre)}`
```
> El `clienteSlug` se obtiene **una única vez** al crear el cliente; ante renombres de cliente, migramos la carpeta (ver *Reconciliación y renombres*).

### Control de colisiones
- Dentro de `Clientes/{clienteSlug}/tareas/`, si ya existe una carpeta con el mismo nombre **y NO pertenece a la misma tarea (ID)**, se aplica sufijo `~2`, `~3`, ...
- Se crea un **marcador** `.tarea_id` (texto plano con el ID) dentro de cada carpeta de tarea para reconocerla rápido sin depender del nombre.
- `_meta.json` incluye `tarea_id`, `cliente_id`, `current_path` y `aliases_previos`.

---

## Vínculo con la base de datos

> Tablas relevantes (de modelos/seeders provistos): `Cliente`, `Tarea`, `Feder`, `User`, estados/etiquetas, etc. También existen asociaciones a `TareaAdjunto` y otras entidades de contenido.

### Campos **recomendados** para adjuntos (DB)
> Si aún no están, se proponen para el modelo `TareaAdjunto` o equivalente:

- `tarea_id` (FK)  
- `subido_por_feder_id` (FK)  
- `filename_original` (varchar)  
- `mime_type` (varchar)  
- `size_bytes` (int)  
- `storage_driver` (varchar)  → p.ej. `"fs"`  
- `storage_relpath` (varchar) → desde `FEDESHUB_ROOT` (ej: `Clientes/acme/tareas/campana-x__acme/adjuntos/brief.pdf`)  
- `checksum_sha256` (char(64)) → dedupe & versión  
- `version_num` (int) y/o `versioned_at` (timestamp)  
- `comentario_id` (nullable) si el archivo entra vía comentario  
- `deleted_at` (nullable) para papelera

> Para avatares de `Feder`/`Celula`/`Cliente`, reutilizamos los campos `avatar_url`/`cover_url` ya existentes donde aplican, con rutas relativas al driver.

### Transaccionalidad
- Escritura **two-phase**:
  1. Guardar en `tmp/` + calcular checksum.
  2. Crear fila en DB (pendiente).
  3. Mover a `versions/{ts}_{filename}` y crear/actualizar puntero en `adjuntos/`.
  4. Confirmar DB; si falla, se limpia `tmp/`.
- Con DB **OK** pero **fallo de move**, un job de retry (`storage:reconcile`) detecta el estado y reintenta (por `checksum` y `storage_relpath`).

---

## Versionado de archivos

- Cada subida escribe a `versions/{YYYYMMDD_HHMMSS}_{filename}`.
- La **copia activa** vive en `adjuntos/{filename}`:
  - Si existe versión previa con **mismo checksum**, **no** se crea nueva versión (idempotencia).
  - Si difiere, se incrementa `version_num` y se actualiza el puntero.
- Se puede exponer en UI el historial por `tarea_id` y `filename_original` ordenado por `versioned_at`.

---

## Reconciliación y renombres

### Escenarios
1. **Renombré la tarea o el cliente**:  
   - Nuevo `taskFolder` = `${slug(tituloNuevo)}__${slug(clienteActual)}`.  
   - Mover carpeta de `{old}` → `{new}` de forma atómica (misma partición).  
   - Actualizar `_meta.json.current_path` y agregar entrada a `aliases_previos`.
   - Dejar **marker** `.moved_from` por 30 días con el nuevo path para ayudar a humanos.

2. **Colisiones** al renombrar:  
   - Si el destino `{new}` existe y pertenece a **otra tarea** (por `.tarea_id`), usar sufijo `~2` y registrar en `_meta.json.aliases_previos`.

3. **Archivos en DB sin archivo físico** o viceversa:  
   - Script `storage:reconcile` recorre `Clientes/*/tareas/*` y compara contra DB por `(tarea_id, checksum, storage_relpath)`.  
   - Reporta **órfanos**, **faltantes** y **desfasajes de puntero**; puede autocorregir.

---

## Permisos y seguridad

- Se respeta el mapa de permisos de **roles por módulo/acción** (seeders `0001` y `0002`).  
  - Módulo `tareas`: `create/read/update/delete/assign/approve/report`.  
  - **Quién puede subir** a una tarea:
    - Responsables/colaboradores con `tareas.update` o `tareas.create`.
    - `Tri*` con `approve/assign` (según rol).
    - `Admin` todo. `CLevel` sólo `read`.
- Validaciones en `storage.service` antes de permitir `saveTaskFile`:
  - ¿El **user** pertenece a la organización? (dominio permitido)
  - ¿Tiene **rol/permiso** para esa tarea/cliente?
  - ¿No supera límites de tamaño/extensiones prohibidas?

---

## API de alto nivel (`src/core/storage/service.ts`)

```ts
export interface SaveTaskFileInput {
  tareaId: number;
  userId: number;             // para permisos (y federId)
  filename: string;
  buffer: Buffer;
  mimeType?: string;
  subfolder?: 'adjuntos' | 'fuentes' | 'entregables'; // default: adjuntos
  commentId?: number;         // si viene de un comentario
}

export interface StoragePaths {
  root: string;               // absoluto
  rel: string;                // relativo a FEDESHUB_ROOT
}

export interface StorageDriver {
  ensureDir(pathAbs: string): Promise<void>;
  writeFile(pathAbs: string, buf: Buffer): Promise<void>;
  move(srcAbs: string, dstAbs: string): Promise<void>;
  exists(pathAbs: string): Promise<boolean>;
  checksum(pathAbs: string): Promise<string>; // sha256
  stat(pathAbs: string): Promise<{ size: number }>;
  // ... list, delete (soft), etc.
}

export async function ensureTaskRoot(tareaId: number): Promise<{ paths: StoragePaths; metaPath: string }>;
export async function saveTaskFile(input: SaveTaskFileInput): Promise<{ adjuntoId: number; version: number; relpath: string }>;
export async function moveTaskFolderOnRename(tareaId: number): Promise<{ oldRel: string; newRel: string }>;
export async function reconcile(options?: { fix?: boolean }): Promise<void>;
```

### Esqueleto de flujo (`saveTaskFile`)
1. `authz.check(userId, 'tareas.update', tareaId)`
2. `const { cliente, tarea } = tareaRepo.load(tareaId)`
3. `const folder = join('Clientes', slug(cliente.nombre), 'tareas', 
   slug(tarea.titulo) + '__' + slug(cliente.nombre))`
4. `driver.ensureDir(…/tmp)` → escribir temporal
5. Calcular `sha256`, decidir si **nueva versión**.
6. Mover a `versions/{ts}_{filename}` y actualizar puntero en `adjuntos/{filename}`
7. Persistir fila en DB con `storage_relpath` y `checksum_sha256`

---

## Activos de Personas, Clientes y Células

### Avatares de **Feder**
- Ruta: `Personas/{federSlug}/avatar/current.{ext}` + `versions/{ts}.{ext}`  
- Guardar URL **relativa** en `Feder.avatar_url` (modelo ya existente), p.ej.  
  `Personas/enzo-pinotti/avatar/current.jpg`

### **Cliente** (`_assets/`)
- Logo: `Clientes/{clienteSlug}/_assets/logo.{ext}`  
- Manual de marca, etc.: mismo folder.  
- URL/relpath guardada en la tabla `Cliente` si se agregan campos (`logo_url`, etc.).

### **Células**
- `Celulas/{celulaSlug}/avatar/current.{ext}` y/o `cover/current.{ext}` (si el modelo los soporta).

---

## Ejemplos rápidos

### 1) Subir un brief PDF a una tarea
```
POST /api/tareas/:id/archivos
Content-Type: multipart/form-data

→ storage.saveTaskFile({
     tareaId: params.id,
     userId: auth.user.id,
     filename: file.name,
     buffer: file.bytes,
     mimeType: file.type
   })
```

### 2) Renombrar la tarea (sin perder carpeta)
- Evento de dominio: `TareaRenombrada` → `moveTaskFolderOnRename(tareaId)`

### 3) Reconciliar
```
node scripts/storage-reconcile.ts --fix
```

---

## Limpieza y retención

- `tmp/` se limpia automáticamente (archivos >24h).  
- Papelera lógica: `deleted_at` en DB + mover a `archive/` (opcional).  
- **Tamaños máximos** por tipo: configurable por ENV (`MAX_UPLOAD_MB_DEFAULT`, `MAX_UPLOAD_MB_VIDEO`, …).

---

## Testing checklist

- [ ] Crear cliente y varias tareas con títulos similares → sin colisiones no deseadas.
- [ ] Subir mismo archivo 2 veces → **no** duplica versión (checksum igual).
- [ ] Subir cambios mínimos → crea versión nueva.
- [ ] Renombrar cliente/tarea → mueve carpeta, mantiene `_meta.json` y `.tarea_id`.
- [ ] Quitar permisos a un usuario → rechaza subida.
- [ ] Cortar energía entre DB y FS → reconcile repara punteros.
- [ ] Avatares: guarda `current.*` y mantén `versions/`.

---

## Variables de entorno sugeridas

- `FEDESHUB_ROOT=/mnt/fedeshub`  
- `STORAGE_DRIVER=fs`  
- `STORAGE_MAX_UPLOAD_MB=50`  
- `STORAGE_TMP_TTL_HOURS=24`

---

## Compatibilidad con seeders/modelos

- Usa `Feder.avatar_url` para avatares (modelo ya presente).
- Usa asociaciones de `Tarea` ↔ `TareaAdjunto` (modelo presente en asociaciones) con campos **recomendados** arriba.
- Respeta el mapa de roles/permisos sembrado en `0001/0002` para autorizar operaciones en `tareas`/`clientes`/`feders`.

---

## Roadmap corto

- Driver `fedeshub` específico (si el share tiene API) o `s3` (minio).  
- Vista de **historial de versiones** en UI.  
- **Previsualización** (PDF/JPG/MP4) con thumbnails.  
- **Webhooks** para notificaciones (`NotificacionTipo.sistema` o tipos específicos).

---

## Apéndice A — `_meta.json` de carpeta de tarea (ejemplo)

```json
{
  "entity": "tarea",
  "tarea_id": 123,
  "cliente_id": 45,
  "cliente_slug": "cliente-demo",
  "tarea_slug": "armar-propuesta-de-roadmap-q3",
  "current_path": "Clientes/cliente-demo/tareas/armar-propuesta-de-roadmap-q3__cliente-demo",
  "aliases_previos": [
    "Clientes/cliente-demo/tareas/roadmap-q3__cliente-demo"
  ],
  "created_at": "2025-08-25T13:05:40.123Z",
  "updated_at": "2025-08-28T09:18:01.987Z"
}
```

---

© Fedes — `src/core/storage`.
