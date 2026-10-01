"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = { new (opts?: { formats?: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };

export const cameraScanSupported = () =>
    typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

function beep() {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 1100;
        g.gain.value = 0.08;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.09);
        setTimeout(() => ctx.close().catch(() => {}), 300);
    } catch { /* sem som */ }
    try { navigator.vibrate?.(40); } catch { /* sem vibração */ }
}

/**
 * Leitor de código de barras com a câmara. Usa o leitor do próprio telemóvel (Chrome/Android):
 * grátis, sem internet, sem IA. Fica aberto para ler vários artigos seguidos.
 * `onScan` devolve o texto a mostrar ("✓ Cimento") ou `undefined`.
 */
export function BarcodeScanner({ open, onClose, onScan, title = "Aponte ao código de barras" }: {
    open: boolean;
    onClose: () => void;
    onScan: (code: string) => string | void | Promise<string | void>;
    title?: string;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState<string | null>(null);
    const onScanRef = useRef(onScan);
    useEffect(() => { onScanRef.current = onScan; }, [onScan]);

    useEffect(() => {
        if (!open) return;
        let stop = false;
        let stream: MediaStream | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        setError(null);
        setFlash(null);

        (async () => {
            if (!cameraScanSupported()) {
                setError("Este navegador não lê códigos com a câmara. Use o Chrome no Android, ou um leitor USB/Bluetooth (funciona como teclado), ou escreva o código.");
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
                if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
                const v = videoRef.current;
                if (!v) return;
                v.srcObject = stream;
                await v.play();
                const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
                const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"] });
                let last = "";
                let lastAt = 0;
                const tick = async () => {
                    if (stop) return;
                    try {
                        const found = await detector.detect(v);
                        const code = found[0]?.rawValue;
                        const now = Date.now();
                        // o mesmo código só conta outra vez passado 1,5 s (senão um artigo lido uma vez contava 20)
                        if (code && (code !== last || now - lastAt > 1500)) {
                            last = code;
                            lastAt = now;
                            beep();
                            const msg = await onScanRef.current(code);
                            if (msg) setFlash(msg);
                        }
                    } catch { /* frame sem código */ }
                    timer = setTimeout(tick, 120);
                };
                tick();
            } catch (e) {
                const name = (e as { name?: string })?.name;
                setError(name === "NotAllowedError" ? "A câmara está bloqueada. Permita o acesso à câmara nas definições do navegador." : "Não foi possível abrir a câmara.");
            }
        })();

        return () => {
            stop = true;
            if (timer) clearTimeout(timer);
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [open]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white" role="dialog" aria-label="Leitor de código de barras">
            <div className="flex items-center justify-between p-4">
                <p className="flex items-center gap-2 font-semibold"><Camera className="h-5 w-5" /> {title}</p>
                <Button type="button" variant="secondary" size="sm" onClick={onClose}><X className="mr-1 h-4 w-4" /> Fechar</Button>
            </div>
            {error ? (
                <p className="m-4 rounded-xl bg-red-500/20 p-4 text-sm">{error}</p>
            ) : (
                <div className="relative mx-auto w-full max-w-xl flex-1 overflow-hidden">
                    <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
            )}
            <div className="min-h-16 p-4 text-center">
                {flash ? <p className="flex items-center justify-center gap-2 text-lg font-bold text-emerald-300"><Zap className="h-5 w-5" /> {flash}</p> : <p className="text-sm text-white/70">Leia vários artigos seguidos — fecha quando acabar.</p>}
            </div>
        </div>
    );
}
