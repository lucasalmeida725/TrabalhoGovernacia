import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  getCompanies,
} from '../lib/api';
import type { Risk, Company, RiskLikelihood, RiskImpact, RiskLevel, RiskStatus } from '../lib/types';

interface FormData {
  title: string;
  description: string;
  category: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  risk_level: RiskLevel;
  mitigation_plan: string;
  owner: string;
  status: RiskStatus;
}

const emptyForm: FormData = {
  title: '',
  description: '',
  category: '',
  likelihood: 'low',
  impact: 'low',
  risk_level: 'low',
  mitigation_plan: '',
  owner: '',
  status: 'open',
};

const RISK_CATEGORIES = [
  'Seguranca da Informacao',
  'Operacional',
  'Financeiro',
  'Compliance',
  'Tecnologico',
  'Reputacional',
  'Legal',
  'Estrategico',
  'Outro',
];

const LIKELIHOOD_LABELS: Record<RiskLikelihood, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
};

const IMPACT_LABELS: Record<RiskImpact, string> = {
  low: 'Baixo',
  medium: 'Medio',
  high: 'Alto',
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Baixo',
  medium: 'Medio',
  high: 'Alto',
  critical: 'Critico',
};

const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Aberto',
  mitigating: 'Mitigando',
  mitigated: 'Mitigado',
  accepted: 'Aceito',
};

const RISK_LEVEL_BADGE: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

const RISK_STATUS_BADGE: Record<RiskStatus, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  mitigating: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  mitigated: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  accepted: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};

const LIKELIHOOD_BADGE: Record<RiskLikelihood, { bg: string; text: string }> = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700' },
  high: { bg: 'bg-red-50', text: 'text-red-700' },
};

const IMPACT_BADGE: Record<RiskImpact, { bg: string; text: string }> = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700' },
  high: { bg: 'bg-red-50', text: 'text-red-700' },
};

export default function RisksPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isAuditor = profile?.role === 'auditor';
  const canEdit = isAdmin || isAuditor;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);
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

  const loadCompanies = useCallback(async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
      if (profile?.role === 'cliente' && profile.company_id) {
        setSelectedCompanyId(profile.company_id);
      } else if (data.length > 0) {
        setSelectedCompanyId(data[0].id);
      }
    } catch {
      showToast('error', 'Erro ao carregar empresas.');
    }
  }, [showToast, profile?.role, profile?.company_id]);

  const loadRisks = useCallback(async () => {
    if (!selectedCompanyId) {
      setRisks([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getRisks(selectedCompanyId);
      setRisks(data);
    } catch {
      showToast('error', 'Erro ao carregar riscos.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, showToast]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadRisks();
    }
  }, [selectedCompanyId, loadRisks]);

  function openCreateModal() {
    setEditingRisk(null);
    setForm(emptyForm);
    setShowFormModal(true);
  }

  function openEditModal(risk: Risk) {
    setEditingRisk(risk);
    setForm({
      title: risk.title,
      description: risk.description,
      category: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      risk_level: risk.risk_level,
      mitigation_plan: risk.mitigation_plan,
      owner: risk.owner,
      status: risk.status,
    });
    setShowFormModal(true);
  }

  function closeFormModal() {
    setShowFormModal(false);
    setEditingRisk(null);
    setForm(emptyForm);
  }

  function openDeleteModal(risk: Risk) {
    setDeletingRisk(risk);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeletingRisk(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        company_id: selectedCompanyId,
        assessment_id: null,
        title: form.title,
        description: form.description,
        category: form.category,
        likelihood: form.likelihood,
        impact: form.impact,
        risk_level: form.risk_level,
        mitigation_plan: form.mitigation_plan,
        owner: form.owner,
        status: form.status,
      };

      if (editingRisk) {
        await updateRisk(editingRisk.id, payload);
        showToast('success', 'Risco atualizado com sucesso.');
      } else {
        await createRisk(payload);
        showToast('success', 'Risco criado com sucesso.');
      }
      closeFormModal();
      await loadRisks();
    } catch {
      showToast('error', 'Erro ao salvar risco. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingRisk) return;
    setDeleting(true);
    try {
      await deleteRisk(deletingRisk.id);
      showToast('success', 'Risco excluido com sucesso.');
      closeDeleteModal();
      await loadRisks();
    } catch {
      showToast('error', 'Erro ao excluir risco. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredRisks = risks.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(term) ||
      r.category.toLowerCase().includes(term) ||
      r.owner.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term)
    );
  });

  const selectedCompanyName = companies.find((c) => c.id === selectedCompanyId)?.name ?? '';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Gestao de Riscos</h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Gerenciamento de riscos conforme ISO 27000.
          </p>
        </div>

        {/* Company Selector */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-72">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                disabled={profile?.role === 'cliente'}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">Selecione a empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        {selectedCompanyId && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por titulo, categoria, proprietario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
              />
            </div>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Novo Risco
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {!selectedCompanyId ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Building2 className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              Selecione uma empresa
            </p>
            <p className="text-slate-400 text-sm">
              Escolha uma empresa no seletor acima para visualizar os riscos.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-500">Carregando riscos...</p>
          </div>
        ) : filteredRisks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              {search ? 'Nenhum risco encontrado' : 'Nenhum risco cadastrado'}
            </p>
            <p className="text-slate-400 text-sm">
              {search
                ? 'Tente ajustar os termos da busca.'
                : 'Clique em "Novo Risco" para adicionar o primeiro.'}
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
                        Titulo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Probabilidade
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Impacto
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Nivel
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      {canEdit && (
                        <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Acoes
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRisks.map((risk) => {
                      const levelBadge = RISK_LEVEL_BADGE[risk.risk_level];
                      const statusBadge = RISK_STATUS_BADGE[risk.status];
                      const likelihoodBadge = LIKELIHOOD_BADGE[risk.likelihood];
                      const impactBadge = IMPACT_BADGE[risk.impact];

                      return (
                        <tr
                          key={risk.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert className="w-4 h-4 text-teal-600" />
                              </div>
                              <div>
                                <span className="font-medium text-slate-900 block">
                                  {risk.title}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {risk.owner}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {risk.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${likelihoodBadge.bg} ${likelihoodBadge.text}`}>
                              {LIKELIHOOD_LABELS[risk.likelihood]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${impactBadge.bg} ${impactBadge.text}`}>
                              {IMPACT_LABELS[risk.impact]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${levelBadge.bg} ${levelBadge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${levelBadge.dot}`} />
                              {RISK_LEVEL_LABELS[risk.risk_level]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                              {RISK_STATUS_LABELS[risk.status]}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(risk)}
                                  className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(risk)}
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
              {filteredRisks.map((risk) => {
                const levelBadge = RISK_LEVEL_BADGE[risk.risk_level];
                const statusBadge = RISK_STATUS_BADGE[risk.status];

                return (
                  <div
                    key={risk.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                          <ShieldAlert className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {risk.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {risk.owner}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(risk)}
                            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(risk)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {risk.category}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${levelBadge.bg} ${levelBadge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${levelBadge.dot}`} />
                        {RISK_LEVEL_LABELS[risk.risk_level]}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                        {RISK_STATUS_LABELS[risk.status]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs">Probabilidade</span>
                        <p className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LIKELIHOOD_BADGE[risk.likelihood].bg} ${LIKELIHOOD_BADGE[risk.likelihood].text}`}>
                          {LIKELIHOOD_LABELS[risk.likelihood]}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs">Impacto</span>
                        <p className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${IMPACT_BADGE[risk.impact].bg} ${IMPACT_BADGE[risk.impact].text}`}>
                          {IMPACT_LABELS[risk.impact]}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-slate-500">
              {filteredRisks.length}{' '}
              {filteredRisks.length === 1 ? 'risco encontrado' : 'riscos encontrados'}
              {selectedCompanyName && (
                <span className="text-slate-400"> em {selectedCompanyName}</span>
              )}
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
                {editingRisk ? 'Editar Risco' : 'Novo Risco'}
              </h2>
              <button
                onClick={closeFormModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Titulo *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Vazamento de dados sensíveis"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Descricao
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva o risco detalhadamente..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Categoria *
                </label>
                <div className="relative">
                  <select
                    id="category"
                    required
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                  >
                    <option value="">Selecione a categoria</option>
                    {RISK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Likelihood, Impact, Risk Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="likelihood"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Probabilidade *
                  </label>
                  <div className="relative">
                    <select
                      id="likelihood"
                      required
                      value={form.likelihood}
                      onChange={(e) => setForm((f) => ({ ...f, likelihood: e.target.value as RiskLikelihood }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="impact"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Impacto *
                  </label>
                  <div className="relative">
                    <select
                      id="impact"
                      required
                      value={form.impact}
                      onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value as RiskImpact }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                    >
                      <option value="low">Baixo</option>
                      <option value="medium">Medio</option>
                      <option value="high">Alto</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="risk_level"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Nivel de Risco *
                  </label>
                  <div className="relative">
                    <select
                      id="risk_level"
                      required
                      value={form.risk_level}
                      onChange={(e) => setForm((f) => ({ ...f, risk_level: e.target.value as RiskLevel }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                    >
                      <option value="low">Baixo</option>
                      <option value="medium">Medio</option>
                      <option value="high">Alto</option>
                      <option value="critical">Critico</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Mitigation Plan */}
              <div>
                <label
                  htmlFor="mitigation_plan"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Plano de Mitigacao
                </label>
                <textarea
                  id="mitigation_plan"
                  rows={3}
                  value={form.mitigation_plan}
                  onChange={(e) => setForm((f) => ({ ...f, mitigation_plan: e.target.value }))}
                  placeholder="Descreva o plano de mitigacao para este risco..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Owner & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="owner"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Proprietario *
                  </label>
                  <input
                    id="owner"
                    type="text"
                    required
                    value={form.owner}
                    onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                    placeholder="Ex: Joao Silva"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Status *
                  </label>
                  <div className="relative">
                    <select
                      id="status"
                      required
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as RiskStatus }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                    >
                      <option value="open">Aberto</option>
                      <option value="mitigating">Mitigando</option>
                      <option value="mitigated">Mitigado</option>
                      <option value="accepted">Aceito</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
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
                  {editingRisk ? 'Salvar Alteracoes' : 'Criar Risco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingRisk && (
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
                Tem certeza que deseja excluir o risco
              </p>
              <p className="text-slate-900 font-semibold mb-1">
                {deletingRisk.title}
              </p>
              <p className="text-slate-600 text-sm">
                Categoria: {deletingRisk.category}
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
