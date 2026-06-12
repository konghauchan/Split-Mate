import { Member, Expense, SimplifiedTransaction, MemberBalance } from "../types";

/**
 * Calculates the total paid, total share and net balance for each member.
 */
export function calculateBalances(members: Member[], expenses: Expense[]): MemberBalance[] {
  const balances: Record<string, { paid: number; share: number }> = {};

  // Initialize for all members
  members.forEach((m) => {
    balances[m.id] = { paid: 0, share: 0 };
  });

  // Accumulate
  expenses.forEach((expense) => {
    const amount = expense.amount;
    const payerId = expense.payerId;
    const participants = expense.participantIds;

    // Add to payer's paid amount (as long as payer is still in the group)
    if (balances[payerId]) {
      balances[payerId].paid += amount;
    }

    if (participants.length > 0) {
      const sharePerPerson = amount / participants.length;
      participants.forEach((pId) => {
        if (balances[pId]) {
          balances[pId].share += sharePerPerson;
        }
      });
    }
  });

  return members.map((m) => {
    const paid = balances[m.id]?.paid || 0;
    const share = balances[m.id]?.share || 0;
    return {
      memberId: m.id,
      paid,
      share,
      netBalance: paid - share,
    };
  });
}

/**
 * Simplifies debts within a group to find the minimum number of transactions.
 * Uses a greedy matchmaking algorithm between highest debtor and highest creditor.
 */
export function simplifyDebts(
  members: Member[],
  expenses: Expense[]
): SimplifiedTransaction[] {
  const memberBalances = calculateBalances(members, expenses);
  
  // Clone balances for manipulation
  const debtors = memberBalances
    .filter((b) => b.netBalance < -0.1) // ignore tiny floating point differences
    .map((b) => ({ id: b.memberId, balance: b.netBalance }))
    .sort((a, b) => a.balance - b.balance); // Most negative first

  const creditors = memberBalances
    .filter((b) => b.netBalance > 0.1)
    .map((b) => ({ id: b.memberId, balance: b.netBalance }))
    .sort((a, b) => b.balance - a.balance); // Most positive first

  const transactions: SimplifiedTransaction[] = [];

  let i = 0; // index for debtors
  let j = 0; // index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Amount to transfer
    const amountToSettle = Math.min(-debtor.balance, creditor.balance);

    if (amountToSettle > 0.1) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        amount: Math.round(amountToSettle),
      });
    }

    // Adjust balances
    debtor.balance += amountToSettle;
    creditor.balance -= amountToSettle;

    // Move pointers if settled
    if (Math.abs(debtor.balance) < 0.1) {
      i++;
    }
    if (Math.abs(creditor.balance) < 0.1) {
      j++;
    }
  }

  return transactions;
}
