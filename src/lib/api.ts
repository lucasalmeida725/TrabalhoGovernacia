import { supabase } from './supabase';
import type { Company, Question, Assessment, AssessmentResponse, Evidence, ActionPlan, Risk, Service, AuditLog, PillarScore } from './types';
import { calculateScore, getMaturityLevel, RESPONSE_WEIGHTS } from './types';

export async function logAudit(action: string, tableName: string, recordId: string | null, oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>) {
  await supabase.from('audit_logs').insert({
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldValues ?? {},
    new_values: newValues ?? {},
  });
}

// Companies
export async function getCompanies() {
  const { data, error } = await supabase.from('companies').select('*').order('name');
  if (error) throw error;
  return data as Company[];
}

export async function getCompany(id: string) {
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Company | null;
}

export async function createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('companies').insert(company).select().single();
  if (error) throw error;
  await logAudit('CREATE', 'companies', data.id, undefined, data);
  return data as Company;
}

export async function updateCompany(id: string, updates: Partial<Company>) {
  const { data: old } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase.from('companies').update(updates).eq('id', id).select().single();
  if (error) throw error;
  await logAudit('UPDATE', 'companies', id, old ?? undefined, data);
  return data as Company;
}

export async function deleteCompany(id: string) {
  const { data: old } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
  await logAudit('DELETE', 'companies', id, old ?? undefined);
}

// Questions
export async function getQuestions() {
  const { data, error } = await supabase
    .from('questions')
    .select('*, pillar:pillars(*), framework:frameworks(*)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data as Question[];
}

export async function createQuestion(question: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'pillar' | 'framework'>) {
  const { data, error } = await supabase.from('questions').insert(question).select().single();
  if (error) throw error;
  await logAudit('CREATE', 'questions', data.id, undefined, data);
  return data as Question;
}

export async function updateQuestion(id: string, updates: Partial<Question>) {
  const { data: old } = await supabase.from('questions').select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase.from('questions').update(updates).eq('id', id).select().single();
  if (error) throw error;
  await logAudit('UPDATE', 'questions', id, old ?? undefined, data);
  return data as Question;
}

export async function deleteQuestion(id: string) {
  const { data: old } = await supabase.from('questions').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) throw error;
  await logAudit('DELETE', 'questions', id, old ?? undefined);
}

// Pillars & Frameworks
export async function getPillars() {
  const { data, error } = await supabase.from('pillars').select('*').order('sort_order');
  if (error) throw error;
  return data;
}

export async function getFrameworks() {
  const { data, error } = await supabase.from('frameworks').select('*').order('name');
  if (error) throw error;
  return data;
}

// Assessments
export async function getAssessments(companyId?: string) {
  let query = supabase.from('assessments').select('*, company:companies(*), auditor:profiles(*)').order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Assessment[];
}

export async function getAssessment(id: string) {
  const { data, error } = await supabase
    .from('assessments')
    .select('*, company:companies(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Assessment | null;
}

export async function createAssessment(companyId: string, auditorId: string) {
  const { data, error } = await supabase
    .from('assessments')
    .insert({ company_id: companyId, auditor_id: auditorId, status: 'draft' })
    .select()
    .single();
  if (error) throw error;
  await logAudit('CREATE', 'assessments', data.id, undefined, data);
  return data as Assessment;
}

export async function updateAssessment(id: string, updates: Partial<Assessment>) {
  const { data: old } = await supabase.from('assessments').select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase.from('assessments').update(updates).eq('id', id).select().single();
  if (error) throw error;
  await logAudit('UPDATE', 'assessments', id, old ?? undefined, data);
  return data as Assessment;
}

// Assessment Responses
export async function getAssessmentResponses(assessmentId: string) {
  const { data, error } = await supabase
    .from('assessment_responses')
    .select('*, question:questions(*, pillar:pillars(*), framework:frameworks(*))')
    .eq('assessment_id', assessmentId);
  if (error) throw error;
  return data as AssessmentResponse[];
}

export async function upsertResponse(assessmentId: string, questionId: string, response: string, notes: string) {
  const { data, error } = await supabase
    .from('assessment_responses')
    .upsert({ assessment_id: assessmentId, question_id: questionId, response, notes }, { onConflict: 'assessment_id,question_id' })
    .select()
    .single();
  if (error) throw error;
  return data as AssessmentResponse;
}

// Evidences
export async function getEvidences(responseId: string) {
  const { data, error } = await supabase.from('evidences').select('*').eq('assessment_response_id', responseId);
  if (error) throw error;
  return data as Evidence[];
}

export async function addEvidence(responseId: string, evidence: { description: string; file_url: string; file_name: string }) {
  const { data, error } = await supabase.from('evidences').insert({ assessment_response_id: responseId, ...evidence }).select().single();
  if (error) throw error;
  await logAudit('CREATE', 'evidences', data.id, undefined, data);
  return data as Evidence;
}

export async function deleteEvidence(id: string) {
  const { error } = await supabase.from('evidences').delete().eq('id', id);
  if (error) throw error;
  await logAudit('DELETE', 'evidences', id);
}

// Action Plans
export async function getActionPlan(responseId: string) {
  const { data, error } = await supabase.from('action_plans').select('*').eq('assessment_response_id', responseId).maybeSingle();
  if (error) throw error;
  return data as ActionPlan | null;
}

export async function upsertActionPlan(responseId: string, plan: Omit<ActionPlan, 'id' | 'assessment_response_id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('action_plans')
    .upsert({ assessment_response_id: responseId, ...plan }, { onConflict: 'assessment_response_id' })
    .select()
    .single();
  if (error) throw error;
  await logAudit('UPSERT', 'action_plans', data.id, undefined, data);
  return data as ActionPlan;
}

// Risks
export async function getRisks(companyId: string) {
  const { data, error } = await supabase.from('risks').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Risk[];
}

export async function createRisk(risk: Omit<Risk, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('risks').insert(risk).select().single();
  if (error) throw error;
  await logAudit('CREATE', 'risks', data.id, undefined, data);
  return data as Risk;
}

export async function updateRisk(id: string, updates: Partial<Risk>) {
  const { data: old } = await supabase.from('risks').select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase.from('risks').update(updates).eq('id', id).select().single();
  if (error) throw error;
  await logAudit('UPDATE', 'risks', id, old ?? undefined, data);
  return data as Risk;
}

export async function deleteRisk(id: string) {
  const { data: old } = await supabase.from('risks').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('risks').delete().eq('id', id);
  if (error) throw error;
  await logAudit('DELETE', 'risks', id, old ?? undefined);
}

// Services
export async function getServices(companyId: string) {
  const { data, error } = await supabase.from('services').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Service[];
}

export async function createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('services').insert(service).select().single();
  if (error) throw error;
  await logAudit('CREATE', 'services', data.id, undefined, data);
  return data as Service;
}

export async function updateService(id: string, updates: Partial<Service>) {
  const { data: old } = await supabase.from('services').select('*').eq('id', id).maybeSingle();
  const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();
  if (error) throw error;
  await logAudit('UPDATE', 'services', id, old ?? undefined, data);
  return data as Service;
}

export async function deleteService(id: string) {
  const { data: old } = await supabase.from('services').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
  await logAudit('DELETE', 'services', id, old ?? undefined);
}

// Audit Logs
export async function getAuditLogs(limit = 100) {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data as AuditLog[];
}

// Scoring
export function calculatePillarScores(responses: AssessmentResponse[], pillars: { id: string; name: string }[]): PillarScore[] {
  return pillars.map(pillar => {
    const pillarResponses = responses.filter(r => r.question?.pillar_id === pillar.id && r.response !== 'na');
    const earned = pillarResponses.reduce((sum, r) => sum + RESPONSE_WEIGHTS[r.response], 0);
    const maxScore = pillarResponses.length * 2;
    const percentage = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;
    return { pillar_id: pillar.id, pillar_name: pillar.name, score: earned, max_score: maxScore, percentage };
  });
}

export async function finalizeAssessment(assessmentId: string, responses: AssessmentResponse[], _pillars: { id: string; name: string }[]) {
  const overallScore = calculateScore(responses);
  const maturity = getMaturityLevel(overallScore);
  await updateAssessment(assessmentId, {
    overall_score: overallScore,
    maturity_level: maturity.label,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  return { overallScore, maturityLevel: maturity.label };
}
