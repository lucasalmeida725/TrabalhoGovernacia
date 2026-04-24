import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Building2,
  FileQuestion,
  ClipboardCheck,
  AlertTriangle,
  Server,
  ScrollText,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'auditor', 'cliente'] },
  { label: 'Empresas', icon: Building2, path: '/companies', roles: ['admin', 'auditor'] },
  { label: 'Questionarios', icon: FileQuestion, path: '/questions', roles: ['admin'] },
  { label: 'Avaliacoes', icon: ClipboardCheck, path: '/assessments', roles: ['admin', 'auditor'] },
  { label: 'Riscos', icon: AlertTriangle, path: '/risks', roles: ['admin', 'auditor'] },
  { label: 'Servicos', icon: Server, path: '/services', roles: ['admin', 'auditor'] },
  { label: 'Logs', icon: ScrollText, path: '/audit-logs', roles: ['admin'] },
  { label: 'Usuarios', icon: Users, path: '/users', roles: ['admin'] },
  { label: 'Relatorios', icon: BarChart3, path: '/reports', roles: ['cliente'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  auditor: 'Auditor',
  cliente: 'Cliente',
};

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: 'bg-teal-600 text-white',
  auditor: 'bg-amber-500 text-white',
  cliente: 'bg-slate-600 text-white',
};

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = profile?.role ?? 'cliente';

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 rounded-lg bg-teal-600/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <span className="text-lg font-bold tracking-tight">Maturidade TI</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        {profile && (
          <div className="px-4 py-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-slate-200">
                  {profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {profile.full_name}
                </p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${ROLE_BADGE_COLORS[role]}`}
                >
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            <span className="font-bold text-slate-900">Maturidade TI</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
