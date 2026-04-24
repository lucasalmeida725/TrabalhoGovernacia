import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  FileText,
  Shield,
  Server,
  Headphones,
  Building2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getAssessment,
  getAssessmentResponses,
  upsertResponse,
  updateAssessment,
  finalizeAssessment,
  addEvidence,
  deleteEvidence,
  getEvidences,
  getActionPlan,
  upsertActionPlan,
  getPillars,
  getQuestions,
} from '../lib/api';
import type {
  Assessment,
  AssessmentResponse,
  Pillar,
  Question,
  Evidence,
  ResponseType,
} from '../lib/types';
import { calculateScore, getMaturityLevel } from '../lib/types';

const PILLAR_ICONS: Record<string, React.ElementType> = {
  'Governanca': Building2,
  'Seguranca da Informacao': Shield,
  'Infraestrutura': Server,
  'Suporte e Servicos': Headphones,
};

const RESPONSE_OPTIONS: { value: ResponseType; label: string; color: string; bg: string; border: string; ring: string }[] = [
  { value: 'ok', label: 'OK', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', ring: 'ring-emerald-500' },
  { value: 'parcial', label: 'Parcial', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', ring: 'ring-amber-500' },
  { value: 'nao_ok', label: 'Nao OK', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', ring: 'ring-red-500' },
  { value: 'na', label: 'Nao se Aplica', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-300', ring: 'ring-slate-400' },
];

const EMPTY_ACTION_PLAN = {
  what: '',
  why: '',
  who: '',
  when_date: null as string | null,
  where_text: '',
  how: '',
  how_much: '',
  status: 'pending' as const,
};

export default function AssessmentWizardPage() {
  const { id: assessmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: _profile } = useAuth();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [activePillarIndex, setActivePillarIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evidence state per question
  const [evidencesMap, setEvidencesMap] = useState<Record<string, Evidence[]>>({});
  const [evidenceLoading, setEvidenceLoading] = useState<Record<string, boolean>>({});
  const [newEvidenceDesc, setNewEvidenceDesc] = useState<Record<string, string>>({});
  const [newEvidenceFileName, setNewEvidenceFileName] = useState<Record<string, string>>({});
  const [addingEvidence, setAddingEvidence] = useState<Record<string, boolean>>({});

  // Action plan state per question
  const [actionPlanForms, setActionPlanForms] = useState<Record<string, { what: string; why: string; who: string; when_date: string | null; where_text: string; how: string; how_much: string; status: string }>>({});
  const [savedActionPlans, setSavedActionPlans] = useState<Record<string, boolean>>({});
  void savedActionPlans;
  const [actionPlanLoading, setActionPlanLoading] = useState<Record<string, boolean>>({});
  const [savingActionPlan, setSavingActionPlan] = useState<Record<string, boolean>>({});

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (!assessmentId) return;
    try {
      setLoading(true);
      setError(null);
      const [assessmentData, pillarsData, questionsData, responsesData] = await Promise.all([
        getAssessment(assessmentId),
        getPillars(),
        getQuestions(),
        getAssessmentResponses(assessmentId),
      ]);
      setAssessment(assessmentData);
      setPillars(pillarsData);
      setQuestions(questionsData);
      setResponses(responsesData);
    } catch {
      setError('Erro ao carregar avaliacao. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group questions by pillar
  const questionsByPillar = pillars.reduce<Record<string, Question[]>>((acc, pillar) => {
    acc[pillar.id] = questions
      .filter((q) => q.pillar_id === pillar.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return acc;
  }, {});

  const activePillar = pillars[activePillarIndex];
  const activeQuestions = activePillar ? questionsByPillar[activePillar.id] || [] : [];

  // Progress
  const totalQuestions = questions.length;
  const answeredQuestions = responses.filter((r) => r.response).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const allAnswered = answeredQuestions === totalQuestions && totalQuestions > 0;

  // Get response for a question
  function getResponseForQuestion(questionId: string): AssessmentResponse | undefined {
    return responses.find((r) => r.question_id === questionId);
  }

  // Auto-save response
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function handleResponseChange(questionId: string, response: ResponseType) {
    const existing = getResponseForQuestion(questionId);
    const notes = existing?.notes || '';

    // Optimistic update
    setResponses((prev) => {
      const idx = prev.findIndex((r) => r.question_id === questionId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], response, notes };
        return updated;
      }
      return [
        ...prev,
        {
          id: `temp-${questionId}`,
          assessment_id: assessmentId!,
          question_id: questionId,
          response,
          notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    });

    // Debounced save
    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId]);
    }
    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      try {
        const saved = await upsertResponse(assessmentId!, questionId, response, notes);
        setResponses((prev) => {
          const idx = prev.findIndex((r) => r.question_id === questionId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = saved;
            return updated;
          }
          return prev;
        });
        // Load evidences and action plan for the saved response
        if (saved.id && !saved.id.startsWith('temp-')) {
          loadEvidenceAndActionPlan(saved.id, questionId, response);
        }
      } catch {
        showToast('error', 'Erro ao salvar resposta.');
      }
    }, 500);
  }

  async function handleNotesChange(questionId: string, notes: string) {
    const existing = getResponseForQuestion(questionId);
    const response = existing?.response || '' as ResponseType;

    setResponses((prev) => {
      const idx = prev.findIndex((r) => r.question_id === questionId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], notes };
        return updated;
      }
      return prev;
    });

    if (!response) return;

    if (saveTimeoutRef.current[questionId]) {
      clearTimeout(saveTimeoutRef.current[questionId]);
    }
    saveTimeoutRef.current[questionId] = setTimeout(async () => {
      try {
        await upsertResponse(assessmentId!, questionId, response, notes);
      } catch {
        showToast('error', 'Erro ao salvar notas.');
      }
    }, 800);
  }

  // Load evidence and action plan for a response
  async function loadEvidenceAndActionPlan(responseId: string, questionId: string, responseValue: string) {
    if (responseValue === 'ok') {
      setEvidenceLoading((prev) => ({ ...prev, [questionId]: true }));
      try {
        const evs = await getEvidences(responseId);
        setEvidencesMap((prev) => ({ ...prev, [questionId]: evs }));
      } catch {
        // silently fail
      } finally {
        setEvidenceLoading((prev) => ({ ...prev, [questionId]: false }));
      }
    }

    if (responseValue === 'nao_ok' || responseValue === 'parcial') {
      setActionPlanLoading((prev) => ({ ...prev, [questionId]: true }));
      try {
        const plan = await getActionPlan(responseId);
        setSavedActionPlans((prev) => ({ ...prev, [questionId]: !!plan }));
        if (plan) {
          setActionPlanForms((prev) => ({
            ...prev,
            [questionId]: {
              what: plan.what,
              why: plan.why,
              who: plan.who,
              when_date: plan.when_date,
              where_text: plan.where_text,
              how: plan.how,
              how_much: plan.how_much,
              status: plan.status,
            },
          }));
        } else {
          setActionPlanForms((prev) => ({ ...prev, [questionId]: { ...EMPTY_ACTION_PLAN } }));
        }
      } catch {
        // silently fail
      } finally {
        setActionPlanLoading((prev) => ({ ...prev, [questionId]: false }));
      }
    }
  }

  // Add evidence
  async function handleAddEvidence(questionId: string) {
    const resp = getResponseForQuestion(questionId);
    if (!resp || resp.id.startsWith('temp-')) {
      showToast('error', 'Salve a resposta antes de adicionar evidencias.');
      return;
    }
    const desc = newEvidenceDesc[questionId] || '';
    const fileName = newEvidenceFileName[questionId] || '';
    if (!desc.trim()) {
      showToast('error', 'Informe a descricao da evidencia.');
      return;
    }
    setAddingEvidence((prev) => ({ ...prev, [questionId]: true }));
    try {
      const ev = await addEvidence(resp.id, {
        description: desc,
        file_url: fileName ? `uploads/${fileName}` : '',
        file_name: fileName,
      });
      setEvidencesMap((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), ev],
      }));
      setNewEvidenceDesc((prev) => ({ ...prev, [questionId]: '' }));
      setNewEvidenceFileName((prev) => ({ ...prev, [questionId]: '' }));
      showToast('success', 'Evidencia adicionada.');
    } catch {
      showToast('error', 'Erro ao adicionar evidencia.');
    } finally {
      setAddingEvidence((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  // Delete evidence
  async function handleDeleteEvidence(questionId: string, evidenceId: string) {
    try {
      await deleteEvidence(evidenceId);
      setEvidencesMap((prev) => ({
        ...prev,
        [questionId]: (prev[questionId] || []).filter((e) => e.id !== evidenceId),
      }));
      showToast('success', 'Evidencia removida.');
    } catch {
      showToast('error', 'Erro ao remover evidencia.');
    }
  }

  // Save action plan
  async function handleSaveActionPlan(questionId: string) {
    const resp = getResponseForQuestion(questionId);
    if (!resp || resp.id.startsWith('temp-')) {
      showToast('error', 'Salve a resposta antes de criar o plano de acao.');
      return;
    }
    const form = actionPlanForms[questionId];
    if (!form) return;
    setSavingActionPlan((prev) => ({ ...prev, [questionId]: true }));
    try {
      await upsertActionPlan(resp.id, form as Omit<import('../lib/types').ActionPlan, 'id' | 'assessment_response_id' | 'created_at' | 'updated_at'>);
      setSavedActionPlans((prev) => ({ ...prev, [questionId]: true }));
      showToast('success', 'Plano de acao salvo.');
    } catch {
      showToast('error', 'Erro ao salvar plano de acao.');
    } finally {
      setSavingActionPlan((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  // Update action plan form field
  function updateActionPlanField(questionId: string, field: string, value: string | null) {
    setActionPlanForms((prev) => {
      const form = prev[questionId] || { ...EMPTY_ACTION_PLAN };
      return { ...prev, [questionId]: { ...form, [field]: value } };
    });
  }

  // Save draft
  async function handleSaveDraft() {
    if (!assessmentId) return;
    setSaving(true);
    try {
      await updateAssessment(assessmentId, { status: 'in_progress' });
      showToast('success', 'Rascunho salvo com sucesso.');
    } catch {
      showToast('error', 'Erro ao salvar rascunho.');
    } finally {
      setSaving(false);
    }
  }

  // Finalize assessment
  async function handleFinalize() {
    if (!assessmentId || !allAnswered) return;
    setFinalizing(true);
    try {
      const result = await finalizeAssessment(assessmentId, responses, pillars);
      setShowConfirmModal(false);
      showToast('success', `Avaliacao concluida! Nota: ${result.overallScore}% - Nivel: ${result.maturityLevel}`);
      setTimeout(() => navigate('/assessments'), 2000);
    } catch {
      showToast('error', 'Erro ao concluir avaliacao.');
    } finally {
      setFinalizing(false);
    }
  }

  // Pillar navigation
  function goToPrevPillar() {
    setActivePillarIndex((prev) => Math.max(0, prev - 1));
  }
  function goToNextPillar() {
    setActivePillarIndex((prev) => Math.min(pillars.length - 1, prev + 1));
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-slate-500 text-lg">Carregando avaliacao...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-slate-700 text-lg font-medium mb-2">
            {error || 'Avaliacao nao encontrada'}
          </p>
          <button
            onClick={() => navigate('/assessments')}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition"
          >
            Voltar para Avaliacoes
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = assessment.status === 'completed';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Avaliacao</h1>
              <p className="text-slate-500 text-sm">
                {assessment.company?.name || 'Empresa'} &middot;{' '}
                {isCompleted ? 'Concluida' : 'Em andamento'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Progresso</span>
            <span className="text-sm font-semibold text-teal-600">
              {answeredQuestions}/{totalQuestions} questoes ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Pillar Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {pillars.map((pillar, index) => {
              const pillarQuestions = questionsByPillar[pillar.id] || [];
              const pillarAnswered = pillarQuestions.filter((q) =>
                responses.some((r) => r.question_id === q.id && r.response)
              ).length;
              const pillarTotal = pillarQuestions.length;
              const pillarComplete = pillarTotal > 0 && pillarAnswered === pillarTotal;
              const Icon = PILLAR_ICONS[pillar.name] || FileText;

              return (
                <button
                  key={pillar.id}
                  onClick={() => setActivePillarIndex(index)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition border
                    ${
                      index === activePillarIndex
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : pillarComplete
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{pillar.name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      index === activePillarIndex
                        ? 'bg-white/20 text-white'
                        : pillarComplete
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {pillarAnswered}/{pillarTotal}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {activeQuestions.map((question) => {
            const resp = getResponseForQuestion(question.id);
            const currentResponse = (resp?.response || '') as ResponseType;
            const currentNotes = resp?.notes || '';
            const responseId = resp?.id && !resp.id.startsWith('temp-') ? resp.id : null;
            const showEvidence = currentResponse === 'ok' && responseId;
            const showActionPlan = (currentResponse === 'nao_ok' || currentResponse === 'parcial') && responseId;

            return (
              <div
                key={question.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* Question Header */}
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                          {question.code}
                        </span>
                        {question.framework && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {question.framework.name}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 font-medium leading-relaxed">
                        {question.question_text}
                      </p>
                      {question.guidance && (
                        <p className="text-sm text-slate-500 mt-1">{question.guidance}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Response Options */}
                <div className="px-6 py-4">
                  <div className="flex flex-wrap gap-3 mb-4">
                    {RESPONSE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition
                          ${
                            currentResponse === opt.value
                              ? `${opt.bg} ${opt.border} ${opt.color}`
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }
                          ${isCompleted ? 'pointer-events-none opacity-70' : ''}
                        `}
                      >
                        <input
                          type="radio"
                          name={`response-${question.id}`}
                          value={opt.value}
                          checked={currentResponse === opt.value}
                          onChange={() => handleResponseChange(question.id, opt.value)}
                          disabled={isCompleted}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition
                            ${
                              currentResponse === opt.value
                                ? `${opt.border} ${opt.bg}`
                                : 'border-slate-300 bg-white'
                            }
                          `}
                        >
                          {currentResponse === opt.value && (
                            <div className={`w-2 h-2 rounded-full ${opt.color.replace('text-', 'bg-')}`} />
                          )}
                        </div>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Notes */}
                  <div className="mb-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Observacoes
                    </label>
                    <textarea
                      value={currentNotes}
                      onChange={(e) => handleNotesChange(question.id, e.target.value)}
                      disabled={isCompleted}
                      rows={2}
                      placeholder="Adicione observacoes sobre esta questao..."
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none disabled:opacity-70 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Evidence Section (when OK) */}
                {showEvidence && (
                  <div className="px-6 py-4 border-t border-slate-100 bg-emerald-50/30">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Evidencias
                    </h4>

                    {/* Existing evidences */}
                    {evidenceLoading[question.id] ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando evidencias...
                      </div>
                    ) : (
                      evidencesMap[question.id]?.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {evidencesMap[question.id].map((ev) => (
                            <div
                              key={ev.id}
                              className="flex items-center justify-between bg-white rounded-lg border border-emerald-200 px-4 py-2.5"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800 truncate">{ev.description}</p>
                                {ev.file_name && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Upload className="w-3 h-3" />
                                    {ev.file_name}
                                  </p>
                                )}
                              </div>
                              {!isCompleted && (
                                <button
                                  onClick={() => handleDeleteEvidence(question.id, ev.id)}
                                  className="ml-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                                  title="Remover evidencia"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Add evidence form */}
                    {!isCompleted && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Descricao da evidencia *
                          </label>
                          <textarea
                            value={newEvidenceDesc[question.id] || ''}
                            onChange={(e) =>
                              setNewEvidenceDesc((prev) => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            placeholder="Descreva a evidencia encontrada..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Nome do arquivo
                          </label>
                          <input
                            type="text"
                            value={newEvidenceFileName[question.id] || ''}
                            onChange={(e) =>
                              setNewEvidenceFileName((prev) => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            placeholder="ex: politica_seguranca.pdf"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                          />
                        </div>
                        <button
                          onClick={() => handleAddEvidence(question.id)}
                          disabled={addingEvidence[question.id]}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                        >
                          {addingEvidence[question.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Adicionar Evidencia
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Plan Section (when Nao OK or Parcial) */}
                {showActionPlan && (
                  <div className="px-6 py-4 border-t border-slate-100 bg-amber-50/30">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-amber-600" />
                      Plano de Acao (5W2H)
                    </h4>

                    {actionPlanLoading[question.id] ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando plano de acao...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* What */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            O Que (What) *
                          </label>
                          <textarea
                            value={actionPlanForms[question.id]?.what || ''}
                            onChange={(e) =>
                              updateActionPlanField(question.id, 'what', e.target.value)
                            }
                            disabled={isCompleted}
                            rows={2}
                            placeholder="O que sera feito?"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none disabled:opacity-70 disabled:bg-slate-50"
                          />
                        </div>

                        {/* Why */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Por Que (Why) *
                          </label>
                          <textarea
                            value={actionPlanForms[question.id]?.why || ''}
                            onChange={(e) =>
                              updateActionPlanField(question.id, 'why', e.target.value)
                            }
                            disabled={isCompleted}
                            rows={2}
                            placeholder="Por que sera feito?"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none disabled:opacity-70 disabled:bg-slate-50"
                          />
                        </div>

                        {/* Who */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Quem (Who) *
                          </label>
                          <input
                            type="text"
                            value={actionPlanForms[question.id]?.who || ''}
                            onChange={(e) =>
                              updateActionPlanField(question.id, 'who', e.target.value)
                            }
                            disabled={isCompleted}
                            placeholder="Responsavel pela acao"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition disabled:opacity-70 disabled:bg-slate-50"
                          />
                        </div>

                        {/* When */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Quando (When) *
                          </label>
                          <input
                            type="date"
                            value={actionPlanForms[question.id]?.when_date || ''}
                            onChange={(e) =>
                              updateActionPlanField(
                                question.id,
                                'when_date',
                                e.target.value || null
                              )
                            }
                            disabled={isCompleted}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition disabled:opacity-70 disabled:bg-slate-50"
                          />
                        </div>

                        {/* Where */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Onde (Where)
                          </label>
                          <input
                            type="text"
                            value={actionPlanForms[question.id]?.where_text || ''}
                            onChange={(e) =>
                              updateActionPlanField(question.id, 'where_text', e.target.value)
                            }
                            disabled={isCompleted}
                            placeholder="Local da acao"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition disabled:opacity-70 disabled:bg-slate-50"
                          />
                        </div>

                        {/* How */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Como (How) *
                          </label>
                          <textarea
                            value={actionPlanForms[question.id]?.how || ''}
                            onChange={(e) =>
                              updateActionPlanField(question.id, 'how', e.target.value)
                            }
                            disabled={isCompleted}
                            rows={2}
                            placeholder="Como sera feito?"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none disabled:opacity-70 disabled:bg-slate-50"
                          />
                        </div>

                        {/* How Much */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Quanto (How Much)
                          </label>
                          <input
                            type="text"
                            value={actionPlanForms[question.id]?.how_much || ''}
                            onChange={(e) =>
                              updateActionPlanField(question.id, 'how_much', e.target.value)
                            }
                            disabled={isCompleted}
                            placeholder="Custo estimado ou recursos necessarios"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition disabled:opacity-70 disabled:bg-slate-50"
                          />
                        </div>
                      </div>
                    )}

                    {/* Save action plan button */}
                    {!isCompleted && (
                      <div className="mt-4">
                        <button
                          onClick={() => handleSaveActionPlan(question.id)}
                          disabled={savingActionPlan[question.id]}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                        >
                          {savingActionPlan[question.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Salvar Plano de Acao
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {activeQuestions.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg font-medium mb-1">
                Nenhuma questao neste pilar
              </p>
              <p className="text-slate-400 text-sm">
                Selecione outro pilar para continuar.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation & Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Pillar Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevPillar}
              disabled={activePillarIndex === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="text-sm text-slate-500">
              Pilar {activePillarIndex + 1} de {pillars.length}
            </span>
            <button
              onClick={goToNextPillar}
              disabled={activePillarIndex === pillars.length - 1}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Proximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          {!isCompleted && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Rascunho
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!allAnswered || finalizing}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              >
                {finalizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Concluir Avaliacao
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Finalize Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Concluir Avaliacao
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Todas as {totalQuestions} questoes foram respondidas. Ao concluir, a
                avaliacao sera finalizada e a nota sera calculada.
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Nota estimada:</span>{' '}
                  {calculateScore(responses)}%
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Nivel de maturidade:</span>{' '}
                  {getMaturityLevel(calculateScore(responses)).label}
                </p>
              </div>
              <p className="text-amber-600 text-xs">
                Esta acao nao pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              >
                {finalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out]">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <X className="w-3 h-3 text-white" />
              </div>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-current opacity-50 hover:opacity-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
