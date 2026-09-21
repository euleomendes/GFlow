'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }

      const from = searchParams.get('from') || '/dashboard';
      router.push(from);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-slate-50 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-black tracking-wider text-xl shadow-sm mb-3">
            GF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            GFLOW
          </h1>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">
            TV Guararapes • Gestão Comercial e CRM
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-3.5 bg-red-50/80 border border-red-200/80 rounded-xl flex items-center gap-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@tvguararapes.com.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      'Para redefinir sua senha, solicite ao Gerente/Administrador do sistema.'
                    )
                  }
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Helpers */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3 text-center">
              Acesso rápido para testes de homologação:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  fillCredentials('admin@tvguararapes.com.br', 'admin123')
                }
                className="px-3 py-2 text-left border border-slate-200 hover:border-blue-300 bg-slate-50/80 hover:bg-blue-50/40 rounded-xl transition-colors"
              >
                <div className="text-[11px] font-bold text-slate-800">
                  Gerente / Admin
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  admin@tvguararapes...
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  fillCredentials('joao.silva@tvguararapes.com.br', 'exec123')
                }
                className="px-3 py-2 text-left border border-slate-200 hover:border-blue-300 bg-slate-50/80 hover:bg-blue-50/40 rounded-xl transition-colors"
              >
                <div className="text-[11px] font-bold text-slate-800">
                  Executivo Comercial
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  joao.silva@tvguara...
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-slate-600" />
          <span>Autenticação corporativa com sessão protegida</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Carregando GFlow...</div>}>
      <LoginForm />
    </Suspense>
  );
}
