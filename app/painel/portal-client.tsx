/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type View = "overview" | "orders" | "movements" | "manual" | "team" | "admin";

type Organization = {
  id: string;
  legalName: string;
  tradeName: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  status: string;
  createdAt: string;
};

type Session = {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    systemRole: "member" | "admin";
    onboardingStatus: "profile" | "complete";
  };
  membership: null | {
    id: number;
    role: "owner" | "manager" | "seller";
    organization: Organization;
  };
};

type Order = {
  id: string;
  orderNumber: string;
  kit: "kit20" | "kit30";
  boxes: number;
  totalCents: number;
  status: string;
  billingType: string;
  asaasInvoiceUrl?: string | null;
  trackingCode?: string | null;
  createdAt: string;
};

type Movement = {
  id: string;
  organizationId: string;
  type: "sale" | "return" | "adjustment_in" | "adjustment_out";
  boxes: number;
  unitValueCents: number;
  totalValueCents: number;
  channel: string;
  reference: string;
  notes: string;
  occurredAt: string;
  recordedBy?: string;
  organizationName?: string;
};

type MovementSummary = {
  received: number;
  sold: number;
  returned: number;
  stock: number;
  revenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
};

type TeamData = {
  members: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    role: string;
    joinedAt: string;
  }>;
  invitations: Array<{ id: string; email: string; role: string; expiresAt: string }>;
};

type AdminOrder = Order & {
  organizationId: string;
  organizationName: string;
  buyerName: string;
  buyerEmail: string;
};

type AdminData = {
  orders: AdminOrder[];
  organizations: Organization[];
  members: Array<{
    organizationId: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    status: string;
  }>;
  movements: Movement[];
};

const emptySummary: MovementSummary = {
  received: 0,
  sold: 0,
  returned: 0,
  stock: 0,
  revenueCents: 0,
  refundedCents: 0,
  netRevenueCents: 0,
};

const statusLabels: Record<string, string> = {
  payment_pending: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  payment_error: "Falha na cobrança",
};

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  store: "Loja física",
  referral: "Indicação",
  other: "Outro",
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function orderBadge(status: string) {
  if (["paid", "processing", "shipped", "delivered"].includes(status)) {
    return "border-[#bcebdc] bg-[#e3f8f1] text-[#08705c]";
  }
  if (["cancelled", "payment_error"].includes(status)) {
    return "border-[#f1c9c3] bg-[#fff0ee] text-[#9f3e31]";
  }
  return "border-[#efdca9] bg-[#fff8e5] text-[#8b6513]";
}

async function getJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Não foi possível carregar.");
  return data;
}

export function PortalClient() {
  const [view, setView] = useState<View>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [summary, setSummary] = useState<MovementSummary>(emptySummary);
  const [team, setTeam] = useState<TeamData>({ members: [], invitations: [] });
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manualPage, setManualPage] = useState(1);

  const loadWorkspace = useCallback(async (activeSession: Session) => {
    if (!activeSession.membership && activeSession.user.systemRole !== "admin") return;
    const tasks: Array<Promise<void>> = [];
    if (activeSession.membership) {
      tasks.push(
        getJson<{ orders: Order[] }>("/api/orders").then((data) => setOrders(data.orders)),
        getJson<{ movements: Movement[]; summary: MovementSummary }>("/api/movements").then((data) => {
          setMovements(data.movements);
          setSummary(data.summary);
        }),
        getJson<TeamData>("/api/team").then(setTeam),
        getJson<{ progress: { lastPage: number } }>("/api/manual/progress")
          .then((data) => setManualPage(data.progress.lastPage || 1))
          .catch(() => undefined),
      );
    }
    if (activeSession.user.systemRole === "admin") {
      tasks.push(getJson<AdminData>("/api/admin/overview").then(setAdmin));
    }
    await Promise.all(tasks);
  }, []);

  const initialize = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await response.json()) as Session;
      if (!response.ok || !data.authenticated) {
        window.location.replace("/entrar");
        return;
      }
      setSession(data);
      if (data.user.systemRole === "admin" && !data.membership) setView("admin");
      await loadWorkspace(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao carregar o portal.");
    } finally {
      setLoading(false);
    }
  }, [loadWorkspace]);

  useEffect(() => {
    const timer = window.setTimeout(() => void initialize(), 0);
    return () => window.clearTimeout(timer);
  }, [initialize]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/entrar");
  }

  const navigation = useMemo(() => {
    const items: Array<[View, string, typeof LayoutDashboard]> = [
      ["overview", "Visão geral", LayoutDashboard],
      ["orders", "Pedidos", ShoppingBag],
      ["movements", "Vendas e devoluções", BadgeDollarSign],
      ["manual", "Manual de vendas", BookOpenCheck],
      ["team", "Minha equipe", Users],
    ];
    if (session?.user.systemRole === "admin") {
      items.push(["admin", "Administrativo", ShieldCheck]);
    }
    return items;
  }, [session?.user.systemRole]);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#061510] text-white">
        <div className="text-center"><LoaderCircle className="mx-auto animate-spin text-[#2bd9b2]" size={34} /><p className="mt-4 text-sm text-white/55">Carregando sua operação...</p></div>
      </main>
    );
  }

  const organization = session.membership?.organization ?? null;

  return (
    <main className="min-h-screen bg-[#edf3f1] text-[#0b2821] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className={`portal-sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="flex items-center justify-between px-5 pt-5">
          <BrandLogo compact />
          <button className="text-white/50 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><X size={20} /></button>
        </div>
        <div className="mx-4 mt-7 rounded-2xl border border-white/[.08] bg-white/[.04] p-4">
          <span className="text-[.67rem] font-black uppercase tracking-[.16em] text-[#73efd4]">Revenda ativa</span>
          <strong className="mt-2 block truncate text-sm text-white">{organization?.tradeName ?? "Administração MIX10"}</strong>
          <span className="mt-1 block truncate text-xs text-white/40">{session.user.email}</span>
        </div>
        <nav className="mt-7 grid gap-1 px-3">
          {navigation.map(([id, label, Icon]) => (
            <button key={id} className={`portal-nav-item ${view === id ? "active" : ""}`} onClick={() => { setView(id); setMobileMenu(false); }}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <button className="portal-nav-item w-full" onClick={logout}><LogOut size={18} /> Sair do portal</button>
        </div>
      </aside>
      {mobileMenu && <button className="fixed inset-0 z-30 bg-black/45 lg:hidden" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}

      <section className="min-w-0">
        <header className="portal-topbar">
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7e2de] bg-white lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu size={19} /></button>
          <div className="relative hidden max-w-[460px] flex-1 md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#759088]" size={17} />
            <input className="h-11 w-full rounded-2xl border border-[#d7e2de] bg-[#f7faf9] pl-11 pr-4 text-sm outline-none focus:border-[#36b89b]" placeholder="Buscar pedido, kit ou informação" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {organization && <Badge className="hidden border-[#c8e9df] bg-[#e4f8f2] text-[#08705c] sm:inline-flex" variant="outline">{session.membership?.role === "owner" ? "Proprietário" : session.membership?.role === "manager" ? "Gerente" : "Vendedor"}</Badge>}
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#09211b] text-xs font-black text-[#73efd4]">{session.user.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {error && <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#eccbc5] bg-[#fff2ef] p-4 text-sm text-[#963f33]"><span>{error}</span><Button size="sm" variant="outline" onClick={initialize}><RefreshCcw /> Tentar novamente</Button></div>}
          {view === "overview" && <Overview session={session} orders={orders} summary={summary} onOrder={() => setOrderOpen(true)} onMovement={() => setMovementOpen(true)} setView={setView} />}
          {view === "orders" && <OrdersView orders={orders} onNew={() => setOrderOpen(true)} />}
          {view === "movements" && <MovementsView movements={movements} summary={summary} onNew={() => setMovementOpen(true)} />}
          {view === "manual" && <ManualView page={manualPage} setPage={setManualPage} />}
          {view === "team" && <TeamView team={team} role={session.membership?.role ?? null} onInvite={() => setInviteOpen(true)} onRefresh={() => loadWorkspace(session)} />}
          {view === "admin" && admin && <AdminView data={admin} onRefresh={() => loadWorkspace(session)} />}
        </div>
      </section>

      <OnboardingDialog open={!organization && session.user.systemRole !== "admin"} onComplete={initialize} email={session.user.email} />
      {organization && <OrderDialog open={orderOpen} setOpen={setOrderOpen} organization={organization} onComplete={() => loadWorkspace(session)} />}
      {organization && <MovementDialog open={movementOpen} setOpen={setMovementOpen} canAdjust={session.membership?.role !== "seller"} onComplete={() => loadWorkspace(session)} />}
      {organization && <InviteDialog open={inviteOpen} setOpen={setInviteOpen} onComplete={() => loadWorkspace(session)} />}
    </main>
  );
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="text-[.69rem] font-black uppercase tracking-[.18em] text-[#16896f]">{eyebrow}</span><h1 className="mt-2 text-3xl font-black tracking-[-.045em] sm:text-4xl">{title}</h1>{copy && <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#60766f]">{copy}</p>}</div>{action}</div>;
}

function MetricCard({ label, value, detail, icon: Icon, tone = "green" }: { label: string; value: string; detail: string; icon: typeof Box; tone?: "green" | "dark" | "amber" | "rose" }) {
  const tones = { green: "bg-[#e1f7f0] text-[#08705c]", dark: "bg-[#e5ece9] text-[#163c32]", amber: "bg-[#fff3d7] text-[#8c6512]", rose: "bg-[#ffebe8] text-[#a04739]" };
  return <article className="portal-card p-5"><div className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon size={20} /></div><strong className="mt-7 block text-3xl font-black tracking-[-.045em]">{value}</strong><span className="mt-1 block text-sm font-bold">{label}</span><span className="mt-1 block text-xs text-[#71847e]">{detail}</span></article>;
}

function Overview({ session, orders, summary, onOrder, onMovement, setView }: { session: Session; orders: Order[]; summary: MovementSummary; onOrder: () => void; onMovement: () => void; setView: (view: View) => void }) {
  const pending = orders.filter((order) => ["payment_pending", "paid", "processing", "shipped"].includes(order.status)).length;
  return <>
    <section className="overview-hero">
      <div className="relative z-10 max-w-[760px]"><span className="inline-flex rounded-full border border-[#64e8c9]/20 bg-[#2bd9b2]/10 px-3 py-2 text-[.68rem] font-black uppercase tracking-[.16em] text-[#73efd4]">Central da revenda</span><h1 className="mt-5 text-[clamp(2.4rem,5vw,4.7rem)] font-black leading-[.92] tracking-[-.06em] text-white">Olá, {session.user.name.split(" ")[0]}.<span className="block text-[#73efd4]">Vamos movimentar seu estoque?</span></h1><p className="mt-5 max-w-[620px] text-sm leading-7 text-white/55">Registre as vendas do dia, acompanhe as devoluções e faça um novo pedido quando precisar repor.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button className="h-11 rounded-xl bg-[#2bd9b2] px-5 font-bold text-[#03110e] hover:bg-[#73efd4]" onClick={onOrder}><ShoppingBag /> Novo pedido</Button><Button className="h-11 rounded-xl border-white/15 bg-white/[.06] px-5 text-white hover:bg-white/[.1]" variant="outline" onClick={onMovement}><Plus /> Registrar venda</Button></div></div>
      <div className="relative hidden min-h-[300px] lg:block"><div className="absolute inset-y-[-70px] right-[-35px] w-[420px] rounded-full bg-[#2bd9b2]/10 blur-[70px]" /><img src="/brand/mix10-product.webp" alt="MIX10 PRO" className="absolute bottom-[-60px] right-[-25px] w-[390px] drop-shadow-[0_30px_38px_rgba(0,0,0,.5)]" /></div>
    </section>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Box} value={String(summary.stock)} label="Caixas em estoque" detail={`${summary.received} recebidas`} /><MetricCard icon={TrendingUp} value={String(summary.sold)} label="Caixas vendidas" detail={money(summary.revenueCents)} /><MetricCard icon={RotateCcw} value={String(summary.returned)} label="Devoluções" detail={money(summary.refundedCents)} tone="rose" /><MetricCard icon={ClipboardList} value={String(pending)} label="Pedidos em andamento" detail={`${orders.length} no histórico`} tone="amber" /></div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <section className="portal-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><span className="section-kicker">Pedidos recentes</span><h2 className="mt-2 text-xl font-black">Reposições da sua revenda</h2></div><button className="text-sm font-bold text-[#08705c]" onClick={() => setView("orders")}>Ver todos</button></div><div className="mt-5 grid gap-3">{orders.slice(0, 4).map((order) => <OrderRow key={order.id} order={order} />)}{orders.length === 0 && <EmptyState icon={ShoppingBag} title="Nenhum pedido ainda" copy="Seu primeiro pedido aparecerá aqui." action={<Button size="sm" onClick={onOrder}><Plus /> Fazer pedido</Button>} />}</div></section>
      <section className="portal-card overflow-hidden"><div className="bg-[#061510] p-6 text-white"><span className="section-kicker !text-[#73efd4]">Manual comercial</span><h2 className="mt-2 text-2xl font-black">Argumentos para vender com clareza.</h2><p className="mt-3 text-sm leading-6 text-white/50">Produto, abordagem, objeções e fidelização em 10 módulos visuais.</p><Button className="mt-6 rounded-xl bg-[#2bd9b2] text-[#03110e] hover:bg-[#73efd4]" onClick={() => setView("manual")}><BookOpenCheck /> Abrir manual</Button></div><img src="/manual/page-09.webp" alt="Manual de objeções MIX10 PRO" className="aspect-[16/8] w-full object-cover object-top" /></section>
    </div>
  </>;
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: typeof Box; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="grid min-h-[210px] place-items-center rounded-2xl border border-dashed border-[#cadad5] bg-[#f7faf9] p-6 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f3ef] text-[#16896f]"><Icon size={21} /></span><b className="mt-4 block">{title}</b><p className="mt-1 text-sm text-[#71847e]">{copy}</p>{action && <div className="mt-4">{action}</div>}</div></div>;
}

function OrderRow({ order }: { order: Order }) {
  return <div className="grid gap-3 rounded-2xl border border-[#dbe5e2] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><b className="text-sm">{order.orderNumber}</b><span className="mt-1 block text-xs text-[#71847e]">{order.kit.toUpperCase()} · {order.boxes} caixas · {shortDate(order.createdAt)}</span></div><span className={`w-fit rounded-full border px-2.5 py-1 text-[.68rem] font-bold ${orderBadge(order.status)}`}>{statusLabels[order.status] ?? order.status}</span><strong className="text-sm">{money(order.totalCents)}</strong></div>;
}

function OrdersView({ orders, onNew }: { orders: Order[]; onNew: () => void }) {
  return <><SectionHeading eyebrow="Reposição de estoque" title="Meus pedidos" copy="Acompanhe pagamento, separação, envio e entrega de cada kit." action={<Button className="h-11 rounded-xl bg-[#08705c] px-5 hover:bg-[#065d4d]" onClick={onNew}><Plus /> Novo pedido</Button>} /><section className="portal-card overflow-hidden"><div className="hidden grid-cols-[1.1fr_.7fr_.7fr_.7fr_.8fr] gap-4 border-b border-[#e1e9e6] bg-[#f7faf9] px-6 py-4 text-[.68rem] font-black uppercase tracking-[.13em] text-[#71847e] md:grid"><span>Pedido</span><span>Kit</span><span>Data</span><span>Valor</span><span>Status</span></div><div className="divide-y divide-[#e1e9e6]">{orders.map((order) => <div key={order.id} className="grid gap-3 px-5 py-5 md:grid-cols-[1.1fr_.7fr_.7fr_.7fr_.8fr] md:items-center md:px-6"><b className="text-sm">{order.orderNumber}</b><span className="text-sm">{order.kit.toUpperCase()} · {order.boxes}</span><span className="text-sm text-[#6e817b]">{shortDate(order.createdAt)}</span><strong className="text-sm">{money(order.totalCents)}</strong><span className={`w-fit rounded-full border px-2.5 py-1 text-[.68rem] font-bold ${orderBadge(order.status)}`}>{statusLabels[order.status] ?? order.status}</span>{order.trackingCode && <p className="md:col-start-2 md:col-end-6 text-xs text-[#60766f]">Rastreio: <b>{order.trackingCode}</b></p>}</div>)}{orders.length === 0 && <div className="p-5"><EmptyState icon={ShoppingBag} title="Nenhum pedido registrado" copy="Escolha seu primeiro kit para começar." action={<Button size="sm" onClick={onNew}><Plus /> Novo pedido</Button>} /></div>}</div></section></>;
}

function MovementsView({ movements, summary, onNew }: { movements: Movement[]; summary: MovementSummary; onNew: () => void }) {
  return <><SectionHeading eyebrow="Controle da operação" title="Vendas e devoluções" copy="Registre cada movimentação para manter estoque e fechamento sempre atualizados." action={<Button className="h-11 rounded-xl bg-[#08705c] px-5 hover:bg-[#065d4d]" onClick={onNew}><Plus /> Registrar movimentação</Button>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Box} value={String(summary.stock)} label="Saldo em estoque" detail={`${summary.received} caixas recebidas`} /><MetricCard icon={TrendingUp} value={String(summary.sold)} label="Vendas" detail={money(summary.revenueCents)} /><MetricCard icon={RotateCcw} value={String(summary.returned)} label="Devoluções" detail={money(summary.refundedCents)} tone="rose" /><MetricCard icon={CircleDollarSign} value={money(summary.netRevenueCents)} label="Resultado líquido" detail="Vendas menos devoluções" tone="dark" /></div><section className="portal-card mt-6 overflow-hidden"><div className="flex items-center justify-between border-b border-[#e1e9e6] p-5 sm:p-6"><div><span className="section-kicker">Histórico</span><h2 className="mt-1 text-xl font-black">Movimentações recentes</h2></div></div><div className="divide-y divide-[#e1e9e6]">{movements.map((movement) => <div className="grid gap-3 px-5 py-4 md:grid-cols-[.65fr_.65fr_.8fr_1fr_.7fr] md:items-center md:px-6" key={movement.id}><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${movement.type === "sale" ? "bg-[#e1f7f0] text-[#08705c]" : movement.type === "return" ? "bg-[#ffebe8] text-[#9f3e31]" : "bg-[#e9efed] text-[#536a64]"}`}>{movement.type === "sale" ? "Venda" : movement.type === "return" ? "Devolução" : "Ajuste"}</span><b className="text-sm">{movement.boxes} caixa(s)</b><span className="text-sm text-[#60766f]">{channelLabels[movement.channel] ?? movement.channel}</span><span className="text-sm">{movement.reference || "Sem referência"}</span><div className="md:text-right"><b className="block text-sm">{money(movement.totalValueCents)}</b><span className="text-xs text-[#71847e]">{shortDate(movement.occurredAt)}</span></div></div>)}{movements.length === 0 && <div className="p-5"><EmptyState icon={BadgeDollarSign} title="Nenhuma movimentação" copy="Registre a primeira venda da sua revenda." action={<Button size="sm" onClick={onNew}><Plus /> Registrar venda</Button>} /></div>}</div></section></>;
}

function ManualView({ page, setPage }: { page: number; setPage: (page: number) => void }) {
  const titles = ["Visão geral", "Oportunidade de mercado", "O que é MIX10 PRO", "Detalhes da fórmula", "Como abordar", "Como atender", "Fidelização e recompra", "Normas de comunicação", "Objeções e respostas", "Próximos passos"];
  async function changePage(next: number) {
    const safe = Math.max(1, Math.min(10, next));
    setPage(safe);
    await fetch("/api/manual/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page: safe, complete: safe === 10 }) }).catch(() => undefined);
  }
  return <><SectionHeading eyebrow="Treinamento oficial" title="Manual do revendedor" copy="Todo o conteúdo da apresentação comercial, organizado para consultar durante o atendimento." action={<a href="/manual/MIX10-PRO-Manual-do-Revendedor.pdf" download className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#cbdad6] bg-white px-4 text-sm font-bold"><Download size={17} /> Baixar manual em PDF</a>} /><div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)]"><aside className="portal-card max-h-[720px] overflow-auto p-3"><div className="px-2 pb-3"><span className="section-kicker">10 módulos</span></div>{titles.map((title, index) => <button key={title} onClick={() => changePage(index + 1)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${page === index + 1 ? "bg-[#09211b] font-bold text-white" : "text-[#526963] hover:bg-[#edf4f1]"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[.67rem] font-black ${page === index + 1 ? "bg-[#2bd9b2] text-[#032018]" : "bg-[#e4eeeb] text-[#58706a]"}`}>{String(index + 1).padStart(2, "0")}</span>{title}</button>)}</aside><section className="portal-card overflow-hidden bg-[#04110d] p-2 sm:p-4"><img src={`/manual/page-${String(page).padStart(2, "0")}.webp`} alt={`Módulo ${page}: ${titles[page - 1]}`} className="mx-auto w-full rounded-xl" /><div className="flex items-center justify-between gap-4 p-3 pb-1 text-white"><Button variant="outline" className="border-white/10 bg-white/[.05] text-white hover:bg-white/[.1]" disabled={page === 1} onClick={() => changePage(page - 1)}><ChevronLeft /> Anterior</Button><span className="text-xs text-white/45">{page} de 10</span><Button className="bg-[#2bd9b2] text-[#03110e] hover:bg-[#73efd4]" disabled={page === 10} onClick={() => changePage(page + 1)}>Próximo <ChevronRight /></Button></div></section></div></>;
}

function TeamView({ team, role, onInvite, onRefresh }: { team: TeamData; role: string | null; onInvite: () => void; onRefresh: () => Promise<void> }) {
  const canManage = role === "owner" || role === "manager";
  async function toggleMember(userId: string, status: string) {
    const response = await fetch("/api/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, status }) });
    if (response.ok) await onRefresh();
  }
  return <><SectionHeading eyebrow="Acessos individuais" title="Minha equipe" copy="Adicione gerentes e vendedores sem compartilhar senha. Cada pessoa entra com o próprio e-mail." action={canManage ? <Button className="h-11 rounded-xl bg-[#08705c] px-5 hover:bg-[#065d4d]" onClick={onInvite}><UserPlus /> Convidar usuário</Button> : undefined} /><section className="portal-card overflow-hidden"><div className="divide-y divide-[#e1e9e6]">{team.members.map((member) => <div key={member.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-6"><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e1f7f0] text-xs font-black text-[#08705c]">{member.name.slice(0, 2).toUpperCase()}</span><div><b className="text-sm">{member.name || member.email}</b><span className="mt-1 block text-xs text-[#71847e]">{member.email}</span></div></div><div className="flex items-center gap-3"><span className="rounded-full bg-[#edf4f1] px-3 py-1 text-xs font-bold text-[#536a64]">{member.role === "owner" ? "Proprietário" : member.role === "manager" ? "Gerente" : "Vendedor"}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${member.status === "active" ? "bg-[#e1f7f0] text-[#08705c]" : "bg-[#ffebe8] text-[#9f3e31]"}`}>{member.status === "active" ? "Ativo" : "Desativado"}</span>{role === "owner" && member.role !== "owner" && <button className="text-xs font-bold text-[#60766f]" onClick={() => toggleMember(member.id, member.status === "active" ? "disabled" : "active")}>{member.status === "active" ? "Desativar" : "Reativar"}</button>}</div></div>)}{team.members.length === 0 && <div className="p-5"><EmptyState icon={Users} title="Equipe ainda vazia" copy="Convide alguém para dividir a operação." /></div>}</div></section>{team.invitations.length > 0 && <section className="portal-card mt-5 p-5 sm:p-6"><span className="section-kicker">Convites pendentes</span><div className="mt-4 grid gap-3">{team.invitations.map((invite) => <div key={invite.id} className="flex items-center justify-between rounded-xl bg-[#f4f8f6] p-4 text-sm"><span><b>{invite.email}</b><small className="ml-2 text-[#71847e]">{invite.role === "manager" ? "Gerente" : "Vendedor"}</small></span><span className="text-xs text-[#71847e]">até {shortDate(invite.expiresAt)}</span></div>)}</div></section>}</>;
}

function AdminView({ data, onRefresh }: { data: AdminData; onRefresh: () => Promise<void> }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const periodMovements = data.movements.filter((item) => item.occurredAt.startsWith(month));
  const periodOrders = data.orders.filter((item) => item.createdAt.startsWith(month));
  const sales = periodMovements.filter((item) => item.type === "sale");
  const returns = periodMovements.filter((item) => item.type === "return");
  const salesCents = sales.reduce((sum, item) => sum + item.totalValueCents, 0);
  const returnCents = returns.reduce((sum, item) => sum + item.totalValueCents, 0);
  const paidOrders = periodOrders.filter((order) => ["paid", "processing", "shipped", "delivered"].includes(order.status));

  const resellerRows = data.organizations.map((organization) => {
    const orgMovements = periodMovements.filter((item) => item.organizationId === organization.id);
    const lifetimeMovements = data.movements.filter((item) => item.organizationId === organization.id);
    const orgSales = orgMovements.filter((item) => item.type === "sale");
    const orgReturns = orgMovements.filter((item) => item.type === "return");
    const lifetimeSold = lifetimeMovements.filter((item) => item.type === "sale").reduce((sum, item) => sum + item.boxes, 0);
    const lifetimeReturned = lifetimeMovements.filter((item) => item.type === "return").reduce((sum, item) => sum + item.boxes, 0);
    const lifetimeAdjustments = lifetimeMovements.reduce((sum, item) => item.type === "adjustment_in" ? sum + item.boxes : item.type === "adjustment_out" ? sum - item.boxes : sum, 0);
    const lifetimeOrders = data.orders.filter((item) => item.organizationId === organization.id);
    const orgOrders = periodOrders.filter((item) => item.organizationId === organization.id && item.status !== "cancelled");
    const deliveredBoxes = lifetimeOrders.filter((item) => item.status === "delivered").reduce((sum, item) => sum + item.boxes, 0);
    const soldBoxes = orgSales.reduce((sum, item) => sum + item.boxes, 0);
    const returnedBoxes = orgReturns.reduce((sum, item) => sum + item.boxes, 0);
    return { organization, orders: orgOrders.length, soldBoxes, returnedBoxes, stock: deliveredBoxes + lifetimeReturned + lifetimeAdjustments - lifetimeSold, netCents: orgSales.reduce((sum, item) => sum + item.totalValueCents, 0) - orgReturns.reduce((sum, item) => sum + item.totalValueCents, 0), members: data.members.filter((item) => item.organizationId === organization.id).length };
  });

  function exportCsv() {
    const lines = [["Revenda", "Origem", "Campanha", "Pedidos do período", "Vendas (caixas)", "Devoluções (caixas)", "Estoque atual", "Resultado líquido"], ...resellerRows.map((row) => [row.organization.tradeName, row.organization.utmSource ?? "", row.organization.utmCampaign ?? "", String(row.orders), String(row.soldBoxes), String(row.returnedBoxes), String(row.stock), (row.netCents / 100).toFixed(2).replace(".", ",")])];
    const csv = lines.map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `fechamento-mix10-${month}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  async function updateOrder(orderId: string, status: string) {
    const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, status }) });
    if (response.ok) await onRefresh();
  }

  return <><SectionHeading eyebrow="Operação geral" title="Painel administrativo" copy="Acompanhe revendedores, pedidos, vendas, devoluções e o fechamento do período." action={<div className="flex gap-2"><Input aria-label="Mês do fechamento" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-11 w-[170px] rounded-xl bg-white" /><Button className="h-11 rounded-xl bg-[#09211b] text-white hover:bg-[#153c32]" onClick={exportCsv}><Download /> Exportar fechamento</Button></div>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Users} value={String(data.organizations.length)} label="Revendas cadastradas" detail={`${data.members.length} usuários`} /><MetricCard icon={ShoppingBag} value={String(paidOrders.length)} label="Pedidos confirmados" detail={money(paidOrders.reduce((sum, item) => sum + item.totalCents, 0))} /><MetricCard icon={TrendingUp} value={String(sales.reduce((sum, item) => sum + item.boxes, 0))} label="Caixas vendidas" detail={money(salesCents)} /><MetricCard icon={RotateCcw} value={String(returns.reduce((sum, item) => sum + item.boxes, 0))} label="Devoluções" detail={money(returnCents)} tone="rose" /></div><section className="portal-card mt-6 overflow-hidden"><div className="border-b border-[#e1e9e6] p-5 sm:p-6"><span className="section-kicker">Fechamento {month}</span><h2 className="mt-1 text-xl font-black">Números por revendedor</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-sm"><thead className="bg-[#f7faf9] text-[.68rem] uppercase tracking-[.12em] text-[#71847e]"><tr><th className="px-6 py-4">Revenda</th><th className="px-4 py-4">Equipe</th><th className="px-4 py-4">Pedidos</th><th className="px-4 py-4">Vendas</th><th className="px-4 py-4">Devoluções</th><th className="px-4 py-4">Estoque</th><th className="px-6 py-4 text-right">Resultado</th></tr></thead><tbody className="divide-y divide-[#e1e9e6]">{resellerRows.map((row) => <tr key={row.organization.id}><td className="px-6 py-4"><b>{row.organization.tradeName}</b><span className="block text-xs text-[#71847e]">{row.organization.city}/{row.organization.state}</span>{row.organization.utmSource && <span className="mt-1 block text-[.68rem] font-bold text-[#16896f]">Origem: {row.organization.utmSource}{row.organization.utmCampaign ? ` · ${row.organization.utmCampaign}` : ""}</span>}</td><td className="px-4 py-4">{row.members}</td><td className="px-4 py-4">{row.orders}</td><td className="px-4 py-4 font-bold text-[#08705c]">{row.soldBoxes}</td><td className="px-4 py-4 font-bold text-[#9f3e31]">{row.returnedBoxes}</td><td className="px-4 py-4 font-bold">{row.stock}</td><td className="px-6 py-4 text-right font-black">{money(row.netCents)}</td></tr>)}</tbody></table></div></section><section className="portal-card mt-6 overflow-hidden"><div className="border-b border-[#e1e9e6] p-5 sm:p-6"><span className="section-kicker">Logística e cobrança</span><h2 className="mt-1 text-xl font-black">Pedidos de todas as revendas</h2></div><div className="divide-y divide-[#e1e9e6]">{data.orders.slice(0, 20).map((order) => <div key={order.id} className="grid gap-3 p-5 md:grid-cols-[1fr_.7fr_.7fr_.8fr] md:items-center md:px-6"><div><b className="text-sm">{order.orderNumber}</b><span className="block text-xs text-[#71847e]">{order.organizationName} · {order.buyerName}</span></div><span className="text-sm">{order.kit.toUpperCase()} · {order.boxes} caixas</span><strong className="text-sm">{money(order.totalCents)}</strong><NativeSelect value={order.status} onChange={(event) => updateOrder(order.id, event.target.value)} className="w-full rounded-xl bg-white"><NativeSelectOption value="payment_pending">Aguardando pagamento</NativeSelectOption><NativeSelectOption value="paid">Pago</NativeSelectOption><NativeSelectOption value="processing">Em separação</NativeSelectOption><NativeSelectOption value="shipped">Enviado</NativeSelectOption><NativeSelectOption value="delivered">Entregue</NativeSelectOption><NativeSelectOption value="cancelled">Cancelado</NativeSelectOption><NativeSelectOption value="payment_error">Falha na cobrança</NativeSelectOption></NativeSelect></div>)}</div></section></>;
}

function OnboardingDialog({ open, onComplete, email }: { open: boolean; onComplete: () => Promise<void>; email: string }) {
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setMessage(""); const form = new FormData(event.currentTarget); let attribution: Record<string, string> = {}; try { attribution = JSON.parse(localStorage.getItem("mix10_attribution") || "{}"); } catch { attribution = {}; } const payload = { ...Object.fromEntries(form.entries()), ...attribution }; try { const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || "Não foi possível salvar."); await onComplete(); } catch (error) { setMessage(error instanceof Error ? error.message : "Tente novamente."); } finally { setLoading(false); } }
  return <Dialog open={open}><DialogContent className="max-h-[92vh] overflow-auto rounded-[1.5rem] border-[#d4e1dd] sm:max-w-[720px]" showCloseButton={false}><DialogHeader><DialogTitle className="text-2xl font-black tracking-[-.035em]">Configure sua revenda</DialogTitle><DialogDescription>Esses dados identificam a empresa, a entrega e a cobrança no Asaas.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-2 grid gap-4 sm:grid-cols-2"><Field label="Seu nome"><Input name="name" required /></Field><Field label="WhatsApp"><Input name="phone" required placeholder="(11) 90000-0000" /></Field><Field label="Razão social ou nome completo"><Input name="legalName" required /></Field><Field label="Nome da revenda"><Input name="tradeName" required /></Field><Field label="CPF ou CNPJ"><Input name="cpfCnpj" required /></Field><Field label="E-mail"><Input value={email} readOnly className="bg-[#f2f6f4]" /></Field><Field label="CEP"><Input name="postalCode" required /></Field><Field label="Endereço"><Input name="street" required /></Field><Field label="Número"><Input name="number" required /></Field><Field label="Complemento"><Input name="complement" /></Field><Field label="Bairro"><Input name="district" required /></Field><Field label="Cidade"><Input name="city" required /></Field><Field label="UF"><Input name="state" required maxLength={2} /></Field>{message && <p className="sm:col-span-2 rounded-xl bg-[#fff0ee] p-3 text-sm text-[#9f3e31]">{message}</p>}<Button className="h-12 rounded-xl bg-[#08705c] hover:bg-[#065d4d] sm:col-span-2" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <>Criar ambiente da revenda <ArrowRight /></>}</Button></form></DialogContent></Dialog>;
}

function OrderDialog({ open, setOpen, organization, onComplete }: { open: boolean; setOpen: (open: boolean) => void; organization: Organization; onComplete: () => Promise<void> }) {
  const [kit, setKit] = useState<"kit20" | "kit30">("kit20"); const [loading, setLoading] = useState(false); const [message, setMessage] = useState(""); const [payment, setPayment] = useState<{ orderNumber: string; invoiceUrl?: string | null; qrPayload?: string | null; qrImage?: string | null } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setMessage(""); const payload = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), kit }; try { const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json() as { error?: string; order?: { orderNumber: string }; payment?: { invoiceUrl?: string | null; qrPayload?: string | null; qrImage?: string | null } }; if (!response.ok) throw new Error(data.error || "Não foi possível criar a cobrança."); setPayment({ orderNumber: data.order?.orderNumber ?? "Pedido", ...data.payment }); await onComplete(); } catch (error) { setMessage(error instanceof Error ? error.message : "Tente novamente."); } finally { setLoading(false); } }
  function close(next: boolean) { setOpen(next); if (!next) { setPayment(null); setMessage(""); } }
  return <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[92vh] overflow-auto rounded-[1.5rem] border-[#d4e1dd] sm:max-w-[760px]"><DialogHeader><DialogTitle className="text-2xl font-black tracking-[-.035em]">{payment ? "Pedido criado" : "Solicitar novo pedido"}</DialogTitle><DialogDescription>{payment ? `${payment.orderNumber} está aguardando pagamento.` : "Escolha o kit, confirme a entrega e siga para o ambiente seguro do Asaas."}</DialogDescription></DialogHeader>{payment ? <div className="mt-3 text-center">{payment.qrImage && <img src={`data:image/png;base64,${payment.qrImage}`} alt="QR Code Pix" className="mx-auto h-56 w-56 rounded-2xl border border-[#d5e2de] p-3" />}{payment.qrPayload && <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigator.clipboard.writeText(payment.qrPayload || "")}>Copiar Pix</Button>}{payment.invoiceUrl && <a className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#08705c] px-6 font-bold text-white" href={payment.invoiceUrl} target="_blank" rel="noreferrer">Abrir pagamento no Asaas <ArrowRight size={18} /></a>}<p className="mt-5 text-sm text-[#60766f]">O status será atualizado automaticamente após a confirmação.</p></div> : <form onSubmit={submit} className="mt-2"><div className="grid gap-3 sm:grid-cols-2">{[{ id: "kit20", name: "KIT20", boxes: 20, price: "R$ 1.499,80" }, { id: "kit30", name: "KIT30", boxes: 30, price: "R$ 2.249,70" }].map((item) => <button type="button" key={item.id} onClick={() => setKit(item.id as "kit20" | "kit30")} className={`rounded-2xl border p-4 text-left ${kit === item.id ? "border-[#159477] bg-[#e5f8f2] shadow-[0_0_0_2px_rgba(21,148,119,.12)]" : "border-[#d7e2de] bg-white"}`}><span className="text-xs font-black text-[#16896f]">{item.boxes} CAIXAS</span><b className="mt-2 block text-xl">{item.name}</b><strong className="mt-3 block text-lg">{item.price}</strong></button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Forma de pagamento"><NativeSelect name="billingType" className="h-10 w-full"><NativeSelectOption value="UNDEFINED">Escolher no Asaas</NativeSelectOption><NativeSelectOption value="PIX">Pix com QR Code</NativeSelectOption></NativeSelect></Field><Field label="CEP"><Input name="postalCode" defaultValue={organization.postalCode} required /></Field><Field label="Endereço"><Input name="street" defaultValue={organization.street} required /></Field><Field label="Número"><Input name="number" defaultValue={organization.number} required /></Field><Field label="Complemento"><Input name="complement" defaultValue={organization.complement} /></Field><Field label="Bairro"><Input name="district" defaultValue={organization.district} required /></Field><Field label="Cidade"><Input name="city" defaultValue={organization.city} required /></Field><Field label="UF"><Input name="state" defaultValue={organization.state} maxLength={2} required /></Field><div className="sm:col-span-2"><Field label="Observações para o pedido"><Input name="notes" placeholder="Opcional" /></Field></div></div>{message && <p className="mt-4 rounded-xl bg-[#fff0ee] p-3 text-sm text-[#9f3e31]">{message}</p>}<Button className="mt-5 h-12 w-full rounded-xl bg-[#08705c] hover:bg-[#065d4d]" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <>Criar pedido e pagar <ArrowRight /></>}</Button><p className="mt-3 text-center text-xs text-[#71847e]">Cartão, Pix ou boleto são informados somente no ambiente do Asaas.</p></form>}</DialogContent></Dialog>;
}

function MovementDialog({ open, setOpen, canAdjust, onComplete }: { open: boolean; setOpen: (open: boolean) => void; canAdjust: boolean; onComplete: () => Promise<void> }) {
  const [type, setType] = useState<"sale" | "return" | "adjustment_in" | "adjustment_out">("sale"); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setMessage(""); const payload = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), type }; try { const response = await fetch("/api/movements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || "Não foi possível registrar."); setOpen(false); await onComplete(); } catch (error) { setMessage(error instanceof Error ? error.message : "Tente novamente."); } finally { setLoading(false); } }
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] overflow-auto rounded-[1.5rem] border-[#d4e1dd] sm:max-w-[680px]"><DialogHeader><DialogTitle className="text-2xl font-black tracking-[-.035em]">Registrar movimentação</DialogTitle><DialogDescription>Atualize venda, devolução e o saldo de estoque da revenda.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-2"><div className={`grid gap-3 ${canAdjust ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}><button type="button" onClick={() => setType("sale")} className={`rounded-2xl border p-4 text-left ${type === "sale" ? "border-[#159477] bg-[#e5f8f2]" : "border-[#d7e2de]"}`}><TrendingUp className="text-[#16896f]" size={20} /><b className="mt-3 block">Venda</b></button><button type="button" onClick={() => setType("return")} className={`rounded-2xl border p-4 text-left ${type === "return" ? "border-[#c46a5c] bg-[#fff0ee]" : "border-[#d7e2de]"}`}><RotateCcw className="text-[#a34a3d]" size={20} /><b className="mt-3 block">Devolução</b></button>{canAdjust && <button type="button" onClick={() => setType("adjustment_in")} className={`rounded-2xl border p-4 text-left ${type === "adjustment_in" ? "border-[#159477] bg-[#e5f8f2]" : "border-[#d7e2de]"}`}><Plus className="text-[#16896f]" size={20} /><b className="mt-3 block">Entrada</b></button>}{canAdjust && <button type="button" onClick={() => setType("adjustment_out")} className={`rounded-2xl border p-4 text-left ${type === "adjustment_out" ? "border-[#c58c31] bg-[#fff7e5]" : "border-[#d7e2de]"}`}><RefreshCcw className="text-[#9b6c1e]" size={20} /><b className="mt-3 block">Saída</b></button>}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Quantidade de caixas"><Input name="boxes" type="number" min={1} required /></Field><Field label={type.startsWith("adjustment") ? "Valor por caixa (opcional)" : "Valor por caixa"}><Input key={type} name="unitValue" type="number" min={0} step="0.01" defaultValue={type.startsWith("adjustment") ? "0" : "109.90"} required /></Field><Field label="Canal"><NativeSelect name="channel" className="h-10 w-full"><NativeSelectOption value="whatsapp">WhatsApp</NativeSelectOption><NativeSelectOption value="instagram">Instagram</NativeSelectOption><NativeSelectOption value="store">Loja física</NativeSelectOption><NativeSelectOption value="referral">Indicação</NativeSelectOption><NativeSelectOption value="other">Outro</NativeSelectOption></NativeSelect></Field><Field label="Data"><Input name="occurredAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field><Field label="Cliente ou referência"><Input name="reference" placeholder="Opcional" /></Field><Field label="Observação"><Input name="notes" placeholder="Opcional" /></Field></div>{message && <p className="mt-4 rounded-xl bg-[#fff0ee] p-3 text-sm text-[#9f3e31]">{message}</p>}<Button className="mt-5 h-12 w-full rounded-xl bg-[#08705c] hover:bg-[#065d4d]" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <><Check /> Salvar movimentação</>}</Button></form></DialogContent></Dialog>;
}

function InviteDialog({ open, setOpen, onComplete }: { open: boolean; setOpen: (open: boolean) => void; onComplete: () => Promise<void> }) {
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setMessage(""); const payload = Object.fromEntries(new FormData(event.currentTarget).entries()); try { const response = await fetch("/api/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || "Não foi possível convidar."); setOpen(false); await onComplete(); } catch (error) { setMessage(error instanceof Error ? error.message : "Tente novamente."); } finally { setLoading(false); } }
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="rounded-[1.5rem] border-[#d4e1dd] sm:max-w-[520px]"><DialogHeader><DialogTitle className="text-2xl font-black tracking-[-.035em]">Convidar para a equipe</DialogTitle><DialogDescription>A pessoa receberá um e-mail e entrará com acesso individual.</DialogDescription></DialogHeader><form onSubmit={submit} className="mt-2 grid gap-4"><Field label="E-mail"><Input name="email" type="email" required /></Field><Field label="Nível de acesso"><NativeSelect name="role" className="h-10 w-full"><NativeSelectOption value="seller">Vendedor</NativeSelectOption><NativeSelectOption value="manager">Gerente</NativeSelectOption></NativeSelect></Field>{message && <p className="rounded-xl bg-[#fff0ee] p-3 text-sm text-[#9f3e31]">{message}</p>}<Button className="h-12 rounded-xl bg-[#08705c] hover:bg-[#065d4d]" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <><UserPlus /> Enviar convite</>}</Button></form></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#264b41]"><span>{label}</span>{children}</label>;
}
