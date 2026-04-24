import { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getPillars,
  getFrameworks,
} from '../lib/api';
import type { Question, Pillar, Framework } from '../lib/types';

interface FormData {
  code: string;
  question_text: string;
  guidance: string;
  pillar_id: string;
  framework_id: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm: FormData = {
  code: '',
  question_text: '',
  guidance: '',
  pillar_id: '',
  framework_id: '',
  sort_order: 0,
  is_active: true,
};

const PILLAR_BADGE: Record<string, { bg: string; text: string }> = {
  Governanca: { bg: 'bg-teal-100', text: 'text-teal-800' },
  Seguranca: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Infraestrutura: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Suporte: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

const FRAMEWORK_BADGE: Record<string, { bg: string; text: string }> = {
  COBIT: { bg: 'bg-slate-100', text: 'text-slate-700' },
  ITIL: { bg: 'bg-teal-100', text: 'text-teal-800' },
  'ISO 27000': { bg: 'bg-rose-100', text: 'text-rose-800' },
};

function getPillarBadge(name: string) {
  return PILLAR_BADGE[name] ?? { bg: 'bg-slate-100', text: 'text-slate-700' };
}

function getFrameworkBadge(name: string) {
  return FRAMEWORK_BADGE[name] ?? { bg: 'bg-slate-100', text: 'text-slate-700' };
}

export default function QuestionsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterPillar, setFilterPillar] = useState('');
  const [filterFramework, setFilterFramework] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [questionsData, pillarsData, frameworksData] = await Promise.all([
        getQuestions(),
        getPillars(),
        getFrameworks(),
      ]);
      setQuestions(questionsData);
      setPillars(pillarsData);
      setFrameworks(frameworksData);
    } catch {
      showToast('error', 'Erro ao carregar perguntas.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getPillarName(id: string): string {
    return pillars.find((p) => p.id === id)?.name ?? '—';
  }

  function getFrameworkName(id: string): string {
    return frameworks.find((f) => f.id === id)?.name ?? '—';
  }

  function openCreateModal() {
    setEditingQuestion(null);
    setForm(emptyForm);
    setShowFormModal(true);
  }

  function openEditModal(question: Question) {
    setEditingQuestion(question);
    setForm({
      code: question.code,
      question_text: question.question_text,
      guidance: question.guidance,
      pillar_id: question.pillar_id,
      framework_id: question.framework_id,
      sort_order: question.sort_order,
      is_active: question.is_active,
    });
    setShowFormModal(true);
  }

  function closeFormModal() {
    setShowFormModal(false);
    setEditingQuestion(null);
    setForm(emptyForm);
  }

  function openDeleteModal(question: Question) {
    setDeletingQuestion(question);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeletingQuestion(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        question_text: form.question_text,
        guidance: form.guidance,
        pillar_id: form.pillar_id,
        framework_id: form.framework_id,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, payload);
        showToast('success', 'Pergunta atualizada com sucesso.');
      } else {
        await createQuestion(payload);
        showToast('success', 'Pergunta criada com sucesso.');
      }
      closeFormModal();
      await loadData();
    } catch {
      showToast('error', 'Erro ao salvar pergunta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingQuestion) return;
    setDeleting(true);
    try {
      await deleteQuestion(deletingQuestion.id);
      showToast('success', 'Pergunta excluida com sucesso.');
      closeDeleteModal();
      await loadData();
    } catch {
      showToast('error', 'Erro ao excluir pergunta. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const term = search.toLowerCase();
    const matchesSearch =
      q.code.toLowerCase().includes(term) ||
      q.question_text.toLowerCase().includes(term);
    const matchesPillar = !filterPillar || q.pillar_id === filterPillar;
    const matchesFramework = !filterFramework || q.framework_id === filterFramework;
    return matchesSearch && matchesPillar && matchesFramework;
  });

  const hasActiveFilters = filterPillar || filterFramework || search;

  function clearFilters() {
    setSearch('');
    setFilterPillar('');
    setFilterFramework('');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Perguntas</h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Gerencie as perguntas e frameworks do diagnostico de maturidade.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por codigo ou pergunta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={filterPillar}
              onChange={(e) => setFilterPillar(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
            >
              <option value="">Todos os pilares</option>
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterFramework}
              onChange={(e) => setFilterFramework(e.target.value)}
              className="pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
            >
              <option value="">Todos os frameworks</option>
              {frameworks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nova Pergunta
            </button>
          )}
        </div>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">Filtros ativos:</span>
            {filterPillar && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                {getPillarName(filterPillar)}
                <button onClick={() => setFilterPillar('')} className="hover:text-teal-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterFramework && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {getFrameworkName(filterFramework)}
                <button onClick={() => setFilterFramework('')} className="hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                &quot;{search}&quot;
                <button onClick={() => setSearch('')} className="hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-slate-500 hover:text-slate-700 underline transition"
            >
              Limpar tudo
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-500">Carregando perguntas...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              {hasActiveFilters ? 'Nenhuma pergunta encontrada' : 'Nenhuma pergunta cadastrada'}
            </p>
            <p className="text-slate-400 text-sm">
              {hasActiveFilters
                ? 'Tente ajustar os filtros ou termos da busca.'
                : 'Clique em "Nova Pergunta" para adicionar a primeira.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Codigo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pergunta
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pilar
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Framework
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      {isAdmin && (
                        <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Acoes
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuestions.map((question) => {
                      const pillarName = question.pillar?.name ?? getPillarName(question.pillar_id);
                      const frameworkName = question.framework?.name ?? getFrameworkName(question.framework_id);
                      const pillarBadge = getPillarBadge(pillarName);
                      const frameworkBadge = getFrameworkBadge(frameworkName);

                      return (
                        <tr
                          key={question.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                              {question.code}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-900 max-w-md">
                              {question.question_text}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pillarBadge.bg} ${pillarBadge.text}`}
                            >
                              {pillarName}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${frameworkBadge.bg} ${frameworkBadge.text}`}
                            >
                              {frameworkName}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {question.is_active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Inativa
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(question)}
                                  className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(question)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {filteredQuestions.map((question) => {
                const pillarName = question.pillar?.name ?? getPillarName(question.pillar_id);
                const frameworkName = question.framework?.name ?? getFrameworkName(question.framework_id);
                const pillarBadge = getPillarBadge(pillarName);
                const frameworkBadge = getFrameworkBadge(frameworkName);

                return (
                  <div
                    key={question.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {question.code}
                        </span>
                        {question.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Inativa
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(question)}
                            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(question)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-900 text-sm mb-3">{question.question_text}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pillarBadge.bg} ${pillarBadge.text}`}
                      >
                        {pillarName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${frameworkBadge.bg} ${frameworkBadge.text}`}
                      >
                        {frameworkName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-slate-500">
              {filteredQuestions.length}{' '}
              {filteredQuestions.length === 1 ? 'pergunta encontrada' : 'perguntas encontradas'}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeFormModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h2>
              <button
                onClick={closeFormModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Code */}
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Codigo *
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Ex: GOV-001"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono"
                />
              </div>

              {/* Question Text */}
              <div>
                <label
                  htmlFor="question_text"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Pergunta *
                </label>
                <textarea
                  id="question_text"
                  required
                  rows={3}
                  value={form.question_text}
                  onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
                  placeholder="Existe um framework de governanca formalmente definido?"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Guidance */}
              <div>
                <label
                  htmlFor="guidance"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Orientacao
                </label>
                <textarea
                  id="guidance"
                  rows={3}
                  value={form.guidance}
                  onChange={(e) => setForm((f) => ({ ...f, guidance: e.target.value }))}
                  placeholder="Orientacoes para o avaliador responder esta pergunta..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Pillar & Framework */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="pillar_id"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Pilar *
                  </label>
                  <div className="relative">
                    <select
                      id="pillar_id"
                      required
                      value={form.pillar_id}
                      onChange={(e) => setForm((f) => ({ ...f, pillar_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                    >
                      <option value="">Selecione o pilar</option>
                      {pillars.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="framework_id"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Framework *
                  </label>
                  <div className="relative">
                    <select
                      id="framework_id"
                      required
                      value={form.framework_id}
                      onChange={(e) => setForm((f) => ({ ...f, framework_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                    >
                      <option value="">Selecione o framework</option>
                      {frameworks.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Sort Order & Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="sort_order"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Ordem
                  </label>
                  <input
                    id="sort_order"
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, is_active: e.target.checked }))
                      }
                      className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 transition"
                    />
                    <span className="text-sm font-medium text-slate-700">Pergunta ativa</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingQuestion ? 'Salvar Alteracoes' : 'Criar Pergunta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Confirmar Exclusao
              </h3>
              <p className="text-slate-500 text-sm mb-1">
                Tem certeza que deseja excluir a pergunta
              </p>
              <p className="text-slate-900 font-semibold mb-1">
                {deletingQuestion.code}
              </p>
              <p className="text-slate-600 text-sm line-clamp-2">
                {deletingQuestion.question_text}
              </p>
              <p className="text-red-600 text-xs mt-3">
                Esta acao nao pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Excluir
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
