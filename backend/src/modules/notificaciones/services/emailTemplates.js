// /backend/src/modules/notificaciones/services/emailTemplates.js

// Plantillas HTML (fallback en código) estilo FedesHub moderno
const colors = {
  primary: '#4dd0e1',     // Cyan/turquesa característico de FedesHub
  background: '#0c1118',  // Fondo oscuro principal
  card: '#1a1f2e',        // Color de cards
  text: '#e8f0ff',        // Texto claro
  muted: '#a9b7c7',       // Texto secundario
  white: '#ffffff',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b'
};

const baseLayout = (content) => `
  <div style="background: linear-gradient(135deg, #0a0e14 0%, #1a1f2e 100%); padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: ${colors.text}; min-height: 100vh;">
    <div style="max-width: 600px; margin: 0 auto;">
      <!-- Header con gradiente -->
      <div style="background: linear-gradient(135deg, ${colors.primary} 0%, #3ea9b8 100%); padding: 24px 32px; border-radius: 16px 16px 0 0; box-shadow: 0 10px 40px rgba(77, 208, 225, 0.2);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
            <div style="width: 20px; height: 20px; border: 3px solid white; border-radius: 6px; opacity: 0.9;"></div>
          </div>
          <div>
            <div style="font-weight: 800; font-size: 22px; color: white; letter-spacing: -0.02em;">FedesHub</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.1em;">Sistema de Gestión</div>
          </div>
        </div>
      </div>
      
      <!-- Card principal con glassmorphism -->
      <div style="background: rgba(26, 31, 46, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(77, 208, 225, 0.1); border-radius: 0 0 16px 16px; padding: 32px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);">
        ${content}
      </div>
      
      <!-- Footer minimalista -->
      <div style="margin-top: 24px; padding: 20px; text-align: center; font-size: 12px; color: ${colors.muted}; border-top: 1px solid rgba(77, 208, 225, 0.1);">
        <p style="margin: 0 0 8px 0;">Recibiste este correo porque tienes notificaciones activas en FedesHub.</p>
        <p style="margin: 0; opacity: 0.7;">© ${new Date().getFullYear()} Fedes Consultora · Gestión Inteligente</p>
      </div>
    </div>
  </div>
`;

const buttonStyle = (color = colors.primary) => `
  display: inline-block;
  background: ${color};
  color: white;
  padding: 14px 28px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  box-shadow: 0 8px 20px rgba(77, 208, 225, 0.3);
  transition: all 0.2s ease;
  margin-top: 20px;
`;

const badgeStyle = (color = colors.muted) => `
  display: inline-block;
  padding: 6px 12px;
  background: ${color}22;
  color: ${color};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const templates = {
  confirmEmail: ({ name, link }) => baseLayout(`
    <h2 style="margin: 0 0 16px; font-size: 26px; font-weight: 800; color: ${colors.text};">¡Hola ${name || 'Fede'}!</h2>
    <p style="color: ${colors.muted}; line-height: 1.6; margin: 0 0 20px;">Confirmá tu correo electrónico para empezar a usar todas las funcionalidades de FedesHub.</p>
    <a href="${link}" style="${buttonStyle()}">Confirmar Email</a>
  `),

  resetPassword: ({ name, link }) => baseLayout(`
    <h2 style="margin: 0 0 16px; font-size: 26px; font-weight: 800; color: ${colors.text};">Recuperación de contraseña</h2>
    <p style="color: ${colors.muted}; line-height: 1.6; margin: 0 0 12px;">Hola ${name || ''}, recibimos un pedido para resetear tu contraseña en FedesHub.</p>
    <p style="color: ${colors.muted}; line-height: 1.6; margin: 0 0 20px;">Si no solicitaste este cambio, podés ignorar este mensaje.</p>
    <a href="${link}" style="${buttonStyle()}">Cambiar Contraseña</a>
    <p style="color: ${colors.muted}; font-size: 12px; margin: 20px 0 0; opacity: 0.7;">Este link expira en 1 hora por seguridad.</p>
  `),

  // ---- Tareas ----
  tarea_asignada: ({ tarea, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Nueva Asignación</div>
      <h2 style="margin: 0 0 12px; font-size: 26px; font-weight: 800; color: ${colors.text}; line-height: 1.25;">${tarea?.titulo || 'Nueva tarea'}</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${tarea?.tipo ? `<span style="${badgeStyle(colors.primary)}">${tarea.tipo}</span>` : ''}
        ${tarea?.cliente?.nombre ? `<span style="${badgeStyle(colors.muted)}">📋 ${tarea.cliente.nombre}</span>` : ''}
      </div>
    </div>
    
    <div style="background: rgba(26, 31, 46, 0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 30px;">
      ${tarea?.descripcion ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Descripción</div>
          <p style="margin: 0; color: ${colors.text}; line-height: 1.6; font-size: 15px;">${tarea.descripcion}</p>
        </div>
      ` : ''}

      <div style="display: flex; gap: 30px;">
        <div>
          <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Deadline</div>
          <div style="color: ${tarea?.vencimiento ? (new Date(tarea.vencimiento) < new Date() ? colors.danger : colors.text) : colors.muted}; font-weight: 600; font-size: 14px;">
            📅 ${tarea?.vencimiento ? new Date(tarea.vencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
          </div>
        </div>
        <div>
          <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Estado</div>
          <div style="color: ${colors.text}; font-weight: 600; font-size: 14px;">
            📌 ${tarea?.estado_nombre || 'Pendiente'}
          </div>
        </div>
      </div>
    </div>
    
    <a href="${link}" style="${buttonStyle()}">Abrir en FedesHub</a>
  `),

  tarea_comentario: ({ tarea, comentario, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Nuevo Comentario</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">${tarea?.titulo || 'Tarea'}</h2>
      <p style="color: ${colors.muted}; margin: 0; font-size: 14px;">
        ${tarea?.cliente?.nombre ? `Cliente: <strong>${tarea.cliente.nombre}</strong>` : ''}
      </p>
    </div>
    
    <div style="background: ${colors.card}; border: 1px solid rgba(77, 208, 225, 0.2); border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <div style="width: 32px; height: 32px; background: ${colors.primary}33; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">💬</div>
        <span style="color: ${colors.primary}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Han comentado:</span>
      </div>
      <p style="margin: 0; color: ${colors.text}; line-height: 1.6; font-size: 15px; font-style: italic;">"${(comentario || '').slice(0, 300)}${(comentario || '').length > 300 ? '...' : ''}"</p>
    </div>
    
    <a href="${link}" style="${buttonStyle()}">Ver conversación en FedesHub</a>
  `),

  tarea_vencimiento: ({ tarea, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.warning}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">⏰ Recordatorio de Vencimiento</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">¡Tu tarea está por vencer!</h2>
    </div>
    
    <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid ${colors.warning}33; border-radius: 16px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; font-size: 20px; color: ${colors.text}; font-weight: 700;">${tarea?.titulo || 'Tarea'}</h3>
      <div style="display: flex; gap: 24px;">
        <div>
          <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Cliente</div>
          <div style="color: ${colors.text}; font-weight: 600;">📋 ${tarea?.cliente?.nombre || 'General'}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Vence el</div>
          <div style="color: ${colors.warning}; font-weight: 700;">📅 ${tarea?.fecha_vencimiento ? new Date(tarea.fecha_vencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : 'Próximamente'}</div>
        </div>
      </div>
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.warning)}">Revisar Tarea</a>
  `),

  tarea_eliminada: ({ tarea, razon, eliminador }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.danger}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">🗑️ Tarea Eliminada</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">Tarea eliminada del sistema</h2>
      <p style="color: ${colors.muted}; margin: 0;">Te notificamos porque estabas asignado a esta tarea</p>
    </div>
    
    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid ${colors.danger}; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; font-size: 18px; color: ${colors.text};">${tarea?.titulo || 'Tarea'}</h3>
      ${tarea?.cliente?.nombre ? `<p style="margin: 0 0 8px; color: ${colors.muted};">Cliente: <strong>${tarea.cliente.nombre}</strong></p>` : ''}
      ${razon ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${colors.danger}33;">
          <p style="margin: 0 0 6px; color: ${colors.muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Razón de eliminación:</p>
          <p style="margin: 0; color: ${colors.text}; font-weight: 500;">${razon}</p>
        </div>
      ` : ''}
      ${eliminador ? `<p style="margin: 12px 0 0; color: ${colors.muted}; font-size: 13px;">Eliminado por: ${eliminador}</p>` : ''}
    </div>
    
    <p style="color: ${colors.muted}; font-size: 14px; margin: 20px 0 0; line-height: 1.6;">Esta tarea ya no está disponible en el sistema. Si tenés dudas sobre esta acción, contactá con tu supervisor.</p>
  `),

  tarea_cancelada: ({ tarea, motivo, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.warning}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">⚠️ Tarea Cancelada</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">${tarea?.titulo || 'Tarea'}</h2>
      <p style="color: ${colors.muted}; margin: 0; font-size: 14px;">
        ${tarea?.cliente?.nombre ? `Cliente: <strong>${tarea.cliente.nombre}</strong>` : ''}
      </p>
    </div>
    
    <div style="background: rgba(245, 158, 11, 0.05); border-left: 4px solid ${colors.warning}; padding: 24px; border-radius: 12px; margin: 24px 0;">
      <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Motivo de cancelación</div>
      <p style="margin: 0; color: ${colors.text}; font-weight: 600; line-height: 1.6; font-size: 15px;">${motivo || 'No se especificó un motivo.'}</p>
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.warning)}">Ver detalles en FedesHub</a>
  `),

  tarea_recordatorio: ({ tarea, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">⏰ Recordatorio de Tarea</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">Tenés un recordatorio pendiente</h2>
    </div>
    
    <div style="background: linear-gradient(135deg, rgba(77, 208, 225, 0.1) 0%, rgba(77, 208, 225, 0.05) 100%); border: 1px solid ${colors.primary}33; border-radius: 16px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; font-size: 20px; color: ${colors.text}; font-weight: 700;">${tarea?.titulo || 'Tarea'}</h3>
      <div style="display: flex; gap: 24px;">
        <div>
          <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Cliente</div>
          <div style="color: ${colors.text}; font-weight: 600;">📋 ${tarea?.cliente?.nombre || 'General'}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Estado</div>
          <div style="color: ${colors.primary}; font-weight: 700;">📌 ${tarea?.estado_nombre || 'Pendiente'}</div>
        </div>
      </div>
    </div>
    
    <a href="${link}" style="${buttonStyle()}">Abrir Tarea</a>
  `),

  asistencia_recordatorio: ({ feder, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.success}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">⏰ Recordatorio Diario</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">¡Hola ${feder?.nombre || ''}!</h2>
      <p style="color: ${colors.muted}; margin: 0; font-size: 16px;">¿Ya activaste tu asistencia hoy?</p>
    </div>
    
    <div style="background: linear-gradient(135deg, rgba(77, 208, 225, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%); border: 2px solid ${colors.success}44; border-radius: 16px; padding: 24px; margin: 24px 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">🟢</div>
      <p style="margin: 0 0 12px; color: ${colors.text}; font-size: 16px; font-weight: 600;">Recordá activar el punto verde</p>
      <p style="margin: 0; color: ${colors.muted}; font-size: 14px; line-height: 1.6;">
        Ingresá al Hub y hacé clic en el botón verde de la barra superior para registrar tu asistencia del día.
      </p>
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.success)}">Ir a FedesHub</a>
    
    <div style="background: rgba(77, 208, 225, 0.05); border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="margin: 0; color: ${colors.muted}; font-size: 13px; line-height: 1.6;">
        💡 <strong>Tip:</strong> El registro de asistencia es importante para el seguimiento de tu jornada laboral y es requisito para acceder a todas las funcionalidades del sistema.
      </p>
    </div>
  `),

  // ---- Chat ----
  chat_mencion: ({ canal, mensaje, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">💬 Mención en Chat</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">Te mencionaron en ${canal?.nombre || 'un canal'}</h2>
    </div>
    
    <div style="background: ${colors.card}; border: 1px solid rgba(77, 208, 225, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <div style="width: 32px; height: 32px; background: ${colors.primary}33; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px;">@</div>
        <span style="color: ${colors.primary}; font-size: 13px; font-weight: 600;">Mensaje</span>
      </div>
      <p style="margin: 0; color: ${colors.text}; line-height: 1.6;">${(mensaje || '').slice(0, 300)}${(mensaje || '').length > 300 ? '...' : ''}</p>
    </div>
    
    <a href="${link}" style="${buttonStyle()}">Abrir Chat</a>
  `),

  // ---- Calendario (mantener templates existentes con nuevo estilo) ----
  evento_invitacion: ({ evento, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">📅 Nueva Invitación</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">${evento?.titulo || 'Evento'}</h2>
      <p style="color: ${colors.muted}; margin: 0;">Has sido invitado a un evento</p>
    </div>
    
    <div style="background: ${colors.card}; border: 1px solid rgba(77, 208, 225, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 12px; color: ${colors.text}; font-size: 16px;"><strong>📍 ${new Date(evento?.starts_at || '').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
      <p style="margin: 0; color: ${colors.muted};">⏰ ${new Date(evento?.starts_at || '').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
      ${evento?.descripcion ? `<p style="margin: 16px 0 0; color: ${colors.muted}; line-height: 1.6;">${evento.descripcion}</p>` : ''}
    </div>
    
    <a href="${link}" style="${buttonStyle()}">Ver Evento</a>
  `),

  evento_actualizado: ({ evento, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.warning}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">📅 Evento Actualizado</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">${evento?.titulo || 'Evento'}</h2>
      <p style="color: ${colors.muted}; margin: 0;">Se han realizado cambios en este evento</p>
    </div>
    
    <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid ${colors.warning}; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px; color: ${colors.text}; font-size: 16px;"><strong>📍 ${new Date(evento?.starts_at || '').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
      <p style="margin: 0; color: ${colors.muted};">⏰ ${new Date(evento?.starts_at || '').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.warning)}">Ver Cambios</a>
  `),

  evento_cancelado: ({ evento, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.danger}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">📅 Evento Cancelado</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">${evento?.titulo || 'Evento'}</h2>
      <p style="color: ${colors.muted}; margin: 0;">Este evento ha sido cancelado</p>
    </div>
    
    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid ${colors.danger}; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px; color: ${colors.text}; font-size: 16px;"><strong>📍 ${new Date(evento?.starts_at || '').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
      <p style="margin: 0; color: ${colors.muted};">⏰ ${new Date(evento?.starts_at || '').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.danger)}">Ver Detalles</a>
  `),

  evento_removido: ({ evento, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.warning}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">📅 Cambio de Participación</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">Actualización de evento</h2>
      <p style="color: ${colors.muted}; margin: 0;">Has sido removido de: <strong>${evento?.titulo || 'Evento'}</strong></p>
    </div>
    
    <a href="${link}" style="${buttonStyle()}">Ver Calendario</a>
  `),

  evento_nuevo: ({ evento, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.success}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">📅 Nuevo Evento</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">${evento?.titulo || 'Evento'}</h2>
    </div>
    
    <div style="background: ${colors.card}; border: 1px solid rgba(77, 208, 225, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 12px; color: ${colors.text}; font-size: 16px;"><strong>📍 ${new Date(evento?.starts_at || '').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
      <p style="margin: 0; color: ${colors.muted};">⏰ ${new Date(evento?.starts_at || '').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.success)}">Ver Evento</a>
  `),

  evento_recordatorio: ({ evento, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">⏰ Recordatorio</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">${evento?.titulo || 'Evento'}</h2>
      <p style="color: ${colors.muted}; margin: 0;">Tu evento está próximo a comenzar</p>
    </div>
    
    <div style="background: linear-gradient(135deg, rgba(77, 208, 225, 0.1) 0%, rgba(77, 208, 225, 0) 100%); border: 2px solid ${colors.primary}44; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 12px; color: ${colors.text}; font-size: 18px; font-weight: 700;">📍 ${new Date(evento?.starts_at || '').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p style="margin: 0; color: ${colors.primary}; font-size: 20px; font-weight: 800;">⏰ ${new Date(evento?.starts_at || '').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
    
    <a href="${link}" style="${buttonStyle()}">Ver Detalles</a>
  `),

  evento_rsvp: ({ evento, rsvp, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.success}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">📅 Confirmación Registrada</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">RSVP Confirmado</h2>
      <p style="color: ${colors.muted}; margin: 0;">Tu respuesta: <strong>${rsvp || 'Confirmado'}</strong></p>
    </div>
    
    <div style="background: ${colors.card}; border: 1px solid rgba(77, 208, 225, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; font-size: 18px; color: ${colors.text};">${evento?.titulo || 'Evento'}</h3>
      <p style="margin: 0; color: ${colors.muted};">📍 ${new Date(evento?.starts_at || '').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · ⏰ ${new Date(evento?.starts_at || '').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.success)}">Ver Evento</a>
  `)
};
