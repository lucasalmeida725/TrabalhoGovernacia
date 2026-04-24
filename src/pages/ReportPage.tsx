import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Loader2,
  AlertTriangle,
  Download,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
  BarChart,
  Bar,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  getAssessment,
  getAssessmentResponses,
  getPillars,
  getAssessments,
  calculatePillarScores,
  getActionPlan,
} from '../lib/api';
import type {
  Assessment,
  AssessmentResponse,
  Pillar,
  PillarScore,
  ActionPlan,
} from '../lib/types';
import { calculateScore, getMaturityLevel, MATURITY_LEVELS } from '../lib/types';

export default function ReportPage() {
  const { id: assessmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [pillarScores, setPillarScores] = useState<PillarScore[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<
    (AssessmentResponse & { actionPlan?: ActionPlan | null })[]
  >([]);
  const [historicalData, setHistoricalData] = useState<
    { date: string; score: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!assessmentId) return;
    try {
      setLoading(true);
      setError(null);

      const [assessmentData, responsesData, pillarsData] = await Promise.all([
        getAssessment(assessmentId),
        getAssessmentResponses(assessmentId),
        getPillars(),
      ]);

      if (!assessmentData) {
        setError('Avaliacao nao encontrada.');
        return;
      }

      setAssessment(assessmentData);
      setResponses(responsesData);
      setPillars(pillarsData);

      // Calculate pillar scores
      const scores = calculatePillarScores(responsesData, pillarsData);
      setPillarScores(scores);

      // Identify vulnerabilities (nao_ok and parcial responses)
      const vulns = responsesData.filter(
        (r) => r.response === 'nao_ok' || r.response === 'parcial'
      );

      // Load action plans for vulnerabilities
      const vulnsWithPlans = await Promise.all(
        vulns.map(async (v) => {
          try {
            const plan = await getActionPlan(v.id);
            return { ...v, actionPlan: plan };
          } catch {
            return { ...v, actionPlan: null };
          }
        })
      );
      setVulnerabilities(vulnsWithPlans);

      // Load historical data for the company
      if (assessmentData.company_id) {
        try {
          const allAssessments = await getAssessments(assessmentData.company_id);
          const completed = allAssessments
            .filter((a) => a.status === 'completed' && a.overall_score != null)
            .sort(
              (a, b) =>
                new Date(a.completed_at || a.created_at).getTime() -
                new Date(b.completed_at || b.created_at).getTime()
            );
          setHistoricalData(
            completed.map((a) => ({
              date: new Date(a.completed_at || a.created_at).toLocaleDateString(
                'pt-BR',
                { month: 'short', year: '2-digit' }
              ),
              score: a.overall_score,
            }))
          );
        } catch {
          setHistoricalData([]);
        }
      }
    } catch {
      setError('Erro ao carregar relatorio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // PDF Export
  async function handleExportPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const companyName = assessment?.company?.name || 'empresa';
      pdf.save(`relatorio-${companyName}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  }

  // Overall score
  const overallScore = assessment?.overall_score ?? calculateScore(responses);
  const maturity = getMaturityLevel(overallScore);

  // Radar chart data
  const radarData = pillars.map((pillar) => {
    const score = pillarScores.find((s) => s.pillar_id === pillar.id);
    return {
      pillar: pillar.name,
      Atual: score?.percentage ?? 0,
      Desejado: 100,
    };
  });

  // Bar chart data for pillar scores
  const barData = pillarScores.map((ps) => ({
    name: ps.pillar_name,
    score: ps.percentage,
  }));

  // Response icon helper
  function ResponseIcon({ response }: { response: string }) {
    switch (response) {
      case 'ok':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'parcial':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'nao_ok':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <span className="text-xs text-slate-400">N/A</span>;
    }
  }

  const responseLabels: Record<string, string> = {
    ok: 'OK',
    parcial: 'Parcial',
    nao_ok: 'Nao OK',
    na: 'Nao se Aplica',
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-slate-500 text-lg">Carregando relatorio...</p>
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
            {error || 'Relatorio nao encontrado'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar (outside report ref) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div ref={reportRef} className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Report Header */}
          <div className="px-8 py-8 border-b border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">
                  Relatorio de Diagnostico de Maturidade de TI
                </h1>
                <p className="text-slate-500 text-sm">
                  Gerado em{' '}
                  {new Date().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Company Info */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                <Building2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Empresa</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {assessment.company?.name || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                <FileText className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Status da Avaliacao</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {assessment.status === 'completed' ? 'Concluida' : 'Em andamento'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Score + Maturity Level */}
          <div className="px-8 py-8 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Nota Geral e Nivel de Maturidade</h2>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Score Circle */}
              <div className="flex-shrink-0">
                <div
                  className="w-36 h-36 rounded-full flex items-center justify-center border-4"
                  style={{ borderColor: maturity.color }}
                >
                  <div className="text-center">
                    <p className="text-4xl font-bold" style={{ color: maturity.color }}>
                      {overallScore}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">score</p>
                  </div>
                </div>
              </div>

              {/* Maturity Level Details */}
              <div className="flex-1">
                <div className="mb-4">
                  <span
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: maturity.color + '20',
                      color: maturity.color,
                    }}
                  >
                    {maturity.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {MATURITY_LEVELS.map((level) => {
                    const isActive = level.label === maturity.label;
                    const isAchieved = overallScore >= level.min;
                    return (
                      <div key={level.label} className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            isAchieved ? '' : 'opacity-30'
                          }`}
                          style={{ backgroundColor: level.color }}
                        />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              backgroundColor: isAchieved ? level.color : '#e2e8f0',
                              width: isAchieved ? '100%' : `${((overallScore - level.min) / (level.max - level.min)) * 100}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs whitespace-nowrap ${
                            isActive ? 'font-semibold text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {level.min}-{level.max}% {level.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="px-8 py-8 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Scores por Pilar (Atual vs Desejado)</h2>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
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
              <p className="text-slate-500 text-sm">Dados insuficientes para o grafico radar.</p>
            )}
          </div>

          {/* Pillar Scores Breakdown Table */}
          <div className="px-8 py-8 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Detalhamento por Pilar</h2>
            {pillarScores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pilar
                      </th>
                      <th className="text-center py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pontuacao
                      </th>
                      <th className="text-center py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Maximo
                      </th>
                      <th className="text-center py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Percentual
                      </th>
                      <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">
                        Progresso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pillarScores.map((ps) => {
                      const level = getMaturityLevel(ps.percentage);
                      return (
                        <tr key={ps.pillar_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pr-4">
                            <span className="text-sm font-medium text-slate-900">
                              {ps.pillar_name}
                            </span>
                          </td>
                          <td className="py-3 text-center text-sm text-slate-700">
                            {ps.score}
                          </td>
                          <td className="py-3 text-center text-sm text-slate-500">
                            {ps.max_score}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className="text-sm font-semibold"
                              style={{ color: level.color }}
                            >
                              {ps.percentage}%
                            </span>
                          </td>
                          <td className="py-3 pl-4">
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${ps.percentage}%`,
                                  backgroundColor: level.color,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Nenhum dado de pilar disponivel.</p>
            )}
          </div>

          {/* Vulnerabilities (Nao OK + Parcial responses) */}
          <div className="px-8 py-8 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Vulnerabilidades Identificadas
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Questoes respondidas como "Nao OK" ou "Parcial" que representam gaps de maturidade.
            </p>
            {vulnerabilities.length > 0 ? (
              <div className="space-y-4">
                {vulnerabilities.map((v) => (
                  <div
                    key={v.id}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div
                      className={`px-4 py-3 flex items-start gap-3 ${
                        v.response === 'nao_ok'
                          ? 'bg-red-50 border-b border-red-100'
                          : 'bg-amber-50 border-b border-amber-100'
                      }`}
                    >
                      <ResponseIcon response={v.response} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                            {v.question?.code}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              v.response === 'nao_ok'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {responseLabels[v.response]}
                          </span>
                          <span className="text-xs text-slate-400">
                            {v.question?.pillar?.name}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900">
                          {v.question?.question_text}
                        </p>
                        {v.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            Obs: {v.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Plan for this vulnerability */}
                    {v.actionPlan && (
                      <div className="px-4 py-3 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                          Plano de Acao
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-xs text-slate-500">O Que:</span>{' '}
                            <span className="text-slate-800">{v.actionPlan.what || '--'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Por Que:</span>{' '}
                            <span className="text-slate-800">{v.actionPlan.why || '--'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Quem:</span>{' '}
                            <span className="text-slate-800">{v.actionPlan.who || '--'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Quando:</span>{' '}
                            <span className="text-slate-800">
                              {v.actionPlan.when_date
                                ? new Date(v.actionPlan.when_date).toLocaleDateString('pt-BR')
                                : '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Onde:</span>{' '}
                            <span className="text-slate-800">{v.actionPlan.where_text || '--'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Como:</span>{' '}
                            <span className="text-slate-800">{v.actionPlan.how || '--'}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-xs text-slate-500">Quanto:</span>{' '}
                            <span className="text-slate-800">{v.actionPlan.how_much || '--'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-300 mb-3" />
                <p className="text-slate-500 text-sm">
                  Nenhuma vulnerabilidade identificada. Todas as questoes foram respondidas como OK.
                </p>
              </div>
            )}
          </div>

          {/* Action Plan Matrix (5W2H) Compilation */}
          {vulnerabilities.some((v) => v.actionPlan) && (
            <div className="px-8 py-8 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                Matriz de Plano de Acao (5W2H)
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Compilacao de todos os planos de acao definidos para as vulnerabilidades.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Codigo
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        O Que
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Por Que
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Quem
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Quando
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Onde
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Como
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Quanto
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vulnerabilities
                      .filter((v) => v.actionPlan)
                      .map((v) => {
                        const plan = v.actionPlan!;
                        const statusLabels: Record<string, string> = {
                          pending: 'Pendente',
                          in_progress: 'Em andamento',
                          completed: 'Concluido',
                        };
                        const statusColors: Record<string, string> = {
                          pending: 'bg-slate-100 text-slate-700',
                          in_progress: 'bg-amber-100 text-amber-700',
                          completed: 'bg-emerald-100 text-emerald-700',
                        };
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono text-xs font-semibold text-teal-600">
                              {v.question?.code}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 max-w-[160px] truncate">
                              {plan.what || '--'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 max-w-[120px] truncate">
                              {plan.why || '--'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                              {plan.who || '--'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                              {plan.when_date
                                ? new Date(plan.when_date).toLocaleDateString('pt-BR')
                                : '--'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 max-w-[100px] truncate">
                              {plan.where_text || '--'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 max-w-[120px] truncate">
                              {plan.how || '--'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                              {plan.how_much || '--'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  statusColors[plan.status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {statusLabels[plan.status] || plan.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historical Comparison */}
          {historicalData.length >= 2 && (
            <div className="px-8 py-8 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                Comparacao Historica
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Evolucao da nota ao longo das avaliacoes realizadas para esta empresa.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart */}
                <ResponsiveContainer width="100%" height={280}>
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

                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#475569', fontSize: 11 }}
                      angle={-15}
                      textAnchor="end"
                      height={50}
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
                      formatter={(value) => [`${value}%`, 'Percentual']}
                    />
                    <Bar
                      dataKey="score"
                      name="Percentual"
                      fill="#0d9488"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-6 bg-slate-50 rounded-b-xl">
            <p className="text-xs text-slate-400 text-center">
             Relatorio gerado pela Plataforma de Diagnostico de Maturidade de TI &middot;{' '}
              {new Date().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
