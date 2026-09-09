/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Box,
  Check,
  CirclePlay,
  Headphones,
  PackageCheck,
  Users,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { TrafficAttribution } from "@/components/traffic-attribution";

const ingredients = [
  "Cálcio",
  "Curcumina",
  "Magnésio",
  "MSM",
  "Vitamina C",
  "Condroitina",
  "Colágeno tipo II",
  "Manganês",
  "Vitamina K2",
  "Vitamina D3",
];

const included = [
  "Materiais oficiais de divulgação",
  "Manual comercial dentro da plataforma",
  "Acesso ao grupo exclusivo",
  "Treinamento e suporte comercial",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020b09] text-white">
      <TrafficAttribution />
      <header className="landing-header">
        <div className="landing-wrap flex h-[74px] items-center justify-between gap-6">
          <Link href="#top" aria-label="Início MIX10 PRO">
            <BrandLogo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-white/65 lg:flex">
            <Link className="hover:text-white" href="#programa">O programa</Link>
            <Link className="hover:text-white" href="#vsl">Apresentação</Link>
            <Link className="hover:text-white" href="#kits">Kits</Link>
            <Link className="hover:text-white" href="#estrutura">Estrutura</Link>
          </nav>
          <Link className="btn-outline-dark" href="/entrar">
            Acessar portal <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="hero-grid-bg overflow-hidden" id="top">
        <div className="landing-wrap grid min-h-[690px] items-center gap-12 py-16 lg:grid-cols-[1.06fr_.94fr] lg:py-20">
          <div className="relative z-10 max-w-[680px]">
            <span className="eyebrow-dark">Programa oficial de revendedores</span>
            <h1 className="mt-7 text-[clamp(3.25rem,7vw,6.3rem)] font-black leading-[.88] tracking-[-.065em]">
              Produto forte.
              <span className="block text-mint">Operação profissional.</span>
            </h1>
            <p className="mt-7 max-w-[590px] text-lg leading-8 text-white/65">
              Venda MIX10 PRO com estoque, materiais, treinamento e um portal
              próprio para pedidos, equipe e acompanhamento da sua revenda.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-mint" href="/entrar">
                Quero ser revendedor <ArrowRight size={18} />
              </Link>
              <Link className="btn-ghost-dark" href="#vsl">
                <CirclePlay size={18} /> Conhecer o programa
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55">
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-mint" /> KIT20 ou KIT30</span>
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-mint" /> Pagamento pelo Asaas</span>
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-mint" /> Acesso multiusuário</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[590px] lg:mr-[-40px]">
            <div className="absolute inset-8 rounded-full bg-[#2bd9b2]/15 blur-[90px]" />
            <div className="product-stage relative">
              <span className="absolute left-5 top-5 z-10 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-[.68rem] font-bold uppercase tracking-[.18em] text-white/70 backdrop-blur">
                30 cápsulas
              </span>
              <img
                src="/brand/mix10-product.webp"
                alt="Embalagem MIX10 PRO"
                className="relative z-[1] mx-auto h-auto w-[92%] object-contain drop-shadow-[0_34px_50px_rgba(0,0,0,.55)]"
              />
              <div className="absolute bottom-5 right-5 z-10 rounded-2xl border border-[#2bd9b2]/30 bg-[#03110e]/90 p-4 shadow-2xl backdrop-blur">
                <span className="block text-xs text-white/45">Kit inicial a partir de</span>
                <strong className="mt-1 block text-2xl">R$ 1.499,80</strong>
                <span className="mt-1 block text-xs font-semibold text-mint">20 caixas + estrutura comercial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.06] bg-[#061510] py-7">
        <div className="landing-wrap grid gap-4 text-sm text-white/60 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [PackageCheck, "Produto premium", "Apresentação de alto valor"],
            [Users, "Público crescente", "Mobilidade e qualidade de vida"],
            [Headphones, "Suporte comercial", "Acompanhamento da equipe"],
            [BarChart3, "Potencial recorrente", "Relacionamento e recompra"],
          ].map(([Icon, title, copy]) => {
            const ItemIcon = Icon as typeof Box;
            return (
              <div className="flex items-center gap-3" key={String(title)}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#2bd9b2]/10 text-mint"><ItemIcon size={20} /></span>
                <span><b className="block text-white">{String(title)}</b>{String(copy)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-section" id="vsl">
        <div className="landing-wrap grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <span className="eyebrow-dark">Apresentação em vídeo</span>
            <h2 className="landing-title mt-5">Conheça a oportunidade antes de começar.</h2>
            <p className="landing-copy mt-5">
              Este espaço já está preparado para receber a VSL oficial. O vídeo
              poderá explicar produto, programa, margem de referência e próximos
              passos sem alterar o restante da página.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <span className="feature-line"><BadgeCheck size={18} /> História e posicionamento</span>
              <span className="feature-line"><BookOpenCheck size={18} /> Como iniciar a revenda</span>
            </div>
          </div>
          <div className="vsl-placeholder" aria-label="Espaço reservado para vídeo VSL">
            <div className="vsl-scan" />
            <span className="grid h-20 w-20 place-items-center rounded-full border border-[#2bd9b2]/30 bg-[#2bd9b2]/10 text-mint">
              <CirclePlay size={36} />
            </span>
            <strong className="mt-5 text-xl">VSL MIX10 PRO</strong>
            <span className="mt-2 text-sm text-white/45">Vídeo será inserido aqui</span>
          </div>
        </div>
      </section>

      <section className="landing-section border-y border-white/[.06] bg-[#061510]" id="programa">
        <div className="landing-wrap">
          <div className="max-w-[760px]">
            <span className="eyebrow-dark">O que é o MIX10 PRO</span>
            <h2 className="landing-title mt-5">Uma fórmula completa, apresentada com responsabilidade.</h2>
            <p className="landing-copy mt-5">
              Suplemento alimentar em cápsulas com vitaminas, minerais e outros
              constituintes. Não contém glúten, não contém lactose e possui 30
              porções por embalagem. Nº ANVISA 20260000000803227.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ingredients.map((item, index) => (
              <div className="ingredient-card" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{item}</b>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-6 text-white/35">
            Comunicação comercial sem promessa terapêutica ou garantia de resultado.
            Consulte sempre o rótulo e as informações oficiais do produto.
          </p>
        </div>
      </section>

      <section className="landing-section" id="kits">
        <div className="landing-wrap">
          <div className="mx-auto max-w-[760px] text-center">
            <span className="eyebrow-dark">Kits para começar</span>
            <h2 className="landing-title mt-5">Escolha o estoque da sua operação.</h2>
            <p className="landing-copy mx-auto mt-5">
              Custo de R$ 74,99 por caixa e preço de venda de referência de
              R$ 109,90. Simulações matemáticas, sem garantia de faturamento.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[960px] gap-5 lg:grid-cols-2">
            {[
              { name: "KIT20", boxes: 20, price: "R$ 1.499,80", sales: "R$ 2.198,00", margin: "R$ 698,20", label: "Mais escolhido" },
              { name: "KIT30", boxes: 30, price: "R$ 2.249,70", sales: "R$ 3.297,00", margin: "R$ 1.047,30", label: "Mais estoque" },
            ].map((kit, index) => (
              <article className={`kit-card-dark ${index === 0 ? "featured" : ""}`} key={kit.name}>
                <div className="flex items-start justify-between gap-4">
                  <div><span className="text-xs font-black uppercase tracking-[.18em] text-mint">{kit.label}</span><h3 className="mt-3 text-4xl font-black">{kit.name}</h3></div>
                  <span className="rounded-full bg-white/[.06] px-3 py-2 text-xs text-white/60">{kit.boxes} caixas</span>
                </div>
                <div className="mt-8 border-y border-white/[.08] py-6"><span className="text-sm text-white/45">Investimento</span><strong className="mt-1 block text-4xl tracking-[-.04em]">{kit.price}</strong></div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm"><span className="text-white/45">Faturamento de referência<b className="mt-1 block text-base text-white">{kit.sales}</b></span><span className="text-white/45">Diferença bruta potencial<b className="mt-1 block text-base text-mint">{kit.margin}</b></span></div>
                <div className="mt-7 grid gap-3 text-sm text-white/65">{included.map((item) => <span className="flex items-center gap-2" key={item}><Check size={16} className="text-mint" />{item}</span>)}</div>
                <Link className="btn-mint mt-8 w-full" href="/entrar">Escolher {kit.name}<ArrowRight size={18} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section border-y border-white/[.06] bg-[#061510]" id="estrutura">
        <div className="landing-wrap grid items-center gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/[.08] bg-black/30 p-3">
            <img src="/manual/page-05.webp" alt="Treinamento comercial MIX10 PRO" className="w-full rounded-[1.25rem]" />
          </div>
          <div>
            <span className="eyebrow-dark">Estrutura do revendedor</span>
            <h2 className="landing-title mt-5">Tudo o que você precisa, no mesmo portal.</h2>
            <p className="landing-copy mt-5">A apresentação comercial completa vira um manual navegável. Sua equipe também acompanha pedidos, estoque, vendas e devoluções com acessos individuais.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                [BookOpenCheck, "Manual completo", "10 módulos visuais baseados no material oficial."],
                [Users, "Equipe multiusuário", "Proprietário, gerente e vendedor com acesso próprio."],
                [PackageCheck, "Pedidos e estoque", "Reposição com pagamento seguro pelo Asaas."],
                [BarChart3, "Fechamento", "Vendas, devoluções, saldo e números por período."],
              ].map(([Icon, title, copy]) => {
                const CardIcon = Icon as typeof Box;
                return <div className="structure-card" key={String(title)}><CardIcon size={21} /><b>{String(title)}</b><p>{String(copy)}</p></div>;
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-wrap">
          <div className="cta-panel">
            <div><span className="eyebrow-dark">Pronto para começar?</span><h2 className="mt-5 max-w-[720px] text-[clamp(2.4rem,5vw,4.5rem)] font-black leading-[.95] tracking-[-.055em]">Sua revenda começa com estrutura.</h2><p className="mt-5 max-w-[620px] text-white/60">Crie seu acesso, escolha o primeiro kit e acompanhe toda a operação no Portal MIX10 PRO.</p></div>
            <Link className="btn-mint shrink-0" href="/entrar">Criar meu acesso <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[.06] py-10">
        <div className="landing-wrap flex flex-col justify-between gap-6 text-sm text-white/40 md:flex-row md:items-center">
          <div><BrandLogo compact /><p className="mt-3">LORD GROUP NETWORK EPP · CNPJ 47.201.289/0001-70</p></div>
          <div className="flex flex-wrap gap-5"><a href="mailto:revendedor@lordnutri.com.br">revendedor@lordnutri.com.br</a><a href="https://wa.me/5511934924155">WhatsApp (11) 93492-4155</a></div>
        </div>
      </footer>
    </main>
  );
}
