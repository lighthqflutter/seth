'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/useAuth';

interface ThemeContextType {
  logoUrl: string;
  schoolName: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}

const ThemeContext = createContext<ThemeContextType>({
  logoUrl: '',
  schoolName: '',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  textColor: '#ffffff',
});

export const useTheme = () => useContext(ThemeContext);

// Helper function to determine if a color is light or dark
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If luminance is greater than 0.5, it's a light color
  return luminance > 0.5;
}

// Helper function to darken a color
function darkenColor(hex: string, amount: number = 30): string {
  const color = hex.replace('#', '');
  const r = Math.max(0, parseInt(color.substr(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(color.substr(2, 2), 16) - amount);
  const b = Math.max(0, parseInt(color.substr(4, 2), 16) - amount);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [themeData, setThemeData] = useState<ThemeContextType>({
    logoUrl: '',
    schoolName: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    textColor: '#ffffff',
  });

  useEffect(() => {
    const loadTheme = async () => {
      if (!user?.tenantId) return;

      try {
        const tenantDoc = await getDoc(doc(db, 'tenants', user.tenantId));
        if (tenantDoc.exists()) {
          const data = tenantDoc.data();
          const primaryColor = data.primaryColor || '#2563eb';
          const secondaryColor = data.secondaryColor || '#1e40af';
          const logoUrl = data.logoUrl || '';
          const schoolName = data.name || '';

          // Determine text color based on primary color lightness
          const textColor = isLightColor(primaryColor) ? '#000000' : '#ffffff';

          // Generate hover color (darker version of primary)
          const hoverColor = darkenColor(primaryColor, 30);

          // Update context
          setThemeData({
            logoUrl,
            schoolName,
            primaryColor,
            secondaryColor,
            textColor,
          });

          // Apply CSS variables to root for button theming
          document.documentElement.style.setProperty('--theme-primary', primaryColor);
          document.documentElement.style.setProperty('--theme-secondary', secondaryColor);
          document.documentElement.style.setProperty('--theme-text', textColor);
          document.documentElement.style.setProperty('--theme-hover', hoverColor);

          // Legacy CSS variables (keep for backward compatibility)
          document.documentElement.style.setProperty('--color-primary', primaryColor);
          document.documentElement.style.setProperty('--color-secondary', secondaryColor);

          // Generate lighter/darker shades for hover states (legacy)
          const primary = hexToRgb(primaryColor);
          const secondary = hexToRgb(secondaryColor);

          if (primary) {
            const primaryHover = `rgb(${Math.min(primary.r + 25, 255)}, ${Math.min(primary.g + 25, 255)}, ${Math.min(primary.b + 25, 255)})`;
            document.documentElement.style.setProperty('--color-primary-hover', primaryHover);
          }

          if (secondary) {
            const secondaryHover = `rgb(${Math.min(secondary.r + 25, 255)}, ${Math.min(secondary.g + 25, 255)}, ${Math.min(secondary.b + 25, 255)})`;
            document.documentElement.style.setProperty('--color-secondary-hover', secondaryHover);
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };

    loadTheme();
  }, [user?.tenantId]);

  return (
    <ThemeContext.Provider value={themeData}>
      {children}
    </ThemeContext.Provider>
  );
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
