"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { useAuth, useFirestore } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanId } from "@/lib/plans";
import { cn, formatCurrency } from "@/lib/utils";

type Payment = { reference: string; planId: PlanId; amount: number; status: string; createdAt: string; paidAt?: string; periodEnd?: string };

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }) : "—");

function BillingInner() {
    const { companyData, companyId, user, isTrial, daysLeft, isReadOnly, subscriptionReason } = useInventory();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const params = useSearchParams();
    const returnedRef = params.get("ref");

    const [selected, setSelected] = useState<PlanId>("mensal");
    const [busy, setBusy] = useState(false);
    const [returned, setReturned] = useState<{ status: string; periodEnd?: string | null } | null>(null);
    const [history, setHistory] = useState<Payment[]>([]);
    const isAdmin = !!user && (user.role === "Admin" || user.role === "Dono");

    // History (admins can read companies/{id}/payments)
    useEffect(() => {
        if (!companyId || !isAdmin) return;
        const q = query(collection(firestore, `companies/${companyId}/payments`), orderBy("createdAt", "desc"), limit(20));
        return onSnapshot(q, (s) => setHistory(s.docs.map((d) => d.data() as Payment)), () => {});
    }, [firestore, companyId, isAdmin]);

    // A ZumboPay não devolve o cliente à app: quem volta (ou reabre a página) com um pagamento pendente recente
    // vê-o acompanhado aqui. Sem isto ficava a olhar para o histórico à espera de uma actualização.
    const watchRef = useMemo(() => {
        if (returnedRef) return returnedRef;
        const recent = history.find((h) => h.status === "pending" && Date.now() - new Date(h.createdAt).getTime() < 30 * 60_000);
        return recent?.reference || null;
    }, [returnedRef, history]);

    // Poll until paid / failed (≈ 2 min)
    useEffect(() => {
        if (!watchRef) return;
        const returnedRef = watchRef;
        let tries = 0;
        let stop = false;
        const tick = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                if (!token) { if (!stop) setTimeout(tick, 1500); return; }
                const r = await fetch(`/api/billing/status?ref=${encodeURIComponent(returnedRef)}`, { headers: { Authorization: `Bearer ${token}` } });
                const j = await r.json();
                setReturned({ status: j.status, periodEnd: j.periodEnd });
                if (!stop && j.status === "pending" && ++tries < 40) setTimeout(tick, 3000);
            } catch {
                if (!stop && ++tries < 40) setTimeout(tick, 3000);
            }
        };
        tick();
        return () => { stop = true; };
    }, [watchRef, auth]);

    const pay = async () => {
        setBusy(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const r = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ planId: selected }),
            });
            const j = await r.json();
            if (!r.ok || !j.checkoutUrl) throw new Error(j.error || "Erro ao iniciar o pagamento");
            window.location.href = j.checkoutUrl; // checkout ZumboPay: M-Pesa, e-Mola, cartão…
        } catch (e) {
            toast({ variant: "destructive", title: "Não foi possível iniciar o pagamento", description: e instanceof Error ? e.message : "" });
            setBusy(false);
        }
    };

    const ends = companyData?.subscriptionEndsAt;
    const statusLine = isReadOnly
        ? subscriptionReason === "trial_expired" ? "O período de teste terminou." : "A subscrição não está activa."
        : isTrial ? `Período de teste — faltam ${daysLeft} dia(s).`
        : ends ? `Activa até ${fmtDate(ends)}.` : "Activa.";

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-24">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Subscrição MajorStockX</h1>
                <p className={cn("mt-1 text-sm", isReadOnly ? "font-semibold text-red-600" : "text-muted-foreground")}>{statusLine}</p>
            </div>

            {returnedRef && returned && (
                <div className={cn("flex items-center gap-3 rounded-2xl border p-4",
                    returned.status === "paid" ? "border-emerald-500/40 bg-emerald-500/10" : returned.status === "pending" ? "border-sky-500/40 bg-sky-500/10" : "border-red-500/40 bg-red-500/10")}>
                    {returned.status === "paid" ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : returned.status === "pending" ? <Loader2 className="h-6 w-6 animate-spin text-sky-600" /> : <XCircle className="h-6 w-6 text-red-600" />}
                    <div className="flex-1 text-sm">
                        {returned.status === "paid" && <p><b>Pagamento confirmado. Obrigado!</b> A sua conta está activa até {fmtDate(returned.periodEnd)}.</p>}
                        {returned.status === "pending" && <p><b>À espera da confirmação…</b> Confirme o pagamento no telemóvel (PIN do M-Pesa / e-Mola). Esta página actualiza sozinha.</p>}
                        {!["paid", "pending"].includes(returned.status) && <p><b>O pagamento não foi concluído.</b> Nada foi cobrado — pode tentar de novo.</p>}
                    </div>
                    {returned.status === "paid" && <Button size="sm" onClick={() => router.push("/dashboard")}>Continuar</Button>}
                </div>
            )}

            {!isAdmin ? (
                <p className="rounded-2xl border p-4 text-sm text-muted-foreground">Só o administrador da empresa pode pagar a subscrição.</p>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {PLANS.map((p) => (
                            <button key={p.id} type="button" onClick={() => setSelected(p.id)}
                                className={cn("relative rounded-2xl border-2 p-4 text-left transition", selected === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                                {p.note && <span className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">{p.note}</span>}
                                <p className="font-semibold">{p.label}</p>
                                <p className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(p.amount)}</p>
                                <p className="text-xs text-muted-foreground">{p.months === 1 ? "por mês" : `${p.months} meses · ${formatCurrency(Math.round(p.amount / p.months))}/mês`}</p>
                            </button>
                        ))}
                    </div>

                    <Button onClick={pay} disabled={busy} className="h-12 rounded-xl text-base">
                        {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                        Pagar {formatCurrency(PLANS.find((p) => p.id === selected)!.amount)}
                    </Button>

                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 shrink-0" /> M-Pesa, e-Mola, mKesh ou cartão Visa/Mastercard</p>
                        <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" /> Pagamento seguro via ZumboPay (M-Pesa, e-Mola ou cartão) · conta activada na hora</p>
                    </div>
                    {ends && !isReadOnly && <p className="text-xs text-muted-foreground">Pagar antes do fim não perde dias: o novo período começa a {fmtDate(ends)}.</p>}
                </>
            )}

            {history.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamentos</p>
                    <div className="overflow-hidden rounded-2xl border">
                        {history.map((h) => (
                            <div key={h.reference} className="flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm last:border-0">
                                <div className="min-w-0">
                                    <p className="font-medium">{PLANS.find((p) => p.id === h.planId)?.label || h.planId} · {formatCurrency(h.amount)}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })} · ref. {h.reference}{h.periodEnd ? ` · até ${fmtDate(h.periodEnd)}` : ""}</p>
                                </div>
                                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                                    h.status === "paid" ? "bg-emerald-500/15 text-emerald-600" : h.status === "pending" ? "bg-sky-500/15 text-sky-600" : "bg-red-500/15 text-red-600")}>
                                    {h.status === "paid" ? "pago" : h.status === "pending" ? "pendente" : "falhou"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BillingPage() {
    return <Suspense fallback={null}><BillingInner /></Suspense>;
}
