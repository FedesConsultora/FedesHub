// /frontend/src/components/ui/formRow.jsx
export default function FormRow({ label, children }) {
  return (
    <label style={{display:'grid', gap:6, margin:'8px 0'}}>
      <span style={{fontSize:13, opacity:.8}}>{label}</span>
      {children}
    </label>
  )
}
