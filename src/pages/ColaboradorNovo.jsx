import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { saveColaborador } from '../hooks/useColaboradores'
import { supabase } from '../lib/supabase'
import { adicionarColaboradorAFolhaAtual } from '../hooks/useFolhaAdm'

const VINCULOS = ['CLT', 'CLT Horista', 'PJ', 'Estágio', 'Temporário', 'Autônomo']
const REGIMES = ['44h semanais', 'Integral (40h)', 'Parcial (20h)', 'Horista', 'Outro']
const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável']
const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GRAUS = ['Ensino Médio', 'Ensino Superior', 'Especialização', 'Pós-graduação', 'Mestrado', 'Doutorado']

export default function ColaboradorNovo() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ficha_numero: '', nome: '', cpf: '', rg: '', email: '',
    data_nascimento: '', data_admissao: '', estado_civil: '',
    tipo_sanguineo: '', grau_instrucao: '', naturalidade: '',
    nacionalidade: 'Brasileira', telefone: '', endereco: '',
    bairro: '', cidade: '', estado: 'MA', cep: '',
    funcao: '', departamento: '', vinculo: 'CLT',
    regime_trabalho: 'Integral (40h)', salario_base: '',
    centro_custo: '', banco: '', agencia: '', conta: '', pix: '',
    nome_pai: '', nome_mae: '', conjuge: '', dependentes: '',
    ativo: true,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Gera número de ficha automático
  useEffect(() => {
    supabase.from('colaboradores').select('ficha_numero').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        const ultimo = data?.[0]?.ficha_numero
        const proximo = ultimo ? String(parseInt(ultimo.replace(/D/g, '') || 0) + 1).padStart(4, '0') : '0001'
        set('ficha_numero', proximo)
      })
  }, [])

  async function handleSave() {
    if (!form.nome || !form.funcao || !form.departamento || !form.data_admissao) {
      alert('Preencha os campos obrigatórios: Nome, Função, Departamento e Data de Admissão.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      salario_base: parseFloat(form.salario_base) || 0,
      data_nascimento: form.data_nascimento || null,
      cpf: form.cpf || null,
      rg: form.rg || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      cep: form.cep || null,
      estado_civil: form.estado_civil || null,
      tipo_sanguineo: form.tipo_sanguineo || null,
      grau_instrucao: form.grau_instrucao || null,
      naturalidade: form.naturalidade || null,
      centro_custo: form.centro_custo || null,
      banco: form.banco || null,
      agencia: form.agencia || null,
      conta: form.conta || null,
      pix: form.pix || null,
      nome_pai: form.nome_pai || null,
      nome_mae: form.nome_mae || null,
      conjuge: form.conjuge || null,
      dependentes: form.dependentes || null,
      ficha_numero: form.ficha_numero || null,
    }
    const newId = await saveColaborador(payload)
    setSaving(false)
    if (newId) {
      const adicionarFolha = window.confirm(
        `Colaborador salvo com sucesso!\n\nDeseja adicionar ${form.nome} à folha de pagamento do mês atual?`
      )
      if (adicionarFolha) {
        await adicionarColaboradorAFolhaAtual({
          nome: form.nome,
          funcao: form.funcao,
          departamento: form.departamento,
          vinculo: form.vinculo,
          salario_base: parseFloat(form.salario_base) || 0,
        })
      }
      navigate(`/colaboradores/${newId}`)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <button className="btn btn-sm" style={{ marginBottom: 14, color: 'var(--gray-500)' }} onClick={() => navigate('/colaboradores')}>
        <ChevronLeft size={14} /> Colaboradores
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Novo colaborador</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>Preencha os dados para cadastrar</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Salvando...' : 'Salvar colaborador'}
        </button>
      </div>

      {/* Dados pessoais */}
      <div className="secao" style={{ marginBottom: 14 }}>
        <div className="secao-header"><h3>Dados pessoais</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nome completo *</label>
              <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="form-group">
              <label className="form-label">Nº da ficha <span style={{ fontSize: 10, color: "var(--gray-400)", fontWeight: 400 }}>(gerado automaticamente)</span></label>
              <input className="form-input" value={form.ficha_numero} onChange={e => set('ficha_numero', e.target.value)} placeholder="0001" />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">CPF</label>
              <input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="form-group">
              <label className="form-label">RG</label>
              <input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} placeholder="0.000.000 SSP/MA" />
            </div>
            <div className="form-group">
              <label className="form-label">Data de nascimento</label>
              <input className="form-input" type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Estado civil</label>
              <select className="form-select" value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}>
                <option value="">Selecione</option>
                {ESTADOS_CIVIS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo sanguíneo</label>
              <select className="form-select" value={form.tipo_sanguineo} onChange={e => set('tipo_sanguineo', e.target.value)}>
                <option value="">Selecione</option>
                {TIPOS_SANGUINEOS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grau de instrução</label>
              <select className="form-select" value={form.grau_instrucao} onChange={e => set('grau_instrucao', e.target.value)}>
                <option value="">Selecione</option>
                {GRAUS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(99) 99999-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail institucional</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="nome@ies.edu.br" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número" />
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Bairro</label>
              <input className="form-input" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input className="form-input" value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Imperatriz" />
            </div>
            <div className="form-group">
              <label className="form-label">CEP</label>
              <input className="form-input" value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="65900-000" />
            </div>
          </div>
        </div>
      </div>

      {/* Dados funcionais */}
      <div className="secao" style={{ marginBottom: 14 }}>
        <div className="secao-header"><h3>Dados funcionais</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Função *</label>
              <input className="form-input" value={form.funcao} onChange={e => set('funcao', e.target.value)} placeholder="ex: Analista de RH" />
            </div>
            <div className="form-group">
              <label className="form-label">Departamento *</label>
              <input className="form-input" value={form.departamento} onChange={e => set('departamento', e.target.value)} placeholder="ex: Recursos Humanos" />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Vínculo</label>
              <select className="form-select" value={form.vinculo} onChange={e => set('vinculo', e.target.value)}>
                {VINCULOS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Regime de trabalho</label>
              <select className="form-select" value={form.regime_trabalho} onChange={e => set('regime_trabalho', e.target.value)}>
                {REGIMES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data de admissão *</label>
              <input className="form-input" type="date" value={form.data_admissao} onChange={e => set('data_admissao', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Salário base (R$)</label>
              <input className="form-input" type="number" step="0.01" value={form.salario_base} onChange={e => set('salario_base', e.target.value)} placeholder="0,00" />
            </div>
            <div className="form-group">
              <label className="form-label">Centro de custo</label>
              <input className="form-input" value={form.centro_custo} onChange={e => set('centro_custo', e.target.value)} placeholder="ADM-RH" />
            </div>
          </div>
        </div>
      </div>

      {/* Dados bancários */}
      <div className="secao" style={{ marginBottom: 14 }}>
        <div className="secao-header"><h3>Dados bancários</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Banco</label>
              <input className="form-input" value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="ex: Caixa Econômica Federal" />
            </div>
            <div className="form-group">
              <label className="form-label">Agência</label>
              <input className="form-input" value={form.agencia} onChange={e => set('agencia', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Conta corrente</label>
              <input className="form-input" value={form.conta} onChange={e => set('conta', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Chave PIX</label>
              <input className="form-input" value={form.pix} onChange={e => set('pix', e.target.value)} placeholder="CPF, e-mail ou telefone" />
            </div>
          </div>
        </div>
      </div>

      {/* Família */}
      <div className="secao" style={{ marginBottom: 20 }}>
        <div className="secao-header"><h3>Família</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nome do pai</label>
              <input className="form-input" value={form.nome_pai} onChange={e => set('nome_pai', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nome da mãe</label>
              <input className="form-input" value={form.nome_mae} onChange={e => set('nome_mae', e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Cônjuge</label>
              <input className="form-input" value={form.conjuge} onChange={e => set('conjuge', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Dependentes</label>
              <input className="form-input" value={form.dependentes} onChange={e => set('dependentes', e.target.value)} placeholder="ex: João (filho, 5 anos)" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn" onClick={() => navigate('/colaboradores')}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Salvando...' : 'Salvar colaborador'}
        </button>
      </div>
    </div>
  )
}
