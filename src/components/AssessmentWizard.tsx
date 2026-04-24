import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Assessment = Database['public']['Tables']['assessments']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type Pillar = Database['public']['Tables']['pillars']['Row'];
type AssessmentResponse = Database['public']['Tables']['assessment_responses']['Row'];
type Evidence = Database['public']['Tables']['evidences']['Row'];
type ActionPlan = Database['public']['Tables']['action_plans']['Row'];

interface QuestionWithPillar extends Question {
  pillar?: Pillar;
}

interface ResponseData {
  response_type: 'ok' | 'partial' | 'not_ok' | 'not_applicable';
  notes: string;
  evidences: { description: string; file_url: string }[];
  action_plan?: {
    what: string;
    why: string;
    who: string;
    where_location: string;
    when_deadline: string;
    how: string;
    how_much: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface Props {
  assessment: Assessment;
  onClose: () => void;
}

export default function AssessmentWizard({ assessment, onClose }: Props) {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [questions, setQuestions] = useState<QuestionWithPillar[]>([]);
  const [currentPillarIndex, setCurrentPillarIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, ResponseData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pillarsRes, questionsRes, responsesRes] = await Promise.all([
        supabase.from('pillars').select('*').order('display_order'),
        supabase.from('questions').select('*').eq('is_active', true).order('display_order'),
        supabase.from('assessment_responses').select('*').eq('assessment_id', assessment.id)
      ]);

      if (pillarsRes.error) throw pillarsRes.error;
      if (questionsRes.error) throw questionsRes.error;
      if (responsesRes.error) throw responsesRes.error;

      setPillars(pillarsRes.data || []);
      setQuestions(questionsRes.data || []);

      const responsesMap = new Map<string, ResponseData>();
      for (const response of responsesRes.data || []) {
        const [evidencesRes, actionPlanRes] = await Promise.all([
          supabase.from('evidences').select('*').eq('response_id', response.id),
          supabase.from('action_plans').select('*').eq('response_id', response.id).maybeSingle()
        ]);

        responsesMap.set(response.question_id, {
          response_type: response.response_type,
          notes: response.notes || '',
          evidences: evidencesRes.data?.map(e => ({
            description: e.description,
            file_url: e.file_url || '',
          })) || [],
          action_plan: actionPlanRes.data ? {
            what: actionPlanRes.data.what,
            why: actionPlanRes.data.why,
            who: actionPlanRes.data.who,
            where_location: actionPlanRes.data.where_location || '',
            when_deadline: actionPlanRes.data.when_deadline || '',
            how: actionPlanRes.data.how,
            how_much: actionPlanRes.data.how_much || '',
            priority: actionPlanRes.data.priority || 'medium',
          } : undefined,
        });
      }
      setResponses(responsesMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentPillar = pillars[currentPillarIndex];
  const currentQuestions = questions.filter(q => q.pillar_id === currentPillar?.id);

  const updateResponse = (questionId: string, data: Partial<ResponseData>) => {
    const current = responses.get(questionId) || {
      response_type: 'not_applicable',
      notes: '',
      evidences: [],
    };
    setResponses(new Map(responses.set(questionId, { ...current, ...data })));
  };

  const handleSave = async (complete = false) => {
    setSaving(true);
    try {
      for (const [questionId, responseData] of responses.entries()) {
        const score = responseData.response_type === 'ok' ? 2 :
                     responseData.response_type === 'partial' ? 1 : 0;

        const { data: savedResponse, error: responseError } = await supabase
          .from('assessment_responses')
          .upsert({
            assessment_id: assessment.id,
            question_id: questionId,
            response_type: responseData.response_type,
            score,
            notes: responseData.notes,
          }, {
            onConflict: 'assessment_id,question_id'
          })
          .select()
          .single();

        if (responseError) throw responseError;

        await supabase.from('evidences').delete().eq('response_id', savedResponse.id);
        if (responseData.evidences.length > 0) {
          const { error: evidenceError } = await supabase
            .from('evidences')
            .insert(responseData.evidences.map(e => ({
              response_id: savedResponse.id,
              description: e.description,
              file_url: e.file_url,
            })));
          if (evidenceError) throw evidenceError;
        }

        await supabase.from('action_plans').delete().eq('response_id', savedResponse.id);
        if (responseData.action_plan) {
          const { error: actionPlanError } = await supabase
            .from('action_plans')
            .insert({
              response_id: savedResponse.id,
              ...responseData.action_plan,
            });
          if (actionPlanError) throw actionPlanError;
        }
      }

      if (complete) {
        const totalQuestions = questions.length;
        const totalScore = Array.from(responses.values())
          .reduce((sum, r) => sum + (r.response_type === 'ok' ? 2 : r.response_type === 'partial' ? 1 : 0), 0);
        const maxScore = totalQuestions * 2;
        const percentageScore = (totalScore / maxScore) * 100;

        const classification =
          percentageScore >= 91 ? 'Nível Estratégico' :
          percentageScore >= 80 ? 'Nível Eficaz / Otimizado' :
          percentageScore >= 50 ? 'Nível Eficiente / Proativo' :
          'Nível Artesanal / Reativo';

        const { error: assessmentError } = await supabase
          .from('assessments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            total_score: percentageScore,
            classification,
          })
          .eq('id', assessment.id);

        if (assessmentError) throw assessmentError;

        alert('Avaliação concluída com sucesso!');
        onClose();
      } else {
        alert('Rascunho salvo com sucesso!');
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Erro ao salvar avaliação');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Carregando avaliação...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Salvar Rascunho
          </button>
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja concluir esta avaliação? Esta ação não pode ser desfeita.')) {
                handleSave(true);
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            Concluir Avaliação
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="flex border-b border-slate-200">
          {pillars.map((pillar, index) => (
            <button
              key={pillar.id}
              onClick={() => setCurrentPillarIndex(index)}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                index === currentPillarIndex
                  ? 'border-b-2 border-slate-900 text-slate-900 bg-slate-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {pillar.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 mb-6">
        {currentQuestions.map((question, index) => {
          const response = responses.get(question.id);
          const needsEvidence = response?.response_type === 'ok';
          const needsActionPlan = response?.response_type === 'partial' || response?.response_type === 'not_ok';

          return (
            <div key={question.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">
                    {question.question_text}
                  </h3>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { value: 'ok', label: 'OK', color: 'green' },
                      { value: 'partial', label: 'Parcial', color: 'yellow' },
                      { value: 'not_ok', label: 'Não OK', color: 'red' },
                      { value: 'not_applicable', label: 'Não se Aplica', color: 'slate' },
                    ].map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => updateResponse(question.id, { response_type: value as any })}
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${
                          response?.response_type === value
                            ? `bg-${color}-600 text-white ring-2 ring-${color}-600 ring-offset-2`
                            : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100`
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Observações
                    </label>
                    <textarea
                      value={response?.notes || ''}
                      onChange={(e) => updateResponse(question.id, { notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Adicione observações sobre esta questão..."
                    />
                  </div>

                  {needsEvidence && (
                    <div className="border-t border-slate-200 pt-4">
                      <h4 className="font-medium text-slate-900 mb-3">Evidências (obrigatório para OK)</h4>
                      {response.evidences.map((evidence, idx) => (
                        <div key={idx} className="mb-3 p-3 bg-slate-50 rounded-lg">
                          <input
                            type="text"
                            value={evidence.description}
                            onChange={(e) => {
                              const newEvidences = [...response.evidences];
                              newEvidences[idx] = { ...evidence, description: e.target.value };
                              updateResponse(question.id, { evidences: newEvidences });
                            }}
                            placeholder="Descrição da evidência"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2"
                          />
                          <input
                            type="text"
                            value={evidence.file_url}
                            onChange={(e) => {
                              const newEvidences = [...response.evidences];
                              newEvidences[idx] = { ...evidence, file_url: e.target.value };
                              updateResponse(question.id, { evidences: newEvidences });
                            }}
                            placeholder="URL do arquivo/documento"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newEvidences = [...(response.evidences || []), { description: '', file_url: '' }];
                          updateResponse(question.id, { evidences: newEvidences });
                        }}
                        className="text-sm text-slate-600 hover:text-slate-900"
                      >
                        + Adicionar Evidência
                      </button>
                    </div>
                  )}

                  {needsActionPlan && (
                    <div className="border-t border-slate-200 pt-4">
                      <h4 className="font-medium text-slate-900 mb-3">Plano de Ação 5W2H (obrigatório)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">O que fazer? (What)</label>
                          <input
                            type="text"
                            value={response?.action_plan?.what || ''}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), what: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Por que? (Why)</label>
                          <input
                            type="text"
                            value={response?.action_plan?.why || ''}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), why: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Quem? (Who)</label>
                          <input
                            type="text"
                            value={response?.action_plan?.who || ''}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), who: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Onde? (Where)</label>
                          <input
                            type="text"
                            value={response?.action_plan?.where_location || ''}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), where_location: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Quando? (When)</label>
                          <input
                            type="date"
                            value={response?.action_plan?.when_deadline || ''}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), when_deadline: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Prioridade</label>
                          <select
                            value={response?.action_plan?.priority || 'medium'}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), priority: e.target.value as any }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          >
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítica</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Como? (How)</label>
                          <textarea
                            value={response?.action_plan?.how || ''}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), how: e.target.value }
                            })}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Quanto custa? (How Much)</label>
                          <input
                            type="text"
                            value={response?.action_plan?.how_much || ''}
                            onChange={(e) => updateResponse(question.id, {
                              action_plan: { ...(response?.action_plan || {} as any), how_much: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentPillarIndex(Math.max(0, currentPillarIndex - 1))}
          disabled={currentPillarIndex === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
          Pilar Anterior
        </button>
        <button
          onClick={() => setCurrentPillarIndex(Math.min(pillars.length - 1, currentPillarIndex + 1))}
          disabled={currentPillarIndex === pillars.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Próximo Pilar
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
