
export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  savedAmount: number;
  category: string;
  createdAt: number;
  priority: 'Low' | 'Medium' | 'High';
}

export interface AppState {
  items: WishlistItem[];
  walletBalance: number;
  monthlyIncome: number;
}

export interface ExternalWebsite {
  id: string;
  name: string;
  description: string;
  url: string;
  icon?: string;
}
