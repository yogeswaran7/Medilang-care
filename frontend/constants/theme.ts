// MediLang Care - Warm Elderly-Friendly Theme

export const colors = {
  primary: '#C2510A',        // Deep orange
  background: '#FDF6EC',     // Warm cream
  surface: '#FFF8F0',        // Light cream surface
  secondary: '#7A5C2E',      // Muted olive brown
  error: '#B00020',          // Error red
  success: '#2E7D32',        // Success green
  warning: '#F9A825',        // Warning yellow
  onPrimary: '#FFFFFF',      // White on primary
  onBackground: '#1C1208',   // Dark brown text
  onSurface: '#1C1208',      // Dark brown text
  cardStroke: '#E8DCC8',     // Card border
  disabled: '#A0978A',       // Disabled state
  morning: '#FF9800',        // Morning - orange
  afternoon: '#4CAF50',      // Afternoon - green  
  night: '#5C6BC0',          // Night - indigo
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  // Minimum 18sp for elderly users
  body: {
    fontSize: 18,
    lineHeight: 26,
  },
  bodyLarge: {
    fontSize: 20,
    lineHeight: 28,
  },
  heading: {
    fontSize: 22,
    fontWeight: '500' as const,
    lineHeight: 30,
  },
  headingLarge: {
    fontSize: 26,
    fontWeight: '600' as const,
    lineHeight: 34,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
  },
};

export const borderRadius = {
  button: 12,
  card: 16,
  input: 12,
};

// Minimum 56dp touch targets for elderly users
export const touchTarget = {
  minHeight: 56,
  minWidth: 56,
};
