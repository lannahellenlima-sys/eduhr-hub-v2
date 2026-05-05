# EduHR Hub v2 — Módulo de Colaboradores

Plataforma de RH para Instituições de Ensino Superior.  
Stack: React + Vite + Supabase + Vercel

---

## 🚀 Passo a passo completo

### 1. Supabase — criar projeto

1. Acesse [supabase.com](https://supabase.com) → **Start your project**
2. Entre com GitHub ou crie uma conta
3. Clique em **New project**
   - Nome: `eduhr-hub`
   - Senha: (anote bem)
   - Região: **South America (São Paulo)**
4. Aguarde o projeto ser criado (~1 min)

### 2. Supabase — rodar o schema

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New query**
3. Cole todo o conteúdo do arquivo `supabase_schema.sql` e clique em **Run**
4. Isso vai criar as tabelas e os dados de exemplo

### 3. Supabase — pegar as credenciais

1. Vá em **Settings → API** no menu lateral
2. Copie:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon public** → chave longa começando com `eyJ...`

### 4. Configurar o projeto localmente

```bash
# 1. Extraia o ZIP e entre na pasta
cd eduhr-hub

# 2. Instale as dependências
npm install

# 3. Crie o arquivo de variáveis de ambiente
cp .env.example .env
```

Abra o `.env` e preencha:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...sua_chave_aqui
```

### 5. Rodar localmente

```bash
npm run dev
```

Acesse `http://localhost:5173` — a plataforma vai estar rodando!

### 6. Publicar no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Crie um repositório no GitHub e envie o projeto:
   ```bash
   git init
   git add .
   git commit -m "EduHR Hub v2"
   git remote add origin https://github.com/SEU_USUARIO/eduhr-hub.git
   git push -u origin main
   ```
3. No Vercel, clique em **Add New Project** → selecione o repositório
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anon
5. Clique em **Deploy** — em ~1 min estará no ar com URL pública!

---

## 📦 Estrutura do projeto

```
src/
├── components/
│   ├── Layout.jsx              # Sidebar + topbar
│   ├── Layout.css
│   ├── ModalNovoSalario.jsx    # Modal de alteração salarial
│   └── ModalEmailNotificacao.jsx
├── hooks/
│   └── useColaboradores.js     # Todas as queries Supabase
├── lib/
│   ├── supabase.js             # Cliente Supabase
│   └── utils.js                # Funções auxiliares
├── pages/
│   ├── ColaboradoresLista.jsx  # Listagem com busca
│   ├── ColaboradorFicha.jsx    # Ficha completa + tabs
│   └── ColaboradorNovo.jsx     # Formulário de cadastro
├── App.jsx                     # Rotas
├── main.jsx
└── index.css                   # Estilos globais
```

---

## ✅ Funcionalidades do módulo

- **Listagem** de colaboradores com busca, filtros e badge de documentos pendentes
- **Ficha completa** com 3 abas: Dados | Histórico Salarial | Documentos
- **Foto**: upload direto para o Supabase Storage (bucket `eduhr`)
- **Histórico salarial**: registros com tipo, percentual calculado automaticamente e observações
- **Documentos**: marcar OK/pendente, adicionar novos, alertas visuais
- **Notificação por e-mail**: pré-visualização do e-mail com lista de pendências
- **Impressão**: layout limpo sem menus, com campo de assinatura

---

## 📧 E-mail real (próximo passo)

Para enviar e-mails de verdade, crie uma **Supabase Edge Function** com [Resend](https://resend.com) (gratuito até 3.000 e-mails/mês):

```bash
# Na pasta do projeto
supabase functions new send-email
```

---

## 🔜 Próximos módulos

- Professores (mesma estrutura, campos acadêmicos extras)
- Folha Administrativa
- Folha Docente
- Calendário de Férias
- Relatórios e fechamento mensal
