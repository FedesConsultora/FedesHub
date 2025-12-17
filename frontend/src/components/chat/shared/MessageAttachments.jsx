import './MessageAttachments.scss'
import AttachmentIcon from './AttachmentIcon'
import { resolveMediaUrl } from '../../../utils/media'
import { useLightbox } from '../../common/useLightbox'
import useShare from '../share/useShare'

export default function MessageAttachments({ items = [] }) {
  if (!items?.length) return null

  const images = items.filter(a => (a.mime_type || '').startsWith('image/'))
  const files  = items.filter(a => !(a.mime_type || '').startsWith('image/'))

  // Prep media para lightbox/share
  const media = images.map(a => ({
    url: resolveMediaUrl(a.file_url),     
    srcUrl: a.file_url,                   
    name: a.file_name || 'imagen',
    mime: a.mime_type || 'image/*'
  }))

  const { open: openShare, Modal: ShareModal } = useShare()
  const { open: openLb, Lightbox } = useLightbox({
    onForward: ({ items, selectedIndexes }) => openShare({ items, selectedIndexes })
  })

  return (
    <div className="attWrap">
      {!!images.length && (
        <>
          <div className={'imgBlock ' + (images.length === 1 ? 'cols-1' : images.length === 2 ? 'cols-2' : 'cols-3')}>
            {images.map((a, idx) => {
              const url = resolveMediaUrl(a.file_url)
              const alt = a.file_name || 'imagen'
              return (
                <button key={`img-${a.id || idx}`} className="imgCell" onClick={() => openLb(media, idx)} title="Ver imagen">
                  <img src={url} alt={alt} loading="lazy" />
                </button>
              )
            })}
          </div>
          <Lightbox />
          <ShareModal />
        </>
      )}

      {!!files.length && (
        <div className="fileList">
          {files.map((a, idx) => {
            const url = resolveMediaUrl(a.file_url)
            return (
              <a key={`file-${a.id || idx}`} className="fileRow" href={url} download={a.file_name || 'archivo'} rel="noreferrer" title={a.file_name || url}>
                <span className="ico"><AttachmentIcon mime={a.mime_type || ''} name={a.file_name || ''} /></span>
                <span className="name">{a.file_name || url}</span>
                {a.size_bytes ? <span className="muted">{formatSize(a.size_bytes)}</span> : null}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatSize(n) {
  if (!n) return ''
  const kb = n / 1024, mb = kb / 1024
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.ceil(kb)} KB`
}
