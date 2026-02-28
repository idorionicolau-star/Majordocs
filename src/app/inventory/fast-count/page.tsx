import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FastCountGrid } from "@/components/inventory/fast-count-grid";

export default function FastCountPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Contagem Rápida</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Atualize o inventário de forma massiva e rápida.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Painel de Auditoria de Stock</CardTitle>
                    <CardDescription>
                        Filtre pela localização onde se encontra e digite o stock físico exato que acabou de contar. As diferenças serão avaliadas automaticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FastCountGrid />
                </CardContent>
            </Card>
        </div>
    );
}
