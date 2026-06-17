import { IconKey } from "./icons";

export interface SubscriptionPlan {
  name: string;
  suggestedPrice: number;
  billing: 'Monthly' | 'Yearly';
  prices?: {
    TRY?: number;
    USD?: number;
    EUR?: number;
  };
}

export interface BrandTemplate {
  id: string;
  name: string;
  category: string;
  icon: IconKey;
  color: string;
  searchAliases: string[];
  plans: SubscriptionPlan[];
}

export const getPriceForCurrency = (
  plan: SubscriptionPlan,
  targetCurrency: 'TRY' | 'USD' | 'EUR'
): { price: number; currency: 'TRY' | 'USD' | 'EUR' } => {
  if (plan.prices) {
    if (plan.prices[targetCurrency] !== undefined) {
      return { price: plan.prices[targetCurrency]!, currency: targetCurrency };
    }
    if (targetCurrency === 'TRY') {
      if (plan.prices.USD !== undefined) {
        return { price: plan.prices.USD!, currency: 'USD' };
      }
      if (plan.prices.EUR !== undefined) {
        return { price: plan.prices.EUR!, currency: 'EUR' };
      }
    }
    if (plan.prices.USD !== undefined) {
      return { price: plan.prices.USD!, currency: 'USD' };
    }
    if (plan.prices.EUR !== undefined) {
      return { price: plan.prices.EUR!, currency: 'EUR' };
    }
    if (plan.prices.TRY !== undefined) {
      return { price: plan.prices.TRY!, currency: 'TRY' };
    }
  }
  return { price: plan.suggestedPrice, currency: targetCurrency };
};

export const BRAND_TEMPLATES: BrandTemplate[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Music',
    icon: 'spotify',
    color: '#1DB954',
    searchAliases: ['spotify', 'music', 'songs', 'playlist'],
    plans: [
      { name: 'Student', suggestedPrice: 5.99, billing: 'Monthly', prices: { USD: 5.99, TRY: 55.00, EUR: 5.99 } },
      { name: 'Individual', suggestedPrice: 11.99, billing: 'Monthly', prices: { USD: 11.99, TRY: 99.00, EUR: 10.99 } },
      { name: 'Duo', suggestedPrice: 16.99, billing: 'Monthly', prices: { USD: 16.99, TRY: 135.00, EUR: 14.99 } },
      { name: 'Family', suggestedPrice: 19.99, billing: 'Monthly', prices: { USD: 19.99, TRY: 165.00, EUR: 17.99 } },
    ]
  },
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'Entertainment',
    icon: 'netflix',
    color: '#E50914',
    searchAliases: ['netflix', 'movie', 'series', 'cinema', 'tv', 'video'],
    plans: [
      { name: 'Basic', suggestedPrice: 9.99, billing: 'Monthly', prices: { USD: 9.99, TRY: 189.99, EUR: 7.99 } },
      { name: 'Standard with Ads', suggestedPrice: 6.99, billing: 'Monthly', prices: { USD: 6.99, EUR: 5.99 } },
      { name: 'Standard', suggestedPrice: 15.49, billing: 'Monthly', prices: { USD: 15.49, TRY: 289.99, EUR: 13.49 } },
      { name: 'Premium', suggestedPrice: 22.99, billing: 'Monthly', prices: { USD: 22.99, TRY: 379.99, EUR: 19.99 } },
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube Premium',
    category: 'Entertainment',
    icon: 'plus',
    color: '#FF0000',
    searchAliases: ['youtube', 'premium', 'video', 'music', 'google', 'yt'],
    plans: [
      { name: 'Individual', suggestedPrice: 13.99, billing: 'Monthly', prices: { USD: 13.99, TRY: 119.99, EUR: 12.99 } },
      { name: 'Family', suggestedPrice: 22.99, billing: 'Monthly', prices: { USD: 22.99, TRY: 239.99, EUR: 17.99 } },
      { name: 'Student', suggestedPrice: 7.99, billing: 'Monthly', prices: { USD: 7.99, TRY: 79.99, EUR: 6.99 } },
    ]
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    category: 'AI Tools',
    icon: 'openai',
    color: '#10A37F',
    searchAliases: ['gpt', 'openai', 'chatgpt', 'ai', 'bot'],
    plans: [
      { name: 'Plus', suggestedPrice: 20.00, billing: 'Monthly', prices: { USD: 20.00, EUR: 20.00 } },
      { name: 'Team', suggestedPrice: 30.00, billing: 'Monthly', prices: { USD: 30.00, EUR: 30.00 } },
    ]
  },
  {
    id: 'claude',
    name: 'Claude',
    category: 'AI Tools',
    icon: 'claude',
    color: '#D9775E',
    searchAliases: ['claude', 'anthropic', 'ai', 'bot', 'llm'],
    plans: [
      { name: 'Pro', suggestedPrice: 20.00, billing: 'Monthly', prices: { USD: 20.00, EUR: 20.00 } },
      { name: 'Team', suggestedPrice: 30.00, billing: 'Monthly', prices: { USD: 30.00, EUR: 30.00 } },
    ]
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    icon: 'notion',
    color: '#000000',
    searchAliases: ['notion', 'notes', 'docs', 'wiki', 'todo'],
    plans: [
      { name: 'Plus', suggestedPrice: 10.00, billing: 'Monthly', prices: { USD: 10.00, EUR: 10.00 } },
      { name: 'Business', suggestedPrice: 18.00, billing: 'Monthly', prices: { USD: 18.00, EUR: 18.00 } },
    ]
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'Design',
    icon: 'figma',
    color: '#F24E1E',
    searchAliases: ['figma', 'design', 'ui', 'ux', 'vector'],
    plans: [
      { name: 'Professional', suggestedPrice: 15.00, billing: 'Monthly', prices: { USD: 15.00, EUR: 15.00 } },
      { name: 'Organization', suggestedPrice: 75.00, billing: 'Monthly', prices: { USD: 75.00, EUR: 75.00 } },
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Developer Tools',
    icon: 'github',
    color: '#24292E',
    searchAliases: ['github', 'git', 'code', 'repo', 'copilot', 'dev'],
    plans: [
      { name: 'Pro', suggestedPrice: 4.00, billing: 'Monthly', prices: { USD: 4.00, EUR: 4.00 } },
      { name: 'Copilot Individual', suggestedPrice: 10.00, billing: 'Monthly', prices: { USD: 10.00, EUR: 10.00 } },
    ]
  },
  {
    id: 'canva',
    name: 'Canva',
    category: 'Design',
    icon: 'canva',
    color: '#00C4CC',
    searchAliases: ['canva', 'design', 'social', 'graphics', 'template', 'templates'],
    plans: [
      { name: 'Pro', suggestedPrice: 15.00, billing: 'Monthly', prices: { USD: 15.00, TRY: 89.99, EUR: 11.99 } },
      { name: 'Teams', suggestedPrice: 30.00, billing: 'Monthly', prices: { USD: 30.00, TRY: 149.99, EUR: 23.99 } },
    ]
  },
  {
    id: 'exxen',
    name: 'Exxen',
    category: 'Entertainment',
    icon: 'plus',
    color: '#F1C40F',
    searchAliases: ['exxen', 'dizi', 'maç', 'spor', 'acun', 'streaming'],
    plans: [
      { name: 'Ad-supported', suggestedPrice: 169.00, billing: 'Monthly', prices: { TRY: 169.00, USD: 5.99, EUR: 4.99 } },
      { name: 'Ad-free', suggestedPrice: 229.00, billing: 'Monthly', prices: { TRY: 229.00, USD: 7.99, EUR: 6.99 } },
      { name: 'Exxenspor Ad-supported', suggestedPrice: 329.00, billing: 'Monthly', prices: { TRY: 329.00, USD: 11.99, EUR: 9.99 } },
      { name: 'Exxenspor Ad-free', suggestedPrice: 389.00, billing: 'Monthly', prices: { TRY: 389.00, USD: 13.99, EUR: 11.99 } },
    ]
  },
  {
    id: 'yemeksepeti',
    name: 'Yemeksepeti',
    category: 'Other',
    icon: 'plus',
    color: '#DF0144',
    searchAliases: ['yemeksepeti', 'yemek', 'club', 'sipariş', 'indirim'],
    plans: [
      { name: 'Yemeksepeti Club', suggestedPrice: 29.99, billing: 'Monthly', prices: { TRY: 29.99, USD: 0.99, EUR: 0.89 } },
    ]
  },
  {
    id: 'adobe',
    name: 'Adobe CC',
    category: 'Design',
    icon: 'adobe',
    color: '#FF0000',
    searchAliases: ['adobe', 'cc', 'photoshop', 'illustrator', 'pdf', 'creative', 'design'],
    plans: [
      { name: 'Single App', suggestedPrice: 22.99, billing: 'Monthly', prices: { USD: 22.99, TRY: 600.00, EUR: 26.99 } },
      { name: 'Creative Cloud All Apps', suggestedPrice: 59.99, billing: 'Monthly', prices: { USD: 59.99, TRY: 1627.00, EUR: 67.99 } },
    ]
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'Cloud',
    icon: 'dropbox',
    color: '#0061FE',
    searchAliases: ['dropbox', 'cloud', 'drive', 'storage', 'backup'],
    plans: [
      { name: 'Plus', suggestedPrice: 11.99, billing: 'Monthly', prices: { USD: 11.99, EUR: 11.99 } },
      { name: 'Essentials', suggestedPrice: 19.99, billing: 'Monthly', prices: { USD: 19.99, EUR: 19.99 } },
    ]
  },
  {
    id: 'medium',
    name: 'Medium',
    category: 'Entertainment',
    icon: 'medium',
    color: '#121212',
    searchAliases: ['medium', 'blog', 'read', 'article', 'write'],
    plans: [
      { name: 'Medium Membership', suggestedPrice: 5.00, billing: 'Monthly', prices: { USD: 5.00, EUR: 5.00 } },
      { name: 'Friend of Medium', suggestedPrice: 15.00, billing: 'Monthly', prices: { USD: 15.00, EUR: 15.00 } },
    ]
  }
];
