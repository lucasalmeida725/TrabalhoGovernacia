/*
  # Seed Assessment Questions

  1. New Data
    - Inserts sample questions across all 4 pillars and 3 frameworks
    - 20 questions total covering COBIT, ITIL, and ISO 27000
    - Questions are organized by pillar with sort_order

  2. Important Notes
    - Uses pillar and framework IDs from seed data
    - Questions are active by default
    - Provides a meaningful starting set for assessments
*/

-- Get pillar and framework IDs
DO $$
DECLARE
  gov_pillar uuid;
  sec_pillar uuid;
  infra_pillar uuid;
  sup_pillar uuid;
  cobit_fw uuid;
  itil_fw uuid;
  iso_fw uuid;
BEGIN
  SELECT id INTO gov_pillar FROM pillars WHERE name = 'Governança';
  SELECT id INTO sec_pillar FROM pillars WHERE name = 'Segurança da Informação';
  SELECT id INTO infra_pillar FROM pillars WHERE name = 'Infraestrutura';
  SELECT id INTO sup_pillar FROM pillars WHERE name = 'Suporte e Serviços';
  SELECT id INTO cobit_fw FROM frameworks WHERE name = 'COBIT';
  SELECT id INTO itil_fw FROM frameworks WHERE name = 'ITIL';
  SELECT id INTO iso_fw FROM frameworks WHERE name = 'ISO 27000';

  -- GOVERNANÇA - COBIT
  INSERT INTO questions (pillar_id, framework_id, code, question_text, guidance, sort_order) VALUES
    (gov_pillar, cobit_fw, 'GOV-COB-001', 'Existe um comitê de TI formalmente estabelecido com representação da alta gestão?', 'Verificar atas de reunião, composição do comitê e frequência de reuniões', 1),
    (gov_pillar, cobit_fw, 'GOV-COB-002', 'O orçamento de TI está alinhado aos objetivos estratégicos da organização?', 'Verificar documento de planejamento estratégico de TI e sua vinculação com o plano de negócios', 2),
    (gov_pillar, cobit_fw, 'GOV-COB-003', 'Existem políticas formalizadas de governança de TI aprovadas pela diretoria?', 'Verificar documentos de política, data de aprovação e mecanismo de revisão', 3),
    (gov_pillar, cobit_fw, 'GOV-COB-004', 'A organização realiza medição e monitoramento do desempenho de TI por meio de KPIs?', 'Verificar painel de indicadores, relatórios de desempenho e revisões periódicas', 4),
    (gov_pillar, cobit_fw, 'GOV-COB-005', 'Existe um processo formal de gestão de riscos de TI integrado à gestão de riscos corporativa?', 'Verificar registro de riscos, avaliações periódicas e planos de mitigação', 5),

  -- SEGURANÇA DA INFORMAÇÃO - ISO 27000
    (sec_pillar, iso_fw, 'SEC-ISO-001', 'Existe uma Política de Segurança da Informação (PSI) formalmente documentada e aprovada?', 'Verificar documento da PSI, aprovação pela diretoria e comunicação a todos os colaboradores', 1),
    (sec_pillar, iso_fw, 'SEC-ISO-002', 'A organização realiza análise de riscos de segurança da informação periodicamente?', 'Verificar relatórios de análise de riscos, metodologia utilizada e periodicidade', 2),
    (sec_pillar, iso_fw, 'SEC-ISO-003', 'Controles de acesso lógico estão implementados com base no princípio do menor privilégio?', 'Verificar políticas de acesso, matrizes de privilégios e processos de revisão', 3),
    (sec_pillar, iso_fw, 'SEC-ISO-004', 'Existe um processo formal de gestão de incidentes de segurança da informação?', 'Verificar procedimento de gestão de incidentes, registro de ocorrências e métricas', 4),
    (sec_pillar, iso_fw, 'SEC-ISO-005', 'Backups de dados são realizados regularmente com testes de restauração periódicos?', 'Verificar política de backup, registros de execução e relatórios de testes de restore', 5),

  -- INFRAESTRUTURA - COBIT
    (infra_pillar, cobit_fw, 'INF-COB-001', 'A infraestrutura de TI possui documentação atualizada (inventário de ativos, diagramas de rede)?', 'Verificar CMDB, diagramas de rede e inventário de ativos de TI', 1),
    (infra_pillar, cobit_fw, 'INF-COB-002', 'Existem procedimentos de monitoramento da infraestrutura de TI (servidores, rede, storage)?', 'Verificar ferramentas de monitoramento, alertas configurados e dashboards', 2),
    (infra_pillar, cobit_fw, 'INF-COB-003', 'A organização possui plano de continuidade de negócios (PCN) e recuperação de desastres (DR)?', 'Verificar documento de PCN/DR, testes realizados e responsáveis designados', 3),
    (infra_pillar, cobit_fw, 'INF-COB-004', 'O processo de gerenciamento de mudanças na infraestrutura é formalizado?', 'Verificar procedimento de change management, registros de mudanças e aprovações', 4),
    (infra_pillar, cobit_fw, 'INF-COB-005', 'A capacidade da infraestrutura é planejada e monitorada para atender à demanda futura?', 'Verificar planejamento de capacidade, métricas de uso e projeções de crescimento', 5),

  -- SUPORTE E SERVIÇOS - ITIL
    (sup_pillar, itil_fw, 'SUP-ITIL-001', 'Existe um catálogo de serviços de TI formalmente documentado e disponibilizado aos usuários?', 'Verificar catálogo de serviços, descrições, SLAs e canais de acesso', 1),
    (sup_pillar, itil_fw, 'SUP-ITIL-002', 'O Service Desk opera com ferramenta de gestão de tickets e SLAs definidos?', 'Verificar ferramenta de tickets, definição de SLAs e relatórios de atendimento', 2),
    (sup_pillar, itil_fw, 'SUP-ITIL-003', 'A gestão de problemas é realizada para identificar e eliminar causas raiz de incidentes?', 'Verificar registros de problemas, análises de causa raiz e ações corretivas', 3),
    (sup_pillar, itil_fw, 'SUP-ITIL-004', 'A gestão de configuração mantém um CMDB atualizado e confiável?', 'Verificar CMDB, processos de atualização e auditorias de configuração', 4),
    (sup_pillar, itil_fw, 'SUP-ITIL-005', 'A organização realiza melhorias contínuas nos serviços de TI baseadas em medições?', 'Verificar programa de melhoria contínua, registros de melhorias e resultados alcançados', 5)
  ON CONFLICT DO NOTHING;
END $$;
