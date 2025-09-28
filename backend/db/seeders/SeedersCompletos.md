// auth-base 0001

'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // ---- RolTipo
    await queryInterface.bulkInsert('RolTipo', [
      { codigo: 'system', nombre: 'Sistema', descripcion: 'Roles del sistema', created_at: now, updated_at: now },
      { codigo: 'custom', nombre: 'Personalizado', descripcion: 'Roles definidos por la organización', created_at: now, updated_at: now },
    ], {});

    // ---- Módulos
    const modulos = [
      ['auth','Autenticación y Accesos'],
      ['cargos','Cargos y ámbitos'],
      ['feders','Personas (Feders)'],
      ['asistencia','Asistencia'],
      ['ausencias','Ausencias'],
      ['celulas','Células'],
      ['clientes','Clientes'],
      ['tareas','Tareas'],
      ['calendario','Calendario'],
      ['notificaciones','Notificaciones'],
      ['chat','Chat']           // 👈👈👈 AGREGADO
    ].map(([codigo, nombre]) => ({
      codigo, nombre,
      descripcion: null, created_at: now, updated_at: now
    }));
    await queryInterface.bulkInsert('Modulo', modulos, {});

    // ---- Acciones
    const acciones = [
      ['read','Ver/Consultar'],
      ['create','Crear'],
      ['update','Editar'],
      ['delete','Eliminar'],
      ['approve','Aprobar'],
      ['assign','Asignar'],
      ['report','Reportes/Indicadores']
    ].map(([codigo, nombre]) => ({
      codigo, nombre, descripcion: null, created_at: now, updated_at: now
    }));
    await queryInterface.bulkInsert('Accion', acciones, {});

    // ---- Roles (incluye AnalistaComunicacion)
    const [rolTipoRows] = await queryInterface.sequelize.query(`SELECT id, codigo FROM "RolTipo"`);
    const rolTipoMap = Object.fromEntries(rolTipoRows.map(r => [r.codigo, r.id]));
    const roles = [
      ['Admin','Administrador'],
      ['CLevel','Dirección (C-Level)'],
      ['RRHH','Capital Humano'],

      ['AnalistaDiseno','Analista de Diseño'],
      ['CuentasAnalista','Analista de Cuentas'],
      ['AnalistaAudiovisual','Analista Audiovisual'],
      ['AnalistaComunicacion','Analista de Comunicación'],

      ['TriMarketing','Tridente - Marketing'],
      ['TriPerformance','Tridente - Performance'],
      ['TriTecnologia','Tridente - Tecnología'],

      ['Feder','Miembro'],
      ['Onboarding','Onboarding']
    ].map(([nombre, desc]) => ({
      nombre,
      descripcion: desc,
      rol_tipo_id: rolTipoMap['system'],
      created_at: now,
      updated_at: now
    }));
    await queryInterface.bulkInsert('Rol', roles, {});

    // ---- Dominios de email permitidos
    await queryInterface.bulkInsert('AuthEmailDominio', [
      { dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('AuthEmailDominio', null, {});
    await queryInterface.bulkDelete('Rol', null, {});
    await queryInterface.bulkDelete('Accion', null, {});
    await queryInterface.bulkDelete('Modulo', null, {});
    await queryInterface.bulkDelete('RolTipo', null, {});
  }
};
  // 0002-auth-permissions-map
  'use strict';

  module.exports = {
    async up (queryInterface) {
      const now = new Date();

      // ---- Maps base (módulos, acciones, roles)
      const [mods]  = await queryInterface.sequelize.query(`SELECT id, codigo FROM "Modulo"`);
      const [acts]  = await queryInterface.sequelize.query(`SELECT id, codigo FROM "Accion"`);
      const [roles] = await queryInterface.sequelize.query(`SELECT id, nombre FROM "Rol"`);

      const modId  = Object.fromEntries(mods.map(m => [m.codigo, m.id]));
      const actId  = Object.fromEntries(acts.map(a => [a.codigo, a.id]));
      const roleId = Object.fromEntries(roles.map(r => [r.nombre, r.id]));

      const ALL_MODS = Object.keys(modId);
      const ALL_ACTS = Object.keys(actId); // dinámico (por si agregás nuevas acciones)

      const READ = ['read'];
      const CRUD = ['create','read','update','delete'];
      const CRU  = ['create','read','update'];

      // ---- 1) Crear TODOS los permisos (Módulo x Acción)
      //      (idempotente: ignoreDuplicates)
      const permsToInsert = [];
      for (const m of ALL_MODS) {
        for (const a of ALL_ACTS) {
          permsToInsert.push({
            modulo_id: modId[m],
            accion_id: actId[a],
            nombre: `${m}.${a}`,
            descripcion: null,
            created_at: now, updated_at: now
          });
        }
      }
      await queryInterface.bulkInsert('Permiso', permsToInsert, { ignoreDuplicates: true });

      // ---- 2) Matriz específica por rol
      //         Agregamos 'chat' explícitamente donde corresponde.
      const roleMatrix = {
        Admin: { '*': ALL_ACTS },

        CLevel: { '*': READ },

        RRHH: {
          ausencias: ALL_ACTS,
          feders: READ,
          asistencia: READ,
          calendario: READ,
          tareas: READ,
          clientes: READ,
          cargos: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo: permisos de chat
          chat: CRU
        },

        CuentasAnalista: {
          clientes: CRU,
          tareas: CRU,
          calendario: CRU,
          feders: READ,
          celulas: READ,
          ausencias: READ,
          asistencia: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
        },

        AnalistaDiseno: {
          tareas: CRU,
          calendario: CRU,
          clientes: READ,
          feders: READ,
          asistencia: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
        },
        AnalistaComunicacion: {
          tareas: CRU,
          calendario: CRU,
          clientes: READ,
          feders: READ,
          asistencia: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
        },
        AnalistaAudiovisual: {
          tareas: CRU,
          calendario: CRU,
          clientes: READ,
          feders: READ,
          asistencia: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
        },

        TriMarketing: {
          tareas: [...CRU,'approve','assign'],
          calendario: CRU,
          clientes: CRU,
          asistencia: ['read','report'],
          feders: READ,
          ausencias: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
          // Si querés que Tri también pueda borrar mensajes (moderación), descomentá:
          // chat: CRUD
        },
        TriPerformance: {
          tareas: [...CRU,'approve','assign'],
          calendario: CRU,
          clientes: CRU,
          asistencia: ['read','report'],
          feders: READ,
          ausencias: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
          // o CRUD si va a moderar
        },
        TriTecnologia: {
          tareas: [...CRU,'approve','assign'],
          celulas: READ,
          calendario: CRU,
          clientes: CRU,
          asistencia: ['read','report'],
          feders: READ,
          ausencias: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
          // o CRUD si va a moderar
        },

        Feder: {
          tareas: CRU,
          calendario: CRU,
          ausencias: ['create','read'],
          clientes: READ,
          asistencia: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo: Feder puede chatear perfectamente
          chat: CRU
        },

        Onboarding: {
          calendario: CRU,
          tareas: READ,
          clientes: READ,
          ausencias: READ,
          asistencia: READ,
          celulas: READ,
          notificaciones: CRU,
          // 👇 Nuevo
          chat: CRU
        }
      };

      // ---- 3) Armar permisos efectivos por rol aplicando:
      //         (a) BASELINE: read en TODOS los módulos para TODOS los roles
      //         (b) BASELINE: notificaciones.update para TODOS los roles
      //         (c) roleMatrix para acciones extra
      const eff = new Map(); // rol -> (mod -> Set(acciones))

      const ensure = (r, m) => {
        if (!eff.has(r)) eff.set(r, new Map());
        const mm = eff.get(r);
        if (!mm.has(m)) mm.set(m, new Set());
        return mm.get(m);
      };

      // (a) Lectura global
      for (const r of Object.keys(roleId)) {
        for (const m of ALL_MODS) {
          ensure(r, m).add('read');
        }
      }

      // (b) Update en notificaciones para TODOS
      if (modId['notificaciones'] && actId['update']) {
        for (const r of Object.keys(roleId)) {
          ensure(r, 'notificaciones').add('update');
        }
      }

      // (c) Aplicar la matriz específica
      const addActs = (r, m, acts) => {
        const set = ensure(r, m);
        for (const a of acts) set.add(a);
      };

      for (const [rolName, matrix] of Object.entries(roleMatrix)) {
        if (!roleId[rolName]) continue;

        // comodín '*'
        if (matrix['*']) {
          for (const m of ALL_MODS) addActs(rolName, m, matrix['*']);
        }
        for (const [m, acts] of Object.entries(matrix)) {
          if (m === '*') continue;
          if (!modId[m]) continue;
          addActs(rolName, m, acts);
        }
      }

      // ---- 4) Resolver ids de Permiso y generar inserts
      const [permRows] = await queryInterface.sequelize.query(
        `SELECT id, modulo_id, accion_id FROM "Permiso"`
      );

      const modById = Object.fromEntries(Object.entries(modId).map(([k,v]) => [v, k]));
      const actById = Object.fromEntries(Object.entries(actId).map(([k,v]) => [v, k]));
      const permIdByKey = {};
      for (const p of permRows) {
        const m = modById[p.modulo_id];
        const a = actById[p.accion_id];
        if (m && a) permIdByKey[`${m}.${a}`] = p.id;
      }

      const rolPermisos = [];
      for (const [rName, modMap] of eff.entries()) {
        const rId = roleId[rName];
        if (!rId) continue;
        for (const [m, acts] of modMap.entries()) {
          for (const a of acts) {
            const pid = permIdByKey[`${m}.${a}`];
            if (pid) rolPermisos.push({ rol_id: rId, permiso_id: pid, created_at: now });
          }
        }
      }

      await queryInterface.bulkInsert('RolPermiso', rolPermisos, { ignoreDuplicates: true });
    },

    async down (queryInterface) {
      await queryInterface.bulkDelete('RolPermiso', null, {});
      await queryInterface.bulkDelete('Permiso', null, {});
    }
  };
// backend/db/seeders/202508200100-0003-core-catalogs.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // ===== CARGOS
    await queryInterface.bulkInsert('CargoAmbito', [
      { codigo: 'organico', nombre: 'Orgánico', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cliente',  nombre: 'Cliente',  descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== FEDERS
    await queryInterface.bulkInsert('FederEstadoTipo', [
      { codigo: 'activo',   nombre: 'Activo',   descripcion: null, created_at: now, updated_at: now },
      { codigo: 'licencia', nombre: 'En licencia', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'inactivo', nombre: 'Inactivo', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ModalidadTrabajoTipo', [
      { codigo: 'remoto',  nombre: 'Remoto',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'hibrido', nombre: 'Híbrido', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'oficina', nombre: 'Oficina', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('DiaSemana', [
      { id: 1, codigo: 'lun', nombre: 'Lunes' },
      { id: 2, codigo: 'mar', nombre: 'Martes' },
      { id: 3, codigo: 'mie', nombre: 'Miércoles' },
      { id: 4, codigo: 'jue', nombre: 'Jueves' },
      { id: 5, codigo: 'vie', nombre: 'Viernes' },
      { id: 6, codigo: 'sab', nombre: 'Sábado' },
      { id: 7, codigo: 'dom', nombre: 'Domingo' },
    ], {});

    // ===== CÉLULAS
    await queryInterface.bulkInsert('CelulaEstado', [
      { codigo: 'activa',  nombre: 'Activa',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pausada', nombre: 'Pausada', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cerrada', nombre: 'Cerrada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('CelulaRolTipo', [
      { codigo: 'producto',   nombre: 'Producto',   descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'tecnologia', nombre: 'Tecnología', descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'operaciones',nombre: 'Operaciones',descripcion: 'Tridente de valor', created_at: now, updated_at: now },
      { codigo: 'miembro',    nombre: 'Miembro',    descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== CLIENTES
    await queryInterface.bulkInsert('ClienteTipo', [
      { codigo: 'A', nombre: 'Tipo A', ponderacion: 5, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'B', nombre: 'Tipo B', ponderacion: 3, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'C', nombre: 'Tipo C', ponderacion: 1, descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ClienteEstado', [
      { codigo: 'activo',  nombre: 'Activo',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pausado', nombre: 'Pausado', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'baja',    nombre: 'Baja',    descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== TAREAS
    await queryInterface.bulkInsert('TareaEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'en_curso',  nombre: 'En curso',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'finalizada',nombre: 'Finalizada',descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cancelada', nombre: 'Cancelada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ImpactoTipo', [
      { codigo: 'alto',  nombre: 'Alto',  puntos: 30, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'medio', nombre: 'Medio', puntos: 15, descripcion: null, created_at: now, updated_at: now },
      { codigo: 'bajo',  nombre: 'Bajo',  puntos: 0,  descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('UrgenciaTipo', [
      { codigo: 'lt_24h', nombre: 'Menos de 24h',  puntos: 30, created_at: now, updated_at: now },
      { codigo: 'lt_72h', nombre: 'Menos de 72h',  puntos: 20, created_at: now, updated_at: now },
      { codigo: 'lt_7d',  nombre: 'Menos de 7 días', puntos: 10, created_at: now, updated_at: now },
      { codigo: 'gte_7d', nombre: '7 días o más',   puntos: 0,  created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('ComentarioTipo', [
      { codigo: 'sugerencia', nombre: 'Sugerencia', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'correccion', nombre: 'Corrección', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'nota',       nombre: 'Nota',       descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('TareaAprobacionEstado', [
      { codigo: 'no_aplica', nombre: 'No aplica', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'aprobada',  nombre: 'Aprobada',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'rechazada', nombre: 'Rechazada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== ASISTENCIA
    await queryInterface.bulkInsert('AsistenciaOrigenTipo', [
      { codigo: 'manual', nombre: 'Manual', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'web',    nombre: 'Web',    descripcion: null, created_at: now, updated_at: now },
      { codigo: 'app',    nombre: 'App',    descripcion: null, created_at: now, updated_at: now },
      { codigo: 'auto',   nombre: 'Automático', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('AsistenciaCierreMotivoTipo', [
      { codigo: 'olvido_checkout', nombre: 'Olvido de Check-out', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cierre_admin',    nombre: 'Cierre por Admin',    descripcion: null, created_at: now, updated_at: now },
      { codigo: 'fin_jornada',     nombre: 'Fin de Jornada',      descripcion: null, created_at: now, updated_at: now },
    ], {});

    // ===== CALENDARIO
    await queryInterface.bulkInsert('CalendarioTipo', [
      { codigo: 'personal', nombre: 'Personal', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'celula',   nombre: 'Célula',   descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cliente',  nombre: 'Cliente',  descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('VisibilidadTipo', [
      { codigo: 'privado',      nombre: 'Privado',      descripcion: null, created_at: now, updated_at: now },
      { codigo: 'equipo',       nombre: 'Equipo',       descripcion: null, created_at: now, updated_at: now },
      { codigo: 'organizacion', nombre: 'Organización', descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('EventoTipo', [
      { codigo: 'reunion', nombre: 'Reunión', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'bloqueo', nombre: 'Bloqueo', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'tarea',   nombre: 'Tarea',   descripcion: null, created_at: now, updated_at: now },
      { codigo: 'otro',    nombre: 'Otro',    descripcion: null, created_at: now, updated_at: now },
    ], {});

    await queryInterface.bulkInsert('SyncDireccionTipo', [
      { codigo: 'local_a_google', nombre: 'Sólo local → Google', descripcion: null },
      { codigo: 'google_a_local', nombre: 'Sólo Google → local', descripcion: null },
      { codigo: 'bidireccional',  nombre: 'Bidireccional',       descripcion: null },
    ], {});

    await queryInterface.bulkInsert('AsistenteTipo', [
      { codigo: 'obligatorio', nombre: 'Obligatorio', descripcion: null },
      { codigo: 'opcional',    nombre: 'Opcional',    descripcion: null },
      { codigo: 'informativo', nombre: 'Informativo', descripcion: null },
    ], {});

    // ===== NOTIFICACIONES (SOLO catálogos que NO dependen de buzon_id)
    await queryInterface.bulkInsert('CanalTipo', [
      { codigo: 'in_app', nombre: 'In-App', descripcion: null },
      { codigo: 'email',  nombre: 'Email',  descripcion: null },
    ], {});

    await queryInterface.bulkInsert('ImportanciaTipo', [
      { codigo: 'alta',  nombre: 'Alta',  orden: 1 },
      { codigo: 'media', nombre: 'Media', orden: 2 },
      { codigo: 'baja',  nombre: 'Baja',  orden: 3 },
    ], {});

    await queryInterface.bulkInsert('EstadoEnvio', [
      { codigo: 'queued',    nombre: 'En cola',   descripcion: null },
      { codigo: 'sent',      nombre: 'Enviado',   descripcion: null },
      { codigo: 'delivered', nombre: 'Entregado', descripcion: null },
      { codigo: 'opened',    nombre: 'Abierto',   descripcion: null },
      { codigo: 'read',      nombre: 'Leído',     descripcion: null },
      { codigo: 'failed',    nombre: 'Fallido',   descripcion: null },
    ], {});

    await queryInterface.bulkInsert('ProveedorTipo', [
      { codigo: 'smtp',     nombre: 'SMTP',     descripcion: null },
      { codigo: 'firebase', nombre: 'Firebase', descripcion: null },
      { codigo: 'sendgrid', nombre: 'SendGrid', descripcion: null },
    ], {});
  },

  async down (queryInterface) {
    // Nota: NO borramos NotificacionTipo aquí (lo crea/borra el seeder 0300)
    await queryInterface.bulkDelete('ProveedorTipo', null, {});
    await queryInterface.bulkDelete('EstadoEnvio', null, {});
    await queryInterface.bulkDelete('ImportanciaTipo', null, {});
    await queryInterface.bulkDelete('CanalTipo', null, {});

    await queryInterface.bulkDelete('AsistenteTipo', null, {});
    await queryInterface.bulkDelete('SyncDireccionTipo', null, {});
    await queryInterface.bulkDelete('EventoTipo', null, {});
    await queryInterface.bulkDelete('VisibilidadTipo', null, {});
    await queryInterface.bulkDelete('CalendarioTipo', null, {});

    await queryInterface.bulkDelete('AsistenciaCierreMotivoTipo', null, {});
    await queryInterface.bulkDelete('AsistenciaOrigenTipo', null, {});

    await queryInterface.bulkDelete('TareaAprobacionEstado', null, {});
    await queryInterface.bulkDelete('ComentarioTipo', null, {});
    await queryInterface.bulkDelete('UrgenciaTipo', null, {});
    await queryInterface.bulkDelete('ImpactoTipo', null, {});
    await queryInterface.bulkDelete('TareaEstado', null, {});

    await queryInterface.bulkDelete('ClienteEstado', null, {});
    await queryInterface.bulkDelete('ClienteTipo', null, {});

    await queryInterface.bulkDelete('CelulaRolTipo', null, {});
    await queryInterface.bulkDelete('CelulaEstado', null, {});

    await queryInterface.bulkDelete('DiaSemana', null, {});
    await queryInterface.bulkDelete('ModalidadTrabajoTipo', null, {});
    await queryInterface.bulkDelete('FederEstadoTipo', null, {});
    await queryInterface.bulkDelete('CargoAmbito', null, {});
  }
};
// backend/db/seeders/202508200150-0004-ausencias-catalogs.cjs
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    // Unidad de medida para ausencias: día u hora
    await queryInterface.bulkInsert('AusenciaUnidadTipo', [
      { codigo: 'dia',  nombre: 'Día' },
      { codigo: 'hora', nombre: 'Hora' },
    ], {});

    // Estados de ausencia
    await queryInterface.bulkInsert('AusenciaEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
      { codigo: 'aprobada',  nombre: 'Aprobada',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'denegada',  nombre: 'Denegada',  descripcion: null, created_at: now, updated_at: now },
      { codigo: 'cancelada', nombre: 'Cancelada', descripcion: null, created_at: now, updated_at: now },
    ], {});

    // Mitad de día
    await queryInterface.bulkInsert('MitadDiaTipo', [
      { id: 1, codigo: 'am', nombre: 'Mañana' },
      { id: 2, codigo: 'pm', nombre: 'Tarde' },
    ], {});

    // Estados de la solicitud de asignación de cupos (cuando el usuario pide más)
    await queryInterface.bulkInsert('AsignacionSolicitudEstado', [
      { codigo: 'pendiente', nombre: 'Pendiente'},
      { codigo: 'aprobada',  nombre: 'Aprobada' },
      { codigo: 'denegada',  nombre: 'Denegada' },
      { codigo: 'cancelada', nombre: 'Cancelada' },
    ], {});

    // Tipos de ausencia (ligados a unidad)
    const [[unidadDia],[unidadHora]] = await Promise.all([
      queryInterface.sequelize.query(`SELECT id FROM "AusenciaUnidadTipo" WHERE codigo='dia' LIMIT 1`),
      queryInterface.sequelize.query(`SELECT id FROM "AusenciaUnidadTipo" WHERE codigo='hora' LIMIT 1`),
    ]);

    await queryInterface.bulkInsert('AusenciaTipo', [
      { codigo: 'vacaciones', nombre: 'Vacaciones', descripcion: null, unidad_id: unidadDia[0].id, created_at: now, updated_at: now },
      { codigo: 'tristeza',   nombre: 'Días de Tristeza', descripcion: 'Beneficio interno', unidad_id: unidadDia[0].id, created_at: now, updated_at: now },
      { codigo: 'examen',     nombre: 'Examen',   descripcion: 'Horas para examen', unidad_id: unidadHora[0].id, created_at: now, updated_at: now },
      { codigo: 'personal',   nombre: 'Asunto personal', descripcion: null, unidad_id: unidadHora[0].id, created_at: now, updated_at: now },
      { codigo: 'no_pagado',  nombre: 'No pagado',descripcion: 'Sin cupo, requiere aprobación', unidad_id: unidadDia[0].id, created_at: now, updated_at: now },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('AusenciaTipo', null, {});
    await queryInterface.bulkDelete('AsignacionSolicitudEstado', null, {});
    await queryInterface.bulkDelete('MitadDiaTipo', null, {});
    await queryInterface.bulkDelete('AusenciaEstado', null, {});
    await queryInterface.bulkDelete('AusenciaUnidadTipo', null, {});
  }
};
// backend/db/seeders/0005-sample-initial-data.cjs
'use strict';
/**
 * Seeder 0005 - sample-initial-data (ajustado)
 * - Mantiene usuarios base (incluye ralbanesi@…)
 * - Enzo SIN célula (celula_id: null)
 * - No cambia roles/permisos (Admin intacto).
 */

const argon2 = require('argon2');

module.exports = {
  async up (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      // Password por persona (argon2id)
      const DEFAULT_PASS_BY_EMAIL = {
        'sistemas@fedes.ai'  : 'Sistemas123!',
        'ralbanesi@fedes.ai' : 'Romina123!',
        'epinotti@fedes.ai'  : 'Enzo123!',
        'gcanibano@fedes.ai' : 'Gonzalo123!'
      };
      const passHashByEmail = {};
      for (const [email, plain] of Object.entries(DEFAULT_PASS_BY_EMAIL)) {
        passHashByEmail[email] = await argon2.hash(plain, {
          type: argon2.argon2id, timeCost: 3, memoryCost: 19456, parallelism: 1
        });
      }

      // === 1) Dominio ===
      let [[dom]] = await queryInterface.sequelize.query(
        `SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`, { transaction: t }
      );
      if (!dom) {
        await queryInterface.bulkInsert('AuthEmailDominio', [
          { dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }
        ], { transaction: t });
        [[dom]] = await queryInterface.sequelize.query(
          `SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`, { transaction: t }
        );
      }
      const emailDomId = dom.id;

      // === 2) Usuarios base ===
      const baseEmails = [
        'sistemas@fedes.ai', 'ralbanesi@fedes.ai', 'epinotti@fedes.ai', 'gcanibano@fedes.ai'
      ];

      const [existingUsers] = await queryInterface.sequelize.query(
        `SELECT email FROM "User" WHERE email IN (:emails)`,
        { transaction: t, replacements: { emails: baseEmails } }
      );
      const exists = new Set(existingUsers.map(u => u.email));
      const toCreate = baseEmails
        .filter(e => !exists.has(e))
        .map(email => ({
          email,
          password_hash: passHashByEmail[email],
          is_activo: true,
          email_dominio_id: emailDomId,
          created_at: now,
          updated_at: now
        }));
      if (toCreate.length) {
        await queryInterface.bulkInsert('User', toCreate, { transaction: t });
      }

      // asegurar formato argon2id
      const [rowsForFix] = await queryInterface.sequelize.query(
        `SELECT id, email, password_hash FROM "User" WHERE email IN (:emails)`,
        { transaction: t, replacements: { emails: baseEmails } }
      );
      for (const u of rowsForFix) {
        const phc = String(u.password_hash || '');
        if (!phc.startsWith('$argon2id$')) {
          await queryInterface.sequelize.query(
            `UPDATE "User" SET password_hash = :hash, updated_at = :now WHERE id = :id`,
            { transaction: t, replacements: { hash: passHashByEmail[u.email], id: u.id, now } }
          );
        }
      }

      const [users] = await queryInterface.sequelize.query(
        `SELECT id, email FROM "User"
         WHERE email IN (:emails)`,
        { transaction: t, replacements: { emails: baseEmails } }
      );
      const uid = Object.fromEntries(users.map(u => [u.email, u.id]));

      // === 3) Célula 1 (con slug y perfil_md) ===
      const [[celulaEstadoActiva]] = await queryInterface.sequelize.query(
        `SELECT id FROM "CelulaEstado" WHERE codigo='activa' LIMIT 1`,
        { transaction: t }
      );

      const coreName = 'Célula 1';
      const coreSlug = 'celula-1';

      const [[celExist]] = await queryInterface.sequelize.query(
        `SELECT id FROM "Celula" WHERE slug = :slug OR nombre = :name LIMIT 1`,
        { transaction: t, replacements: { slug: coreSlug, name: coreName } }
      );

      let celulaCoreId;
      if (!celExist) {
        await queryInterface.bulkInsert('Celula', [{
          nombre: coreName,
          descripcion: 'Célula principal',
          estado_id: celulaEstadoActiva.id,
          slug: coreSlug,
          avatar_url: null,
          cover_url: null,
          perfil_md: null,
          created_at: now,
          updated_at: now
        }], { transaction: t });
        const [[cel]] = await queryInterface.sequelize.query(
          `SELECT id FROM "Celula" WHERE slug = :slug LIMIT 1`,
          { transaction: t, replacements: { slug: coreSlug } }
        );
        celulaCoreId = cel.id;
      } else {
        celulaCoreId = celExist.id;
      }

      // === 4) Feders (idempotente) ===
      const [[federActivo]] = await queryInterface.sequelize.query(
        `SELECT id FROM "FederEstadoTipo" WHERE codigo='activo' LIMIT 1`,
        { transaction: t }
      );
      const [existingFeders] = await queryInterface.sequelize.query(
        `SELECT user_id FROM "Feder" WHERE user_id IN (:uids)`,
        { transaction: t, replacements: { uids: Object.values(uid) } }
      );
      const fedSet = new Set(existingFeders.map(f => f.user_id));
      const fedRows = [
        { user_id: uid['sistemas@fedes.ai'],  nombre: 'Sistemas', apellido: 'Fedes',    celula_id: celulaCoreId },
        { user_id: uid['ralbanesi@fedes.ai'], nombre: 'Romina',   apellido: 'Albanesi', celula_id: celulaCoreId },
        { user_id: uid['epinotti@fedes.ai'],  nombre: 'Enzo',     apellido: 'Pinotti',  celula_id: null }, // <— SIN célula
        { user_id: uid['gcanibano@fedes.ai'], nombre: 'Gonzalo',  apellido: 'Canibano', celula_id: celulaCoreId },
      ].filter(r => r.user_id && !fedSet.has(r.user_id))
       .map(r => ({
         ...r,
         estado_id: federActivo.id,
         is_activo: true, created_at: now, updated_at: now
       }));
      if (fedRows.length) {
        await queryInterface.bulkInsert('Feder', fedRows, { transaction: t });
      }

      const [feders] = await queryInterface.sequelize.query(
        `SELECT id, user_id FROM "Feder" WHERE user_id IN (:uids)`,
        { transaction: t, replacements: { uids: Object.values(uid) } }
      );
      const federByUserId = Object.fromEntries(feders.map(f => [f.user_id, f.id]));

      // === 5) Calendarios personales ===
      const [[calPersonal]] = await queryInterface.sequelize.query(
        `SELECT id FROM "CalendarioTipo" WHERE codigo='personal' LIMIT 1`, { transaction: t }
      );
      const [[visPriv]] = await queryInterface.sequelize.query(
        `SELECT id FROM "VisibilidadTipo" WHERE codigo='privado' LIMIT 1`, { transaction: t }
      );
      const calToEnsure = [
        { name: 'Calendario de Sistemas',  user: 'sistemas@fedes.ai',  color: '#1e88e5' },
        { name: 'Calendario de Romina',    user: 'ralbanesi@fedes.ai', color: '#8e24aa' },
        { name: 'Calendario de Enzo',      user: 'epinotti@fedes.ai',  color: '#43a047' },
        { name: 'Calendario de Gonzalo',   user: 'gcanibano@fedes.ai', color: '#f4511e' },
      ];
      for (const c of calToEnsure) {
        const federId = federByUserId[uid[c.user]];
        if (!federId) continue;
        const [[existsCal]] = await queryInterface.sequelize.query(
          `SELECT id FROM "CalendarioLocal"
           WHERE tipo_id = :tipo AND feder_id = :fid AND nombre = :name LIMIT 1`,
          { transaction: t, replacements: { tipo: calPersonal.id, fid: federId, name: c.name } }
        );
        if (!existsCal) {
          await queryInterface.bulkInsert('CalendarioLocal', [{
            tipo_id: calPersonal.id,
            nombre: c.name,
            visibilidad_id: visPriv.id,
            feder_id: federId,
            celula_id: null,
            cliente_id: null,
            time_zone: 'America/Argentina/Buenos_Aires',
            color: c.color,
            is_activo: true,
            created_at: now,
            updated_at: now
          }], { transaction: t });
        }
      }

      // === 6) Cliente demo ===
      const [[cliTipoA]] = await queryInterface.sequelize.query(
        `SELECT id, ponderacion FROM "ClienteTipo" WHERE codigo='A' LIMIT 1`, { transaction: t }
      );
      const [[cliEstadoAct]] = await queryInterface.sequelize.query(
        `SELECT id FROM "ClienteEstado" WHERE codigo='activo' LIMIT 1`, { transaction: t }
      );
      const [[clienteDemoExists]] = await queryInterface.sequelize.query(
        `SELECT id FROM "Cliente" WHERE nombre='Cliente Demo' LIMIT 1`, { transaction: t }
      );
      if (!clienteDemoExists) {
        await queryInterface.bulkInsert('Cliente', [{
          celula_id: celulaCoreId, tipo_id: cliTipoA.id, estado_id: cliEstadoAct.id,
          nombre: 'Cliente Demo', alias: 'Demo', email: 'contacto@demo.com',
          telefono: '+54 11 1234-5678', sitio_web: 'https://demo.com',
          descripcion: 'Cliente semilla', ponderacion: cliTipoA.ponderacion,
          created_at: now, updated_at: now
        }], { transaction: t });
      }

      // === 7) Roles base ===
      const [roles] = await queryInterface.sequelize.query(
        `SELECT id, nombre FROM "Rol"`, { transaction: t }
      );
      const rid = Object.fromEntries(roles.map(r => [r.nombre, r.id]));
      const toAssign = [
        ['sistemas@fedes.ai', 'Admin'],
        ['ralbanesi@fedes.ai','RRHH'],
        ['gcanibano@fedes.ai','CuentasAnalista'],
        ['epinotti@fedes.ai', 'Feder'],
      ].map(([email, rol]) => ({ user_id: uid[email], rol_id: rid[rol] }))
       .filter(r => r.user_id && r.rol_id);
      if (toAssign.length) {
        const pairs = toAssign.map(r => `(${r.user_id},${r.rol_id})`).join(',');
        const [already] = await queryInterface.sequelize.query(
          `SELECT user_id, rol_id FROM "UserRol" WHERE (user_id, rol_id) IN (${pairs})`,
          { transaction: t }
        );
        const existSet = new Set(already.map(a => `${a.user_id}:${a.rol_id}`));
        const missing = toAssign
          .filter(a => !existSet.has(`${a.user_id}:${a.rol_id}`))
          .map(a => ({ ...a, created_at: now }));
        if (missing.length) {
          await queryInterface.bulkInsert('UserRol', missing, { transaction: t });
        }
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkDelete('UserRol', null, { transaction: t });
      await queryInterface.bulkDelete('CalendarioLocal', null, { transaction: t });
      await queryInterface.bulkDelete('Cliente', { nombre: 'Cliente Demo' }, { transaction: t });
      await queryInterface.bulkDelete('Feder', null, { transaction: t });
      await queryInterface.bulkDelete('Celula', { slug: 'celula-1' }, { transaction: t });
      await queryInterface.bulkDelete('User', {
        email: ['sistemas@fedes.ai','ralbanesi@fedes.ai','epinotti@fedes.ai','gcanibano@fedes.ai']
      }, { transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};
// 20250820143041-0006-ausencias-default-quotas copy.cjs
'use strict';

function yearRange(d = new Date()) {
  const y = d.getUTCFullYear();
  const desde = new Date(Date.UTC(y, 0, 1));   // 1 Ene
  const hasta = new Date(Date.UTC(y, 11, 31)); // 31 Dic
  return { desde, hasta };
}

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    const { desde, hasta } = yearRange(now);

    // === 1) Tipos de ausencia (con su unidad) ===
    const [tipoRows] = await queryInterface.sequelize.query(`
      SELECT id, codigo, unidad_id FROM "AusenciaTipo"
      WHERE codigo IN ('vacaciones','tristeza','examen')
    `);
    const tipos = Object.fromEntries(tipoRows.map(t => [t.codigo, t]));
    if (!(tipos.vacaciones && tipos.tristeza && tipos.examen)) return;

    // === 2) Usuarios/Feders de destino (ralbanesi, epinotti) ===
    const [users] = await queryInterface.sequelize.query(`
      SELECT id, email FROM "User"
      WHERE email IN ('ralbanesi@fedes.ai','epinotti@fedes.ai','sistemas@fedes.ai')
    `);
    const uid = Object.fromEntries(users.map(u => [u.email, u.id]));

    const [feders] = await queryInterface.sequelize.query(`
      SELECT id, user_id FROM "Feder"
      WHERE user_id IN (${uid['ralbanesi@fedes.ai'] || -1}, ${uid['epinotti@fedes.ai'] || -1})
    `);
    const federByUserId = Object.fromEntries(feders.map(f => [f.user_id, f.id]));

    // Asignador por defecto (RRHH: ralbanesi), fallback sistemas
    const asignadoPorUserId = uid['ralbanesi@fedes.ai'] || uid['sistemas@fedes.ai'];

    const cuotas = [];

    // Para Romina (RRHH)
    if (federByUserId[uid['ralbanesi@fedes.ai']]) {
      const fid = federByUserId[uid['ralbanesi@fedes.ai']];
      cuotas.push(
        { feder_id: fid, tipo_id: tipos.vacaciones.id, unidad_id: tipos.vacaciones.unidad_id, cantidad_total: 15,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Cuota anual inicial', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now },
        { feder_id: fid, tipo_id: tipos.tristeza.id, unidad_id: tipos.tristeza.unidad_id, cantidad_total: 5,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Beneficio interno', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now },
        { feder_id: fid, tipo_id: tipos.examen.id, unidad_id: tipos.examen.unidad_id, cantidad_total: 32,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Horas para examen', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now }
      );
    }

    // Para Enzo
    if (federByUserId[uid['epinotti@fedes.ai']]) {
      const fid = federByUserId[uid['epinotti@fedes.ai']];
      cuotas.push(
        { feder_id: fid, tipo_id: tipos.vacaciones.id, unidad_id: tipos.vacaciones.unidad_id, cantidad_total: 15,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Cuota anual inicial', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now },
        { feder_id: fid, tipo_id: tipos.tristeza.id, unidad_id: tipos.tristeza.unidad_id, cantidad_total: 5,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Beneficio interno', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now },
        { feder_id: fid, tipo_id: tipos.examen.id, unidad_id: tipos.examen.unidad_id, cantidad_total: 32,
          vigencia_desde: desde, vigencia_hasta: hasta, comentario: 'Horas para examen', asignado_por_user_id: asignadoPorUserId,
          is_activo: true, created_at: now, updated_at: now }
      );
    }

    if (cuotas.length) {
      await queryInterface.bulkInsert('AusenciaCuota', cuotas, {});
    }
  },

  async down (queryInterface, Sequelize) {
    // borra solo las cuotas asignadas por estos usuarios/periodo (simple)
    await queryInterface.sequelize.query(`
      DELETE FROM "AusenciaCuota"
      WHERE comentario IN ('Cuota anual inicial','Beneficio interno','Horas para examen')
    `);
  }
};
// 0007 — CelulaRolTipo: tridente de Analistas + Miembro
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    const rows = [
      ['analista_diseno','Analista de Diseño','Responsable de diseño y piezas'],
      ['analista_cuentas','Analista de Cuentas','Punto de contacto con cliente / PM'],
      ['analista_audiovisual','Analista Audiovisual','Video/edición/animación'],
      ['miembro','Miembro','Participante de célula']
    ].map(([codigo,nombre,descripcion]) => ({ codigo, nombre, descripcion, created_at: now, updated_at: now }));

    await queryInterface.bulkInsert('CelulaRolTipo', rows, { ignoreDuplicates: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('CelulaRolTipo', { codigo: ['analista_diseno','analista_cuentas','analista_audiovisual','miembro'] }, {});
  }
};
// backend/db/seeders/20250822090045-0008-tareas-extra-catalogs.cjs
'use strict';
/**
 *  Tareas: catálogos extra (idempotente)
 * Inserta sólo los códigos faltantes para evitar colisiones.
 */

async function ensureCodes(queryInterface, table, rows, t) {
  const codes = rows.map(r => r.codigo);
  const [exists] = await queryInterface.sequelize.query(
    `SELECT codigo FROM "${table}" WHERE codigo IN (:codes)`,
    { transaction: t, replacements: { codes } }
  );
  const have = new Set(exists.map(e => e.codigo));
  const missing = rows.filter(r => !have.has(r.codigo));
  if (missing.length) {
    await queryInterface.bulkInsert(table, missing, { transaction: t });
  }
}

module.exports = {
  async up (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      await ensureCodes(queryInterface, 'TareaEstado', [
        { codigo: 'pendiente',  nombre: 'Pendiente',  descripcion: null, created_at: now, updated_at: now },
        { codigo: 'en_curso',   nombre: 'En curso',   descripcion: null, created_at: now, updated_at: now },
        { codigo: 'finalizada', nombre: 'Finalizada', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'cancelada',  nombre: 'Cancelada',  descripcion: null, created_at: now, updated_at: now }
      ], t);

      await ensureCodes(queryInterface, 'ImpactoTipo', [
        { codigo: 'alto',  nombre: 'Alto',  puntos: 30, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'medio', nombre: 'Medio', puntos: 15, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'bajo',  nombre: 'Bajo',  puntos: 0,  descripcion: null, created_at: now, updated_at: now }
      ], t);

      await ensureCodes(queryInterface, 'UrgenciaTipo', [
        { codigo: 'lt_24h', nombre: 'Menos de 24h',     puntos: 30, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'lt_72h', nombre: 'Menos de 72h',     puntos: 20, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'lt_7d',  nombre: 'Menos de 7 días',  puntos: 10, descripcion: null, created_at: now, updated_at: now },
        { codigo: 'gte_7d', nombre: '7 días o más',     puntos: 0,  descripcion: null, created_at: now, updated_at: now }
      ], t);

      await ensureCodes(queryInterface, 'ComentarioTipo', [
        { codigo: 'sugerencia', nombre: 'Sugerencia', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'correccion', nombre: 'Corrección', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'nota',       nombre: 'Nota',       descripcion: null, created_at: now, updated_at: now }
      ], t);

      // El default de Tarea.aprobacion_estado_id es 1 (no_aplica).
      // Este seeder no fuerza ID; sólo completa faltantes.
      await ensureCodes(queryInterface, 'TareaAprobacionEstado', [
        { codigo: 'no_aplica', nombre: 'No aplica', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'pendiente', nombre: 'Pendiente', descripcion: null, created_at: now, updated_at: now },
        { codigo: 'aprobada',  nombre: 'Aprobada',  descripcion: null, created_at: now, updated_at: now },
        { codigo: 'rechazada', nombre: 'Rechazada', descripcion: null, created_at: now, updated_at: now }
      ], t);

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    // Borrado “suave”: elimina solo los que este seeder podría haber agregado
    await queryInterface.bulkDelete('TareaAprobacionEstado',
      { codigo: ['no_aplica','pendiente','aprobada','rechazada'] }, {});
    await queryInterface.bulkDelete('ComentarioTipo',
      { codigo: ['sugerencia','correccion','nota'] }, {});
    await queryInterface.bulkDelete('UrgenciaTipo',
      { codigo: ['lt_24h','lt_72h','lt_7d','gte_7d'] }, {});
    await queryInterface.bulkDelete('ImpactoTipo',
      { codigo: ['alto','medio','bajo'] }, {});
    await queryInterface.bulkDelete('TareaEstado',
      { codigo: ['pendiente','en_curso','finalizada','cancelada'] }, {});
  }
};
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
  async up (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      // ===== 0) Catálogos opcionales =====
      // -- Relaciones
      if (await hasTable(queryInterface, 'TareaRelacionTipo')) {
        await ensureCodes(queryInterface, 'TareaRelacionTipo', [
          { codigo: 'depende_de',    nombre: 'Depende de',    created_at: now },
          { codigo: 'bloquea',       nombre: 'Bloquea',       created_at: now },
          { codigo: 'duplicado_de',  nombre: 'Duplicado de',  created_at: now },
          { codigo: 'relacionado',   nombre: 'Relacionado',   created_at: now },
        ], t);
      }

      // -- Etiquetas
      if (await hasTable(queryInterface, 'TareaEtiqueta')) {
        await ensureCodes(queryInterface, 'TareaEtiqueta', [
          { codigo: 'cliente-demo',   nombre: 'Cliente Demo',   color_hex: '#607D8B', created_at: now, updated_at: now },
          { codigo: 'prioridad-alta', nombre: 'Prioridad alta', color_hex: '#F44336', created_at: now, updated_at: now },
          { codigo: 'plan',           nombre: 'Planificación',  color_hex: '#3F51B5', created_at: now, updated_at: now },
          { codigo: 'roadmap',        nombre: 'Roadmap',        color_hex: '#009688', created_at: now, updated_at: now },
          { codigo: 'setup',          nombre: 'Setup',          color_hex: '#9C27B0', created_at: now, updated_at: now },
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
      const impactoAlto  = await idByCodigo(queryInterface, 'ImpactoTipo', 'alto', t);
      const urg72        = await idByCodigo(queryInterface, 'UrgenciaTipo', 'lt_72h', t);
      const urg7d        = await idByCodigo(queryInterface, 'UrgenciaTipo', 'lt_7d', t);

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
        romina:   byEmail['ralbanesi@fedes.ai']?.feder_id,
        enzo:     byEmail['epinotti@fedes.ai']?.feder_id,
        gonzalo:  byEmail['gcanibano@fedes.ai']?.feder_id,
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
          etiquetas: ['cliente-demo','plan'],
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
          etiquetas: ['cliente-demo','roadmap','prioridad-alta'],
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
          etiquetas: ['setup','cliente-demo'],
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
      const userRom  = byEmail['ralbanesi@fedes.ai']?.id;

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

  async down (queryInterface) {
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
      }

      // Eliminar tareas (cascada limpiará responsables/colaboradores/etiquetas/checklist/comentarios/adjuntos)
      await queryInterface.sequelize.query(`
        DELETE FROM "Tarea"
        WHERE id = ANY(:ids)
      `, { transaction: t, replacements: { ids } });

      // Borrar etiquetas de demo (si existen)
      if (await hasTable(queryInterface, 'TareaEtiqueta')) {
        await queryInterface.bulkDelete('TareaEtiqueta',
          { codigo: ['cliente-demo','prioridad-alta','plan','roadmap','setup'] }, { transaction: t });
      }

      // Borrar tipos de relación de demo (si existen)
      if (await hasTable(queryInterface, 'TareaRelacionTipo')) {
        await queryInterface.bulkDelete('TareaRelacionTipo',
          { codigo: ['depende_de','bloquea','duplicado_de','relacionado'] }, { transaction: t });
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};
// 20250822155809-0010-notificaciones-buzones-y-tipos.cjs
'use strict';

module.exports = {
  async up (queryInterface) {
    const now = new Date();

    // 1) Buzones (idempotente)
    await queryInterface.sequelize.query(`
      INSERT INTO "BuzonTipo"(codigo,nombre) VALUES
        ('tareas','Tareas'),
        ('chat','Chat'),
        ('calendario','Calendario/Reuniones'),
        ('notificaciones','Notificaciones del sistema')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    const [[bzTareas]]   = await queryInterface.sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='tareas' LIMIT 1`);
    const [[bzChat]]     = await queryInterface.sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='chat' LIMIT 1`);
    const [[bzCalendar]] = await queryInterface.sequelize.query(`SELECT id FROM "BuzonTipo" WHERE codigo='calendario' LIMIT 1`);

    if (!bzTareas?.id || !bzChat?.id || !bzCalendar?.id) {
      throw new Error('No se pudieron obtener los IDs de BuzonTipo.');
    }

    // 2) Canales (asegurar push)
    await queryInterface.sequelize.query(`
      INSERT INTO "CanalTipo"(codigo,nombre) VALUES
        ('in_app','In-App'),
        ('email','Email'),
        ('push','Push')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 3) Tipos base con su buzon/canales
    //    ⬇️ Ajuste: agrego "push" a tarea_asignada y tarea_comentario
    const tipos = [
      // TAREAS
      ['tarea_asignada',      'Tarea asignada',           bzTareas.id,   ['in_app','email','push']],
      ['tarea_comentario',    'Comentario en tarea',      bzTareas.id,   ['in_app','push']],
      ['tarea_vencimiento',   'Tarea próxima a vencer',   bzTareas.id,   ['in_app','email']],
      // AUSENCIAS → bandeja Tareas
      ['ausencia_aprobada',   'Ausencia aprobada',        bzTareas.id,   ['in_app','email']],
      ['ausencia_denegada',   'Ausencia denegada',        bzTareas.id,   ['in_app','email']],
      // SISTEMA → bandeja Tareas (genérico)
      ['sistema',             'Sistema',                  bzTareas.id,   ['in_app','email']],

      // CHAT (ya tenían push)
      ['chat_mencion',        'Mención en chat',          bzChat.id,     ['in_app','push']],
      ['chat_mensaje',        'Nuevo mensaje en chat',    bzChat.id,     ['in_app','push']],

      // CALENDARIO / REUNIONES
      ['evento_invitacion',   'Invitación a evento',      bzCalendar.id, ['in_app','email']],
      ['recordatorio',        'Recordatorio de evento',   bzCalendar.id, ['in_app','push','email']]
    ];

    // 4) Upsert idempotente (garantiza buzon_id y canales)
    for (const [codigo, nombre, buzon_id, canales] of tipos) {
      await queryInterface.sequelize.query(`
        INSERT INTO "NotificacionTipo"(codigo, nombre, buzon_id, canales_default_json, created_at, updated_at)
        VALUES (:codigo, :nombre, :buzon_id, :canales::jsonb, :now, :now)
        ON CONFLICT (codigo) DO UPDATE
        SET nombre = EXCLUDED.nombre,
            buzon_id = EXCLUDED.buzon_id,
            canales_default_json = EXCLUDED.canales_default_json,
            updated_at = EXCLUDED.updated_at;
      `, {
        replacements: {
          codigo,
          nombre,
          buzon_id,
          canales: JSON.stringify(canales),
          now
        }
      });
    }

    // 5) Backfill defensivo de buzon_id
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='tareas')
      WHERE buzon_id IS NULL AND (codigo LIKE 'tarea_%' OR codigo LIKE 'ausencia_%' OR codigo='sistema');
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='chat')
      WHERE buzon_id IS NULL AND codigo LIKE 'chat_%';
    `);
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET buzon_id = (SELECT id FROM "BuzonTipo" WHERE codigo='calendario')
      WHERE buzon_id IS NULL AND (codigo LIKE 'evento_%' OR codigo='recordatorio');
    `);

    // 6) ⬅️ Backfill idempotente para agregar "push" si faltara (códigos clave)
    //     OJO: para arrays JSONB usamos @> para "contiene" y || para concatenar arrays
    await queryInterface.sequelize.query(`
      UPDATE "NotificacionTipo"
      SET canales_default_json =
        CASE
          WHEN canales_default_json IS NULL THEN '["in_app","push"]'::jsonb
          WHEN NOT (canales_default_json @> '["push"]'::jsonb) THEN (canales_default_json || '["push"]'::jsonb)
          ELSE canales_default_json
        END,
        updated_at = :now
      WHERE codigo IN ('tarea_comentario','tarea_asignada');
    `, { replacements: { now }});
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('NotificacionTipo', {
      codigo: [
        'tarea_asignada','tarea_comentario','tarea_vencimiento',
        'ausencia_aprobada','ausencia_denegada',
        'sistema',
        'chat_mencion','chat_mensaje',
        'evento_invitacion','recordatorio'
      ]
    }, {});
    // No borramos BuzonTipo/CanalTipo aquí para no romper otros datos.
  }
};
// 20250822162000-0011-notificaciones-aliases.cjs
'use strict';

module.exports = {
  async up (queryInterface) {
    // Proveedores
    await queryInterface.sequelize.query(`
      INSERT INTO "ProveedorTipo"(codigo,nombre,descripcion)
      VALUES ('gmail_smtp','Gmail SMTP',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO "ProveedorTipo"(codigo,nombre,descripcion)
      VALUES ('fcm','Firebase Cloud Messaging',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // Estados usados por email/push
    await queryInterface.sequelize.query(`
      INSERT INTO "EstadoEnvio"(codigo,nombre,descripcion)
      VALUES
        ('queued','En cola',NULL),
        ('sent','Enviado',NULL),
        ('opened','Abierto',NULL),
        ('error','Error',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // Asegurar canal push
    await queryInterface.sequelize.query(`
      INSERT INTO "CanalTipo"(codigo,nombre,descripcion)
      VALUES ('push','Push',NULL)
      ON CONFLICT (codigo) DO NOTHING;
    `);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('ProveedorTipo', { codigo: ['gmail_smtp','fcm'] }, {});
    await queryInterface.bulkDelete('EstadoEnvio', { codigo: ['queued','sent','opened','error'] }, {});
    // No borramos 'push' para no romper datos existentes.
  }
};
// 0015 - Cargos core (idempotente)
'use strict';

/**
 * 0015 - Cargos core (idempotente)
 * Actualizado: usa "Desarrollador Fullstack" (en vez de "Desarrollador").
 */

async function ensureAmbitos(queryInterface, t) {
  await queryInterface.sequelize.query(`
    INSERT INTO "CargoAmbito"(codigo, nombre, descripcion, created_at, updated_at)
    VALUES
      ('organico','Orgánico',NULL, now(), now()),
      ('cliente','Cliente',NULL, now(), now())
    ON CONFLICT (codigo) DO NOTHING;
  `, { transaction: t });

  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, codigo FROM "CargoAmbito" WHERE codigo IN ('organico','cliente')`,
    { transaction: t }
  );
  const map = Object.fromEntries(rows.map(r => [r.codigo, r.id]));
  if (!map.organico || !map.cliente) {
    throw new Error('Faltan ámbitos requeridos: organico/cliente');
  }
  return map;
}

async function ensureByNombre(queryInterface, table, rows, t) {
  if (!rows.length) return;
  const nombres = rows.map(r => r.nombre);
  const [exists] = await queryInterface.sequelize.query(
    `SELECT nombre FROM "${table}" WHERE nombre IN (:nombres)`,
    { transaction: t, replacements: { nombres } }
  );
  const have = new Set(exists.map(e => e.nombre));
  const missing = rows.filter(r => !have.has(r.nombre));
  if (missing.length) {
    await queryInterface.bulkInsert(table, missing, { transaction: t });
  }
}

module.exports = {
  async up (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();
      const amb = await ensureAmbitos(queryInterface, t);

      const org = [
        { nombre: 'Líder de Producto',        descripcion: 'Tridente: Producto',        ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Tecnología',      descripcion: 'Tridente: Tecnología',      ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Operaciones',     descripcion: 'Tridente: Operaciones',     ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Co-Founder y CEO',         descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Co-Founder y CGO',         descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Analista de Cuentas',      descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Diseño',       descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista Audiovisual',     descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Marketing',    descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Responsable de Comunicación', descripcion: null, ambito_id: amb.organico,
          is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Performance',  descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Desarrollador Fullstack',  descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Frontend',   descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Backend',    descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'QA / Testing',             descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'DevOps / SRE',             descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'RRHH',                     descripcion: 'Capital Humano',             ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Onboarding',               descripcion: 'Ingreso y activación',       ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now }
      ];

      const cli = [
        { nombre: 'Sponsor (Cliente)',            descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Product Owner (Cliente)',      descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Referente Técnico (Cliente)',  descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Usuario Referente (Cliente)',  descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now }
      ];

      await ensureByNombre(queryInterface, 'Cargo', [...org, ...cli], t);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    const nombres = [
      'Líder de Producto','Líder de Tecnología','Líder de Operaciones',
      'Co-Founder y CEO','Co-Founder y CGO',
      'Analista de Cuentas','Analista de Diseño','Analista Audiovisual',
      'Analista de Marketing','Analista de Performance',
      'Desarrollador Fullstack','Desarrollador Frontend','Desarrollador Backend',
      'QA / Testing','DevOps / SRE','RRHH','Onboarding',
      'Sponsor (Cliente)','Product Owner (Cliente)','Referente Técnico (Cliente)','Usuario Referente (Cliente)'
    ];
    await queryInterface.bulkDelete('Cargo', { nombre: nombres }, {});
  }
};
// 20250828001100-0013-chat-catalogs.cjs

'use strict';

module.exports = {
  async up (q) {
    // Tipos de canal
    await q.sequelize.query(`
      INSERT INTO "ChatCanalTipo"(codigo, nombre, created_at, updated_at)
      VALUES
        ('dm','DM', now(), now()),
        ('grupo','Grupo', now(), now()),
        ('canal','Canal', now(), now()),
        ('celula','Célula', now(), now()),
        ('cliente','Cliente', now(), now())
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // Roles de canal
    await q.sequelize.query(`
      INSERT INTO "ChatRolTipo"(codigo, nombre, created_at, updated_at)
      VALUES
        ('owner','Owner', now(), now()),
        ('admin','Admin', now(), now()),
        ('mod','Moderador', now(), now()),
        ('member','Miembro', now(), now()),
        ('guest','Invitado', now(), now())
      ON CONFLICT (codigo) DO NOTHING;
    `);
  },

  async down (q) {
    // En general no se bajan catálogos, pero lo dejamos por si querés limpiar:
    await q.sequelize.query(`DELETE FROM "ChatRolTipo"   WHERE codigo IN ('owner','admin','mod','member','guest');`);
    await q.sequelize.query(`DELETE FROM "ChatCanalTipo" WHERE codigo IN ('dm','grupo','canal','celula','cliente');`);
  }
};
'use strict';

/**
 * 0014-extend-permissions-kanban-all.js
 *
 * - Acciones nuevas:
 *     tareas:     kanban, label, comment, attach, relate
 *     asistencia: checkin, checkout, adjust, close
 * - Crea Permisos (Modulo×Accion) faltantes para esos módulos.
 * - Asignaciones:
 *     • tareas.kanban  -> todos los roles
 *     • tareas.{label,comment,attach,relate} -> roles que ya tengan tareas.create o tareas.update
 *     • asistencia.{checkin,checkout} -> rol "Feder" (si existe)
 *     • asistencia.{adjust,close}     -> rol "RRHH"  (si existe)
 *     • Admin -> todos los permisos nuevos (por si el seed previo no lo cubre)
 */

async function map(qi, table, keyCol = 'codigo', idCol = 'id') {
  const [rows] = await qi.sequelize.query(`SELECT ${idCol} AS id, ${keyCol} AS key FROM "${table}"`);
  return Object.fromEntries(rows.map(r => [r.key, r.id]));
}

async function mapByName(qi, table, nameCol = 'nombre', idCol = 'id') {
  const [rows] = await qi.sequelize.query(`SELECT ${idCol} AS id, ${nameCol} AS key FROM "${table}"`);
  return Object.fromEntries(rows.map(r => [r.key, r.id]));
}

module.exports = {
  async up (qi /*, Sequelize */) {
    const now = new Date();

    // 1) Asegurar acciones faltantes
    const neededActions = [
      // tareas
      'kanban','label','comment','attach','relate',
      // asistencia
      'checkin','checkout','adjust','close'
    ];

    const [haveActsRows] = await qi.sequelize.query(
      `SELECT codigo FROM "Accion" WHERE codigo IN (:codes)`,
      { replacements: { codes: neededActions } }
    );
    const haveActs = new Set(haveActsRows.map(r => r.codigo));
    const missingActs = neededActions
      .filter(c => !haveActs.has(c))
      .map(c => ({ codigo: c, nombre: c, descripcion: null, created_at: now, updated_at: now }));
    if (missingActs.length) {
      await qi.bulkInsert('Accion', missingActs, { ignoreDuplicates: true });
    }

    // maps actualizados
    const modId = await map(qi, 'Modulo', 'codigo', 'id');
    const actId = await map(qi, 'Accion', 'codigo', 'id');
    const roleIdByName = await mapByName(qi, 'Rol', 'nombre', 'id');

    // 2) Crear Permisos (Modulo×Accion) necesarios
    const neededPerms = [
      // tareas
      ['tareas','kanban'],
      ['tareas','label'],
      ['tareas','comment'],
      ['tareas','attach'],
      ['tareas','relate'],
      // asistencia
      ['asistencia','checkin'],
      ['asistencia','checkout'],
      ['asistencia','adjust'],
      ['asistencia','close'],
    ]
    // sólo las que existan ambos extremos (por seguridad)
    .filter(([m,a]) => modId[m] && actId[a])
    .map(([m,a]) => ({
      modulo_id: modId[m],
      accion_id: actId[a],
      nombre: `${m}.${a}`,
      descripcion: null,
      created_at: now,
      updated_at: now
    }));

    if (neededPerms.length) {
      // filtrar existentes
      const pairs = neededPerms.map(p => [p.modulo_id, p.accion_id]);
      const tupleList = pairs.map(() => '(?,?)').join(',');
      const [havePermRows] = await qi.sequelize.query(
        `SELECT modulo_id, accion_id FROM "Permiso"
         WHERE (modulo_id, accion_id) IN (${tupleList})`,
        { replacements: pairs.flat() }
      );
      const haveSet = new Set(havePermRows.map(r => `${r.modulo_id}:${r.accion_id}`));
      const missingPerms = neededPerms.filter(p => !haveSet.has(`${p.modulo_id}:${p.accion_id}`));
      if (missingPerms.length) {
        await qi.bulkInsert('Permiso', missingPerms, { ignoreDuplicates: true });
      }
    }

    // 3) Map de Permiso por clave "mod.act"
    const [permRowsAll] = await qi.sequelize.query(`
      SELECT p.id, m.codigo AS modulo, a.codigo AS accion
      FROM "Permiso" p
      JOIN "Modulo" m ON m.id = p.modulo_id
      JOIN "Accion" a ON a.id = p.accion_id
    `);
    const permIdByKey = {};
    for (const r of permRowsAll) permIdByKey[`${r.modulo}.${r.accion}`] = r.id;

    // 4) Grants a generar
    const grants = [];

    // 4.a) tareas.kanban -> todos los roles
    const pidKanban = permIdByKey['tareas.kanban'];
    if (pidKanban) {
      const [allRoles] = await qi.sequelize.query(`SELECT id FROM "Rol"`);
      for (const r of allRoles) grants.push([r.id, pidKanban]);
    }

    // 4.b) tareas extras -> roles que ya tengan tareas.create o tareas.update
    const tareasExtras = ['label','comment','attach','relate']
      .map(a => permIdByKey[`tareas.${a}`])
      .filter(Boolean);

    if (tareasExtras.length) {
      const [rolesWithCRU] = await qi.sequelize.query(`
        SELECT DISTINCT r.id AS rol_id
        FROM "Rol" r
        JOIN "RolPermiso" rp ON rp.rol_id = r.id
        JOIN "Permiso" p ON p.id = rp.permiso_id
        JOIN "Modulo" m ON m.id = p.modulo_id
        JOIN "Accion" a ON a.id = p.accion_id
        WHERE m.codigo = 'tareas' AND a.codigo IN ('create','update')
      `);
      const roleIds = rolesWithCRU.map(x => x.rol_id);
      for (const rid of roleIds) {
        for (const pid of tareasExtras) grants.push([rid, pid]);
      }
    }

    // 4.c) asistencia: checkin/checkout -> Feder ; adjust/close -> RRHH
    const pidAsisCheckIn  = permIdByKey['asistencia.checkin'];
    const pidAsisCheckOut = permIdByKey['asistencia.checkout'];
    const pidAsisAdjust   = permIdByKey['asistencia.adjust'];
    const pidAsisClose    = permIdByKey['asistencia.close'];

    const ridFeder = roleIdByName['Feder'];
    const ridRRHH  = roleIdByName['RRHH'];
    const ridAdmin = roleIdByName['Admin'];

    if (ridFeder) {
      if (pidAsisCheckIn)  grants.push([ridFeder, pidAsisCheckIn]);
      if (pidAsisCheckOut) grants.push([ridFeder, pidAsisCheckOut]);
    }
    if (ridRRHH) {
      if (pidAsisAdjust) grants.push([ridRRHH, pidAsisAdjust]);
      if (pidAsisClose)  grants.push([ridRRHH,  pidAsisClose]);
    }

    // 4.d) Admin: todos los permisos NUEVOS (tareas + asistencia) por si el seed previo no los tomó
    if (ridAdmin) {
      const newPermKeys = [
        'tareas.kanban','tareas.label','tareas.comment','tareas.attach','tareas.relate',
        'asistencia.checkin','asistencia.checkout','asistencia.adjust','asistencia.close'
      ];
      for (const k of newPermKeys) {
        const pid = permIdByKey[k];
        if (pid) grants.push([ridAdmin, pid]);
      }
    }

    // 5) Insertar grants faltantes en RolPermiso
    if (grants.length) {
      const tuples = grants.map(() => '(?,?)').join(',');
      const [haveRP] = await qi.sequelize.query(
        `SELECT rol_id, permiso_id FROM "RolPermiso"
         WHERE (rol_id, permiso_id) IN (${tuples})`,
        { replacements: grants.flat() }
      );
      const haveSetRP = new Set(haveRP.map(r => `${r.rol_id}:${r.permiso_id}`));
      const missingRP = grants
        .filter(([r,p]) => !haveSetRP.has(`${r}:${p}`))
        .map(([rol_id, permiso_id]) => ({ rol_id, permiso_id, created_at: now }));
      if (missingRP.length) {
        await qi.bulkInsert('RolPermiso', missingRP, { ignoreDuplicates: true });
      }
    }
  },

  async down (/* qi */) {
    // No hacemos down para no romper asignaciones existentes.
    // Si necesitás reversión, podés borrar manualmente de RolPermiso/Permiso/Accion según los códigos añadidos.
  }
};
'use strict';

/**
 * 0015 - Cargos core (idempotente)
 * Actualizado: usa "Desarrollador Fullstack" (en vez de "Desarrollador").
 */

async function ensureAmbitos(queryInterface, t) {
  await queryInterface.sequelize.query(`
    INSERT INTO "CargoAmbito"(codigo, nombre, descripcion, created_at, updated_at)
    VALUES
      ('organico','Orgánico',NULL, now(), now()),
      ('cliente','Cliente',NULL, now(), now())
    ON CONFLICT (codigo) DO NOTHING;
  `, { transaction: t });

  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, codigo FROM "CargoAmbito" WHERE codigo IN ('organico','cliente')`,
    { transaction: t }
  );
  const map = Object.fromEntries(rows.map(r => [r.codigo, r.id]));
  if (!map.organico || !map.cliente) {
    throw new Error('Faltan ámbitos requeridos: organico/cliente');
  }
  return map;
}

async function ensureByNombre(queryInterface, table, rows, t) {
  if (!rows.length) return;
  const nombres = rows.map(r => r.nombre);
  const [exists] = await queryInterface.sequelize.query(
    `SELECT nombre FROM "${table}" WHERE nombre IN (:nombres)`,
    { transaction: t, replacements: { nombres } }
  );
  const have = new Set(exists.map(e => e.nombre));
  const missing = rows.filter(r => !have.has(r.nombre));
  if (missing.length) {
    await queryInterface.bulkInsert(table, missing, { transaction: t });
  }
}

module.exports = {
  async up (queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();
      const amb = await ensureAmbitos(queryInterface, t);

      const org = [
        { nombre: 'Líder de Producto',        descripcion: 'Tridente: Producto',        ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Tecnología',      descripcion: 'Tridente: Tecnología',      ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Líder de Operaciones',     descripcion: 'Tridente: Operaciones',     ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Co-Founder y CEO',         descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Co-Founder y CGO',         descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Analista de Cuentas',      descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Diseño',       descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista Audiovisual',     descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Marketing',    descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Responsable de Comunicación', descripcion: null, ambito_id: amb.organico,
          is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Analista de Performance',  descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'Desarrollador Fullstack',  descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Frontend',   descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Desarrollador Backend',    descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'QA / Testing',             descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'DevOps / SRE',             descripcion: null, ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },

        { nombre: 'RRHH',                     descripcion: 'Capital Humano',             ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Onboarding',               descripcion: 'Ingreso y activación',       ambito_id: amb.organico, is_activo: true, created_at: now, updated_at: now }
      ];

      const cli = [
        { nombre: 'Sponsor (Cliente)',            descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Product Owner (Cliente)',      descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Referente Técnico (Cliente)',  descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now },
        { nombre: 'Usuario Referente (Cliente)',  descripcion: null, ambito_id: amb.cliente, is_activo: true, created_at: now, updated_at: now }
      ];

      await ensureByNombre(queryInterface, 'Cargo', [...org, ...cli], t);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down (queryInterface) {
    const nombres = [
      'Líder de Producto','Líder de Tecnología','Líder de Operaciones',
      'Co-Founder y CEO','Co-Founder y CGO',
      'Analista de Cuentas','Analista de Diseño','Analista Audiovisual',
      'Analista de Marketing','Analista de Performance',
      'Desarrollador Fullstack','Desarrollador Frontend','Desarrollador Backend',
      'QA / Testing','DevOps / SRE','RRHH','Onboarding',
      'Sponsor (Cliente)','Product Owner (Cliente)','Referente Técnico (Cliente)','Usuario Referente (Cliente)'
    ];
    await queryInterface.bulkDelete('Cargo', { nombre: nombres }, {});
  }
};
// backend/db/seeders/0016-equipo-roles-cargos.cjs
'use strict';
const argon2 = require('argon2');
// backend/db/seeders/0016-equipo-roles-cargos.cjs
'use strict';
const argon2 = require('argon2');
const fs = require('fs');
const path = require('path');

/**
 * 0016 - equipo + roles + cargos + chat (idempotente, sin duplicar)
 * - Crea/actualiza usuarios (Nombre123!), roles y cargos por persona (como antes).
 * - Re-vincula por nombre/apellido y borra feders duplicados.
 * - Enzo (y no mapeados en CEL_ASSIGN) queda SIN célula (celula_id=NULL) y se cierran CRAs "miembro".
 * - AGREGA: canales de chat por defecto + membresías + mensaje de bienvenida (pinned).
 * - NUEVO: setea avatar_url si existe archivo en /public/avatars (jpg/png/webp/jpeg).
 */

const PEOPLE = [
  // Tridente Tecnología
  { nombre: 'Enzo',      apellido: 'Pinotti',        cargo: 'Desarrollador Fullstack', email: 'epinotti@fedes.ai',       tri:'tecnologia' },

  // No tridente: sólo célula/roles analistas
  { nombre: 'Andre',     apellido: 'Coronel Vargas', cargo: 'Analista Audiovisual',     email: 'acoronelvargas@fedes.ai' },
  { nombre: 'Mateo',     apellido: 'Germano',        cargo: 'Analista Audiovisual',     email: 'mgermano@fedes.ai'       },
  { nombre: 'Florencia', apellido: 'Marchesotti',    cargo: 'Analista de Diseño',       email: 'fmarchesotti@fedes.ai'   },
  { nombre: 'Gonzalo',   apellido: 'Canibano',       cargo: 'Analista de Cuentas',      email: 'gcanibano@fedes.ai'      },
  { nombre: 'Paola',     apellido: 'López',          cargo: 'Analista de Cuentas',      email: 'plopez@fedes.ai'         },
  { nombre: 'Juan',      apellido: 'Perozo',         cargo: 'Analista de Diseño',       email: 'jperozo@fedes.ai'        },

  // C-level + Tridente
  { nombre: 'Federico',  apellido: 'Chironi',        cargo: 'Co-Founder y CEO',         email: 'fedechironi@fedes.ai',   c_level:true, tri:'tecnologia'  },
  { nombre: 'Federico',  apellido: 'Juan',           cargo: 'Co-Founder y CGO',         email: 'fedejuan@fedes.ai',      c_level:true, tri:'performance' },

  // Tridente Marketing + rol de comunicación (USUARIO CANÓNICO)
  { nombre: 'Romina',    apellido: 'Albanesi',       cargo: 'Responsable de Comunicación', email: 'ralbanesi@fedes.ai',  tri:'marketing' },
];

const ANALYST_ROLE_BY_CARGO = {
  'Analista de Diseño'           : 'AnalistaDiseno',
  'Analista Audiovisual'         : 'AnalistaAudiovisual',
  'Analista de Cuentas'          : 'CuentasAnalista',
  'Responsable de Comunicación'  : 'AnalistaComunicacion',
};

function triToRole(s) {
  if (s === 'tecnologia') return 'TriTecnologia';
  if (s === 'performance') return 'TriPerformance';
  if (s === 'marketing')   return 'TriMarketing';
  return null;
}

// Sólo estos 6 se asignan/aseguran explícitamente de célula
const CEL_ASSIGN = {
  'Mateo|Germano'          : 'celula-1',
  'Paola|López'            : 'celula-1',
  'Florencia|Marchesotti'  : 'celula-1',
  'Andre|Coronel Vargas'   : 'celula-2',
  'Gonzalo|Canibano'       : 'celula-2',
  'Juan|Perozo'            : 'celula-2',
};

// ===== Helpers comunes (password, fechas) =====
const strip = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const todayISO = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0,10);
};
const passFor = (nombre) => `${strip(nombre)}123!`;

// ===== Helper Avatar =====
const AVATAR_EXTS = ['.webp','.jpg','.jpeg','.png'];
const AVATAR_DIR  = path.join(__dirname, '..', '..', 'public', 'avatars'); // backend/public/avatars
const AVATAR_BASE = process.env.AVATAR_BASE_URL || '/avatars';              // opcional CDN/base

const slugify = s =>
  (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function findAvatarUrl(basename) {
  for (const ext of AVATAR_EXTS) {
    const filePath = path.join(AVATAR_DIR, basename + ext);
    if (fs.existsSync(filePath)) return `${AVATAR_BASE}/${basename}${ext}`;
  }
  return null;
}

/**
 * Intenta varias convenciones de nombre de archivo:
 *  - usuario del email (antes de @)
 *  - inicial + último token del apellido (ej: "avargas")
 *  - inicial + apellido completo sin espacios (ej: "acoronelvargas")
 *  - nombre-apellido (slug) (ej: "romina-albanesi")
 */
function resolveFederAvatar({ email, nombre, apellido }) {
  const userPart = (email || '').split('@')[0];              // epinotti
  const firstInitial = (strip(nombre || '').toLowerCase() || 'x')[0];
  const apSlug = slugify(apellido);                           // "coronel-vargas"
  const apNoSpace = apSlug.replace(/-/g, '');                 // "coronelvargas"
  const lastToken = apSlug.split('-').filter(Boolean).pop() || apSlug; // "vargas"

  const candidates = [
    userPart,                                // epinotti, mgermano, ralbanesi...
    `${firstInitial}${lastToken}`,           // avargas, fchironi, fjuan...
    `${firstInitial}${apNoSpace}`,           // acoronelvargas (fallback)
    `${slugify(nombre)}-${apSlug}`           // romina-albanesi
  ].filter(Boolean);

  for (const base of candidates) {
    const url = findAvatarUrl(base);
    if (url) return url;
  }
  return null;
}

module.exports = {
  async up (qi) {
    const t = await qi.sequelize.transaction();
    try {
      const now   = new Date();
      const today = todayISO();

      const one = async (sql, repl={}) =>
        (await qi.sequelize.query(sql, { transaction: t, replacements: repl }))[0][0] || null;

      // === Requisitos base ===
      let dom = await one(`SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`);
      if (!dom) {
        await qi.bulkInsert('AuthEmailDominio', [
          { dominio: 'fedes.ai', is_activo: true, created_at: now, updated_at: now }
        ], { transaction: t });
        dom = await one(`SELECT id FROM "AuthEmailDominio" WHERE dominio='fedes.ai' LIMIT 1`);
      }

      const estFed  = await one(`SELECT id FROM "FederEstadoTipo" WHERE codigo='activo' LIMIT 1`);
      if (!estFed) throw new Error('Falta FederEstadoTipo.activo (0003)');

      // === Asegurar Células 1 y 2 ===
      const [[estCelAct]] = await qi.sequelize.query(
        `SELECT id FROM "CelulaEstado" WHERE codigo='activa' LIMIT 1`, { transaction: t }
      );
      const ensureCelula = async (nombre, slug) => {
        const row = await one(`SELECT id FROM "Celula" WHERE slug=:slug OR nombre=:nombre LIMIT 1`,
          { slug, nombre });
        if (row) return row.id;
        await qi.bulkInsert('Celula', [{
          nombre, slug, estado_id: estCelAct.id,
          descripcion: null, avatar_url: null, cover_url: null, perfil_md: null,
          created_at: now, updated_at: now
        }], { transaction: t });
        const created = await one(`SELECT id FROM "Celula" WHERE slug=:slug LIMIT 1`, { slug });
        return created?.id;
      };
      const cel1Id = await ensureCelula('Célula 1', 'celula-1');
      const cel2Id = await ensureCelula('Célula 2', 'celula-2');
      const celBySlug = { 'celula-1': cel1Id, 'celula-2': cel2Id };

      // RolTipo miembro (para CRA)
      const crtMiembro = await one(`SELECT id FROM "CelulaRolTipo" WHERE codigo='miembro' LIMIT 1`);
      if (!crtMiembro) throw new Error('Falta CelulaRolTipo.miembro (0007)');

      // Roles requeridos
      const [roleRows] = await qi.sequelize.query(
        `SELECT id, nombre FROM "Rol" WHERE nombre IN
         ('Feder','CLevel','TriTecnologia','TriPerformance','TriMarketing',
          'AnalistaDiseno','CuentasAnalista','AnalistaAudiovisual','AnalistaComunicacion')`,
        { transaction: t }
      );
      const rid = Object.fromEntries(roleRows.map(r => [r.nombre, r.id]));

      // Cargos
      const cargoNombres = Array.from(new Set(PEOPLE.map(p => p.cargo)));
      const [cargoRows] = await qi.sequelize.query(
        `SELECT id, nombre FROM "Cargo" WHERE nombre IN (:n)`,
        { transaction: t, replacements: { n: cargoNombres } }
      );
      const cargoId = Object.fromEntries(cargoRows.map(r => [r.nombre, r.id]));
      for (const nm of cargoNombres) {
        if (!cargoId[nm]) throw new Error(`Falta cargo "${nm}" (corré 0015-cargos-core)`);
      }

      // === Users: crear o resetear "Nombre123!" ===
      const baseEmails = ['sistemas@fedes.ai']; // owner de canales y mensajes seed
      const emails = Array.from(new Set([...baseEmails, ...PEOPLE.map(p => p.email)]));
      const [existingUsers] = await qi.sequelize.query(
        `SELECT id, email FROM "User" WHERE email IN (:e)`, { transaction: t, replacements: { e: emails } }
      );
      const uByEmail = Object.fromEntries(existingUsers.map(u => [u.email, u]));

      // crear faltantes
      for (const email of emails) {
        if (!uByEmail[email]) {
          const nombre = email.split('@')[0]; // fallback para Sistemas/otros
          const hash = await argon2.hash(passFor(nombre), {
            type: argon2.argon2id, timeCost: 3, memoryCost: 19456, parallelism: 1
          });
          await qi.bulkInsert('User', [{
            email, password_hash: hash, is_activo: true,
            email_dominio_id: dom.id, created_at: now, updated_at: now
          }], { transaction: t });
        }
      }
      // resetear pass a todos: Nombre123!
      for (const email of emails) {
        const nombre = email === 'sistemas@fedes.ai'
          ? 'Sistemas'
          : (PEOPLE.find(p => p.email === email)?.nombre || email.split('@')[0]);
        const hash = await argon2.hash(passFor(nombre), {
          type: argon2.argon2id, timeCost: 3, memoryCost: 19456, parallelism: 1
        });
        await qi.sequelize.query(
          `UPDATE "User" SET password_hash=:h, updated_at=:now WHERE email=:e`,
          { transaction: t, replacements: { h: hash, now, e: email } }
        );
      }

      // releer users
      const [users] = await qi.sequelize.query(
        `SELECT id, email FROM "User" WHERE email IN (:e)`,
        { transaction: t, replacements: { e: emails } }
      );
      const uid = Object.fromEntries(users.map(u => [u.email, u.id]));
      const sistemasUserId = uid['sistemas@fedes.ai'];

      // === Feders: re-vincular por NOMBRE y desduplicar (con avatar) ===
      const [fRows] = await qi.sequelize.query(
        `SELECT id, user_id, nombre, apellido, celula_id
           FROM "Feder"`,
        { transaction: t }
      );
      const byUser = new Map(fRows.filter(f => f.user_id).map(f => [f.user_id, f]));

      const fedIdByUser = {};
      for (const p of PEOPLE) {
        const user_id = uid[p.email];
        if (!user_id) continue;

        const wantSlug = CEL_ASSIGN[`${p.nombre}|${p.apellido}`];
        const desiredCelId = wantSlug ? celBySlug[wantSlug] : null;
        const avatar_url = resolveFederAvatar(p);

        // A) Todos los feders que tengan ese nombre/apellido → CONSOLIDAR
        const [sameNameRows] = await qi.sequelize.query(`
          SELECT id, user_id FROM "Feder"
          WHERE LOWER(nombre)=LOWER(:n) AND LOWER(apellido)=LOWER(:a)
          ORDER BY id ASC
        `, { transaction: t, replacements: { n: p.nombre, a: p.apellido } });

        if (sameNameRows.length) {
          const keep = sameNameRows[0];

          await qi.sequelize.query(`
            UPDATE "Feder"
               SET user_id   = :u,
                   celula_id = :cel,
                   estado_id = :est,
                   avatar_url = COALESCE(:avatar, avatar_url),
                   is_activo = true,
                   updated_at = :now
             WHERE id = :id
          `, { transaction: t, replacements: { id: keep.id, u: user_id, cel: desiredCelId, est: estFed.id, avatar: avatar_url, now } });

          // borrar duplicados (dejar el primero)
          const idsToDelete = sameNameRows.slice(1).map(r => r.id);
          if (idsToDelete.length) {
            await qi.sequelize.query(`DELETE FROM "Feder" WHERE id = ANY(:ids)`,
              { transaction: t, replacements: { ids: idsToDelete } });
          }

          // Sanear: si existía otro feder linkeado a este user, eliminarlo
          await qi.sequelize.query(`
            DELETE FROM "Feder" WHERE user_id=:u AND id<>:keep
          `, { transaction: t, replacements: { u: user_id, keep: keep.id } });

          fedIdByUser[user_id] = keep.id;
          continue;
        }

        // B) Si ya existe por user → sincronizar célula y backfill de avatar (sin pisar si ya hay)
        if (byUser.has(user_id)) {
          const f = byUser.get(user_id);
          fedIdByUser[user_id] = f.id;
          await qi.sequelize.query(
            `UPDATE "Feder"
                SET celula_id = :cel,
                    avatar_url = COALESCE(:avatar, avatar_url),
                    updated_at = :now
              WHERE id = :id`,
            { transaction: t, replacements: { id: f.id, cel: desiredCelId, avatar: avatar_url, now } }
          );
          continue;
        }

        // C) Crear feder nuevo (célula si corresponde, si no → NULL) con avatar
        const [ins] = await qi.bulkInsert('Feder', [{
          user_id, celula_id: desiredCelId, estado_id: estFed.id,
          nombre: p.nombre || '—', apellido: p.apellido || '—',
          avatar_url,
          is_activo: true, fecha_ingreso: today, created_at: now, updated_at: now
        }], { transaction: t, returning: true });

        let fid = ins?.id;
        if (!fid) {
          const [[row]] = await qi.sequelize.query(
            `SELECT id FROM "Feder" WHERE user_id=:u ORDER BY id DESC LIMIT 1`,
            { transaction: t, replacements: { u: user_id } }
          );
          fid = row?.id;
        }
        fedIdByUser[user_id] = fid;
      }

      // === Roles para cada persona ===
      const [urPairs] = await qi.sequelize.query(
        `SELECT user_id, rol_id FROM "UserRol" WHERE user_id IN (:ids)`,
        { transaction: t, replacements: { ids: Object.values(uid) } }
      );
      const have = new Set(urPairs.map(r => `${r.user_id}:${r.rol_id}`));
      const toUR = [];
      for (const p of PEOPLE) {
        const u = uid[p.email]; if (!u) continue;
        const roles = new Set(['Feder']);
        if (p.c_level) roles.add('CLevel');
        const triRole = triToRole(p.tri); if (triRole) roles.add(triRole);
        const analyst = ANALYST_ROLE_BY_CARGO[p.cargo]; if (analyst) roles.add(analyst);

        for (const rname of roles) {
          const rid_ = rid[rname]; if (!rid_) continue;
          const k = `${u}:${rid_}`;
          if (!have.has(k)) { have.add(k); toUR.push({ user_id: u, rol_id: rid_, created_at: now }); }
        }
      }
      if (toUR.length) await qi.bulkInsert('UserRol', toUR, { transaction: t });

      // === Cargo principal por feder (upsert suave) ===
      const [actives] = await qi.sequelize.query(
        `SELECT feder_id, cargo_id, es_principal FROM "FederCargo"
          WHERE feder_id IN (SELECT id FROM "Feder" WHERE user_id IN (:ids))
            AND hasta IS NULL`,
        { transaction: t, replacements: { ids: Object.values(uid) } }
      );
      const activeByFeder = new Map();
      for (const r of actives) {
        if (!activeByFeder.has(r.feder_id)) activeByFeder.set(r.feder_id, []);
        activeByFeder.get(r.feder_id).push(r);
      }
      const toFC = [];
      for (const p of PEOPLE) {
        const u = uid[p.email]; const fid = fedIdByUser[u]; if (!fid) continue;
        const cId = cargoId[p.cargo]; if (!cId) continue;

        const current = activeByFeder.get(fid) || [];
        const alreadySame = current.some(r => r.cargo_id === cId);
        if (alreadySame) continue;

        const hadPrincipal = current.some(r => r.es_principal);
        if (hadPrincipal) {
          await qi.sequelize.query(`
            UPDATE "FederCargo" SET es_principal=false
            WHERE feder_id=:fid AND es_principal=true AND hasta IS NULL
          `, { transaction: t, replacements: { fid } });
        }
        toFC.push({
          feder_id: fid, cargo_id: cId, es_principal: true,
          desde: today, hasta: null, observacion: null,
          created_at: now
        });
      }
      if (toFC.length) await qi.bulkInsert('FederCargo', toFC, { transaction: t });

      // === Miembros por célula (CRA) SOLO para los 6 mapeados ===
      for (const p of PEOPLE) {
        const wantSlug = CEL_ASSIGN[`${p.nombre}|${p.apellido}`];
        if (!wantSlug) continue;
        const u = uid[p.email]; const [[fidRow]] = await qi.sequelize.query(
          `SELECT id FROM "Feder" WHERE user_id=:u LIMIT 1`,
          { transaction: t, replacements: { u } }
        );
        const fid = fidRow?.id;
        if (!fid) continue;
        const celId = celBySlug[wantSlug];

        await qi.sequelize.query(`
          UPDATE "CelulaRolAsignacion"
             SET hasta = :today, updated_at = :now
           WHERE feder_id = :fid
             AND rol_tipo_id = :rt
             AND (hasta IS NULL OR hasta > :today)
             AND celula_id <> :cel
        `, { transaction: t, replacements: { fid, rt: crtMiembro.id, today, now, cel: celId } });

        const [[exists]] = await qi.sequelize.query(`
          SELECT id FROM "CelulaRolAsignacion"
          WHERE feder_id = :fid AND rol_tipo_id = :rt AND celula_id = :cel
            AND (hasta IS NULL OR hasta >= :today)
          ORDER BY desde DESC, id DESC
          LIMIT 1
        `, { transaction: t, replacements: { fid, rt: crtMiembro.id, cel: celId, today } });

        if (exists?.id) {
          await qi.sequelize.query(`
            UPDATE "CelulaRolAsignacion"
               SET es_principal = true, updated_at = :now
             WHERE id = :id
          `, { transaction: t, replacements: { id: exists.id, now } });
        } else {
          await qi.bulkInsert('CelulaRolAsignacion', [{
            celula_id: celId, feder_id: fid, rol_tipo_id: crtMiembro.id,
            desde: today, hasta: null, es_principal: true, observacion: null,
            created_at: now, updated_at: now
          }], { transaction: t });
        }
      }

      // === Cerrar CRAs de miembro para NO mapeados (ej: Enzo, Romina)
      for (const p of PEOPLE) {
        if (CEL_ASSIGN[`${p.nombre}|${p.apellido}`]) continue;
        const u = uid[p.email]; const [[fidRow]] = await qi.sequelize.query(
          `SELECT id FROM "Feder" WHERE user_id=:u LIMIT 1`,
          { transaction: t, replacements: { u } }
        );
        const fid = fidRow?.id;
        if (!fid) continue;
        await qi.sequelize.query(`
          UPDATE "CelulaRolAsignacion"
             SET hasta = :today, updated_at = :now
           WHERE feder_id = :fid
             AND rol_tipo_id = :rt
             AND (hasta IS NULL OR hasta > :today)
        `, { transaction: t, replacements: { fid, rt: crtMiembro.id, today, now } });
      }

      // ==================================================================================
      // === CHAT: canales y bienvenida ===================================================
      // ==================================================================================
      // Requisitos
      const [[ctCanal]]   = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='canal'  LIMIT 1`, { transaction: t });
      const [[ctCelula]]  = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='celula' LIMIT 1`, { transaction: t });
      const [[ctCliente]] = await qi.sequelize.query(`SELECT id FROM "ChatCanalTipo" WHERE codigo='cliente' LIMIT 1`, { transaction: t });
      const [[rtOwner]]   = await qi.sequelize.query(`SELECT id FROM "ChatRolTipo"   WHERE codigo='owner'  LIMIT 1`, { transaction: t });
      const [[rtMember]]  = await qi.sequelize.query(`SELECT id FROM "ChatRolTipo"   WHERE codigo='member' LIMIT 1`, { transaction: t });

      if (!ctCanal?.id || !rtOwner?.id || !rtMember?.id) {
        throw new Error('Faltan catálogos de chat (0013-chat-catalogs).');
      }
      if (!sistemasUserId) throw new Error('Falta usuario sistemas@fedes.ai (0005).');

      async function ensureChannel({ tipo_id, slug, nombre, topic=null, is_privado=false, only_mods_can_post=false, slowmode_seconds=0, celula_id=null, cliente_id=null }) {
        const [[exists]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanal" WHERE slug=:slug LIMIT 1`,
          { transaction: t, replacements: { slug } }
        );
        if (exists?.id) return exists.id;

        await qi.bulkInsert('ChatCanal', [{
          tipo_id, slug, nombre, topic,
          descripcion: null,
          is_privado, is_archivado: false,
          only_mods_can_post, slowmode_seconds,
          celula_id, cliente_id,
          created_by_user_id: sistemasUserId,
          created_at: now, updated_at: now
        }], { transaction: t });

        const [[row]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanal" WHERE slug=:slug LIMIT 1`,
          { transaction: t, replacements: { slug } }
        );
        return row?.id;
      }

      async function ensureMember(canal_id, user_id, rol_id) {
        const [[ex]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanalMiembro" WHERE canal_id=:c AND user_id=:u LIMIT 1`,
          { transaction: t, replacements: { c: canal_id, u: user_id } }
        );
        if (ex?.id) return ex.id;
        await qi.bulkInsert('ChatCanalMiembro', [{
          canal_id, user_id, rol_id,
          is_mute: false, notif_level: 'all',
          joined_at: now
        }], { transaction: t });
        const [[row]] = await qi.sequelize.query(
          `SELECT id FROM "ChatCanalMiembro" WHERE canal_id=:c AND user_id=:u LIMIT 1`,
          { transaction: t, replacements: { c: canal_id, u: user_id } }
        );
        return row?.id;
      }

      async function ensureWelcomeMessage(canal_id, text) {
        const [[existsMsg]] = await qi.sequelize.query(
          `SELECT id FROM "ChatMensaje"
           WHERE canal_id=:c AND body_json->>'seed'='welcome'
           LIMIT 1`,
          { transaction: t, replacements: { c: canal_id } }
        );
        let msgId = existsMsg?.id;
        if (!msgId) {
          await qi.bulkInsert('ChatMensaje', [{
            canal_id, user_id: sistemasUserId, feder_id: null,
            parent_id: null, client_msg_id: null,
            body_text: text,
            body_json: JSON.stringify({ seed: 'welcome' }),
            is_edited: false, edited_at: null, deleted_at: null, deleted_by_user_id: null,
            reply_count: 0, last_reply_at: null,
            created_at: now, updated_at: now
          }], { transaction: t });
          const [[row]] = await qi.sequelize.query(
            `SELECT id FROM "ChatMensaje"
             WHERE canal_id=:c AND body_json->>'seed'='welcome'
             ORDER BY id DESC LIMIT 1`,
            { transaction: t, replacements: { c: canal_id } }
          );
          msgId = row?.id;
        }

        // Pin (orden al final)
        const [[pinExists]] = await qi.sequelize.query(
          `SELECT id FROM "ChatPin" WHERE canal_id=:c AND mensaje_id=:m LIMIT 1`,
          { transaction: t, replacements: { c: canal_id, m: msgId } }
        );
        if (!pinExists?.id) {
          const [[maxRow]] = await qi.sequelize.query(
            `SELECT COALESCE(MAX(pin_orden),0) AS maxo FROM "ChatPin" WHERE canal_id=:c`,
            { transaction: t, replacements: { c: canal_id } }
          );
          const orden = (maxRow?.maxo || 0) + 1;
          await qi.bulkInsert('ChatPin', [{
            canal_id, mensaje_id: msgId, pinned_by_user_id: sistemasUserId, pin_orden: orden, pinned_at: now
          }], { transaction: t });
        }
      }

      // ---- Canales base ----
      const canalesDef = [
        { slug: 'general',  nombre: '#general',  tipo_id: ctCanal.id, topic: 'Bienvenidos al chat general de FedesHub', is_privado: false, only_mods_can_post: false },
        { slug: 'anuncios', nombre: '#anuncios', tipo_id: ctCanal.id, topic: 'Anuncios internos (solo staff publica)',   is_privado: false, only_mods_can_post: true },
      ];
      const canalIds = {};
      for (const c of canalesDef) {
        canalIds[c.slug] = await ensureChannel(c);
      }

      // Canales por célula (si existen cel1/cel2)
      if (cel1Id) canalIds['celula-1'] = await ensureChannel({
        slug: 'celula-1', nombre: '#celula-1', tipo_id: ctCelula.id,
        topic: 'Canal de la Célula 1', is_privado: false, only_mods_can_post: false, celula_id: cel1Id
      });
      if (cel2Id) canalIds['celula-2'] = await ensureChannel({
        slug: 'celula-2', nombre: '#celula-2', tipo_id: ctCelula.id,
        topic: 'Canal de la Célula 2', is_privado: false, only_mods_can_post: false, celula_id: cel2Id
      });

      // Canal para Cliente Demo (si existe)
      const [[clienteDemo]] = await qi.sequelize.query(
        `SELECT id FROM "Cliente" WHERE nombre='Cliente Demo' LIMIT 1`, { transaction: t }
      );
      if (clienteDemo?.id && ctCliente?.id) {
        canalIds['cliente-demo'] = await ensureChannel({
          slug: 'cliente-demo', nombre: '#cliente-demo', tipo_id: ctCliente.id,
          topic: 'Canal del Cliente Demo', is_privado: false, only_mods_can_post: false, cliente_id: clienteDemo.id
        });
      }

      // ---- Miembros ----
      // Owner: Sistemas
      for (const slug of Object.keys(canalIds)) {
        await ensureMember(canalIds[slug], sistemasUserId, rtOwner.id);
      }

      // Todos los usuarios del seeder a #general y #anuncios
      const audienceUserIds = Object.values(uid).filter(Boolean);
      for (const slug of ['general','anuncios']) {
        const cid = canalIds[slug];
        if (!cid) continue;
        for (const u of audienceUserIds) {
          await ensureMember(cid, u, rtMember.id);
        }
      }

      // Miembros por célula
      // Tomamos primero CRA principal; fallback por Feder.celula_id
      async function federUserIdsByCelula(celulaId) {
        const [cra] = await qi.sequelize.query(`
          SELECT f.user_id
          FROM "CelulaRolAsignacion" cra
          JOIN "Feder" f ON f.id = cra.feder_id
          WHERE cra.celula_id=:cel AND cra.es_principal=true AND (cra.hasta IS NULL OR cra.hasta >= :today)
        `, { transaction: t, replacements: { cel: celulaId, today } });
        let ids = cra.map(r => r.user_id).filter(Boolean);
        if (!ids.length) {
          const [ff] = await qi.sequelize.query(`
            SELECT user_id FROM "Feder" WHERE celula_id=:cel
          `, { transaction: t, replacements: { cel: celulaId } });
          ids = ff.map(r => r.user_id).filter(Boolean);
        }
        return Array.from(new Set(ids));
      }

      if (canalIds['celula-1'] && cel1Id) {
        for (const u of await federUserIdsByCelula(cel1Id)) {
          await ensureMember(canalIds['celula-1'], u, rtMember.id);
        }
      }
      if (canalIds['celula-2'] && cel2Id) {
        for (const u of await federUserIdsByCelula(cel2Id)) {
          await ensureMember(canalIds['celula-2'], u, rtMember.id);
        }
      }

      // Cliente Demo: invitar miembros de Célula 1 (si canal existe)
      if (canalIds['cliente-demo'] && cel1Id) {
        for (const u of await federUserIdsByCelula(cel1Id)) {
          await ensureMember(canalIds['cliente-demo'], u, rtMember.id);
        }
      }

      // ---- Mensajes de bienvenida (pinned) ----
      await ensureWelcomeMessage(canalIds['general'],  '👋 ¡Bienvenidos a #general! Usen este canal para discusiones transversales.');
      await ensureWelcomeMessage(canalIds['anuncios'], '📣 Canal de anuncios internos. Sólo el staff puede publicar aquí.');
      if (canalIds['celula-1']) {
        await ensureWelcomeMessage(canalIds['celula-1'], '👥 Bienvenidos a #celula-1. Canal operativo de la célula.');
      }
      if (canalIds['celula-2']) {
        await ensureWelcomeMessage(canalIds['celula-2'], '👥 Bienvenidos a #celula-2. Canal operativo de la célula.');
      }
      if (canalIds['cliente-demo']) {
        await ensureWelcomeMessage(canalIds['cliente-demo'], '🤝 Canal del Cliente Demo. Coordinación, materiales y enlaces.');
      }

      // ==================================================================================
      // === FIN CHAT =====================================================================
      // ==================================================================================

      await t.commit();
    } catch (e) { await t.rollback(); throw e; }
  },

  async down (qi) {
    // Limpia sólo roles asignados en este seeder (no borra usuarios ni feders)
    const emails = PEOPLE.map(p => p.email);
    const t = await qi.sequelize.transaction();
    try {
      const [users] = await qi.sequelize.query(
        `SELECT id FROM "User" WHERE email IN (:e)`, { transaction: t, replacements: { e: emails } }
      );
      const uids = users.map(u => u.id);
      if (uids.length) {
        await qi.sequelize.query(
          `DELETE FROM "UserRol" WHERE user_id = ANY(:ids)`,
          { transaction: t, replacements: { ids: uids } }
        );
      }
      // No borramos canales ni mensajes (datos de trabajo)
      await t.commit();
    } catch (e) { await t.rollback(); throw e; }
  }
};
