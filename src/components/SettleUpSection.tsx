import React from "react";
import { Member, Expense, SimplifiedTransaction } from "../types";
import { simplifyDebts, calculateBalances } from "../utils/debtSimplifier";
import { ArrowLeftRight, CheckCircle2, ArrowRight, Wallet, Check, Landmark, ArrowDownCircle, ArrowUpCircle, Info } from "lucide-react";

interface SettleUpSectionProps {
  members: Member[];
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
}

export default function SettleUpSection({
  members,
  expenses,
  onAddExpense,
}: SettleUpSectionProps) {
  const transactions = simplifyDebts(members, expenses);
  const memberBalances = calculateBalances(members, expenses);

  const getMember = (id: string) => {
    return members.find((m) => m.id === id);
  };

  // Debtor pays into Central Fund
  const handleDebtorSettle = (debtorId: string) => {
    const debtor = getMember(debtorId);
    if (!debtor) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const relevantTxs = transactions.filter((tx) => tx.fromId === debtorId);

    if (relevantTxs.length === 0) return;

    relevantTxs.forEach((tx, idx) => {
      const creditor = getMember(tx.toId);
      if (!creditor) return;

      const settlementExpense: Expense = {
        id: `settle_fund_in_${debtorId}_${tx.toId}_${Date.now()}_${idx}`,
        description: `📥 [Nộp Quỹ] ${debtor.name} đóng quỹ nhóm hoàn tất nợ (phân phối cho ${creditor.name})`,
        amount: tx.amount,
        payerId: debtorId,
        date: todayStr,
        participantIds: [tx.toId],
      };
      onAddExpense(settlementExpense);
    });
  };

  // Creditor receives from Central Fund
  const handleCreditorSettle = (creditorId: string) => {
    const creditor = getMember(creditorId);
    if (!creditor) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const relevantTxs = transactions.filter((tx) => tx.toId === creditorId);

    if (relevantTxs.length === 0) return;

    relevantTxs.forEach((tx, idx) => {
      const debtor = getMember(tx.fromId);
      if (!debtor) return;

      const settlementExpense: Expense = {
        id: `settle_fund_out_${tx.fromId}_${creditorId}_${Date.now()}_${idx}`,
        description: `📤 [Nhận Quỹ] ${creditor.name} nhận hoàn dư từ Quỹ Nhóm (từ phần đóng của ${debtor.name})`,
        amount: tx.amount,
        payerId: tx.fromId,
        date: todayStr,
        participantIds: [creditorId],
      };
      onAddExpense(settlementExpense);
    });
  };

  // Capital formatting
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Math.round(val));
  };

  // Filter debtors and creditors
  const debtors = memberBalances
    .filter((b) => b.netBalance < -0.1)
    .map((b) => ({
      memberId: b.memberId,
      amount: Math.abs(b.netBalance),
    }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = memberBalances
    .filter((b) => b.netBalance > 0.1)
    .map((b) => ({
      memberId: b.memberId,
      amount: b.netBalance,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Total funds circulation size
  const totalCirculatingFunds = debtors.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
      {/* Header element */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
        <div>
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Landmark className="h-5 w-5 text-indigo-600" />
            Phương án phân phối qua Quỹ Nhóm Trung Gian
          </h4>
          <p className="text-xs text-slate-400">
            Mọi người trả tiền trực tiếp vào quỹ và nhận lại từ quỹ, loại bỏ chuyển khoản chéo lẻ tẻ.
          </p>
        </div>
      </div>

      {transactions.length === 0 || totalCirculatingFunds < 1 ? (
        <div className="text-center py-10 space-y-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
          <div className="inline-flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full w-12 h-12">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-slate-700 text-sm">Tuyệt vời! Đã thanh toán sòng phẳng</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Quỹ nhóm rỗng, tất cả các thành viên hiện tại đều sòng phẳng 0đ.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Central Fund Smart Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-[-10px] bottom-[-10px] text-white/5 pointer-events-none">
              <Landmark className="h-32 w-32" />
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">Trạng thái Quỹ Chung</span>
                <span className="text-xs text-slate-300">Tổng quy mô kết chuyển công nợ</span>
              </div>
              <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/20 rounded-full text-[9px] font-bold uppercase text-indigo-200">
                Đang vận hành
              </span>
            </div>

            <div className="my-4">
              <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {formatMoney(totalCirculatingFunds)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-indigo-200 border-t border-white/10 pt-2.5 mt-1">
              <Info className="h-3 w-3 text-indigo-300 shrink-0" />
              <span>Giao dịch lẻ tẻ đã gộp lại thành 1 lượt nộp Quỹ và nhận lại tiền rảnh tay.</span>
            </div>
          </div>

          {/* Side by side / Stacked flow of payments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* THU VÀO QUỸ NHÓM Columns */}
            <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-250/50 pb-2">
                <ArrowDownCircle className="h-4.5 w-4.5 text-amber-600" />
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  1. Thu vào Quỹ Nhóm ({debtors.length})
                </span>
              </div>

              {debtors.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">Không còn tiền nợ cần thu!</p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {debtors.map((d) => {
                    const member = getMember(d.memberId);
                    if (!member) return null;
                    return (
                      <div
                        key={`deb-${d.memberId}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center shrink-0 bg-slate-50 text-base">
                            {member.emoji}
                          </span>
                          <div className="text-left overflow-hidden">
                            <span className="block font-bold text-xs text-slate-800 truncate">{member.name}</span>
                            <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wilder">Cần chuyển vào Quỹ</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-50 pt-2 sm:pt-0">
                          <span className="font-mono text-xs font-bold text-slate-900 pr-1 shrink-0">
                            {formatMoney(d.amount)}
                          </span>
                          <button
                            onClick={() => handleDebtorSettle(d.memberId)}
                            className="bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 hover:border-amber-600 text-amber-700 p-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                            title={`Xác nhận ${member.name} đã chuyển khoản tiền nộp quỹ`}
                          >
                            <Check className="h-3 w-3" />
                            <span>Đã nộp</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CHI TRẢ TỪ QUỸ NHÓM Columns */}
            <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-250/50 pb-2">
                <ArrowUpCircle className="h-4.5 w-4.5 text-indigo-600" />
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  2. Chi Trả Từ Quỹ ({creditors.length})
                </span>
              </div>

              {creditors.length === 0 ? (
                <p className="text-slate-400 text-xs py-4 text-center">Không có thành viên cần hoàn dư!</p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {creditors.map((c) => {
                    const member = getMember(c.memberId);
                    if (!member) return null;
                    return (
                      <div
                        key={`cred-${c.memberId}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center shrink-0 bg-slate-50 text-base">
                            {member.emoji}
                          </span>
                          <div className="text-left overflow-hidden">
                            <span className="block font-bold text-xs text-slate-800 truncate">{member.name}</span>
                            <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wilder">Nhận lại từ Quỹ</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-50 pt-2 sm:pt-0">
                          <span className="font-mono text-xs font-bold text-slate-900 pr-1 shrink-0">
                            {formatMoney(c.amount)}
                          </span>
                          <button
                            onClick={() => handleCreditorSettle(c.memberId)}
                            className="bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 text-indigo-700 p-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                            title={`Xác nhận Quỹ đã hoàn đầy đủ tiền dư cho ${member.name}`}
                          >
                            <Check className="h-3 w-3" />
                            <span>Đã nhận</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Quick tips explaining how the virtual ledger stays perfectly accurate */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[11px] text-slate-600 space-y-1 text-left leading-relaxed">
            <span className="font-extrabold text-indigo-950 block">💡 Cơ chế Quỹ Chung vận hành như thế nào?</span>
            <p>
              Thay vì chuyển khoản chéo, các thành viên thâm hụt đóng phần tiền của mình vào <strong>Quỹ nhóm</strong> ở phần <strong>(1)</strong>. Ngay sau đó, thủ quỹ chi lại số tiền thu được từ quỹ trả về cho các bạn chi dư tương ứng ở phần <strong>(2)</strong>. Cơ chế này giúp thu gọn giao dịch tối đa, sòng phẳng, an toàn mà không làm mất tính đúng đắn của dữ liệu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
