/**
 * Utility to automatically resolve emojis, legacy strings, or custom category names
 * into crisp, standardized Material Symbols for the entire application.
 */

export const CURATED_MATERIAL_ICONS = [
  // Finance & Essentials
  "account_balance", "account_balance_wallet", "credit_card", "payments", "savings", "trending_up", "trending_down", "receipt", "receipt_long",
  // Food & Dining
  "restaurant", "local_dining", "local_cafe", "local_bar", "fastfood", "local_pizza", "bakery_dining", "liquor",
  // Shopping & Retail
  "shopping_cart", "shopping_bag", "store", "checkroom", "inventory", "local_mall", "redeem", "card_giftcard",
  // Transport & Travel
  "directions_car", "flight", "directions_bus", "train", "pedal_bike", "local_gas_station", "hotel", "explore", "local_taxi",
  // Home & Utilities
  "home", "chair", "cleaning_services", "water_drop", "bolt", "wifi", "build", "delete", "request_quote",
  // Health & Wellness
  "local_hospital", "medical_services", "favorite", "fitness_center", "self_improvement", "spa", "content_cut", "psychology",
  // Entertainment & Leisure
  "sports_esports", "movie", "confirmation_number", "sports_bar", "headphones", "palette", "sports_soccer", "attractions", "music_note",
  // Work & Education
  "work", "school", "menu_book", "analytics", "computer", "satellite_alt", "battery_charging_full", "business_center",
  // Misc
  "pets", "celebration", "child_friendly", "security", "diamond", "verified", "star", "campaign", "label"
];

const KEYWORD_MAP: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ["🛒", "shop", "cart", "store", "mall", "cloth", "retail", "grocery", "groceries", "supermarket", "amazon", "apple"], icon: "shopping_cart" },
  { keywords: ["🍽", "🍔", "🍕", "🌮", "food", "dining", "restaurant", "eat", "lunch", "dinner", "breakfast", "meal"], icon: "restaurant" },
  { keywords: ["☕", "🍵", "cafe", "coffee", "starbucks", "tea", "drink"], icon: "local_cafe" },
  { keywords: ["🍺", "🍷", "🍸", "bar", "alcohol", "liquor", "beer", "wine"], icon: "local_bar" },
  { keywords: ["🚕", "🚗", "🚌", "car", "auto", "taxi", "uber", "lyft", "transit", "bus", "transport", "drive", "vehicle"], icon: "local_taxi" },
  { keywords: ["✈️", "🚀", "flight", "plane", "travel", "vacation", "trip", "hotel", "resort"], icon: "flight" },
  { keywords: ["⛽", "gas", "fuel", "petrol"], icon: "local_gas_station" },
  { keywords: ["🏠", "🏡", "home", "house", "rent", "housing", "mortgage", "apartment"], icon: "home" },
  { keywords: ["⚡", "electric", "electricity", "power", "bolt", "energy"], icon: "bolt" },
  { keywords: ["💧", "water", "utility", "utilities", "sewer"], icon: "water_drop" },
  { keywords: ["🌐", "wifi", "internet", "broadband", "network"], icon: "wifi" },
  { keywords: ["🏥", "💊", "doctor", "hospital", "medical", "health", "pharmacy", "clinic", "medicine"], icon: "local_hospital" },
  { keywords: ["💪", "🏋️", "gym", "fitness", "workout", "exercise", "sport", "yoga"], icon: "fitness_center" },
  { keywords: ["🎬", "🍿", "movie", "cinema", "netflix", "prime", "video", "film", "stream", "show"], icon: "movie" },
  { keywords: ["🎵", "🎧", "music", "spotify", "apple music", "audio", "song", "podcast"], icon: "headphones" },
  { keywords: ["🎮", "game", "gaming", "steam", "playstation", "xbox", "esports"], icon: "sports_esports" },
  { keywords: ["💼", "work", "business", "job", "salary", "wage", "income", "payroll", "client", "office"], icon: "work" },
  { keywords: ["🎓", "📚", "school", "education", "tuition", "book", "course", "study", "university", "college"], icon: "school" },
  { keywords: ["💰", "💵", "💸", "cash", "money", "dividend", "bonus", "gain"], icon: "payments" },
  { keywords: ["🏦", "bank", "invest", "investment", "stock", "deposit", "savings", "fund"], icon: "account_balance" },
  { keywords: ["🐶", "🐱", "pet", "dog", "cat", "vet"], icon: "pets" },
  { keywords: ["🎉", "gift", "present", "celebration", "party", "holiday"], icon: "card_giftcard" },
  { keywords: ["📱", "phone", "mobile", "cell", "recharge", "telecom"], icon: "phone_iphone" }
];

export function resolveMaterialIcon(iconOrName?: string, fallbackType: "expense" | "income" = "expense"): string {
  if (!iconOrName) {
    return fallbackType === "income" ? "payments" : "receipt_long";
  }

  const clean = iconOrName.trim().toLowerCase();

  // 1. If it's already a valid material symbol in our list, return it
  if (/^[a-z0-9_]+$/.test(clean) && CURATED_MATERIAL_ICONS.includes(clean)) {
    return clean;
  }

  // 2. Check keyword mappings against both emojis and strings
  for (const mapping of KEYWORD_MAP) {
    if (mapping.keywords.some(k => clean.includes(k) || k.includes(clean))) {
      return mapping.icon;
    }
  }

  // 3. If it looks like a material symbol name (lowercase with underscores), use it
  if (/^[a-z0-9_]+$/.test(clean) && clean.length >= 2) {
    return clean;
  }

  // 4. Default fallback based on type
  return fallbackType === "income" ? "payments" : "receipt_long";
}
