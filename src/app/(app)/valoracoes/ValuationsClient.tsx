'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Plus,
  Tv,
  Layers,
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  AlertCircle,
  Package,
  Trash2,
} from 'lucide-react';
import { AuthenticatedUser } from '@/types';

interface ValuationsClientProps {
  initialValuations: any[];
  projects: any[];
  currentUser: AuthenticatedUser;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function ValuationsClient({
  initialValuations,
  projects,
  currentUser,
}: ValuationsClientProps) {
  const router = useRouter();
  const [valuations] = useState(initialValuations);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic Items
  const [items, setItems] = useState<any[]>([
    { product: 'Cota Master de Patrocínio', quantity: 1, unitValue: 150000, deliverables: '30 chamadas de 30s + 15 reels' },
    { product: 'Cota Apoio Comercial', quantity: 2, unitValue: 50000, deliverables: '15 chamadas de 30s + banner portal' },
  ]);

  const isManager = currentUser.roleKey === 'manager';

  const addItemRow = () => {
    setItems([...items, { product: '', quantity: 1, unitValue: 0, deliverables: '' }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItemRow = (index: number, field: string, val: any) => {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  };

  const calculatedTotal = items.reduce(
    (acc, curr) => acc + (parseFloat(curr.unitValue) || 0) * (parseInt(curr.quantity, 10) || 1),
    0
  );

  const handleCreateValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title,
          validFrom: validFrom || null,
          validTo: validTo || null,
          notes,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar valoração');

      setShowModal(false);
      setTitle('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200/80 rounded-xl shadow-xs">
        <div className="text-xs font-semibold text-slate-500">
          {valuations.length} valorações comerciais cadastradas
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Valoração Estruturada</span>
          </button>
        )}
      </div>

      {/* Valuations List */}
      <div className="space-y-3">
        {valuations.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-xs text-slate-400">
            Nenhuma valoração estruturada cadastrada no momento.
          </div>
        ) : (
          valuations.map((val) => {
            const isExpanded = expandedId === val.id;

            return (
              <div
                key={val.id}
                className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : val.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{val.title}</span>
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {val.project.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {val.items.length} cotas/produtos cadastrados
                        {val.validFrom && ` • Válido a partir de ${new Date(val.validFrom).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(val.totalValue)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Valor Total</span>
                  </div>
                </div>

                {/* Expanded Items Table (Seção 23) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Detalhamento das Cotas e Entregas (Seção 23)
                    </h4>
                    <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200/80 overflow-hidden">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                          <th className="py-2.5 px-3">Produto / Cota</th>
                          <th className="py-2.5 px-3 text-center">Qtd</th>
                          <th className="py-2.5 px-3">Valor Unitário</th>
                          <th className="py-2.5 px-3">Valor Total</th>
                          <th className="py-2.5 px-3">Entregas Comerciais</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {val.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{item.product}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                            <td className="py-2.5 px-3 font-mono">{formatCurrency(item.unitValue)}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {formatCurrency(item.totalValue)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs">{item.deliverables || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Nova Valoração */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Cadastrar Valoração Estruturada (Seção 23)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Defina as cotas, valores unitários e compromissos de entrega.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateValuation} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Projeto Relacionado *</label>
                  <select
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Título da Valoração *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Tabela de Cotas São João 2027"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Válido De</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Até</label>
                  <input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Items Rows */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-700">
                    Cotas & Produtos Estruturados
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Adicionar Linha
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        placeholder="Nome da Cota"
                        value={item.product}
                        onChange={(e) => updateItemRow(idx, 'product', e.target.value)}
                        className="col-span-4 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                        className="col-span-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center"
                      />
                      <input
                        type="number"
                        placeholder="Valor Unit (R$)"
                        value={item.unitValue}
                        onChange={(e) => updateItemRow(idx, 'unitValue', e.target.value)}
                        className="col-span-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Entregas (inserções, mídias...)"
                        value={item.deliverables}
                        onChange={(e) => updateItemRow(idx, 'deliverables', e.target.value)}
                        className="col-span-3 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="col-span-1 text-slate-400 hover:text-red-600 text-center"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 text-xs font-bold text-slate-800">
                  Total Calculado: {formatCurrency(calculatedTotal)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Valoração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
