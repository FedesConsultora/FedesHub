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
  box-shadow: 0 8px 20px rgba(${color === colors.primary ? '77, 208, 225' : (color === colors.success ? '34, 197, 94' : '239, 68, 68')}, 0.3);
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

// Helpers para visualización de fechas y períodos
const formatDateLong = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T12:00:00');
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'long' });
  const rest = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${rest}`;
};

const formatAbsencePeriod = (ausencia) => {
  if (!ausencia?.fecha_desde) return 'Período no especificado';

  const isSameDay = ausencia.fecha_desde === ausencia.fecha_hasta;
  const fromStr = formatDateLong(ausencia.fecha_desde);

  let suffix = '';
  if (ausencia.unidad_codigo === 'hora') {
    suffix = ` (${ausencia.duracion_horas} hs)`;
  } else if (ausencia.es_medio_dia) {
    suffix = ` (Medio día - ${ausencia.mitad_dia_id === 1 ? 'Mañana' : 'Tarde'})`;
  } else if (isSameDay) {
    suffix = ' (Todo el día)';
  }

  if (isSameDay) return `${fromStr}${suffix}`;

  return `${fromStr} al ${formatDateLong(ausencia.fecha_hasta)}${suffix}`;
};

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

  tarea_asignada: ({ tarea, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Nueva Asignación</div>
      <h2 style="margin: 0 0 12px; font-size: 26px; font-weight: 800; color: ${colors.text}; line-height: 1.25;">${tarea?.titulo || 'Nueva tarea'}</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${tarea?.tipo ? `<span style="${badgeStyle(colors.primary)}">${tarea.tipo}</span>` : ''}
        ${tarea?.cliente?.nombre ? `<span style="${badgeStyle(colors.muted)}">📋 ${tarea.cliente.nombre}</span>` : ''}
      </div>
    </div>
    <a href="${link}" style="${buttonStyle()}">Ver detalles</a>
  `),

  tarea_comentario: ({ tarea, comentario, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">💬 Nuevo Comentario</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text}; letter-spacing: -0.02em;">${tarea?.titulo || 'Tarea actualización'}</h2>
      <div style="color: ${colors.muted}; font-size: 14px;">En el cliente <strong>${tarea?.cliente?.nombre || 'General'}</strong></div>
    </div>
    <div style="background: ${colors.card}; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.05);">
       <div style="color: ${colors.text}; font-size: 16px; line-height: 1.6;">${comentario?.cuerpo || ''}</div>
       <div style="margin-top: 16px; color: ${colors.muted}; font-size: 12px;">Por: <strong>${comentario?.autor || 'Sistema'}</strong></div>
    </div>
    <a href="${link}" style="${buttonStyle()}">Ver tarea completa</a>
  `),

  chat_mencion: ({ canal, mensaje, autor, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">🔔 Te mencionaron en el chat</div>
      <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 800; color: ${colors.text};">En #${canal?.nombre || 'canal'}</h2>
    </div>
    <div style="background: ${colors.card}; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.05);">
       <div style="color: ${colors.text}; font-size: 15px; line-height: 1.6; font-style: italic;">"${mensaje}"</div>
       <div style="margin-top: 16px; color: ${colors.muted}; font-size: 12px;">— ${autor || 'Sistema'}</div>
    </div>
    <a href="${link}" style="${buttonStyle()}">Ir a la conversación</a>
  `),

  asistencia_recordatorio: ({ link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.warning}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">⏰ Asistencia</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">¡No olvides registrarte!</h2>
    </div>
    <div style="margin: 24px 0; color: ${colors.muted}; font-size: 15px; line-height: 1.6;">
      No hemos detectado un registro de entrada o salida reciente. Recuerda que es importante mantener tu asistencia al día.
    </div>
    <a href="${link}" style="${buttonStyle(colors.warning)}">Ir a Asistencia</a>
  `),

  evento_nuevo: ({ evento, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">📅 Nuevo Evento</div>
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: ${colors.text};">${evento?.titulo || 'Invitación'}</h2>
    </div>
    <div style="background: ${colors.card}; padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.05);">
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Cuándo</div>
        <div style="color: ${colors.text}; font-weight: 600; font-size: 16px;">📅 ${evento?.starts_at ? new Date(evento.starts_at).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' }) : '-'}</div>
      </div>
    </div>
    <a href="${link}" style="${buttonStyle()}">Ver en Calendario</a>
  `),

  ausencia_aprobada: ({ ausencia, approver_nombre, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.success}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">✅ Ausencia Aprobada</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">Tu solicitud fue aprobada</h2>
    </div>
    
    <div style="background: rgba(34, 197, 94, 0.05); border-left: 4px solid ${colors.success}; padding: 24px; border-radius: 12px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; font-size: 18px; color: ${colors.text}; font-weight: 700;">${ausencia?.tipo_nombre || 'Ausencia'}</h3>
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Fecha / Período</div>
        <div style="color: ${colors.text}; font-weight: 600; font-size: 16px;">📅 ${formatAbsencePeriod(ausencia)}</div>
      </div>
      ${approver_nombre ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
          <p style="margin: 0; color: ${colors.muted}; font-size: 13px;">Aprobado por: <strong>${approver_nombre}</strong></p>
        </div>
      ` : ''}
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.success)}">Ver en FedesHub</a>
  `),

  ausencia_rechazada: ({ ausencia, rechazador_nombre, motivo, link }) => baseLayout(`
    <div style="margin-bottom: 24px;">
      <div style="font-size: 13px; color: ${colors.danger}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">❌ Ausencia Rechazada</div>
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: 800; color: ${colors.text};">Solicitud no aprobada</h2>
    </div>
    
    <div style="background: rgba(239, 68, 68, 0.05); border-left: 4px solid ${colors.danger}; padding: 24px; border-radius: 12px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; font-size: 18px; color: ${colors.text}; font-weight: 700;">${ausencia?.tipo_nombre || 'Ausencia'}</h3>
      <div style="margin-bottom: 24px;">
        <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Período solicitado</div>
        <div style="color: ${colors.text}; font-weight: 600; font-size: 16px;">📅 ${formatAbsencePeriod(ausencia)}</div>
      </div>
      
      <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.05);">
        <div style="font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Motivo del rechazo</div>
        <p style="margin: 0; color: ${colors.text}; font-size: 15px; line-height: 1.6; font-style: italic;">"${motivo || 'No se especificó un motivo.'}"</p>
      </div>

      ${rechazador_nombre ? `
        <p style="margin: 20px 0 0; color: ${colors.muted}; font-size: 13px;">Procesado por: <strong>${rechazador_nombre}</strong></p>
      ` : ''}
    </div>
    
    <a href="${link}" style="${buttonStyle(colors.danger)}">Ver detalles en FedesHub</a>
  `)
};
