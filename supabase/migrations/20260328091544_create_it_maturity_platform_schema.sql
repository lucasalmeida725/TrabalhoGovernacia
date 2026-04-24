/*
  # IT Maturity Assessment Platform Schema

  ## Overview
  This migration creates the complete database schema for the IT Maturity Diagnostic Platform,
  designed for auditors and consultants to assess client companies' IT infrastructure.

  ## Tables Created

  ### 1. user_profiles
  - Stores user profile information and roles (admin, auditor, client)
  - Links to auth.users via user_id
  - Columns: id, user_id, email, full_name, role, company_id (for clients), created_at, updated_at

  ### 2. companies
  - Stores client companies being assessed
  - Columns: id, name, cnpj, sector, contact_name, contact_email, contact_phone, created_at, updated_at, created_by

  ### 3. pillars
  - Assessment pillars/categories (Governance, Security, Infrastructure, Support)
  - Columns: id, name, description, display_order, created_at

  ### 4. questions
  - Assessment questions linked to pillars
  - Columns: id, pillar_id, question_text, display_order, is_active, created_at, updated_at

  ### 5. assessments
  - Assessment sessions for each company
  - Columns: id, company_id, auditor_id, status (draft/completed), started_at, completed_at, total_score, classification, created_at

  ### 6. assessment_responses
  - Individual question responses within an assessment
  - Columns: id, assessment_id, question_id, response_type (ok/partial/not_ok/not_applicable), score, notes, created_at, updated_at

  ### 7. evidences
  - Evidence attachments for "OK" responses
  - Columns: id, response_id, description, file_url, uploaded_at

  ### 8. action_plans
  - Action plans for "NOT_OK" and "PARTIAL" responses (5W2H format)
  - Columns: id, response_id, what, why, who, where, when, how, how_much, priority, status, created_at, updated_at

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies created for role-based access control
  - Admins have full access
  - Auditors can manage their assessments
  - Clients can only view their own company data
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'auditor', 'client')),
  company_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  sector text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Pillars Table
CREATE TABLE IF NOT EXISTS pillars (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pillar_id uuid REFERENCES pillars(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  auditor_id uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_score numeric(5,2),
  classification text,
  created_at timestamptz DEFAULT now()
);

-- Assessment Responses Table
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  response_type text NOT NULL CHECK (response_type IN ('ok', 'partial', 'not_ok', 'not_applicable')),
  score integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, question_id)
);

-- Evidences Table
CREATE TABLE IF NOT EXISTS evidences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id uuid REFERENCES assessment_responses(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  file_url text,
  uploaded_at timestamptz DEFAULT now()
);

-- Action Plans Table (5W2H)
CREATE TABLE IF NOT EXISTS action_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id uuid REFERENCES assessment_responses(id) ON DELETE CASCADE NOT NULL,
  what text NOT NULL,
  why text NOT NULL,
  who text NOT NULL,
  where_location text,
  when_deadline timestamptz,
  how text NOT NULL,
  how_much text,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key for company_id in user_profiles
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_company 
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_questions_pillar ON questions(pillar_id);
CREATE INDEX IF NOT EXISTS idx_assessments_company ON assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_assessments_auditor ON assessments(auditor_id);
CREATE INDEX IF NOT EXISTS idx_responses_assessment ON assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_evidences_response ON evidences(response_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_response ON action_plans(response_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for companies
CREATE POLICY "Admins and auditors can view companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'auditor')
    )
  );

CREATE POLICY "Clients can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'client' AND company_id = companies.id
    )
  );

CREATE POLICY "Admins and auditors can manage companies"
  ON companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'auditor')
    )
  );

-- RLS Policies for pillars
CREATE POLICY "Everyone can view pillars"
  ON pillars FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pillars"
  ON pillars FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for questions
CREATE POLICY "Everyone can view active questions"
  ON questions FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for assessments
CREATE POLICY "Auditors can view own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (auditor_id = auth.uid());

CREATE POLICY "Clients can view assessments for their company"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'client' AND company_id = assessments.company_id
    )
  );

CREATE POLICY "Admins can view all assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Auditors can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    auditor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'auditor')
    )
  );

CREATE POLICY "Auditors can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (auditor_id = auth.uid())
  WITH CHECK (auditor_id = auth.uid());

CREATE POLICY "Auditors can delete own assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (auditor_id = auth.uid());

-- RLS Policies for assessment_responses
CREATE POLICY "Users can view responses from accessible assessments"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND (
        assessments.auditor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND (
            role = 'admin'
            OR (role = 'client' AND company_id = assessments.company_id)
          )
        )
      )
    )
  );

CREATE POLICY "Auditors can manage responses for own assessments"
  ON assessment_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_responses.assessment_id
      AND assessments.auditor_id = auth.uid()
    )
  );

-- RLS Policies for evidences
CREATE POLICY "Users can view evidences from accessible responses"
  ON evidences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = evidences.response_id
      AND (
        a.auditor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND (
            role = 'admin'
            OR (role = 'client' AND company_id = a.company_id)
          )
        )
      )
    )
  );

CREATE POLICY "Auditors can manage evidences for own assessments"
  ON evidences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = evidences.response_id
      AND a.auditor_id = auth.uid()
    )
  );

-- RLS Policies for action_plans
CREATE POLICY "Users can view action plans from accessible responses"
  ON action_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = action_plans.response_id
      AND (
        a.auditor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_id = auth.uid() AND (
            role = 'admin'
            OR (role = 'client' AND company_id = a.company_id)
          )
        )
      )
    )
  );

CREATE POLICY "Auditors can manage action plans for own assessments"
  ON action_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_responses ar
      JOIN assessments a ON a.id = ar.assessment_id
      WHERE ar.id = action_plans.response_id
      AND a.auditor_id = auth.uid()
    )
  );

-- Insert default pillars
INSERT INTO pillars (name, description, display_order) VALUES
  ('Governança de TI', 'Processos, políticas e estruturas de gestão de TI', 1),
  ('Segurança da Informação', 'Controles de segurança, proteção de dados e compliance', 2),
  ('Infraestrutura', 'Arquitetura, servidores, rede e disponibilidade', 3),
  ('Suporte e Operações', 'Gestão de incidentes, service desk e continuidade', 4)
ON CONFLICT DO NOTHING;
