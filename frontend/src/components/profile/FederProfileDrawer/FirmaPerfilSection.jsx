import { useCallback, useEffect, useMemo, useState } from 'react'
import { federsApi } from '../../../api/feders'
import { useToast } from '../../toast/ToastProvider.jsx'
import './FirmaPerfilSection.scss'

const norm = (s='') => s.replace(/\s+/g,' ').trim()
const initialsFromFull = (full='') => {
  const p = norm(full).split(' ').filter(Boolean)
  if (p.length === 0) return 'FP'
  if (p.length === 1) return (p[0][0]||'F') + (p[0][1]||'P')
  return (p[0][0]||'F') + (p[p.length-1][0]||'P')
}

/** SVG cursiva: por defecto blanca en fondo oscuro (preview app) */
function svgCursiva(fullName, { color='#ffffff', bg='#0b0f15', skew=-6 } = {}){
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 260" role="img" aria-label="Firma ${fullName}">
  ${bg ? `<rect x="0" y="0" width="860" height="260" rx="18" fill="${bg}"/>` : ''}
  <g transform="translate(40,160) skewX(${skew})">
    <text x="0" y="0"
      font-family="Pacifico, 'Great Vibes', 'Dancing Script', 'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive"
      font-size="108" font-weight="700"
      fill="${color}" stroke="${color}" stroke-opacity="0.18" stroke-width="1"
      style="paint-order: stroke fill; letter-spacing:.5px;">
      ${fullName}
    </text>
  </g>
</svg>`.trim()
}

/** SVG iniciales: por defecto blanco en fondo oscuro (preview app) */
function svgIniciales(initials, { color='#ffffff', bg='#0b0f15' } = {}){
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" role="img" aria-label="Iniciales ${initials}">
  ${bg ? `<rect x="0" y="0" width="640" height="220" rx="16" fill="${bg}"/>` : ''}
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
        font-family="ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, Inter"
        font-size="120" font-weight="900" fill="${color}">
    ${initials}
  </text>
</svg>`.trim()
}

export default function FirmaPerfilSection({ federId, federNombre, federApellido }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  // Un único input (como Odoo)
  const defaultFull = norm(`${federNombre||''} ${federApellido||''}`)
  const [fullName, setFullName] = useState(defaultFull)
  const [skew, setSkew] = useState(-6) // “curvatura/inclinación”

  // Derivados
  const initials = useMemo(() => initialsFromFull(fullName).toUpperCase(), [fullName])
  const svgCursivaPreview   = useMemo(() => svgCursiva(fullName || '—', { color:'#ffffff', bg:'#0b0f15', skew }), [fullName, skew])
  const svgInicialesPreview = useMemo(() => svgIniciales(initials,        { color:'#ffffff', bg:'#0b0f15' }), [initials])

  // Cargar (si más adelante querés traer una config previa)
  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null)
      await federsApi.getFirmaPerfil?.(federId) || await federsApi.getFirma?.(federId) // compat
    } catch (e) {
      setErr('No se pudo cargar la firma.')
    } finally { setLoading(false) }
  }, [federId])

  useEffect(()=>{ load() }, [load])
  useEffect(()=>{ setFullName(defaultFull) }, [defaultFull])

  // Utilidades export
  const copySvg = async (svg) => {
    try { await navigator.clipboard.writeText(svg); toast.success('SVG copiado') }
    catch { toast.error('No se pudo copiar el SVG') }
  }

  const downloadPng = async (svg, filename='firma.png', canvasFill=null) => {
    try {
      const blob = new Blob([svg], { type:'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        // auto detect viewBox
        const vb = /viewBox="([\d\s.]+)"/.exec(svg)?.[1]?.split(' ').map(Number) || [0,0,860,260]
        const w = Math.round(vb[2] * 2) // retina 2x
        const h = Math.round(vb[3] * 2)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (canvasFill){ ctx.fillStyle = canvasFill; ctx.fillRect(0,0,w,h) }
        ctx.drawImage(img, 0,0,w,h)
        URL.revokeObjectURL(url)
        const a = document.createElement('a')
        a.download = filename
        a.href = canvas.toDataURL('image/png')
        a.click()
      }
      img.onerror = () => { URL.revokeObjectURL(url); toast.error('No se pudo generar el PNG') }
      img.src = url
    } catch { toast.error('No se pudo generar el PNG') }
  }

  // Acciones
  const usarNombreDePerfil = () => setFullName(defaultFull)

  const onSave = async () => {
    const nombre = norm(fullName)
    if (!nombre) { toast.error('Completá el nombre completo'); return }

    // Guardamos AMBAS variantes como pediste
    const cursivaWhiteDarkBG = svgCursiva(nombre, { color:'#ffffff', bg:null, skew })     // fondo transparente, texto blanco
    const inicialesWhite     = svgIniciales(initials, { color:'#ffffff', bg:null })       // fondo transparente, texto blanco

    try {
      setSaving(true)
      const payload = {
        firma_textual: nombre,
        firma_cursiva_svg: cursivaWhiteDarkBG,  // ← nueva (si el backend no la tiene, la ignorará)
        firma_iniciales_svg: inicialesWhite,    // ← mantenemos este campo también
        is_activa: true
      }
      if (federsApi.saveFirmaPerfil) await federsApi.saveFirmaPerfil(federId, payload)
      else if (federsApi.upsertFirma) await federsApi.upsertFirma(federId, payload)
      else await federsApi.update(federId, payload) // fallback
      toast.success('Firma guardada')
    } catch (e) {
      toast.error(e?.error || 'No se pudo guardar la firma')
    } finally { setSaving(false) }
  }

  // Variantes de exportación
  const svgCursivaWhiteDark = useMemo(() => svgCursiva(fullName || '—', { color:'#ffffff', bg:'#0b0f15', skew }), [fullName, skew])
  const svgCursivaBlackPaper = useMemo(() => svgCursiva(fullName || '—', { color:'#111111', bg:null, skew }), [fullName, skew])
  const svgInicialesWhiteDark = useMemo(() => svgIniciales(initials, { color:'#ffffff', bg:'#0b0f15' }), [initials])
  const svgInicialesBlackPaper = useMemo(() => svgIniciales(initials, { color:'#111111', bg:null }), [initials])

  return (
    <section className="pfFirma card" aria-label="Firma de perfil">
      <div className="headRow">
        <h3>Firma de perfil</h3>
        <div className="tools">
          <button type="button" className="btn small" onClick={usarNombreDePerfil}>Usar nombre del perfil</button>
        </div>
      </div>

      {err && <div className="error" role="alert">{err}</div>}
      {loading ? <div className="muted">Cargando…</div> : (
        <>
          {/* Nombre completo */}
          <div className="field">
            <label htmlFor="firma-fullname" className="lbl">Nombre completo</label>
            <input
              id="firma-fullname"
              className="control"
              placeholder="Ej. Romina Albanesi"
              autoComplete="name"
              value={fullName}
              onChange={(e)=>setFullName(e.target.value)}
            />
            <div className="hint">Se usa para generar la firma cursiva (elegante) y las iniciales.</div>
          </div>

          {/* Solo inclinación (curvatura) */}
          <div className="optsRow">
            <div className="opt">
              <label htmlFor="firma-skew" className="lbl firma">Inclinación cursiva</label>
              <input id="firma-skew" type="range" min="-12" max="0" step="1" value={skew} onChange={e=>setSkew(Number(e.target.value))} />
              <span className="muted valTag">{skew}°</span>
            </div>
          </div>

          {/* Previews */}
          <div className="sigGrid">
            <div className="sigCard">
              <div className="sigHead">
                <span className="lbl">Firma cursiva</span>
                <div className="inlineBtns">
                  <button type="button" className="btn tiny" onClick={()=>copySvg(svgCursivaWhiteDark)}>Copiar SVG</button>
                  <button type="button" className="btn tiny" onClick={()=>downloadPng(svgCursivaWhiteDark, 'firma_cursiva_blanca.png', '#0b0f15')}>PNG blanco</button>
                  <button type="button" className="btn tiny" onClick={()=>downloadPng(svgCursivaBlackPaper, 'firma_cursiva_papel_negro.png', '#ffffff')}>PNG papel (negro)</button>
                </div>
              </div>
              <div className="svgWrap" dangerouslySetInnerHTML={{ __html: svgCursivaPreview }} />
            </div>

            <div className="sigCard">
              <div className="sigHead">
                <span className="lbl">Iniciales</span>
                <div className="inlineBtns">
                  <button type="button" className="btn tiny" onClick={()=>copySvg(svgInicialesWhiteDark)}>Copiar SVG</button>
                  <button type="button" className="btn tiny" onClick={()=>downloadPng(svgInicialesWhiteDark, 'firma_iniciales_blanca.png', '#0b0f15')}>PNG blanco</button>
                  <button type="button" className="btn tiny" onClick={()=>downloadPng(svgInicialesBlackPaper, 'firma_iniciales_papel_negro.png', '#ffffff')}>PNG papel (negro)</button>
                </div>
              </div>
              <div className="svgWrap initials" dangerouslySetInnerHTML={{ __html: svgInicialesPreview }} />
            </div>
          </div>

          <div className="rowEnd actions">
            <button type="button" className="cta" onClick={onSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar firma'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}