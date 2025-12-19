import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthCtx } from '../../context/AuthContext'
import useFederCatalog from '../../hooks/useFederCatalog'
import FederProfileDrawer from '../../components/profile/FederProfileDrawer/FederProfileDrawer.jsx'

export default function FederDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, hasPerm } = useAuthCtx()
    const { catalog } = useFederCatalog(null)

    const federId = Number(id)
    const isSelf = user?.feder_id === federId
    const canEditCargo = hasPerm('feders', 'update')

    // El drawer se encarga de la carga y el scroll lock
    const [open, setOpen] = useState(true)

    const handleClose = () => {
        setOpen(false)
        navigate(-1)
    }

    if (!id) return null

    return (
        <FederProfileDrawer
            open={open}
            federId={federId}
            onClose={handleClose}
            catalog={catalog}
            isSelf={isSelf}
            canEditCargo={canEditCargo}
        />
    )
}
