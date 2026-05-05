-- ============================================================
-- EduHR Hub — Schema Folha Administrativa
-- Execute no Supabase > SQL Editor (após schemas anteriores)
-- ============================================================

-- FOLHAS MENSAIS (cabeçalho)
create table if not exists folhas_mensais (
  id uuid primary key default gen_random_uuid(),
  mes integer not null,        -- 1-12
  ano integer not null,
  tipo text not null,          -- 'administrativo' | 'docente'
  status text not null default 'aberta', -- 'aberta' | 'em_conferencia' | 'fechada' | 'enviada_financeiro'
  data_fechamento date,
  fechada_por text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(mes, ano, tipo)
);

-- LANÇAMENTOS CLT ADMINISTRATIVO
create table if not exists lancamentos_adm_clt (
  id uuid primary key default gen_random_uuid(),
  folha_id uuid references folhas_mensais(id) on delete cascade,
  colaborador_id uuid references colaboradores(id),
  colaborador_nome text not null,
  funcao text,
  departamento text,
  vinculo text default 'CLT',
  salario_bruto numeric(10,2) not null default 0,
  reajuste_pct numeric(6,2) default 0,
  dias_trabalhados integer default 30,
  ajuda_custo numeric(10,2) default 0,
  vale_refeicao numeric(10,2) default 0,
  gratificacao numeric(10,2) default 0,
  ats numeric(10,2) default 0,         -- Adicional por Tempo de Serviço
  farmacia numeric(10,2) default 0,
  adiantamento numeric(10,2) default 0,
  plano_saude numeric(10,2) default 0,
  observacoes text,
  status text not null default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LANÇAMENTOS GRATIFICAÇÕES
create table if not exists lancamentos_gratificacoes (
  id uuid primary key default gen_random_uuid(),
  folha_id uuid references folhas_mensais(id) on delete cascade,
  colaborador_id uuid references colaboradores(id),
  colaborador_nome text not null,
  atividade text not null,
  inicio date,
  valor_bruto numeric(10,2) not null default 0,
  reajuste_pct numeric(6,2) default 0,
  ajuda_custo numeric(10,2) default 0,
  observacoes text,
  status text not null default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LANÇAMENTOS COORDENADORES
create table if not exists lancamentos_coordenadores (
  id uuid primary key default gen_random_uuid(),
  folha_id uuid references folhas_mensais(id) on delete cascade,
  professor_id uuid references professores(id),
  nome text not null,
  atividade text not null,
  inicio date,
  valor numeric(10,2) not null default 0,
  reajuste_pct numeric(6,2) default 0,
  plano_saude numeric(10,2) default 0,
  observacoes text,
  status text not null default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LANÇAMENTOS SÓCIOS/DIRETORES
create table if not exists lancamentos_socios (
  id uuid primary key default gen_random_uuid(),
  folha_id uuid references folhas_mensais(id) on delete cascade,
  nome text not null,
  atividade text not null,
  salario_base numeric(10,2) not null default 0,
  reajuste_pct numeric(6,2) default 0,
  dias_trabalhados integer default 30,
  ats numeric(10,2) default 0,
  gratificacao numeric(10,2) default 0,
  sociedade numeric(10,2) default 0,
  farmacia numeric(10,2) default 0,
  plano_saude numeric(10,2) default 0,
  adiantamento numeric(10,2) default 0,
  observacoes text,
  status text not null default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LANÇAMENTOS VALE-ALIMENTAÇÃO
create table if not exists lancamentos_vale_alim (
  id uuid primary key default gen_random_uuid(),
  folha_id uuid references folhas_mensais(id) on delete cascade,
  colaborador_id uuid references colaboradores(id),
  colaborador_nome text not null,
  funcao text,
  valor_padrao numeric(10,2) default 0,
  valor_lancado numeric(10,2) default 0,
  observacoes text,
  status text not null default 'rascunho',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Triggers updated_at
create trigger folhas_updated_at before update on folhas_mensais for each row execute procedure handle_updated_at();
create trigger lanc_clt_updated_at before update on lancamentos_adm_clt for each row execute procedure handle_updated_at();
create trigger lanc_grat_updated_at before update on lancamentos_gratificacoes for each row execute procedure handle_updated_at();
create trigger lanc_coord_updated_at before update on lancamentos_coordenadores for each row execute procedure handle_updated_at();
create trigger lanc_socios_updated_at before update on lancamentos_socios for each row execute procedure handle_updated_at();
create trigger lanc_vale_updated_at before update on lancamentos_vale_alim for each row execute procedure handle_updated_at();

-- ============================================================
-- DADOS DE EXEMPLO — Maio/2026
-- ============================================================
insert into folhas_mensais (mes, ano, tipo, status) values
  (4, 2026, 'administrativo', 'fechada'),
  (4, 2026, 'docente', 'fechada'),
  (5, 2026, 'administrativo', 'aberta'),
  (5, 2026, 'docente', 'aberta')
on conflict (mes, ano, tipo) do nothing;

-- CLT — Maio/2026
insert into lancamentos_adm_clt (folha_id, colaborador_nome, funcao, departamento, vinculo, salario_bruto, reajuste_pct, dias_trabalhados, ajuda_custo, vale_refeicao, gratificacao, ats, farmacia, adiantamento, plano_saude, status)
select id, 'Ana Beatriz Souza', 'Analista de RH', 'Recursos Humanos', 'CLT', 5800, 5, 30, 200, 600, 0, 174, 80, 0, 320, 'validado'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_adm_clt (folha_id, colaborador_nome, funcao, departamento, vinculo, salario_bruto, reajuste_pct, dias_trabalhados, ajuda_custo, vale_refeicao, gratificacao, ats, farmacia, adiantamento, plano_saude, status)
select id, 'Carlos Eduardo Lima', 'Coord. Financeiro', 'Financeiro', 'CLT', 9800, 5, 30, 300, 600, 0, 588, 120, 0, 480, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_adm_clt (folha_id, colaborador_nome, funcao, departamento, vinculo, salario_bruto, reajuste_pct, dias_trabalhados, ajuda_custo, vale_refeicao, gratificacao, ats, farmacia, adiantamento, plano_saude, status, observacoes)
select id, 'Daniela Ribeiro', 'Secretária Acadêmica', 'Secretaria', 'CLT', 5200, 5, 15, 200, 600, 0, 260, 0, 500, 320, 'rascunho', 'Em férias — 15 dias'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_adm_clt (folha_id, colaborador_nome, funcao, departamento, vinculo, salario_bruto, reajuste_pct, dias_trabalhados, ajuda_custo, vale_refeicao, gratificacao, ats, farmacia, adiantamento, plano_saude, status)
select id, 'Eduardo Martins', 'Técnico de TI', 'Tecnologia', 'CLT', 4900, 5, 30, 150, 600, 0, 0, 0, 200, 280, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_adm_clt (folha_id, colaborador_nome, funcao, departamento, vinculo, salario_bruto, reajuste_pct, dias_trabalhados, ajuda_custo, vale_refeicao, gratificacao, ats, farmacia, adiantamento, plano_saude, status)
select id, 'Fernanda Cardoso', 'Bibliotecária', 'Biblioteca', 'CLT', 4600, 5, 30, 150, 300, 0, 184, 0, 0, 280, 'validado'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

-- Gratificações
insert into lancamentos_gratificacoes (folha_id, colaborador_nome, atividade, inicio, valor_bruto, reajuste_pct, ajuda_custo, status)
select id, 'Ana Beatriz Souza', 'NDE — Núcleo Docente Estruturante', '2025-08-01', 800, 5, 100, 'validado'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_gratificacoes (folha_id, colaborador_nome, atividade, inicio, valor_bruto, reajuste_pct, ajuda_custo, status)
select id, 'Carlos Eduardo Lima', 'CPA — Comissão Própria de Avaliação', '2024-02-01', 1200, 5, 150, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

-- Coordenadores
insert into lancamentos_coordenadores (folha_id, nome, atividade, inicio, valor, reajuste_pct, plano_saude, status)
select id, 'Prof. Dr. João Almeida', 'Coordenação Eng. de Software', '2024-03-01', 3500, 5, 480, 'validado'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_coordenadores (folha_id, nome, atividade, inicio, valor, reajuste_pct, plano_saude, status)
select id, 'Profa. Dra. Mariana Costa', 'Coordenação Administração', '2025-02-01', 3200, 5, 480, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

-- Sócios
insert into lancamentos_socios (folha_id, nome, atividade, salario_base, reajuste_pct, dias_trabalhados, ats, gratificacao, sociedade, farmacia, plano_saude, adiantamento, status)
select id, 'Roberto Mendes', 'Diretor Presidente', 25000, 5, 30, 1500, 3000, 12000, 200, 800, 0, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_socios (folha_id, nome, atividade, salario_base, reajuste_pct, dias_trabalhados, ats, gratificacao, sociedade, farmacia, plano_saude, adiantamento, status)
select id, 'Cláudia Vasques', 'Diretora Acadêmica', 22000, 5, 30, 1200, 2500, 8000, 150, 800, 0, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

-- Vale-Alimentação
insert into lancamentos_vale_alim (folha_id, colaborador_nome, funcao, valor_padrao, valor_lancado, status)
select id, 'Ana Beatriz Souza', 'Analista de RH', 600, 600, 'validado'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_vale_alim (folha_id, colaborador_nome, funcao, valor_padrao, valor_lancado, status)
select id, 'Carlos Eduardo Lima', 'Coord. Financeiro', 600, 600, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_vale_alim (folha_id, colaborador_nome, funcao, valor_padrao, valor_lancado, status)
select id, 'Daniela Ribeiro', 'Secretária Acadêmica', 600, 300, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_vale_alim (folha_id, colaborador_nome, funcao, valor_padrao, valor_lancado, status)
select id, 'Eduardo Martins', 'Técnico de TI', 600, 600, 'rascunho'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;

insert into lancamentos_vale_alim (folha_id, colaborador_nome, funcao, valor_padrao, valor_lancado, status)
select id, 'Fernanda Cardoso', 'Bibliotecária', 600, 600, 'validado'
from folhas_mensais where mes=5 and ano=2026 and tipo='administrativo' on conflict do nothing;
