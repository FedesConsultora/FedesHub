'use strict';

/**
 * 0012 - Calendario: parches de catálogos y defaults
 * - Agrega CalendarioTipo.global
 * - Agrega EventoTipo para overlays: interno, asistencia, ausencia, tarea_vencimiento
 * - Normaliza SyncDireccionTipo a: pull / push / both / none (renombra si hay códigos viejos)
 * - Asegura AsistenteTipo: feder / externo (sin borrar los existentes)
 * - Cambia a "organizacion" la visibilidad de calendarios personales sembrados como privados
 */
module.exports = {
  async up (q) {
    const t = await q.sequelize.transaction();
    try {
      const now = new Date();

      // === CalendarioTipo: asegurar 'global'
      await q.sequelize.query(`
        INSERT INTO "CalendarioTipo"(codigo,nombre,descripcion,created_at,updated_at)
        VALUES ('global','Global',NULL,:now,:now)
        ON CONFLICT (codigo) DO NOTHING;
      `, { transaction: t, replacements: { now } });

      // === EventoTipo: agregar overlays esperados
      const evtTipos = ['interno','asistencia','ausencia','tarea_vencimiento'];
      for (const cod of evtTipos) {
        await q.sequelize.query(`
          INSERT INTO "EventoTipo"(codigo,nombre,descripcion,created_at,updated_at)
          VALUES (:cod, INITCAP(REPLACE(:cod,'_',' ')), NULL, :now, :now)
          ON CONFLICT (codigo) DO NOTHING;
        `, { transaction: t, replacements: { cod, now } });
      }

      // === SyncDireccionTipo: normalizar códigos
      // Renombres defensivos solo si el destino no existe aún (evita colisión por unique)
      await q.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM "SyncDireccionTipo" WHERE codigo='local_a_google')
             AND NOT EXISTS (SELECT 1 FROM "SyncDireccionTipo" WHERE codigo='push')
          THEN UPDATE "SyncDireccionTipo" SET codigo='push', nombre='Sólo local → Google' WHERE codigo='local_a_google';
          END IF;

          IF EXISTS (SELECT 1 FROM "SyncDireccionTipo" WHERE codigo='google_a_local')
             AND NOT EXISTS (SELECT 1 FROM "SyncDireccionTipo" WHERE codigo='pull')
          THEN UPDATE "SyncDireccionTipo" SET codigo='pull', nombre='Sólo Google → local' WHERE codigo='google_a_local';
          END IF;

          IF EXISTS (SELECT 1 FROM "SyncDireccionTipo" WHERE codigo='bidireccional')
             AND NOT EXISTS (SELECT 1 FROM "SyncDireccionTipo" WHERE codigo='both')
          THEN UPDATE "SyncDireccionTipo" SET codigo='both', nombre='Bidireccional' WHERE codigo='bidireccional';
          END IF;
        END$$;
      `, { transaction: t });

      // Insertar los definitivos (si faltan)
      await q.sequelize.query(`
        INSERT INTO "SyncDireccionTipo"(codigo,nombre,descripcion)
        VALUES 
          ('pull','Sólo importar','Eventos desde Google → ERP'),
          ('push','Sólo exportar','Eventos desde ERP → Google'),
          ('both','Bidireccional','Sincronización completa'),
          ('none','Sin sync','Calendario sólo interno')
        ON CONFLICT (codigo) DO NOTHING;
      `, { transaction: t });

      // === AsistenteTipo: asegurar {feder, externo}
      await q.sequelize.query(`
        INSERT INTO "AsistenteTipo"(codigo,nombre,descripcion)
        VALUES 
          ('feder','Feder interno','Participante interno (usuario del sistema)'),
          ('externo','Externo','Participante externo por email')
        ON CONFLICT (codigo) DO NOTHING;
      `, { transaction: t });

      // === Visibilidad por defecto para personales: pasar de privado → organizacion
      // Solo personales y solo si hoy están privados (respeta cambios manuales)
      await q.sequelize.query(`
        UPDATE "CalendarioLocal" cl
        SET visibilidad_id = v_org.id,
            updated_at = :now
        FROM "CalendarioTipo" ct,
             "VisibilidadTipo" v_priv,
             "VisibilidadTipo" v_org
        WHERE cl.tipo_id = ct.id
          AND ct.codigo = 'personal'
          AND v_priv.codigo = 'privado'
          AND v_org.codigo = 'organizacion'
          AND cl.visibilidad_id = v_priv.id;
      `, { transaction: t, replacements: { now } });

      // === (opcional) ayuda: si no tenés 'organizacion', cae a 'equipo'
      await q.sequelize.query(`
        UPDATE "CalendarioLocal" cl
        SET visibilidad_id = v_eq.id,
            updated_at = :now
        FROM "CalendarioTipo" ct,
             "VisibilidadTipo" v_eq
        WHERE cl.tipo_id = ct.id
          AND ct.codigo = 'personal'
          AND v_eq.codigo = 'equipo'
          AND NOT EXISTS (SELECT 1 FROM "VisibilidadTipo" WHERE codigo='organizacion')
          AND NOT EXISTS (
            SELECT 1 FROM "VisibilidadTipo" vv 
            WHERE vv.id = cl.visibilidad_id AND vv.codigo IN ('organizacion','equipo')
          );
      `, { transaction: t, replacements: { now } });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down () {
    // Down vacío a propósito (no borramos catálogos ya en uso).
  }
};
