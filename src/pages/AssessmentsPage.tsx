import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Search,
  Plus,
  X,
  Loader2,
  ChevronRight,
  Filter,
  Building2,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getAssessments, createAssessment, getCompanies } from '../lib/api';
import type { Assessment, Company, AssessmentStatus } from '../lib/types';
import { MATURITY_LEVELS } from '../lib/types';

const STATUS_CONFIG: Record<
  AssessmentStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: 'Rascunho', bg: 'bg-slate-100', text: 'text-slate-700' },
  in_progress: { label: 'Em Andamento', bg: 'bg-amber-100', text: 'text-amber-700' },
  completed: { label: 'Concluida', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

function getMaturityBadge(score: number, level: string) {
  const match = MATURITY_LEVELS.find(
    (l) => score >= l.min && score <= l.max
  );
  const color = match?.color ?? '#94a3b8';
  return { label: level, color };
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AssessmentsPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role ?? 'cliente';
  const isAdmin = role === 'admin';
  const isAuditor = role === 'auditor';
  const canCreate = isAdmin || isAuditor;

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AssessmentStatus | ''>('');
  const [filterCompany, setFilterCompany] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const companyId =
        role === 'cliente' ? profile?.company_id ?? undefined : undefined;
      const [assessData, compData] = await Promise.all([
        getAssessments(companyId),
        canCreate ? getCompanies() : Promise.resolve([]),
      ]);
      setAssessments(assessData);
      setCompanies(compData);
    } catch {
      showToast('error', 'Erro ao carregar avaliacoes.');
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id, role, canCreate, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate() {
    if (!selectedCompanyId || !user) return;
    setCreating(true);
    try {
      const assessment = await createAssessment(selectedCompanyId, user.id);
      showToast('success', 'Avaliacao criada com sucesso.');
      setShowCreateModal(false);
      setSelectedCompanyId('');
      navigate(`/assessments/${assessment.id}`);
    } catch {
      showToast('error', 'Erro ao criar avaliacao. Tente novamente.');
    } finally {
      setCreating(false);
    }
  }

  function handleClickRow(a: Assessment) {
    if (a.status === 'completed') {
      navigate(`/reports/${a.id}`);
    } else {
      navigate(`/assessments/${a.id}`);
    }
  }

  const filtered = assessments.filter((a) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      a.company?.name.toLowerCase().includes(term) ||
      a.auditor?.full_name.toLowerCase().includes(term) ||
      a.maturity_level.toLowerCase().includes(term);

    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesCompany =
      !filterCompany || a.company_id === filterCompany;

    return matchesSearch && matchesStatus && matchesCompany;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Avaliacoes</h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Gerencie e acompanhe as avaliacoes de maturidade de TI.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por empresa, auditor ou nivel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as AssessmentStatus | '')
                }
                className="pl-9 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none"
              >
                <option value="">Todos os status</option>
                <option value="draft">Rascunho</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluida</option>
              </select>
            </div>

            {canCreate && companies.length > 0 && (
              <div className="relative">
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="pl-3 pr-8 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none"
                >
                  <option value="">Todas as empresas</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Nova Avaliacao
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-500">Carregando avaliacoes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              {search || filterStatus || filterCompany
                ? 'Nenhuma avaliacao encontrada'
                : 'Nenhuma avaliacao cadastrada'}
            </p>
            <p className="text-slate-400 text-sm">
              {search || filterStatus || filterCompany
                ? 'Tente ajustar os filtros ou termos da busca.'
                : canCreate
                ? 'Clique em "Nova Avaliacao" para iniciar a primeira.'
                : 'As avaliacoes da sua empresa aparecerão aqui.'}
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
                        Empresa
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Auditor
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pontuacao
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Nivel Maturidade
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((a) => {
                      const statusCfg = STATUS_CONFIG[a.status];
                      const maturity = getMaturityBadge(
                        a.overall_score,
                        a.maturity_level
                      );
                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => handleClickRow(a)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-teal-600" />
                              </div>
                              <span className="font-medium text-slate-900">
                                {a.company?.name ?? '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {a.auditor?.full_name ?? '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                            >
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-semibold">
                            {a.status === 'draft' ? '-' : `${a.overall_score}%`}
                          </td>
                          <td className="px-6 py-4">
                            {a.status === 'draft' ? (
                              <span className="text-sm text-slate-400">-</span>
                            ) : (
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                                style={{ backgroundColor: maturity.color }}
                              >
                                {maturity.label}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(a.created_at)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClickRow(a);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            >
                              {a.status === 'completed' ? (
                                <>
                                  <Eye className="w-4 h-4" />
                                  Ver
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="w-4 h-4" />
                                  Continuar
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-4">
              {filtered.map((a) => {
                const statusCfg = STATUS_CONFIG[a.status];
                const maturity = getMaturityBadge(
                  a.overall_score,
                  a.maturity_level
                );
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleClickRow(a)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {a.company?.name ?? '-'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Auditor: {a.auditor?.full_name ?? '-'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs block">
                          Pontuacao
                        </span>
                        <p className="text-slate-700 font-semibold">
                          {a.status === 'draft' ? '-' : `${a.overall_score}%`}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">
                          Nivel
                        </span>
                        {a.status === 'draft' ? (
                          <p className="text-slate-400">-</p>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: maturity.color }}
                          >
                            {maturity.label}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">
                          Data
                        </span>
                        <p className="text-slate-700">
                          {formatDate(a.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3 pt-3 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-600">
                        {a.status === 'completed' ? 'Ver Relatorio' : 'Continuar'}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-slate-500">
              {filtered.length}{' '}
              {filtered.length === 1
                ? 'avaliacao encontrada'
                : 'avaliacoes encontradas'}
            </div>
          </>
        )}
      </div>

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              setShowCreateModal(false);
              setSelectedCompanyId('');
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Nova Avaliacao
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedCompanyId('');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label
                  htmlFor="company-select"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Selecione a Empresa *
                </label>
                <select
                  id="company-select"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                >
                  <option value="">Escolha a empresa...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-slate-500">
                A avaliacao sera criada com status Rascunho. Voce podera
                preenche-la em seguida.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedCompanyId('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!selectedCompanyId || creating}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar Avaliacao
                </button>
              </div>
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
