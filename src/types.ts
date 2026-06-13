export interface Member {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex (e.g., bg-red-500)
  emoji: string; // Fun representation
  avatar?: string; // Base64 or URL of custom AI anime avatar
  accessCode?: string; // Unique access code for member logging in to view group info
  isUpcomingActive?: boolean; // Participation status flag for future expenses
  fundType?: "momo" | "bank";
  fundPhone?: string; // Legacy fallback
  fundName?: string;  // Legacy fallback
  fundBankName?: string; // Legacy fallback
  fundQrImage?: string; // Legacy fallback
  momoPhone?: string;
  momoQrImage?: string;
  bankAccount?: string;
  bankCode?: string;
  bankAccountName?: string;
  bankQrImage?: string;
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

export interface PendingReceipt {
  id: string;
  fromId: string;
  toId?: string; // If paid to a creditor
  amount: number;
  receiptImage: string; // Base64 data URL
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  memberNote?: string; // Member can write something like: "Em chuyển khoản rồi ạ"
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  members: Member[];
  expenses: Expense[];
  pendingReceipts?: PendingReceipt[]; // Custom proof list uploaded by members
  fundType?: "momo" | "bank";
  fundPhone?: string; // Legacy fallback
  fundName?: string;  // Legacy fallback
  fundBankName?: string; // Legacy fallback
  fundQrImage?: string; // Legacy fallback
  momoPhone?: string;
  momoQrImage?: string;
  bankAccount?: string;
  bankCode?: string;
  bankAccountName?: string;
  bankQrImage?: string;
  memberAccessCodes?: string[];
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
