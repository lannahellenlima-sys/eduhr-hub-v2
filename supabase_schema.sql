-- ============================================================
-- EduHR Hub — Schema Supabase
-- Execute este SQL no Supabase > SQL Editor
-- ============================================================

-- COLABORADORES
create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  ficha_numero text,
  nome text not null,
  cpf text,
  rg text,
  email text,
  data_nascimento date,
  data_admissao date not null,
  estado_civil text,
  tipo_sanguineo text,
  grau_instrucao text,
  naturalidade text,
  nacionalidade text default 'Brasileira',
  telefone text,
  endereco text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  funcao text not null,
  departamento text not null,
  vinculo text not null default 'CLT',
  regime_trabalho text default 'Integral (40h)',
  salario_base numeric(10,2) not null default 0,
  centro_custo text,
  banco text,
  agencia text,
  conta text,
  pix text,
  nome_pai text,
  nome_mae text,
  conjuge text,
  dependentes text,
  foto_url text,
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HISTÓRICO SALARIAL
create table if not exists historico_salarial (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references colaboradores(id) on delete cascade,
  tipo text not null, -- 'Admissão' | 'Reajuste geral' | 'Promoção' | 'Correção' | 'Outro'
  salario_anterior numeric(10,2),
  novo_salario numeric(10,2) not null,
  percentual numeric(6,2),
  data_vigencia date not null,
  observacoes text,
  registrado_por text,
  created_at timestamptz default now()
);

-- DOCUMENTOS
create table if not exists documentos_colaborador (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references colaboradores(id) on delete cascade,
  tipo text not null,
  descricao text,
  status text not null default 'pendente', -- 'ok' | 'pendente' | 'vencido'
  data_validade date,
  solicitado_em date,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS (Row Level Security) — habilitar depois de configurar autenticação
-- alter table colaboradores enable row level security;
-- alter table historico_salarial enable row level security;
-- alter table documentos_colaborador enable row level security;

-- Trigger para updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger colaboradores_updated_at
  before update on colaboradores
  for each row execute procedure handle_updated_at();

create trigger documentos_updated_at
  before update on documentos_colaborador
  for each row execute procedure handle_updated_at();

-- DADOS DE EXEMPLO
insert into colaboradores (ficha_numero, nome, cpf, rg, email, data_nascimento, data_admissao, estado_civil, tipo_sanguineo, grau_instrucao, telefone, endereco, bairro, cidade, estado, cep, funcao, departamento, vinculo, regime_trabalho, salario_base, centro_custo, banco, agencia, conta, pix, nome_pai, nome_mae, conjuge, dependentes, ativo) values
('0042', 'Ana Beatriz Souza', '123.456.789-12', '1.234.567 SSP/MA', 'ana.souza@ies.edu.br', '1990-07-14', '2021-03-15', 'Casada', 'O+', 'Pós-graduação', '(99) 98765-4321', 'Rua das Flores, 123', 'Centro', 'Imperatriz', 'MA', '65900-000', 'Analista de RH', 'Recursos Humanos', 'CLT', 'Integral (40h)', 5800, 'ADM-RH', 'Caixa Econômica Federal', '0842-5', '12345-6', 'CPF', 'José Souza', 'Maria Souza', 'Paulo Henrique Mendes', 'Lucas Mendes (filho, 5 anos)', true),
('0043', 'Carlos Eduardo Lima', '123.456.789-34', '2.345.678 SSP/MA', 'carlos.lima@ies.edu.br', '1985-03-22', '2019-08-02', 'Casado', 'A+', 'Pós-graduação', '(99) 98888-1234', 'Av. Principal, 500', 'Centro', 'Imperatriz', 'MA', '65900-100', 'Coord. Financeiro', 'Financeiro', 'CLT', 'Integral (40h)', 9800, 'ADM-FIN', 'Banco do Brasil', '1234-5', '67890-1', 'CPF', 'Antônio Lima', 'Rosa Lima', null, null, true),
('0044', 'Daniela Ribeiro', '123.456.789-56', '3.456.789 SSP/MA', 'daniela.r@ies.edu.br', '1993-11-05', '2018-01-20', 'Solteira', 'B-', 'Graduação', '(99) 97777-5678', 'Rua 10, 45', 'Jardim', 'Imperatriz', 'MA', '65900-200', 'Secretária Acadêmica', 'Secretaria', 'CLT', 'Integral (40h)', 5200, 'ADM-SEC', 'Itaú', '5678-9', '11111-2', 'E-mail', null, 'Lúcia Ribeiro', null, null, true),
('0045', 'Eduardo Martins', '123.456.789-78', '4.567.890 SSP/MA', 'eduardo.m@ies.edu.br', '1998-06-18', '2022-06-10', 'Solteiro', 'AB+', 'Ensino Superior', '(99) 96666-9012', 'Rua Nova, 200', 'Novo', 'Imperatriz', 'MA', '65900-300', 'Técnico de TI', 'Tecnologia', 'CLT', 'Integral (40h)', 4900, 'ADM-TI', 'Nubank', null, null, 'CPF', null, 'Sandra Martins', null, null, true),
('0046', 'Fernanda Cardoso', '123.456.789-90', '5.678.901 SSP/MA', 'fernanda.c@ies.edu.br', '1988-09-30', '2020-09-14', 'Casada', 'O-', 'Especialização', '(99) 95555-3456', 'Rua das Palmeiras, 78', 'Palmeiral', 'Imperatriz', 'MA', '65900-400', 'Bibliotecária', 'Biblioteca', 'CLT', 'Parcial (20h)', 4600, 'ADM-BIB', 'Bradesco', '9012-3', '22222-3', 'Telefone', 'João Cardoso', 'Ana Cardoso', 'Bruno Cardoso', 'Isabela Cardoso (filha, 8 anos)', true)
on conflict do nothing;

-- Histórico salarial de exemplo (Ana Beatriz)
insert into historico_salarial (colaborador_id, tipo, salario_anterior, novo_salario, percentual, data_vigencia, observacoes, registrado_por)
select id, 'Admissão', null, 4200, null, '2021-03-15', 'Salário inicial na admissão como Assistente de RH.', 'Sistema'
from colaboradores where nome = 'Ana Beatriz Souza'
on conflict do nothing;

insert into historico_salarial (colaborador_id, tipo, salario_anterior, novo_salario, percentual, data_vigencia, observacoes, registrado_por)
select id, 'Reajuste geral', 4200, 4620, 10.0, '2022-03-15', 'Reajuste anual conforme CCT 2022.', 'Lanna Hellen'
from colaboradores where nome = 'Ana Beatriz Souza'
on conflict do nothing;

insert into historico_salarial (colaborador_id, tipo, salario_anterior, novo_salario, percentual, data_vigencia, observacoes, registrado_por)
select id, 'Promoção', 4620, 5200, 12.55, '2023-07-01', 'Promoção de Assistente para Analista de RH após conclusão de pós-graduação e avaliação de desempenho com nota 9,2.', 'Lanna Hellen'
from colaboradores where nome = 'Ana Beatriz Souza'
on conflict do nothing;

insert into historico_salarial (colaborador_id, tipo, salario_anterior, novo_salario, percentual, data_vigencia, observacoes, registrado_por)
select id, 'Reajuste geral', 5200, 5800, 11.54, '2025-03-15', 'Reajuste anual aplicado conforme CCT 2025. Percentual acordado com a direção geral em reunião de fevereiro/2025.', 'Lanna Hellen'
from colaboradores where nome = 'Ana Beatriz Souza'
on conflict do nothing;

-- Documentos de exemplo
insert into documentos_colaborador (colaborador_id, tipo, descricao, status, solicitado_em)
select id, 'CTPS', 'Carteira de Trabalho e Previdência Social', 'ok', '2021-03-15'
from colaboradores where nome = 'Ana Beatriz Souza' on conflict do nothing;

insert into documentos_colaborador (colaborador_id, tipo, descricao, status, solicitado_em)
select id, 'RG / CPF', 'Documentos de identidade', 'ok', '2021-03-15'
from colaboradores where nome = 'Ana Beatriz Souza' on conflict do nothing;

insert into documentos_colaborador (colaborador_id, tipo, descricao, status, data_validade, solicitado_em)
select id, 'ASO', 'Atestado de Saúde Ocupacional — admissional', 'ok', '2026-03-15', '2021-03-15'
from colaboradores where nome = 'Ana Beatriz Souza' on conflict do nothing;

insert into documentos_colaborador (colaborador_id, tipo, descricao, status, solicitado_em)
select id, 'Diploma / Certificado', 'Diploma de pós-graduação', 'pendente', '2025-04-15'
from colaboradores where nome = 'Ana Beatriz Souza' on conflict do nothing;
