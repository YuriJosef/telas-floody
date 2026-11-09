import React, { createContext, useContext } from 'react';
import MaterialIcon from './MaterialIcon.native';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// Semantic pairs match the established Floody web palette in App.css.
const palettes = {
  dark: { background: '#12141e', card: '#202330', surface: '#1c1f2c', text: '#e6e8f3', muted: '#bec2d6', primary: '#bbc5ff', onPrimary: '#202d69', official: '#303d70', onOfficial: '#e2e6ff', rain: '#2e4942', onRain: '#cdebdc', local: '#503846', onLocal: '#f4dbe6', border: '#8b90a7' },
  light: { background: '#f7f7ff', card: '#ffffff', surface: '#eeeff9', text: '#1c223b', muted: '#505971', primary: '#44549d', onPrimary: '#ffffff', official: '#dfe4ff', onOfficial: '#25316b', rain: '#d5eee2', onRain: '#203f35', local: '#f2dfeb', onLocal: '#58374c', border: '#747e96' },
};
function makeStyles(colors, fontFamily) {
  return StyleSheet.create({
    fill: { flex: 1, minHeight: 0 },
    page: { padding: 16, gap: 16, paddingBottom: 28, width: '100%', maxWidth: 680, alignSelf: 'center' },
    font: { fontFamily },
    title: { fontFamily, color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -.65 },
    heading: { fontFamily, color: colors.text, fontSize: 21, fontWeight: '700' },
    text: { fontFamily, color: colors.text, fontSize: 16, lineHeight: 24 },
    muted: { fontFamily, color: colors.muted, fontSize: 14, lineHeight: 20 },
    label: { fontFamily, color: colors.text, fontSize: 14, fontWeight: '600' },
    card: { padding: 16, borderRadius: 24, backgroundColor: colors.card, gap: 12 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    field: { gap: 6 },
    input: { fontFamily, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16 },
    button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 28, minHeight: 48, justifyContent: 'center' },
    buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    buttonText: { flexShrink: 1, fontFamily, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  });
}
const themes = Object.fromEntries(Object.entries(palettes).map(([name, colors]) => [name, { colors, styles: makeStyles(colors) }]));
const fontThemes = Object.fromEntries(Object.entries(palettes).map(([name, colors]) => [name, { colors, styles: makeStyles(colors, 'GoogleSansFlex') }]));
const ThemeContext = createContext(themes.dark);
export function NativeTheme({ theme, fontLoaded, children }) {
  return <ThemeContext.Provider value={(fontLoaded ? fontThemes : themes)[theme]}>{children}</ThemeContext.Provider>;
}
export function useNativeTheme() { return useContext(ThemeContext); }
export function Button({ title, onPress, disabled, selected, variant = 'filled', style, labelStyle, icon, iconOnly = false, ...props }) {
  const { colors, styles } = useNativeTheme();
  const tonal = selected || variant === 'tonal';
  const filled = variant === 'filled' && selected === undefined;
  const backgroundColor = tonal ? colors.rain : filled ? colors.primary : colors.surface;
  const color = tonal ? colors.onRain : filled ? colors.onPrimary : colors.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: Boolean(disabled), selected }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor }, !filled && !tonal && { borderRadius: 14 }, style, pressed && { borderRadius: 12, opacity: .8 }, disabled && { opacity: .55 }]} {...props}>
    <View style={styles.buttonContent}>
      {icon && <MaterialIcon name={icon} size={20} color={color} />}
      {!iconOnly && <Text style={[styles.buttonText, { color }, labelStyle]}>{title}</Text>}
    </View>
  </Pressable>;
}
export function Field({ label, multiline, ...props }) {
  const { colors, styles } = useNativeTheme();
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }]} multiline={multiline} {...props} />
  </View>;
}
export function Card({ children, style }) {
  const { styles } = useNativeTheme();
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Page({ title, children, centered = false }) {
  const { styles } = useNativeTheme();
  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={[styles.page, centered && { flexGrow: 1, justifyContent: 'center', maxWidth: 520 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={false}>
      {title && <Text accessibilityRole="header" style={styles.title}>{title}</Text>}
      {children}
    </ScrollView>
  </KeyboardAvoidingView>;
}
