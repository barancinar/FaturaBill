import { IconKey } from "./icons";

export interface SubscriptionPlan {
  name: string;
  suggestedPrice: number;
  billing: 'Monthly' | 'Yearly';
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

export const BRAND_TEMPLATES: BrandTemplate[] = [

  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Music',
    icon: 'spotify',
    color: '#1DB954',
    searchAliases: ['spotify', 'music', 'songs', 'playlist'],
    plans: [
      { name: 'Student', suggestedPrice: 5.99, billing: 'Monthly' },
      { name: 'Individual', suggestedPrice: 11.99, billing: 'Monthly' },
      { name: 'Duo', suggestedPrice: 16.99, billing: 'Monthly' },
      { name: 'Family', suggestedPrice: 19.99, billing: 'Monthly' },
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
      { name: 'Standard with Ads', suggestedPrice: 6.99, billing: 'Monthly' },
      { name: 'Standard', suggestedPrice: 15.49, billing: 'Monthly' },
      { name: 'Premium', suggestedPrice: 22.99, billing: 'Monthly' },
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
      { name: 'Plus', suggestedPrice: 20.00, billing: 'Monthly' },
      { name: 'Team', suggestedPrice: 30.00, billing: 'Monthly' },
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
      { name: 'Pro', suggestedPrice: 20.00, billing: 'Monthly' },
      { name: 'Team', suggestedPrice: 30.00, billing: 'Monthly' },
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
      { name: 'Plus', suggestedPrice: 10.00, billing: 'Monthly' },
      { name: 'Business', suggestedPrice: 18.00, billing: 'Monthly' },
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
      { name: 'Professional', suggestedPrice: 15.00, billing: 'Monthly' },
      { name: 'Organization', suggestedPrice: 75.00, billing: 'Monthly' },
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
      { name: 'Pro', suggestedPrice: 4.00, billing: 'Monthly' },
      { name: 'Copilot Individual', suggestedPrice: 10.00, billing: 'Monthly' },
    ]
  },
  {
    id: 'canva',
    name: 'Canva',
    category: 'Design',
    icon: 'canva',
    color: '#00C4CC',
    searchAliases: ['canva', 'design', 'social', 'graphics', 'temp'],
    plans: [
      { name: 'Pro', suggestedPrice: 15.00, billing: 'Monthly' },
      { name: 'Teams', suggestedPrice: 30.00, billing: 'Monthly' },
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
      { name: 'Ad-supported', suggestedPrice: 169.00, billing: 'Monthly' },
      { name: 'Ad-free', suggestedPrice: 229.00, billing: 'Monthly' },
      { name: 'Exxenspor Ad-supported', suggestedPrice: 329.00, billing: 'Monthly' },
      { name: 'Exxenspor Ad-free', suggestedPrice: 389.00, billing: 'Monthly' },
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
      { name: 'Yemeksepeti Club', suggestedPrice: 29.99, billing: 'Monthly' },
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
      { name: 'Single App', suggestedPrice: 22.99, billing: 'Monthly' },
      { name: 'Creative Cloud All Apps', suggestedPrice: 59.99, billing: 'Monthly' },
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
      { name: 'Plus', suggestedPrice: 11.99, billing: 'Monthly' },
      { name: 'Essentials', suggestedPrice: 19.99, billing: 'Monthly' },
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
      { name: 'Medium Membership', suggestedPrice: 5.00, billing: 'Monthly' },
      { name: 'Friend of Medium', suggestedPrice: 15.00, billing: 'Monthly' },
    ]
  }
];
