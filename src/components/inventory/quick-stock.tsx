"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useInventory } from "@/context/inventory-context";
import { useFirestore } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { useKeepFocusedAboveBar, useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, plural } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { NewProductFields } from "@/components/inventory/new-product-fields";
import { cleanProductName, findNameMatches, guessUnit, planCatalogWrites, suggestCategory, type NameMatch } from "@/lib/new-product";
import {
    commitQuickStock,
    lineFromProduct,
    lineKey,
    parseQuickInput,
    resultingStock,
    searchProducts,
    toNumber,
    type QuickLine,
    type QuickMode,
} from "@/lib/quick-stock";
import { links } from "@/lib/deep-links";
import { BarcodeScanner } from "@/components/scan/barcode-scanner";
import { VoiceButton } from "@/components/scan/voice-button";
import { findByBarcode, looksLikeBarcode, normalizeBarcode } from "@/lib/barcode";
import { parseVoice } from "@/lib/voice-parse";
import { useBarcodeLink } from "@/hooks/use-barcode-link";
import {
    ArrowDownToLine,
    ScanBarcode,
    ArrowUpFromLine,
    Check,
    ClipboardCheck,
    Loader2,
    MapPin,
    Minus,
    Plus,
    Search,
    Sheet,
    Sparkles,
    X,
} from "lucide-react";

const MODES: { id: QuickMode; label: string; verb: string; icon: React.ElementType; tone: string; solid: string }[] = [
    { id: "in", label: "Entrada", verb: "Confirmar entrada", icon: ArrowDownToLine, tone: "text-emerald-600 border-emerald-600", solid: "bg-emerald-600 hover:bg-emerald-700" },
    { id: "out", label: "Saída", verb: "Confirmar saída", icon: ArrowUpFromLine, tone: "text-orange-600 border-orange-600", solid: "bg-orange-600 hover:bg-orange-700" },
    { id: "count", label: "Contagem", verb: "Guardar contagem", icon: ClipboardCheck, tone: "text-blue-600 border-blue-600", solid: "bg-blue-600 hover:bg-blue-700" },
];

const OUT_REASONS = ["Consumo interno", "Quebra / Dano", "Perda", "Oferta", "Devolução ao fornecedor"];
const STEPS = [1, 5, 10, 50, 100];
const COUNT_PAGE = 60;

const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toLocaleString("pt-PT", { maximumFractionDigits: 3 }));

type Draft = Record<string, QuickLine>;

function loadDraft(key: string): Draft {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Draft) : {};
    } catch {
        return {};
    }
}
function saveDraft(key: string, draft: Draft) {
    try {
        if (Object.keys(draft).length) localStorage.setItem(key, JSON.stringify(draft));
        else localStorage.removeItem(key);
    } catch {
        /* storage unavailable — draft just isn't kept */
    }
}

export function QuickStock({ initialMode = "in" }: { initialMode?: QuickMode }) {
    const { products, locations, isMultiLocation, companyId, user, isReadOnly, notifyManagers, catalogProducts, catalogCategories, availableCategories, availableUnits } = useInventory();
    const isManager = !!user && (user.role === "Admin" || user.role === "Dono");
    const firestore = useFirestore();
    const { toast } = useToast();
    // Teclado aberto no telemóvel: a barra de confirmar sobe e fica por cima dele.
    const keyboardInset = useKeyboardInset();
    useKeepFocusedAboveBar(keyboardInset, 96);

    const [mode, setMode] = useState<QuickMode>(initialMode);
    const [location, setLocation] = useState<string>("");
    const [text, setText] = useState("");
    const [highlight, setHighlight] = useState(0);
    const [picked, setPicked] = useState<{ product?: Product; newName?: string; from?: Product } | null>(null);
    const [qtyText, setQtyText] = useState("");
    const [newPrice, setNewPrice] = useState("");
    // Produto novo: o que a pessoa vê e pode corrigir antes de criar
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [categoryTouched, setCategoryTouched] = useState(false);
    const [newUnit, setNewUnit] = useState("un");
    const [unitTouched, setUnitTouched] = useState(false);
    const [ackDuplicate, setAckDuplicate] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [pendingCode, setPendingCode] = useState<string | null>(null);
    const [listening, setListening] = useState("");
    const { link: linkBarcode, canLink } = useBarcodeLink();
    const [drafts, setDrafts] = useState<Record<QuickMode, Draft>>({ in: {}, out: {}, count: {} });
    const [draftsLoaded, setDraftsLoaded] = useState(false);
    const lines = drafts[mode];
    const setLines = useCallback(
        (update: Draft | ((prev: Draft) => Draft)) =>
            setDrafts((all) => ({ ...all, [mode]: typeof update === "function" ? update(all[mode]) : update })),
        [mode]
    );
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [countFilter, setCountFilter] = useState<"todo" | "all" | "done">("todo");
    const [countLimit, setCountLimit] = useState(COUNT_PAGE);

    const searchRef = useRef<HTMLInputElement>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    const countInputs = useRef<Map<string, HTMLInputElement>>(new Map());

    const current = MODES.find((m) => m.id === mode)!;
    // Contagem cega: quem conta (funcionário) não vê o stock do sistema — conta o que está lá de verdade.
    const blind = mode === "count" && !isManager;
    const draftKey = (m: QuickMode) => `majorstockx-quick-${companyId}-${m}`;

    // Default location: last used, else first one.
    useEffect(() => {
        if (location) return;
        let saved: string | null = null;
        try { saved = localStorage.getItem("majorstockx-quick-location"); } catch { /* ignore */ }
        if (saved && locations.some((l) => l.id === saved)) setLocation(saved);
        else if (locations.length) setLocation(locations[0].id);
    }, [locations, location]);

    // Load / keep the draft per mode, so a reload or a dropped connection never loses work.
    useEffect(() => {
        if (!companyId) return;
        setDrafts({ in: loadDraft(draftKey("in")), out: loadDraft(draftKey("out")), count: loadDraft(draftKey("count")) });
        setDraftsLoaded(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);
    useEffect(() => {
        if (!companyId || !draftsLoaded) return;
        (Object.keys(drafts) as QuickMode[]).forEach((m) => saveDraft(draftKey(m), drafts[m]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drafts, draftsLoaded, companyId]);
    useEffect(() => {
        setPicked(null);
        setText("");
        setNote("");
        setCountLimit(COUNT_PAGE);
    }, [mode]);

    // Products at the chosen location. Single-location companies see everything.
    const scoped = useMemo(() => {
        const list = products.filter((p) => !p.deletedAt);
        if (!isMultiLocation || !location) return list;
        return list.filter((p) => (p.location || "") === location);
    }, [products, isMultiLocation, location]);

    const names = useMemo(() => scoped.map((p) => p.name), [scoped]);
    const parsed = useMemo(() => parseQuickInput(text, names), [text, names]);
    const results = useMemo(() => searchProducts(scoped, parsed.term, 8), [scoped, parsed.term]);
    const exactExists = results.some((p) => p.name.trim().toLowerCase() === parsed.term.trim().toLowerCase());
    // Products that exist in OTHER locations but not here — offer to bring them here with the same data.
    const elsewhere = useMemo(() => {
        if (!isMultiLocation || mode === "out" || !parsed.term) return [] as Product[];
        const here = new Set(scoped.map((p) => p.name.trim().toLowerCase()));
        const seen = new Set<string>();
        return searchProducts(products.filter((p) => !p.deletedAt), parsed.term, 20)
            .filter((p) => {
                const k = p.name.trim().toLowerCase();
                if (here.has(k) || seen.has(k)) return false;
                seen.add(k);
                return true;
            })
            .slice(0, 4);
    }, [isMultiLocation, mode, parsed.term, scoped, products]);
    const elsewhereExact = elsewhere.some((p) => p.name.trim().toLowerCase() === parsed.term.trim().toLowerCase());
    const canCreate = mode === "in" && !elsewhereExact && parsed.term.trim().length >= 2 && !exactExists;

    // ---------- Produto novo: parecidos, categoria sugerida, o que falta no catálogo ----------
    const liveProducts = useMemo(() => products.filter((p) => !p.deletedAt), [products]);
    const categoryNames = useMemo(() => Array.from(new Set([...(availableCategories || []), ...(catalogCategories || []).map((c) => c.name)])), [availableCategories, catalogCategories]);
    const unitNames = useMemo(() => (availableUnits && availableUnits.length ? availableUnits : ["un", "saco", "m", "m²", "m³", "kg", "L"]), [availableUnits]);
    const creating = !!picked && !!picked.newName && !picked.from && !picked.product;
    const matches = useMemo(
        () => (creating ? findNameMatches(newName, { inventory: liveProducts, catalog: catalogProducts || [] }) : []),
        [creating, newName, liveProducts, catalogProducts]
    );
    const suggestion = useMemo(() => suggestCategory(newName, categoryNames, liveProducts), [newName, categoryNames, liveProducts]);

    // Enquanto a pessoa não mexer, a categoria e a unidade seguem o nome que vai escrevendo.
    useEffect(() => { if (creating && !categoryTouched) setNewCategory(suggestion.category); }, [creating, categoryTouched, suggestion.category]);
    useEffect(() => { if (creating && !unitTouched) setNewUnit(guessUnit(newName, unitNames)); }, [creating, unitTouched, newName, unitNames]);

    const openNewProduct = (name: string) => {
        setNewName(cleanProductName(name));
        setCategoryTouched(false);
        setUnitTouched(false);
        setAckDuplicate(false);
    };

    useEffect(() => setHighlight(0), [parsed.term]);

    const lineList = useMemo(() => Object.values(lines), [lines]);
    const problems = lineList.filter((l) => mode === "out" && resultingStock(mode, l) < 0);

    const focusSearch = () => requestAnimationFrame(() => searchRef.current?.focus());

    const addLine = useCallback(
        (line: QuickLine, replace = false) => {
            setLines((prev) => {
                const existing = prev[line.key];
                const qty = existing && !replace && mode !== "count" ? existing.qty + line.qty : line.qty;
                return { ...prev, [line.key]: { ...(existing || line), qty } };
            });
        },
        [setLines, mode]
    );

    const pick = (product?: Product, wantedName?: string, presetQty?: number | null) => {
        // código lido que ainda não tinha produto: o produto escolhido fica com ele
        if (product && pendingCode) {
            const ok = linkBarcode(product, pendingCode);
            toast({ title: ok ? `Código ligado a ${product.name}` : "Não foi possível guardar o código", description: ok ? "Da próxima vez basta ler." : "Sem permissão para editar produtos — o registo continua." });
            setPendingCode(null);
        }
        if (presetQty != null && presetQty >= 0) {
            // Everything typed in one go ("bloco x 200") — add straight away,
            // excepto produto novo parecido com outro: aí mostra primeiro o aviso.
            const similar = wantedName ? findNameMatches(cleanProductName(wantedName), { inventory: liveProducts, catalog: catalogProducts || [] }) : [];
            if (!(wantedName && similar.length)) {
                if (product) addLine(lineFromProduct(product, presetQty));
                else if (wantedName) {
                    const clean = cleanProductName(wantedName);
                    const sug = suggestCategory(clean, categoryNames, liveProducts);
                    addLine(newLine(clean, presetQty, undefined, undefined, { category: sug.category, unit: guessUnit(clean, unitNames) }));
                }
                setText("");
                setPicked(null);
                focusSearch();
                return;
            }
            setQtyText(fmt(presetQty));
        }
        if (wantedName) openNewProduct(wantedName);
        setPicked({ product, newName: wantedName });
        const existing = product ? lines[lineKey(product.name, product.location || "")] : undefined;
        if (!(presetQty != null && presetQty >= 0)) setQtyText(mode === "count" && existing ? fmt(existing.qty) : "");
        setNewPrice("");
        requestAnimationFrame(() => qtyRef.current?.focus());
    };

    const newLine = (name: string, qty: number, price?: number, from?: Product, extra?: { category?: string; unit?: string }): QuickLine => {
        const finalName = from ? from.name : cleanProductName(name);
        const category = from?.category || extra?.category || "Geral";
        const plan = planCatalogWrites({ name: finalName, category, catalogProducts: catalogProducts || [], catalogCategories: (catalogCategories || []).map((c) => c.name) });
        return {
            key: lineKey(finalName, location),
            name: finalName,
            location,
            sourceIds: [],
            systemStock: 0,
            unit: from?.unit || extra?.unit || "un",
            qty,
            isNew: true,
            price: price ?? from?.price,
            category: plan.category,
            addToCatalog: plan.addProduct,
            addCategory: plan.addCategory,
            ...(from ? { template: { category: from.category, price: from.price, cost: from.cost, unit: from.unit, lowStockThreshold: from.lowStockThreshold, criticalStockThreshold: from.criticalStockThreshold, imageUrl: from.imageUrl } } : {}),
        };
    };

    // "É este": usa o produto que já existe em vez de criar outro
    const useMatch = (m: NameMatch) => {
        if (m.source === "inventory") {
            const found = liveProducts.find((p) => p.name === m.name && (p.location || "") === (m.location || ""));
            if (!found) return;
            const here = !isMultiLocation || (found.location || "") === location;
            if (here) pick(found, undefined, null);
            else pickElsewhere(found, null);
            return;
        }
        // só no catálogo: aproveita os dados do catálogo (nome, categoria, unidade, preço)
        setNewName(m.name);
        if (m.category) { setNewCategory(m.category); setCategoryTouched(true); }
        if (m.unit) { setNewUnit(m.unit); setUnitTouched(true); }
        if (m.price) setNewPrice(String(m.price));
        setAckDuplicate(true);
    };

    // A product from another location becomes a new line here, carrying its data.
    const pickElsewhere = (p: Product, presetQty?: number | null) => {
        if (presetQty != null && presetQty >= 0) {
            addLine(newLine(p.name, presetQty, undefined, p));
            setText("");
            setPicked(null);
            focusSearch();
            return;
        }
        setPicked({ newName: p.name, from: p });
        setQtyText("");
        requestAnimationFrame(() => qtyRef.current?.focus());
    };

    /** Código lido (câmara ou leitor): +1 ao produto, ou guarda o código para o próximo produto escolhido. */
    const handleCode = (raw: string, fromCamera = false): string | undefined => {
        const code = normalizeBarcode(raw);
        const p = findByBarcode(liveProducts, code, location);
        if (p) {
            if (isMultiLocation && (p.location || "") !== location) {
                if (fromCamera) setScanOpen(false);
                pickElsewhere(p, null);
                return `${p.name} — está noutra localização`;
            }
            const have = lines[lineKey(p.name, p.location || "")]?.qty || 0;
            addLine(lineFromProduct(p, have + 1), true);
            setText("");
            return `✓ ${p.name} × ${fmt(have + 1)}`;
        }
        setPendingCode(code);
        setText("");
        if (fromCamera) setScanOpen(false);
        toast({ title: "Código novo", description: canLink ? "Ainda não está ligado a nenhum produto. Escreva o nome e toque no produto certo para o associar." : "Ainda não está ligado a nenhum produto." });
        focusSearch();
        return undefined;
    };

    const handleVoice = (transcript: string) => {
        setListening("");
        const items = parseVoice(transcript);
        if (!items.length) return;
        const done: string[] = [];
        const missed: string[] = [];
        for (const it of items) {
            const hit = searchProducts(scoped, it.term, 1)[0];
            if (!hit) { missed.push(it.term); continue; }
            addLine(lineFromProduct(hit, it.qty ?? 1));
            done.push(`${fmt(it.qty ?? 1)} × ${hit.name}`);
        }
        toast({
            variant: missed.length && !done.length ? "destructive" : undefined,
            title: done.length ? `Juntei: ${done.join(", ")}` : "Não encontrei esse produto",
            description: missed.length ? `Não encontrei: ${missed.join(", ")}. Para criar um produto novo, escreva o nome.` : undefined,
        });
    };

    // Buttons next to the quantity field must not steal focus (keeps Enter working and the phone keyboard open).
    const keepFocus = (e: React.MouseEvent) => e.preventDefault();

    const confirmPicked = () => {
        if (!picked) return;
        const q = toNumber(qtyText);
        if (!(q >= 0) || (mode !== "count" && q === 0)) {
            qtyRef.current?.focus();
            return;
        }
        if (picked.product) addLine(lineFromProduct(picked.product, q), mode === "count");
        else if (picked.newName) {
            if (!picked.from) {
                const clean = cleanProductName(newName);
                if (clean.length < 2) return;
                if (matches.some((m) => m.kind === "exact") && !ackDuplicate) {
                    toast({ variant: "destructive", title: "Este produto já existe", description: "Escolha “É este” ou confirme que é diferente." });
                    return;
                }
                addLine(newLine(clean, q, toNumber(newPrice) || undefined, undefined, { category: newCategory.trim() || "Geral", unit: newUnit }));
            } else {
                addLine(newLine(picked.newName, q, toNumber(newPrice) || undefined, picked.from));
            }
        }
        setPicked(null);
        setText("");
        focusSearch();
    };

    const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const total = results.length + elsewhere.length + (canCreate ? 1 : 0);
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, Math.max(total - 1, 0)));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            // leitor USB/Bluetooth: escreve o código e carrega Enter
            if (looksLikeBarcode(text)) { handleCode(text); return; }
            if (mode === "count" && parsed.qty == null) {
                const first = countRows[0];
                if (first) countInputs.current.get(lineKey(first.name, first.location || ""))?.focus();
                return;
            }
            if (highlight < results.length && results[highlight]) pick(results[highlight], undefined, parsed.qty);
            else if (highlight < results.length + elsewhere.length) pickElsewhere(elsewhere[highlight - results.length], parsed.qty);
            else if (canCreate) pick(undefined, parsed.term, parsed.qty);
            else if (elsewhere[0]) pickElsewhere(elsewhere[0], parsed.qty);
        } else if (e.key === "Escape") {
            setText("");
        }
    };

    const setLineQty = (key: string, value: number) =>
        setLines((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], qty: value } } : prev));
    const removeLine = (key: string) =>
        setLines((prev) => {
            const { [key]: _removed, ...rest } = prev;
            return rest;
        });

    const handleCommit = async () => {
        if (isReadOnly) {
            toast({ variant: "destructive", title: "Conta em modo leitura", description: "Contacte o suporte para reactivar o acesso completo." });
            return;
        }
        if (!firestore || !companyId || !user || lineList.length === 0 || problems.length) return;
        setSaving(true);
        try {
            const confirmed = await commitQuickStock({
                firestore,
                companyId,
                user: { id: user.id, username: user.username },
                mode,
                lines: lineList,
                note,
            });
            // Anti-roubo: faltas na contagem e saídas por perda/quebra avisam o gestor com o valor.
            if (mode === "count") {
                const short = lineList.filter((l) => l.systemStock - l.qty > 0.0001);
                if (short.length) {
                    const value = short.reduce((t, l) => t + (l.systemStock - l.qty) * (l.price || 0), 0);
                    const top = [...short].sort((a, b) => (b.systemStock - b.qty) * (b.price || 0) - (a.systemStock - a.qty) * (a.price || 0)).slice(0, 3);
                    notifyManagers({
                        type: "security",
                        always: true,
                        title: `🔎 Contagem: ${short.length} produto(s) em falta — ${value.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} MT`,
                        body: `${user.username}${isMultiLocation && location ? ` · ${locations.find((l) => l.id === location)?.name || ""}` : ""} · ${top.map((l) => `${l.name} −${fmt(l.systemStock - l.qty)}`).join(", ")}`,
                        link: links.products(short.map((l) => l.name), "Produtos em falta na contagem"),
                    });
                }
            } else if (mode === "out") {
                const value = lineList.reduce((t, l) => t + l.qty * (l.price || 0), 0);
                notifyManagers({
                    type: "security",
                    title: `📤 Saída de stock (${note.trim() || "sem motivo"}) — ${value.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} MT`,
                    body: `${user.username} · ${lineList.slice(0, 3).map((l) => `${l.name} ×${fmt(l.qty)}`).join(", ")}${lineList.length > 3 ? "…" : ""}`,
                    link: links.products(lineList.map((l) => l.name), "Saída de stock"),
                });
            }
            toast({
                title: `${current.label} registada`,
                description: confirmed
                    ? `${plural(lineList.length, "artigo actualizado", "artigos actualizados")}.`
                    : `${plural(lineList.length, "artigo guardado", "artigos guardados")} no telemóvel — sincronizam quando houver internet.`,
            });
            setLines({});
            setNote("");
            try { localStorage.setItem("majorstockx-quick-location", location); } catch { /* ignore */ }
            focusSearch();
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Não foi possível guardar", description: "Os dados continuam aqui. Tente de novo." });
        } finally {
            setSaving(false);
        }
    };

    // ---------- Count mode: whole list with inline inputs ----------
    const countRows = useMemo(() => {
        if (mode !== "count") return [];
        const base = parsed.term ? searchProducts(scoped, parsed.term, 500) : [...scoped].sort((a, b) =>
            (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name)
        );
        return base.filter((p) => {
            const done = !!lines[lineKey(p.name, p.location || "")];
            return countFilter === "all" || (countFilter === "done" ? done : !done);
        });
    }, [mode, scoped, parsed.term, lines, countFilter]);

    const countedTotal = lineList.length;
    const countScope = scoped.length;

    const focusNextCount = (fromKey: string) => {
        const keys = countRows.map((p) => lineKey(p.name, p.location || ""));
        const i = keys.indexOf(fromKey);
        const nextKey = keys[i + 1];
        if (nextKey) countInputs.current.get(nextKey)?.focus();
    };

    const locName = (id: string) => locations.find((l) => l.id === id)?.name || id || "—";

    // ---------- Render ----------
    return (
        <div className="mx-auto w-full max-w-3xl pb-40">
            <BarcodeScanner open={scanOpen} onClose={() => { setScanOpen(false); focusSearch(); }} onScan={(c) => handleCode(c, true)} />
            {/* Mode switch */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted p-1.5">
                {MODES.map((m) => {
                    const Icon = m.icon;
                    const active = m.id === mode;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setMode(m.id)}
                            className={cn(
                                "flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
                                active ? cn("bg-background shadow-sm border-2", m.tone) : "text-muted-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {m.label}
                        </button>
                    );
                })}
            </div>

            {isMultiLocation && locations.length > 0 && (
                <div className="mt-3">
                    <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger className="h-11">
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Localização" />
                        </SelectTrigger>
                        <SelectContent>
                            {locations.map((l) => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Search */}
            <div className="sticky top-0 z-20 -mx-4 mt-3 bg-background/95 px-4 py-2 backdrop-blur">
                <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={searchRef}
                        autoFocus
                        value={text}
                        onChange={(e) => { setText(e.target.value); setPicked(null); }}
                        onKeyDown={onSearchKey}
                        placeholder={mode === "count" ? "Procurar… ex.: bloco 15 x 340" : "Ex.: cimento 20"}
                        className="h-14 rounded-2xl pl-12 pr-10 text-lg sm:h-14 sm:pl-12 sm:pr-10 sm:text-lg"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="go"
                    />
                    {text && (
                        <button type="button" aria-label="Limpar" onClick={() => { setText(""); focusSearch(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    aria-label="Ler código de barras com a câmara"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setScanOpen(true)}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-card text-muted-foreground hover:text-foreground"
                >
                    <ScanBarcode className="h-6 w-6" />
                </button>
                <VoiceButton className="h-14 w-14" onInterim={setListening} onResult={handleVoice} onProblem={(m) => { setListening(""); toast({ variant: "destructive", title: "Ditado", description: m }); }} />
                </div>
                {listening && <p className="mt-1.5 px-1 text-sm italic text-muted-foreground">🎙 {listening}</p>}
                {pendingCode && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                        <span>Código <b className="tabular-nums">{pendingCode}</b> ainda sem produto — {canLink ? "escreva o nome e toque no produto certo para o associar." : "peça a quem gere o inventário para o associar."}</span>
                        <button type="button" aria-label="Cancelar" onClick={() => setPendingCode(null)} className="shrink-0 text-muted-foreground"><X className="h-4 w-4" /></button>
                    </div>
                )}
                {parsed.qty != null && parsed.term && (
                    <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                        Enter adiciona <b className="text-foreground">{fmt(parsed.qty)}</b> × {results[highlight]?.name || parsed.term}
                    </p>
                )}
            </div>

            {/* Quantity panel for the picked product */}
            {picked && (
                <div className={cn("mt-2 rounded-2xl border-2 bg-card p-4 shadow-sm", current.tone)}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-foreground">{picked.product?.name || picked.newName}</p>
                            <p className="text-xs text-muted-foreground">
                                {picked.product
                                    ? (blind ? `Conte e escreva a quantidade que está lá (${picked.product.unit || "un"})` : `Stock actual: ${fmt(picked.product.stock || 0)} ${picked.product.unit || "un"}`)
                                    : picked.from
                                        ? `Primeira entrada nesta localização — preço, unidade e categoria copiados de ${locName(picked.from.location || "")}`
                                        : "Produto novo — confirme o nome, a categoria e a unidade"}
                            </p>
                        </div>
                        <button type="button" aria-label="Cancelar" onClick={() => { setPicked(null); focusSearch(); }} className="text-muted-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {creating && (
                        <NewProductFields
                            name={newName}
                            onName={(v) => { setNewName(v); setAckDuplicate(false); }}
                            matches={matches}
                            onUseMatch={useMatch}
                            ackDuplicate={ackDuplicate}
                            onAckDuplicate={setAckDuplicate}
                            category={newCategory}
                            onCategory={(v) => { setNewCategory(v); setCategoryTouched(true); }}
                            suggestion={suggestion}
                            categories={categoryNames}
                            unit={newUnit}
                            onUnit={(v) => { setNewUnit(v); setUnitTouched(true); }}
                            units={unitNames}
                            locName={locName}
                            onEnter={() => qtyRef.current?.focus()}
                        />
                    )}

                    <div className="mt-3 flex items-center gap-2">
                        {mode !== "count" && (
                            <Button type="button" variant="outline" size="icon" className="h-14 w-14 shrink-0 rounded-xl"
                                onMouseDown={keepFocus} onClick={() => setQtyText((v) => fmt(Math.max(0, (toNumber(v) || 0) - 1)))}>
                                <Minus className="h-5 w-5" />
                            </Button>
                        )}
                        <Input
                            ref={qtyRef}
                            value={qtyText}
                            onChange={(e) => setQtyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmPicked(); } if (e.key === "Escape") { setPicked(null); focusSearch(); } }}
                            inputMode="decimal"
                            enterKeyHint="done"
                            placeholder={mode === "count" ? "Quantidade contada" : "Quantidade"}
                            className="h-14 rounded-xl text-center text-2xl font-bold sm:h-14 sm:text-2xl"
                        />
                        {mode !== "count" && (
                            <Button type="button" variant="outline" size="icon" className="h-14 w-14 shrink-0 rounded-xl"
                                onMouseDown={keepFocus} onClick={() => setQtyText((v) => fmt((toNumber(v) || 0) + 1))}>
                                <Plus className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {mode !== "count" && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {STEPS.map((s) => (
                                <button key={s} type="button" onMouseDown={keepFocus} onClick={() => setQtyText((v) => fmt((toNumber(v) || 0) + s))}
                                    className="h-10 min-w-14 rounded-lg border bg-muted/50 px-3 text-sm font-semibold">
                                    +{s}
                                </button>
                            ))}
                        </div>
                    )}

                    {picked.newName && !picked.from && (
                        <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} inputMode="decimal"
                            placeholder="Preço de venda (opcional)" className="mt-2 h-11 rounded-xl"
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmPicked(); } }} />
                    )}

                    <Button type="button" onClick={confirmPicked} className={cn("mt-3 h-12 w-full rounded-xl text-base text-white", current.solid)}>
                        <Check className="mr-2 h-5 w-5" /> Adicionar
                    </Button>
                </div>
            )}

            {/* Search results (entry / exit) */}
            {!picked && mode !== "count" && parsed.term && (
                <div className="mt-2 overflow-hidden rounded-2xl border bg-card">
                    {results.map((p, i) => {
                        const inLot = lines[lineKey(p.name, p.location || "")];
                        return (
                            <button key={p.instanceId} type="button" onClick={() => pick(p, undefined, parsed.qty)}
                                onMouseEnter={() => setHighlight(i)}
                                className={cn("flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-0", i === highlight && "bg-muted")}>
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {p.category || "Geral"}{isMultiLocation && !location ? ` · ${locName(p.location || "")}` : ""}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="font-semibold tabular-nums">{fmt(p.stock || 0)} <span className="text-xs font-normal text-muted-foreground">{p.unit || "un"}</span></p>
                                    {inLot && <p className="text-xs text-primary">no lote: {fmt(inLot.qty)}</p>}
                                </div>
                            </button>
                        );
                    })}
                    {elsewhere.map((p, i) => (
                        <button key={`else-${p.instanceId}`} type="button" onClick={() => pickElsewhere(p, parsed.qty)}
                            onMouseEnter={() => setHighlight(results.length + i)}
                            className={cn("flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left", highlight === results.length + i && "bg-muted")}>
                            <div className="min-w-0">
                                <p className="truncate font-medium">{p.name}</p>
                                <p className="text-xs text-amber-600">Ainda não existe nesta localização · existe em {locName(p.location || "")}</p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-primary">Trazer para aqui</span>
                        </button>
                    ))}
                    {canCreate && (
                        <button type="button" onClick={() => pick(undefined, parsed.term, parsed.qty)}
                            onMouseEnter={() => setHighlight(results.length + elsewhere.length)}
                            className={cn("flex w-full items-center gap-2 px-4 py-3 text-left text-sm", highlight === results.length + elsewhere.length && "bg-muted")}>
                            <Sparkles className="h-4 w-4 text-primary" /> Criar produto novo <b>“{cleanProductName(parsed.term)}”</b>
                            {(() => { const sg = suggestCategory(parsed.term, categoryNames, liveProducts); return sg.source !== "none" ? <span className="text-xs text-muted-foreground">· {sg.category}</span> : null; })()}
                        </button>
                    )}
                    {results.length === 0 && !canCreate && elsewhere.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum artigo encontrado.</p>}
                </div>
            )}

            {/* Count mode: full list, type the number, Enter goes to the next */}
            {mode === "count" && !picked && (
                <div className="mt-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs font-medium">
                            {([["todo", "Por contar"], ["done", "Contados"], ["all", "Todos"]] as const).map(([id, label]) => (
                                <button key={id} type="button" onClick={() => setCountFilter(id)}
                                    className={cn("rounded-lg px-3 py-1.5", countFilter === id ? "bg-background shadow-sm" : "text-muted-foreground")}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">{countedTotal} / {countScope} contados</p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-blue-600 transition-all" style={{ width: `${countScope ? (countedTotal / countScope) * 100 : 0}%` }} />
                    </div>

                    <div className="mt-2 overflow-hidden rounded-2xl border bg-card">
                        {countRows.slice(0, countLimit).map((p) => {
                            const key = lineKey(p.name, p.location || "");
                            const line = lines[key];
                            const diff = line ? line.qty - (p.stock || 0) : 0;
                            return (
                                <div key={p.instanceId} className={cn("flex items-center gap-3 border-b px-4 py-2.5 last:border-0", line && "bg-blue-500/5")}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {blind ? (line ? `Contado: ${fmt(line.qty)} ${p.unit || "un"}` : `Contar em ${p.unit || "un"}`) : `Sistema: ${fmt(p.stock || 0)} ${p.unit || "un"}`}
                                            {!blind && line && diff !== 0 && (
                                                <span className={cn("ml-2 font-semibold", diff > 0 ? "text-emerald-600" : "text-red-600")}>
                                                    {diff > 0 ? "+" : ""}{fmt(diff)}
                                                </span>
                                            )}
                                            {!blind && line && diff === 0 && <span className="ml-2 font-semibold text-emerald-600">✓ certo</span>}
                                        </p>
                                    </div>
                                    {!blind && (
                                    <button type="button" title="Igual ao sistema" onClick={() => { addLine(lineFromProduct(p, p.stock || 0), true); focusNextCount(key); }}
                                        className="h-10 shrink-0 rounded-lg border px-2 text-xs text-muted-foreground">
                                        = {fmt(p.stock || 0)}
                                    </button>
                                    )}
                                    <input
                                        ref={(el) => { if (el) countInputs.current.set(key, el); else countInputs.current.delete(key); }}
                                        inputMode="decimal"
                                        enterKeyHint="next"
                                        placeholder="—"
                                        defaultValue={line ? fmt(line.qty) : ""}
                                        key={line ? `${key}-${line.qty}` : key}
                                        onBlur={(e) => {
                                            const raw = e.target.value.trim();
                                            if (raw === "") { if (line) removeLine(key); return; }
                                            const q = toNumber(raw);
                                            if (q >= 0) addLine(lineFromProduct(p, q), true);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); focusNextCount(key); }
                                        }}
                                        className="h-11 w-24 shrink-0 rounded-lg border-2 bg-background px-2 text-center text-lg font-bold outline-none focus:border-blue-600"
                                    />
                                </div>
                            );
                        })}
                        {countRows.length === 0 && (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                                {countFilter === "todo" && countScope > 0 ? "Tudo contado 🎉" : "Nenhum artigo."}
                            </p>
                        )}
                    </div>
                    {countRows.length > countLimit && (
                        <Button variant="ghost" className="mt-2 w-full" onClick={() => setCountLimit((l) => l + COUNT_PAGE)}>
                            Mostrar mais ({countRows.length - countLimit})
                        </Button>
                    )}
                </div>
            )}

            {/* The batch being built (entry / exit) */}
            {mode !== "count" && lineList.length > 0 && (
                <div className="mt-5">
                    <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lote a registar ({lineList.length})</p>
                    <div className="overflow-hidden rounded-2xl border bg-card">
                        {lineList.map((l) => {
                            const after = resultingStock(mode, l);
                            return (
                                <div key={l.key} className={cn("flex items-center gap-3 border-b px-4 py-2.5 last:border-0", after < 0 && "bg-red-500/10")}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {l.name} {l.isNew && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">NOVO</span>}
                                        </p>
                                        <p className={cn("text-xs", after < 0 ? "font-semibold text-red-600" : "text-muted-foreground")}>
                                            {fmt(l.systemStock)} → {fmt(after)} {l.unit}{after < 0 && " · stock insuficiente"}
                                        </p>
                                    </div>
                                    <input
                                        inputMode="decimal"
                                        defaultValue={fmt(l.qty)}
                                        key={`${l.key}-${l.qty}`}
                                        onBlur={(e) => {
                                            const q = toNumber(e.target.value);
                                            if (q > 0) setLineQty(l.key, q); else removeLine(l.key);
                                        }}
                                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                        className="h-10 w-20 shrink-0 rounded-lg border-2 bg-background px-2 text-center font-bold outline-none focus:border-primary"
                                    />
                                    <button type="button" aria-label="Remover" onClick={() => removeLine(l.key)} className="shrink-0 p-1 text-muted-foreground">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {mode !== "count" && lineList.length === 0 && !parsed.term && !picked && (
                <div className="mt-6 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Como usar</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>Escreva parte do nome e a quantidade: <b>cimento 20</b>, <b>bloco 15 x 200</b> — Enter adiciona ao lote.</li>
                        <li>Ou toque no artigo e use os botões +1, +10, +100.</li>
                        <li>Junte vários artigos e confirme tudo de uma vez no fim.</li>
                        <li>O lote fica guardado no aparelho mesmo que a página feche.</li>
                    </ul>
                    <Link href="/inventory/fast-entry" className="mt-3 inline-flex items-center gap-1.5 text-xs underline">
                        <Sheet className="h-3.5 w-3.5" /> Preferir o modo folha de cálculo
                    </Link>
                </div>
            )}

            {/* Sticky confirm bar */}
            {lineList.length > 0 && (
                <div className={cn("fixed inset-x-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:bottom-0 md:left-64", !keyboardInset && "bottom-16")} style={keyboardInset ? { bottom: keyboardInset } : undefined}>
                    <div className="mx-auto flex max-w-3xl flex-col gap-2">
                        {mode === "out" && (
                            <div className="flex gap-1.5 overflow-x-auto overflow-y-hidden pb-0.5">
                                {OUT_REASONS.map((r) => (
                                    <button key={r} type="button" onClick={() => setNote(note === r ? "" : r)}
                                        className={cn("h-8 shrink-0 rounded-full border px-3 text-xs", note === r ? "border-orange-600 bg-orange-600 text-white" : "bg-muted/50")}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Input value={note} onChange={(e) => setNote(e.target.value)}
                                placeholder={mode === "in" ? "Nota (fornecedor, guia…)" : mode === "out" ? "Motivo" : "Nota (opcional)"}
                                className="h-12 flex-1 rounded-xl" />
                            <Button type="button" onClick={handleCommit} disabled={saving || problems.length > 0}
                                className={cn("h-12 shrink-0 rounded-xl px-5 text-base text-white", current.solid)}>
                                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                                {current.verb} ({lineList.length})
                            </Button>
                        </div>
                        {problems.length > 0 && (
                            <p className="text-xs font-medium text-red-600">Há {plural(problems.length, "artigo", "artigos")} com saída maior que o stock. Corrija antes de confirmar.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
