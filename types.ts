
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
