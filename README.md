# Mudança de Vida — Cronograma & Evolução

App pessoal de organização de projetos, etapas e cronograma semanal, com
sincronização para Google Agenda.

## Como subir no GitHub

1. Crie o repositório `carolbcmt/mudanca-de-vida` no GitHub (vazio, sem README).
2. Faça upload de todos os arquivos e pastas deste projeto (preservando a
   estrutura de pastas `src/`, `src/components/`, `src/lib/`) usando
   "Add file" → "Upload files" no GitHub web, ou arraste a pasta inteira.
3. **Não suba o arquivo `.env`** (ele nem existe aqui — só o `.env.example`,
   que é seguro e não tem segredo nenhum, é só um modelo).

## Como fazer o deploy no Vercel

1. No painel do Vercel, "Add New" → "Project" → importe o repositório
   `carolbcmt/mudanca-de-vida`.
2. Framework preset: **Vite** (o Vercel detecta sozinho).
3. Em "Environment Variables", adicione as três:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_GOOGLE_CLIENT_ID` (você vai pegar essa no Google Cloud Console)
4. Clique em "Deploy".

## Depois do primeiro deploy

Pegue a URL que o Vercel gerou (ex: `mudanca-de-vida.vercel.app`) e volte
no Google Cloud Console → Credenciais → seu OAuth Client ID → edite:

- Em **"Origens JavaScript autorizadas"**, adicione:
  `https://mudanca-de-vida.vercel.app`
- Em **"URIs de redirecionamento autorizados"**, não é necessário para o
  fluxo usado aqui (token client / Google Identity Services), pode deixar
  em branco.

Depois cole o **Client ID** (não o secret) na variável `VITE_GOOGLE_CLIENT_ID`
no Vercel e faça um novo deploy (Vercel → Deployments → "Redeploy").

## Como criar seu usuário de login

Esse app não tem cadastro público. Para criar seu acesso:

1. Painel do Supabase → **Authentication** → **Users** → **Add user**
2. Preencha seu e-mail e uma senha
3. Use essas mesmas credenciais para entrar no app

## Sobre a Google Agenda

A integração usa o fluxo client-side do Google (Google Identity Services).
Isso significa:

- Não precisa de backend nem de client secret exposto.
- O acesso dura cerca de 1 hora por sessão — se passar desse tempo, é só
  clicar em "Conectar" de novo.
- Cada etapa com dia da semana marcado pode ser enviada como evento real
  na sua Google Agenda (com horário, se você preencheu um).

## Rodando localmente (opcional)

```bash
npm install
cp .env.example .env
# edite o .env com seus valores reais
npm run dev
```
