import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  Search,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { getAuditLogs } from '../lib/api';
import type { AuditLog } from '../lib/types';

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  UPDATE: { bg: 'bg-amber-100', text: 'text-amber-700' },
  DELETE: { bg: 'bg-red-100', text: 'text-red-700' },
  UPSERT: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

const TABLE_NAMES = [
  'companies',
  'questions',
  'assessments',
  'assessment_responses',
  'evidences',
  'action_plans',
  'risks',
  'services',
  'audit_logs',
];

const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'UPSERT'];

const PAGE_SIZE = 50;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatJson(obj: Record<string, unknown> | null | undefined) {
  if (!obj || Object.keys(obj).length === 0) return null;
  return JSON.stringify(obj, null, 2);
}

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Only admin can access this page
  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg font-medium">Acesso restrito</p>
          <p className="text-slate-400 text-sm mt-1">
            Apenas administradores podem visualizar os logs de auditoria.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(PAGE_SIZE);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

  const loadLogs = useCallback(
    async (limit: number, append: boolean = false) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        const data = await getAuditLogs(limit);
        setLogs((prev) => (append ? [...prev, ...data.slice(prev.length)] : data));
        setHasMore(data.length >= limit);
      } catch {
        showToast('error', 'Erro ao carregar logs de auditoria.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadLogs(PAGE_SIZE);
  }, [loadLogs]);

  function handleLoadMore() {
    const nextLimit = currentLimit + PAGE_SIZE;
    setCurrentLimit(nextLimit);
    loadLogs(nextLimit, true);
  }

  const filtered = logs.filter((log) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      log.action.toLowerCase().includes(term) ||
      log.table_name.toLowerCase().includes(term) ||
      (log.record_id ?? '').toLowerCase().includes(term) ||
      (log.ip_address ?? '').toLowerCase().includes(term);

    const matchesAction = !filterAction || log.action === filterAction;
    const matchesTable = !filterTable || log.table_name === filterTable;

    let matchesDate = true;
    if (filterDateFrom) {
      matchesDate = new Date(log.created_at) >= new Date(filterDateFrom);
    }
    if (filterDateTo && matchesDate) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      matchesDate = new Date(log.created_at) <= to;
    }

    return matchesSearch && matchesAction && matchesTable && matchesDate;
  });

  function toggleRow(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Logs de Auditoria
            </h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Registro de todas as acoes realizadas na plataforma.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-600">
            <Filter className="w-4 h-4" />
            Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar acao, tabela, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
              />
            </div>

            {/* Action type */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none"
            >
              <option value="">Todas as acoes</option>
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Table name */}
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none"
            >
              <option value="">Todas as tabelas</option>
              {TABLE_NAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Date from */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>

            {/* Date to */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-500">Carregando logs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <ScrollText className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              Nenhum log encontrado
            </p>
            <p className="text-slate-400 text-sm">
              Tente ajustar os filtros ou termos da busca.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Acao
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tabela
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        ID Registro
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">
                        {' '}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((log) => {
                      const isExpanded = expandedRow === log.id;
                      const actionCfg =
                        ACTION_COLORS[log.action] ??
                        ({ bg: 'bg-slate-100', text: 'text-slate-700' } as const);
                      const oldJson = formatJson(log.old_values);
                      const newJson = formatJson(log.new_values);
                      const hasDetails = oldJson || newJson;

                      return (
                        <tr
                          key={log.id}
                          className={`transition-colors ${
                            isExpanded
                              ? 'bg-slate-50'
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Data/Hora */}
                          <td className="px-6 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>

                          {/* Usuario */}
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <span className="text-sm text-slate-600 font-mono truncate max-w-[120px]">
                                {log.user_id
                                  ? log.user_id.slice(0, 8) + '...'
                                  : 'Sistema'}
                              </span>
                            </div>
                          </td>

                          {/* Acao */}
                          <td className="px-6 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionCfg.bg} ${actionCfg.text}`}
                            >
                              {log.action}
                            </span>
                          </td>

                          {/* Tabela */}
                          <td className="px-6 py-3 text-sm text-slate-700 font-medium">
                            {log.table_name}
                          </td>

                          {/* ID Registro */}
                          <td className="px-6 py-3 text-sm text-slate-500 font-mono max-w-[160px] truncate">
                            {log.record_id ?? '-'}
                          </td>

                          {/* Expand button */}
                          <td className="px-6 py-3">
                            {hasDetails && (
                              <button
                                onClick={() => toggleRow(log.id)}
                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                title="Ver detalhes"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Expanded details section */}
              {expandedRow && (
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
                  {(() => {
                    const log = filtered.find((l) => l.id === expandedRow);
                    if (!log) return null;
                    const oldJson = formatJson(log.old_values);
                    const newJson = formatJson(log.new_values);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {oldJson && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              Valores Anteriores
                            </h4>
                            <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {oldJson}
                            </pre>
                          </div>
                        )}
                        {newJson && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                              Novos Valores
                            </h4>
                            <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {newJson}
                            </pre>
                          </div>
                        )}
                        {!oldJson && !newJson && (
                          <p className="text-sm text-slate-400 col-span-2">
                            Nenhum detalhe disponivel.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((log) => {
                const actionCfg =
                  ACTION_COLORS[log.action] ??
                  ({ bg: 'bg-slate-100', text: 'text-slate-700' } as const);
                const isExpanded = expandedRow === log.id;
                const oldJson = formatJson(log.old_values);
                const newJson = formatJson(log.new_values);

                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleRow(log.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${actionCfg.bg} ${actionCfg.text}`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-700 font-medium">
                          {log.table_name}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-500 font-mono text-xs">
                          {log.record_id
                            ? log.record_id.slice(0, 8) + '...'
                            : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                        <User className="w-3 h-3" />
                        <span className="font-mono">
                          {log.user_id
                            ? log.user_id.slice(0, 8) + '...'
                            : 'Sistema'}
                        </span>
                        <span className="ml-auto">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (oldJson || newJson) && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                        {oldJson && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Valores Anteriores
                            </h4>
                            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {oldJson}
                            </pre>
                          </div>
                        )}
                        {newJson && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Novos Valores
                            </h4>
                            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {newJson}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-teal-600 bg-white border border-teal-200 hover:bg-teal-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Carregar mais
                </button>
              </div>
            )}

            {/* Results count */}
            <div className="mt-4 text-sm text-slate-500">
              Exibindo {filtered.length} de {logs.length} registros carregados
            </div>
          </>
        )}
      </div>

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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-current opacity-50 hover:opacity-100 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
