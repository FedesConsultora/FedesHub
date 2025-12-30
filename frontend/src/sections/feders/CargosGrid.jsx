import { useMemo } from 'react'
import PersonTag from '../../components/PersonTag.jsx'
import './CargosGrid.scss'

export default function CargosGrid({ items = [] }) {
    // Agrupar por Ámbito
    const grouped = useMemo(() => {
        const map = {}
        for (const it of items) {
            const g = it.ambito_nombre || 'Otros'
            if (!map[g]) map[g] = []
            map[g].push(it)
        }
        return map
    }, [items])

    const ambitos = Object.keys(grouped).sort()

    return (
        <div className="fhCargosGroups">
            {ambitos.map(ambito => (
                <section key={ambito} className="ambitoSection">
                    <header className="ambitoHeader">
                        <h3>{ambito}</h3>
                        <span className="count">{grouped[ambito].length} cargos</span>
                    </header>

                    <div className="cargosGrid">
                        {grouped[ambito].map(cargo => (
                            <CargoCard key={cargo.id} cargo={cargo} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}

function CargoCard({ cargo }) {
    const people = cargo.people || []

    return (
        <div className="cargoCard">
            <div className="cargoInfo">
                <h4>{cargo.nombre}</h4>
                {cargo.descripcion && <p className="desc">{cargo.descripcion}</p>}
            </div>

            <div className="cargoPeople">
                <div className="peopleHeader">
                    <span className="label">Titulares</span>
                    <span className="val">{people.length}</span>
                </div>

                {people.length > 0 ? (
                    <div className="avatarsList">
                        {people.map(p => {
                            const person = {
                                id: p.id,
                                user_id: p.user_id,
                                nombre: p.nombre,
                                apellido: p.apellido,
                                avatar_url: p.avatar_url
                            }
                            return (
                                <div key={p.id} className="personItem">
                                    <PersonTag p={person} size="pill" />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="vacant">
                        <span>Sin titulares asignados</span>
                    </div>
                )}
            </div>
        </div>
    )
}
