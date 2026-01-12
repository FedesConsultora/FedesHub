import { FaHome, FaBuilding, FaCircle } from 'react-icons/fa'
import './AttendanceBadge.scss'

/**
 * Renders a small attendance status icon (home/office)
 * - Green icon: checked in (home or office)
 * - Red icon: not checked in (showing planned modality)
 * @param {string} modalidad - 'oficina' | 'remoto' | null (active check-in)
 * @param {string} plan - 'oficina' | 'remoto' | null (planned modality)
 * @param {number} size - Icon size in px (default: 14)
 */
export default function AttendanceBadge({ modalidad, plan, size = 14, inline = false }) {
    console.log('[AttendanceBadge] Rendering:', { modalidad, plan, size, inline });

    const isActive = !!modalidad
    const effectiveModalidad = modalidad || plan

    // Icon selection: Home for remote, Building for office, Circle (dot) for fallback
    const Icon = effectiveModalidad === 'remoto'
        ? FaHome
        : effectiveModalidad === 'oficina'
            ? FaBuilding
            : FaCircle

    const title = isActive
        ? (modalidad === 'remoto' ? 'Trabajando desde casa' : 'En la oficina')
        : (plan
            ? `Pendiente de ingreso: ${plan === 'remoto' ? 'Home Office' : 'Oficina'}`
            : 'Sin registrar entrada (Offline)')

    return (
        <span
            className={`attendance-badge ${isActive ? 'is-active' : 'is-offline'} ${inline ? 'is-inline' : ''}`}
            title={title}
            style={{ '--badge-size': `${size}px` }}
        >
            <Icon style={!effectiveModalidad ? { fontSize: '0.6em' } : {}} />
        </span>
    )
}