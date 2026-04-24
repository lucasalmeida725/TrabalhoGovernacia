import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../lib/api';
import type { Company } from '../lib/types';

interface FormData {
  name: string;
  cnpj: string;
  sector: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

const emptyForm: FormData = {
  name: '',
  cnpj: '',
  sector: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
};

const SECTORS = [
  'Tecnologia',
  'Financeiro',
  'Saude',
  'Educacao',
  'Varejo',
  'Industria',
  'Servicos',
  'Governo',
  'Outro',
];

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function stripCnpj(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export default function CompaniesPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
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
      setLoading(true);
      const data = await getCompanies();
      setCompanies(data);
    } catch {
      showToast('error', 'Erro ao carregar empresas.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  function openCreateModal() {
    setEditingCompany(null);
    setForm(emptyForm);
    setShowFormModal(true);
  }

  function openEditModal(company: Company) {
    setEditingCompany(company);
    setForm({
      name: company.name,
      cnpj: formatCnpj(company.cnpj),
      sector: company.sector,
      contact_name: company.contact_name,
      contact_email: company.contact_email,
      contact_phone: company.contact_phone,
    });
    setShowFormModal(true);
  }

  function closeFormModal() {
    setShowFormModal(false);
    setEditingCompany(null);
    setForm(emptyForm);
  }

  function openDeleteModal(company: Company) {
    setDeletingCompany(company);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeletingCompany(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        cnpj: stripCnpj(form.cnpj),
        sector: form.sector,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
        showToast('success', 'Empresa atualizada com sucesso.');
      } else {
        await createCompany(payload);
        showToast('success', 'Empresa criada com sucesso.');
      }
      closeFormModal();
      await loadCompanies();
    } catch (err: any) {
      const msg =
        err?.message?.includes('duplicate') || err?.message?.includes('unique')
          ? 'CNPJ ja cadastrado.'
          : 'Erro ao salvar empresa. Tente novamente.';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingCompany) return;
    setDeleting(true);
    try {
      await deleteCompany(deletingCompany.id);
      showToast('success', 'Empresa excluida com sucesso.');
      closeDeleteModal();
      await loadCompanies();
    } catch {
      showToast('error', 'Erro ao excluir empresa. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredCompanies = companies.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.cnpj.includes(term) ||
      c.sector.toLowerCase().includes(term) ||
      c.contact_name.toLowerCase().includes(term) ||
      c.contact_email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Gerencie as empresas cadastradas na plataforma.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ, setor ou contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
            />
          </div>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nova Empresa
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-500">Carregando empresas...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Building2 className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-1">
              {search ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
            </p>
            <p className="text-slate-400 text-sm">
              {search
                ? 'Tente ajustar os termos da busca.'
                : 'Clique em "Nova Empresa" para adicionar a primeira.'}
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
                        Nome
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        CNPJ
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Setor
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Contato
                      </th>
                      {isAdmin && (
                        <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Acoes
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.map((company) => (
                      <tr
                        key={company.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-teal-600" />
                            </div>
                            <span className="font-medium text-slate-900">
                              {company.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                          {formatCnpj(company.cnpj)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {company.sector}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">
                            {company.contact_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {company.contact_email}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(company)}
                                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(company)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
              {filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {company.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {formatCnpj(company.cnpj)}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(company)}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(company)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs">Setor</span>
                      <p className="text-slate-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {company.sector}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Contato</span>
                      <p className="text-slate-900">{company.contact_name}</p>
                      <p className="text-xs text-slate-500">
                        {company.contact_email}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-slate-500">
              {filteredCompanies.length}{' '}
              {filteredCompanies.length === 1 ? 'empresa encontrada' : 'empresas encontradas'}
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
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
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
                  Nome da Empresa *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ex: Tech Solutions Ltda"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              {/* CNPJ */}
              <div>
                <label
                  htmlFor="cnpj"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  CNPJ *
                </label>
                <input
                  id="cnpj"
                  type="text"
                  required
                  value={form.cnpj}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))
                  }
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  maxLength={18}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono"
                />
              </div>

              {/* Sector */}
              <div>
                <label
                  htmlFor="sector"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Setor *
                </label>
                <div className="relative">
                  <select
                    id="sector"
                    required
                    value={form.sector}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sector: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none bg-white"
                  >
                    <option value="">Selecione o setor</option>
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  Dados do Contato
                </h3>
              </div>

              {/* Contact Name */}
              <div>
                <label
                  htmlFor="contact_name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Nome do Contato *
                </label>
                <input
                  id="contact_name"
                  type="text"
                  required
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact_name: e.target.value }))
                  }
                  placeholder="Ex: Joao Silva"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label
                  htmlFor="contact_email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  E-mail do Contato *
                </label>
                <input
                  id="contact_email"
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact_email: e.target.value }))
                  }
                  placeholder="contato@empresa.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label
                  htmlFor="contact_phone"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Telefone do Contato
                </label>
                <input
                  id="contact_phone"
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact_phone: e.target.value }))
                  }
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
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
                  {editingCompany ? 'Salvar Alteracoes' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCompany && (
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
                Tem certeza que deseja excluir a empresa
              </p>
              <p className="text-slate-900 font-semibold mb-1">
                {deletingCompany.name}
              </p>
              <p className="text-slate-500 text-sm">
                CNPJ: {formatCnpj(deletingCompany.cnpj)}
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
