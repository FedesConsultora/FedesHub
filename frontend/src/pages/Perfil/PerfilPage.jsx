import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useMyFederId from '../../hooks/useMyFederId';
import useFederCatalog from '../../hooks/useFederCatalog';
import FederProfileDrawer from '../../components/profile/FederProfileDrawer/FederProfileDrawer.jsx';

export default function PerfilPage(){
  const nav = useNavigate()
  const { federId, loading } = useMyFederId()
  const { catalog } = useFederCatalog(null)
  const [ open, setOpen ] = useState(false)

  useEffect(() => { document.title = 'Perfil | FedesHub' }, [])
  useEffect(() => { if (federId) setOpen(true) }, [federId])

  const onClose = () => { setOpen(false); nav(-1) }

  if (loading) return <div style={{ padding:16 }}>Cargando tu perfil…</div>
  if (!federId) return <div style={{ padding:16 }}>No encontramos tu ficha de feder.</div>

  return (
    <FederProfileDrawer open={open} federId={federId} onClose={onClose} catalog={catalog} />
  )
}
