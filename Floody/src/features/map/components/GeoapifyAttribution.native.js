import { Linking, Text } from 'react-native';
import { useNativeTheme } from '../../../components/native/ui';

export default function GeoapifyAttribution() {
  const { styles } = useNativeTheme();
  return <Text style={styles.muted}>Endereços por <Text accessibilityRole="link" style={{ textDecorationLine: 'underline' }}
    onPress={() => Linking.openURL('https://www.geoapify.com/').catch(() => {})}>Geoapify</Text> · <Text
    accessibilityRole="link" style={{ textDecorationLine: 'underline' }}
    onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}>© OpenStreetMap</Text> · <Text
    accessibilityRole="link" style={{ textDecorationLine: 'underline' }}
    onPress={() => Linking.openURL('https://openaddresses.io/').catch(() => {})}>OpenAddresses</Text></Text>;
}
