import { useState, useEffect } from 'react'
import { Upload, FileText, Trash2, Download, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function UploadContratos({ pessoaId, pessoaNome, tipoPessoa }) {
  const { user } = useAuth()
  const [arquivos, setArquivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [semestre, setSemestre] = useState('2025.1')

  async function fetchArquivos() {
    setLoading(true)
    const { data } = await supabase
      .from('uploads_arquivos')
      .select('*')
      .eq('pessoa_id', pessoaId)
      .eq('tipo_pessoa', tipoPessoa)
      .order('created_at', { ascending: false })
    setArquivos(data || [])
    setLoading(false)
  }

  useEffect(() => { if (pessoaId) fetchArquivos() }, [pessoaId])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Apenas arquivos PDF são aceitos!'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 10MB.'); return }

    setUploading(true)
    try {
      const nomeArquivo = `${tipoPessoa}/${pessoaId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('eduhr')
        .upload(nomeArquivo, file, { contentType: 'application/pdf', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('eduhr').getPublicUrl(nomeArquivo)

      await supabase.from('uploads_arquivos').insert({
        tipo_pessoa: tipoPessoa,
        pessoa_id: pessoaId,
        pessoa_nome: pessoaNome,
        tipo_documento: 'Contrato',
        nome_arquivo: file.name,
        url_arquivo: urlData.publicUrl,
        tamanho_bytes: file.size,
        mime_type: file.type,
        semestre,
        uploaded_by: user?.email || 'RH',
      })

      toast.success('Contrato enviado com sucesso!')
      fetchArquivos()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(arquivo) {
    if (!confirm(`Excluir o arquivo "${arquivo.nome_arquivo}"?`)) return
    try {
      const path = arquivo.url_arquivo.split('/eduhr/')[1]
      await supabase.storage.from('eduhr').remove([path])
      await supabase.from('uploads_arquivos').delete().eq('id', arquivo.id)
      toast.success('Arquivo excluído!')
      fetchArquivos()
    } catch {
      toast.error('Erro ao excluir arquivo.')
    }
  }

  function formatBytes(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  const SEMESTRES = ['2024.2', '2025.1', '2025.2', '2026.1', '2026.2']

  return (
    <div>
      {/* Upload */}
      <div style={{
        border: '2px dashed var(--gray-200)', borderRadius: 10,
        padding: 20, textAlign: 'center', marginBottom: 16,
        background: uploading ? 'var(--blue-light)' : 'var(--gray-50)',
        transition: 'all .15s'
      }}>
        <Upload size={24} color="var(--gray-400)" style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 10 }}>
          Arraste um contrato PDF ou clique para selecionar
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--gray-500)' }}>Semestre:</label>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
              value={semestre}
              onChange={e => setSemestre(e.target.value)}
            >
              {SEMESTRES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', background: 'var(--blue)', color: 'white',
          borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500,
          opacity: uploading ? .6 : 1
        }}>
          <Upload size={13} />
          {uploading ? 'Enviando...' : 'Selecionar PDF'}
          <input
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8 }}>
          Apenas PDF · Máximo 10MB
        </p>
      </div>

      {/* Lista de arquivos */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <div className="spinner" />
        </div>
      ) : arquivos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)', fontSize: 13 }}>
          Nenhum contrato enviado ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {arquivos.map(arq => (
            <div key={arq.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: 'white',
              border: '1px solid var(--gray-200)', borderRadius: 8
            }}>
              <FileText size={20} color="var(--red)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {arq.nome_arquivo}
                </p>
                <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                  {arq.semestre && <span className="badge badge-blue" style={{ fontSize: 10, marginRight: 6 }}>{arq.semestre}</span>}
                  {formatBytes(arq.tamanho_bytes)} · Enviado em {formatDate(arq.created_at)} por {arq.uploaded_by}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <a
                  href={arq.url_arquivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  title="Visualizar"
                >
                  <Eye size={12} />
                </a>
                <a
                  href={arq.url_arquivo}
                  download={arq.nome_arquivo}
                  className="btn btn-sm"
                  title="Baixar"
                >
                  <Download size={12} />
                </a>
                <button
                  className="btn btn-sm"
                  style={{ color: 'var(--red)' }}
                  onClick={() => handleDelete(arq)}
                  title="Excluir"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
