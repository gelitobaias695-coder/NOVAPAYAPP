import { useState, ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackState = "idle" | "loading" | "success" | "error";

interface AnimatedButtonProps extends ButtonProps {
  children: ReactNode;
  onAction?: () => Promise<void>;
  gradient?: boolean;
  loadingText?: string;
}

export function AnimatedButton({
  children,
  onAction,
  gradient,
  loadingText,
  className,
  onClick,
  ...props
}: AnimatedButtonProps) {
  const [state, setState] = useState<FeedbackState>("idle");

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onAction) {
      setState("loading");
      try {
        await onAction();
        setState("success");
        setTimeout(() => setState("idle"), 1500);
      } catch {
        setState("error");
        setTimeout(() => setState("idle"), 1500);
      }
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button
      className={cn(
        "btn-interactive relative",
        gradient && "btn-gradient",
        state === "error" && "animate-shake",
        className
      )}
      disabled={state === "loading"}
      onClick={handleClick}
      {...props}
    >
      {state === "loading" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin-fast mr-2" />
          {loadingText || children}
        </>
      )}
      {state === "success" && (
        <span className="flex items-center gap-2 animate-check-pop">
          <Check className="h-4 w-4" />
          Sucesso
        </span>
      )}
      {state === "error" && (
        <span className="flex items-center gap-2">
          <X className="h-4 w-4" />
          Erro
        </span>
      )}
      {state === "idle" && children}
    </Button>
  );
}
