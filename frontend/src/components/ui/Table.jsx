// /frontend/src/components/ui/Table.jsx

export default function Table({ columns = [], rows = [], keyField = 'id', empty = 'Sin datos' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={{textAlign:'left', padding:'8px 10px', borderBottom:'1px solid #233'}}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map(r => (
            <tr key={r[keyField]}>
              {columns.map(c => <td key={c.key} style={{padding:'8px 10px', borderBottom:'1px solid #182026'}}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} style={{padding:'12px'}}> {empty} </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
