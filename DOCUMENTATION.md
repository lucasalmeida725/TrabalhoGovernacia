# Plataforma de Diagnóstico de Maturidade de TI

## Visão Geral

Plataforma web completa para auditores e consultores avaliarem a infraestrutura de TI de empresas clientes, gerando relatórios de maturidade com classificações, gráficos e planos de ação.

## Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **Estilo**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Ícones**: Lucide React

## Estrutura do Projeto

```
src/
├── components/
│   ├── LoginPage.tsx          # Autenticação (login/cadastro)
│   ├── Layout.tsx             # Layout principal com navegação
│   ├── DashboardPage.tsx      # Dashboard com relatórios e gráficos
│   ├── CompaniesPage.tsx      # CRUD de empresas clientes
│   ├── QuestionsPage.tsx      # CRUD de questões por pilar
│   ├── AssessmentsPage.tsx    # Lista de avaliações
│   ├── AssessmentWizard.tsx   # Wizard de avaliação
│   ├── UsersPage.tsx          # Gerenciamento de usuários
│   └── RadarChart.tsx         # Gráfico radar de maturidade
├── contexts/
│   └── AuthContext.tsx        # Contexto de autenticação
├── lib/
│   ├── supabase.ts           # Cliente Supabase
│   └── database.types.ts     # Tipos TypeScript do banco
├── App.tsx                    # Componente principal
└── main.tsx                   # Entry point

supabase/migrations/
└── create_it_maturity_platform_schema.sql
```

## Funcionalidades Implementadas

### 1. Gestão de Acesso (RBAC)

**Perfis de Usuário:**
- **Admin**: Acesso total, cria questões e gerencia plataforma
- **Auditor**: Aplica avaliações nas empresas
- **Cliente**: Visualiza apenas relatórios da própria empresa

**Implementação:**
- Autenticação via Supabase Auth (email/senha)
- Perfis armazenados na tabela `user_profiles`
- Row Level Security (RLS) para controle de acesso

### 2. Cadastro de Empresas (Multi-tenant)

**Campos:**
- Nome, CNPJ, Setor
- Contato (nome, email, telefone)

**Funcionalidades:**
- CRUD completo
- Busca por nome ou CNPJ
- Validação de dados

### 3. Módulo de Questões

**Estrutura:**
- Questões organizadas por Pilares:
  - Governança de TI
  - Segurança da Informação
  - Infraestrutura
  - Suporte e Operações

**Regras de Negócio:**
- Resposta "OK" → Exige evidência
- Resposta "Parcial" ou "Não OK" → Exige plano de ação 5W2H

### 4. Processo de Avaliação (Wizard)

**Fluxo:**
1. Selecionar empresa cliente
2. Responder questões por pilar (abas)
3. Para cada questão:
   - Escolher resposta: OK (2 pts), Parcial (1 pt), Não OK (0 pt), Não se Aplica
   - Adicionar observações
   - **Se OK**: Anexar evidências (descrição + URL)
   - **Se Parcial/Não OK**: Preencher plano de ação 5W2H

**Opções:**
- Salvar Rascunho
- Concluir Avaliação

### 5. Relatórios e Dashboard

**Métricas:**
- Pontuação total (0-100)
- Pontuação por pilar
- Classificação automática:
  - 0-49: Nível Artesanal / Reativo
  - 50-79: Nível Eficiente / Proativo
  - 80-90: Nível Eficaz / Otimizado
  - 91-100: Nível Estratégico

**Visualizações:**
- Gráfico Radar (Atual vs Desejado - 90%)
- Gráficos de barra por pilar
- Lista de vulnerabilidades
- Tabela de planos de ação (5W2H)

### 6. Plano de Ação (5W2H)

Para cada item "Não OK" ou "Parcial":
- **O que** (What): Ação a ser tomada
- **Por que** (Why): Justificativa
- **Quem** (Who): Responsável
- **Onde** (Where): Local/setor
- **Quando** (When): Prazo
- **Como** (How): Método de execução
- **Quanto** (How Much): Custo estimado
- **Prioridade**: Baixa, Média, Alta, Crítica

## Banco de Dados

### Tabelas Principais

1. **user_profiles** - Perfis e roles dos usuários
2. **companies** - Empresas clientes
3. **pillars** - Pilares de avaliação (4 pré-cadastrados)
4. **questions** - Questões do diagnóstico
5. **assessments** - Avaliações iniciadas
6. **assessment_responses** - Respostas das questões
7. **evidences** - Evidências anexadas
8. **action_plans** - Planos de ação 5W2H

### Segurança (RLS)

Todas as tabelas possuem políticas de Row Level Security:
- Admins têm acesso total
- Auditores acessam suas próprias avaliações
- Clientes visualizam apenas dados da própria empresa

## Como Usar

### Primeiro Acesso

1. **Cadastrar Usuário Admin:**
   - Ir para a tela de cadastro
   - Preencher dados e selecionar perfil "Administrador"

2. **Cadastrar Pilares (já pré-cadastrados):**
   - Governança de TI
   - Segurança da Informação
   - Infraestrutura
   - Suporte e Operações

3. **Criar Questões:**
   - Menu "Questões"
   - Adicionar questões para cada pilar

4. **Cadastrar Empresas:**
   - Menu "Empresas"
   - Cadastrar dados das empresas clientes

### Realizar Avaliação

1. **Iniciar Avaliação:**
   - Menu "Avaliações"
   - Selecionar empresa
   - Clicar em "Iniciar Avaliação"

2. **Responder Questões:**
   - Navegar pelos pilares (abas)
   - Para cada questão:
     - Selecionar resposta
     - Adicionar observações
     - **Se OK**: Adicionar evidências
     - **Se Parcial/Não OK**: Preencher plano de ação

3. **Salvar:**
   - "Salvar Rascunho" → Continuar depois
   - "Concluir Avaliação" → Gerar relatório

### Visualizar Relatórios

1. Menu "Dashboard"
2. Selecionar avaliação
3. Visualizar:
   - Pontuação total e classificação
   - Gráfico radar de maturidade
   - Pontuação por pilar
   - Vulnerabilidades
   - Plano de ação

## Recursos Avançados

### Exportação de Relatórios
Preparado para implementar exportação em PDF

### Evidências
Sistema de anexos via URLs (documentos, imagens, links)

### Multi-tenant
Isolamento completo de dados por empresa via RLS

### Controle de Versão
Histórico de avaliações por empresa

## Customização

### Adicionar Novos Pilares
Inserir na tabela `pillars` via interface de Admin

### Modificar Classificações
Ajustar thresholds em `AssessmentWizard.tsx:handleSave()`

### Alterar Score Desejado
Modificar em `DashboardPage.tsx:radarData` (atualmente 90%)

## Suporte

O sistema está totalmente funcional e pronto para uso em produção.
