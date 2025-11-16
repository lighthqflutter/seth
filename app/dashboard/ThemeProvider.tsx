'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      if (!user?.tenantId) return;

      try {
        const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
        if (tenantDoc.exists()) {
          const data = tenantDoc.data();
          const primaryColor = data.primaryColor || '#2563eb';
          const secondaryColor = data.secondaryColor || '#1e40af';

          // Apply CSS variables to root
          document.documentElement.style.setProperty('--color-primary', primaryColor);
          document.documentElement.style.setProperty('--color-secondary', secondaryColor);

          // Generate lighter/darker shades for hover states
          const primary = hexToRgb(primaryColor);
          const secondary = hexToRgb(secondaryColor);

          if (primary) {
            // Lighter shade for hover (add 10% to each channel)
            const primaryHover = `rgb(${Math.min(primary.r + 25, 255)}, ${Math.min(primary.g + 25, 255)}, ${Math.min(primary.b + 25, 255)})`;
            document.documentElement.style.setProperty('--color-primary-hover', primaryHover);
          }

          if (secondary) {
            const secondaryHover = `rgb(${Math.min(secondary.r + 25, 255)}, ${Math.min(secondary.g + 25, 255)}, ${Math.min(secondary.b + 25, 255)})`;
            document.documentElement.style.setProperty('--color-secondary-hover', secondaryHover);
          }

          setThemeLoaded(true);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setThemeLoaded(true);
      }
    };

    loadTheme();
  }, [user?.tenantId]);

  return <>{children}</>;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
