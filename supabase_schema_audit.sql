-- ============================================================
-- EduHR Hub — Schema Audit Log
-- Execute no Supabase > SQL Editor
-- ============================================================

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  acao text not null,         -- 'fechar_folha' | 'reabrir_folha' | 'enviar_financeiro' | 'alterar_salario' | 'cadastrar_colaborador' | etc.
  modulo text not null,       -- 'folha' | 'colaborador' | 'professor' | 'ferias' | 'documentos'
  descricao text not null,    -- texto legível do que aconteceu
  referencia_id uuid,         -- id do registro afetado
  referencia_nome text,       -- nome do colaborador/professor/folha afetado
  usuario_email text,         -- e-mail do usuário que executou
  dados_anteriores jsonb,     -- snapshot antes da mudança (opcional)
  dados_novos jsonb,          -- snapshot depois da mudança (opcional)
  created_at timestamptz default now()
);

-- Índices para performance
create index if not exists audit_log_acao_idx on audit_log(acao);
create index if not exists audit_log_modulo_idx on audit_log(modulo);
create index if not exists audit_log_created_at_idx on audit_log(created_at desc);
create index if not exists audit_log_usuario_idx on audit_log(usuario_email);

-- Dados de exemplo
insert into audit_log (acao, modulo, descricao, referencia_nome, usuario_email) values
('fechar_folha', 'folha', 'Folha Administrativa de Abril/2026 fechada', 'Folha ADM Abril/2026', 'lannahellenlima@gmail.com'),
('enviar_financeiro', 'folha', 'Folha Administrativa de Março/2026 enviada ao Financeiro', 'Folha ADM Março/2026', 'lannahellenlima@gmail.com'),
('fechar_folha', 'folha', 'Folha Docente de Abril/2026 fechada', 'Folha Docente Abril/2026', 'lannahellenlima@gmail.com'),
('alterar_salario', 'colaborador', 'Alteração salarial registrada para Ana Beatriz Souza — Reajuste geral +9,1%', 'Ana Beatriz Souza', 'lannahellenlima@gmail.com'),
('cadastrar_colaborador', 'colaborador', 'Novo colaborador cadastrado: Eduardo Martins', 'Eduardo Martins', 'lannahellenlima@gmail.com'),
('cadastrar_professor', 'professor', 'Novo professor cadastrado: Prof. Dr. João Almeida', 'Prof. Dr. João Almeida', 'lannahellenlima@gmail.com'),
('programar_ferias', 'ferias', 'Férias programadas para Ana Beatriz Souza — Jun/2026', 'Ana Beatriz Souza', 'lannahellenlima@gmail.com'),
('reabrir_folha', 'folha', 'Folha Administrativa de Fevereiro/2026 reaberta — Justificativa: Correção de lançamento de adiantamento', 'Folha ADM Fevereiro/2026', 'lannahellenlima@gmail.com');
