"use client";

import { useEffect, useRef, useState } from "react";
import type { Company } from "@/lib/types";
import { docTitle, docTotals, isQuoteLike, itemSubtotal, type DocModel } from "@/lib/doc-model";
import { hexToRgb, readableOn, rgbToHex, themeById, tint, type RGB } from "@/lib/doc-themes";
import { formatCurrency } from "@/lib/utils";

const PAGE_W = 794; // A4 a 96 dpi
const PAGE_H = 1123;
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
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
    const headBand = theme.header === "band" || theme.header === "block";
    const company_ = [company?.taxId ? `NUIT: ${company.taxId}` : "", company?.address, company?.phone, company?.email].filter(Boolean);

    const logo = st.showLogo !== false && company?.logoUrl ? <img src={company.logoUrl} alt="" style={{ maxHeight: 56, maxWidth: 160, objectFit: "contain" }} /> : null;
    const th = { padding: "8px 10px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 };
    const headStyle = theme.table === "filled" ? { background: css(accent), color: css(on) } : theme.table === "striped" ? { background: css(soft), color: css(accent) } : { borderBottom: `2px solid ${css(accent)}`, color: css(accent) };

    return (
        <div ref={box} className="w-full overflow-hidden rounded-xl border bg-zinc-200/60 dark:bg-zinc-800/60" style={{ height: PAGE_H * scale + 2 }}>
            <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left", background: "#fff", color: "#18181b", position: "relative", fontFamily: serif ? "Georgia, 'Times New Roman', serif" : "Inter, Helvetica, Arial, sans-serif", fontSize: 13, overflow: "hidden" }}>
                {theme.header === "sidebar" && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: css(accent) }} />}
                {st.watermark && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}><span style={{ transform: "rotate(-35deg)", fontSize: 110, fontWeight: 800, color: "rgba(0,0,0,0.07)", letterSpacing: 8 }}>{st.watermark}</span></div>}

                {/* cabeçalho */}
                <div style={{ padding: headBand ? "36px 48px 28px" : "44px 48px 8px", background: headBand ? css(accent) : undefined, color: headBand ? css(on) : undefined, textAlign: theme.header === "centered" ? "center" : undefined, marginLeft: theme.header === "sidebar" ? 14 : 0 }}>
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
                </div>
                {!headBand && <div style={{ margin: "10px 48px 0", marginLeft: theme.header === "sidebar" ? 62 : 48, borderTop: theme.header === "centered" ? `3px double ${css(accent)}` : `1.5px solid ${css(accent)}` }} />}

                <div style={{ padding: "22px 48px 0", marginLeft: theme.header === "sidebar" ? 14 : 0 }}>
                    {/* datas e cliente */}
                    <div style={{ display: "flex", gap: 20, marginBottom: 22 }}>
                        <div style={{ flex: 1, padding: 12, borderRadius: theme.boxes === "boxed" ? 6 : 0, background: theme.boxes === "boxed" ? "#f4f4f5" : undefined, borderLeft: theme.boxes === "bar" ? `4px solid ${css(accent)}` : undefined, paddingLeft: theme.boxes === "bar" ? 12 : 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: css(accent), letterSpacing: 1, marginBottom: 4 }}>DETALHES</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6 }}>Data: {date(model.issueDate)}<br />{model.dueDate ? <>{quote ? "Validade" : "Vencimento"}: {date(model.dueDate)}<br /></> : null}{model.operator ? <>Operador: {model.operator}</> : null}</div>
                        </div>
                        <div style={{ flex: 1, padding: 12, borderRadius: theme.boxes === "boxed" ? 6 : 0, background: theme.boxes === "boxed" ? "#f4f4f5" : undefined, borderLeft: theme.boxes === "bar" ? `4px solid ${css(accent)}` : undefined, paddingLeft: theme.boxes === "bar" ? 12 : 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: css(accent), letterSpacing: 1, marginBottom: 4 }}>CLIENTE</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6 }}><b>{model.client.name || "Consumidor Final"}</b>{[model.client.taxId && `NUIT: ${model.client.taxId}`, model.client.address, model.client.phone, model.client.email].filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}</div>
                        </div>
                    </div>

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

                    {st.showSignatures !== false && (
                        <div style={{ display: "flex", gap: 60, marginTop: 56, padding: "0 20px" }}>
                            {[{ l: "A EMPRESA", s: st.companySignature || company?.signatureUrl }, { l: "O CLIENTE", s: st.clientSignature }].map((x) => (
                                <div key={x.l} style={{ flex: 1, textAlign: "center" }}>
                                    <div style={{ height: 56, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>{x.s && <img src={x.s} alt="" style={{ maxHeight: 54, maxWidth: "100%" }} />}</div>
                                    <div style={{ borderTop: "1px solid #71717a", paddingTop: 4, fontSize: 9, color: "#71717a", letterSpacing: 1 }}>{x.l}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {st.signaturePlace && <div style={{ marginTop: 8, fontSize: 10, color: "#71717a" }}>{st.signaturePlace}, {date(model.issueDate)}</div>}
                </div>

                <div style={{ position: "absolute", left: 48, right: 48, bottom: 28, borderTop: "1px solid #e4e4e7", paddingTop: 6, fontSize: 9.5, color: "#71717a", display: "flex", justifyContent: "space-between" }}>
                    <span>{company?.name}{st.footerNote ? ` · ${st.footerNote}` : ""}</span><span>Pág. 1</span>
                </div>
            </div>
        </div>
    );
}

const Row = ({ l, v }: { l: string; v: string }) => <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#52525b" }}><span>{l}</span><span>{v}</span></div>;
export const accentOf = (hex?: string, fallback: RGB = [24, 24, 27]) => rgbToHex(hexToRgb(hex) || fallback);
