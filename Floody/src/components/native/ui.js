import React from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
export const colors = { background: '#0b0f19', card: '#151c2c', text: '#f8fafc', muted: '#b2bfd2', primary: '#2563eb', border: '#334155' };
export function Button({ title, onPress, disabled, selected, ...props }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, selected && styles.selected, (disabled || pressed) && { opacity: 0.55 }]} {...props}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={styles.input} {...props} /></View>;
}
export function Card({ children }) { return <View style={styles.card}>{children}</View>; }
export function Page({ title, children }) {
  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.title}>{title}</Text>{children}</ScrollView></KeyboardAvoidingView>;
}
export const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 }, page: { padding: 16, gap: 16, paddingBottom: 32 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' }, text: { color: colors.text, fontSize: 16, lineHeight: 24 }, muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  card: { padding: 16, borderRadius: 16, backgroundColor: colors.card, gap: 12, borderWidth: 1, borderColor: colors.border },
  field: { gap: 6 }, label: { color: colors.text, fontSize: 15 }, input: { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 48, fontSize: 16 },
  button: { backgroundColor: colors.primary, padding: 12, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, selected: { backgroundColor: '#1e40af', borderWidth: 2, borderColor: '#93c5fd' }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
