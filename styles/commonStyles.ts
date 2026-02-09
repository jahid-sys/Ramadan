import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Ramadan-inspired color palette - calm, spiritual, and elegant
export const colors = {
  // Light theme (default)
  light: {
    background: '#F8F6F3',        // Warm off-white
    card: '#FFFFFF',              // Pure white for cards
    primary: '#2C5F4F',           // Deep teal green (Islamic architecture)
    secondary: '#D4AF37',         // Gold accent (mosque domes)
    accent: '#8B7355',            // Warm brown
    text: '#2C3E50',              // Dark blue-gray
    textSecondary: '#7F8C8D',     // Muted gray
    border: '#E8E4DF',            // Soft border
    highlight: '#FFF8E7',         // Soft yellow highlight
    success: '#27AE60',           // Green for completed
    warning: '#F39C12',           // Orange for upcoming
  },
  // Dark theme
  dark: {
    background: '#1A1F2E',        // Deep navy
    card: '#252B3D',              // Slightly lighter navy
    primary: '#4A9B7F',           // Lighter teal
    secondary: '#D4AF37',         // Gold (same)
    accent: '#B8956A',            // Lighter brown
    text: '#E8E6E3',              // Off-white
    textSecondary: '#A0A8B0',     // Light gray
    border: '#3A4052',            // Subtle border
    highlight: '#2C3547',         // Subtle highlight
    success: '#2ECC71',           // Bright green
    warning: '#F39C12',           // Orange (same)
  },
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Legacy color scheme for backward compatibility
const legacyColors = {
  primary: '#162456',
  secondary: '#193cb8',
  accent: '#64B5F6',
  background: '#101824',
  backgroundAlt: '#162133',
  text: '#e3e3e3',
  grey: '#90CAF9',
  card: '#193cb8',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: legacyColors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: legacyColors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: legacyColors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: legacyColors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: legacyColors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: legacyColors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: legacyColors.backgroundAlt,
    borderColor: legacyColors.grey,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
});
