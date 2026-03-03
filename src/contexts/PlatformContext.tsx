import React, { createContext, useContext, useState, useEffect } from "react";

interface PlatformSettings {
    favicon_url: string | null;
    logo_url: string | null;
}

interface PlatformContextType {
    settings: PlatformSettings | null;
    refreshSettings: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType>({
    settings: null,
    refreshSettings: async () => { },
});

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);

    const refreshSettings = async () => {
        try {
            const res = await fetch(`/api/platform/settings?t=${Date.now()}`, { cache: "no-store" });
            const data = await res.json();
            if (data?.data) {
                setSettings({
                    favicon_url: data.data.favicon_url,
                    logo_url: data.data.logo_url,
                });
            }
        } catch { }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <PlatformContext.Provider value={{ settings, refreshSettings }}>
            {children}
        </PlatformContext.Provider>
    );
};

export const usePlatform = () => useContext(PlatformContext);
