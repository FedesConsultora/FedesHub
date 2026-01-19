// backend/src/models/associations.js
export const setupAssociations = (m) => {
  // Activa logs verbosos si LOG_ASSOC=1 (por defecto encendido para depurar)
  const VERBOSE = (process.env.LOG_ASSOC ?? '1') === '1';
  const ok = (...a) => { if (VERBOSE) console.log(...a); };
  const skip = (...a) => { if (VERBOSE) console.warn(...a); };
  const err = (...a) => { console.error(...a); };

  const link = (present, desc, fn) => {
    if (!present) { skip('[assoc:skip]', desc); return; }
    try {
      fn();
    } catch (e) {
      err('[assoc:err] ', desc, e?.stack || e);
      throw e;
    }
  };

  // ===== Módulo 1: Auth =====
  link(m.User && m.AuthEmailDominio, 'User → AuthEmailDominio (email_dominio_id)', () =>
    m.User.belongsTo(m.AuthEmailDominio, { foreignKey: 'email_dominio_id', as: 'emailDominio' })
  );

  link(m.User && m.Rol && m.UserRol, 'User ↔ Rol (UserRol)', () => {
    m.User.belongsToMany(m.Rol, { through: m.UserRol, foreignKey: 'user_id', otherKey: 'rol_id', as: 'roles' });
    m.Rol.belongsToMany(m.User, { through: m.UserRol, foreignKey: 'rol_id', otherKey: 'user_id', as: 'users' });
  });

  link(m.Rol && m.RolTipo, 'Rol → RolTipo (rol_tipo_id)', () =>
    m.Rol.belongsTo(m.RolTipo, { foreignKey: 'rol_tipo_id', as: 'tipo' })
  );

  link(m.Permiso && m.Modulo, 'Permiso → Modulo (modulo_id)', () =>
    m.Permiso.belongsTo(m.Modulo, { foreignKey: 'modulo_id', as: 'modulo' })
  );
  link(m.Permiso && m.Accion, 'Permiso → Accion (accion_id)', () =>
    m.Permiso.belongsTo(m.Accion, { foreignKey: 'accion_id', as: 'accion' })
  );

  link(m.Rol && m.Permiso && m.RolPermiso, 'Rol ↔ Permiso (RolPermiso)', () => {
    m.Rol.belongsToMany(m.Permiso, { through: m.RolPermiso, foreignKey: 'rol_id', otherKey: 'permiso_id', as: 'permisos' });
    m.Permiso.belongsToMany(m.Rol, { through: m.RolPermiso, foreignKey: 'permiso_id', otherKey: 'rol_id', as: 'roles' });
  });

  link(m.JwtRevocacion && m.User, 'JwtRevocacion → User (user_id)', () =>
    m.JwtRevocacion.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  // ===== Módulo 2: Cargos =====
  link(m.Cargo && m.CargoAmbito, 'Cargo → CargoAmbito (ambito_id)', () =>
    m.Cargo.belongsTo(m.CargoAmbito, { foreignKey: 'ambito_id', as: 'ambito' })
  );

  link(m.Feder && m.Cargo && m.FederCargo, 'Feder ↔ Cargo (FederCargo)', () => {
    m.Feder.belongsToMany(m.Cargo, { through: m.FederCargo, foreignKey: 'feder_id', otherKey: 'cargo_id', as: 'cargos' });
    m.Cargo.belongsToMany(m.Feder, { through: m.FederCargo, foreignKey: 'cargo_id', otherKey: 'feder_id', as: 'feders' });
  });

  // ===== Módulo 3: Feders =====
  link(m.Feder && m.User, 'Feder → User (user_id)', () =>
    m.Feder.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.User && m.Feder, 'User → Feder (user_id)', () =>
    m.User.hasOne(m.Feder, { foreignKey: 'user_id', as: 'feder' })
  );
  /* celula association removed */
  link(m.Feder && m.FederEstadoTipo, 'Feder → FederEstadoTipo (estado_id)', () =>
    m.Feder.belongsTo(m.FederEstadoTipo, { foreignKey: 'estado_id', as: 'estado' })
  );
  link(m.FederModalidadDia && m.Feder, 'FederModalidadDia → Feder (feder_id)', () =>
    m.FederModalidadDia.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );
  link(m.FederModalidadDia && m.DiaSemana, 'FederModalidadDia → DiaSemana (dia_semana_id)', () =>
    m.FederModalidadDia.belongsTo(m.DiaSemana, { foreignKey: 'dia_semana_id', as: 'diaSemana' })
  );
  link(m.FederModalidadDia && m.ModalidadTrabajoTipo, 'FederModalidadDia → ModalidadTrabajoTipo (modalidad_id)', () =>
    m.FederModalidadDia.belongsTo(m.ModalidadTrabajoTipo, { foreignKey: 'modalidad_id', as: 'modalidad' })
  );

  link(m.Feder && m.FirmaPerfil, 'Feder ↔ FirmaPerfil (hasOne)', () => {
    m.Feder.hasOne(m.FirmaPerfil, { foreignKey: 'feder_id', as: 'firmaPerfil' });
    m.FirmaPerfil.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  });

  link(m.Feder && m.FederBanco, 'Feder ↔ FederBanco (hasMany)', () => {
    m.Feder.hasMany(m.FederBanco, { foreignKey: 'feder_id', as: 'bancos' });
    m.FederBanco.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  });
  link(m.Feder && m.FederEmergencia, 'Feder ↔ FederEmergencia (hasMany)', () => {
    m.Feder.hasMany(m.FederEmergencia, { foreignKey: 'feder_id', as: 'contactosEmergencia' });
    m.FederEmergencia.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  });

  // ===== Módulo 4: Asistencia =====
  link(m.AsistenciaRegistro && m.Feder, 'AsistenciaRegistro → Feder (feder_id)', () =>
    m.AsistenciaRegistro.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );
  link(m.AsistenciaRegistro && m.AsistenciaOrigenTipo, 'AsistenciaRegistro → OrigenTipo (check_in/out)', () => {
    m.AsistenciaRegistro.belongsTo(m.AsistenciaOrigenTipo, { foreignKey: 'check_in_origen_id', as: 'checkInOrigen' });
    m.AsistenciaRegistro.belongsTo(m.AsistenciaOrigenTipo, { foreignKey: 'check_out_origen_id', as: 'checkOutOrigen' });
  });
  link(m.AsistenciaRegistro && m.AsistenciaCierreMotivoTipo, 'AsistenciaRegistro → CierreMotivo (cierre_motivo_id)', () =>
    m.AsistenciaRegistro.belongsTo(m.AsistenciaCierreMotivoTipo, { foreignKey: 'cierre_motivo_id', as: 'cierreMotivo' })
  );
  link(m.AsistenciaRegistro && m.ModalidadTrabajoTipo, 'AsistenciaRegistro → ModalidadTrabajoTipo (modalidad_id)', () =>
    m.AsistenciaRegistro.belongsTo(m.ModalidadTrabajoTipo, { foreignKey: 'modalidad_id', as: 'modalidad' })
  );

  // ===== Módulo 5: Ausencias =====
  link(m.Ausencia && m.Feder, 'Ausencia → Feder (feder_id)', () =>
    m.Ausencia.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );
  link(m.Ausencia && m.AusenciaTipo, 'Ausencia → AusenciaTipo (tipo_id)', () =>
    m.Ausencia.belongsTo(m.AusenciaTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.Ausencia && m.AusenciaEstado, 'Ausencia → AusenciaEstado (estado_id)', () =>
    m.Ausencia.belongsTo(m.AusenciaEstado, { foreignKey: 'estado_id', as: 'estado' })
  );
  link(m.Ausencia && m.MitadDiaTipo, 'Ausencia → MitadDiaTipo (mitad_dia_id)', () =>
    m.Ausencia.belongsTo(m.MitadDiaTipo, { foreignKey: 'mitad_dia_id', as: 'mitadDia' })
  );
  link(m.Ausencia && m.User, 'Ausencia → User (aprobado_por_user_id)', () =>
    m.Ausencia.belongsTo(m.User, { foreignKey: 'aprobado_por_user_id', as: 'aprobadoPor' })
  );

  link(m.AusenciaTipo && m.AusenciaUnidadTipo, 'AusenciaTipo → AusenciaUnidadTipo (unidad_id)', () =>
    m.AusenciaTipo.belongsTo(m.AusenciaUnidadTipo, { foreignKey: 'unidad_id', as: 'unidad' })
  );

  link(m.AusenciaCuota, 'AusenciaCuota → varias', () => {
    if (m.Feder) m.AusenciaCuota.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
    if (m.AusenciaTipo) m.AusenciaCuota.belongsTo(m.AusenciaTipo, { foreignKey: 'tipo_id', as: 'tipo' });
    if (m.AusenciaUnidadTipo) m.AusenciaCuota.belongsTo(m.AusenciaUnidadTipo, { foreignKey: 'unidad_id', as: 'unidad' });
    if (m.User) m.AusenciaCuota.belongsTo(m.User, { foreignKey: 'asignado_por_user_id', as: 'asignadoPor' });
  });
  link(m.AusenciaCuotaConsumo, 'AusenciaCuotaConsumo → (cuota, ausencia)', () => {
    if (m.AusenciaCuota) m.AusenciaCuotaConsumo.belongsTo(m.AusenciaCuota, { foreignKey: 'cuota_id', as: 'cuota' });
    if (m.Ausencia) m.AusenciaCuotaConsumo.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' });
  });
  link(m.AusenciaAsignacionSolicitud, 'AusenciaAsignacionSolicitud → varias', () => {
    if (m.Feder) m.AusenciaAsignacionSolicitud.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
    if (m.AusenciaTipo) m.AusenciaAsignacionSolicitud.belongsTo(m.AusenciaTipo, { foreignKey: 'tipo_id', as: 'tipo' });
    if (m.AusenciaUnidadTipo) m.AusenciaAsignacionSolicitud.belongsTo(m.AusenciaUnidadTipo, { foreignKey: 'unidad_id', as: 'unidad' });
    if (m.AsignacionSolicitudEstado) m.AusenciaAsignacionSolicitud.belongsTo(m.AsignacionSolicitudEstado, { foreignKey: 'estado_id', as: 'estado' });
    if (m.User) m.AusenciaAsignacionSolicitud.belongsTo(m.User, { foreignKey: 'aprobado_por_user_id', as: 'aprobadoPor' });
  });

  /* celula associations removed */

  // ===== Módulo 7: Clientes =====
  /* celula association removed */
  link(m.Cliente && m.ClienteTipo, 'Cliente → ClienteTipo (tipo_id)', () =>
    m.Cliente.belongsTo(m.ClienteTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.Cliente && m.ClienteEstado, 'Cliente → ClienteEstado (estado_id)', () =>
    m.Cliente.belongsTo(m.ClienteEstado, { foreignKey: 'estado_id', as: 'estado' })
  );
  link(m.Cliente && m.ClienteContacto, 'Cliente ↔ ClienteContacto', () => {
    m.Cliente.hasMany(m.ClienteContacto, { foreignKey: 'cliente_id', as: 'contactos' });
    m.ClienteContacto.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  });
  link(m.ClienteHito && m.Cliente, 'ClienteHito ↔ Cliente', () => {
    m.ClienteHito.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
    m.Cliente.hasMany(m.ClienteHito, { foreignKey: 'cliente_id', as: 'hitos' });
  });

  // ===== Módulo 8: Tareas =====
  link(m.Tarea && m.Cliente, 'Tarea → Cliente (cliente_id)', () =>
    m.Tarea.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' })
  );
  link(m.Tarea && m.ComercialLead, 'Tarea → ComercialLead (lead_id)', () =>
    m.Tarea.belongsTo(m.ComercialLead, { foreignKey: 'lead_id', as: 'lead' })
  );
  link(m.Tarea && m.ClienteHito, 'Tarea → ClienteHito (hito_id)', () =>
    m.Tarea.belongsTo(m.ClienteHito, { foreignKey: 'hito_id', as: 'hito' })
  );
  link(m.Tarea, 'Tarea ↔ Tarea (self)', () => {
    m.Tarea.belongsTo(m.Tarea, { foreignKey: 'tarea_padre_id', as: 'tareaPadre' });
    m.Tarea.hasMany(m.Tarea, { foreignKey: 'tarea_padre_id', as: 'subtareas' });
  });
  link(m.Tarea && m.TareaEstado, 'Tarea → TareaEstado (estado_id)', () =>
    m.Tarea.belongsTo(m.TareaEstado, { foreignKey: 'estado_id', as: 'estado' })
  );
  link(m.Tarea && m.Feder, 'Tarea → Feder (creado_por_feder_id)', () =>
    m.Tarea.belongsTo(m.Feder, { foreignKey: 'creado_por_feder_id', as: 'creadoPor' })
  );
  link(m.Tarea && m.TareaAprobacionEstado, 'Tarea → TareaAprobacionEstado (aprobacion_estado_id)', () =>
    m.Tarea.belongsTo(m.TareaAprobacionEstado, { foreignKey: 'aprobacion_estado_id', as: 'aprobacionEstado' })
  );
  link(m.Tarea && m.User, 'Tarea → User (aprobado_por/rechazado_por)', () => {
    m.Tarea.belongsTo(m.User, { foreignKey: 'aprobado_por_user_id', as: 'aprobadoPor' });
    m.Tarea.belongsTo(m.User, { foreignKey: 'rechazado_por_user_id', as: 'rechazadoPor' });
  });
  link(m.Tarea && m.ImpactoTipo, 'Tarea → ImpactoTipo (impacto_id)', () =>
    m.Tarea.belongsTo(m.ImpactoTipo, { foreignKey: 'impacto_id', as: 'impacto' })
  );
  link(m.Tarea && m.UrgenciaTipo, 'Tarea → UrgenciaTipo (urgencia_id)', () =>
    m.Tarea.belongsTo(m.UrgenciaTipo, { foreignKey: 'urgencia_id', as: 'urgencia' })
  );

  // Recordatorios de tarea
  link(m.TareaRecordatorio && m.Tarea, 'TareaRecordatorio → Tarea', () => {
    m.TareaRecordatorio.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
    m.Tarea.hasMany(m.TareaRecordatorio, { foreignKey: 'tarea_id', as: 'recordatorios' });
  });
  link(m.TareaRecordatorio && m.User, 'TareaRecordatorio → User', () => {
    m.TareaRecordatorio.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });
    m.User.hasMany(m.TareaRecordatorio, { foreignKey: 'user_id', as: 'recordatorios' });
  });

  link(m.Tarea && m.TareaResponsable && m.Feder, 'Tarea ↔ Feder (Responsables)', () => {
    m.Tarea.belongsToMany(m.Feder, { as: 'Responsables', through: m.TareaResponsable, foreignKey: 'tarea_id', otherKey: 'feder_id' });
    m.Feder.belongsToMany(m.Tarea, { as: 'TareasResponsable', through: m.TareaResponsable, foreignKey: 'feder_id', otherKey: 'tarea_id' });
  });
  link(m.Tarea && m.TareaColaborador && m.Feder, 'Tarea ↔ Feder (Colaboradores)', () => {
    m.Tarea.belongsToMany(m.Feder, { as: 'Colaboradores', through: m.TareaColaborador, foreignKey: 'tarea_id', otherKey: 'feder_id' });
    m.Feder.belongsToMany(m.Tarea, { as: 'TareasColaborador', through: m.TareaColaborador, foreignKey: 'feder_id', otherKey: 'tarea_id' });
  });

  link(m.Tarea && m.TareaComentario, 'Tarea ↔ TareaComentario', () => {
    m.Tarea.hasMany(m.TareaComentario, { foreignKey: 'tarea_id', as: 'comentarios' });
    m.TareaComentario.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  });
  link(m.TareaComentario && m.Feder, 'TareaComentario → Feder (feder_id)', () =>
    m.TareaComentario.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'autor' })
  );
  link(m.TareaComentario && m.ComentarioTipo, 'TareaComentario → ComentarioTipo (tipo_id)', () =>
    m.TareaComentario.belongsTo(m.ComentarioTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.TareaComentarioMencion, 'TareaComentarioMencion → (comentario, feder)', () => {
    if (m.TareaComentario) m.TareaComentarioMencion.belongsTo(m.TareaComentario, { foreignKey: 'comentario_id', as: 'comentario' });
    if (m.Feder) m.TareaComentarioMencion.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'mencionado' });
  });

  link(m.TareaComentarioReaccion && m.TareaComentario, 'TareaComentarioReaccion ↔ TareaComentario', () => {
    m.TareaComentarioReaccion.belongsTo(m.TareaComentario, { foreignKey: 'comentario_id', as: 'comentario' });
    m.TareaComentario.hasMany(m.TareaComentarioReaccion, { foreignKey: 'comentario_id', as: 'reacciones' });
  });

  link(m.TareaComentarioReaccion && m.User, 'TareaComentarioReaccion → User (user_id)', () =>
    m.TareaComentarioReaccion.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  link(m.TareaAdjunto, 'TareaAdjunto → (tarea, comentario, feder)', () => {
    if (m.Tarea) m.TareaAdjunto.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
    if (m.TareaComentario) m.TareaAdjunto.belongsTo(m.TareaComentario, { foreignKey: 'comentario_id', as: 'comentario' });
    if (m.Feder) m.TareaAdjunto.belongsTo(m.Feder, { foreignKey: 'subido_por_feder_id', as: 'subidoPor' });
  });

  link(m.TareaEtiqueta && m.TareaEtiquetaAsig, 'Tarea ↔ TareaEtiqueta (TareaEtiquetaAsig)', () => {
    if (m.Tarea) m.Tarea.belongsToMany(m.TareaEtiqueta, { through: m.TareaEtiquetaAsig, foreignKey: 'tarea_id', otherKey: 'etiqueta_id', as: 'etiquetas' });
    m.TareaEtiqueta.belongsToMany(m.Tarea, { through: m.TareaEtiquetaAsig, foreignKey: 'etiqueta_id', otherKey: 'tarea_id', as: 'tareas' });
  });

  link(m.TareaChecklistItem && m.Tarea, 'Tarea ↔ TareaChecklistItem', () => {
    m.Tarea.hasMany(m.TareaChecklistItem, { foreignKey: 'tarea_id', as: 'checklist' });
    m.TareaChecklistItem.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  });

  link(m.TareaRelacion && m.TareaRelacionTipo, 'Tarea ↔ TareaRelacion (varias)', () => {
    if (m.Tarea) {
      m.Tarea.hasMany(m.TareaRelacion, { foreignKey: 'tarea_id', as: 'relaciones' });
      m.Tarea.hasMany(m.TareaRelacion, { foreignKey: 'relacionada_id', as: 'relacionesEntrantes' });
    }
    m.TareaRelacion.belongsTo(m.TareaRelacionTipo, { foreignKey: 'tipo_id', as: 'tipo' });
    m.TareaRelacion.belongsTo(m.Tarea, { foreignKey: 'relacionada_id', as: 'relacionada' });
  });

  link(m.TareaSeguidor && m.Tarea, 'Tarea ↔ TareaSeguidor', () => {
    m.Tarea.hasMany(m.TareaSeguidor, { foreignKey: 'tarea_id', as: 'seguidores' });
    m.TareaSeguidor.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  });
  link(m.TareaSeguidor && m.User, 'TareaSeguidor → User (user_id)', () =>
    m.TareaSeguidor.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  link(m.TareaFavorito && m.Tarea, 'TareaFavorito → Tarea (tarea_id)', () =>
    m.TareaFavorito.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' })
  );
  link(m.TareaFavorito && m.User, 'TareaFavorito → User (user_id)', () =>
    m.TareaFavorito.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.TareaKanbanPos && m.Tarea, 'TareaKanbanPos → Tarea (tarea_id)', () =>
    m.TareaKanbanPos.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' })
  );
  link(m.Tarea && m.TareaKanbanPos, 'Tarea ↔ TareaKanbanPos', () => {
    m.Tarea.hasMany(m.TareaKanbanPos, { foreignKey: 'tarea_id', as: 'kanbanPosiciones' });
  });

  link(m.TareaKanbanPos && m.User, 'TareaKanbanPos → User (user_id)', () =>
    m.TareaKanbanPos.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.User && m.TareaKanbanPos, 'User ↔ TareaKanbanPos', () => {
    m.User.hasMany(m.TareaKanbanPos, { foreignKey: 'user_id', as: 'tareasKanban' });
  });

  // ===== Extensiones por Tipo (TC) =====
  link(m.Tarea && m.TareaTC, 'Tarea ↔ TareaTC (1:1)', () => {
    m.Tarea.hasOne(m.TareaTC, { foreignKey: 'tarea_id', as: 'datosTC' });
    m.TareaTC.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  });

  link(m.TareaTC && m.TCObjetivoNegocio, 'TareaTC → TCObjetivoNegocio', () =>
    m.TareaTC.belongsTo(m.TCObjetivoNegocio, { foreignKey: 'objetivo_negocio_id', as: 'objetivoNegocio' })
  );
  link(m.TareaTC && m.TCObjetivoMarketing, 'TareaTC → TCObjetivoMarketing', () =>
    m.TareaTC.belongsTo(m.TCObjetivoMarketing, { foreignKey: 'objetivo_marketing_id', as: 'objetivoMarketing' })
  );
  link(m.TareaTC && m.TCEstadoPublicacion, 'TareaTC → TCEstadoPublicacion', () =>
    m.TareaTC.belongsTo(m.TCEstadoPublicacion, { foreignKey: 'estado_publicacion_id', as: 'estadoPublicacion' })
  );

  link(m.TareaTC && m.TCRedSocial && m.TareaTCRedSocial, 'TareaTC ↔ TCRedSocial (Pivot)', () => {
    m.TareaTC.belongsToMany(m.TCRedSocial, { through: m.TareaTCRedSocial, foreignKey: 'tarea_id', otherKey: 'red_social_id', as: 'redes' });
    m.TCRedSocial.belongsToMany(m.TareaTC, { through: m.TareaTCRedSocial, foreignKey: 'red_social_id', otherKey: 'tarea_id', as: 'tareasTC' });
  });

  link(m.TareaTC && m.TCFormato && m.TareaTCFormato, 'TareaTC ↔ TCFormato (Pivot)', () => {
    m.TareaTC.belongsToMany(m.TCFormato, { through: m.TareaTCFormato, foreignKey: 'tarea_id', otherKey: 'formato_id', as: 'formatos' });
    m.TCFormato.belongsToMany(m.TareaTC, { through: m.TareaTCFormato, foreignKey: 'formato_id', otherKey: 'tarea_id', as: 'tareasTC' });
  });

  // ===== Módulo 9: Calendario =====
  link(m.CalendarioLocal && m.CalendarioTipo, 'CalendarioLocal → CalendarioTipo (tipo_id)', () =>
    m.CalendarioLocal.belongsTo(m.CalendarioTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.CalendarioLocal && m.VisibilidadTipo, 'CalendarioLocal → VisibilidadTipo (visibilidad_id)', () =>
    m.CalendarioLocal.belongsTo(m.VisibilidadTipo, { foreignKey: 'visibilidad_id', as: 'visibilidad' })
  );
  link(m.CalendarioLocal && m.Feder, 'CalendarioLocal → Feder (feder_id)', () =>
    m.CalendarioLocal.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );
  /* celula association removed */
  link(m.CalendarioLocal && m.Cliente, 'CalendarioLocal → Cliente (cliente_id)', () =>
    m.CalendarioLocal.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' })
  );

  link(m.Evento && m.CalendarioLocal, 'Evento ↔ CalendarioLocal', () => {
    m.Evento.belongsTo(m.CalendarioLocal, { foreignKey: 'calendario_local_id', as: 'calendarioLocal' });
    m.CalendarioLocal.hasMany(m.Evento, { foreignKey: 'calendario_local_id', as: 'eventos' });
  });
  link(m.Evento && m.EventoTipo, 'Evento → EventoTipo (tipo_id)', () =>
    m.Evento.belongsTo(m.EventoTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.Evento && m.VisibilidadTipo, 'Evento → VisibilidadTipo (visibilidad_id)', () =>
    m.Evento.belongsTo(m.VisibilidadTipo, { foreignKey: 'visibilidad_id', as: 'visibilidad' })
  );
  link(m.Evento && m.AsistenciaRegistro, 'Evento → AsistenciaRegistro (asistencia_registro_id)', () =>
    m.Evento.belongsTo(m.AsistenciaRegistro, { foreignKey: 'asistencia_registro_id', as: 'asistenciaRegistro' })
  );
  link(m.Evento && m.Ausencia, 'Evento → Ausencia (ausencia_id)', () =>
    m.Evento.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' })
  );
  link(m.Evento && m.Tarea, 'Evento → Tarea (tarea_id)', () =>
    m.Evento.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' })
  );
  link(m.Evento && m.User, 'Evento → User (created_by/updated_by)', () => {
    m.Evento.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
    m.Evento.belongsTo(m.User, { foreignKey: 'updated_by_user_id', as: 'updatedBy' });
  });
  link(m.Evento && m.EventoAsistente, 'Evento ↔ EventoAsistente', () => {
    m.Evento.hasMany(m.EventoAsistente, { foreignKey: 'evento_id', as: 'asistentes' });
    m.EventoAsistente.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' });
  });

  link(m.GoogleCuenta && m.User, 'GoogleCuenta → User (user_id)', () =>
    m.GoogleCuenta.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.GoogleCalendario && m.GoogleCuenta, 'GoogleCalendario → GoogleCuenta (cuenta_id)', () =>
    m.GoogleCalendario.belongsTo(m.GoogleCuenta, { foreignKey: 'cuenta_id', as: 'cuenta' })
  );
  link(m.CalendarioVinculo && m.CalendarioLocal, 'CalendarioVinculo → CalendarioLocal (calendario_local_id)', () =>
    m.CalendarioVinculo.belongsTo(m.CalendarioLocal, { foreignKey: 'calendario_local_id', as: 'calendarioLocal' })
  );
  link(m.CalendarioVinculo && m.GoogleCalendario, 'CalendarioVinculo → GoogleCalendario (google_cal_id)', () =>
    m.CalendarioVinculo.belongsTo(m.GoogleCalendario, { foreignKey: 'google_cal_id', as: 'googleCalendario' })
  );
  link(m.CalendarioVinculo && m.SyncDireccionTipo, 'CalendarioVinculo → SyncDireccionTipo (direccion_id)', () =>
    m.CalendarioVinculo.belongsTo(m.SyncDireccionTipo, { foreignKey: 'direccion_id', as: 'direccion' })
  );
  link(m.GoogleWebhookCanal && m.GoogleCuenta, 'GoogleWebhookCanal → GoogleCuenta (cuenta_id)', () =>
    m.GoogleWebhookCanal.belongsTo(m.GoogleCuenta, { foreignKey: 'cuenta_id', as: 'cuenta' })
  );
  link(m.GoogleWebhookCanal && m.GoogleCalendario, 'GoogleWebhookCanal → GoogleCalendario (google_cal_id)', () =>
    m.GoogleWebhookCanal.belongsTo(m.GoogleCalendario, { foreignKey: 'google_cal_id', as: 'googleCalendario' })
  );
  link(m.EventoSync && m.Evento, 'EventoSync → Evento (evento_id)', () =>
    m.EventoSync.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' })
  );
  link(m.EventoSync && m.GoogleCalendario, 'EventoSync → GoogleCalendario (google_cal_id)', () =>
    m.EventoSync.belongsTo(m.GoogleCalendario, { foreignKey: 'google_cal_id', as: 'googleCalendario' })
  );

  // ===== Módulo 10: Notificaciones =====
  link(m.Notificacion && m.NotificacionTipo, 'Notificacion → NotificacionTipo (tipo_id)', () =>
    m.Notificacion.belongsTo(m.NotificacionTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.Notificacion && m.ImportanciaTipo, 'Notificacion → ImportanciaTipo (importancia_id)', () =>
    m.Notificacion.belongsTo(m.ImportanciaTipo, { foreignKey: 'importancia_id', as: 'importancia' })
  );

  link(m.Notificacion && m.BuzonTipo, 'Notificacion → BuzonTipo (buzon_id)', () =>
    m.Notificacion.belongsTo(m.BuzonTipo, { foreignKey: 'buzon_id', as: 'buzon' })
  );
  link(m.NotificacionTipo && m.BuzonTipo, 'NotificacionTipo → BuzonTipo (buzon_id)', () =>
    m.NotificacionTipo.belongsTo(m.BuzonTipo, { foreignKey: 'buzon_id', as: 'buzon' })
  );
  link(m.Notificacion && m.Evento, 'Notificacion → Evento (evento_id)', () =>
    m.Notificacion.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' })
  );
  link(m.Notificacion && m.ChatCanal, 'Notificacion → ChatCanal (chat_canal_id)', () =>
    m.Notificacion.belongsTo(m.ChatCanal, { foreignKey: 'chat_canal_id', as: 'chatCanal' })
  );
  link(m.Notificacion && m.Tarea, 'Notificacion → Tarea (tarea_id)', () =>
    m.Notificacion.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' })
  );
  link(m.Notificacion && m.Ausencia, 'Notificacion → Ausencia (ausencia_id)', () =>
    m.Notificacion.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' })
  );
  link(m.Notificacion && m.AsistenciaRegistro, 'Notificacion → AsistenciaRegistro (asistencia_registro_id)', () =>
    m.Notificacion.belongsTo(m.AsistenciaRegistro, { foreignKey: 'asistencia_registro_id', as: 'asistenciaRegistro' })
  );
  link(m.Notificacion && m.User, 'Notificacion → User (created_by_user_id)', () =>
    m.Notificacion.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'createdBy' })
  );

  link(m.Notificacion && m.NotificacionDestino, 'Notificacion ↔ NotificacionDestino', () => {
    m.Notificacion.hasMany(m.NotificacionDestino, { foreignKey: 'notificacion_id', as: 'destinos' });
    m.NotificacionDestino.belongsTo(m.Notificacion, { foreignKey: 'notificacion_id', as: 'notificacion' });
  });
  link(m.NotificacionDestino && m.User, 'NotificacionDestino → User (user_id)', () =>
    m.NotificacionDestino.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.NotificacionDestino && m.Feder, 'NotificacionDestino → Feder (feder_id)', () =>
    m.NotificacionDestino.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );

  link(m.NotificacionEnvio && m.NotificacionDestino, 'NotificacionEnvio → NotificacionDestino (destino_id)', () =>
    m.NotificacionEnvio.belongsTo(m.NotificacionDestino, { foreignKey: 'destino_id', as: 'destino' })
  );
  link(m.NotificacionEnvio && m.CanalTipo, 'NotificacionEnvio → CanalTipo (canal_id)', () =>
    m.NotificacionEnvio.belongsTo(m.CanalTipo, { foreignKey: 'canal_id', as: 'canal' })
  );
  link(m.NotificacionEnvio && m.ProveedorTipo, 'NotificacionEnvio → ProveedorTipo (proveedor_id)', () =>
    m.NotificacionEnvio.belongsTo(m.ProveedorTipo, { foreignKey: 'proveedor_id', as: 'proveedor' })
  );
  link(m.NotificacionEnvio && m.EstadoEnvio, 'NotificacionEnvio → EstadoEnvio (estado_id)', () =>
    m.NotificacionEnvio.belongsTo(m.EstadoEnvio, { foreignKey: 'estado_id', as: 'estado' })
  );

  link(m.NotificacionPreferencia && m.User, 'NotificacionPreferencia → User (user_id)', () =>
    m.NotificacionPreferencia.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.NotificacionPreferencia && m.NotificacionTipo, 'NotificacionPreferencia → NotificacionTipo (tipo_id)', () =>
    m.NotificacionPreferencia.belongsTo(m.NotificacionTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.NotificacionPreferencia && m.CanalTipo, 'NotificacionPreferencia → CanalTipo (canal_id)', () =>
    m.NotificacionPreferencia.belongsTo(m.CanalTipo, { foreignKey: 'canal_id', as: 'canal' })
  );

  link(m.NotificacionPlantilla && m.NotificacionTipo, 'NotificacionPlantilla → NotificacionTipo (tipo_id)', () =>
    m.NotificacionPlantilla.belongsTo(m.NotificacionTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.NotificacionPlantilla && m.CanalTipo, 'NotificacionPlantilla → CanalTipo (canal_id)', () =>
    m.NotificacionPlantilla.belongsTo(m.CanalTipo, { foreignKey: 'canal_id', as: 'canal' })
  );

  link(m.PushToken && m.User, 'PushToken → User (user_id)', () =>
    m.PushToken.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.PushToken && m.ProveedorTipo, 'PushToken → ProveedorTipo (proveedor_id)', () =>
    m.PushToken.belongsTo(m.ProveedorTipo, { foreignKey: 'proveedor_id', as: 'proveedor' })
  );

  // ===== Módulo 11: Chat =====
  // Catálogos
  link(m.ChatCanal && m.ChatCanalTipo, 'ChatCanal → ChatCanalTipo (tipo_id)', () =>
    m.ChatCanal.belongsTo(m.ChatCanalTipo, { foreignKey: 'tipo_id', as: 'tipo' })
  );
  link(m.ChatCanal && m.Notificacion, 'ChatCanal ↔ Notificacion', () => {
    m.ChatCanal.hasMany(m.Notificacion, { foreignKey: 'chat_canal_id', as: 'notificaciones' });
  });
  link(m.ChatCanalMiembro && m.ChatRolTipo, 'ChatCanalMiembro → ChatRolTipo (rol_id)', () =>
    m.ChatCanalMiembro.belongsTo(m.ChatRolTipo, { foreignKey: 'rol_id', as: 'rol' })
  );

  // ChatCanal ↔ otras entidades
  /* celula association removed */
  link(m.ChatCanal && m.Cliente, 'ChatCanal → Cliente (cliente_id)', () =>
    m.ChatCanal.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' })
  );
  link(m.ChatCanal && m.User, 'ChatCanal → User (created_by_user_id)', () =>
    m.ChatCanal.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'createdBy' })
  );

  // Membresía
  link(m.ChatCanal && m.ChatCanalMiembro, 'ChatCanal ↔ ChatCanalMiembro', () => {
    m.ChatCanal.hasMany(m.ChatCanalMiembro, { foreignKey: 'canal_id', as: 'miembros' });
    m.ChatCanalMiembro.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' });
  });
  link(m.ChatCanalMiembro && m.User, 'ChatCanalMiembro → User (user_id)', () =>
    m.ChatCanalMiembro.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.ChatCanalMiembro && m.Feder, 'ChatCanalMiembro → Feder (feder_id)', () =>
    m.ChatCanalMiembro.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );
  link(m.ChatCanalMiembro && m.ChatMensaje, 'ChatCanalMiembro → ChatMensaje (last_read_msg_id)', () =>
    m.ChatCanalMiembro.belongsTo(m.ChatMensaje, { foreignKey: 'last_read_msg_id', as: 'lastReadMsg' })
  );

  // Mensajes
  link(m.ChatMensaje && m.ChatCanal, 'ChatMensaje → ChatCanal (canal_id)', () =>
    m.ChatMensaje.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' })
  );
  link(m.ChatCanal && m.ChatMensaje, 'ChatCanal ↔ ChatMensaje', () =>
    m.ChatCanal.hasMany(m.ChatMensaje, { foreignKey: 'canal_id', as: 'mensajes' })
  );

  link(m.ChatMensaje && m.User, 'ChatMensaje → User (user_id)', () =>
    m.ChatMensaje.belongsTo(m.User, { foreignKey: 'user_id', as: 'autor' })
  );
  link(m.ChatMensaje && m.Feder, 'ChatMensaje → Feder (feder_id)', () =>
    m.ChatMensaje.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );

  // Hilos (self)
  link(m.ChatMensaje, 'ChatMensaje ↔ ChatMensaje (self)', () => {
    m.ChatMensaje.belongsTo(m.ChatMensaje, { foreignKey: 'parent_id', as: 'parent' });
    m.ChatMensaje.hasMany(m.ChatMensaje, { foreignKey: 'parent_id', as: 'replies' });
  });

  // Ediciones / reacciones / adjuntos
  link(m.ChatMensajeEditHist && m.ChatMensaje, 'ChatMensajeEditHist ↔ ChatMensaje', () => {
    m.ChatMensajeEditHist.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatMensajeEditHist, { foreignKey: 'mensaje_id', as: 'edits' });
  });
  link(m.ChatReaccion && m.ChatMensaje, 'ChatReaccion ↔ ChatMensaje', () => {
    m.ChatReaccion.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatReaccion, { foreignKey: 'mensaje_id', as: 'reacciones' });
  });
  link(m.ChatReaccion && m.User, 'ChatReaccion → User (user_id)', () =>
    m.ChatReaccion.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  link(m.ChatAdjunto && m.ChatMensaje, 'ChatAdjunto ↔ ChatMensaje', () => {
    m.ChatAdjunto.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatAdjunto, { foreignKey: 'mensaje_id', as: 'adjuntos' });
  });

  // Referencias cruzadas y previews
  link(m.ChatMensajeRef && m.ChatMensaje, 'ChatMensajeRef → ChatMensaje (mensaje_id)', () =>
    m.ChatMensajeRef.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' })
  );
  link(m.ChatMensajeRef && m.Tarea, 'ChatMensajeRef → Tarea (tarea_id)', () =>
    m.ChatMensajeRef.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' })
  );
  link(m.ChatMensajeRef && m.Evento, 'ChatMensajeRef → Evento (evento_id)', () =>
    m.ChatMensajeRef.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' })
  );
  link(m.ChatMensajeRef && m.Ausencia, 'ChatMensajeRef → Ausencia (ausencia_id)', () =>
    m.ChatMensajeRef.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' })
  );
  link(m.ChatMensajeRef && m.AsistenciaRegistro, 'ChatMensajeRef → AsistenciaRegistro (asistencia_registro_id)', () =>
    m.ChatMensajeRef.belongsTo(m.AsistenciaRegistro, { foreignKey: 'asistencia_registro_id', as: 'asistenciaRegistro' })
  );
  link(m.ChatMensajeRef && m.Cliente, 'ChatMensajeRef → Cliente (cliente_id)', () =>
    m.ChatMensajeRef.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' })
  );
  /* celula association removed */
  link(m.ChatMensajeRef && m.Feder, 'ChatMensajeRef → Feder (feder_id)', () =>
    m.ChatMensajeRef.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' })
  );

  link(m.ChatLinkPreview && m.ChatMensaje, 'ChatLinkPreview ↔ ChatMensaje', () => {
    m.ChatLinkPreview.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatLinkPreview, { foreignKey: 'mensaje_id', as: 'linkPreviews' });
  });

  // Receipts / delivery / guardados / pins
  link(m.ChatReadReceipt && m.ChatMensaje, 'ChatReadReceipt → ChatMensaje (mensaje_id)', () =>
    m.ChatReadReceipt.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' })
  );
  link(m.ChatReadReceipt && m.User, 'ChatReadReceipt → User (user_id)', () =>
    m.ChatReadReceipt.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  link(m.ChatDelivery && m.ChatMensaje, 'ChatDelivery → ChatMensaje (mensaje_id)', () =>
    m.ChatDelivery.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' })
  );
  link(m.ChatDelivery && m.User, 'ChatDelivery → User (user_id)', () =>
    m.ChatDelivery.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  link(m.ChatSavedMessage && m.ChatMensaje, 'ChatSavedMessage → ChatMensaje (mensaje_id)', () =>
    m.ChatSavedMessage.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' })
  );
  link(m.ChatSavedMessage && m.User, 'ChatSavedMessage → User (user_id)', () =>
    m.ChatSavedMessage.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  link(m.ChatPin && m.ChatCanal, 'ChatPin → ChatCanal (canal_id)', () =>
    m.ChatPin.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' })
  );
  link(m.ChatPin && m.ChatMensaje, 'ChatPin ↔ ChatMensaje', () => {
    m.ChatPin.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatPin, { foreignKey: 'mensaje_id', as: 'pins' });
  });
  link(m.ChatPin && m.User, 'ChatPin → User (pinned_by_user_id)', () =>
    m.ChatPin.belongsTo(m.User, { foreignKey: 'pinned_by_user_id', as: 'pinnedBy' })
  );

  // Seguimiento de hilos
  link(m.ChatThreadFollow && m.ChatMensaje, 'ChatThreadFollow → ChatMensaje (root_msg_id)', () =>
    m.ChatThreadFollow.belongsTo(m.ChatMensaje, { foreignKey: 'root_msg_id', as: 'rootMsg' })
  );
  link(m.ChatThreadFollow && m.User, 'ChatThreadFollow → User (user_id)', () =>
    m.ChatThreadFollow.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  // Invitaciones
  link(m.ChatInvitacion && m.ChatCanal, 'ChatInvitacion → ChatCanal (canal_id)', () =>
    m.ChatInvitacion.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' })
  );
  link(m.ChatInvitacion && m.User, 'ChatInvitacion → User (invited_by/invited_user)', () => {
    m.ChatInvitacion.belongsTo(m.User, { foreignKey: 'invited_by_user_id', as: 'invitedBy' });
    m.ChatInvitacion.belongsTo(m.User, { foreignKey: 'invited_user_id', as: 'invitedUser' });
  });

  // Meetings y vínculo con Calendario
  link(m.ChatMeeting && m.ChatCanal, 'ChatMeeting → ChatCanal (canal_id)', () =>
    m.ChatMeeting.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' })
  );
  link(m.ChatMeeting && m.User, 'ChatMeeting → User (created_by_user_id)', () =>
    m.ChatMeeting.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'createdBy' })
  );
  link(m.ChatMeeting && m.Evento, 'ChatMeeting → Evento (evento_id)', () =>
    m.ChatMeeting.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' })
  );
  link(m.ChatMeeting && m.ChatMensaje, 'ChatMeeting → ChatMensaje (mensaje_id)', () =>
    m.ChatMeeting.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' })
  );

  // Presencia & Typing
  link(m.ChatPresence && m.User, 'ChatPresence → User (user_id)', () =>
    m.ChatPresence.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.ChatTyping && m.ChatCanal, 'ChatTyping → ChatCanal (canal_id)', () =>
    m.ChatTyping.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' })
  );
  link(m.ChatTyping && m.User, 'ChatTyping → User (user_id)', () =>
    m.ChatTyping.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );

  // ===== Módulo 12: Status =====
  link(m.UserStatusPersonalizado && m.User, 'UserStatusPersonalizado → User (user_id)', () =>
    m.UserStatusPersonalizado.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' })
  );
  link(m.User && m.UserStatusPersonalizado, 'User → UserStatusPersonalizado (hasMany)', () =>
    m.User.hasMany(m.UserStatusPersonalizado, { foreignKey: 'user_id', as: 'customStatuses' })
  );
  link(m.Feder && m.UserStatusPersonalizado, 'Feder → UserStatusPersonalizado (current_status_custom_id)', () =>
    m.Feder.belongsTo(m.UserStatusPersonalizado, { foreignKey: 'current_status_custom_id', as: 'currentStatusCustom' })
  );


  // ===== Módulo 13: Comercial =====
  link(m.ComercialLead && m.ComercialLeadStatus, 'ComercialLead → ComercialLeadStatus (status_id)', () =>
    m.ComercialLead.belongsTo(m.ComercialLeadStatus, { foreignKey: 'status_id', as: 'status' })
  );
  link(m.ComercialLead && m.ComercialLeadEtapa, 'ComercialLead → ComercialLeadEtapa (etapa_id)', () =>
    m.ComercialLead.belongsTo(m.ComercialLeadEtapa, { foreignKey: 'etapa_id', as: 'etapa' })
  );
  link(m.ComercialLead && m.ComercialLeadFuente, 'ComercialLead → ComercialLeadFuente (fuente_id)', () =>
    m.ComercialLead.belongsTo(m.ComercialLeadFuente, { foreignKey: 'fuente_id', as: 'fuente' })
  );
  link(m.ComercialLead && m.ComercialLeadMotivoPerdida, 'ComercialLead → ComercialLeadMotivoPerdida (motivo_perdida_id)', () =>
    m.ComercialLead.belongsTo(m.ComercialLeadMotivoPerdida, { foreignKey: 'motivo_perdida_id', as: 'motivoPerdida' })
  );
  link(m.ComercialLead && m.Feder, 'ComercialLead → Feder (responsable_feder_id)', () =>
    m.ComercialLead.belongsTo(m.Feder, { foreignKey: 'responsable_feder_id', as: 'responsable' })
  );
  link(m.ComercialLead && m.Cliente, 'ComercialLead → Cliente (cliente_id)', () =>
    m.ComercialLead.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' })
  );
  link(m.ComercialLead && m.User, 'ComercialLead → User (created_by_user_id)', () =>
    m.ComercialLead.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'creador' })
  );

  link(m.ComercialLead && m.ComercialLeadNota, 'ComercialLead ↔ ComercialLeadNota', () => {
    m.ComercialLead.hasMany(m.ComercialLeadNota, { foreignKey: 'lead_id', as: 'notas' });
    m.ComercialLeadNota.belongsTo(m.ComercialLead, { foreignKey: 'lead_id', as: 'lead' });
  });
  link(m.ComercialLeadNota && m.User, 'ComercialLeadNota → User (autor_user_id)', () =>
    m.ComercialLeadNota.belongsTo(m.User, { foreignKey: 'autor_user_id', as: 'autor' })
  );

  link(m.ComercialLead && m.ComercialLeadAdjunto, 'ComercialLead ↔ ComercialLeadAdjunto', () => {
    m.ComercialLead.hasMany(m.ComercialLeadAdjunto, { foreignKey: 'lead_id', as: 'adjuntos' });
    m.ComercialLeadAdjunto.belongsTo(m.ComercialLead, { foreignKey: 'lead_id', as: 'lead' });
  });
  link(m.ComercialLeadAdjunto && m.User, 'ComercialLeadAdjunto → User (autor_user_id)', () =>
    m.ComercialLeadAdjunto.belongsTo(m.User, { foreignKey: 'autor_user_id', as: 'autor' })
  );

  link(m.ComercialLead && m.ComercialLeadHistorial, 'ComercialLead ↔ ComercialLeadHistorial', () => {
    m.ComercialLead.hasMany(m.ComercialLeadHistorial, { foreignKey: 'lead_id', as: 'historial' });
    m.ComercialLeadHistorial.belongsTo(m.ComercialLead, { foreignKey: 'lead_id', as: 'lead' });
  });
  link(m.ComercialLeadHistorial && m.User, 'ComercialLeadHistorial → User (user_id)', () =>
    m.ComercialLeadHistorial.belongsTo(m.User, { foreignKey: 'user_id', as: 'autor' })
  );

};