import './Pagination.scss'

export default function Pagination({ page, pageSize, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)))
  return (
    <div className="Pagination">
      <button onClick={() => onPage(page - 1)} disabled={page <= 0}>Anterior</button>
      <span>Página {page + 1} de {totalPages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page + 1 >= totalPages}>Siguiente</button>
    </div>
  )
}
