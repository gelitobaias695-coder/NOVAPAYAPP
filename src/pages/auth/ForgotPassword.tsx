import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlatform } from "@/contexts/PlatformContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { settings } = usePlatform();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao enviar email");
            }

            toast({ title: "Email enviado", description: "Verifique sua caixa de entrada." });
            setEmail("");
        } catch (err: unknown) {
            toast({
                title: "Falha",
                description: err instanceof Error ? err.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

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
                    <h2 className="text-xl font-bold text-foreground">Recuperar Senha</h2>
                    <p className="text-sm text-muted-foreground text-center">
                        Digite seu e-mail e enviaremos um link para você redefinir sua senha.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            placeholder="Seu e-mail..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <Button type="submit" className="w-full relative overflow-hidden group" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
                        <div className="absolute inset-0 h-full w-full bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-md" />
                    </Button>

                    <div className="text-center pt-2">
                        <Link to="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
                            <ArrowLeft className="h-4 w-4" /> Voltar para o login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
