// ============================================================================
// 🏠 SYNC: Push Property-Related Transactions → Expenses Store
// ============================================================================

// Create or update an expense entry based on a transaction
export async function syncToExpenses(transaction) {
  try {
    const expenses = await getAllItems(STORE_NAMES.expenses).catch(() => []);

    const existingExpense = expenses.find(e => e.transactionId === transaction.id);

    const expenseData = {
      id: existingExpense ? existingExpense.id : generateId(),
      transactionId: transaction.id,
      propertyId: transaction.propertyId || "",
      category: transaction.expenseCategory || "Other",
      description: transaction.description || "Property Expense",
      amount: Math.abs(transaction.amount),
      date: transaction.date,
      status: transaction.expenseStatus || "Paid",
      receiptUrl: transaction.receiptUrl || "",
      notes: transaction.notes || "",
      taxDeductible: true,
      recurring: false,
      frequency: "monthly",
      nextDue: transaction.date,
      createdAt: existingExpense ? existingExpense.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingExpense) {
      await updateItem(STORE_NAMES.expenses, expenseData);
    } else {
      await addItem(STORE_NAMES.expenses, expenseData);
    }

    return expenseData;
  } catch (err) {
    console.error("❌ syncToExpenses() failed:", err);
    throw err;
  }
}


// ============================================================================
// 🔄 SYNC ALL: Ensure all property expenses appear in Expenses page
// ============================================================================

export async function syncAllPropertyExpenses() {
  try {
    const [transactions, expenses] = await Promise.all([
      getAllItems(STORE_NAMES.transactions),
      getAllItems(STORE_NAMES.expenses).catch(() => [])
    ]);

    // Look for transactions marked as property expense
    const propertyTransactions = transactions.filter(
      t => t.type === "expense" && t.isPropertyExpense && t.propertyId
    );

    // Filter out ones already synced
    const unsynced = propertyTransactions.filter(
      t => !expenses.find(e => e.transactionId === t.id)
    );

    if (unsynced.length === 0) {
      return {
        synced: 0,
        total: 0,
        message: "All property expenses are already synced!"
      };
    }

    let syncedCount = 0;

    for (const tx of unsynced) {
      try {
        await syncToExpenses(tx);
        syncedCount++;
      } catch (syncErr) {
        console.error(`❌ Failed to sync transaction ${tx.id}`, syncErr);
      }
    }

    return {
      synced: syncedCount,
      total: unsynced.length,
      message: `Synced ${syncedCount} new property expenses.`
    };

  } catch (err) {
    console.error("❌ syncAllPropertyExpenses() error:", err);
    return {
      synced: 0,
      total: 0,
      message: "Sync failed due to an unexpected error."
    };
  }
}
