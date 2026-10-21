import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { DriverIcon, HomeIcon, NotificationIcon, RideIcon, VehicleIcon } from '../../../components/BrandAssets';
import { colors } from '../../../theme';

export default function AdminTabs() {
  const { width } = useWindowDimensions();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.paper,
      tabBarInactiveTintColor: colors.paper,
      tabBarActiveBackgroundColor: colors.brandHover,
      tabBarStyle: { height: 90, paddingHorizontal: 10, paddingVertical: 0, borderTopWidth: 0, backgroundColor: colors.brand, elevation: 0 },
      tabBarItemStyle: { height: 80, marginVertical: 5, marginHorizontal: 2, borderRadius: 6 },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      tabBarShowLabel: width > 480,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: () => <HomeIcon width={25} height={25} /> }} />
      <Tabs.Screen name="corridas" options={{ title: 'Corridas', tabBarIcon: () => <RideIcon width={25} height={25} /> }} />
      <Tabs.Screen name="motoristas" options={{ title: 'Motoristas', tabBarIcon: () => <DriverIcon width={25} height={25} /> }} />
      <Tabs.Screen name="veiculos" options={{ title: 'Veículos', tabBarIcon: () => <VehicleIcon width={25} height={25} /> }} />
      <Tabs.Screen name="notificacoes" options={{ title: 'Notificações', tabBarIcon: () => <NotificationIcon width={25} height={25} /> }} />
      <Tabs.Screen name="mais" options={{ href: null }} />
    </Tabs>
  );
}