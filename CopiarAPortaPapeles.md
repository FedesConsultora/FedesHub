# 📘 README – Sistema de Dump de Módulos (Backend + Frontend)
**FedesHub – Equipo de Desarrollo**  
**Autores:**  
- **Enzo Pinotti – Analista de Sistemas**  
- **Belén Espilman – Desarrolladora**

---

## ✨ 1. Propósito del Sistema de Dump

Este sistema fue creado para que el equipo pueda:

- Obtener rápidamente una foto completa de cualquier módulo del backend o frontend.  
- Facilitar la revisión, documentación, refactor y planificación de nuevas funcionalidades.  
- Generar un dump estructurado, ordenado y legible, donde:
  - Cada archivo muestra su **ruta completa**.
  - Cada archivo muestra **números de línea**.
  - Todo el contenido se copia automáticamente al **portapapeles**.

Esto permite trabajar cómodamente en módulos complejos como:

- Asistencia  
- Tareas  
- Feders  
- Clientes  

---

## 🧱 2. Estructura Real del Proyecto

### Backend  
`backend/src/modules/` contiene módulos como:

```
asistencia/
tareas/
feders/
clientes/
ausencias/
cargos/
calendario/
chat/
notificaciones/
realtime/
...
```

Cada módulo puede tener:

```
controllers/
repositories/
services/
validators/
models/
```

### Frontend  

```
frontend/src/
    pages/
    api/
    components/
    realtime/
    hooks/
    context/
```

---

## 🚀 3. Scripts Disponibles

### 3.1 Script Backend – `backend/src/dev/printModule.cjs`

Genera un dump completo del módulo elegido.

#### Características:
- Detecta automáticamente los módulos dentro de `/src/modules/`.
- Funciona con cualquier módulo nuevo sin configuraciones.
- Permite listar archivos sin generar dump.
- Opción de volcar “todo backend/src”.
- Copia el resultado al portapapeles.

---

## 🛠️ 4. Dependencias Necesarias

En `backend`:

```bash
cd backend
npm install --save-dev minimist clipboardy
```

En `frontend` (cuando agreguemos su script):

```bash
cd frontend
npm install --save-dev minimist clipboardy
```

---

## 📄 5. Uso del Script Backend

### Dump del módulo asistencia
```bash
node src/dev/printModule.cjs --module asistencia
```

### Dump del módulo clientes
```bash
node src/dev/printModule.cjs --module clientes
```

### Dump de TODO backend/src
```bash
node src/dev/printModule.cjs --all
```

### Listar archivos sin generar dump
```bash
node src/dev/printModule.cjs --module asistencia --list
```

---

## 🔧 6. Agregar Nuevos Módulos

No se necesita modificar el script.

Cualquier carpeta agregada en:

```
backend/src/modules/<nuevo-modulo>
```

queda automáticamente soportada.

---