/*
  # IT Maturity Diagnostic Platform - Initial Schema

  1. New Tables
    - `companies` - Client companies being evaluated (multi-tenant)
    - `profiles` - User profiles with RBAC roles (admin, auditor, cliente)
    - `pillars` - Assessment pillars (Governança, Segurança da Informação, Infraestrutura, Suporte)
    - `frameworks` - Reference frameworks (COBIT, ITIL, ISO 27000)
    - `questions` - Assessment questions linked to pillars and frameworks
    - `assessments` - Assessment instances linking company, auditor, and status
    - `assessment_responses` - Individual question responses within an assessment
    - `evidences` - Evidence records for "OK" responses
    - `action_plans` - Action plans (5W2H) for "Não OK" or "Parcial" responses
    - `risks` - Risk management entries (ISO 27000)
    - `services` - ITIL service management entries
    - `audit_logs` - System audit trail for all critical actions

  2. Security
    - RLS enabled on all tables
    - Policies restrict data access based on user role and ownership
    - Admin has full access, Auditor can manage assessments, Cliente can only view

  3. Important Notes
    - Assessment scoring: OK=2, Parcial=1, Não OK=0, Não se Aplica=excluded from score
    - Maturity levels: 0-49 Artesanal/Reativo, 50-79 Eficiente/Proativo, 80-90 Eficaz/Otimizado, 91-100 Estratégico
    - Action plans follow 5W2H methodology
    - Evidence is mandatory for OK responses
    - Action plans are mandatory for Não OK and Parcial responses
*/

-- ============================================
-- COMPANIES (must be before profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text NOT NULL UNIQUE,
  sector text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'cliente' CHECK (role IN ('admin', 'auditor', 'cliente')),
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- PILLARS
-- ============================================
CREATE TABLE IF NOT EXISTS pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- FRAMEWORKS
-- ============================================
CREATE TABLE IF NOT EXISTS frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- QUESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id uuid NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  framework_id uuid NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  code text NOT NULL DEFAULT '',
  question_text text NOT NULL,
  guidance text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- ASSESSMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auditor_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  overall_score numeric(5,2) DEFAULT 0,
  maturity_level text DEFAULT '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- ASSESSMENT RESPONSES
-- ============================================
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  response text NOT NULL DEFAULT 'na' CHECK (response IN ('ok', 'parcial', 'nao_ok', 'na')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, question_id)
);

-- ============================================
-- EVIDENCES
-- ============================================
CREATE TABLE IF NOT EXISTS evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_response_id uuid NOT NULL REFERENCES assessment_responses(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ACTION PLANS (5W2H)
-- ============================================
CREATE TABLE IF NOT EXISTS action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_response_id uuid NOT NULL REFERENCES assessment_responses(id) ON DELETE CASCADE,
  what text NOT NULL DEFAULT '',
  why text NOT NULL DEFAULT '',
  who text NOT NULL DEFAULT '',
  when_date date,
  where_text text NOT NULL DEFAULT '',
  how text NOT NULL DEFAULT '',
  how_much text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- RISKS (ISO 27000)
-- ============================================
CREATE TABLE IF NOT EXISTS risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  likelihood text NOT NULL DEFAULT 'medium' CHECK (likelihood IN ('low', 'medium', 'high')),
  impact text NOT NULL DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  mitigation_plan text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigating', 'mitigated', 'accepted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- SERVICES (ITIL)
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  service_owner text NOT NULL DEFAULT '',
  sla_target text NOT NULL DEFAULT '',
  current_performance text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'review')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL DEFAULT '',
  record_id uuid,
  old_values jsonb DEFAULT '{}',
  new_values jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_auditor()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'auditor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_cliente()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'cliente'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- COMPANIES POLICIES
-- ============================================
CREATE POLICY "Admins can read all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Auditors can read all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_auditor());

CREATE POLICY "Clientes can read own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = get_user_company_id());

CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- PILLARS POLICIES
-- ============================================
CREATE POLICY "Authenticated can read pillars"
  ON pillars FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert pillars"
  ON pillars FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update pillars"
  ON pillars FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete pillars"
  ON pillars FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- FRAMEWORKS POLICIES
-- ============================================
CREATE POLICY "Authenticated can read frameworks"
  ON frameworks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert frameworks"
  ON frameworks FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update frameworks"
  ON frameworks FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete frameworks"
  ON frameworks FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- QUESTIONS POLICIES
-- ============================================
CREATE POLICY "Authenticated can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- ASSESSMENTS POLICIES
-- ============================================
CREATE POLICY "Admins can read all assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Auditors can read own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (auditor_id = auth.uid());

CREATE POLICY "Clientes can read own company assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Auditors and admins can insert assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR is_auditor());

CREATE POLICY "Auditors and admins can update assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (is_admin() OR auditor_id = auth.uid())
  WITH CHECK (is_admin() OR is_auditor());

CREATE POLICY "Admins can delete assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- ASSESSMENT RESPONSES POLICIES
-- ============================================
CREATE POLICY "Users can read responses for accessible assessments"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND (
        assessments.auditor_id = auth.uid()
        OR is_admin()
        OR assessments.company_id = get_user_company_id()
      )
    )
  );

CREATE POLICY "Auditors and admins can insert responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND (assessments.auditor_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Auditors and admins can update responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND (assessments.auditor_id = auth.uid() OR is_admin())
    )
  );

-- ============================================
-- EVIDENCES POLICIES
-- ============================================
CREATE POLICY "Users can read evidences for accessible assessments"
  ON evidences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = evidences.assessment_response_id
      AND (a.auditor_id = auth.uid() OR is_admin() OR a.company_id = get_user_company_id())
    )
  );

CREATE POLICY "Auditors and admins can insert evidences"
  ON evidences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = evidences.assessment_response_id
      AND (a.auditor_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Auditors and admins can delete evidences"
  ON evidences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = evidences.assessment_response_id
      AND (a.auditor_id = auth.uid() OR is_admin())
    )
  );

-- ============================================
-- ACTION PLANS POLICIES
-- ============================================
CREATE POLICY "Users can read action plans for accessible assessments"
  ON action_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = action_plans.assessment_response_id
      AND (a.auditor_id = auth.uid() OR is_admin() OR a.company_id = get_user_company_id())
    )
  );

CREATE POLICY "Auditors and admins can insert action plans"
  ON action_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = action_plans.assessment_response_id
      AND (a.auditor_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Auditors and admins can update action plans"
  ON action_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = action_plans.assessment_response_id
      AND (a.auditor_id = auth.uid() OR is_admin())
    )
  );

-- ============================================
-- RISKS POLICIES
-- ============================================
CREATE POLICY "Admins can read all risks"
  ON risks FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Auditors can read risks for their assessments"
  ON risks FOR SELECT
  TO authenticated
  USING (
    is_auditor() AND (
      assessment_id IS NULL OR
      EXISTS (
        SELECT 1 FROM assessments
        WHERE assessments.id = risks.assessment_id
        AND assessments.auditor_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clientes can read own company risks"
  ON risks FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins and auditors can insert risks"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR is_auditor());

CREATE POLICY "Admins and auditors can update risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_auditor())
  WITH CHECK (is_admin() OR is_auditor());

CREATE POLICY "Admins can delete risks"
  ON risks FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- SERVICES POLICIES
-- ============================================
CREATE POLICY "Admins can read all services"
  ON services FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Auditors can read services for their assessments"
  ON services FOR SELECT
  TO authenticated
  USING (
    is_auditor() AND (
      assessment_id IS NULL OR
      EXISTS (
        SELECT 1 FROM assessments
        WHERE assessments.id = services.assessment_id
        AND assessments.auditor_id = auth.uid()
      )
    )
  );

CREATE POLICY "Clientes can read own company services"
  ON services FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins and auditors can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR is_auditor());

CREATE POLICY "Admins and auditors can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_auditor())
  WITH CHECK (is_admin() OR is_auditor());

CREATE POLICY "Admins can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY "Admins can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can read own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_assessments_company_id ON assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_assessments_auditor_id ON assessments(auditor_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_id ON assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_questions_pillar_id ON questions(pillar_id);
CREATE INDEX IF NOT EXISTS idx_questions_framework_id ON questions(framework_id);
CREATE INDEX IF NOT EXISTS idx_risks_company_id ON risks(company_id);
CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- SEED DATA: PILLARS
-- ============================================
INSERT INTO pillars (name, description, sort_order) VALUES
  ('Governança', 'Governança de TI, alinhamento estratégico e gestão de recursos', 1),
  ('Segurança da Informação', 'Proteção de ativos de informação, gestão de riscos e conformidade', 2),
  ('Infraestrutura', 'Gestão de infraestrutura de TI, operações e disponibilidade', 3),
  ('Suporte e Serviços', 'Gestão de serviços de TI, suporte ao usuário e melhoria contínua', 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED DATA: FRAMEWORKS
-- ============================================
INSERT INTO frameworks (name, description) VALUES
  ('COBIT', 'Control Objectives for Information and Related Technologies - Framework para governança e gestão de TI corporativa'),
  ('ITIL', 'Information Technology Infrastructure Library - Framework para gestão de serviços de TI'),
  ('ISO 27000', 'ISO/IEC 27000 series - Padrões para sistemas de gestão de segurança da informação')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_responses_updated_at
  BEFORE UPDATE ON assessment_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_plans_updated_at
  BEFORE UPDATE ON action_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at
  BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();