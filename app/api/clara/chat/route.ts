import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];

    if (!messages.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].content.trim();
    const lower = lastMessage.toLowerCase();

    const db = getAdminDb();

    // 1. Load user settings and API key
    const settingsDoc = await db.doc(`users/${uid}/settings/preferences`).get();
    const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
    const apiKey: string = settings.geminiApiKey || "";

    // 2. Fetch active financial database context
    const txSnap = await db.collection(`users/${uid}/transactions`).orderBy("date", "desc").limit(30).get();
    const transactions: any[] = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const catSnap = await db.collection(`users/${uid}/categories`).get();
    let categories: any[] = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const budSnap = await db.collection(`users/${uid}/budgets`).get();
    const budgets: any[] = budSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const subSnap = await db.collection(`users/${uid}/subscriptions`).get();
    const subscriptions: any[] = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let actionExecuted = false;
    let actionDetails = "";

    // 3. UNIVERSAL CRUD INTENTION ENGINE
    // A) CREATE TRANSACTION / EXPENSE / INCOME
    // e.g. "add 500 expense for starbucks", "spent 1200 on groceries", "received 50000 income from salary"
    if (lower.includes("add") || lower.includes("spent") || lower.includes("paid") || lower.includes("received") || lower.includes("record")) {
      let amount = 0;
      let merchant = "";
      let type: "expense" | "income" = "expense";

      if (lower.includes("income") || lower.includes("received") || lower.includes("salary") || lower.includes("earned")) {
        type = "income";
      }

      // Extract number
      const numMatch = lastMessage.match(/\b(\d+(?:\.\d+)?)\b/);
      if (numMatch) {
        amount = parseFloat(numMatch[1]);
        // Clean merchant name from prompt
        merchant = lastMessage
          .replace(/^(add|record|spent|paid|received|earned)/i, "")
          .replace(numMatch[0], "")
          .replace(/(expense|income|on|for|from|to|today|yesterday|₹|\$|€|£)/gi, "")
          .trim();

        if (!merchant) merchant = type === "income" ? "Deposit" : "General Expense";
        merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);

        // Try to match or assign a category
        let matchedCategory = categories.find(c => merchant.toLowerCase().includes(c.name?.toLowerCase()));
        let categoryId = matchedCategory ? matchedCategory.id : "";

        if (!categoryId) {
          if (lower.includes("food") || lower.includes("dining") || lower.includes("starbucks") || lower.includes("restaurant") || lower.includes("coffee")) {
            const c = categories.find(cat => cat.name?.toLowerCase().includes("food") || cat.name?.toLowerCase().includes("dining"));
            if (c) categoryId = c.id;
          } else if (lower.includes("grocery") || lower.includes("supermarket")) {
            const c = categories.find(cat => cat.name?.toLowerCase().includes("grocer"));
            if (c) categoryId = c.id;
          }
        }

        const newTx = {
          amount,
          merchant,
          type,
          categoryId: categoryId || (type === "income" ? "income_default" : "expense_default"),
          date: new Date().toISOString().split("T")[0],
          notes: "Recorded via Clara AI Assistant",
          createdAt: Date.now()
        };

        const docRef = await db.collection(`users/${uid}/transactions`).add(newTx);
        actionExecuted = true;
        actionDetails = `✅ Created ${type}: **${merchant}** for **₹${amount}** in your transactions database.`;
      }
    }

    // B) CREATE BUDGET
    // e.g. "create a budget of 15000 for dining", "set dining budget to 10000"
    if (lower.includes("budget") && (lower.includes("create") || lower.includes("set") || lower.includes("add") || lower.includes("update"))) {
      const numMatch = lastMessage.match(/\b(\d+(?:\.\d+)?)\b/);
      if (numMatch) {
        const amount = parseFloat(numMatch[1]);
        const catName = lastMessage
          .replace(/^(create|set|add|update|a|my)/gi, "")
          .replace(/budget/gi, "")
          .replace(/of|for|to|at|₹|\$|€|£/gi, "")
          .replace(numMatch[0], "")
          .trim();

        let targetCat = categories.find(c => c.name?.toLowerCase() === catName.toLowerCase() || catName.toLowerCase().includes(c.name?.toLowerCase()));
        if (!targetCat && catName) {
          // Create custom category automatically if not found
          const newCatRef = await db.collection(`users/${uid}/categories`).add({
            name: catName.charAt(0).toUpperCase() + catName.slice(1),
            type: "expense",
            color: "#8B5CF6",
            icon: "savings",
            isDefault: false,
            createdAt: Date.now()
          });
          targetCat = { id: newCatRef.id, name: catName };
        }

        if (targetCat) {
          await db.collection(`users/${uid}/budgets`).add({
            categoryId: targetCat.id,
            amount,
            period: "monthly",
            createdAt: Date.now()
          });
          actionExecuted = true;
          actionDetails = `✅ Set monthly budget of **₹${amount}** for category **${targetCat.name}**.`;
        }
      }
    }

    // C) CREATE CUSTOM CATEGORY
    // e.g. "create category gaming with icon sports_esports"
    if (lower.includes("category") && (lower.includes("create") || lower.includes("new") || lower.includes("add"))) {
      const parts = lastMessage.split(/category/i)[1]?.trim();
      if (parts && !actionExecuted) {
        let name = parts.replace(/with icon [a-z_]+/i, "").trim();
        let icon = "category";
        const iconMatch = lastMessage.match(/icon\s+([a-z_]+)/i);
        if (iconMatch) icon = iconMatch[1].toLowerCase();
        
        name = name.replace(/(named|as|for)/gi, "").trim();
        if (name) {
          name = name.charAt(0).toUpperCase() + name.slice(1);
          await db.collection(`users/${uid}/categories`).add({
            name,
            type: "expense",
            color: "#3B82F6",
            icon,
            isDefault: false,
            createdAt: Date.now()
          });
          actionExecuted = true;
          actionDetails = `✅ Created custom category **${name}** with material icon \`${icon}\`.`;
        }
      }
    }

    // D) DELETE / UNDO RECENT TRANSACTION
    if ((lower.includes("delete") || lower.includes("remove") || lower.includes("undo")) && (lower.includes("transaction") || lower.includes("expense") || lower.includes("last"))) {
      if (transactions.length > 0) {
        const target = transactions[0]; // most recent
        await db.doc(`users/${uid}/transactions/${target.id}`).delete();
        actionExecuted = true;
        actionDetails = `🗑️ Deleted your most recent transaction: **${target.merchant}** (₹${target.amount}).`;
      }
    }

    // 4. Generate response using Gemini API if Key is provided, else intelligent local synthesis
    let reply = "";

    if (apiKey && (apiKey.startsWith("AIza") || apiKey.length > 20)) {
      try {
        // Construct detailed system context for Gemini
        const systemPrompt = `You are Clara, an advanced personal finance and wealth management AI assistant embedded in the Clara Web app.
You have full access to the user's financial state and have just evaluated their request.
Financial Context:
- Recent Transactions (last 30): ${JSON.stringify(transactions.slice(0, 10))}
- Budgets: ${JSON.stringify(budgets)}
- Subscriptions & Bills: ${JSON.stringify(subscriptions)}
- Action Executed in Database: ${actionExecuted ? actionDetails : "No CRUD mutation triggered, just answering inquiry."}

Respond professionally, concisely, and clearly using Markdown formatting. If an action was executed, celebrate it and explain what was updated in their account. Give helpful wealth management advice when appropriate.`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: systemPrompt + "\n\nUser Question: " + lastMessage }] }
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 600,
            }
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      } catch (geminiError) {
        console.error("Gemini API invocation failed:", geminiError);
      }
    }

    // 5. Intelligent Fallback / Synthetic Response if no API key or Gemini reply fails
    if (!reply) {
      if (actionExecuted) {
        reply = `${actionDetails}\n\nIs there anything else you'd like me to update or analyze in your accounts today?`;
      } else if (lower.includes("summary") || lower.includes("spend") || lower.includes("total") || lower.includes("how much") || lower.includes("report")) {
        const totalExp = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
        const totalInc = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
        reply = `### Financial Summary\nHere is your recent cash flow overview based on your latest transactions:\n- **Total Expenses:** ₹${totalExp.toLocaleString()}\n- **Total Income:** ₹${totalInc.toLocaleString()}\n- **Net Savings:** ₹${(totalInc - totalExp).toLocaleString()}\n\nYou have **${transactions.length}** recorded transactions and **${subscriptions.length}** active bills/subscriptions. Let me know if you would like to set a new budget or log an expense!`;
      } else if (lower.includes("bill") || lower.includes("subscription") || lower.includes("due")) {
        const totalSubs = subscriptions.reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
        reply = `You have **${subscriptions.length} recurring bills** tracked in your account totaling **₹${totalSubs.toLocaleString()}** per cycle.\n\nHead over to your brand-new **Bills & Calendar** tab to inspect upcoming due dates, view your Budget Status progress ring, and mark bills as paid!`;
      } else {
        reply = `I'm Clara, your AI Wealth Manager! I am connected directly to your workspace database.\n\n**Here is what I can execute for you:**\n- 💸 *"Add 450 expense for Starbucks today"*\n- 📊 *"Create a budget of 15000 for Dining"*\n- 🏷️ *"Create category Fitness with icon fitness_center"*\n- 🗑️ *"Delete my last transaction"*\n- 📈 *"Give me a spending summary"*\n\n*(Tip: You can also enter your Google Gemini API Key in ` + "`Settings -> Integrations`" + ` for deeper conversational LLM reasoning!)*`;
      }
    }

    return NextResponse.json({
      reply,
      actionExecuted,
      actionDetails
    });
  } catch (err: any) {
    console.error("[POST /api/clara/chat]", err);
    return NextResponse.json({ error: err.message || "Failed to process AI chat" }, { status: 500 });
  }
}
