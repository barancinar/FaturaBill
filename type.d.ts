interface AppTab {
    name: string;
    title: string;
    icon: import("react-native").ImageSourcePropType;
}

interface TabIconProps {
    focused: boolean;
    icon: import("react-native").ImageSourcePropType;
}

interface Subscription {
    id: string;
    icon: import("react-native").ImageSourcePropType;
    name: string;
    plan?: string;
    category?: string;
    paymentMethod?: string;
    status?: string;
    startDate?: string;
    price: number;
    currency?: string;
    billing: string;
    renewalDate?: string;
    color?: string;
}

interface SubscriptionCardProps extends Omit<Subscription, "id"> {
    expanded: boolean;
    onPress: () => void;
    onCancelPress?: () => void;
    isCancelling?: boolean;
}

interface UpcomingSubscription {
    id: string;
    icon: import("react-native").ImageSourcePropType;
    name: string;
    price: number;
    currency?: string;
    daysLeft: number;
}

interface UpcomingSubscriptionCardProps
    extends Omit<UpcomingSubscription, "id"> {}

interface ListHeadingProps {
    title: string;
}

