import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';

export default function SearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <Text style={styles.hint}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  hint: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
});
