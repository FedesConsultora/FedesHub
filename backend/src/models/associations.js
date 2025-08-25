// backend/src/models/associations.js
export const setupAssociations = (m) => {
    
  // ===== Módulo 1: Auth =====
  if (m.User && m.AuthEmailDominio) m.User.belongsTo(m.AuthEmailDominio, { foreignKey: 'email_dominio_id', as: 'emailDominio' });
  if (m.User && m.Rol && m.UserRol) {
    m.User.belongsToMany(m.Rol, { through: m.UserRol, foreignKey: 'user_id', otherKey: 'rol_id', as: 'roles' });
    m.Rol.belongsToMany(m.User, { through: m.UserRol, foreignKey: 'rol_id', otherKey: 'user_id', as: 'users' });
  }
  if (m.Rol && m.RolTipo) m.Rol.belongsTo(m.RolTipo, { foreignKey: 'rol_tipo_id', as: 'tipo' });
  if (m.Permiso && m.Modulo) m.Permiso.belongsTo(m.Modulo, { foreignKey: 'modulo_id', as: 'modulo' });
  if (m.Permiso && m.Accion) m.Permiso.belongsTo(m.Accion, { foreignKey: 'accion_id', as: 'accion' });
  if (m.Rol && m.Permiso && m.RolPermiso) {
    m.Rol.belongsToMany(m.Permiso, { through: m.RolPermiso, foreignKey: 'rol_id', otherKey: 'permiso_id', as: 'permisos' });
    m.Permiso.belongsToMany(m.Rol, { through: m.RolPermiso, foreignKey: 'permiso_id', otherKey: 'rol_id', as: 'roles' });
  }
  if (m.JwtRevocacion && m.User) m.JwtRevocacion.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  // ===== Módulo 2: Cargos =====
  if (m.Cargo && m.CargoAmbito) m.Cargo.belongsTo(m.CargoAmbito, { foreignKey: 'ambito_id', as: 'ambito' });
  if (m.Feder && m.Cargo && m.FederCargo) {
    m.Feder.belongsToMany(m.Cargo, { through: m.FederCargo, foreignKey: 'feder_id', otherKey: 'cargo_id', as: 'cargos' });
    m.Cargo.belongsToMany(m.Feder, { through: m.FederCargo, foreignKey: 'cargo_id', otherKey: 'feder_id', as: 'feders' });
  }

  // ===== Módulo 3: Feders =====
  if (m.Feder && m.User) m.Feder.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });
  if (m.Feder && m.Celula) m.Feder.belongsTo(m.Celula, { foreignKey: 'celula_id', as: 'celula' });
  if (m.Feder && m.FederEstadoTipo) m.Feder.belongsTo(m.FederEstadoTipo, { foreignKey: 'estado_id', as: 'estado' });
  if (m.FederModalidadDia && m.Feder) m.FederModalidadDia.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  if (m.FederModalidadDia && m.DiaSemana) m.FederModalidadDia.belongsTo(m.DiaSemana, { foreignKey: 'dia_semana_id', as: 'diaSemana' });
  if (m.FederModalidadDia && m.ModalidadTrabajoTipo) m.FederModalidadDia.belongsTo(m.ModalidadTrabajoTipo, { foreignKey: 'modalidad_id', as: 'modalidad' });

  // ===== Módulo 4: Asistencia =====
  if (m.AsistenciaRegistro && m.Feder) m.AsistenciaRegistro.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  if (m.AsistenciaRegistro && m.AsistenciaOrigenTipo) {
    m.AsistenciaRegistro.belongsTo(m.AsistenciaOrigenTipo, { foreignKey: 'check_in_origen_id', as: 'checkInOrigen' });
    m.AsistenciaRegistro.belongsTo(m.AsistenciaOrigenTipo, { foreignKey: 'check_out_origen_id', as: 'checkOutOrigen' });
  }
  if (m.AsistenciaRegistro && m.AsistenciaCierreMotivoTipo)
    m.AsistenciaRegistro.belongsTo(m.AsistenciaCierreMotivoTipo, { foreignKey: 'cierre_motivo_id', as: 'cierreMotivo' });
  if (m.AsistenciaRegistro && m.ModalidadTrabajoTipo)
    m.AsistenciaRegistro.belongsTo(m.ModalidadTrabajoTipo, { foreignKey: 'modalidad_id', as: 'modalidad' });

  // ===== Módulo 5: Ausencias =====
  if (m.Ausencia && m.Feder) m.Ausencia.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  if (m.Ausencia && m.AusenciaTipo) m.Ausencia.belongsTo(m.AusenciaTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.Ausencia && m.AusenciaEstado) m.Ausencia.belongsTo(m.AusenciaEstado, { foreignKey: 'estado_id', as: 'estado' });
  if (m.Ausencia && m.MitadDiaTipo) m.Ausencia.belongsTo(m.MitadDiaTipo, { foreignKey: 'mitad_dia_id', as: 'mitadDia' });
  if (m.Ausencia && m.User) m.Ausencia.belongsTo(m.User, { foreignKey: 'aprobado_por_user_id', as: 'aprobadoPor' });

  // — Ampliaciones: cuotas, consumos y solicitudes de asignación —
  if (m.AusenciaTipo && m.AusenciaUnidadTipo)
    m.AusenciaTipo.belongsTo(m.AusenciaUnidadTipo, { foreignKey: 'unidad_id', as: 'unidad' });

  if (m.AusenciaCuota) {
    if (m.Feder) m.AusenciaCuota.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
    if (m.AusenciaTipo) m.AusenciaCuota.belongsTo(m.AusenciaTipo, { foreignKey: 'tipo_id', as: 'tipo' });
    if (m.AusenciaUnidadTipo) m.AusenciaCuota.belongsTo(m.AusenciaUnidadTipo, { foreignKey: 'unidad_id', as: 'unidad' });
    if (m.User) m.AusenciaCuota.belongsTo(m.User, { foreignKey: 'asignado_por_user_id', as: 'asignadoPor' });
  }

  if (m.AusenciaCuotaConsumo) {
    if (m.AusenciaCuota) m.AusenciaCuotaConsumo.belongsTo(m.AusenciaCuota, { foreignKey: 'cuota_id', as: 'cuota' });
    if (m.Ausencia) m.AusenciaCuotaConsumo.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' });
  }

  if (m.AusenciaAsignacionSolicitud) {
    if (m.Feder) m.AusenciaAsignacionSolicitud.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
    if (m.AusenciaTipo) m.AusenciaAsignacionSolicitud.belongsTo(m.AusenciaTipo, { foreignKey: 'tipo_id', as: 'tipo' });
    if (m.AusenciaUnidadTipo) m.AusenciaAsignacionSolicitud.belongsTo(m.AusenciaUnidadTipo, { foreignKey: 'unidad_id', as: 'unidad' });
    if (m.AsignacionSolicitudEstado) m.AusenciaAsignacionSolicitud.belongsTo(m.AsignacionSolicitudEstado, { foreignKey: 'estado_id', as: 'estado' });
    if (m.User) m.AusenciaAsignacionSolicitud.belongsTo(m.User, { foreignKey: 'aprobado_por_user_id', as: 'aprobadoPor' });
  }


  // ===== Módulo 6: Células =====
  if (m.Celula && m.CelulaEstado) m.Celula.belongsTo(m.CelulaEstado, { foreignKey: 'estado_id', as: 'estado' });
  if (m.CelulaRolAsignacion && m.Celula) m.CelulaRolAsignacion.belongsTo(m.Celula, { foreignKey: 'celula_id', as: 'celula' });
  if (m.CelulaRolAsignacion && m.Feder) m.CelulaRolAsignacion.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  if (m.CelulaRolAsignacion && m.CelulaRolTipo) m.CelulaRolAsignacion.belongsTo(m.CelulaRolTipo, { foreignKey: 'rol_tipo_id', as: 'rolTipo' });

  // ===== Módulo 7: Clientes =====
  if (m.Cliente && m.Celula) m.Cliente.belongsTo(m.Celula, { foreignKey: 'celula_id', as: 'celula' });
  if (m.Cliente && m.ClienteTipo) m.Cliente.belongsTo(m.ClienteTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.Cliente && m.ClienteEstado) m.Cliente.belongsTo(m.ClienteEstado, { foreignKey: 'estado_id', as: 'estado' });
  if (m.Cliente && m.ClienteContacto) {
    m.Cliente.hasMany(m.ClienteContacto, { foreignKey: 'cliente_id', as: 'contactos' });
    m.ClienteContacto.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  }
  if (m.ClienteHito && m.Cliente) {
    m.ClienteHito.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
    m.Cliente.hasMany(m.ClienteHito, { foreignKey: 'cliente_id', as: 'hitos' });
  }

  // ===== Módulo 8: Tareas =====
  if (m.Tarea && m.Cliente) m.Tarea.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  if (m.Tarea && m.ClienteHito) m.Tarea.belongsTo(m.ClienteHito, { foreignKey: 'hito_id', as: 'hito' });

  if (m.Tarea) {
    m.Tarea.belongsTo(m.Tarea, { foreignKey: 'tarea_padre_id', as: 'tareaPadre' });
    m.Tarea.hasMany(m.Tarea, { foreignKey: 'tarea_padre_id', as: 'subtareas' });
  }
  if (m.Tarea && m.TareaEstado) m.Tarea.belongsTo(m.TareaEstado, { foreignKey: 'estado_id', as: 'estado' });
  if (m.Tarea && m.Feder) m.Tarea.belongsTo(m.Feder, { foreignKey: 'creado_por_feder_id', as: 'creadoPor' });
  if (m.Tarea && m.TareaAprobacionEstado) m.Tarea.belongsTo(m.TareaAprobacionEstado, { foreignKey: 'aprobacion_estado_id', as: 'aprobacionEstado' });
  if (m.Tarea && m.User) {
    m.Tarea.belongsTo(m.User, { foreignKey: 'aprobado_por_user_id', as: 'aprobadoPor' });
    m.Tarea.belongsTo(m.User, { foreignKey: 'rechazado_por_user_id', as: 'rechazadoPor' });
  }
  if (m.Tarea && m.ImpactoTipo) m.Tarea.belongsTo(m.ImpactoTipo, { foreignKey: 'impacto_id', as: 'impacto' });
  if (m.Tarea && m.UrgenciaTipo) m.Tarea.belongsTo(m.UrgenciaTipo, { foreignKey: 'urgencia_id', as: 'urgencia' });

  if (m.Tarea && m.TareaResponsable && m.Feder) {
    m.Tarea.belongsToMany(m.Feder, { as: 'Responsables', through: m.TareaResponsable, foreignKey: 'tarea_id', otherKey: 'feder_id' });
    m.Feder.belongsToMany(m.Tarea, { as: 'TareasResponsable', through: m.TareaResponsable, foreignKey: 'feder_id', otherKey: 'tarea_id' });
  }
  if (m.Tarea && m.TareaColaborador && m.Feder) {
    m.Tarea.belongsToMany(m.Feder, { as: 'Colaboradores', through: m.TareaColaborador, foreignKey: 'tarea_id', otherKey: 'feder_id' });
    m.Feder.belongsToMany(m.Tarea, { as: 'TareasColaborador', through: m.TareaColaborador, foreignKey: 'feder_id', otherKey: 'tarea_id' });
  }

  if (m.Tarea && m.TareaComentario) {
    m.Tarea.hasMany(m.TareaComentario, { foreignKey: 'tarea_id', as: 'comentarios' });
    m.TareaComentario.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  }
  if (m.TareaComentario && m.Feder) m.TareaComentario.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'autor' });
  if (m.TareaComentario && m.ComentarioTipo) m.TareaComentario.belongsTo(m.ComentarioTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.TareaComentarioMencion) {
    if (m.TareaComentario) m.TareaComentarioMencion.belongsTo(m.TareaComentario, { foreignKey: 'comentario_id', as: 'comentario' });
    if (m.Feder) m.TareaComentarioMencion.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'mencionado' });
  }

  if (m.TareaAdjunto) {
    if (m.Tarea) m.TareaAdjunto.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
    if (m.TareaComentario) m.TareaAdjunto.belongsTo(m.TareaComentario, { foreignKey: 'comentario_id', as: 'comentario' });
    if (m.Feder) m.TareaAdjunto.belongsTo(m.Feder, { foreignKey: 'subido_por_feder_id', as: 'subidoPor' });
  }

  if (m.TareaEtiqueta && m.TareaEtiquetaAsig) {
    if (m.Tarea) m.Tarea.belongsToMany(m.TareaEtiqueta, { through: m.TareaEtiquetaAsig, foreignKey: 'tarea_id', otherKey: 'etiqueta_id', as: 'etiquetas' });
    m.TareaEtiqueta.belongsToMany(m.Tarea, { through: m.TareaEtiquetaAsig, foreignKey: 'etiqueta_id', otherKey: 'tarea_id', as: 'tareas' });
  }

  if (m.TareaChecklistItem && m.Tarea) {
    m.Tarea.hasMany(m.TareaChecklistItem, { foreignKey: 'tarea_id', as: 'checklist' });
    m.TareaChecklistItem.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  }

  if (m.TareaRelacion && m.TareaRelacionTipo) {
    if (m.Tarea) {
      m.Tarea.hasMany(m.TareaRelacion, { foreignKey: 'tarea_id', as: 'relaciones' });
      m.Tarea.hasMany(m.TareaRelacion, { foreignKey: 'relacionada_id', as: 'relacionesEntrantes' });
    }
    m.TareaRelacion.belongsTo(m.TareaRelacionTipo, { foreignKey: 'tipo_id', as: 'tipo' });
    m.TareaRelacion.belongsTo(m.Tarea, { foreignKey: 'relacionada_id', as: 'relacionada' });
  }

  if (m.TareaSeguidor && m.Tarea) {
    m.Tarea.hasMany(m.TareaSeguidor, { foreignKey: 'tarea_id', as: 'seguidores' });
    m.TareaSeguidor.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  }
  if (m.TareaSeguidor && m.User) m.TareaSeguidor.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  if (m.TareaFavorito && m.Tarea) m.TareaFavorito.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  if (m.TareaFavorito && m.User) m.TareaFavorito.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  // ===== Módulo 9: Calendario =====
  if (m.CalendarioLocal && m.CalendarioTipo) m.CalendarioLocal.belongsTo(m.CalendarioTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.CalendarioLocal && m.VisibilidadTipo) m.CalendarioLocal.belongsTo(m.VisibilidadTipo, { foreignKey: 'visibilidad_id', as: 'visibilidad' });
  if (m.CalendarioLocal && m.Feder) m.CalendarioLocal.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });
  if (m.CalendarioLocal && m.Celula) m.CalendarioLocal.belongsTo(m.Celula, { foreignKey: 'celula_id', as: 'celula' });
  if (m.CalendarioLocal && m.Cliente) m.CalendarioLocal.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

  if (m.Evento && m.CalendarioLocal) {
    m.Evento.belongsTo(m.CalendarioLocal, { foreignKey: 'calendario_local_id', as: 'calendarioLocal' });
    m.CalendarioLocal.hasMany(m.Evento, { foreignKey: 'calendario_local_id', as: 'eventos' });
  }
  if (m.Evento && m.EventoTipo) m.Evento.belongsTo(m.EventoTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.Evento && m.VisibilidadTipo) m.Evento.belongsTo(m.VisibilidadTipo, { foreignKey: 'visibilidad_id', as: 'visibilidad' });
  if (m.Evento && m.AsistenciaRegistro) m.Evento.belongsTo(m.AsistenciaRegistro, { foreignKey: 'asistencia_registro_id', as: 'asistenciaRegistro' });
  if (m.Evento && m.Ausencia) m.Evento.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' });
  if (m.Evento && m.Tarea) m.Evento.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  if (m.Evento && m.User) {
    m.Evento.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
    m.Evento.belongsTo(m.User, { foreignKey: 'updated_by_user_id', as: 'updatedBy' });
  }
  if (m.Evento && m.EventoAsistente) {
    m.Evento.hasMany(m.EventoAsistente, { foreignKey: 'evento_id', as: 'asistentes' });
    m.EventoAsistente.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' });
  }

  if (m.GoogleCuenta && m.User) m.GoogleCuenta.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });
  if (m.GoogleCalendario && m.GoogleCuenta) m.GoogleCalendario.belongsTo(m.GoogleCuenta, { foreignKey: 'cuenta_id', as: 'cuenta' });
  if (m.CalendarioVinculo && m.CalendarioLocal) m.CalendarioVinculo.belongsTo(m.CalendarioLocal, { foreignKey: 'calendario_local_id', as: 'calendarioLocal' });
  if (m.CalendarioVinculo && m.GoogleCalendario) m.CalendarioVinculo.belongsTo(m.GoogleCalendario, { foreignKey: 'google_cal_id', as: 'googleCalendario' });
  if (m.CalendarioVinculo && m.SyncDireccionTipo) m.CalendarioVinculo.belongsTo(m.SyncDireccionTipo, { foreignKey: 'direccion_id', as: 'direccion' });
  if (m.GoogleWebhookCanal && m.GoogleCuenta) m.GoogleWebhookCanal.belongsTo(m.GoogleCuenta, { foreignKey: 'cuenta_id', as: 'cuenta' });
  if (m.GoogleWebhookCanal && m.GoogleCalendario)
  m.GoogleWebhookCanal.belongsTo(m.GoogleCalendario, { foreignKey: 'google_cal_id', as: 'googleCalendario' });
  if (m.EventoSync && m.Evento) m.EventoSync.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' });
  if (m.EventoSync && m.GoogleCalendario) m.EventoSync.belongsTo(m.GoogleCalendario, { foreignKey: 'google_cal_id', as: 'googleCalendario' });

    // ===== Módulo 10: Notificaciones =====
  if (m.Notificacion && m.NotificacionTipo) m.Notificacion.belongsTo(m.NotificacionTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.Notificacion && m.ImportanciaTipo) m.Notificacion.belongsTo(m.ImportanciaTipo, { foreignKey: 'importancia_id', as: 'importancia' });

  // NUEVO: buzones y evento
  if (m.Notificacion && m.BuzonTipo) m.Notificacion.belongsTo(m.BuzonTipo, { foreignKey: 'buzon_id', as: 'buzon' });
  if (m.NotificacionTipo && m.BuzonTipo) m.NotificacionTipo.belongsTo(m.BuzonTipo, { foreignKey: 'buzon_id', as: 'buzon' });
  if (m.Notificacion && m.Evento) m.Notificacion.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' });

  // (opcional futuro) chat: sólo si tenés modelo
  if (m.Notificacion && m.ChatCanal) m.Notificacion.belongsTo(m.ChatCanal, { foreignKey: 'chat_canal_id', as: 'chatCanal' });

  if (m.Notificacion && m.Tarea) m.Notificacion.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  if (m.Notificacion && m.Ausencia) m.Notificacion.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' });
  if (m.Notificacion && m.AsistenciaRegistro) m.Notificacion.belongsTo(m.AsistenciaRegistro, { foreignKey: 'asistencia_registro_id', as: 'asistenciaRegistro' });
  if (m.Notificacion && m.User) m.Notificacion.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'createdBy' });

  if (m.Notificacion && m.NotificacionDestino) {
    m.Notificacion.hasMany(m.NotificacionDestino, { foreignKey: 'notificacion_id', as: 'destinos' });
    m.NotificacionDestino.belongsTo(m.Notificacion, { foreignKey: 'notificacion_id', as: 'notificacion' });
  }
  if (m.NotificacionDestino && m.User) m.NotificacionDestino.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });
  if (m.NotificacionDestino && m.Feder) m.NotificacionDestino.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });

  if (m.NotificacionEnvio && m.NotificacionDestino) m.NotificacionEnvio.belongsTo(m.NotificacionDestino, { foreignKey: 'destino_id', as: 'destino' });
  if (m.NotificacionEnvio && m.CanalTipo) m.NotificacionEnvio.belongsTo(m.CanalTipo, { foreignKey: 'canal_id', as: 'canal' });
  if (m.NotificacionEnvio && m.ProveedorTipo) m.NotificacionEnvio.belongsTo(m.ProveedorTipo, { foreignKey: 'proveedor_id', as: 'proveedor' });
  if (m.NotificacionEnvio && m.EstadoEnvio) m.NotificacionEnvio.belongsTo(m.EstadoEnvio, { foreignKey: 'estado_id', as: 'estado' });

  if (m.NotificacionPreferencia && m.User) m.NotificacionPreferencia.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });
  if (m.NotificacionPreferencia && m.NotificacionTipo) m.NotificacionPreferencia.belongsTo(m.NotificacionTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.NotificacionPreferencia && m.CanalTipo) m.NotificacionPreferencia.belongsTo(m.CanalTipo, { foreignKey: 'canal_id', as: 'canal' });

  if (m.NotificacionPlantilla && m.NotificacionTipo) m.NotificacionPlantilla.belongsTo(m.NotificacionTipo, { foreignKey: 'tipo_id', as: 'tipo' });
  if (m.NotificacionPlantilla && m.CanalTipo) m.NotificacionPlantilla.belongsTo(m.CanalTipo, { foreignKey: 'canal_id', as: 'canal' });

  if (m.PushToken && m.User) m.PushToken.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });
  if (m.PushToken && m.ProveedorTipo) m.PushToken.belongsTo(m.ProveedorTipo, { foreignKey: 'proveedor_id', as: 'proveedor' });

    // ===== Módulo 11: Chat =====
  // Catálogos
  if (m.ChatCanal && m.ChatCanalTipo) m.ChatCanal.belongsTo(m.ChatCanalTipo, { foreignKey: 'tipo_id', as: 'canalTipo' });
  if (m.ChatCanalMiembro && m.ChatRolTipo) m.ChatCanalMiembro.belongsTo(m.ChatRolTipo, { foreignKey: 'rol_id', as: 'rol' });

  // ChatCanal ↔ otras entidades
  if (m.ChatCanal && m.Celula) m.ChatCanal.belongsTo(m.Celula, { foreignKey: 'celula_id', as: 'celula' });
  if (m.ChatCanal && m.Cliente) m.ChatCanal.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  if (m.ChatCanal && m.User)   m.ChatCanal.belongsTo(m.User,   { foreignKey: 'created_by_user_id', as: 'createdBy' });

  // Membresía
  if (m.ChatCanal && m.ChatCanalMiembro) {
    m.ChatCanal.hasMany(m.ChatCanalMiembro, { foreignKey: 'canal_id', as: 'miembros' });
    m.ChatCanalMiembro.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' });
  }
  if (m.ChatCanalMiembro && m.User)   m.ChatCanalMiembro.belongsTo(m.User,   { foreignKey: 'user_id', as: 'user' });
  if (m.ChatCanalMiembro && m.Feder)  m.ChatCanalMiembro.belongsTo(m.Feder,  { foreignKey: 'feder_id', as: 'feder' });
  if (m.ChatCanalMiembro && m.ChatMensaje)
    m.ChatCanalMiembro.belongsTo(m.ChatMensaje, { foreignKey: 'last_read_msg_id', as: 'lastReadMsg' });

  // Mensajes
  if (m.ChatMensaje && m.ChatCanal) m.ChatMensaje.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' });
  if (m.ChatCanal && m.ChatMensaje) m.ChatCanal.hasMany(m.ChatMensaje, { foreignKey: 'canal_id', as: 'mensajes' });

  if (m.ChatMensaje && m.User)   m.ChatMensaje.belongsTo(m.User,   { foreignKey: 'user_id', as: 'autor' });
  if (m.ChatMensaje && m.Feder)  m.ChatMensaje.belongsTo(m.Feder,  { foreignKey: 'feder_id', as: 'feder' });

  // Hilos (self)
  if (m.ChatMensaje) {
    m.ChatMensaje.belongsTo(m.ChatMensaje, { foreignKey: 'parent_id', as: 'parent' });
    m.ChatMensaje.hasMany(m.ChatMensaje, { foreignKey: 'parent_id', as: 'replies' });
  }

  // Ediciones / reacciones / adjuntos
  if (m.ChatMensajeEditHist && m.ChatMensaje) {
    m.ChatMensajeEditHist.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatMensajeEditHist, { foreignKey: 'mensaje_id', as: 'edits' });
  }
  if (m.ChatReaccion && m.ChatMensaje) {
    m.ChatReaccion.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatReaccion, { foreignKey: 'mensaje_id', as: 'reacciones' });
  }
  if (m.ChatReaccion && m.User) m.ChatReaccion.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  if (m.ChatAdjunto && m.ChatMensaje) {
    m.ChatAdjunto.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatAdjunto, { foreignKey: 'mensaje_id', as: 'adjuntos' });
  }

  // Referencias cruzadas y previews
  if (m.ChatMensajeRef && m.ChatMensaje) m.ChatMensajeRef.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
  if (m.ChatMensajeRef && m.Tarea) m.ChatMensajeRef.belongsTo(m.Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
  if (m.ChatMensajeRef && m.Evento) m.ChatMensajeRef.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' });
  if (m.ChatMensajeRef && m.Ausencia) m.ChatMensajeRef.belongsTo(m.Ausencia, { foreignKey: 'ausencia_id', as: 'ausencia' });
  if (m.ChatMensajeRef && m.AsistenciaRegistro) m.ChatMensajeRef.belongsTo(m.AsistenciaRegistro, { foreignKey: 'asistencia_registro_id', as: 'asistenciaRegistro' });
  if (m.ChatMensajeRef && m.Cliente) m.ChatMensajeRef.belongsTo(m.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  if (m.ChatMensajeRef && m.Celula) m.ChatMensajeRef.belongsTo(m.Celula, { foreignKey: 'celula_id', as: 'celula' });
  if (m.ChatMensajeRef && m.Feder) m.ChatMensajeRef.belongsTo(m.Feder, { foreignKey: 'feder_id', as: 'feder' });

  if (m.ChatLinkPreview && m.ChatMensaje) {
    m.ChatLinkPreview.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
    m.ChatMensaje.hasMany(m.ChatLinkPreview, { foreignKey: 'mensaje_id', as: 'linkPreviews' });
  }

  // Receipts / delivery / guardados / pins
  if (m.ChatReadReceipt && m.ChatMensaje) m.ChatReadReceipt.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
  if (m.ChatReadReceipt && m.User) m.ChatReadReceipt.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  if (m.ChatDelivery && m.ChatMensaje) m.ChatDelivery.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
  if (m.ChatDelivery && m.User) m.ChatDelivery.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  if (m.ChatSavedMessage && m.ChatMensaje) m.ChatSavedMessage.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
  if (m.ChatSavedMessage && m.User) m.ChatSavedMessage.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  if (m.ChatPin && m.ChatCanal) m.ChatPin.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' });
  if (m.ChatPin && m.ChatMensaje) m.ChatPin.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });
  if (m.ChatPin && m.User) m.ChatPin.belongsTo(m.User, { foreignKey: 'pinned_by_user_id', as: 'pinnedBy' });

  // Seguimiento de hilos
  if (m.ChatThreadFollow && m.ChatMensaje) m.ChatThreadFollow.belongsTo(m.ChatMensaje, { foreignKey: 'root_msg_id', as: 'rootMsg' });
  if (m.ChatThreadFollow && m.User) m.ChatThreadFollow.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

  // Invitaciones
  if (m.ChatInvitacion && m.ChatCanal) m.ChatInvitacion.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' });
  if (m.ChatInvitacion && m.User) {
    m.ChatInvitacion.belongsTo(m.User, { foreignKey: 'invited_by_user_id', as: 'invitedBy' });
    m.ChatInvitacion.belongsTo(m.User, { foreignKey: 'invited_user_id', as: 'invitedUser' });
  }

  // Meetings y vínculo con Calendario
  if (m.ChatMeeting && m.ChatCanal) m.ChatMeeting.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' });
  if (m.ChatMeeting && m.User) m.ChatMeeting.belongsTo(m.User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
  if (m.ChatMeeting && m.Evento) m.ChatMeeting.belongsTo(m.Evento, { foreignKey: 'evento_id', as: 'evento' });
  if (m.ChatMeeting && m.ChatMensaje) m.ChatMeeting.belongsTo(m.ChatMensaje, { foreignKey: 'mensaje_id', as: 'mensaje' });

  // Presencia & Typing
  if (m.ChatPresence && m.User) m.ChatPresence.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });
  if (m.ChatTyping && m.ChatCanal) m.ChatTyping.belongsTo(m.ChatCanal, { foreignKey: 'canal_id', as: 'canal' });
  if (m.ChatTyping && m.User) m.ChatTyping.belongsTo(m.User, { foreignKey: 'user_id', as: 'user' });

}

