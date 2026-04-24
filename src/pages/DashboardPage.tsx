import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building2,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../lib/auth';
import {
  getAssessments,
  getAssessmentResponses,
  getPillars,
  getCompanies,
  calculatePillarScores,
} from '../lib/api';
import type { Assessment, Pillar, PillarScore, Company } from '../lib/types';
import { getMaturityLevel, MATURITY_LEVELS } from '../lib/types';

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdminOrAuditor = profile?.role === 'admin' || profile?.role === 'auditor';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [pillarScores, setPillarScores] = useState<PillarScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine which company to show
  const effectiveCompanyId = isAdminOrAuditor
    ? selectedCompanyId
    : profile?.company_id || '';

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [companiesData, pillarsData] = await Promise.all([
        isAdminOrAuditor ? getCompanies() : Promise.resolve([] as Company[]),
        getPillars(),
      ]);

      setCompanies(companiesData);
      setPillars(pillarsData);

      // For non-admin/auditor, auto-select their company
      if (!isAdminOrAuditor && profile?.company_id) {
        setSelectedCompanyId(profile.company_id);
      } else if (companiesData.length > 0) {
        setSelectedCompanyId(companiesData[0].id);
      }
    } catch {
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrAuditor, profile?.company_id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load assessments when company changes
  const loadAssessments = useCallback(async () => {
    if (!effectiveCompanyId) {
      setAssessments([]);
      setPillarScores([]);
      return;
    }
    try {
      const assessmentsData = await getAssessments(effectiveCompanyId);
      setAssessments(assessmentsData);

      // Calculate pillar scores from the latest completed assessment
      const completed = assessmentsData.filter((a) => a.status === 'completed');
      if (completed.length > 0) {
        const latest = completed[0]; // already sorted desc by created_at
        try {
          const responses = await getAssessmentResponses(latest.id);
          const scores = calculatePillarScores(responses, pillars);
          setPillarScores(scores);
        } catch {
          setPillarScores([]);
        }
      } else {
        setPillarScores([]);
      }
    } catch {
      setError('Erro ao carregar avaliacoes.');
    }
  }, [effectiveCompanyId, pillars]);

  useEffect(() => {
    if (pillars.length > 0) {
      loadAssessments();
    }
  }, [loadAssessments, pillars.length]);

  // KPIs
  const kpis = useMemo(() => {
    const relevant = effectiveCompanyId
      ? assessments
      : assessments;
    const total = relevant.length;
    const completed = relevant.filter((a) => a.status === 'completed').length;
    const inProgress = relevant.filter(
      (a) => a.status === 'draft' || a.status === 'in_progress'
    ).length;
    const completedScores = relevant
      .filter((a) => a.status === 'completed' && a.overall_score != null);
    const avgScore =
      completedScores.length > 0
        ? Math.round(
            completedScores.reduce((s, a) => s + a.overall_score, 0) /
              completedScores.length
          )
        : 0;

    return { total, completed, inProgress, avgScore };
  }, [assessments, effectiveCompanyId]);

  // Radar chart data
  const radarData = useMemo(() => {
    return pillars.map((pillar) => {
      const score = pillarScores.find((s) => s.pillar_id === pillar.id);
      return {
        pillar: pillar.name,
        Atual: score?.percentage ?? 0,
        Desejado: 100,
      };
    });
  }, [pillars, pillarScores]);

  // Historical data for line chart
  const historicalData = useMemo(() => {
    const completed = assessments
      .filter((a) => a.status === 'completed' && a.overall_score != null)
      .sort((a, b) => new Date(a.completed_at || a.created_at).getTime() - new Date(b.completed_at || b.created_at).getTime());

    return completed.map((a) => ({
      date: new Date(a.completed_at || a.created_at).toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      }),
      score: a.overall_score,
      name: a.company?.name || '',
    }));
  }, [assessments]);

  // Latest maturity level
  const latestMaturity = useMemo(() => {
    const completed = assessments
      .filter((a) => a.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
    if (completed.length > 0) {
      return getMaturityLevel(completed[0].overall_score);
    }
    // Calculate from pillar scores if available
    if (pillarScores.length > 0) {
      const avgPercent = Math.round(
        pillarScores.reduce((s, p) => s + p.percentage, 0) / pillarScores.length
      );
      return getMaturityLevel(avgPercent);
    }
    return null;
  }, [assessments, pillarScores]);

  // Recent assessments (last 5)
  const recentAssessments = useMemo(() => {
    return assessments.slice(0, 5);
  }, [assessments]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-slate-500 text-lg">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-slate-700 text-lg font-medium mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    in_progress: 'Em Andamento',
    completed: 'Concluida',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/10 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Visao geral da maturidade de TI
          </p>
        </div>

        {/* Company Selector (admin/auditor only) */}
        {isAdminOrAuditor && companies.length > 0 && (
          <div className="mb-6">
            <div className="relative inline-block w-full max-w-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <Building2 className="w-4 h-4 text-teal-600" />
                <label className="text-sm font-medium text-slate-700">Empresa</label>
              </div>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none pr-10"
              >
                <option value="">Todas as empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Total Avaliacoes</span>
              <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.total}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Concluidas</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-600/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.completed}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Em Andamento</span>
              <div className="w-9 h-9 rounded-lg bg-amber-600/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.inProgress}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">Nota Media</span>
              <div className="w-9 h-9 rounded-lg bg-teal-600/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{kpis.avgScore}%</p>
          </div>
        </div>

        {/* Maturity Level + Radar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Maturity Level Indicator */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nivel de Maturidade</h2>
            {latestMaturity ? (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center border-4"
                    style={{ borderColor: latestMaturity.color }}
                  >
                    <div className="text-center">
                      <p className="text-3xl font-bold" style={{ color: latestMaturity.color }}>
                        {kpis.avgScore || latestMaturity.min}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">score</p>
                    </div>
                  </div>
                </div>
                <div className="text-center mb-4">
                  <span
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: latestMaturity.color + '20',
                      color: latestMaturity.color,
                    }}
                  >
                    {latestMaturity.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {MATURITY_LEVELS.map((level) => {
                    const isActive = level.label === latestMaturity.label;
                    return (
                      <div
                        key={level.label}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                          isActive ? 'bg-slate-50' : ''
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: level.color }}
                        />
                        <span
                          className={`text-sm flex-1 ${
                            isActive ? 'font-semibold text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          {level.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {level.min}-{level.max}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">Nenhuma avaliacao concluida</p>
              </div>
            )}
          </div>

          {/* Radar Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Scores por Pilar</h2>
            {radarData.length > 0 && pillarScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="pillar"
                    tick={{ fill: '#475569', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickCount={6}
                  />
                  <Radar
                    name="Atual"
                    dataKey="Atual"
                    stroke="#0d9488"
                    fill="#0d9488"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Desejado"
                    dataKey="Desejado"
                    stroke="#94a3b8"
                    fill="#94a3b8"
                    fillOpacity={0.05}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px]">
                <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">
                  Selecione uma empresa com avaliacoes concluidas
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Historical Evolution + Recent Assessments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Historical Evolution Line Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Evolucao Historica</h2>
            {historicalData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#475569', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value) => [`${value}%`, 'Nota']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Nota"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 5, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, fill: '#0d9488' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">
                  {historicalData.length === 1
                    ? 'Necessario pelo menos 2 avaliacoes concluidas'
                    : 'Nenhuma avaliacao concluida para esta empresa'}
                </p>
              </div>
            )}
          </div>

          {/* Recent Assessments Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Avaliacoes Recentes</h2>
            {recentAssessments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Nota
                      </th>
                      <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentAssessments.map((assessment) => (
                      <tr
                        key={assessment.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-teal-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-900 truncate max-w-[140px]">
                              {assessment.company?.name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[assessment.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {statusLabels[assessment.status] || assessment.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {assessment.status === 'completed' ? (
                            <span className="text-sm font-semibold text-slate-900">
                              {assessment.overall_score}%
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              if (assessment.status === 'completed') {
                                navigate(`/reports/${assessment.id}`);
                              } else {
                                navigate(`/assessments/${assessment.id}`);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px]">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">
                  Nenhuma avaliacao encontrada
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
