import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users as UsersIcon, Shield } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      auditor: 'bg-blue-100 text-blue-700',
      client: 'bg-green-100 text-green-700',
    };

    const labels: Record<string, string> = {
      admin: 'Administrador',
      auditor: 'Auditor',
      client: 'Cliente',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[role]}`}>
        {labels[role] || role}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Usuários</h1>
        <p className="text-slate-600 mt-1">Gerencie os usuários da plataforma</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">Controle de Acesso</h2>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Perfil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                    Cadastro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{user.full_name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-2">Perfis de Acesso</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li><strong>Administrador:</strong> Acesso total, pode criar questões e gerenciar a plataforma</li>
          <li><strong>Auditor:</strong> Pode criar e gerenciar avaliações nas empresas</li>
          <li><strong>Cliente:</strong> Visualiza apenas relatórios da própria empresa</li>
        </ul>
      </div>
    </div>
  );
}
