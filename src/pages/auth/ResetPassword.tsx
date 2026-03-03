import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { usePlatform } from "@/contexts/PlatformContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { settings } = usePlatform();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: "As senhas não coincidem", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao redefinir a senha");
            }

            toast({ title: "Senha alterada com sucesso!", description: "Você já pode fazer o login com sua nova senha." });
            navigate("/login");
        } catch (err: unknown) {
            toast({
                title: "Falha na redefinição",
                description: err instanceof Error ? err.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="text-center">
                    <h2 className="text-xl font-bold">Link inválido</h2>
                    <p className="text-sm text-muted-foreground mb-4">O link que você acessou está quebrado ou já expirou.</p>
                    <Link to="/forgot-password" className="text-primary hover:underline flex items-center justify-center">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Solicitar novo link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
                <div className="flex flex-col items-center gap-2">
                    {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="NovaPay" className="h-24 w-auto object-contain drop-shadow-sm mb-4" />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/20">
                            <span className="text-xl font-bold text-white">N</span>
                        </div>
                    )}
                    <h2 className="text-xl font-bold text-foreground">Definir Nova Senha</h2>
                    <p className="text-sm text-muted-foreground text-center">
                        Insira sua nova senha abaixo.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova Senha</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            required
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirme a Senha</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            required
                            placeholder="..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <Button type="submit" className="w-full relative overflow-hidden group" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
                        <div className="absolute inset-0 h-full w-full bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-md" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
