import { Text as NativeText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

export function AppText({ style, ...props }: TextProps) {
  const resolvedStyle = StyleSheet.flatten(style) as TextStyle | undefined;
  const weight = resolvedStyle?.fontWeight;
  const family = resolvedStyle?.fontFamily || (weight === '700' || weight === 'bold' || weight === '800'
    ? 'DMSans_700Bold'
    : weight === '500' || weight === '600'
      ? 'DMSans_500Medium'
      : 'DMSans_400Regular');

  return <NativeText {...props} style={[style, { fontFamily: family }]} />;
}