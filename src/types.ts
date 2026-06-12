export interface Member {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex (e.g., bg-red-500)
  emoji: string; // Fun representation
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payerId: string; // ID of Member who paid
  date: string; // YYYY-MM-DD
  participantIds: string[]; // List of Member IDs who participate in this expense
  receiptImage?: string; // Optional invoice image string (Data URL or placeholder)
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  members: Member[];
  expenses: Expense[];
}

export interface SimplifiedTransaction {
  fromId: string; // Member who owes
  toId: string;   // Member who is owed
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  paid: number;      // Total paid by member
  share: number;     // Total share member consumed
  netBalance: number; // paid - share (Positive: owed, Negative: owes)
}
