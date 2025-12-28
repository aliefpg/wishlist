
import { GoogleGenAI, Type } from "@google/genai";
import { WishlistItem } from "../types";

export const getSavingsAdvice = async (items: WishlistItem[], monthlyIncome: number): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const totalGoal = items.reduce((sum, item) => sum + item.price, 0);
  const totalSaved = items.reduce((sum, item) => sum + item.savedAmount, 0);
  const remaining = totalGoal - totalSaved;

  const itemsList = items.map(i => `${i.name} (Price: Rp${i.price.toLocaleString()}, Saved: Rp${i.savedAmount.toLocaleString()}, Priority: ${i.priority})`).join(", ");

  const prompt = `
    I am saving for the following wishlist items: ${itemsList}.
    My total goal is Rp${totalGoal.toLocaleString()} and I have saved Rp${totalSaved.toLocaleString()} so far.
    Remaining amount needed: Rp${remaining.toLocaleString()}.
    My monthly saving capacity is Rp${monthlyIncome.toLocaleString()}.
    
    Please provide a brief, encouraging financial strategy in Indonesian. 
    Include:
    1. Which item to prioritize based on the priority level.
    2. How many months it will take to reach the total goal.
    3. Three specific tips to save faster.
    
    Keep the tone friendly and motivational.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Gagal mendapatkan saran. Coba lagi nanti!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, ada kendala teknis saat menghubungi asisten AI.";
  }
};
