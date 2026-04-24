import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, FileText, Calendar } from 'lucide-react';
import type { Database } from '../lib/database.types';
import AssessmentWizard from './AssessmentWizard';

type Assessment = Database['public']['Tables']['assessments']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

interface AssessmentWithCompany extends Assessment {
  company?: Company;
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentWithCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assessmentsRes, companiesRes] = await Promise.all([
        supabase
          .from('assessments')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('*')
          .order('name')
      ]);

      if (assessmentsRes.error) throw assessmentsRes.error;
      if (companiesRes.error) throw companiesRes.error;

      const companiesMap = new Map(companiesRes.data?.map(c => [c.id, c]) || []);
      const assessmentsWithCompany = assessmentsRes.data?.map(a => ({
        ...a,
        company: companiesMap.get(a.company_id),
      })) || [];

      setAssessments(assessmentsWithCompany);
      setCompanies(companiesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    if (!selectedCompanyId) {
      alert('Selecione uma empresa');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('assessments')
        .insert([{
          company_id: selectedCompanyId,
          auditor_id: userData.user.id,
          status: 'draft',
        }])
        .select()
        .single();

      if (error) throw error;
      setSelectedAssessment(data);
      setShowWizard(true);
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert('Erro ao criar avaliação');
    }
  };

  const handleOpenAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setShowWizard(true);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setSelectedAssessment(null);
    setSelectedCompanyId('');
    loadData();
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Concluída</span>;
    }
    return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Rascunho</span>;
  };

  const getClassificationBadge = (classification: string | null) => {
    if (!classification) return null;

    const colors: Record<string, string> = {
      'Nível Artesanal / Reativo': 'bg-red-100 text-red-700',
      'Nível Eficiente / Proativo': 'bg-yellow-100 text-yellow-700',
      'Nível Eficaz / Otimizado': 'bg-blue-100 text-blue-700',
      'Nível Estratégico': 'bg-green-100 text-green-700',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[classification] || 'bg-slate-100 text-slate-700'}`}>
        {classification}
      </span>
    );
  };

  if (showWizard && selectedAssessment) {
    return <AssessmentWizard assessment={selectedAssessment} onClose={handleCloseWizard} />;
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Avaliações</h1>
        <p className="text-slate-600 mt-1">Gerencie e realize avaliações de maturidade</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Nova Avaliação</h2>
        <div className="flex gap-4">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="">Selecione uma empresa...</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleStartAssessment}
            disabled={!selectedCompanyId}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Iniciar Avaliação
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Avaliações Existentes</h2>
        </div>

        {assessments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma avaliação encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleOpenAssessment(assessment)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-900">
                        {assessment.company?.name || 'Empresa não encontrada'}
                      </h3>
                      {getStatusBadge(assessment.status)}
                      {assessment.classification && getClassificationBadge(assessment.classification)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Iniciada em {new Date(assessment.started_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {assessment.completed_at && (
                        <div className="flex items-center gap-1">
                          <span>
                            Concluída em {new Date(assessment.completed_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {assessment.total_score !== null && (
                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-900">
                        {assessment.total_score.toFixed(1)}
                      </div>
                      <div className="text-sm text-slate-600">Pontuação</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
