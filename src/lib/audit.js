import { supabase } from '../lib/supabase'

// Registra uma ação no audit log
export async function registrarAudit({
  acao,
  modulo,
  descricao,
  referenciaId = null,
  referenciaNome = null,
  usuarioEmail = null,
  dadosAnteriores = null,
  dadosNovos = null,
}) {
  try {
    await supabase.from('audit_log').insert({
      acao,
      modulo,
      descricao,
      referencia_id: referenciaId,
      referencia_nome: referenciaNome,
      usuario_email: usuarioEmail,
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos,
    })
  } catch (e) {
    console.error('Erro ao registrar audit log:', e)
  }
}

// Ações pré-definidas para facilitar o uso
export const Audit = {
  fecharFolha: (folhaNome, email) => registrarAudit({
    acao: 'fechar_folha', modulo: 'folha',
    descricao: `Folha "${folhaNome}" fechada`,
    referenciaNome: folhaNome, usuarioEmail: email,
  }),

  reabrirFolha: (folhaNome, justificativa, email) => registrarAudit({
    acao: 'reabrir_folha', modulo: 'folha',
    descricao: `Folha "${folhaNome}" reaberta — Justificativa: ${justificativa}`,
    referenciaNome: folhaNome, usuarioEmail: email,
  }),

  enviarFinanceiro: (folhaNome, email) => registrarAudit({
    acao: 'enviar_financeiro', modulo: 'folha',
    descricao: `Folha "${folhaNome}" enviada ao Financeiro`,
    referenciaNome: folhaNome, usuarioEmail: email,
  }),

  alterarSalario: (nome, tipo, pct, email) => registrarAudit({
    acao: 'alterar_salario', modulo: 'colaborador',
    descricao: `Alteração salarial registrada para ${nome} — ${tipo}${pct ? ` +${pct}%` : ''}`,
    referenciaNome: nome, usuarioEmail: email,
  }),

  cadastrarColaborador: (nome, email) => registrarAudit({
    acao: 'cadastrar_colaborador', modulo: 'colaborador',
    descricao: `Novo colaborador cadastrado: ${nome}`,
    referenciaNome: nome, usuarioEmail: email,
  }),

  cadastrarProfessor: (nome, email) => registrarAudit({
    acao: 'cadastrar_professor', modulo: 'professor',
    descricao: `Novo professor cadastrado: ${nome}`,
    referenciaNome: nome, usuarioEmail: email,
  }),

  programarFerias: (nome, dataInicio, email) => registrarAudit({
    acao: 'programar_ferias', modulo: 'ferias',
    descricao: `Férias programadas para ${nome} — a partir de ${dataInicio}`,
    referenciaNome: nome, usuarioEmail: email,
  }),

  documentoPendente: (nome, doc, email) => registrarAudit({
    acao: 'doc_pendente_notificado', modulo: 'documentos',
    descricao: `Notificação enviada para ${nome} sobre documento pendente: ${doc}`,
    referenciaNome: nome, usuarioEmail: email,
  }),
}
