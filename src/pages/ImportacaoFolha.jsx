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
const MESES_LABEL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const ANO_ATUAL = new Date().getFullYear()

function detectarMes(nomeAba) {
  const lower = nomeAba.toLowerCase().trim()
  for (const [nome, num] of Object.entries(MESES_NOMES)) {
    if (lower.includes(nome)) return num
  }
  const numMatch = lower.match(/^\d+$/)
  if (numMatch) {
    const n = parseInt(numMatch[0])
    if (n >= 1 && n <= 12) return n
  }
  return null
}

function normCol(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Mapeamento específico para a planilha da Unisulma
function mapearColunas(headers) {
  const norm = headers.map(normCol)
  const idx = (terms) => norm.findIndex(h => terms.some(t => h.includes(t)))

  return {
    nome:              idx(['funcionario', 'funcionário', 'nome', 'colaborador']),
    data_admissao:     idx(['admissao', 'admissão', 'data adm']),
    funcao:            idx(['funcao', 'função', 'cargo']),
    departamento:      idx(['departamento', 'depart', 'setor']),
    vinculo:           idx(['regime', 'vinculo', 'vinculação', 'contrato']),
    salario_bruto:     idx(['salario bruto', 'salário bruto', 'bruto', 'salario', 'salário']),
    ajuda_custo:       idx(['ajuda de custo', 'ajuda custo', 'ajuda']),
    vale_refeicao:     idx(['vale-refeicao', 'vale refeicao', 'vale-refeição', 'vale refeição', 'refeicao', 'refeição', 'alimentacao', 'alimentação']),
    gratificacao:      idx(['gratificacao', 'gratificação', 'gratif']),
    ats:               idx(['ats', 'insalubridade', 'adicional tecnico']),
    farmacia:          idx(['farmacia', 'farmácia']),
    adiantamento:      idx(['adiantamento', 'adiant']),
    plano_saude:       idx(['plano de saude', 'plano saude', 'plano de saúde', 'plano saúde', 'plano']),
    // ignorados:
    // valor_liquido — recalculado pelo sistema
  }
}

function numBR(v) {
  if (v === null || v === undefined || v === '') return 0
  const s = String(v).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function isLinhaValida(linha, idxNome) {
  if (idxNome < 0) return false
  const nome = String(linha[idxNome] || '').trim()
  if (!nome) return false
  const lower = nome.toLowerCase()
  // Filtra linhas de total, subtotal, cabeçalho duplicado
  if (['total', 'subtotal', 'funcionario', 'funcionário', 'nome'].includes(lower)) return false
  return true
}

function linhaParaLancamento(linha, mapa) {
  if (!isLinhaValida(linha, mapa.nome)) return null
  const get = (idx) => idx >= 0 ? linha[idx] : null

  return {
    colaborador_nome:  String(get(mapa.nome) || '').trim(),
    data_admissao:     get(mapa.data_admissao) || null,
    funcao:            String(get(mapa.funcao) || '').trim(),
    departamento:      String(get(mapa.departamento) || '').trim(),
    vinculo:           String(get(mapa.vinculo) || 'CLT').trim() || 'CLT',
    salario_bruto:     numBR(get(mapa.salario_bruto)),
    reajuste_pct:      0,
    dias_trabalhados:  30,
    ajuda_custo:       numBR(get(mapa.ajuda_custo)),
    vale_refeicao:     numBR(get(mapa.vale_refeicao)),
    gratificacao:      numBR(get(mapa.gratificacao)),
    ats:               numBR(get(mapa.ats)),
    farmacia:          numBR(get(mapa.farmacia)),
    adiantamento:      numBR(get(mapa.adiantamento)),
    plano_saude:       numBR(get(mapa.plano_saude)),
    status:            'validado',
  }
}

export default function ImportacaoFolha() {
  const [arquivo, setArquivo] = useState(null)
  const [abas, setAbas] = useState([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [expandida, setExpandida] = useState(null)
  const fileRef = useRef()

  function handleArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    setResultado(null)
    setAbas([])

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true })
        const abasDetectadas = []

        wb.SheetNames.forEach(nomeAba => {
          const mes = detectarMes(nomeAba)
          if (!mes) return

          const ws = wb.Sheets[nomeAba]
          const dados = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          if (dados.length < 2) return

          // Encontra linha de cabeçalho — primeira com pelo menos 4 células preenchidas
          let headerIdx = 0
          for (let i = 0; i < Math.min(8, dados.length); i++) {
            const preenchidas = dados[i].filter(c => String(c).trim().length > 1).length
            if (preenchidas >= 4) { headerIdx = i; break }
          }

          const headers = dados[headerIdx]
          const mapa = mapearColunas(headers)
          const linhas = dados.slice(headerIdx + 1)
          const lancamentos = linhas.map(l => linhaParaLancamento(l, mapa)).filter(Boolean)

          if (lancamentos.length === 0) return

          abasDetectadas.push({
            nomeAba, mes, ano: ANO_ATUAL,
            headers, mapa, lancamentos, selecionada: true
          })
        })

        abasDetectadas.sort((a, b) => a.mes - b.mes)

        if (abasDetectadas.length === 0) {
          toast.error('Nenhuma aba com nome de mês encontrada. Verifique os nomes das abas (ex: "Janeiro", "Fevereiro"...).')
          return
        }

        setAbas(abasDetectadas)
        toast.success(`${abasDetectadas.length} mês(es) detectado(s) — ${abasDetectadas.reduce((s, a) => s + a.lancamentos.length, 0)} colaboradores no total!`)
      } catch (err) {
        console.error(err)
        toast.error('Erro ao ler o arquivo. Verifique se é um Excel válido (.xlsx).')
      }
    }
    reader.readAsArrayBuffer(file)
    if (e.target) e.target.value = ''
  }

  function toggleAba(idx) {
    setAbas(prev => prev.map((a, i) => i === idx ? { ...a, selecionada: !a.selecionada } : a))
  }

  function alterarAno(idx, ano) {
    setAbas(prev => prev.map((a, i) => i === idx ? { ...a, ano: parseInt(ano) } : a))
  }

  async function handleImportar() {
    const selecionadas = abas.filter(a => a.selecionada && a.lancamentos.length > 0)
    if (!selecionadas.length) { toast.error('Selecione pelo menos uma competência.'); return }
    const total = selecionadas.reduce((s, a) => s + a.lancamentos.length, 0)
    if (!confirm(`Importar ${selecionadas.length} competência(s) com ${total} lançamentos?\n\nAs folhas ficarão fechadas (histórico).`)) return

    setImportando(true)
    const erros = []
    const sucessos = []

    for (const aba of selecionadas) {
      try {
        // Verifica se folha já existe
        const { data: existente } = await supabase
          .from('folhas_mensais')
          .select('id, status')
          .eq('mes', aba.mes)
          .eq('ano', aba.ano)
          .eq('tipo', 'administrativo')
          .maybeSingle()

        let folhaId = existente?.id

        if (!folhaId) {
          const { data: nova, error: errFolha } = await supabase
            .from('folhas_mensais')
            .insert({ mes: aba.mes, ano: aba.ano, tipo: 'administrativo', status: 'fechada' })
            .select('id').single()
          if (errFolha) { erros.push(`${aba.nomeAba}: erro ao criar folha — ${errFolha.message}`); continue }
          folhaId = nova.id
        }

        // Insere lançamentos
        const lancamentos = aba.lancamentos.map(l => ({ ...l, folha_id: folhaId }))
        const BATCH = 50
        for (let i = 0; i < lancamentos.length; i += BATCH) {
          const { error } = await supabase.from('lancamentos_adm_clt').insert(lancamentos.slice(i, i + BATCH))
          if (error) { erros.push(`${aba.nomeAba}: ${error.message}`); break }
        }
        sucessos.push({ nomeAba: aba.nomeAba, mes: aba.mes, ano: aba.ano, qtd: aba.lancamentos.length })
      } catch (err) {
        erros.push(`${aba.nomeAba}: ${err.message}`)
      }
    }

    setImportando(false)
    setResultado({ sucessos, erros })
    if (sucessos.length) toast.success(`${sucessos.length} competência(s) importada(s)!`)
  }

  function downloadModelo() {
    const cabecalho = ['Funcionário', 'data admissão', 'Função', 'Departamento',
      'Regime Contratação', 'Salário Bruto', 'Ajuda de custo', 'Vale-refeição',
      'Gratificação', 'Farmácia', 'Plano de Saúde', 'Valor Líquido']
    const exemplo = ['Colaborador A', '01/01/2023', 'Auxiliar Administrativo', 'RH',
      'CLT', 2402.26, 0, 300, 0, 0, 0, 2702.26]

    const wb = XLSX.utils.book_new()
    ;['Janeiro', 'Fevereiro', 'Março'].forEach(mes => {
      const ws = XLSX.utils.aoa_to_sheet([cabecalho, exemplo])
      XLSX.utils.book_append_sheet(wb, ws, mes)
    })
    XLSX.writeFile(wb, 'modelo_folha_unisulma.xlsx')
  }

  const totalSelecionado = abas.filter(a => a.selecionada).reduce((s, a) => s + a.lancamentos.length, 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Importação Histórica de Folha</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            Importe folhas anteriores da planilha Excel — uma aba por mês
          </p>
        </div>
        <button className="btn" onClick={downloadModelo}>
          <Download size={13} /> Modelo Excel
        </button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{ marginBottom: 16 }}>
          {resultado.sucessos.length > 0 && (
            <div className="alert alert-green" style={{ marginBottom: 8 }}>
              <CheckCircle size={15} />
              <div>
                <strong>Importação concluída com sucesso!</strong>
                {resultado.sucessos.map(s => (
                  <div key={s.nomeAba} style={{ fontSize: 12, marginTop: 2 }}>
                    ✓ {MESES_LABEL[s.mes]}/{s.ano} — {s.qtd} colaborador(es)
                  </div>
                ))}
              </div>
            </div>
          )}
          {resultado.erros.length > 0 && (
            <div className="alert alert-red">
              <AlertTriangle size={15} />
              <div>
                <strong>Erros na importação:</strong>
                {resultado.erros.map((e, i) => <div key={i} style={{ fontSize: 12 }}>✗ {e}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Área de upload */}
      {abas.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleArquivo({ target: { files: [file] } })
          }}
          style={{
            border: '2px dashed var(--gray-200)', borderRadius: 12, padding: 56,
            textAlign: 'center', background: 'var(--gray-50)', cursor: 'pointer',
            transition: 'all .15s'
          }}
        >
          <FileSpreadsheet size={52} color="var(--gray-300)" style={{ marginBottom: 14 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
            Arraste sua planilha Excel aqui
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 18 }}>
            ou clique para selecionar — formato .xlsx
          </p>
          <div className="btn btn-primary" style={{ display: 'inline-flex', pointerEvents: 'none' }}>
            <Upload size={13} /> Selecionar arquivo
          </div>
          <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 14, lineHeight: 1.6 }}>
            O sistema detecta os meses pelas abas (ex: "Janeiro", "Fevereiro"...)<br />
            Colunas mapeadas automaticamente: Funcionário, Função, Departamento, Salário Bruto, Ajuda de custo, Vale-refeição, Gratificação, Farmácia, Plano de Saúde
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleArquivo} />
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Arquivo', valor: arquivo?.name?.length > 25 ? arquivo.name.slice(0, 22) + '...' : arquivo?.name, cor: 'var(--blue)' },
              { label: 'Meses detectados', valor: abas.length, cor: 'var(--blue)' },
              { label: 'Selecionados', valor: abas.filter(a => a.selecionada).length, cor: 'var(--green)' },
              { label: 'Total colaboradores', valor: totalSelecionado, cor: 'var(--blue)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.cor }}>{s.valor}</div>
              </div>
            ))}
          </div>

          {/* Abas detectadas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {abas.map((aba, idx) => (
              <div key={idx} className="card" style={{ overflow: 'hidden', opacity: aba.selecionada ? 1 : .55 }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={aba.selecionada}
                    onChange={() => toggleAba(idx)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--blue)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                      style={{ width: 92, padding: '4px 8px', fontSize: 12 }}
                      value={aba.ano}
                      onChange={e => alterarAno(idx, e.target.value)}
                    >
                      {[ANO_ATUAL - 2, ANO_ATUAL - 1, ANO_ATUAL].map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  {/* Preview */}
                  <button
                    onClick={() => setExpandida(expandida === idx ? null : idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    {expandida === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Preview
                  </button>
                </div>

                {/* Tabela preview */}
                {expandida === idx && (
                  <div style={{ borderTop: '1px solid var(--gray-100)', overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                    <table className="table" style={{ fontSize: 11, minWidth: 800 }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nome</th>
                          <th>Função</th>
                          <th>Departamento</th>
                          <th>Vínculo</th>
                          <th>Sal. Bruto</th>
                          <th>Ajuda custo</th>
                          <th>Vale ref.</th>
                          <th>Gratif.</th>
                          <th>Farmácia</th>
                          <th>Plano saúde</th>
                          <th>Líquido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aba.lancamentos.map((l, i) => {
                          const liquido = l.salario_bruto + l.ajuda_custo + l.vale_refeicao + l.gratificacao + l.ats - l.farmacia - l.adiantamento - l.plano_saude
                          const fmtR = (v) => v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
                          return (
                            <tr key={i}>
                              <td style={{ color: 'var(--gray-400)' }}>{i + 1}</td>
                              <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{l.colaborador_nome}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{l.funcao || '—'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{l.departamento || '—'}</td>
                              <td><span className="badge badge-blue" style={{ fontSize: 9 }}>{l.vinculo}</span></td>
                              <td style={{ fontFamily: 'var(--mono)' }}>{fmtR(l.salario_bruto)}</td>
                              <td style={{ fontFamily: 'var(--mono)' }}>{fmtR(l.ajuda_custo)}</td>
                              <td style={{ fontFamily: 'var(--mono)' }}>{fmtR(l.vale_refeicao)}</td>
                              <td style={{ fontFamily: 'var(--mono)' }}>{fmtR(l.gratificacao)}</td>
                              <td style={{ fontFamily: 'var(--mono)', color: l.farmacia > 0 ? 'var(--red)' : 'inherit' }}>{fmtR(l.farmacia)}</td>
                              <td style={{ fontFamily: 'var(--mono)', color: l.plano_saude > 0 ? 'var(--red)' : 'inherit' }}>{fmtR(l.plano_saude)}</td>
                              <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green)' }}>R$ {liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--blue-light)' }}>
                          <td colSpan={5} style={{ padding: '8px 14px', fontWeight: 700, color: 'var(--blue)' }}>
                            TOTAL — {aba.lancamentos.length} colaboradores
                          </td>
                          <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>
                            R$ {aba.lancamentos.reduce((s, l) => s + l.salario_bruto, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={6} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Aviso */}
          <div className="alert alert-amber" style={{ marginBottom: 16 }}>
            <AlertTriangle size={15} />
            <span style={{ fontSize: 13 }}>
              Verifique o <strong>Preview</strong> de cada mês antes de importar.
              Folhas importadas ficam <strong>fechadas</strong> e lançamentos como <strong>validados</strong> (histórico).
            </span>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => { setArquivo(null); setAbas([]); setResultado(null) }}>
              ↩ Trocar arquivo
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImportar}
              disabled={importando || abas.filter(a => a.selecionada).length === 0}
              style={{ minWidth: 220 }}
            >
              {importando
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
                : <><Upload size={13} /> Importar {abas.filter(a => a.selecionada).length} competência(s) · {totalSelecionado} registros</>
              }
            </button>
          </div>
        </>
      )}
    </div>
  )
}
