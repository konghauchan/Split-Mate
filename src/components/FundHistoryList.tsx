import React, { useState } from "react";
import { Member, Expense } from "../types";
import { Search, Calendar, User, Trash2, PiggyBank, ArrowDownLeft, ArrowUpRight, ArrowUpDown } from "lucide-react";

interface FundHistoryListProps {
  expenses: Expense[];
  members: Member[];
  onDeleteExpense: (id: string) => void;
}

export default function FundHistoryList({
  expenses,
  members,
  onDeleteExpense,
}: FundHistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayerId, setFilterPayerId] = useState("all");
  const [filterType, setFilterType] = useState("all"); // "all" | "in" | "out"

  const getMemberEmojiName = (id: string) => {
    const m = members.find((member) => member.id === id);
    return m ? `${m.emoji} ${m.name}` : "Ẩn danh";
  };

  const getMemberNameOnly = (id: string) => {
    const m = members.find((member) => member.id === id);
    return m ? m.name : "Ẩn danh";
  };

  // Fund transactions are those containing "[Nộp Quỹ]" or "[Nhận Quỹ]"
  const fundExpenses = expenses.filter((e) => {
    return e.description.includes("[Nộp Quỹ]") || e.description.includes("[Nhận Quỹ]");
  });

  const filteredExpenses = fundExpenses
    .filter((e) => {
      const matchSearch = e.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchPayer = filterPayerId === "all" || e.payerId === filterPayerId;
      
      let matchType = true;
      if (filterType === "in") {
        matchType = e.description.includes("[Nộp Quỹ]");
      } else if (filterType === "out") {
        matchType = e.description.includes("[Nhận Quỹ]");
      }

      return matchSearch && matchPayer && matchType;
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
            <PiggyBank className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
            Lịch sử giao dịch Quỹ Nhóm ({filteredExpenses.length} / {fundExpenses.length})
          </h4>
          <p className="text-xs text-slate-400">Nhật ký thu chi sòng phẳng, hoàn nợ thông qua Quỹ trung gian của nhóm</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm giao dịch quỹ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-[11px] w-32 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 font-medium"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="relative">
            <select
              aria-label="Lọc loại quỹ"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-2 pr-6 text-[11px] font-semibold focus:bg-white focus:outline-none text-slate-705 cursor-pointer appearance-none"
            >
              <option value="all">Mọi loại quỹ</option>
              <option value="in">📥 Thu vào Quỹ</option>
              <option value="out">📤 Chi từ Quỹ</option>
            </select>
          </div>

          <div className="relative">
            <select
              aria-label="Lọc thành viên"
              value={filterPayerId}
              onChange={(e) => setFilterPayerId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-2 pr-6 text-[11px] font-semibold focus:bg-white focus:outline-none text-slate-705 cursor-pointer appearance-none"
            >
              <option value="all">Mọi người đóng</option>
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
        <div className="text-center py-12 text-slate-400 text-xs space-y-2">
          <p>Không tìm thấy hoạt động Quỹ nào.</p>
          <p className="text-[11px] text-slate-450 italic">Bạn hãy thực hiện tất toán công nợ theo phương thức Thu/Chi Quỹ ở trên!</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1 space-y-1">
          {filteredExpenses.map((expense) => {
            const isNopQuy = expense.description.includes("[Nộp Quỹ]");
            const payer = members.find((m) => m.id === expense.payerId);

            return (
              <div
                key={expense.id}
                className="group flex flex-col md:flex-row md:items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-slate-50/50 px-2 rounded-xl transition-all gap-2"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Indicator Badge with tailored designs for Nop vs Nhan */}
                  <div
                    className={`w-9.5 h-9.5 rounded-full flex flex-col items-center justify-center font-bold text-lg shrink-0 border relative ${
                      isNopQuy
                        ? "bg-rose-50 border-rose-100 text-rose-600"
                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                    }`}
                    title={isNopQuy ? "Thu vào Quỹ" : "Nhận từ Quỹ"}
                  >
                    {isNopQuy ? (
                      <ArrowDownLeft className="h-5 w-5 text-rose-500 shrink-0" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                    <span 
                      className={`absolute -bottom-1 -right-1 border px-0.8 py-0.2 text-[7px] rounded-sm font-black shadow-3xs ${
                        isNopQuy 
                          ? "bg-pink-100/90 border-pink-200 text-pink-700"
                          : "bg-emerald-100/90 border-emerald-200 text-emerald-700"
                      }`}
                    >
                      {isNopQuy ? "THU" : "CHI"}
                    </span>
                  </div>

                  <div className="text-left space-y-0.5 min-w-0 flex-1">
                    <p className="font-extrabold text-xs text-slate-800 line-clamp-2 md:truncate group-hover:text-indigo-650 transition-colors">
                      {expense.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-400 text-[10px] font-semibold">
                      <span className="flex items-center gap-1 text-slate-500">
                        <User className="h-3 w-3 shrink-0" />
                        {getMemberNameOnly(expense.payerId)} (Thành viên)
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-slate-450">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatDate(expense.date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount and delete tools */}
                <div className="flex items-center md:flex-col md:items-end justify-between border-t border-dashed border-slate-100 pt-1.5 md:pt-0 md:border-t-0 shrink-0 gap-2">
                  <div className="text-left md:text-right">
                    <p className={`font-black text-xs font-mono ${isNopQuy ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isNopQuy ? "+" : "-"}{formatMoney(expense.amount)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                      {isNopQuy ? "Đã nộp vào quỹ" : "Đã trả từ quỹ"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="p-1 px-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 rounded-lg transition-all flex items-center gap-1 text-[10px] cursor-pointer font-black border border-transparent hover:border-rose-100"
                      title="Xóa giao dịch này"
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
    </div>
  );
}
