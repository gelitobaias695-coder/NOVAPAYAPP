import { useEffect, useState } from 'react';

export default function MetaPixel() {
    const [pixelId, setPixelId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPixel = async () => {
            try {
                const res = await fetch("/api/pixel/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data?.data?.pixel_id) {
                        setPixelId(data.data.pixel_id);
                    }
                }
            } catch (err) {
                console.error("Meta Pixel Settings fetch error", err);
            }
        };
        fetchPixel();
    }, []);

    useEffect(() => {
        if (!pixelId) return;

        // Meta Pixel Base Code
        const script = document.createElement("script");
        script.id = "meta-pixel-script";
        script.innerHTML = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
        `;
        document.head.appendChild(script);

        const noscript = document.createElement("noscript");
        noscript.id = "meta-pixel-noscript";
        noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
        document.head.appendChild(noscript);

        return () => {
            // Clean up
            const s = document.getElementById("meta-pixel-script");
            if (s) document.head.removeChild(s);
            const n = document.getElementById("meta-pixel-noscript");
            if (n) document.head.removeChild(n);
        };
    }, [pixelId]);

    return null;
}
