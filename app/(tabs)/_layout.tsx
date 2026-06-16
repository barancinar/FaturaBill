import { tabs } from "@/constants/data";
import { Tabs } from "expo-router";
import TabBar from "@/components/TabBar";

const TabLayout = () => {
    return (
        <Tabs 
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={({ route }) => ({
                href: route.name === 'subscriptions/[id]' ? null : undefined,
                headerShown: false,
            })}
        >
            { tabs.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                    }}
                />
            ))}
        </Tabs>
    );
}

export default TabLayout;