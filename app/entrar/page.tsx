import Link from "next/link";
import { ArrowLeft, BookOpenCheck, LockKeyhole, Users } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#020b09] text-white lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="hero-grid-bg hidden min-h-screen flex-col justify-between p-12 lg:flex xl:p-16">
        <Link href="/"><BrandLogo /></Link>
        <div className="max-w-[620px]">
          <span className="eyebrow-dark">Portal do revendedor</span>
          <h1 className="mt-7 text-[clamp(3.5rem,6vw,6.5rem)] font-black leading-[.88] tracking-[-.065em]">
            Sua operação,
            <span className="block text-mint">em um só lugar.</span>
          </h1>
          <p className="mt-7 max-w-[540px] text-lg leading-8 text-white/55">
            Pedidos, estoque, vendas, devoluções, equipe e treinamento com
            acesso individual para cada pessoa da sua revenda.
          </p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <span className="feature-line"><Users size={18} /> Equipe multiusuário</span>
            <span className="feature-line"><BookOpenCheck size={18} /> Manual completo</span>
          </div>
        </div>
        <p className="text-xs text-white/30">Ambiente protegido · MIX10 PRO</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-[#edf4f1] px-5 py-12 text-[#09211b]">
        <div className="w-full max-w-[480px]">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <BrandLogo />
            <Link href="/" className="text-sm text-[#46655d]"><ArrowLeft size={16} className="inline" /> Voltar</Link>
          </div>
          <div className="rounded-[1.75rem] border border-[#d7e2de] bg-white p-6 shadow-[0_28px_80px_rgba(13,52,42,.10)] sm:p-9">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dff8f1] text-[#08705c]"><LockKeyhole size={22} /></span>
            <h2 className="mt-6 text-3xl font-black tracking-[-.04em]">Entre ou crie seu acesso</h2>
            <p className="mt-3 text-sm leading-6 text-[#60766f]">
              Informe seu e-mail. Você receberá um código de 6 dígitos para
              entrar sem senha.
            </p>
            <LoginForm />
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-[#72847f]">
            Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.
          </p>
        </div>
      </section>
    </main>
  );
}
