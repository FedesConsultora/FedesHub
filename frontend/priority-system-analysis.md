# Análisis: Sistema de Prioridad, Impacto y Urgencia

## 📊 Estado Actual del Sistema

### Modelo de Datos

**Tabla `Tarea`:**
- `impacto_id` → FK a `ImpactoTipo` (default: 2)
- `urgencia_id` → FK a `UrgenciaTipo` (default: 4)
- `prioridad_num` → INTEGER calculado (default: 0)
- `cliente_ponderacion` → INTEGER (default: 3)

**Tabla `ImpactoTipo`:**
- `id`, `codigo`, `nombre`, `puntos`, `descripcion`
- Ejemplos probables: Bajo(1), Medio(2), Alto(3), Crítico(4)

**Tabla `UrgenciaTipo`:**
- `id`, `codigo`, `nombre`, `puntos`, `descripcion`
- Ejemplos probables: Baja(1), Media(2), Alta(3-4), Urgente(5+)

### Cálculo de Prioridad (Backend)

**Fórmula actual:**
```javascript
prioridad_num = (cliente_ponderacion * 100) + puntos_impacto + puntos_urgencia
```

**Ejemplo:**
- Cliente con ponderación = 5 (cliente VIP)
- Impacto = 3 puntos
- Urgencia = 4 puntos
- **Resultado: 507 puntos** (500 + 3 + 4)

### Visualización Frontend

**Clasificación por rangos:**
```javascript
prioridad_num >= 600 → Crítica (3)
prioridad_num >= 450 → Alta    (2)
prioridad_num >= 300 → Media   (1)
prioridad_num <  300 → Baja    (0)
```

**Boost por vencimiento:**
- Vencida (días < 0): +2 niveles
- Vence en ≤2 días: +1 nivel
- Vence en ≥15 días: -1 nivel

---

## 🔍 Análisis del Sistema Actual

### ✅ Fortalezas
1. **Sistema objetivo**: Combina múltiples factores (cliente, impacto, urgencia)
2. **Priorización automática**: Se recalcula al cambiar impacto/urgencia
3. **Ponderación por cliente**: Clientes VIP automáticamente tienen mayor prioridad
4. **Boost temporal**: El deadline afecta la visualización sin modificar el valor base

### ⚠️ Limitaciones
1. **Falta de control manual**: No hay forma de "forzar" una prioridad alta sin cambiar cliente/impacto/urgencia
2. **Inflexibilidad**: El responsable no puede decir "esto es urgente para mí hoy"
3. **Dependencia del deadline**: El boost temporal es solo visual en frontend
4. **Sin historial de priorización**: No se registra cuándo/por qué cambió la prioridad

---

## 💡 Propuesta: Funcionalidad "Dar Prioridad"

### Concepto
Permitir a los **responsables** de una tarea incrementar manualmente su prioridad, independientemente de la fórmula automática.

### Opciones de Implementación

#### **Opción A: Campo Booleano `is_prioritaria`**

**Pros:**
- Simple de implementar
- Claro semánticamente
- Fácil de filtrar/ordenar

**Contras:**
- Solo permite prioridad ON/OFF
- No indica cuánta prioridad extra

**Implementación:**
```sql
ALTER TABLE "Tarea" ADD COLUMN is_prioritaria BOOLEAN DEFAULT FALSE;
```

**Cálculo:**
```javascript
prioridad_final = prioridad_num + (is_prioritaria ? 500 : 0)
```

---

#### **Opción B: Campo `boost_manual`**

**Pros:**
- Flexible: permite diferentes niveles de boost
- Se puede usar para priorizar temporalmente
- Mantiene trazabilidad del boost original

**Contras:**
- Más complejo
- Requiere definir rangos de boost

**Implementación:**
```sql
ALTER TABLE "Tarea" ADD COLUMN boost_manual INTEGER DEFAULT 0;
```

**Cálculo:**
```javascript
prioridad_final = prioridad_num + boost_manual
```

**Valores sugeridos:**
- 0: Sin boost manual
- 100: Prioridad moderada
- 300: Alta prioridad
- 500: Prioridad crítica

---

#### **Opción C: Prioridad Dual (Calculada vs Manual)**

**Pros:**
- Mantiene separación entre prioridad "objetiva" y "subjetiva"
- Permite reportes de "qué tareas requirieron priorización manual"
- Reversible sin perder el cálculo original

**Contras:**
- Más campos en la DB
- Lógica de ordenamiento más compleja

**Implementación:**
```sql
ALTER TABLE "Tarea" 
  ADD COLUMN prioridad_calculada INTEGER DEFAULT 0,
  ADD COLUMN prioridad_manual INTEGER NULL;
```

**Lógica:**
```javascript
// Al crear/actualizar tarea
prioridad_calculada = (cliente_ponderacion * 100) + impacto + urgencia

// Para ordenar
prioridad_efectiva = COALESCE(prioridad_manual, prioridad_calculada)
```

---

## 🎯 Recomendación

### **Opción B: Campo `boost_manual`** 

**Razón:** Equilibrio entre simplicidad y flexibilidad.

### Implementación Detallada

#### 1. **Migración de Base de Datos**
```javascript
// migration: 202512020900-add-boost-manual.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tarea', 'boost_manual', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Boost de prioridad aplicado manualmente por responsables'
    });
    
    // Índice para ordenamiento por prioridad efectiva
    await queryInterface.addIndex('Tarea', ['prioridad_num', 'boost_manual'], {
      name: 'idx_tarea_prioridad_efectiva'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Tarea', 'idx_tarea_prioridad_efectiva');
    await queryInterface.removeColumn('Tarea', 'boost_manual');
  }
};
```

#### 2. **Modelo de Tarea**
```javascript
// Agregar campo
boost_manual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
```

#### 3. **Helper de Cálculo**
```javascript
// services/tareas.service.js
const calcPrioridadEfectiva = (tarea) => {
  const base = (tarea.cliente_ponderacion * 100) + 
               (tarea.puntos_impacto || 0) + 
               (tarea.puntos_urgencia || 0);
  return base + (tarea.boost_manual || 0);
};
```

#### 4. **Endpoint para Boost**
```javascript
// PATCH /tareas/:id/boost
// Body: { level: 0 | 100 | 300 | 500 }
// Permisos: Solo responsables de la tarea

export const svcSetBoostManual = async (tarea_id, level, user) => {
  // Validar que sea responsable
  const isResponsable = await models.TareaResponsable.findOne({
    where: { tarea_id, feder_id: user.feder_id }
  });
  
  if (!isResponsable) {
    throw new Error('Solo los responsables pueden priorizar la tarea');
  }
  
  // Actualizar boost
  await models.Tarea.update(
    { boost_manual: level },
    { where: { id: tarea_id } }
  );
  
  // Registrar en historial
  await registrarCambio({
    tarea_id,
    feder_id: user.feder_id,
    tipo_cambio: 'prioridad',
    accion: level > 0 ? 'increased' : 'removed',
    valor_anterior: null,
    valor_nuevo: { boost: level },
    descripcion: `${level > 0 ? 'Priorizó' : 'Quitó priorización de'} la tarea`
  });
  
  return models.Tarea.findByPk(tarea_id);
};
```

#### 5. **Frontend: Botón de Priorización**
```jsx
// Solo visible para responsables
{isResponsable && (
  <BoostButton 
    currentBoost={task.boost_manual}
    onBoost={async (level) => {
      await tareasApi.setBoost(taskId, level);
      // Recargar tarea
    }}
  />
)}
```

**Niveles UI:**
- 🔥 Crítica: +500 (rojo)
- ⚡ Alta: +300 (naranja)
- ⬆️ Moderada: +100 (amarillo)
- ✖️ Sin boost: 0 (ninguno)

---

## 📝 Ventajas de esta Solución

1. **Empodera a los responsables**: Pueden gestionar su propia carga de trabajo
2. **Reversible**: Se puede quitar el boost fácilmente
3. **Auditable**: Se registra en el historial
4. **No destructivo**: No afecta la prioridad base calculada
5. **Filtrable**: Fácil ver qué tareas están "boostadas"
6. **Control de acceso**: Solo responsables pueden usar esta función

---

## 🚀 Plan de Implementación

### Fase 1: Backend
1. Crear migración para `boost_manual`
2. Actualizar modelo `Tarea`
3. Crear servicio `svcSetBoostManual`
4. Agregar endpoint `PATCH /tareas/:id/boost`
5. Agregar validación de permisos
6. Integrar con historial

### Fase 2: Frontend
1. Crear componente `BoostButton`
2. Integrar en `TaskDetail` (solo para responsables)
3. Actualizar filtros para incluir boost
4. Mostrar indicador visual de tareas "boostadas"

### Fase 3: Refinamiento
1. Analytics: ¿Qué tareas se priorizan más?
2. Límites: ¿Máximo de tareas boostadas por responsable?
3. Decaimiento temporal: ¿El boost expira después de X días?

---

## 🤔 Preguntas para Discutir

1. **¿Cuántos niveles de boost necesitamos?** (propongo 0, 100, 300, 500)
2. **¿Solo responsables o también colaboradores?** (recomiendo solo responsables)
3. **¿El boost debe expirar automáticamente?** (ej: después de 7 días)
4. **¿Límite de tareas boostadas por persona?** (ej: máximo 5 al mismo tiempo)
5. **¿Notificar al equipo cuando se prioriza una tarea?**
