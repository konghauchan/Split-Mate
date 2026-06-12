import React from "react";
import { Member, Expense, MemberBalance } from "../types";
import { calculateBalances } from "../utils/debtSimplifier";
import { Wallet, PieChart, TrendingUp, Sparkles, Award } from "lucide-react";

interface StatsSectionProps {
  members: Member[];
  expenses: Expense[];
}

export default function StatsSection({ members, expenses }: StatsSectionProps) {
  const balances = calculateBalances(members, expenses);
  const totalGroupSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Find the top payer (who spent the most absolute money out of pocket)
  const sortedByPaid = [...balances].sort((a, b) => b.paid - a.paid);
  const topSpenderId = sortedByPaid[0]?.paid > 0 ? sortedByPaid[0].memberId : null;
  const topSpender = members.find((m) => m.id === topSpenderId);

  // Find person who consumed the most
  const sortedByShare = [...balances].sort((a, b) => b.share - a.share);
  const activeComerId = sortedByShare[0]?.share > 0 ? sortedByShare[0].memberId : null;
  const activeComer = members.find((m) => m.id === activeComerId);

  // Formatter
  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Math.round(num));
  };

  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-650 to-indigo-950 text-white p-5 rounded-3xl shadow-sm border border-indigo-950/20 flex flex-col justify-between h-32">
          <div className="p-2 bg-white/10 rounded-xl w-fit self-end">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-0.5">
            <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider">Tổng Chi Nhóm</span>
            <h3 className="text-xl font-black tracking-tight">{formatVnd(totalGroupSpent)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200 flex flex-col justify-between h-32">
          <div className="p-2 bg-indigo-50 rounded-xl w-fit self-end">
            <PieChart className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Bình Quân Chi Tiêu</span>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {members.length > 0 ? formatVnd(totalGroupSpent / members.length) : "0 đ"}
            </h3>
          </div>
        </div>
      </div>

      {/* Fun Awards */}
      {expenses.length > 0 && (topSpender || activeComer) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topSpender && (
            <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <p className="text-amber-800 font-extrabold flex items-center gap-1 text-xs">
                  Đại gia chi tiêu {topSpender.emoji}
                </p>
                <p className="text-slate-600 text-[11px] leading-tight">
                  <span className="font-bold text-slate-800">{topSpender.name}</span> chi nhiều nhất: <span className="font-bold text-amber-700">{formatVnd(balances.find(b => b.memberId === topSpender.id)?.paid || 0)}</span>
                </p>
              </div>
            </div>
          )}

          {activeComer && (
            <div className="bg-rose-50/50 border border-rose-200/60 p-4 rounded-2xl flex items-center gap-3">
              <div className="bg-rose-100 p-2 rounded-lg text-rose-600 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <p className="text-rose-800 font-extrabold flex items-center gap-1 text-xs">
                  Chơi nhiệt huyết {activeComer.emoji}
                </p>
                <p className="text-slate-600 text-[11px] leading-tight">
                  <span className="font-bold text-slate-800">{activeComer.name}</span> dùng thực tế: <span className="font-bold text-rose-700">{formatVnd(balances.find(b => b.memberId === activeComer.id)?.share || 0)}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Breakdown chart per member Bento block */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Cân Đối Chi Tiêu Thành Viên
          </h4>
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Đã góp v.s Hưởng</span>
        </div>

        <div className="space-y-5">
          {balances.map((bal) => {
            const member = members.find((m) => m.id === bal.memberId);
            if (!member) return null;

            // Percentage of paid and share compared to total group spending or max
            const maxVal = Math.max(...balances.map((b) => Math.max(b.paid, b.share)), 1);
            const paidPct = (bal.paid / maxVal) * 100;
            const sharePct = (bal.share / maxVal) * 100;

            return (
              <div key={bal.memberId} className="space-y-1.5 focus-within:bg-slate-50 p-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs border border-slate-200">
                      {member.emoji}
                    </span>
                    {member.name}
                  </span>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${bal.netBalance >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {bal.netBalance >= 0 ? "Nhận lại: " : "Cần đóng: "}
                      {formatVnd(Math.abs(bal.netBalance))}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pl-7">
                  {/* Paid Bar (Blue/Green) */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Đã bỏ ra trả trước</span>
                      <span className="font-medium text-slate-600">{formatVnd(bal.paid)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(paidPct, 2)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Share Bar (Purple/Rose) */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Phần chi tiêu được ăn/hưởng</span>
                      <span className="font-medium text-slate-600">{formatVnd(bal.share)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(sharePct, 2)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
