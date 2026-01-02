SELECT ar.id, f.nombre, f.apellido, ar.check_in_at, ar.check_out_at, cm.codigo as motivo, ar.comentario 
FROM "AsistenciaRegistro" ar 
JOIN "Feder" f ON f.id = ar.feder_id 
LEFT JOIN "AsistenciaCierreMotivoTipo" cm ON cm.id = ar.cierre_motivo_id 
WHERE ar.check_out_at >= (NOW() - INTERVAL '12 hours')
ORDER BY ar.check_out_at DESC;
