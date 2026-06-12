import { Group, Member, Expense } from "../types";

export const MOCK_MEMBERS: Member[] = [
  { id: "m1", name: "Thùy Chi", color: "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200", emoji: "🌸" },
  { id: "m2", name: "Minh Quân", color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200", emoji: "🥑" },
  { id: "m3", name: "Hoàng Nam", color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200", emoji: "🦁" },
  { id: "m4", name: "Khánh Linh", color: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200", emoji: "🍕" },
  { id: "m5", name: "Quốc Huy", color: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200", emoji: "🥤" },
];

export const MOCK_EXPENSES: Expense[] = [
  {
    id: "e1",
    description: "Lẩu Khói hải sản đêm",
    amount: 1200000,
    payerId: "m2", // Minh Quân
    date: "2026-06-10",
    participantIds: ["m1", "m2", "m3", "m4", "m5"], // All 5
  },
  {
    id: "e2",
    description: "Vé xem phim IMAX",
    amount: 480000,
    payerId: "m1", // Thùy Chi
    date: "2026-06-11",
    participantIds: ["m1", "m4", "m5"], // Thùy Chi, Khánh Linh, Quốc Huy
  },
  {
    id: "e3",
    description: "Trà sữa Gong Cha béo",
    amount: 210000,
    payerId: "m4", // Khánh Linh
    date: "2026-06-11",
    participantIds: ["m1", "m2", "m4"], // Thùy Chi, Minh Quân, Khánh Linh
  },
  {
    id: "e4",
    description: "Taxi Grab Car đi về",
    amount: 150000,
    payerId: "m5", // Quốc Huy
    date: "2026-06-12",
    participantIds: ["m3", "m5"], // Hoàng Nam, Quốc Huy
  },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: "g1",
    name: "Phượt Đà Lạt & Ăn Sập 🌲",
    createdAt: "2026-06-09",
    members: MOCK_MEMBERS,
    expenses: MOCK_EXPENSES,
  },
  {
    id: "g2",
    name: "Đồng nghiệp ăn trưa 💻",
    createdAt: "2026-06-10",
    members: [
      { id: "m201", name: "Anh Sếp", color: "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200", emoji: "👔" },
      { id: "m202", name: "Hạnh HR", color: "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200", emoji: "📋" },
      { id: "m203", name: "Trường Dev", color: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200", emoji: "🎸" },
    ],
    expenses: [
      {
        id: "e201",
        description: "Cơm trưa văn phòng",
        amount: 240000,
        payerId: "m201",
        date: "2026-06-11",
        participantIds: ["m201", "m202", "m203"],
      }
    ],
  }
];

export const MEMBER_COLORS = [
  { class: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200", label: "Hồng đào" },
  { class: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200", label: "Xanh lá" },
  { class: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200", label: "Mật ong" },
  { class: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200", label: "Tím chàm" },
  { class: "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200", label: "Thanh lam" },
  { class: "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200", label: "Tử đinh hương" },
  { class: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200", label: "Cam đất" },
  { class: "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200", label: "Xanh ngọc" },
];

export const MEMBER_EMOJIS = ["🌸", "🥑", "🦁", "🍕", "🥤", "🦊", "🍩", "🎒", "✈️", "🎵", "📷", "☕", "🍣", "🌮", "🎸", "🧁"];
