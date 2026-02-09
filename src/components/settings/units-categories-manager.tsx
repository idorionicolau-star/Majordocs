import { useState } from "react";
import { useInventory } from "@/context/inventory-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Ruler } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export function UnitsCategoriesManager() {
    const {
        availableUnits, addUnit,
        availableCategories, addCategory,
        canEdit
    } = useInventory();

    const { toast } = useToast();
    const [newUnit, setNewUnit] = useState("");
    const [newCategory, setNewCategory] = useState("");

    const handleAddUnit = async () => {
        if (!newUnit.trim()) return;
        if (availableUnits.includes(newUnit.trim())) {
            toast({ variant: "destructive", title: "Erro", description: "Esta unidade já existe." });
            return;
        }
        await addUnit(newUnit.trim());
        setNewUnit("");
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        if (availableCategories.includes(newCategory.trim())) {
            toast({ variant: "destructive", title: "Erro", description: "Esta categoria já existe." });
            return;
        }
        await addCategory(newCategory.trim());
        setNewCategory("");
    };

    if (!canEdit('settings')) {
        return <div className="p-4 text-center text-slate-500">Você não tem permissão para editar estas configurações.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Units Manager */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-primary" />
                        Unidades de Medida
                    </CardTitle>
                    <CardDescription>
                        Gerencie as unidades disponíveis para os produtos (ex: kg, m³, un).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nova unidade (ex: caixa)"
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                        />
                        <Button onClick={handleAddUnit} size="icon">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                        {availableUnits.map((unit) => (
                            <Badge key={unit} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                                {unit}
                            </Badge>
                        ))}
                        {availableUnits.length === 0 && (
                            <span className="text-sm text-slate-500 italic">Nenhuma unidade cadastrada.</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Categories Manager */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        Categorias de Produtos
                    </CardTitle>
                    <CardDescription>
                        Organize seus produtos em categorias para facilitar a gestão.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nova categoria (ex: Elétrica)"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <Button onClick={handleAddCategory} size="icon">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                        {availableCategories.map((cat) => (
                            <Badge key={cat} variant="outline" className="px-3 py-1 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                                {cat}
                            </Badge>
                        ))}
                        {availableCategories.length === 0 && (
                            <span className="text-sm text-slate-500 italic">Nenhuma categoria cadastrada.</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
