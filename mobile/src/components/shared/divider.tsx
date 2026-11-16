import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

/** The app's separator, in cards, listings and sheets: a 1dp line in the page's background colour. */
export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.background }]} />;
}

const styles = StyleSheet.create({
  divider: { height: 1 },
});
