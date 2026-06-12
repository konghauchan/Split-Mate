import React, { useState } from "react";
import { Member, Expense } from "../types";
import { Search, Calendar, User, Trash2, PiggyBank, Sparkles, Pencil, FileText, X, Eye } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
}

export default function ExpenseList({
  expenses,
  members,
  onDeleteExpense,
  onEditExpense,
}: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayerId, setFilterPayerId] = useState("all");
  const [activeReceiptImage, setActiveReceiptImage] = useState<string | null>(null);

  const getMemberEmojiName = (id: string) => {
    const m = members.find((member) => member.id === id);
    return m ? `${m.emoji} ${m.name}` : "Ẩn danh";
  };

  const getMemberNameOnly = (id: string) => {
    const m = members.find((member) => member.id === id);
    return m ? m.name : "Ẩn danh";
  };

  const filteredExpenses = expenses
    .filter((e) => {
      const matchSearch = e.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchPayer = filterPayerId === "all" || e.payerId === filterPayerId;
      return matchSearch && matchPayer;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Formatter helper
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Math.round(val));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      // YYYY-MM-DD layout
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
      {/* Header and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-emerald-600" />
            Lịch sử chi tiêu ({filteredExpenses.length} / {expenses.length})
          </h4>
          <p className="text-xs text-slate-400">Xem và lọc các chi phí phát sinh</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm chi phí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs w-36 sm:w-44 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="relative">
            <select
              aria-label="Lọc theo người thanh toán"
              value={filterPayerId}
              onChange={(e) => setFilterPayerId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-2 pr-6 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-700 cursor-pointer appearance-none"
            >
              <option value="all">Tất cả người trả</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.emoji} {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm space-y-2">
          <p>Không thấy chi phí nào khớp bộ lọc.</p>
          <p className="text-xs text-slate-400">Hãy xóa bộ lọc hoặc nhập khoản chi tiêu đầu tiên của nhóm!</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1 space-y-1">
          {filteredExpenses.map((expense) => {
            const payer = members.find((m) => m.id === expense.payerId);
            const amtPerPerson = expense.amount / expense.participantIds.length;

            return (
              <div
                key={expense.id}
                className="group flex flex-col md:flex-row md:items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-slate-50/40 px-2 rounded-xl transition-all gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Payer Mini Badge */}
                  <div
                    className={`w-9.5 h-9.5 rounded-full flex flex-col items-center justify-center font-bold text-lg shrink-0 border border-slate-200 relative ${
                      payer?.color || "bg-slate-100 text-slate-700"
                    }`}
                    title={`Người chi: ${payer?.name || "Chi chung"}`}
                  >
                    <span>{payer?.emoji || "💸"}</span>
                    <span className="absolute -bottom-1 -right-1 bg-white border border-slate-100 px-0.5 text-[8px] rounded font-bold text-slate-500 shadow-xs">
                      CHI
                    </span>
                  </div>

                  <div className="text-left space-y-1 min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {expense.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <User className="h-3 w-3" />
                        {getMemberNameOnly(expense.payerId)} đã trả trước
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(expense.date)}
                      </span>

                      {expense.receiptImage && (
                        <>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setActiveReceiptImage(expense.receiptImage || null)}
                            className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-lg border border-indigo-100 cursor-pointer transition-colors"
                            title="Xem hóa đơn thanh toán gốc"
                          >
                            <FileText className="h-3 w-3" />
                            Hóa đơn
                          </button>
                        </>
                      )}
                    </div>

                    {/* Participants lists */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Chia cho {expense.participantIds.length} người:</span>
                      <div className="flex flex-wrap gap-1">
                        {expense.participantIds.map((pId) => {
                          const part = members.find((m) => m.id === pId);
                          if (!part) return null;
                          return (
                            <span
                              key={pId}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border font-medium ${part.color}`}
                              title={`${part.name} gánh ${formatMoney(amtPerPerson)}`}
                            >
                              <span>{part.emoji}</span>
                              <span>{part.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side Amount and Actions */}
                <div className="flex items-center md:flex-col md:items-end justify-between border-t border-dashed border-slate-100 pt-2 md:pt-0 md:border-t-0 shrink-0 gap-3">
                  <div className="text-left md:text-right">
                    <p className="font-bold text-sm text-slate-800 font-mono">
                      {formatMoney(expense.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center justify-start md:justify-end gap-1">
                      <Sparkles className="h-3 w-3 text-indigo-400" />
                      Mỗi người: ~{formatMoney(amtPerPerson)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Pencil Edit button */}
                    <button
                      onClick={() => onEditExpense(expense)}
                      className="p-1 px-2 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] cursor-pointer font-extrabold border border-transparent hover:border-indigo-100"
                      title="Sửa chi tiêu này"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Sửa</span>
                    </button>

                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="p-1 px-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 rounded-lg transition-colors flex items-center gap-1 text-[11px] cursor-pointer font-extrabold border border-transparent hover:border-rose-100"
                      title="Xóa khoản chi này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Image Lightbox Modal */}
      {activeReceiptImage && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setActiveReceiptImage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 relative space-y-4 shadow-xl border border-slate-100 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-650" />
                Ảnh hóa đơn đính kèm
              </h4>
              <button
                type="button"
                onClick={() => setActiveReceiptImage(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-705 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex justify-center bg-slate-100 rounded-2xl overflow-hidden p-1 max-h-[70vh]">
              <img
                src={activeReceiptImage}
                alt="Receipt Full View"
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full object-contain rounded-xl"
              />
            </div>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setActiveReceiptImage(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 font-extrabold text-xs text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
