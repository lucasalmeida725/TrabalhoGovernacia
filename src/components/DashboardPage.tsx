import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, AlertTriangle, FileText, Building2 } from 'lucide-react';
import RadarChart from './RadarChart';
import type { Database } from '../lib/database.types';

type Assessment = Database['public']['Tables']['assessments']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type Pillar = Database['public']['Tables']['pillars']['Row'];

interface AssessmentWithCompany extends Assessment {
  company?: Company;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentWithCompany[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [pillarScores, setPillarScores] = useState<Map<string, { current: number; total: number }>>(new Map());
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [actionPlans, setActionPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (selectedAssessment) {
      loadAssessmentDetails(selectedAssessment.id);
    }
  }, [selectedAssessment]);

  const loadData = async () => {
    try {
      const [assessmentsRes, companiesRes, pillarsRes] = await Promise.all([
        supabase
          .from('assessments')
          .select('*')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false }),
        supabase
          .from('companies')
          .select('*'),
        supabase
          .from('pillars')
          .select('*')
          .order('display_order')
      ]);

      if (assessmentsRes.error) throw assessmentsRes.error;
      if (companiesRes.error) throw companiesRes.error;
      if (pillarsRes.error) throw pillarsRes.error;

      const companiesMap = new Map(companiesRes.data?.map(c => [c.id, c]) || []);
      const assessmentsWithCompany = assessmentsRes.data?.map(a => ({
        ...a,
        company: companiesMap.get(a.company_id),
      })) || [];

      setAssessments(assessmentsWithCompany);
      setPillars(pillarsRes.data || []);

      if (assessmentsWithCompany.length > 0) {
        setSelectedAssessment(assessmentsWithCompany[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentDetails = async (assessmentId: string) => {
    try {
      const { data: responses, error } = await supabase
        .from('assessment_responses')
        .select('*, questions(*)')
        .eq('assessment_id', assessmentId);

      if (error) throw error;

      const scores = new Map<string, { current: number; total: number }>();
      pillars.forEach(pillar => {
        scores.set(pillar.id, { current: 0, total: 0 });
      });

      const vulns: any[] = [];

      for (const response of responses || []) {
        const question = response.questions as any;
        if (question) {
          const pillarScore = scores.get(question.pillar_id) || { current: 0, total: 0 };
          pillarScore.current += response.score;
          pillarScore.total += 2;
          scores.set(question.pillar_id, pillarScore);

          if (response.response_type === 'not_ok') {
            vulns.push({
              question: question.question_text,
              pillar_id: question.pillar_id,
              notes: response.notes,
            });
          }
        }
      }

      setPillarScores(scores);
      setVulnerabilities(vulns);

      const actionPlansRes = await supabase
        .from('action_plans')
        .select('*, assessment_responses(*, questions(*))')
        .in('response_id', (responses || []).map(r => r.id));

      if (!actionPlansRes.error) {
        setActionPlans(actionPlansRes.data || []);
      }
    } catch (error) {
      console.error('Error loading assessment details:', error);
    }
  };

  const radarData = pillars.map(pillar => {
    const score = pillarScores.get(pillar.id) || { current: 0, total: 1 };
    const percentage = (score.current / score.total) * 100;
    return {
      label: pillar.name.split(' ')[0],
      current: percentage,
      desired: 90,
    };
  });

  const getClassificationColor = (classification: string | null) => {
    if (!classification) return 'bg-slate-100 text-slate-700';

    const colors: Record<string, string> = {
      'Nível Artesanal / Reativo': 'bg-red-100 text-red-700',
      'Nível Eficiente / Proativo': 'bg-yellow-100 text-yellow-700',
      'Nível Eficaz / Otimizado': 'bg-blue-100 text-blue-700',
      'Nível Estratégico': 'bg-green-100 text-green-700',
    };

    return colors[classification] || 'bg-slate-100 text-slate-700';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Nenhuma avaliação concluída</h2>
        <p className="text-slate-600">Complete uma avaliação para visualizar o dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Visualize os resultados das avaliações</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Selecionar Avaliação
        </label>
        <select
          value={selectedAssessment?.id || ''}
          onChange={(e) => {
            const assessment = assessments.find(a => a.id === e.target.value);
            setSelectedAssessment(assessment || null);
          }}
          className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        >
          {assessments.map((assessment) => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.company?.name} - {new Date(assessment.completed_at!).toLocaleDateString('pt-BR')}
            </option>
          ))}
        </select>
      </div>

      {selectedAssessment && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Empresa</p>
                  <p className="font-bold text-slate-900">{selectedAssessment.company?.name}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Pontuação Total</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {selectedAssessment.total_score?.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-slate-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Classificação</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getClassificationColor(selectedAssessment.classification)}`}>
                    {selectedAssessment.classification}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Maturidade por Pilar</h2>
              <RadarChart data={radarData} />
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-900 rounded"></div>
                  <span className="text-slate-600">Atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-dashed rounded"></div>
                  <span className="text-slate-600">Desejado</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Pontuação por Pilar</h2>
              <div className="space-y-4">
                {pillars.map(pillar => {
                  const score = pillarScores.get(pillar.id) || { current: 0, total: 1 };
                  const percentage = (score.current / score.total) * 100;
                  return (
                    <div key={pillar.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-900">{pillar.name}</span>
                        <span className="text-sm font-bold text-slate-900">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-slate-900 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {vulnerabilities.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Vulnerabilidades Identificadas</h2>
              <div className="space-y-3">
                {vulnerabilities.map((vuln, index) => {
                  const pillar = pillars.find(p => p.id === vuln.pillar_id);
                  return (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{vuln.question}</p>
                          <p className="text-sm text-slate-600 mt-1">{pillar?.name}</p>
                          {vuln.notes && (
                            <p className="text-sm text-slate-700 mt-2">{vuln.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {actionPlans.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Plano de Ação (5W2H)</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700">O Que</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700">Por Que</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700">Quem</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700">Quando</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700">Como</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {actionPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">{plan.what}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{plan.why}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{plan.who}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {plan.when_deadline ? new Date(plan.when_deadline).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{plan.how}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(plan.priority)}`}>
                            {plan.priority === 'low' ? 'Baixa' :
                             plan.priority === 'medium' ? 'Média' :
                             plan.priority === 'high' ? 'Alta' : 'Crítica'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
