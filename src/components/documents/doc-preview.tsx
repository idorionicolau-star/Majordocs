"use client";

import { useEffect, useRef, useState } from "react";
import type { Company } from "@/lib/types";
import { docTitle, docTotals, isQuoteLike, itemSubtotal, type DocModel } from "@/lib/doc-model";
import { hexToRgb, isDecor, readableOn, rgbToHex, themeById, tint, type DocDecor, type RGB } from "@/lib/doc-themes";
import { formatCurrency } from "@/lib/utils";

const PAGE_W = 794; // A4 a 96 dpi
const PAGE_H = 1123;
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
/** milímetros do PDF → pixels da página (A4 = 210 mm = 794 px) */
const mm = (v: number) => (v * PAGE_W) / 210;
/** tamanho de letra do PDF (pontos) → pixels */
const pt = (v: number) => v * 1.333;
const CHARCOAL: RGB = [38, 38, 48];
const date = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d.getTime()) ? d.toLocaleDateString("pt-PT") : ""; };

/**
 * Pré-visualização do documento em HTML, à escala do ecrã. Funciona em todos os aparelhos (um PDF dentro de uma
 * moldura não aparece nos telemóveis) e actualiza-se a cada tecla. O PDF final segue o mesmo tema e cores.
 */
export function DocPreview({ model, company }: { model: DocModel; company: Company | null }) {
    const box = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    useEffect(() => {
        const el = box.current;
        if (!el) return;
        const fit = () => setScale(Math.max(0.2, Math.min(1.2, el.clientWidth / PAGE_W)));
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const st = model.style || {};
    const theme = themeById(st.theme);
    const accent = hexToRgb(st.accent) || theme.defaultAccent;
    const on = readableOn(accent);
    const soft = tint(accent, 0.92);
    const serif = theme.font === "times";
    const t = docTotals({ items: model.items, discount: model.discount, vat: model.vat, paid: model.paid });
    const quote = isQuoteLike(model.type);
    const items = model.items.filter((i) => i.description.trim() || Number(i.unitPrice));
    const D = theme.header;
    const decor = isDecor(D) ? D : null;
    const headBand = !decor && (theme.header === "band" || theme.header === "block");
    const hl = theme.highlight || ([250, 204, 21] as RGB);
    const company_ = [company?.taxId ? `NUIT: ${company.taxId}` : "", company?.address, company?.phone, company?.email].filter(Boolean);

    const logo = st.showLogo !== false && company?.logoUrl ? <img src={company.logoUrl} alt="" style={{ maxHeight: 56, maxWidth: 160, objectFit: "contain" }} /> : null;
    // no "cartão" o cabeçalho da tabela enche o cartão branco que está sobre a faixa de cor
    const th = { padding: theme.header === "card" ? "14px 10px" : "8px 10px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 };
    const headStyle = decor === "card" ? { background: "#fff", color: css(accent) }
        : decor === "frame" ? { background: css(hl), color: css(readableOn(hl)) }
            : decor === "stripes" ? { background: css(CHARCOAL), color: "#fff" }
                : decor === "hatch" ? { background: `repeating-linear-gradient(-45deg, #fff 0 5px, ${css([222, 222, 230])} 5px 6px)`, color: css(accent), borderTop: `1.5px solid ${css(accent)}`, borderBottom: `1.5px solid ${css(accent)}` }
                    : theme.table === "filled" ? { background: css(accent), color: css(on) } : theme.table === "striped" ? { background: css(soft), color: css(accent) } : { borderBottom: `2px solid ${css(accent)}`, color: css(accent) };
    // onde começa o conteúdo e as margens, iguais às do PDF
    const top = decor ? ({ wave: 80, card: 64.5, frame: 86, stripes: 50, hatch: 55, corner: 56, circles: 56 } as Record<DocDecor, number>)[decor] : 0;
    const side = decor === "frame" ? mm(20) : 48;
    const showBoxes = decor !== "card" && decor !== "frame";

    return (
        <div ref={box} data-testid="doc-preview" className="w-full overflow-hidden rounded-xl border bg-zinc-200/60 dark:bg-zinc-800/60" style={{ height: PAGE_H * scale + 2 }}>
            <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left", background: "#fff", color: "#18181b", position: "relative", fontFamily: serif ? "Georgia, 'Times New Roman', serif" : "Inter, Helvetica, Arial, sans-serif", fontSize: 13, overflow: "hidden" }}>
                {theme.header === "sidebar" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: css(accent) }} />}
                {st.watermark && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}><span style={{ transform: "rotate(-35deg)", fontSize: 110, fontWeight: 800, color: "rgba(0,0,0,0.07)", letterSpacing: 8 }}>{st.watermark}</span></div>}

                {decor && <DecorLayer d={decor} accent={accent} hl={hl} />}
                {decor && <DecorHeader d={decor} model={model} company={company} accent={accent} hl={hl} logo={st.showLogo !== false ? company?.logoUrl : undefined} total={formatCurrency(t.total)} quote={quote} />}

                {/* cabeçalho */}
                {!decor && <div style={{ padding: headBand ? "36px 48px 28px" : "44px 48px 8px", background: headBand ? css(accent) : undefined, color: headBand ? css(on) : undefined, textAlign: theme.header === "centered" ? "center" : undefined, marginLeft: theme.header === "sidebar" ? 14 : 0 }}>
                    <div style={{ display: "flex", justifyContent: theme.header === "centered" ? "center" : "space-between", alignItems: "flex-start", gap: 24, flexDirection: theme.header === "centered" ? "column" : "row" }}>
                        <div style={{ display: "flex", gap: 14, alignItems: "center", flexDirection: theme.header === "centered" ? "column" : "row" }}>
                            {logo}
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800 }}>{company?.name || "A sua empresa"}</div>
                                <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.5 }}>{company_.map((l, i) => <div key={i}>{l}</div>)}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: theme.header === "centered" ? "center" : "right" }}>
                            <div style={{ fontSize: 26, fontWeight: 800, textTransform: "uppercase", color: headBand ? undefined : css(accent) }}>{docTitle(model.type)}</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>N.º {model.number || "—"}</div>
                        </div>
                    </div>
                </div>}
                {!decor && !headBand && <div style={{ margin: "10px 48px 0", marginLeft: theme.header === "sidebar" ? 62 : 48, borderTop: theme.header === "centered" ? `3px double ${css(accent)}` : `1.5px solid ${css(accent)}` }} />}

                <div style={{ position: "relative", padding: decor ? `${mm(top)}px ${side}px 0` : "22px 48px 0", marginLeft: theme.header === "sidebar" ? 14 : 0 }}>
                    {/* datas e cliente */}
                    {showBoxes && <div style={{ display: "flex", gap: 20, marginBottom: decor === "hatch" ? 10 : 22 }}>
                        <div style={{ flex: 1, padding: 12, borderRadius: theme.boxes === "boxed" ? 6 : 0, background: theme.boxes === "boxed" ? "#f4f4f5" : undefined, borderLeft: theme.boxes === "bar" ? `4px solid ${css(accent)}` : undefined, paddingLeft: theme.boxes === "bar" ? 12 : 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: css(accent), letterSpacing: 1, marginBottom: 4 }}>DETALHES</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6 }}>Data: {date(model.issueDate)}<br />{model.dueDate ? <>{quote ? "Validade" : "Vencimento"}: {date(model.dueDate)}<br /></> : null}{model.operator ? <>Operador: {model.operator}</> : null}</div>
                        </div>
                        <div style={{ flex: 1, padding: 12, borderRadius: theme.boxes === "boxed" ? 6 : 0, background: theme.boxes === "boxed" ? "#f4f4f5" : undefined, borderLeft: theme.boxes === "bar" ? `4px solid ${css(accent)}` : undefined, paddingLeft: theme.boxes === "bar" ? 12 : 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: css(accent), letterSpacing: 1, marginBottom: 4 }}>CLIENTE</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6 }}><b>{model.client.name || "Consumidor Final"}</b>{[model.client.taxId && `NUIT: ${model.client.taxId}`, model.client.address, model.client.phone, model.client.email].filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}</div>
                        </div>
                    </div>}
                    {decor === "hatch" && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                            <div style={{ width: "calc(50% - 10px)", background: css(accent), color: css(on), display: "flex", justifyContent: "space-between", padding: "8px 14px", fontWeight: 800 }}>
                                <span style={{ fontSize: 10.5, letterSpacing: 0.5 }}>{(quote ? "TOTAL" : "TOTAL A PAGAR")}</span><span style={{ fontSize: 14 }}>{formatCurrency(t.total)}</span>
                            </div>
                        </div>
                    )}

                    {/* artigos */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: theme.table === "grid" ? `1px solid ${css(accent)}` : undefined }}>
                        <thead><tr style={headStyle}>
                            <th style={th}>Artigo / Descrição</th><th style={{ ...th, textAlign: "right" }}>Qtd.</th><th style={{ ...th, textAlign: "right" }}>Preço unit.</th>{items.some((i) => i.discountPct) && <th style={{ ...th, textAlign: "right" }}>Desc.</th>}<th style={{ ...th, textAlign: "right" }}>Subtotal</th>
                        </tr></thead>
                        <tbody>
                            {(items.length ? items : [{ id: "x", description: "", quantity: 0, unit: "", unitPrice: 0 }]).map((i, n) => (
                                <tr key={i.id} style={{ background: theme.table === "striped" && n % 2 ? "#fafafa" : undefined, borderBottom: theme.table === "minimal" ? "none" : "1px solid #e4e4e7", border: theme.table === "grid" ? "1px solid #d4d4d8" : undefined }}>
                                    <td style={{ padding: "8px 10px" }}>{i.description || <span style={{ color: "#a1a1aa" }}>—</span>}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>{i.quantity} {i.unit}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>{formatCurrency(i.unitPrice)}</td>
                                    {items.some((x) => x.discountPct) && <td style={{ padding: "8px 10px", textAlign: "right" }}>{i.discountPct ? `${i.discountPct}%` : ""}</td>}
                                    <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>{formatCurrency(itemSubtotal(i))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* totais */}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                        <div style={{ width: 280, fontSize: 12.5 }}>
                            <Row l="Subtotal" v={formatCurrency(t.subtotal)} />
                            {t.discount > 0 && <Row l="Desconto" v={`-${formatCurrency(t.discount)}`} />}
                            {t.vat > 0 && <Row l={`IVA${model.vatPct ? ` (${model.vatPct}%)` : ""}`} v={formatCurrency(t.vat)} />}
                            <div style={{ marginTop: 6, padding: theme.totals === "block" ? "10px 12px" : "8px 0 0", background: theme.totals === "block" ? css(accent) : undefined, color: theme.totals === "block" ? css(on) : css(accent), borderTop: theme.totals === "line" ? `2px solid ${css(accent)}` : undefined, borderRadius: theme.totals === "block" ? 6 : 0, display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800 }}>
                                <span>{quote ? "Total" : "Total a pagar"}</span><span>{formatCurrency(t.total)}</span>
                            </div>
                        </div>
                    </div>

                    {(model.notes || model.paymentTerms || model.paymentMethod) && (
                        <div style={{ marginTop: 18, fontSize: 11.5, lineHeight: 1.6, color: "#3f3f46" }}>
                            {model.paymentMethod && <div><b>Pagamento:</b> {model.paymentMethod}</div>}
                            {model.paymentTerms && <div><b>Condições:</b> {model.paymentTerms}</div>}
                            {model.notes && <div><b>Notas:</b> {model.notes}</div>}
                        </div>
                    )}

                    {st.showSignatures !== false && st.signaturePlace && <div style={{ marginTop: 24, fontSize: 10, color: "#71717a", textAlign: st.showClientSignature ? "left" : "center" }}>{st.signaturePlace}, {date(model.issueDate)}</div>}
                    {st.showSignatures !== false && (
                        <div style={{ display: "flex", gap: 60, marginTop: st.signaturePlace ? 12 : 56, padding: st.showClientSignature ? "0 20px" : "0 32%" }}>
                            {[{ l: "A EMPRESA", s: st.companySignature || company?.signatureUrl }, ...(st.showClientSignature ? [{ l: "O CLIENTE", s: st.clientSignature }] : [])].map((x, k) => x.l ? (
                                <div key={x.l} style={{ flex: 1, textAlign: "center" }}>
                                    <div style={{ height: 56, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>{x.s && <img src={x.s} alt="" style={{ maxHeight: 54, maxWidth: "100%" }} />}</div>
                                    <div style={{ borderTop: "1px solid #71717a", paddingTop: 4, fontSize: 9, color: "#71717a", letterSpacing: 1 }}>{x.l}</div>
                                </div>
                            ) : <div key={k} style={{ flex: 1 }} />)}
                        </div>
                    )}
                </div>

                {decor ? <DecorFooter d={decor} text={st.footerNote?.trim() || `${company?.name || "MajorStockX"} © ${new Date().getFullYear()} · Processado por computador (MajorStockX)`} accent={accent} hl={hl} /> : (
                    <div style={{ position: "absolute", left: 48, right: 48, bottom: 28, borderTop: "1px solid #e4e4e7", paddingTop: 6, fontSize: 9.5, color: "#71717a", display: "flex", justifyContent: "space-between" }}>
                        <span>{company?.name}{st.footerNote ? ` · ${st.footerNote}` : ""}</span><span>Pág. 1</span>
                    </div>
                )}
            </div>
        </div>
    );
}

const Row = ({ l, v }: { l: string; v: string }) => <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#52525b" }}><span>{l}</span><span>{v}</span></div>;
export const accentOf = (hex?: string, fallback: RGB = [24, 24, 27]) => rgbToHex(hexToRgb(hex) || fallback);

// ---------- temas com desenho próprio: as mesmas formas e medidas do PDF (lib/doc-pdf.ts), em milímetros ----------

/** As formas de cor (ondas, faixas, moldura…) por trás do conteúdo. */
function DecorLayer({ d, accent, hl }: { d: DocDecor; accent: RGB; hl: RGB }) {
    const a = css(accent), t = (k: number) => css(tint(accent, k));
    return (
        <svg viewBox="0 0 210 297" width={PAGE_W} height={PAGE_H} style={{ position: "absolute", inset: 0 }} aria-hidden>
            <defs>
                <pattern id="hatch" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="2.2" stroke="rgb(205,205,214)" strokeWidth="0.3" />
                </pattern>
            </defs>
            {d === "wave" && <>
                <path d="M0 0 L210 0 L210 24 C130.2 30 63 96 0 88 Z" fill={t(0.86)} />
                <path d="M0 0 L134.4 0 C96.6 10 79.8 62 0 72 Z" fill={a} />
                <path d="M58.8 297 C130.2 293 178.5 277 210 273 L210 297 Z" fill={t(0.86)} />
                <path d="M115.5 297 C163.8 294 193.2 285 210 282 L210 297 Z" fill={a} />
            </>}
            {d === "card" && <>
                <rect x="0" y="0" width="210" height="74" fill={a} />
                <circle cx="202" cy="-6" r="46" fill={t(0.12)} />
                <circle cx="168" cy="62" r="18" fill={t(0.2)} />
                <rect x="15.9" y="64.4" width="180" height="15" rx="4" fill="rgb(205,208,216)" />
                <rect x="15" y="63" width="180" height="15" rx="4" fill="#fff" />
                <rect x="33" y="277" width="144" height="8" rx="4" fill={a} />
            </>}
            {d === "frame" && <>
                <rect x="0" y="0" width="210" height="78" fill={a} />
                <rect x="0" y="78" width="12" height="219" fill={a} />
                <rect x="198" y="78" width="12" height="219" fill={a} />
                <rect x="0" y="283" width="210" height="14" fill={a} />
            </>}
            {d === "stripes" && <>
                <rect x="0" y="0" width="210" height="14" fill={css(CHARCOAL)} />
                <polygon points="0,0 46,0 36,14 0,14" fill={a} />
                <polygon points="50,0 58,0 48,14 40,14" fill={t(0.35)} />
                <polygon points="62,0 66,0 56,14 52,14" fill={a} />
                <rect x="115.5" y="14" width="94.5" height="1.3" fill={a} />
                <rect x="0" y="285" width="210" height="12" fill={css(CHARCOAL)} />
                <polygon points="170,285 210,285 210,297 162,297" fill={a} />
                <polygon points="158,285 164,285 156,297 150,297" fill={t(0.35)} />
            </>}
            {d === "hatch" && <>
                <rect x="0" y="0" width="210" height="10" fill="url(#hatch)" />
                <rect x="105" y="10" width="105" height="0.9" fill={a} />
                <rect x="0" y="289" width="210" height="8" fill="url(#hatch)" />
                <rect x="0" y="288.1" width="105" height="0.9" fill={a} />
            </>}
            {d === "corner" && <>
                <polygon points="112,0 210,0 210,80" fill={t(0.8)} />
                <polygon points="142,0 210,0 210,56" fill={a} />
                <polygon points="0,267 55,297 0,297" fill={t(0.8)} />
                <polygon points="0,277 38,297 0,297" fill={a} />
            </>}
            {d === "circles" && <>
                <circle cx="204" cy="2" r="44" fill={t(0.86)} />
                <circle cx="164" cy="-8" r="22" fill={t(0.6)} />
                <circle cx="207" cy="44" r="15" fill={a} />
                <circle cx="8" cy="303" r="30" fill={t(0.86)} />
                <circle cx="32" cy="305" r="13" fill={t(0.6)} />
                <circle cx="54" cy="300" r="6" fill={a} />
            </>}
        </svg>
    );
}

/** Texto posicionado como no PDF: (x, y) em mm, y na linha de base, tamanho em pontos. */
function T({ x, y, size, bold, italic, color, align = "left", spacing, max, children }: { x: number; y: number; size: number; bold?: boolean; italic?: boolean; color: string; align?: "left" | "right" | "center"; spacing?: number; max?: number; children: React.ReactNode }) {
    const px = pt(size);
    const pos: React.CSSProperties = align === "right" ? { right: PAGE_W - mm(x) } : align === "center" ? { left: mm(x), transform: "translateX(-50%)" } : { left: mm(x) };
    return (
        <div style={{ position: "absolute", top: mm(y) - px * 0.82, ...pos, fontSize: px, lineHeight: 1, fontWeight: bold ? 700 : 400, fontStyle: italic ? "italic" : undefined, color, whiteSpace: "nowrap", letterSpacing: spacing, maxWidth: max ? mm(max) : undefined, overflow: "hidden", textOverflow: "ellipsis", textAlign: align }}>
            {children}
        </div>
    );
}

function DecorHeader({ d, model, company, accent, hl, logo, total, quote }: { d: DocDecor; model: DocModel; company: Company | null; accent: RGB; hl: RGB; logo?: string; total: string; quote: boolean }) {
    const on = readableOn(accent);
    const onC = css(on), sub = css(tint(on, on[0] === 255 ? 0.22 : 0.35)), dark = "#18181b", grey = "#71717a", acc = css(accent);
    const title = docTitle(model.type), titleU = title.toUpperCase(), num = `N.º ${model.number || "—"}`;
    const lines = [company?.address, company?.taxId ? `NUIT: ${company.taxId}` : "", [company?.phone, company?.email].filter(Boolean).join(" · ")].filter(Boolean) as string[];
    const client = [model.client.taxId ? `NUIT: ${model.client.taxId}` : "", model.client.address || "", [model.client.phone, model.client.email].filter(Boolean).join(" · ")].filter(Boolean);
    const Logo = ({ x, y, w, h, white }: { x: number; y: number; w: number; h: number; white?: boolean }) => logo ? (
        <div style={{ position: "absolute", left: mm(x), top: mm(y), width: mm(w), height: mm(h), display: "flex", alignItems: "center", background: white ? "#fff" : undefined, borderRadius: 4, padding: white ? 3 : 0 }}>
            <img src={logo} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
    ) : null;
    const tx = logo ? 46 : 15;
    const Company = ({ x, y, c, s, max }: { x: number; y: number; c: string; s: string; max: number }) => <>
        <T x={x} y={y + 6} size={15} bold color={c} max={max}>{company?.name || "A sua empresa"}</T>
        {lines.map((l, i) => <T key={i} x={x} y={y + 11 + i * 3.8} size={8.5} color={s} max={max}>{l}</T>)}
    </>;
    if (d === "wave") return <>
        <Logo x={15} y={11} w={26} h={15} white />
        <Company x={tx} y={9} c={onC} s={sub} max={74 - (tx - 15)} />
        <T x={195} y={21} size={22} bold color={acc} align="right">{titleU}</T>
        <T x={195} y={28} size={10.5} color={grey} align="right">{num}</T>
    </>;
    if (d === "card") return <>
        <Logo x={15} y={11} w={26} h={15} white />
        <Company x={tx} y={9} c={onC} s={sub} max={100 - (tx - 15)} />
        <T x={195} y={19} size={20} bold color={onC} align="right">{titleU}</T>
        <T x={195} y={26} size={10.5} color={onC} align="right">{num}</T>
        <T x={15} y={40} size={7.5} color={sub}>{quote ? "PROPOSTA PARA" : "FATURADO A"}</T>
        <T x={15} y={46.5} size={12.5} bold color={onC} max={95}>{model.client.name || "Consumidor Final"}</T>
        {client.slice(0, 3).map((l, i) => <T key={i} x={15} y={51.5 + i * 4} size={8.5} color={sub} max={95}>{l}</T>)}
        <T x={model.dueDate ? 165 : 195} y={40} size={7.5} color={sub} align="right">DATA</T>
        <T x={model.dueDate ? 165 : 195} y={46.5} size={10.5} bold color={onC} align="right">{date(model.issueDate)}</T>
        {model.dueDate && <><T x={195} y={40} size={7.5} color={sub} align="right">{quote ? "VÁLIDA ATÉ" : "VENCIMENTO"}</T><T x={195} y={46.5} size={10.5} bold color={onC} align="right">{date(model.dueDate)}</T></>}
    </>;
    if (d === "frame") return <>
        <div style={{ position: "absolute", left: mm(20), top: mm(12), height: mm(8), padding: `0 ${mm(4)}px`, background: css(hl), display: "flex", alignItems: "center", fontSize: pt(9), fontWeight: 700, letterSpacing: 3, color: dark }}>{titleU}</div>
        <T x={20} y={27} size={8.5} color={sub}>{num}</T>
        <T x={20} y={31} size={8.5} color={sub}>Data: {date(model.issueDate)}{model.dueDate ? ` · ${quote ? "Válida até" : "Vencimento"}: ${date(model.dueDate)}` : ""}</T>
        <T x={20} y={41} size={7.5} color={sub}>{quote ? "PROPOSTA PARA" : "FATURADO A"}</T>
        <T x={20} y={48} size={15} bold color={onC} max={100}>{model.client.name || "Consumidor Final"}</T>
        {client.slice(0, 3).map((l, i) => <T key={i} x={20} y={53.5 + i * 4} size={8.5} color={sub} max={100}>{l}</T>)}
        <div style={{ position: "absolute", left: mm(20), top: mm(67), width: mm(70), borderTop: `1px solid ${sub}` }} />
        <T x={190} y={16} size={12} bold color={onC} align="right">{company?.name || "A sua empresa"}</T>
        {lines.map((l, i) => <T key={i} x={190} y={20.5 + i * 3.6} size={7.5} color={sub} align="right" max={70}>{l}</T>)}
        <T x={190} y={55} size={10} color={onC} align="right">{quote ? "Total" : "Total a pagar"}</T>
        <T x={190} y={64} size={20} bold color={css(hl)} align="right">{total}</T>
    </>;
    if (d === "stripes") return <>
        <Logo x={15} y={21} w={28} h={16} />
        <Company x={logo ? 47 : 15} y={20} c={dark} s={grey} max={100} />
        <T x={195} y={33} size={20} bold color={css(CHARCOAL)} align="right" spacing={4}>{titleU}</T>
        <T x={195} y={40} size={10.5} color={acc} align="right">{num}</T>
    </>;
    if (d === "hatch") return <>
        {logo ? <Logo x={15} y={17} w={26} h={15} /> : (
            <div style={{ position: "absolute", left: mm(15), top: mm(18), width: mm(14), height: mm(14), borderRadius: "50%", background: acc, color: onC, display: "flex", alignItems: "center", justifyContent: "center", fontSize: pt(9), fontWeight: 700 }}>
                {(company?.name || "M").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
            </div>
        )}
        <Company x={logo ? 45 : 33} y={17} c={dark} s={grey} max={90} />
        <div style={{ position: "absolute", right: PAGE_W - mm(195), top: mm(18), width: mm(62), borderTop: `3px solid ${acc}` }} />
        <T x={195} y={31} size={24} bold color={dark} align="right"><span style={{ color: acc }}>.</span>{title}</T>
        <T x={195} y={38} size={10.5} color={grey} align="right">{num}</T>
        <div style={{ position: "absolute", left: mm(15), right: PAGE_W - mm(195), top: mm(48), borderTop: `2px solid ${acc}` }} />
        <div style={{ position: "absolute", left: mm(15), right: PAGE_W - mm(195), top: mm(49.2), borderTop: "1px solid #e4e4e7" }} />
    </>;
    // corner e circles: empresa em cima, título grande à esquerda
    return <>
        <Logo x={15} y={14} w={28} h={16} />
        <Company x={logo ? 47 : 15} y={13} c={dark} s={grey} max={90} />
        <T x={15} y={41} size={26} bold color={acc}>{d === "corner" ? titleU : title}</T>
        <T x={15} y={48} size={10.5} color={grey}>{num}</T>
    </>;
}

function DecorFooter({ d, text, accent, hl }: { d: DocDecor; text: string; accent: RGB; hl: RGB }) {
    const on = css(readableOn(accent)), grey = "#71717a";
    if (d === "card") return <><T x={105} y={282.2} size={8.5} bold color={on} align="center">Obrigado pela preferência!</T><T x={105} y={291} size={7.5} color={grey} align="center" max={170}>{text}</T></>;
    if (d === "frame") return <><T x={20} y={279.5} size={7.5} color={grey} max={150}>{text}</T><T x={105} y={291.5} size={9} italic color={css(hl)} align="center">Obrigado pela preferência!</T></>;
    if (d === "stripes") return <T x={15} y={292.4} size={7.5} color="rgb(230,230,235)" max={130}>{text}</T>;
    if (d === "hatch") return <T x={15} y={285.5} size={7.5} color={grey} max={160}>{text}</T>;
    if (d === "corner" || d === "circles") return <T x={195} y={288.5} size={7.5} color={grey} align="right" max={130}>{text}</T>;
    return <T x={15} y={288.5} size={7.5} color={grey} max={120}>{text}</T>;
}
