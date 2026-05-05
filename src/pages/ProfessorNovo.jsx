import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { saveProfessor } from '../hooks/useProfessores'

const TITULACOES = ['Especialista', 'Mestre', 'Doutor']
const PLANOS = ['PI', 'PII', 'PIII']
const VINCULOS = ['CLT', 'Contrato', 'Horista', 'PJ']
const REGIMES = ['Integral (40h)', 'Parcial (20h)', 'Horista', 'Outro']
const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável']
const TIPOS_SANG = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function ProfessorNovo() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ficha_numero: '', nome: '', cpf: '', rg: '', email: '',
    data_nascimento: '', data_admissao: '',
    estado_civil: '', tipo_sanguineo: '', naturalidade: '',
    nacionalidade: 'Brasileira', telefone: '',
    endereco: '', bairro: '', cidade: '', estado: 'MA', cep: '',
    titulacao: 'Especialista', plano: 'PI',
    area_atuacao: '', instituicao_formacao: '', lattes: '', registro_profissional: '',
    vinculo: 'CLT', regime_trabalho: 'Horista', curso_principal: '',
    valor_hora_teorica: '', valor_hora_pratica: '',
    banco: '', agencia: '', conta: '', pix: '',
    nome_pai: '', nome_mae: '', conjuge: '', dependentes: '',
    ativo: true,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.nome || !form.titulacao || !form.plano) {
      alert('Preencha os campos obrigatórios: Nome, Titulação e Plano.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      valor_hora_teorica: parseFloat(form.valor_hora_teorica) || null,
      valor_hora_pratica: parseFloat(form.valor_hora_pratica) || null,
    }
    const newId = await saveProfessor(payload)
    setSaving(false)
    if (newId) navigate(`/professores/${newId}`)
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <button className="btn btn-sm" style={{ marginBottom: 14, color: 'var(--gray-500)' }} onClick={() => navigate('/professores')}>
        <ChevronLeft size={14} /> Professores
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Novo professor</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Preencha os dados para cadastrar</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Salvando...' : 'Salvar professor'}
        </button>
      </div>

      {/* Dados pessoais */}
      <div className="secao" style={{ marginBottom: 14 }}>
        <div className="secao-header"><h3>Dados pessoais</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Nome completo *</label><input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" /></div>
            <div className="form-group"><label className="form-label">Nº da ficha</label><input className="form-input" value={form.ficha_numero} onChange={e => set('ficha_numero', e.target.value)} /></div>
          </div>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">CPF</label><input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" /></div>
            <div className="form-group"><label className="form-label">RG</label><input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Data de nascimento</label><input className="form-input" type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} /></div>
          </div>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">Estado civil</label><select className="form-select" value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}><option value="">Selecione</option>{ESTADOS_CIVIS.map(v => <option key={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Tipo sanguíneo</label><select className="form-select" value={form.tipo_sanguineo} onChange={e => set('tipo_sanguineo', e.target.value)}><option value="">Selecione</option>{TIPOS_SANG.map(v => <option key={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Naturalidade</label><input className="form-input" value={form.naturalidade} onChange={e => set('naturalidade', e.target.value)} /></div>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(99) 99999-0000" /></div>
            <div className="form-group"><label className="form-label">E-mail institucional</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="nome@ies.edu.br" /></div>
          </div>
          <div className="form-group"><label className="form-label">Endereço</label><input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} /></div>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">Bairro</label><input className="form-input" value={form.bairro} onChange={e => set('bairro', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Imperatriz" /></div>
            <div className="form-group"><label className="form-label">CEP</label><input className="form-input" value={form.cep} onChange={e => set('cep', e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* Dados acadêmicos */}
      <div className="secao" style={{ marginBottom: 14 }}>
        <div className="secao-header"><h3>Dados acadêmicos</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">Titulação *</label><select className="form-select" value={form.titulacao} onChange={e => set('titulacao', e.target.value)}>{TITULACOES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Plano docente *</label><select className="form-select" value={form.plano} onChange={e => set('plano', e.target.value)}>{PLANOS.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Área de atuação</label><input className="form-input" value={form.area_atuacao} onChange={e => set('area_atuacao', e.target.value)} /></div>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Instituição de formação</label><input className="form-input" value={form.instituicao_formacao} onChange={e => set('instituicao_formacao', e.target.value)} placeholder="UFMA, UFC..." /></div>
            <div className="form-group"><label className="form-label">Registro profissional</label><input className="form-input" value={form.registro_profissional} onChange={e => set('registro_profissional', e.target.value)} placeholder="OAB/MA, CRM, CREA..." /></div>
          </div>
          <div className="form-group"><label className="form-label">Lattes</label><input className="form-input" value={form.lattes} onChange={e => set('lattes', e.target.value)} placeholder="lattes.cnpq.br/0000000000" /></div>
        </div>
      </div>

      {/* Dados funcionais */}
      <div className="secao" style={{ marginBottom: 14 }}>
        <div className="secao-header"><h3>Dados funcionais</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">Vínculo</label><select className="form-select" value={form.vinculo} onChange={e => set('vinculo', e.target.value)}>{VINCULOS.map(v => <option key={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Regime</label><select className="form-select" value={form.regime_trabalho} onChange={e => set('regime_trabalho', e.target.value)}>{REGIMES.map(v => <option key={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Data de admissão</label><input className="form-input" type="date" value={form.data_admissao} onChange={e => set('data_admissao', e.target.value)} /></div>
          </div>
          <div className="form-grid-3">
            <div className="form-group"><label className="form-label">Curso principal</label><input className="form-input" value={form.curso_principal} onChange={e => set('curso_principal', e.target.value)} placeholder="Direito, Enfermagem..." /></div>
            <div className="form-group"><label className="form-label">Valor hora teórica (R$)</label><input className="form-input" type="number" step="0.01" value={form.valor_hora_teorica} onChange={e => set('valor_hora_teorica', e.target.value)} placeholder="0,00" /></div>
            <div className="form-group"><label className="form-label">Valor hora prática (R$)</label><input className="form-input" type="number" step="0.01" value={form.valor_hora_pratica} onChange={e => set('valor_hora_pratica', e.target.value)} placeholder="0,00" /></div>
          </div>
        </div>
      </div>

      {/* Dados bancários */}
      <div className="secao" style={{ marginBottom: 14 }}>
        <div className="secao-header"><h3>Dados bancários</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Banco</label><input className="form-input" value={form.banco} onChange={e => set('banco', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Agência</label><input className="form-input" value={form.agencia} onChange={e => set('agencia', e.target.value)} /></div>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Conta corrente</label><input className="form-input" value={form.conta} onChange={e => set('conta', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Chave PIX</label><input className="form-input" value={form.pix} onChange={e => set('pix', e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* Família */}
      <div className="secao" style={{ marginBottom: 20 }}>
        <div className="secao-header"><h3>Família</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Nome do pai</label><input className="form-input" value={form.nome_pai} onChange={e => set('nome_pai', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Nome da mãe</label><input className="form-input" value={form.nome_mae} onChange={e => set('nome_mae', e.target.value)} /></div>
          </div>
          <div className="form-grid-2">
            <div className="form-group"><label className="form-label">Cônjuge</label><input className="form-input" value={form.conjuge} onChange={e => set('conjuge', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Dependentes</label><input className="form-input" value={form.dependentes} onChange={e => set('dependentes', e.target.value)} /></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn" onClick={() => navigate('/professores')}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Salvando...' : 'Salvar professor'}
        </button>
      </div>
    </div>
  )
}
