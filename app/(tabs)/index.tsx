import "@/global.css";
import { Link } from "expo-router";
import { styled } from "nativewind";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <Text className="text-xl font-bold text-success">
                Welcome to Nativewind!
            </Text>
            <Link href="/onboarding" className="mt-4 px-4 py-2 bg-primary rounded">
                <Text className="text-white">Go to OnBoarding</Text>
            </Link>
            <Link href="/(auth)/sign-in" className="mt-4 px-4 py-2 bg-primary rounded">
                <Text className="text-white">Go to Sign in</Text>
            </Link>
            <Link href="/(auth)/sign-up" className="mt-4 px-4 py-2 bg-primary rounded">
                <Text className="text-white">Go to Sign up</Text>
            </Link>

            <Link href="/subscriptions/spotify" className="mt-4 px-4 py-2 bg-primary rounded">
                <Text className="text-white">Spotify Subscription</Text>
            </Link>
            <Link href={{
                pathname: "/subscriptions/[id]",
                params: { id: "claude" },
            }}
            className="mt-4 px-4 py-2 bg-primary rounded"
            >
                <Text className="text-white">Claude Subscription</Text>
            </Link>
        </SafeAreaView>
    );
}