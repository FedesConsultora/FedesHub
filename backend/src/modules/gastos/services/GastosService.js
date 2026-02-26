import { initModels } from '../../../models/registry.js';
import { Op } from 'sequelize';
import path from 'node:path';
import { getUsersWithPermission } from '../../auth/repositories/user.repo.js';

const getModels = async () => await initModels();

export const GastosService = {
    async list({ feder_id, isDirectivo, filters = {} }) {
        const { Gasto, Feder, GastoAdjunto } = await getModels();
        const where = {};
        if (!isDirectivo) {
            where.feder_id = feder_id;
        } else if (filters.feder_id) {
            where.feder_id = filters.feder_id;
        }

        if (filters.estado) where.estado = filters.estado;
        if (filters.fecha_desde) where.fecha = { [Op.gte]: filters.fecha_desde };
        if (filters.fecha_hasta) where.fecha = { [Op.lte]: filters.fecha_hasta };

        return await Gasto.findAll({
            where,
            include: [
                { model: Feder, as: 'feder', attributes: ['id', 'nombre', 'apellido', 'avatar_url'] },
                { model: GastoAdjunto, as: 'adjuntos' }
            ],
            order: [['fecha', 'DESC'], ['created_at', 'DESC']]
        });
    },

    async getById(id, { feder_id, isDirectivo }) {
        const { Gasto, Feder, GastoAdjunto, GastoHistorial, User } = await getModels();
        const gasto = await Gasto.findByPk(id, {
            include: [
                { model: Feder, as: 'feder' },
                { model: GastoAdjunto, as: 'adjuntos' },
                {
                    model: GastoHistorial,
                    as: 'historial',
                    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }]
                },
                { model: User, as: 'aprobadoPor', attributes: ['id', 'email'] },
                { model: User, as: 'rechazadoPor', attributes: ['id', 'email'] },
                { model: User, as: 'reintegradoPor', attributes: ['id', 'email'] }
            ]
        });

        if (!gasto) throw new Error('Gasto no encontrado');
        if (!isDirectivo && gasto.feder_id !== feder_id) throw new Error('No tienes permiso para ver este gasto');

        return gasto;
    },

    async create(data, user_id, feder_id, files = []) {
        const { Gasto, GastoHistorial, GastoAdjunto, Feder } = await getModels();
        const gasto = await Gasto.create({ ...data, feder_id, estado: 'pendiente' });

        // Save adjuntos
        for (const file of files) {
            const relPath = path.relative(process.cwd(), file.path).replace(/\\/g, '/')
            await GastoAdjunto.create({
                gasto_id: gasto.id,
                nombre: file.originalname,
                mime_type: file.mimetype,
                size: file.size,
                url: relPath,
                subido_por_feder_id: feder_id
            });
        }

        await GastoHistorial.create({
            gasto_id: gasto.id,
            user_id,
            tipo_cambio: 'creacion',
            accion: 'created',
            valor_nuevo: gasto.toJSON(),
            descripcion: 'Gasto registrado'
        });

        // 🔔 Notificar a GastoManagers
        try {
            const { svcCreate } = await import('../../notificaciones/services/notificaciones.service.js');
            const managers = await getUsersWithPermission('gastos', 'manage');
            const feder = await Feder.findByPk(feder_id);

            if (managers.length > 0) {
                await svcCreate({
                    tipo_codigo: 'gasto_creado',
                    destinos: managers.map(m => m.id),
                    data: {
                        gasto_id: gasto.id,
                        feder_nombre: `${feder.nombre} ${feder.apellido}`,
                        monto: gasto.monto,
                        moneda: gasto.moneda,
                        fecha: gasto.fecha,
                        descripcion: gasto.descripcion
                    },
                    link_url: `/gastos/${gasto.id}`
                }, { id: user_id });
            }
        } catch (e) {
            console.error('[GastosService] Error enviando notificacion de gasto creado:', e);
        }

        // Reload with adjuntos
        return await Gasto.findByPk(gasto.id, {
            include: [{ model: GastoAdjunto, as: 'adjuntos' }]
        });
    },

    async update(id, data, user_id, { feder_id, isDirectivo, isGastoManager }) {
        const { Gasto, GastoHistorial } = await getModels();
        const gasto = await Gasto.findByPk(id);
        if (!gasto) throw new Error('Gasto no encontrado');

        // Solo el dueño o el GastoManager pueden editar. Directivos que no son GastoManager solo ven.
        if (!isGastoManager && gasto.feder_id !== feder_id) {
            throw new Error('No tienes permiso para editar este gasto');
        }

        // Si no es GastoManager, solo puede editar si está pendiente
        if (gasto.estado !== 'pendiente' && !isGastoManager) {
            throw new Error('No se puede editar un gasto que no está pendiente');
        }

        const anterior = gasto.toJSON();
        await gasto.update(data);
        const nuevo = gasto.toJSON();

        // Construir descripción detallada de cambios
        const cambios = [];
        if (data.monto && parseFloat(data.monto) !== parseFloat(anterior.monto)) {
            cambios.push(`monto: ${anterior.monto} -> ${data.monto}`);
        }
        if (data.moneda && data.moneda !== anterior.moneda) {
            cambios.push(`moneda: ${anterior.moneda} -> ${data.moneda}`);
        }
        if (data.fecha && data.fecha !== anterior.fecha) {
            cambios.push(`fecha: ${anterior.fecha.split('T')[0]} -> ${data.fecha}`);
        }
        if (data.descripcion && data.descripcion !== anterior.descripcion) {
            cambios.push(`descripción editada`);
        }

        const desc = cambios.length > 0 ? `Campos actualizados: ${cambios.join(', ')}` : 'Gasto actualizado (sin cambios en campos principales)';

        await GastoHistorial.create({
            gasto_id: gasto.id,
            user_id,
            tipo_cambio: 'edicion',
            accion: 'updated',
            valor_anterior: anterior,
            valor_nuevo: nuevo,
            descripcion: desc
        });

        return gasto;
    },

    async delete(id, { feder_id, isDirectivo, isGastoManager }) {
        const { Gasto } = await getModels();
        const gasto = await Gasto.findByPk(id);
        if (!gasto) throw new Error('Gasto no encontrado');

        // Solo el dueño o el GastoManager pueden eliminar
        if (!isGastoManager && gasto.feder_id !== feder_id) {
            throw new Error('No tienes permiso para eliminar este gasto');
        }

        // Si no es GastoManager, solo puede eliminar si está pendiente
        if (gasto.estado !== 'pendiente' && !isGastoManager) {
            throw new Error('No se puede eliminar un gasto que no está pendiente');
        }

        return await gasto.destroy();
    },

    async updateStatus(id, { estado, motivo }, user_id) {
        const { Gasto, GastoHistorial, Feder } = await getModels();
        const gasto = await Gasto.findByPk(id, { include: [{ model: Feder, as: 'feder' }] });
        if (!gasto) throw new Error('Gasto no encontrado');

        const anterior = gasto.estado;
        const updateData = { estado };

        if (estado === 'aprobado') {
            updateData.aprobado_por_user_id = user_id;
            updateData.aprobado_at = new Date();
        } else if (estado === 'rechazado') {
            updateData.rechazado_por_user_id = user_id;
            updateData.rechazado_at = new Date();
            updateData.rechazo_motivo = motivo;
        } else if (estado === 'reintegrado') {
            updateData.reintegrado_por_user_id = user_id;
            updateData.reintegrado_at = new Date();
        }

        await gasto.update(updateData);

        await GastoHistorial.create({
            gasto_id: gasto.id,
            user_id,
            tipo_cambio: 'estado',
            accion: 'status_change',
            valor_anterior: { estado: anterior },
            valor_nuevo: { estado, motivo },
            descripcion: `Estado cambiado de ${anterior} a ${estado}`
        });

        // 🔔 Notificar al dueño
        try {
            const { svcCreate } = await import('../../notificaciones/services/notificaciones.service.js');
            const tipoMap = {
                'aprobado': 'gasto_aprobado',
                'rechazado': 'gasto_rechazado',
                'reintegrado': 'gasto_reintegrado'
            };

            const tipo_codigo = tipoMap[estado];
            if (tipo_codigo && gasto.feder?.user_id) {
                await svcCreate({
                    tipo_codigo,
                    destinos: [gasto.feder.user_id],
                    data: {
                        gasto_id: gasto.id,
                        monto: gasto.monto,
                        moneda: gasto.moneda,
                        motivo: motivo || null,
                        actualizador_id: user_id
                    },
                    link_url: `/gastos/${gasto.id}`
                }, { id: user_id });
            }
        } catch (e) {
            console.error(`[GastosService] Error enviando notificacion de gasto ${estado}:`, e);
        }

        return gasto;
    },

    async getSummary({ feder_id, isDirectivo }) {
        const { Gasto } = await getModels();
        const where = {};
        if (!isDirectivo) where.feder_id = feder_id;

        const gastos = await Gasto.findAll({ where });

        const sumByEstado = (estado) => gastos
            .filter(g => g.estado === estado)
            .reduce((acc, g) => acc + parseFloat(g.monto), 0);

        return {
            total: gastos.reduce((acc, g) => acc + parseFloat(g.monto), 0),
            count: gastos.length,
            pendiente: gastos.filter(g => g.estado === 'pendiente').length,
            aprobado: gastos.filter(g => g.estado === 'aprobado').length,
            reintegrado: gastos.filter(g => g.estado === 'reintegrado').length,
            rechazado: gastos.filter(g => g.estado === 'rechazado').length,
            monto_pendiente: sumByEstado('pendiente'),
            monto_aprobado: sumByEstado('aprobado'),
            monto_reintegrado: sumByEstado('reintegrado'),
            monto_rechazado: sumByEstado('rechazado')
        };
    }
};
