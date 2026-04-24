import { useState, useEffect, useCallback } from 'react';
import {
  Server,
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
  getServices,
  createService,
  updateService,
  deleteService,
  getCompanies,
} from '../lib/api';
import type { Service, Company, ServiceStatus } from '../lib/types';

interface FormData {
  name: string;
  description: string;
  category: string;
  service_owner: string;
  sla_target: string;
  current_performance: string;
  status: ServiceStatus;
}

const emptyForm: FormData = {
  name: '',
  description: '',
  category: '',
  service_owner: '',
  sla_target: '',
  current_performance: '',
  status: 'active',
};

const SERVICE_CATEGORIES = [
  'Infraestrutura',
  'Aplicacao',
  'Seguranca',
  'Rede',
  'Armazenamento',
  'Backup',
  'Monitoramento',
  'Suporte',
  'Cloud',
  'Outro',
];

const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  review: 'Revisao',
};

const SERVICE_STATUS_BADGE: Record<ServiceStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  inactive: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  review: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
};

export default function ServicesPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isAuditor = profile?.role === 'auditor';
  const canEdit = isAdmin || isAuditor;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
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

  const loadServices = useCallback(async () => {
    if (!selectedCompanyId) {
      setServices([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getServices(selectedCompanyId);
      setServices(data);
    } catch {
      showToast('error', 'Erro ao carregar servicos.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, showToast]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadServices();
    }
  }, [selectedCompanyId, loadServices]);

  function openCreateModal() {
    setEditingService(null);
    setForm(emptyForm);
    setShowFormModal(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description,
      category: service.category,
      service_owner: service.service_owner,
      sla_target: service.sla_target,
      current_performance: service.current_performance,
      status: service.status,
    });
    setShowFormModal(true);
  }

  function closeFormModal() {
    setShowFormModal(false);
    setEditingService(null);
    setForm(emptyForm);
  }

  function openDeleteModal(service: Service) {
    setDeletingService(service);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeletingService(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        company_id: selectedCompanyId,
        assessment_id: null,
        name: form.name,
        description: form.description,
        category: form.category,
        service_owner: form.service_owner,
        sla_target: form.sla_target,
        current_performance: form.current_performance,
        status: form.status,
      };

      if (editingService) {
        await updateService(editingService.id, payload);
        showToast('success', 'Servico atualizado com sucesso.');
      } else {
        await createService(payload);
        showToast('success', 'Servico criado com sucesso.');
      }
      closeFormModal();
      await loadServices();
    } catch {
      showToast('error', 'Erro ao salvar servico. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingService) return;
    setDeleting(true);
    try {
      await deleteService(deletingService.id);
      showToast('success', 'Servico excluido com sucesso.');
      closeDeleteModal();
      await loadServices();
    } catch {
      showToast('error', 'Erro ao excluir servico. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredServices = services.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term) ||
      s.service_owner.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term)
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
              <Server className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Gestao de Servicos</h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Gerenciamento de servicos de TI conforme ITIL.
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
                placeholder="Buscar por nome, categoria, proprietario..."
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
                Novo Servico
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
              Escolha uma empresa no seletor acima para visualizar os servicos.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-500">Carregando servicos...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Server className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              {search ? 'Nenhum servico encontrado' : 'Nenhum servico cadastrado'}
            </p>
            <p className="text-slate-400 text-sm">
              {search
                ? 'Tente ajustar os termos da busca.'
                : 'Clique em "Novo Servico" para adicionar o primeiro.'}
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
                        Nome
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Proprietario
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        SLA
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Performance
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
                    {filteredServices.map((service) => {
                      const statusBadge = SERVICE_STATUS_BADGE[service.status];

                      return (
                        <tr
                          key={service.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                                <Server className="w-4 h-4 text-teal-600" />
                              </div>
                              <div>
                                <span className="font-medium text-slate-900 block">
                                  {service.name}
                                </span>
                                {service.description && (
                                  <span className="text-xs text-slate-500 line-clamp-1">
                                    {service.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {service.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-700">
                              {service.service_owner}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600 font-mono">
                              {service.sla_target}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600 font-mono">
                              {service.current_performance}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                              {SERVICE_STATUS_LABELS[service.status]}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(service)}
                                  className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(service)}
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
              {filteredServices.map((service) => {
                const statusBadge = SERVICE_STATUS_BADGE[service.status];

                return (
                  <div
                    key={service.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                          <Server className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {service.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {service.service_owner}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(service)}
                            className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(service)}
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
                        {service.category}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                        {SERVICE_STATUS_LABELS[service.status]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs">SLA</span>
                        <p className="text-slate-700 font-mono text-xs">
                          {service.sla_target}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs">Performance</span>
                        <p className="text-slate-700 font-mono text-xs">
                          {service.current_performance}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-slate-500">
              {filteredServices.length}{' '}
              {filteredServices.length === 1 ? 'servico encontrado' : 'servicos encontrados'}
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
                {editingService ? 'Editar Servico' : 'Novo Servico'}
              </h2>
              <button
                onClick={closeFormModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Nome do Servico *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: E-mail Corporativo"
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
                  placeholder="Descreva o servico detalhadamente..."
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
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Service Owner */}
              <div>
                <label
                  htmlFor="service_owner"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Proprietario do Servico *
                </label>
                <input
                  id="service_owner"
                  type="text"
                  required
                  value={form.service_owner}
                  onChange={(e) => setForm((f) => ({ ...f, service_owner: e.target.value }))}
                  placeholder="Ex: Maria Santos"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              {/* SLA Target & Current Performance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="sla_target"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Meta SLA *
                  </label>
                  <input
                    id="sla_target"
                    type="text"
                    required
                    value={form.sla_target}
                    onChange={(e) => setForm((f) => ({ ...f, sla_target: e.target.value }))}
                    placeholder="Ex: 99.9%"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="current_performance"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Performance Atual *
                  </label>
                  <input
                    id="current_performance"
                    type="text"
                    required
                    value={form.current_performance}
                    onChange={(e) => setForm((f) => ({ ...f, current_performance: e.target.value }))}
                    placeholder="Ex: 99.5%"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono"
                  />
                </div>
              </div>

              {/* Status */}
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
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ServiceStatus }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="review">Revisao</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
                  {editingService ? 'Salvar Alteracoes' : 'Criar Servico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingService && (
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
                Tem certeza que deseja excluir o servico
              </p>
              <p className="text-slate-900 font-semibold mb-1">
                {deletingService.name}
              </p>
              <p className="text-slate-600 text-sm">
                Categoria: {deletingService.category}
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
