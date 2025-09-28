// /frontend/src/components/profile/FederProfileDrawer/parts/AvatarUpload.jsx
import { useRef, useState } from 'react'
import { FaCamera } from 'react-icons/fa'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './AvatarUpload.scss'

export default function AvatarUpload({ federId, src, alt, onUpdated }){
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

  const pick = () => inputRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('El archivo debe ser una imagen'); return }
    if (file.size > 6 * 1024 * 1024) { toast.error('Máximo 6MB'); return }

    setUploading(true)
    try {
      const updatedFeder = await federsApi.uploadAvatar(federId, file)
      toast.success('Avatar actualizado')
      try {
        window.dispatchEvent(new CustomEvent('fh:push', { detail: { type:'feders.avatar.updated', feder_id: federId, feder: updatedFeder } }))
      } catch {}
      onUpdated?.()
    } catch (e) {
      const msg = e?.error || e?.message || 'Error subiendo avatar'
      toast.error(msg)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="avaWrap">
      <img className="ava" src={src} alt={alt || 'Avatar'} />
      <button type="button" className="uploadBtn" onClick={pick} title="Cambiar avatar" disabled={uploading}>
        <FaCamera />
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} aria-label="Subir avatar" />
      </button>
    </div>
  )
}
