export type UserRole = 'admin' | 'auditor' | 'cliente';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  sector: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface Pillar {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface Framework {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Question {
  id: string;
  pillar_id: string;
  framework_id: string;
  code: string;
  question_text: string;
  guidance: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  pillar?: Pillar;
  framework?: Framework;
}

export type AssessmentStatus = 'draft' | 'in_progress' | 'completed';
export type ResponseType = 'ok' | 'parcial' | 'nao_ok' | 'na';

export interface Assessment {
  id: string;
  company_id: string;
  auditor_id: string;
  status: AssessmentStatus;
  overall_score: number;
  maturity_level: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
  auditor?: Profile;
}

export interface AssessmentResponse {
  id: string;
  assessment_id: string;
  question_id: string;
  response: ResponseType;
  notes: string;
  created_at: string;
  updated_at: string;
  question?: Question;
  evidence?: Evidence;
  action_plan?: ActionPlan;
}

export interface Evidence {
  id: string;
  assessment_response_id: string;
  description: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export interface ActionPlan {
  id: string;
  assessment_response_id: string;
  what: string;
  why: string;
  who: string;
  when_date: string | null;
  where_text: string;
  how: string;
  how_much: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export type RiskLikelihood = 'low' | 'medium' | 'high';
export type RiskImpact = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'mitigating' | 'mitigated' | 'accepted';

export interface Risk {
  id: string;
  company_id: string;
  assessment_id: string | null;
  title: string;
  description: string;
  category: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  risk_level: RiskLevel;
  mitigation_plan: string;
  owner: string;
  status: RiskStatus;
  created_at: string;
  updated_at: string;
}

export type ServiceStatus = 'active' | 'inactive' | 'review';

export interface Service {
  id: string;
  company_id: string;
  assessment_id: string | null;
  name: string;
  description: string;
  category: string;
  service_owner: string;
  sla_target: string;
  current_performance: string;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface PillarScore {
  pillar_id: string;
  pillar_name: string;
  score: number;
  max_score: number;
  percentage: number;
}

export const RESPONSE_WEIGHTS: Record<ResponseType, number> = {
  ok: 2,
  parcial: 1,
  nao_ok: 0,
  na: 0,
};

export const MATURITY_LEVELS = [
  { min: 0, max: 49, label: 'Artesanal / Reativo', color: '#ef4444' },
  { min: 50, max: 79, label: 'Eficiente / Proativo', color: '#f59e0b' },
  { min: 80, max: 90, label: 'Eficaz / Otimizado', color: '#3b82f6' },
  { min: 91, max: 100, label: 'Estratégico', color: '#10b981' },
] as const;

export function getMaturityLevel(score: number) {
  return MATURITY_LEVELS.find(l => score >= l.min && score <= l.max) || MATURITY_LEVELS[0];
}

export function calculateScore(responses: AssessmentResponse[]): number {
  const scorable = responses.filter(r => r.response !== 'na');
  if (scorable.length === 0) return 0;
  const earned = scorable.reduce((sum, r) => sum + RESPONSE_WEIGHTS[r.response], 0);
  const maxPossible = scorable.length * 2;
  return Math.round((earned / maxPossible) * 100);
}
