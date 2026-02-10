'use client';

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error(error);
        }
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
                    <div className="max-w-md text-center space-y-4">
                        <div className="mb-4">
                            <svg
                                className="mx-auto h-16 w-16 text-destructive"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold">Algo correu mal!</h2>

                        <p className="text-muted-foreground">
                            Pedimos desculpa pelo inconveniente. A nossa equipa já foi notificada automaticamente e está a trabalhar para resolver o problema.
                        </p>

                        {error.digest && (
                            <p className="text-sm text-muted-foreground">
                                Código de erro: <code className="bg-muted px-2 py-1 rounded">{error.digest}</code>
                            </p>
                        )}

                        <div className="flex gap-3 justify-center pt-4">
                            <Button onClick={reset} variant="default">
                                Tentar novamente
                            </Button>
                            <Button onClick={() => window.location.href = '/'} variant="outline">
                                Ir para o início
                            </Button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
