import { Construction } from 'lucide-react'

export default function EmConstrucao({ titulo }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{titulo}</h1>
      </div>
      <div className="card empty-state" style={{ padding: 60 }}>
        <Construction size={36} strokeWidth={1} color="var(--gray-400)" />
        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--gray-500)' }}>Módulo em construção — em breve!</p>
      </div>
    </div>
  )
}
