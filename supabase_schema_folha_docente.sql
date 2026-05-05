-- ============================================================
-- EduHR Hub — Schema Folha Docente
-- Execute no Supabase > SQL Editor (após schemas anteriores)
-- ============================================================

-- LANÇAMENTOS DOCENTE CLT
create table if not exists lancamentos_docente_clt (
  id uuid primary key default gen_random_uuid(),
  folha_id uuid references folhas_mensais(id) on delete cascade,
  professor_id uuid references professores(id),
  docente_nome text not null,
  -- Salário fixo (vai para contabilidade, consolidado)
  salario_fixo numeric(10,2) default 0,
  ajuda_custo numeric(10,2) default 0,
  -- Horas teóricas
  valor_hora_teorica numeric(8,2) default 0,
  horas_semanais_teoricas numeric(5,1) default 0,
  -- Horas práticas
  valor_hora_pratica numeric(8,2) default 0,
  horas_semanais_praticas numeric(5,1) default 0,
  -- Outros
  reposicao numeric(10,2) default 0,
  -- Descontos
  plano_saude numeric(10,2) default 0,
  farmacia numeric(10,2) default 0,
  adiantamento numeric(10,2) default 0,
  observacoes text,
  status text not null default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LANÇAMENTOS DOCENTE CONTRATO / HORISTA / PJ
create table if not exists lancamentos_docente_contrato (
  id uuid primary key default gen_random_uuid(),
  folha_id uuid references folhas_mensais(id) on delete cascade,
  professor_id uuid references professores(id),
  docente_nome text not null,
  vinculo text default 'Contrato', -- 'Contrato' | 'Horista' | 'PJ'
  inicio_contrato date,
  encerramento_contrato date,
  -- Valores fixos adicionais
  preceptoria numeric(10,2) default 0,
  coordenacao numeric(10,2) default 0,
  -- Horas teóricas
  valor_hora_teorica numeric(8,2) default 0,
  horas_semanais_teoricas numeric(5,1) default 0,
  -- Horas práticas
  valor_hora_pratica numeric(8,2) default 0,
  horas_semanais_praticas numeric(5,1) default 0,
  observacoes text,
  status text not null default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Triggers
create trigger lanc_doc_clt_updated_at before update on lancamentos_docente_clt for each row execute procedure handle_updated_at();
create trigger lanc_doc_cont_updated_at before update on lancamentos_docente_contrato for each row execute procedure handle_updated_at();

-- ============================================================
-- DADOS DE EXEMPLO — Maio/2026
-- ============================================================

-- Docente CLT
insert into lancamentos_docente_clt (folha_id, docente_nome, salario_fixo, ajuda_custo, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, reposicao, plano_saude, farmacia, adiantamento, status)
select id, 'Prof. Dr. João Almeida', 2966.63, 3255, 120.00, 4.0, 95.00, 2.0, 0, 480, 0, 0, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='docente' on conflict do nothing;

insert into lancamentos_docente_clt (folha_id, docente_nome, salario_fixo, ajuda_custo, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, reposicao, plano_saude, farmacia, adiantamento, status)
select id, 'Profa. Dra. Mariana Costa', 0, 0, 120.00, 4.0, 95.00, 4.8, 0, 594.98, 0, 0, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='docente' on conflict do nothing;

insert into lancamentos_docente_clt (folha_id, docente_nome, salario_fixo, ajuda_custo, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, reposicao, plano_saude, farmacia, adiantamento, status)
select id, 'Profa. Dra. Patrícia Nunes', 2966.63, 352, 120.00, 5.6, 95.00, 0.8, 0, 0, 0, 0, 'validado'
from folhas_mensais where mes=5 and ano=2026 and tipo='docente' on conflict do nothing;

-- Docente Contrato
insert into lancamentos_docente_contrato (folha_id, docente_nome, vinculo, inicio_contrato, encerramento_contrato, preceptoria, coordenacao, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, status)
select id, 'Prof. Me. Ricardo Tavares', 'Contrato', '2026-02-25', '2026-06-30', 1800, 0, 95.00, 0, 75.00, 0, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='docente' on conflict do nothing;

insert into lancamentos_docente_contrato (folha_id, docente_nome, vinculo, inicio_contrato, encerramento_contrato, preceptoria, coordenacao, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, status)
select id, 'Profa. Me. Sofia Andrade', 'Horista', '2025-08-04', '2026-06-30', 0, 0, 82.00, 6.4, 65.00, 0, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='docente' on conflict do nothing;

insert into lancamentos_docente_contrato (folha_id, docente_nome, vinculo, inicio_contrato, encerramento_contrato, preceptoria, coordenacao, valor_hora_teorica, horas_semanais_teoricas, valor_hora_pratica, horas_semanais_praticas, status, observacoes)
select id, 'Prof. Esp. Lucas Moreira', 'PJ', '2026-02-19', '2026-05-19', 1200, 3461.06, 68.00, 0, 55.00, 0, 'validado', 'Coordenação de curso inclusa'
from folhas_mensais where mes=5 and ano=2026 and tipo='docente' on conflict do nothing;
