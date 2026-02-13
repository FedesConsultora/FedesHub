import { initModels } from '../../../models/registry.js';
import { Op } from 'sequelize';
import path from 'node:path';

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
        const { Gasto, GastoHistorial, GastoAdjunto } = await getModels();
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

        // Reload with adjuntos
        return await Gasto.findByPk(gasto.id, {
            include: [{ model: GastoAdjunto, as: 'adjuntos' }]
        });
    },

    async update(id, data, user_id, { feder_id, isDirectivo }) {
        const { Gasto, GastoHistorial } = await getModels();
        const gasto = await Gasto.findByPk(id);
        if (!gasto) throw new Error('Gasto no encontrado');
        if (!isDirectivo && gasto.feder_id !== feder_id) throw new Error('No tienes permiso para editar este gasto');
        if (gasto.estado !== 'pendiente' && !isDirectivo) throw new Error('No se puede editar un gasto que no está pendiente');

        const anterior = gasto.toJSON();
        await gasto.update(data);
        const nuevo = gasto.toJSON();

        await GastoHistorial.create({
            gasto_id: gasto.id,
            user_id,
            tipo_cambio: 'edicion',
            accion: 'updated',
            valor_anterior: anterior,
            valor_nuevo: nuevo,
            descripcion: 'Gasto actualizado'
        });

        return gasto;
    },

    async delete(id, { feder_id, isDirectivo }) {
        const { Gasto } = await getModels();
        const gasto = await Gasto.findByPk(id);
        if (!gasto) throw new Error('Gasto no encontrado');
        if (!isDirectivo && gasto.feder_id !== feder_id) throw new Error('No tienes permiso para eliminar este gasto');
        if (gasto.estado !== 'pendiente' && !isDirectivo) throw new Error('No se puede eliminar un gasto que no está pendiente');

        return await gasto.destroy();
    },

    async updateStatus(id, { estado, motivo }, user_id) {
        const { Gasto, GastoHistorial } = await getModels();
        const gasto = await Gasto.findByPk(id);
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
