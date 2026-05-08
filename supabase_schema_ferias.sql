-- ============================================================
-- EduHR Hub — Schema Calendário de Férias
-- Execute no Supabase > SQL Editor
-- ============================================================

create table if not exists programacoes_ferias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_pessoa text not null default 'colaborador', -- 'colaborador' | 'professor'
  colaborador_id uuid references colaboradores(id) on delete set null,
  professor_id uuid references professores(id) on delete set null,
  data_inicio date not null,
  data_fim date not null,
  dias_corridos integer not null default 30,
  periodo_aquisitivo_inicio date,
  periodo_aquisitivo_fim date,
  status text not null default 'programada', -- 'programada' | 'em_gozo' | 'concluida' | 'cancelada'
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger ferias_updated_at
  before update on programacoes_ferias
  for each row execute procedure handle_updated_at();

-- Dados de exemplo
insert into programacoes_ferias (nome, tipo_pessoa, data_inicio, data_fim, dias_corridos, periodo_aquisitivo_inicio, periodo_aquisitivo_fim, status) values
('Ana Beatriz Souza', 'colaborador', '2026-06-01', '2026-06-30', 30, '2024-03-15', '2025-03-15', 'programada'),
('Carlos Eduardo Lima', 'colaborador', '2026-07-01', '2026-07-30', 30, '2024-08-02', '2025-08-02', 'programada'),
('Daniela Ribeiro', 'colaborador', '2026-05-05', '2026-05-19', 15, '2023-01-20', '2024-01-20', 'em_gozo'),
('Prof. Dr. João Almeida', 'professor', '2026-07-15', '2026-08-13', 30, '2025-02-01', '2026-02-01', 'programada'),
('Profa. Dra. Mariana Costa', 'professor', '2026-07-01', '2026-07-30', 30, '2025-03-01', '2026-03-01', 'programada')
on conflict do nothing;
