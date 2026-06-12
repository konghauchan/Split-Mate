import React, { useState, useEffect } from "react";
import { Group, Member, Expense } from "./types";
import { MOCK_GROUPS, MEMBER_COLORS, MEMBER_EMOJIS } from "./utils/mockData";
import { calculateBalances } from "./utils/debtSimplifier";

import MemberSection from "./components/MemberSection";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import SettleUpSection from "./components/SettleUpSection";
import StatsSection from "./components/StatsSection";

import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Activity,
  ArrowLeftRight,
  Sparkles,
  RotateCcw,
  Plus,
  Compass,
  FolderLock,
  Trash2,
  ListFilter,
  CheckCircle,
  HelpCircle
} from "lucide-react";

export default function App() {
  // Load groups from LocalStorage or fallback to Mock Profiles
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem("splitmate_groups");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_GROUPS;
      }
    }
    return MOCK_GROUPS;
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    const savedId = localStorage.getItem("splitmate_selected_id");
    return savedId || MOCK_GROUPS[0].id;
  });

  const [activeTab, setActiveTab] = useState<"bills" | "settle">("bills");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // New Group input controls
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSuccess, setNewGroupSuccess] = useState(false);

  // Sync groups to localStorage
  useEffect(() => {
    localStorage.setItem("splitmate_groups", JSON.stringify(groups));
  }, [groups]);

  // Sync selected group ID to localStorage
  useEffect(() => {
    localStorage.setItem("splitmate_selected_id", selectedGroupId);
  }, [selectedGroupId]);

  // Find active group
  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // Helper selectors
  const members = activeGroup?.members || [];
  const expenses = activeGroup?.expenses || [];

  // Group Management Handler
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    const newGroup: Group = {
      id: "g_" + Date.now(),
      name,
      createdAt: new Date().toISOString().split("T")[0],
      members: [
        { id: "m_first_" + Date.now(), name: "Bạn", color: MEMBER_COLORS[0].class, emoji: "🎒" }
      ],
      expenses: [],
    };

    setGroups((prev) => [...prev, newGroup]);
    setSelectedGroupId(newGroup.id);
    setNewGroupName("");
    setIsCreatingGroup(false);
    setNewGroupSuccess(true);
    setTimeout(() => setNewGroupSuccess(false), 2500);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (groups.length <= 1) {
      alert("Không thể xóa nhóm cuối cùng. Thay vào đó, hãy xóa sạch chi phí bên trong nhóm!");
      return;
    }
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn nhóm "${groups.find((g) => g.id === groupId)?.name}" không?`
      )
    ) {
      const remaining = groups.filter((g) => g.id !== groupId);
      setGroups(remaining);
      setSelectedGroupId(remaining[0].id);
    }
  };

  // Reset current Application Database
  const handleResetToPresets = () => {
    if (window.confirm("Hành động này sẽ xóa dữ liệu hiện tại của bạn và đặt lại các nhóm mẫu. Tiếp tục?")) {
      setGroups(MOCK_GROUPS);
      setSelectedGroupId(MOCK_GROUPS[0].id);
      setActiveTab("bills");
    }
  };

  // Clear current active group transactions
  const handleClearActiveGroupData = () => {
    if (window.confirm("Xóa toàn bộ các chi tiêu đã ghi nhận trong nhóm này? (Danh sách thành viên không đổi)")) {
      setGroups((prev) =>
        prev.map((g) => (g.id === selectedGroupId ? { ...g, expenses: [] } : g))
      );
    }
  };

  // Member Management Handlers
  const handleAddMember = (member: Member) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedGroupId
          ? { ...g, members: [...g.members, member] }
          : g
      )
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === selectedGroupId) {
          // Remove member
          const updatedMembers = g.members.filter((m) => m.id !== memberId);
          // Clean expenses where this member was payer OR single participant (if empty, removes expense)
          const updatedExpenses = g.expenses
            .map((exp) => {
              // If payer got removed, we need to assign a new payer or we discard this bill
              const newPayerId = exp.payerId === memberId
                ? (updatedMembers[0]?.id || "")
                : exp.payerId;

              const updatedParticipants = exp.participantIds.filter((pId) => pId !== memberId);

              return {
                ...exp,
                payerId: newPayerId,
                participantIds: updatedParticipants,
              };
            })
            // Filters out empty expenses or expenses with no payer
            .filter((exp) => exp.payerId !== "" && exp.participantIds.length > 0);

          return {
            ...g,
            members: updatedMembers,
            expenses: updatedExpenses,
          };
        }
        return g;
      })
    );
  };

  // Expense Management Handlers
  const handleAddExpense = (expense: Expense) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedGroupId
          ? { ...g, expenses: [expense, ...g.expenses] }
          : g
      )
    );
  };

  const handleDeleteExpense = (expenseId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedGroupId
          ? { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) }
          : g
      )
    );
    if (editingExpense?.id === expenseId) {
      setEditingExpense(null);
    }
  };

  const handleEditMember = (updatedMember: Member) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedGroupId
          ? {
              ...g,
              members: g.members.map((m) => (m.id === updatedMember.id ? updatedMember : m)),
            }
          : g
      )
    );
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedGroupId
          ? {
              ...g,
              expenses: g.expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)),
            }
          : g
      )
    );
    setEditingExpense(null);
  };

  const totals = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 flex flex-col selection:bg-indigo-100 selection:text-indigo-800">
      {/* Dynamic Success Toast */}
      <AnimatePresence>
        {newGroupSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white py-3 px-5 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-medium"
          >
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span>Đã tạo và chuyển sang nhóm mới thành công!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Notification Stripe */}
      <div className="bg-slate-900 text-slate-300 py-2 px-4 text-center text-xs border-b border-slate-800/80 font-medium">
        🎯 Giải pháp tối ưu hóa chia tiền nhóm cho các chuyến du lịch, buổi ăn uống, hoạt động tập thể
      </div>

      {/* Primary Header/Console */}
      <header className="bg-white border-b border-slate-100 shadow-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20 flex items-center justify-center text-white">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
                SplitMate <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full py-0.5 px-2 font-bold font-sans">v1.2</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 tracking-wide">
                Chia Tiền Nhóm Thông Minh & Chốt Sổ Trả Nợ Tối Ưu
              </p>
            </div>
          </div>

          {/* Group and Action control panel */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Quick Switch Select box */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
              <span className="text-xs text-slate-500 font-bold px-1.5 hidden sm:inline">Nhóm:</span>
              <select
                aria-label="Chọn nhóm hoạt động"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none pr-6 pl-1 cursor-pointer"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.members.length} tv)
                  </option>
                ))}
              </select>

              {/* Group Delete utility */}
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(selectedGroupId)}
                  title="Xóa nhóm này"
                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* inline triggers to add quick groups or reset mockup data */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tạo nhóm mới</span>
              </button>

              <button
                onClick={handleResetToPresets}
                title="Trả lại các dữ liệu mẫu cài sẵn"
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-bold py-2.5 p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>

        {/* Create Group Inline Form Drawer */}
        <AnimatePresence>
          {isCreatingGroup && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-t border-b border-slate-100 overflow-hidden"
            >
              <div className="max-w-2xl mx-auto px-4 py-4.5">
                <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-xs font-bold text-slate-500" htmlFor="new-group-name">Tên nhóm hoạt động mới</label>
                    <input
                      id="new-group-name"
                      type="text"
                      maxLength={45}
                      required
                      placeholder="Ví dụ: Chuyến đi Vũng Tàu, Nhóm bạn thân ăn nhậu..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                    <button
                      type="button"
                      onClick={() => setIsCreatingGroup(false)}
                      className="flex-1 sm:flex-none border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold text-xs py-2 px-3.5 rounded-xl transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Kích hoạt nhóm
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Container Content styled with Bento Grid */}
      <main className="max-w-7xl mx-auto px-4 mt-6 sm:mt-8 flex-1 w-full space-y-6">
        
        {/* Bento Grid Header / Top row */}
        <div className="grid grid-cols-12 gap-5">
          
          {/* Main Balance Box Bento Tile (8/12 col) */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tổng chi tiêu cả nhóm ({activeGroup?.name || "Nhóm trống"})
                </span>
                <p className="text-xs text-slate-400 mt-0.5">Khởi tạo ngày: {activeGroup?.createdAt || "..."}</p>
              </div>
              <span className={`px-2.5 py-1 ${expenses.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"} rounded-full text-[10px] font-bold uppercase shrink-0`}>
                {expenses.length > 0 ? `${expenses.length} hoạt động` : "Sẵn sàng chia"}
              </span>
            </div>

            <div className="my-5 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 leading-none">
                {new Intl.NumberFormat("vi-VN").format(totals)}
              </span>
              <span className="text-lg font-extrabold text-slate-400">VND</span>
            </div>

            {/* Inner Bento Stats cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-100/50">
                <p className="text-xs text-slate-500 mb-1 font-semibold">Thành viên tham gia</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-extrabold text-slate-800">{members.length} người</p>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {members.slice(0, 3).map((m) => (
                      <span key={m.id} title={m.name} className="w-5 h-5 rounded-full bg-white text-[10px] flex items-center justify-center border border-slate-200 shadow-xs">
                        {m.emoji}
                      </span>
                    ))}
                    {members.length > 3 && (
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-[8px] font-bold text-slate-600 flex items-center justify-center border border-white">
                        +{members.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-100/50">
                <p className="text-xs text-slate-500 mb-1 font-semibold">Bình quân đầu người</p>
                <p className="text-lg font-extrabold text-indigo-600">
                  {members.length > 0 ? `${new Intl.NumberFormat("vi-VN").format(Math.round(totals / members.length))}đ` : "0đ"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Interactive Group Selection Bento Tile (4/12 col) */}
          <div className="col-span-12 lg:col-span-4 bg-indigo-950 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg shadow-indigo-100/30">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-indigo-200">Nhóm của bạn</h3>
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-semibold">Tích cực</span>
              </div>
              
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {groups.map((g) => {
                  const isActive = g.id === selectedGroupId;
                  const groupTotal = g.expenses.reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border transition-all ${
                        isActive
                          ? "bg-white/15 border-white/20 shadow-md scale-[1.01]"
                          : "bg-indigo-900/30 border-white/5 hover:bg-indigo-900/65"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-orange-400 flex items-center justify-center text-sm font-bold shadow-xs select-none">
                        {g.name.includes("🌲") || g.name.toLowerCase().includes("lạt") ? "🌲" : g.name.includes("🍲") || g.name.toLowerCase().includes("ăn") ? "🍲" : "☕"}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-extrabold text-xs truncate">{g.name}</p>
                        <p className="text-[10px] text-indigo-200 flex justify-between items-center mt-0.5">
                          <span>{g.members.length} thành viên</span>
                          <span className="font-mono text-indigo-100">{new Intl.NumberFormat("vi-VN").format(Math.round(groupTotal / 1000))}k đ đã chi</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                className="text-xs bg-white text-indigo-900 hover:bg-indigo-50 font-extrabold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Thêm nhóm mới</span>
              </button>

              <button
                onClick={handleResetToPresets}
                title="Trả lại các dữ liệu mẫu cài sẵn"
                className="text-indigo-200 hover:text-white pb-0.5 underline text-[10px] font-bold cursor-pointer"
              >
                Đặt lại mẫu
              </button>
            </div>
          </div>
        </div>

        {/* Tab switchers rendered as an elegant Bento accessory */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-left py-1 px-2">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>🚀 Bảng điều khiển:</span>
              <span className="text-indigo-600 font-black italic">{activeGroup?.name}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex">
              <button
                onClick={() => setActiveTab("bills")}
                className={`text-xs font-bold py-1.5 px-4 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === "bills"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Ghi chép chi tiêu</span>
              </button>
              <button
                onClick={() => setActiveTab("settle")}
                className={`text-xs font-bold py-1.5 px-4 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === "settle"
                    ? "bg-white text-slate-905 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Trả nợ & Thống kê bento</span>
              </button>
            </div>

            {expenses.length > 0 && (
              <button
                onClick={handleClearActiveGroupData}
                title="Xóa nhanh tất cả chi tiêu trong nhóm"
                className="p-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Interactive Workspace tabs with smooth layout animation */}
        <div>
          {activeTab === "bills" ? (
            /* TAB 1: Core recording & Member registration flow */
            <div className="grid grid-cols-12 gap-5 items-start">
              
              {/* Member registration pane (4/12 col) */}
              <div className="col-span-12 lg:col-span-4 space-y-5">
                <MemberSection
                  members={members}
                  expenses={expenses}
                  onAddMember={handleAddMember}
                  onRemoveMember={handleRemoveMember}
                  onEditMember={handleEditMember}
                />
              </div>

              {/* Expense entries list & creation form (8/12 col) */}
              <div className="col-span-12 lg:col-span-8 space-y-5">
                <ExpenseForm
                  members={members}
                  onAddExpense={handleAddExpense}
                  editingExpense={editingExpense}
                  onCancelEdit={() => setEditingExpense(null)}
                  onUpdateExpense={handleUpdateExpense}
                />
                
                <ExpenseList
                  expenses={expenses}
                  members={members}
                  onDeleteExpense={handleDeleteExpense}
                  onEditExpense={(exp) => {
                    setEditingExpense(exp);
                    window.scrollTo({ top: 380, behavior: "smooth" });
                  }}
                />
              </div>

            </div>
          ) : (
            /* TAB 2: Settlement recommendation, balances and visual analyzer charts */
            <div className="grid grid-cols-12 gap-5 items-start">
              
              {/* Settle Up recommendations mapping */}
              <div className="col-span-12 lg:col-span-7">
                <SettleUpSection
                  members={members}
                  expenses={expenses}
                  onAddExpense={handleAddExpense}
                />
              </div>

              {/* Statistics distribution summary & charts */}
              <div className="col-span-12 lg:col-span-5">
                <StatsSection
                  members={members}
                  expenses={expenses}
                />
              </div>

            </div>
          )}
        </div>

        {/* Educational/FAQ block on dividing mechanisms */}
        <footer className="bg-white/60 border border-slate-200 rounded-3xl p-6 text-left text-xs text-slate-500 max-w-4xl mx-auto space-y-3 shadow-xs">
          <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            Về giải pháp chia đều hóa đơn linh hoạt (SplitMate FAQ)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-500">
            <div className="space-y-1.5 leading-relaxed">
              <p className="font-bold text-slate-600">Q: Làm sao để ghi nhận chi phí mà không phải ai cũng tham gia?</p>
              <p>
                Để tiện hóa cho việc "mỗi hoạt động có thành viên khác nhau", khi nhập chi phí mới, bạn có thể <strong>tích chọn cụ thể</strong> những ai thực tế tham gia (chân dưới mục "Chia sẻ cùng ai"). Hệ thống sẽ tự động chỉ chia nhỏ hóa đơn cho những người được tích chọn.
              </p>
            </div>
            <div className="space-y-1.5 leading-relaxed">
              <p className="font-bold text-slate-600">Q: Làm thế nào để thanh toán (Settle up) giữa hai người?</p>
              <p>
                Tại tab <strong>"Trả nợ & Thống kê bento"</strong>, ấn nút <strong>"Xác nhận đã trả"</strong> ở sơ đồ nợ gợi ý. Tính năng sẽ tự động thêm một khoản ghi chú đặc biệt vào lịch sử chi tiêu để bù trừ nợ nần trực tiếp giữa hai bạn, nhanh gọn không cần tính lại bằng tay.
              </p>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
