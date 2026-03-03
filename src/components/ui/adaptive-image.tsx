import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveImageProps {
    src?: string | null;
    alt: string;
    className?: string; // Additional classes for the wrapper if needed
}

export function AdaptiveImage({ src, alt, className }: AdaptiveImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
        return (
            <div className={cn("w-full aspect-video md:aspect-[4/3] flex items-center justify-center bg-primary/5 rounded-xl border border-primary/10", className)}>
                <Package className="h-10 w-10 text-primary/40" />
            </div>
        );
    }

    return (
        <div className={cn("relative w-full flex justify-center items-center rounded-xl overflow-hidden bg-zinc-50 shadow-sm border border-border/50", className)} style={{ minHeight: isLoaded ? 'auto' : '150px' }}>
            {!isLoaded && (
                <div className="absolute inset-0 z-10">
                    <Skeleton className="h-full w-full rounded-xl" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`w-full max-w-[500px] h-auto max-h-[450px] object-contain transition-opacity duration-700 ease-in-out ${isLoaded ? "opacity-100" : "opacity-0"
                    }`}
            />
        </div>
    );
}
