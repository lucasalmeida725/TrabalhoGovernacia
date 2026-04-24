/*
  # Sample Questions for IT Maturity Assessment

  ## Overview
  This migration adds sample questions for each pillar to help users get started with the platform.

  ## Questions Added

  ### Governança de TI (5 questions)
  - Strategic planning and alignment
  - IT governance structure
  - Budget management
  - Performance metrics
  - Risk management

  ### Segurança da Informação (5 questions)
  - Security policies
  - Access control
  - Data backup
  - Incident response
  - Security awareness

  ### Infraestrutura (5 questions)
  - Server infrastructure
  - Network architecture
  - Monitoring systems
  - Capacity planning
  - Documentation

  ### Suporte e Operações (5 questions)
  - Service desk
  - SLA management
  - Change management
  - Knowledge base
  - Continuous improvement
*/

-- Get pillar IDs
DO $$
DECLARE
  pillar_gov_id uuid;
  pillar_sec_id uuid;
  pillar_inf_id uuid;
  pillar_sup_id uuid;
BEGIN
  -- Get pillar IDs
  SELECT id INTO pillar_gov_id FROM pillars WHERE name = 'Governança de TI';
  SELECT id INTO pillar_sec_id FROM pillars WHERE name = 'Segurança da Informação';
  SELECT id INTO pillar_inf_id FROM pillars WHERE name = 'Infraestrutura';
  SELECT id INTO pillar_sup_id FROM pillars WHERE name = 'Suporte e Operações';

  -- Governança de TI Questions
  INSERT INTO questions (pillar_id, question_text, display_order) VALUES
    (pillar_gov_id, 'A organização possui um planejamento estratégico de TI alinhado com os objetivos de negócio?', 1),
    (pillar_gov_id, 'Existe uma estrutura formal de governança de TI com papéis e responsabilidades definidos?', 2),
    (pillar_gov_id, 'O orçamento de TI é planejado, monitorado e revisado periodicamente?', 3),
    (pillar_gov_id, 'São utilizados indicadores de desempenho (KPIs) para medir a efetividade da TI?', 4),
    (pillar_gov_id, 'Existe um processo formal de gestão de riscos de TI?', 5);

  -- Segurança da Informação Questions
  INSERT INTO questions (pillar_id, question_text, display_order) VALUES
    (pillar_sec_id, 'A organização possui uma política de segurança da informação documentada e atualizada?', 1),
    (pillar_sec_id, 'Existe controle de acesso baseado em perfis e revisão periódica de permissões?', 2),
    (pillar_sec_id, 'Os backups são realizados regularmente e testados para garantir a recuperação de dados?', 3),
    (pillar_sec_id, 'Existe um plano de resposta a incidentes de segurança documentado e testado?', 4),
    (pillar_sec_id, 'São realizados treinamentos de conscientização em segurança da informação para os colaboradores?', 5);

  -- Infraestrutura Questions
  INSERT INTO questions (pillar_id, question_text, display_order) VALUES
    (pillar_inf_id, 'A infraestrutura de servidores é adequada e possui redundância para garantir disponibilidade?', 1),
    (pillar_inf_id, 'A arquitetura de rede é segmentada e possui proteções adequadas (firewall, IPS/IDS)?', 2),
    (pillar_inf_id, 'Existem sistemas de monitoramento que alertam sobre problemas de performance e disponibilidade?', 3),
    (pillar_inf_id, 'O planejamento de capacidade é realizado para antecipar necessidades futuras de infraestrutura?', 4),
    (pillar_inf_id, 'A infraestrutura está documentada com diagramas, inventário e procedimentos atualizados?', 5);

  -- Suporte e Operações Questions
  INSERT INTO questions (pillar_id, question_text, display_order) VALUES
    (pillar_sup_id, 'Existe um service desk estruturado para registro e acompanhamento de chamados?', 1),
    (pillar_sup_id, 'São estabelecidos e monitorados SLAs (Acordos de Nível de Serviço) para os serviços de TI?', 2),
    (pillar_sup_id, 'Existe um processo formal de gestão de mudanças com aprovação e documentação?', 3),
    (pillar_sup_id, 'A organização mantém uma base de conhecimento documentada e acessível?', 4),
    (pillar_sup_id, 'São realizadas análises de melhoria contínua dos processos de suporte e operações?', 5);
END $$;
