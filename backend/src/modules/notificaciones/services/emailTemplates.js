// /backend/src/modules/notificaciones/services/emailTemplates.js

// Plantillas HTML (fallback en código) estilo OdontApp, pero adaptadas a FedesHub
const colors = {
  primary: '#145C63',
  light:   '#F3F4F6',
  dark:    '#1C1C1E',
  white:   '#ffffff',
  accent:  '#C1C1C1'
};

const baseLayout = (content) => `
  <div style="background:${colors.light};padding:24px 0;font-family:Inter,Arial,sans-serif;color:${colors.dark}">
    <div style="max-width:640px;margin:0 auto;background:${colors.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
      <div style="padding:20px 24px;background:${colors.primary};color:${colors.white};font-weight:600;font-size:18px">
        FedesHub
      </div>
      <div style="padding:24px">${content}</div>
      <div style="padding:16px 24px;font-size:12px;color:${colors.accent};border-top:1px solid #eee">
        Recibiste este correo porque tienes notificaciones activas en FedesHub.<br/>
        © ${new Date().getFullYear()} Fedes
      </div>
    </div>
  </div>
`;

export const templates = {
  confirmEmail: ({ name, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Hola ${name || '¡Fede!'}</h2>
    <p>Confirmá tu correo para empezar a usar FedesHub.</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:12px 16px;border-radius:8px;text-decoration:none;display:inline-block">Confirmar</a></p>
  `),

  resetPassword: ({ name, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Recuperación de contraseña</h2>
    <p>Hola ${name || ''}, recibimos un pedido para resetear tu contraseña.</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:12px 16px;border-radius:8px;text-decoration:none;display:inline-block">Cambiar contraseña</a></p>
  `),

  // ---- Plantillas FedesHub (ejemplos de NotificacionTipo por email) ----
  tarea_asignada: ({ tarea, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Nueva tarea asignada</h2>
    <p><strong>${tarea?.titulo}</strong></p>
    <p>Cliente: ${tarea?.cliente?.nombre ?? ''}</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Abrir tarea</a></p>
  `),

  tarea_comentario: ({ tarea, comentario, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Nuevo comentario en tarea</h2>
    <p><strong>${tarea?.titulo}</strong></p>
    <blockquote style="border-left:3px solid ${colors.accent};padding-left:12px;color:#555">${comentario}</blockquote>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Ver conversación</a></p>
  `),

  chat_mencion: ({ canal, mensaje, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Te mencionaron en ${canal?.nombre || 'un canal'}</h2>
    <blockquote style="border-left:3px solid ${colors.accent};padding-left:12px;color:#555">${mensaje}</blockquote>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Abrir chat</a></p>
  `),

  evento_recordatorio: ({ evento, link }) => baseLayout(`
    <h2 style="margin:0 0 12px">Recordatorio de reunión</h2>
    <p><strong>${evento?.titulo}</strong><br/>
    ${new Date(evento?.starts_at || '').toLocaleString()}</p>
    <p><a href="${link}" style="background:${colors.primary};color:${colors.white};padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">Ver evento</a></p>
  `)
};
