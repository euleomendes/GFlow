import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  category: string;
  description: string;
  phase: string;
}

export default function ModulePlaceholder({
  title,
  category,
  description,
  phase,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg text-deep-space/60 hover:text-ink-black hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-slate">
            {category}
          </span>
          <h1 className="text-xl font-bold tracking-tight text-ink-black">
            {title}
          </h1>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-blue-slate/10 text-blue-slate flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-deep-space text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-dusty-denim" />
          <span>Próxima Etapa: {phase}</span>
        </div>
        <h2 className="text-base font-bold text-ink-black mb-2">
          Estrutura e Banco de Dados Prontos
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          {description}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 bg-ink-black hover:bg-deep-space text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
        >
          Voltar para o Dashboard
        </Link>
      </div>
    </div>
  );
}
