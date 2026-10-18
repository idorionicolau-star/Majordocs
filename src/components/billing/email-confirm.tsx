"use client";

// Confirmar o email antes da primeira venda real (ver lib/email-confirm.ts).
// - EmailVerifiedSync: assim que um Dono/Admin com email confirmado abre a app, fica registado na empresa (o Google já
//   vem confirmado, por isso quem entra com o Google nunca vê o aviso).
// - useEmailConfirmGate: as páginas de venda perguntam antes de gravar; se faltar, abre o aviso com "Reenviar" e "Já confirmei".
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { reload, sendEmailVerification } from "firebase/auth";
import { Loader2, MailCheck } from "lucide-react";
import { InventoryContext } from "@/context/inventory-context";
import { useAuth } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canMarkVerified, needsEmailConfirm } from "@/lib/email-confirm";
import { isCountableSale } from "@/lib/sale-filters";

function useMarkVerified() {
    const ctx = useContext(InventoryContext);
    const auth = useAuth();
    return useCallback(async (): Promise<boolean> => {
        const u = auth.currentUser;
        if (!u) return false;
        await reload(u).catch(() => {});
        if (!canMarkVerified(ctx?.user?.role, !!auth.currentUser?.emailVerified)) return false;
        if (!ctx?.companyData?.emailVerifiedAt) await ctx?.updateCompany?.({ emailVerifiedAt: new Date().toISOString() });
        return true;
    }, [auth, ctx]);
}

export function EmailVerifiedSync() {
    const ctx = useContext(InventoryContext);
    const mark = useMarkVerified();
    const done = useRef(false);
    const pending = ctx?.companyData?.status === "trial" && !ctx?.companyData?.emailVerifiedAt;
    useEffect(() => {
        if (!pending || done.current || !ctx?.user) return;
        done.current = true;
        mark().catch(() => {});
    }, [pending, ctx?.user, mark]);
    return null;
}

/** `check(action)`: corre já a venda, ou mostra o aviso e corre-a depois de confirmado. */
export function useEmailConfirmGate(opts: { proforma?: boolean; demo?: boolean } = {}) {
    const ctx = useContext(InventoryContext);
    const auth = useAuth();
    const { toast } = useToast();
    const mark = useMarkVerified();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<null | "send" | "check">(null);
    const next = useRef<(() => void) | null>(null);
    const realSales = (ctx?.sales || []).filter(isCountableSale).length;
    const isManager = ctx?.user?.role === "Admin" || ctx?.user?.role === "Dono";
    const email = auth.currentUser?.email || "";

    const check = useCallback((action: () => void) => {
        if (!needsEmailConfirm(ctx?.companyData, realSales, opts)) return action();
        next.current = action;
        setOpen(true);
    }, [ctx?.companyData, realSales, opts.proforma, opts.demo]); // eslint-disable-line react-hooks/exhaustive-deps

    const resend = async () => {
        const u = auth.currentUser;
        if (!u) return;
        setBusy("send");
        try {
            await sendEmailVerification(u, { url: window.location.origin + "/pos" });
            toast({ title: "Email enviado", description: `Abra o email enviado para ${email} e toque no link.` });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Não foi possível enviar", description: e?.code === "auth/too-many-requests" ? "Já enviámos há pouco. Veja a caixa de entrada (e o spam)." : "Tente outra vez daqui a pouco." });
        } finally {
            setBusy(null);
        }
    };

    const confirmed = async () => {
        setBusy("check");
        try {
            if (await mark()) {
                setOpen(false);
                toast({ title: "Email confirmado ✅", description: "Já pode vender." });
                const a = next.current;
                next.current = null;
                a?.();
            } else {
                toast({ variant: "destructive", title: "Ainda não está confirmado", description: "Abra o link do email que enviámos e toque outra vez em \"Já confirmei\"." });
            }
        } finally {
            setBusy(null);
        }
    };

    const dialog = (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent data-testid="email-confirm-gate">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><MailCheck className="h-5 w-5 text-primary" /> Confirme o seu email</DialogTitle>
                    <DialogDescription>
                        {isManager
                            ? <>Antes da primeira venda, confirme que <b>{email}</b> é seu: abra o email que enviámos e toque no link. É só uma vez.</>
                            : <>Antes da primeira venda, o responsável da conta tem de confirmar o email dele. Peça-lhe para abrir a app.</>}
                    </DialogDescription>
                </DialogHeader>
                {isManager && (
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={resend} disabled={!!busy}>
                            {busy === "send" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reenviar email
                        </Button>
                        <Button type="button" onClick={confirmed} disabled={!!busy}>
                            {busy === "check" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Já confirmei
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );

    return { check, dialog };
}
