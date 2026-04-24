import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, CreditCard as Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Question = Database['public']['Tables']['questions']['Row'];
type Pillar = Database['public']['Tables']['pillars']['Row'];

interface QuestionWithPillar extends Question {
  pillar?: Pillar;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithPillar[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    pillar_id: '',
    question_text: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [questionsRes, pillarsRes] = await Promise.all([
        supabase
          .from('questions')
          .select('*')
          .order('display_order'),
        supabase
          .from('pillars')
          .select('*')
          .order('display_order')
      ]);

      if (questionsRes.error) throw questionsRes.error;
      if (pillarsRes.error) throw pillarsRes.error;

      setPillars(pillarsRes.data || []);
      setQuestions(questionsRes.data || []);

      if (pillarsRes.data && pillarsRes.data.length > 0) {
        setExpandedPillars(new Set(pillarsRes.data.map(p => p.id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('questions')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingQuestion(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Erro ao salvar questão');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Erro ao excluir questão');
    }
  };

  const resetForm = () => {
    setFormData({
      pillar_id: pillars[0]?.id || '',
      question_text: '',
      display_order: 0,
      is_active: true,
    });
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      pillar_id: question.pillar_id,
      question_text: question.question_text,
      display_order: question.display_order,
      is_active: question.is_active,
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingQuestion(null);
    resetForm();
    setShowModal(true);
  };

  const togglePillar = (pillarId: string) => {
    const newExpanded = new Set(expandedPillars);
    if (newExpanded.has(pillarId)) {
      newExpanded.delete(pillarId);
    } else {
      newExpanded.add(pillarId);
    }
    setExpandedPillars(newExpanded);
  };

  const questionsByPillar = pillars.map(pillar => ({
    pillar,
    questions: questions.filter(q => q.pillar_id === pillar.id),
  }));

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Questões do Diagnóstico</h1>
          <p className="text-slate-600 mt-1">Gerencie as perguntas de avaliação</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Questão
        </button>
      </div>

      <div className="space-y-4">
        {questionsByPillar.map(({ pillar, questions: pillarQuestions }) => (
          <div key={pillar.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => togglePillar(pillar.id)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedPillars.has(pillar.id) ? (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                )}
                <div className="text-left">
                  <h3 className="font-bold text-slate-900">{pillar.name}</h3>
                  <p className="text-sm text-slate-600">{pillar.description}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {pillarQuestions.length} questões
              </span>
            </button>

            {expandedPillars.has(pillar.id) && (
              <div className="border-t border-slate-200">
                {pillarQuestions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    Nenhuma questão cadastrada neste pilar
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {pillarQuestions.map((question, index) => (
                      <div key={question.id} className="p-4 hover:bg-slate-50 flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-medium text-slate-700">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900">{question.question_text}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {!question.is_active && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                Inativa
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(question)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(question.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingQuestion ? 'Editar Questão' : 'Nova Questão'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pilar *
                </label>
                <select
                  value={formData.pillar_id}
                  onChange={(e) => setFormData({ ...formData, pillar_id: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um pilar</option>
                  {pillars.map((pillar) => (
                    <option key={pillar.id} value={pillar.id}>
                      {pillar.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Texto da Questão *
                </label>
                <textarea
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">Questão Ativa</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingQuestion(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {editingQuestion ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
