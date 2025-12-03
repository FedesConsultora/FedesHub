// backend/db/seeders/20250822095043-0009-tareas-initial-data.cjs
'use strict';

/**
 * - Inserta TareaRelacionTipo y TareaEtiqueta (si existen las tablas)
 * - Crea 3 tareas de ejemplo para "Cliente Demo"
 * - Asigna responsables/colaboradores, etiquetas, relaciones y comentarios
 *
 * Seguro para correr múltiples veces (idempotente).
*/

async function hasTable(qi, table) {
  const [rows] = await qi.sequelize.query(
    `SELECT to_regclass('public."${table}"') AS reg`
  );
  return !!rows[0]?.reg;
}

async function idByCodigo(qi, table, codigo, t) {
  const [[row]] = await qi.sequelize.query(
    `SELECT id FROM "${table}" WHERE codigo = :codigo LIMIT 1`,
    { transaction: t, replacements: { codigo } }
  );
  return row?.id ?? null;
}

async function ensureCodes(qi, table, rows, t) {
  if (!(await hasTable(qi, table))) return;
  const codes = rows.map(r => r.codigo);
  const [exists] = await qi.sequelize.query(
    `SELECT codigo FROM "${table}" WHERE codigo IN (:codes)`,
    { transaction: t, replacements: { codes } }
  );
  const have = new Set(exists.map(e => e.codigo));
  const missing = rows.filter(r => !have.has(r.codigo));
  if (missing.length) {
    await qi.bulkInsert(table, missing, { transaction: t });
  }
}

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

module.exports = {
  async up(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      // ===== 0) Catálogos opcionales =====
      // -- Relaciones
      if (await hasTable(queryInterface, 'TareaRelacionTipo')) {
        await ensureCodes(queryInterface, 'TareaRelacionTipo', [
          { codigo: 'depende_de', nombre: 'Depende de', created_at: now },
          { codigo: 'bloquea', nombre: 'Bloquea', created_at: now },
          { codigo: 'duplicado_de', nombre: 'Duplicado de', created_at: now },
          { codigo: 'relacionado', nombre: 'Relacionado', created_at: now },
        ], t);
      }

      // -- Etiquetas
      if (await hasTable(queryInterface, 'TareaEtiqueta')) {
        await ensureCodes(queryInterface, 'TareaEtiqueta', [
          { codigo: 'cliente-demo', nombre: 'Cliente Demo', color_hex: '#607D8B', created_at: now, updated_at: now },
          { codigo: 'prioridad-alta', nombre: 'Prioridad alta', color_hex: '#F44336', created_at: now, updated_at: now },
          { codigo: 'plan', nombre: 'Planificación', color_hex: '#3F51B5', created_at: now, updated_at: now },
          { codigo: 'roadmap', nombre: 'Roadmap', color_hex: '#009688', created_at: now, updated_at: now },
          { codigo: 'setup', nombre: 'Setup', color_hex: '#9C27B0', created_at: now, updated_at: now },
        ], t);
      }

      // ===== 1) Datos base: cliente, estados, impacto/urgencia, users/feders =====
      const [[cli]] = await queryInterface.sequelize.query(
        `SELECT c.id, COALESCE(ct.ponderacion,3) AS ponderacion
         FROM "Cliente" c
         LEFT JOIN "ClienteTipo" ct ON ct.id = c.tipo_id
         WHERE c.nombre = 'Cliente Demo' LIMIT 1`,
        { transaction: t }
      );
      if (!cli) throw new Error('Cliente Demo no encontrado. Corré primero el seeder 0200-sample-initial-data.');

      const estadoPend = await idByCodigo(queryInterface, 'TareaEstado', 'pendiente', t);
      const estadoCurso = await idByCodigo(queryInterface, 'TareaEstado', 'en_curso', t);
      const impactoMedio = await idByCodigo(queryInterface, 'ImpactoTipo', 'medio', t);
      const impactoAlto = await idByCodigo(queryInterface, 'ImpactoTipo', 'alto', t);
      const urg72 = await idByCodigo(queryInterface, 'UrgenciaTipo', 'lt_72h', t);
      const urg7d = await idByCodigo(queryInterface, 'UrgenciaTipo', 'lt_7d', t);

      const [impRows] = await queryInterface.sequelize.query(
        `SELECT id, puntos FROM "ImpactoTipo"`,
        { transaction: t }
      );
      const [urgRows] = await queryInterface.sequelize.query(
        `SELECT id, puntos FROM "UrgenciaTipo"`,
        { transaction: t }
      );
      const ptsImp = Object.fromEntries(impRows.map(r => [r.id, r.puntos]));
      const ptsUrg = Object.fromEntries(urgRows.map(r => [r.id, r.puntos]));
      const prioridad = (ponder, impId, urgId) => (ponder * 100) + (ptsImp[impId] || 0) + (ptsUrg[urgId] || 0);

      const [users] = await queryInterface.sequelize.query(
        `SELECT u.id, u.email, f.id AS feder_id
         FROM "User" u
         LEFT JOIN "Feder" f ON f.user_id = u.id
         WHERE u.email IN ('sistemas@fedes.ai','ralbanesi@fedes.ai','epinotti@fedes.ai','gcanibano@fedes.ai')`,
        { transaction: t }
      );
      const byEmail = Object.fromEntries(users.map(u => [u.email, u]));
      const FEDS = {
        sistemas: byEmail['sistemas@fedes.ai']?.feder_id,
        romina: byEmail['ralbanesi@fedes.ai']?.feder_id,
        enzo: byEmail['epinotti@fedes.ai']?.feder_id,
        gonzalo: byEmail['gcanibano@fedes.ai']?.feder_id,
      };

      // Etiquetas ids (si existen)
      const labels = {};
      if (await hasTable(queryInterface, 'TareaEtiqueta')) {
        const [labRows] = await queryInterface.sequelize.query(
          `SELECT id, codigo FROM "TareaEtiqueta" WHERE codigo IN ('cliente-demo','prioridad-alta','plan','roadmap','setup')`,
          { transaction: t }
        );
        for (const r of labRows) labels[r.codigo] = r.id;
      }

      // Tipo relacion (si existe)
      let relDepende = null;
      if (await hasTable(queryInterface, 'TareaRelacionTipo')) {
        relDepende = await idByCodigo(queryInterface, 'TareaRelacionTipo', 'depende_de', t);
      }

      // ===== 2) Crear TAREAS (si faltan) =====
      const baseTasks = [
        {
          titulo: 'Definir alcance inicial de Cliente Demo',
          descripcion: 'Relevar objetivos, stakeholders, KPIs y expectativas del primer sprint.',
          estado_id: estadoPend,
          impacto_id: impactoMedio,
          urgencia_id: urg7d,
          vencimiento: addDays(now, 5),
          creado_por_feder_id: FEDS.enzo || FEDS.romina || FEDS.sistemas,
          etiquetas: ['cliente-demo', 'plan'],
          responsables: [{ feder_id: FEDS.enzo, es_lider: true }],
          colaboradores: [{ feder_id: FEDS.gonzalo, rol: 'Cuentas' }]
        },
        {
          titulo: 'Armar propuesta de roadmap Q3',
          descripcion: 'Roadmap de entregables y milestones. Incluir riesgos y dependencias.',
          estado_id: estadoCurso,
          impacto_id: impactoAlto,
          urgencia_id: urg72,
          vencimiento: addDays(now, 2),
          creado_por_feder_id: FEDS.gonzalo || FEDS.enzo || FEDS.sistemas,
          etiquetas: ['cliente-demo', 'roadmap', 'prioridad-alta'],
          responsables: [{ feder_id: FEDS.gonzalo, es_lider: true }]
        },
        {
          titulo: 'Setup tablero Kanban',
          descripcion: 'Columnas, WIP limits, políticas de entrada/salida y definiciones de Hecho.',
          estado_id: estadoPend,
          impacto_id: impactoMedio,
          urgencia_id: urg7d,
          vencimiento: addDays(now, 3),
          creado_por_feder_id: FEDS.sistemas || FEDS.enzo,
          etiquetas: ['setup', 'cliente-demo'],
          responsables: [{ feder_id: FEDS.sistemas, es_lider: true }],
          colaboradores: [{ feder_id: FEDS.enzo, rol: 'Tech' }]
        }
      ];

      // crear (si no existe misma combinación titulo+cliente)
      const createdIds = [];
      for (const tk of baseTasks) {
        const [[exists]] = await queryInterface.sequelize.query(
          `SELECT id FROM "Tarea" WHERE cliente_id = :cli AND titulo = :tit LIMIT 1`,
          { transaction: t, replacements: { cli: cli.id, tit: tk.titulo } }
        );
        if (exists) { createdIds.push(exists.id); continue; }

        const prioridad_num = prioridad(cli.ponderacion, tk.impacto_id, tk.urgencia_id);

        const [ins] = await queryInterface.bulkInsert('Tarea', [{
          cliente_id: cli.id,
          hito_id: null,
          tarea_padre_id: null,
          titulo: tk.titulo,
          descripcion: tk.descripcion,
          estado_id: tk.estado_id,
          creado_por_feder_id: tk.creado_por_feder_id,
          requiere_aprobacion: false,
          aprobacion_estado_id: 1, // no_aplica
          impacto_id: tk.impacto_id,
          urgencia_id: tk.urgencia_id,
          prioridad_num,
          cliente_ponderacion: cli.ponderacion,
          fecha_inicio: now,
          vencimiento: tk.vencimiento,
          is_archivada: false,
          created_at: now,
          updated_at: now
        }], { transaction: t, returning: true });

        // Nota: bulkInsert con returning no siempre devuelve filas según dialecto/Sequelize.
        // Hacemos fallback:
        let tid = ins?.id;
        if (!tid) {
          const [[row]] = await queryInterface.sequelize.query(
            `SELECT id FROM "Tarea" WHERE cliente_id = :cli AND titulo = :tit ORDER BY id DESC LIMIT 1`,
            { transaction: t, replacements: { cli: cli.id, tit: tk.titulo } }
          );
          tid = row.id;
        }
        createdIds.push(tid);

        // Responsables / Colaboradores
        for (const r of (tk.responsables || [])) {
          if (!r.feder_id) continue;
          await queryInterface.bulkInsert('TareaResponsable', [{
            tarea_id: tid, feder_id: r.feder_id, es_lider: !!r.es_lider, asignado_at: now
          }], { transaction: t, ignoreDuplicates: true });
        }
        for (const c of (tk.colaboradores || [])) {
          if (!c.feder_id) continue;
          await queryInterface.bulkInsert('TareaColaborador', [{
            tarea_id: tid, feder_id: c.feder_id, rol: c.rol ?? null, created_at: now
          }], { transaction: t, ignoreDuplicates: true });
        }

        // Etiquetas (si existen tablas)
        if (await hasTable(queryInterface, 'TareaEtiquetaAsig') && Object.keys(labels).length) {
          for (const cod of (tk.etiquetas || [])) {
            const eid = labels[cod];
            if (!eid) continue;
            await queryInterface.bulkInsert('TareaEtiquetaAsig', [{
              tarea_id: tid, etiqueta_id: eid
            }], { transaction: t, ignoreDuplicates: true });
          }
        }

        // Comentario inicial (si existen tablas)
        const [[tipoNota]] = await queryInterface.sequelize.query(
          `SELECT id FROM "ComentarioTipo" WHERE codigo='nota' LIMIT 1`,
          { transaction: t }
        );
        if (tipoNota) {
          await queryInterface.bulkInsert('TareaComentario', [{
            tarea_id: tid,
            feder_id: tk.creado_por_feder_id,
            tipo_id: tipoNota.id,
            contenido: 'Tarea creada desde seeder de demo.',
            created_at: now, updated_at: now
          }], { transaction: t });
        }
      }

      // ===== 3) Relaciones entre las dos primeras (si existen tablas) =====
      if (await hasTable(queryInterface, 'TareaRelacion') && relDepende && createdIds.length >= 2) {
        const t1 = createdIds[0], t2 = createdIds[1];
        const [[existsRel]] = await queryInterface.sequelize.query(
          `SELECT id FROM "TareaRelacion" WHERE tarea_id=:t2 AND relacionada_id=:t1 AND tipo_id=:tipo LIMIT 1`,
          { transaction: t, replacements: { t1, t2, tipo: relDepende } }
        );
        if (!existsRel) {
          await queryInterface.bulkInsert('TareaRelacion', [{
            tarea_id: t2, relacionada_id: t1, tipo_id: relDepende, created_at: now
          }], { transaction: t });
        }
      }

      // ===== 4) Favoritos / Seguidores (si existen tablas) =====
      const favTable = await hasTable(queryInterface, 'TareaFavorito');
      const segTable = await hasTable(queryInterface, 'TareaSeguidor');

      const userEnzo = byEmail['epinotti@fedes.ai']?.id;
      const userRom = byEmail['ralbanesi@fedes.ai']?.id;

      if (createdIds[0]) {
        if (favTable && userEnzo) {
          await queryInterface.bulkInsert('TareaFavorito', [{
            tarea_id: createdIds[0], user_id: userEnzo, created_at: now
          }], { transaction: t, ignoreDuplicates: true });
        }
        if (segTable && userRom) {
          await queryInterface.bulkInsert('TareaSeguidor', [{
            tarea_id: createdIds[0], user_id: userRom, created_at: now
          }], { transaction: t, ignoreDuplicates: true });
        }
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      // Borrar relaciones/favoritos/seguidores (si existen tablas)
      const relTable = await hasTable(queryInterface, 'TareaRelacion');
      const favTable = await hasTable(queryInterface, 'TareaFavorito');
      const segTable = await hasTable(queryInterface, 'TareaSeguidor');

      // Buscar IDs de tareas sembradas
      const [tareas] = await queryInterface.sequelize.query(`
        SELECT t.id
        FROM "Tarea" t
        JOIN "Cliente" c ON c.id = t.cliente_id
        WHERE c.nombre = 'Cliente Demo'
          AND t.titulo IN (
            'Definir alcance inicial de Cliente Demo',
            'Armar propuesta de roadmap Q3',
            'Setup tablero Kanban'
          )
      `, { transaction: t });

      const ids = tareas.map(r => r.id);
      if (ids.length) {
        if (relTable) await queryInterface.bulkDelete('TareaRelacion', { tarea_id: ids }, { transaction: t });
        if (favTable) await queryInterface.bulkDelete('TareaFavorito', { tarea_id: ids }, { transaction: t });
        if (segTable) await queryInterface.bulkDelete('TareaSeguidor', { tarea_id: ids }, { transaction: t });

        // Eliminar tareas (cascada limpiará responsables/colaboradores/etiquetas/checklist/comentarios/adjuntos)
        await queryInterface.sequelize.query(`
          DELETE FROM "Tarea"
          WHERE id = ANY(:ids)
        `, { transaction: t, replacements: { ids } });
      }

      // Borrar etiquetas de demo (si existen)
      if (await hasTable(queryInterface, 'TareaEtiqueta')) {
        await queryInterface.bulkDelete('TareaEtiqueta',
          { codigo: ['cliente-demo', 'prioridad-alta', 'plan', 'roadmap', 'setup'] }, { transaction: t });
      }

      // Borrar tipos de relación de demo (si existen)
      if (await hasTable(queryInterface, 'TareaRelacionTipo')) {
        await queryInterface.bulkDelete('TareaRelacionTipo',
          { codigo: ['depende_de', 'bloquea', 'duplicado_de', 'relacionado'] }, { transaction: t });
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};
