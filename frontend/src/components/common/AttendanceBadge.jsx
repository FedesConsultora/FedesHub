import { FaHome, FaBuilding, FaCircle } from 'react-icons/fa'
import './AttendanceBadge.scss'

/**
 * Renders a small attendance status icon (home/office)
 * - Green icon: checked in (home or office)
 * - Red dot icon: not checked in (offline)
 * @param {string} modalidad - 'oficina' | 'remoto' | null
 * @param {number} size - Icon size in px (default: 14)
 */
export default function AttendanceBadge({ modalidad, size = 14, inline = false }) {
    const isActive = !!modalidad

    // Icon selection: Home for remote, Building for office, Circle (dot) for offline
    const Icon = modalidad === 'remoto'
        ? FaHome
        : modalidad === 'oficina'
            ? FaBuilding
            : FaCircle

    const title = modalidad === 'remoto'
        ? 'Trabajando desde casa'
        : modalidad === 'oficina'
            ? 'En la oficina'
            : 'Sin registrar entrada (Offline)'

    return (
        <span
            className={`attendance-badge ${isActive ? 'is-active' : 'is-offline'} ${inline ? 'is-inline' : ''}`}
            title={title}
            style={{ '--badge-size': `${size}px` }}
        >
            <Icon style={!isActive ? { fontSize: '0.6em' } : {}} />
        </span>
    )
}