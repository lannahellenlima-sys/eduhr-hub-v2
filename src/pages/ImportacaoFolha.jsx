import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, ChevronDown, ChevronRight, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const MESES_NOMES = {
  'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3,
  'abril': 4, 'maio': 5, 'junho': 6, 'julho': 7,
  'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
  'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
  'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12,
}

const ANO_ATUAL = new Date().getFullYear()

// Detecta mês a partir do nome da aba
function detectarMes(nomeAba) {
  const lower = nomeAba.toLowerCase().trim()
  for (const [nome, num] of Object.entries(MESES_NOMES)) {
    if (lower.includes(nome)) return num
  }
  const numMatch = lower.match(/\d+/)
  if (numMatch) {
    const n = parseInt(numMatch[0])
    if (n >= 1 && n <= 12) return n
  }
  return null
}

// Normaliza nome de coluna para busca flexível
function normCol(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

// Mapeia colunas da planilha para campos do sistema
function mapearColunas(headers) {
  const map = {}
  const buscar = (terms) => headers.findIndex(h => terms.some(t => normCol(h).includes(t)))

  map.nome = buscar(['nome', 'colaborador', 'funcionario', 'servidor'])
  map.funcao = buscar(['funcao', 'cargo', 'funcão'])
  map.departamento = buscar(['depart', 'setor', 'area', 'área'])
  map.vinculo = buscar(['vinculo', 'vinculação', 'contrato', 'tipo'])
  map.salario_bruto = buscar(['salario', 'salário', 'bruto', 'remuner'])
  map.dias_trabalhados = buscar(['dias', 'dias trab'])
  map.ajuda_custo = buscar(['ajuda', 'aux transporte', 'transp'])
  map.vale_refeicao = buscar(['refeicao', 'refeição', 'alimentacao', 'alimentação', 'vr', 'va'])
  map.gratificacao = buscar(['gratif'])
  map.ats = buscar(['ats', 'insalubridade', 'adicional'])
  map.farmacia = buscar(['farmacia', 'farmácia'])
  map.adiantamento = buscar(['adiant'])
  map.plano_saude = buscar(['plano', 'saude', 'saúde'])
  map.inss = buscar(['inss'])
  map.irrf = buscar(['irrf', 'ir '])
  return map
}

// Converte linha da planilha em lançamento CLT
function linhaParaLancamento(linha, mapa, folhaId) {
  const get = (idx) => idx >= 0 && idx < linha.length ? linha[idx] : null
  const num = (v) => parseFloat(String(v || '0').replace(',', '.')) || 0
  const nome = get(mapa.nome)
  if (!nome || String(nome).trim() === '') return null

  return {
    folha_id: folhaId,
    colaborador_nome: String(nome).trim(),
    funcao: String(get(mapa.funcao) || '').trim(),
    departamento: String(get(mapa.departamento) || '').trim(),
    vinculo: String(get(mapa.vinculo) || 'CLT').trim() || 'CLT',
    salario_bruto: num(get(mapa.salario_bruto)),
    reajuste_pct: 0,
    dias_trabalhados: num(get(mapa.dias_trabalhados)) || 30,
    ajuda_custo: num(get(mapa.ajuda_custo)),
    vale_refeicao: num(get(mapa.vale_refeicao)),
    gratificacao: num(get(mapa.gratificacao)),
    ats: num(get(mapa.ats)),
    farmacia: num(get(mapa.farmacia)),
    adiantamento: num(get(mapa.adiantamento)),
    plano_saude: num(get(mapa.plano_saude)),
    status: 'validado', // histórico já validado
  }
}

export default function ImportacaoFolha() {
  const [arquivo, setArquivo] = useState(null)
  const [abas, setAbas] = useState([]) // { nomeAba, mes, ano, headers, linhas, lancamentos, selecionada }
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [expandida, setExpandida] = useState(null)
  const fileRef = useRef()

  function handleArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    setArquivo(file)
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const abasDetectadas = []

        wb.SheetNames.forEach(nomeAba => {
          const mes = detectarMes(nomeAba)
          if (!mes) return // ignora abas que não parecem meses

          const ws = wb.Sheets[nomeAba]
          const dados = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          if (dados.length < 2) return

          // Detecta linha de cabeçalho (primeira com texto)
          let headerIdx = 0
          for (let i = 0; i < Math.min(5, dados.length); i++) {
            if (dados[i].some(c => String(c).length > 2)) { headerIdx = i; break }
          }

          const headers = dados[headerIdx]
          const mapa = mapearColunas(headers)
          const linhas = dados.slice(headerIdx + 1).filter(l => l.some(c => c !== ''))
          const lancamentos = linhas.map(l => linhaParaLancamento(l, mapa, null)).filter(Boolean)

          abasDetectadas.push({ nomeAba, mes, ano: ANO_ATUAL, headers, linhas, mapa, lancamentos, selecionada: true })
        })

        abasDetectadas.sort((a, b) => a.mes - b.mes)

        if (abasDetectadas.length === 0) {
          toast.error('Nenhuma aba com nome de mês encontrada. Verifique os nomes das abas.')
          return
        }

        setAbas(abasDetectadas)
        toast.success(`${abasDetectadas.length} aba(s) de mês detectada(s)!`)
      } catch (err) {
        console.error(err)
        toast.error('Erro ao ler o arquivo. Verifique se é um Excel válido (.xlsx).')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function toggleAba(idx) {
    setAbas(prev => prev.map((a, i) => i === idx ? { ...a, selecionada: !a.selecionada } : a))
  }

  function alterarAno(idx, ano) {
    setAbas(prev => prev.map((a, i) => i === idx ? { ...a, ano: parseInt(ano) } : a))
  }

  async function handleImportar() {
    const selecionadas = abas.filter(a => a.selecionada && a.lancamentos.length > 0)
    if (!selecionadas.length) { toast.error('Selecione pelo menos uma aba para importar.'); return }
    if (!confirm(`Importar ${selecionadas.length} competência(s) com ${selecionadas.reduce((s, a) => s + a.lancamentos.length, 0)} lançamentos no total?`)) return

    setImportando(true)
    const erros = []
    const sucessos = []

    for (const aba of selecionadas) {
      try {
        // Verifica se já existe folha para este mês/ano
        const { data: folhaExistente } = await supabase
          .from('folhas_mensais')
          .select('id')
          .eq('mes', aba.mes)
          .eq('ano', aba.ano)
          .eq('tipo', 'administrativo')
          .single()

        let folhaId = folhaExistente?.id

        // Cria a folha se não existir
        if (!folhaId) {
          const { data: novaFolha, error: errFolha } = await supabase
            .from('folhas_mensais')
            .insert({ mes: aba.mes, ano: aba.ano, tipo: 'administrativo', status: 'fechada' })
            .select('id').single()
          if (errFolha) { erros.push(`${aba.nomeAba}: erro ao criar folha`); continue }
          folhaId = novaFolha.id
        }

        // Insere lançamentos
        const lancamentosComFolha = aba.lancamentos.map(l => ({ ...l, folha_id: folhaId }))
        const { error: errLanc } = await supabase
          .from('lancamentos_adm_clt')
          .insert(lancamentosComFolha)

        if (errLanc) { erros.push(`${aba.nomeAba}: ${errLanc.message}`); continue }
        sucessos.push({ nomeAba: aba.nomeAba, mes: aba.mes, ano: aba.ano, qtd: aba.lancamentos.length })
      } catch (err) {
        erros.push(`${aba.nomeAba}: ${err.message}`)
      }
    }

    setImportando(false)
    setResultado({ sucessos, erros })
  }

  function downloadModelo() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nome', 'funcao', 'departamento', 'vinculo', 'salario_bruto', 'dias_trabalhados', 'ajuda_custo', 'vale_refeicao', 'gratificacao', 'ats', 'farmacia', 'adiantamento', 'plano_saude'],
      ['Colaborador A', 'Auxiliar Administrativo', 'RH', 'CLT', 2500, 30, 0, 300, 0, 0, 0, 0, 0],
      ['Colaborador B', 'Coordenador', 'Acadêmico', 'CLT', 3500, 30, 0, 300, 500, 0, 50, 700, 0],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Janeiro')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['nome','funcao','departamento','vinculo','salario_bruto','dias_trabalhados','ajuda_custo','vale_refeicao','gratificacao','ats','farmacia','adiantamento','plano_saude']]), 'Fevereiro')
    XLSX.writeFile(wb, 'modelo_folha_historica.xlsx')
  }

  const MESES_LABEL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const totalLancamentos = abas.filter(a => a.selecionada).reduce((s, a) => s + a.lancamentos.length, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Importação Histórica de Folha</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Importe folhas de pagamento anteriores a partir de planilha Excel — uma aba por mês
          </p>
        </div>
        <button className="btn" onClick={downloadModelo}>
          <Download size={13} /> Baixar modelo Excel
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{ marginBottom: 20 }}>
          {resultado.sucessos.length > 0 && (
            <div className="alert alert-green" style={{ marginBottom: 8 }}>
              <CheckCircle size={15} />
              <div>
                <strong>Importação concluída!</strong>
                {resultado.sucessos.map(s => (
                  <div key={s.nomeAba} style={{ fontSize: 12, marginTop: 2 }}>
                    ✓ {MESES_LABEL[s.mes]}/{s.ano} — {s.qtd} lançamento(s)
                  </div>
                ))}
              </div>
            </div>
          )}
          {resultado.erros.length > 0 && (
            <div className="alert alert-red">
              <AlertTriangle size={15} />
              <div>
                <strong>Erros:</strong>
                {resultado.erros.map((e, i) => <div key={i} style={{ fontSize: 12 }}>✗ {e}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      {!arquivo || abas.length === 0 ? (
        <div
          style={{ border: '2px dashed var(--gray-200)', borderRadius: 12, padding: 48, textAlign: 'center', background: 'var(--gray-50)', cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const inp = fileRef.current; if (inp) { const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; handleArquivo({ target: inp }) } } }}
        >
          <FileSpreadsheet size={48} color="var(--gray-300)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
            Arraste sua planilha Excel aqui
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>
            ou clique para selecionar o arquivo
          </p>
          <button className="btn btn-primary" style={{ pointerEvents: 'none' }}>
            <Upload size={13} /> Selecionar arquivo .xlsx
          </button>
          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 12 }}>
            O sistema detecta automaticamente os meses pelas abas (ex: "Janeiro", "Fevereiro"...)
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleArquivo} />
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Arquivo', valor: arquivo.name.length > 25 ? arquivo.name.slice(0, 22) + '...' : arquivo.name, cor: 'var(--blue)' },
              { label: 'Abas detectadas', valor: abas.length, cor: 'var(--blue)' },
              { label: 'Selecionadas', valor: abas.filter(a => a.selecionada).length, cor: 'var(--green)' },
              { label: 'Total lançamentos', valor: totalLancamentos, cor: 'var(--blue)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.cor }}>{s.valor}</div>
              </div>
            ))}
          </div>

          {/* Lista de abas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {abas.map((aba, idx) => (
              <div key={idx} className="card" style={{ overflow: 'hidden', opacity: aba.selecionada ? 1 : .6 }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12 }}>
                  {/* Checkbox */}
                  <input type="checkbox" checked={aba.selecionada} onChange={() => toggleAba(idx)} style={{ width: 16, height: 16, cursor: 'pointer' }} />

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{aba.nomeAba}</span>
                      <span className="badge badge-blue">{MESES_LABEL[aba.mes]}</span>
                      <span className="badge badge-green">{aba.lancamentos.length} colaborador(es)</span>
                    </div>
                  </div>

                  {/* Ano */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Ano:</span>
                    <select
                      className="form-select"
                      style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                      value={aba.ano}
                      onChange={e => alterarAno(idx, e.target.value)}
                    >
                      {[ANO_ATUAL - 2, ANO_ATUAL - 1, ANO_ATUAL].map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>

                  {/* Expandir preview */}
                  <button
                    onClick={() => setExpandida(expandida === idx ? null : idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    {expandida === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Preview
                  </button>
                </div>

                {/* Preview da aba */}
                {expandida === idx && (
                  <div style={{ borderTop: '1px solid var(--gray-100)', overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
                    <table className="table" style={{ fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th>Nome</th><th>Função</th><th>Departamento</th>
                          <th>Vínculo</th><th>Salário bruto</th><th>Dias</th>
                          <th>Ajuda custo</th><th>Vale ref.</th><th>Gratif.</th>
                          <th>Farmácia</th><th>Adiant.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aba.lancamentos.slice(0, 20).map((l, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{l.colaborador_nome}</td>
                            <td>{l.funcao || '—'}</td>
                            <td>{l.departamento || '—'}</td>
                            <td><span className="badge badge-blue" style={{ fontSize: 9 }}>{l.vinculo}</span></td>
                            <td style={{ fontFamily: 'var(--mono)' }}>R$ {(l.salario_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td>{l.dias_trabalhados}</td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{l.ajuda_custo > 0 ? `R$ ${l.ajuda_custo.toFixed(2)}` : '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{l.vale_refeicao > 0 ? `R$ ${l.vale_refeicao.toFixed(2)}` : '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{l.gratificacao > 0 ? `R$ ${l.gratificacao.toFixed(2)}` : '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{l.farmacia > 0 ? `R$ ${l.farmacia.toFixed(2)}` : '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{l.adiantamento > 0 ? `R$ ${l.adiantamento.toFixed(2)}` : '—'}</td>
                          </tr>
                        ))}
                        {aba.lancamentos.length > 20 && (
                          <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 11 }}>+ {aba.lancamentos.length - 20} colaboradores...</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Aviso */}
          <div className="alert alert-amber" style={{ marginBottom: 16 }}>
            <AlertTriangle size={15} />
            <div style={{ fontSize: 13 }}>
              <strong>Antes de importar:</strong> verifique o preview de cada aba clicando em "Preview".
              Os dados serão importados como <strong>validados</strong> e a folha ficará <strong>fechada</strong> (histórico).
              Verifique principalmente os nomes das colunas — o sistema faz o mapeamento automático mas pode precisar de ajuste.
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => { setArquivo(null); setAbas([]); setResultado(null) }}>
              ↩ Trocar arquivo
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImportar}
              disabled={importando || abas.filter(a => a.selecionada).length === 0}
              style={{ minWidth: 200 }}
            >
              {importando ? (
                <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
              ) : (
                <><Upload size={13} /> Importar {abas.filter(a => a.selecionada).length} competência(s)</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
