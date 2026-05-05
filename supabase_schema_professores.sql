-- ============================================================
-- EduHR Hub — Schema Professores
-- Execute no Supabase > SQL Editor (após o schema de colaboradores)
-- ============================================================

-- PROFESSORES
create table if not exists professores (
  id uuid primary key default gen_random_uuid(),
  ficha_numero text,
  nome text not null,
  cpf text,
  rg text,
  email text,
  data_nascimento date,
  data_admissao date,
  estado_civil text,
  tipo_sanguineo text,
  naturalidade text,
  nacionalidade text default 'Brasileira',
  telefone text,
  endereco text,
  bairro text,
  cidade text,
  estado text,
  cep text,

  -- Acadêmicos
  titulacao text not null, -- 'Especialista' | 'Mestre' | 'Doutor'
  plano text not null,     -- 'PI' | 'PII' | 'PIII'
  area_atuacao text,
  instituicao_formacao text,
  lattes text,
  registro_profissional text, -- OAB, CRM, CREA etc.

  -- Funcionais
  vinculo text not null default 'CLT', -- 'CLT' | 'Contrato' | 'Horista' | 'PJ'
  regime_trabalho text,
  curso_principal text,
  valor_hora_teorica numeric(8,2),
  valor_hora_pratica numeric(8,2),
  banco text,
  agencia text,
  conta text,
  pix text,

  -- Família
  nome_pai text,
  nome_mae text,
  conjuge text,
  dependentes text,

  -- Foto
  foto_url text,
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HISTÓRICO DE PLANO DOCENTE (PI → PII → PIII)
create table if not exists historico_plano_docente (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references professores(id) on delete cascade,
  tipo text not null, -- 'Admissão' | 'Progressão' | 'Reajuste tabela' | 'Correção' | 'Outro'
  plano_anterior text,
  plano_novo text not null,
  titulacao_anterior text,
  titulacao_nova text,
  valor_hora_anterior numeric(8,2),
  novo_valor_hora numeric(8,2) not null,
  percentual numeric(6,2),
  data_vigencia date not null,
  observacoes text,
  registrado_por text,
  created_at timestamptz default now()
);

-- DISCIPLINAS DO SEMESTRE
create table if not exists disciplinas_professor (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references professores(id) on delete cascade,
  semestre text not null, -- ex: '2025.1'
  disciplina text not null,
  turma text,
  curso text,
  horas_semanais_teoricas numeric(4,1) default 0,
  horas_semanais_praticas numeric(4,1) default 0,
  created_at timestamptz default now()
);

-- ATIVIDADES GRATIFICADAS
create table if not exists atividades_gratificadas_professor (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references professores(id) on delete cascade,
  atividade text not null, -- 'NDE' | 'CPA' | 'Orientação de TCC' | 'Coord. de Extensão' | 'Supervisão de Estágio'
  ativo boolean not null default true,
  data_inicio date,
  data_fim date,
  observacoes text,
  created_at timestamptz default now()
);

-- CONTRATOS (para vínculos por tempo determinado)
create table if not exists contratos_professor (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references professores(id) on delete cascade,
  tipo text not null, -- 'Determinado' | 'Indeterminado' | 'Experiência'
  semestre text,      -- ex: '2025.1'
  data_inicio date not null,
  data_fim date,
  renovacoes integer default 0,
  status text default 'ativo', -- 'ativo' | 'encerrado' | 'renovado'
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- DOCUMENTOS PROFESSOR
create table if not exists documentos_professor (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references professores(id) on delete cascade,
  tipo text not null,
  descricao text,
  status text not null default 'pendente', -- 'ok' | 'pendente' | 'vencido'
  data_validade date,
  solicitado_em date,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger updated_at
create trigger professores_updated_at
  before update on professores
  for each row execute procedure handle_updated_at();

create trigger contratos_updated_at
  before update on contratos_professor
  for each row execute procedure handle_updated_at();

create trigger documentos_prof_updated_at
  before update on documentos_professor
  for each row execute procedure handle_updated_at();

-- ============================================================
-- DADOS DE EXEMPLO
-- ============================================================
insert into professores (ficha_numero, nome, cpf, rg, email, data_nascimento, data_admissao, estado_civil, tipo_sanguineo, naturalidade, telefone, endereco, bairro, cidade, estado, cep, titulacao, plano, area_atuacao, instituicao_formacao, lattes, registro_profissional, vinculo, regime_trabalho, curso_principal, valor_hora_teorica, valor_hora_pratica, ativo) values
('0017', 'Prof. Dr. João Almeida', '987.654.321-01', '9.876.543 SSP/MA', 'joao.almeida@ies.edu.br', '1975-04-22', '2016-02-01', 'Casado', 'O+', 'Imperatriz/MA', '(99) 99123-4567', 'Rua Acadêmica, 10', 'Centro', 'Imperatriz', 'MA', '65900-000', 'Doutor', 'PIII', 'Engenharia de Software', 'UFMA', 'lattes.cnpq.br/0000000001', 'CREA/MA 12345', 'CLT', 'Parcial (20h)', 'Engenharia de Software', 120.00, 95.00, true),
('0018', 'Profa. Dra. Mariana Costa', '987.654.321-02', '8.765.432 SSP/MA', 'mariana.costa@ies.edu.br', '1980-08-15', '2018-03-01', 'Casada', 'A+', 'São Luís/MA', '(99) 99234-5678', 'Av. Universitária, 200', 'Jardim', 'Imperatriz', 'MA', '65900-100', 'Doutor', 'PIII', 'Gestão Estratégica', 'UFMA', 'lattes.cnpq.br/0000000002', null, 'CLT', 'Parcial (20h)', 'Administração', 120.00, 95.00, true),
('0019', 'Prof. Me. Ricardo Tavares', '987.654.321-03', '7.654.321 SSP/MA', 'ricardo.t@ies.edu.br', '1985-11-30', '2020-02-01', 'Solteiro', 'B+', 'Imperatriz/MA', '(99) 99345-6789', 'Rua Nova, 33', 'Novo', 'Imperatriz', 'MA', '65900-200', 'Mestre', 'PII', 'Direito Civil e Processual', 'UNICEUMA', 'lattes.cnpq.br/0000000003', 'OAB/MA 54321', 'Contrato', 'Horista', 'Direito', 95.00, 75.00, true),
('0020', 'Profa. Me. Sofia Andrade', '987.654.321-04', '6.543.210 SSP/MA', 'sofia.a@ies.edu.br', '1990-03-08', '2022-08-01', 'Casada', 'AB-', 'Açailândia/MA', '(99) 99456-7890', 'Rua Educação, 55', 'Centro', 'Imperatriz', 'MA', '65900-300', 'Mestre', 'PI', 'Pedagogia e Educação Especial', 'UFMA', 'lattes.cnpq.br/0000000004', null, 'Contrato', 'Horista', 'Pedagogia', 82.00, 65.00, true),
('0021', 'Prof. Esp. Lucas Moreira', '987.654.321-05', '5.432.109 SSP/MA', 'lucas.m@ies.edu.br', '1988-07-20', '2023-02-01', 'Solteiro', 'O-', 'Imperatriz/MA', '(99) 99567-8901', 'Rua das Flores, 77', 'Palmeiral', 'Imperatriz', 'MA', '65900-400', 'Especialista', 'PI', 'Sistemas de Informação', 'FACIMP', 'lattes.cnpq.br/0000000005', 'CREA/MA 99999', 'Contrato', 'Horista', 'Engenharia de Software', 68.00, 55.00, true),
('0022', 'Profa. Dra. Patrícia Nunes', '987.654.321-06', '4.321.098 SSP/MA', 'patricia.n@ies.edu.br', '1978-12-01', '2019-07-01', 'Divorciada', 'A-', 'Teresina/PI', '(99) 99678-9012', 'Av. Central, 300', 'Centro', 'Imperatriz', 'MA', '65900-500', 'Doutor', 'PIII', 'Psicologia Clínica e Organizacional', 'UFC', 'lattes.cnpq.br/0000000006', 'CRP 23/00123', 'CLT', 'Integral (40h)', 'Psicologia', 120.00, 95.00, true)
on conflict do nothing;

-- Histórico de plano (João Almeida)
insert into historico_plano_docente (professor_id, tipo, plano_anterior, plano_novo, titulacao_anterior, titulacao_nova, valor_hora_anterior, novo_valor_hora, percentual, data_vigencia, observacoes, registrado_por)
select id, 'Admissão', null, 'PII', null, 'Mestre', null, 82.00, null, '2016-02-01', 'Admissão como PII Mestre.', 'Sistema'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

insert into historico_plano_docente (professor_id, tipo, plano_anterior, plano_novo, titulacao_anterior, titulacao_nova, valor_hora_anterior, novo_valor_hora, percentual, data_vigencia, observacoes, registrado_por)
select id, 'Progressão', 'PII', 'PIII', 'Mestre', 'Doutor', 82.00, 102.00, 24.4, '2019-03-01', 'Progressão após defesa de doutorado pela UFMA e aprovação em reunião do conselho acadêmico em fevereiro/2019.', 'Lanna Hellen'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

insert into historico_plano_docente (professor_id, tipo, plano_anterior, plano_novo, titulacao_anterior, titulacao_nova, valor_hora_anterior, novo_valor_hora, percentual, data_vigencia, observacoes, registrado_por)
select id, 'Reajuste tabela', 'PIII', 'PIII', 'Doutor', 'Doutor', 102.00, 120.00, 17.6, '2025-02-01', 'Reajuste da tabela de hora-aula PIII Doutor aprovado pela direção para 2025. Aplicado a todos os docentes do plano PIII.', 'Lanna Hellen'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

-- Disciplinas semestre atual
insert into disciplinas_professor (professor_id, semestre, disciplina, turma, curso, horas_semanais_teoricas, horas_semanais_praticas)
select id, '2025.1', 'Engenharia de Software I', 'ES-A', 'Engenharia de Software', 4.0, 1.0
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

insert into disciplinas_professor (professor_id, semestre, disciplina, turma, curso, horas_semanais_teoricas, horas_semanais_praticas)
select id, '2025.1', 'Banco de Dados', 'ES-B', 'Engenharia de Software', 3.0, 1.0
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

-- Atividades gratificadas
insert into atividades_gratificadas_professor (professor_id, atividade, ativo, data_inicio)
select id, 'NDE — Núcleo Docente Estruturante', true, '2020-02-01'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

insert into atividades_gratificadas_professor (professor_id, atividade, ativo, data_inicio)
select id, 'Orientação de TCC', true, '2021-02-01'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

-- Contrato (Ricardo Tavares)
insert into contratos_professor (professor_id, tipo, semestre, data_inicio, data_fim, renovacoes, status)
select id, 'Determinado', '2025.1', '2025-02-01', '2025-06-30', 2, 'ativo'
from professores where nome = 'Prof. Me. Ricardo Tavares' on conflict do nothing;

-- Documentos (João Almeida — todos OK)
insert into documentos_professor (professor_id, tipo, descricao, status)
select id, 'Diploma de doutorado', 'Diploma UFMA — Engenharia de Software', 'ok'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

insert into documentos_professor (professor_id, tipo, descricao, status, data_validade)
select id, 'ASO — Exame periódico', 'Atestado de Saúde Ocupacional', 'ok', '2026-02-01'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

insert into documentos_professor (professor_id, tipo, descricao, status)
select id, 'CTPS', 'Carteira de Trabalho', 'ok'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

insert into documentos_professor (professor_id, tipo, descricao, status)
select id, 'Contrato assinado — 2025.1', null, 'ok'
from professores where nome = 'Prof. Dr. João Almeida' on conflict do nothing;

-- Documentos (Ricardo Tavares — 1 pendente)
insert into documentos_professor (professor_id, tipo, descricao, status)
select id, 'Diploma de mestrado', 'Diploma UNICEUMA', 'ok'
from professores where nome = 'Prof. Me. Ricardo Tavares' on conflict do nothing;

insert into documentos_professor (professor_id, tipo, descricao, status, solicitado_em)
select id, 'Contrato assinado — 2025.1', 'Aguardando assinatura do contrato semestral', 'pendente', '2025-02-01'
from professores where nome = 'Prof. Me. Ricardo Tavares' on conflict do nothing;
