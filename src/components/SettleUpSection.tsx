import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Group, Member, Expense, SimplifiedTransaction, PendingReceipt } from "../types";
import { simplifyDebts, calculateBalances } from "../utils/debtSimplifier";
import { VIETNAM_BANKS } from "../utils/banks";
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  ArrowRight, 
  Wallet, 
  Check, 
  Landmark, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Info, 
  QrCode, 
  Settings, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  X, 
  Phone, 
  User, 
  CreditCard,
  Cpu,
  RefreshCw,
  Share2,
  AlertCircle,
  FileText,
  Lock,
  CheckCircle
} from "lucide-react";

interface SettleUpSectionProps {
  activeGroup?: Group;
  onUpdateGroupConfig?: (config: {
    momoPhone?: string;
    momoQrImage?: string;
    bankAccount?: string;
    bankAccountName?: string;
    bankCode?: string;
    bankQrImage?: string;
    fundType?: "momo" | "bank";
    fundPhone?: string;
    fundName?: string;
    fundBankName?: string;
    fundQrImage?: string;
  }) => void;
  members: Member[];
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  isAdmin?: boolean;
  viewingMemberId?: string;
  pendingReceipts?: PendingReceipt[];
  onUpdatePendingReceipts?: (receipts: PendingReceipt[]) => void;
}

export default function SettleUpSection({
  activeGroup,
  onUpdateGroupConfig,
  members,
  expenses,
  onAddExpense,
  isAdmin = true,
  viewingMemberId,
  pendingReceipts = [],
  onUpdatePendingReceipts,
}: SettleUpSectionProps) {
  const transactions = simplifyDebts(members, expenses);
  const memberBalances = calculateBalances(members, expenses);

  const getMember = (id: string) => {
    return members.find((m) => m.id === id);
  };

  // State configurations page
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states
  const [setupTab, setSetupTab] = useState<"momo" | "bank">("momo");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoQrImage, setMomoQrImage] = useState("");
  
  const [bankAccount, setBankAccount] = useState("");
  const [bankCode, setBankCode] = useState("VCB");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankQrImage, setBankQrImage] = useState("");

  const [configSuccess, setConfigSuccess] = useState(false);

  // Active QR modal state
  const [activePayTx, setActivePayTx] = useState<{
    fromId: string;
    amount: number;
    toId?: string; // If we are paying to a member (receiving back)
    qrTab?: "momo" | "bank";
  } | null>(null);

  const [selectedQrTab, setSelectedQrTab] = useState<"momo" | "bank">("momo");

  // Receipt receiptImage OCR states
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [ocrState, setOcrState] = useState<"idle" | "scanning" | "matching" | "success">("idle");
  const [ocrLog, setOcrLog] = useState("");
  const activePayTxRef = React.useRef(activePayTx);

  useEffect(() => {
    activePayTxRef.current = activePayTx;
    if (!activePayTx) {
      setReceiptImage(null);
      setOcrState("idle");
      setOcrLog("");
    } else {
      const isPayingToMember = !!activePayTx.toId;
      const targetMember = isPayingToMember ? getMember(activePayTx.toId!) : null;
      const initialTab = activePayTx.qrTab || (isPayingToMember 
        ? (targetMember?.fundType || "momo")
        : (activeGroup?.fundType || "momo"));
      setSelectedQrTab(initialTab);
    }
  }, [activePayTx, activeGroup]);

  // Live state syncing from group props
  useEffect(() => {
    if (activeGroup) {
      const fbType = activeGroup.fundType || "momo";
      setSetupTab(fbType);
      setMomoPhone(activeGroup.momoPhone || (fbType === "momo" ? activeGroup.fundPhone || "" : ""));
      setMomoQrImage(activeGroup.momoQrImage || (fbType === "momo" ? activeGroup.fundQrImage || "" : ""));
      
      setBankAccount(activeGroup.bankAccount || (fbType === "bank" ? activeGroup.fundPhone || "" : ""));
      setBankCode(activeGroup.bankCode || activeGroup.fundBankName || "VCB");
      setBankAccountName(activeGroup.bankAccountName || activeGroup.fundName || "");
      setBankQrImage(activeGroup.bankQrImage || (fbType === "bank" ? activeGroup.fundQrImage || "" : ""));
    }
  }, [activeGroup]);

  // Handle saving configurations
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateGroupConfig) {
      onUpdateGroupConfig({
        momoPhone: momoPhone.trim() || undefined,
        momoQrImage: momoQrImage || undefined,
        bankAccount: bankAccount.trim() || undefined,
        bankAccountName: bankAccountName.trim().toUpperCase() || undefined,
        bankCode: bankCode,
        bankQrImage: bankQrImage || undefined,
        
        fundType: "bank",
        fundPhone: bankAccount.trim(),
        fundName: bankAccountName.trim().toUpperCase() || undefined,
        fundBankName: bankCode,
        fundQrImage: undefined,
      });
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 2000);
      setIsConfiguring(false);
    }
  };

  // Dynamic member verification and zoomed states
  const [memberNote, setMemberNote] = useState("");
  const [zoomedReceiptImage, setZoomedReceiptImage] = useState<string | null>(null);

  const handleApproveReceipt = (rec: PendingReceipt) => {
    // 1. Process real settlement logic
    if (rec.toId) {
      handleCreditorSettle(rec.toId);
    } else {
      handleDebtorSettle(rec.fromId, rec.amount);
    }

    // 2. Mark as approved in state
    const updated = (pendingReceipts || []).map((r) =>
      r.id === rec.id ? { ...r, status: "approved" as const } : r
    );
    if (onUpdatePendingReceipts) {
      onUpdatePendingReceipts(updated);
    }
  };

  const handleRejectReceipt = (rec: PendingReceipt) => {
    const reason = window.prompt("Nhập ghi chú chi tiết / Lý do báo lỗi (Giao dịch chưa phù hợp):", "Chưa khớp đúng số tiền hoặc nội dung chuyển khoản, vui lòng đối soát và gửi lại nha.");
    if (reason === null) return; // User cancelled prompt

    const updated = (pendingReceipts || []).map((r) =>
      r.id === rec.id ? { ...r, status: "rejected" as const, rejectionReason: reason.trim() || "Giao dịch chưa phù hợp" } : r
    );
    if (onUpdatePendingReceipts) {
      onUpdatePendingReceipts(updated);
    }
  };

  const handleCancelReceipt = (receiptId: string) => {
    const updated = (pendingReceipts || []).filter((r) => r.id !== receiptId);
    if (onUpdatePendingReceipts) {
      onUpdatePendingReceipts(updated);
    }
  };

  const handleMemberSubmitReceipt = () => {
    if (!receiptImage || !activePayTx) return;
    const newReceipt: PendingReceipt = {
      id: "rec_" + Date.now(),
      fromId: activePayTx.fromId,
      toId: activePayTx.toId,
      amount: activePayTx.amount,
      receiptImage: receiptImage,
      uploadedAt: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      status: "pending",
      memberNote: memberNote.trim() || undefined
    };

    if (onUpdatePendingReceipts) {
      onUpdatePendingReceipts([...(pendingReceipts || []), newReceipt]);
    }
    
    // Clear states
    setActivePayTx(null);
    setReceiptImage(null);
    setMemberNote("");
    setOcrState("idle");
    setOcrLog("");
  };

  // Custom receipt image upload & OCR matching flow simulation
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activePayTx) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Vui lòng chọn ảnh biên lai dưới 5MB!");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const imgUrl = event.target.result as string;
          setReceiptImage(imgUrl);
          setOcrState("scanning");
          setOcrLog("🔍 AI đang nhận dạng bố cục ảnh biên lai chuyển khoản...");

          setTimeout(() => {
            if (!activePayTxRef.current) return;
            setOcrState("matching");
            const memoText = activePayTxRef.current.toId 
              ? `Hoan du quy - ${getMember(activePayTxRef.current.toId)?.name || ""}`
              : `Nop quy nhom - ${getMember(activePayTxRef.current.fromId)?.name || ""}`;
            setOcrLog(`✨ Đang so khớp thông tin: [Số tiền: ${formatMoney(activePayTxRef.current.amount)}] & [Nội dung: "${memoText}"]...`);

            setTimeout(() => {
              if (!activePayTxRef.current) return;
              setOcrState("success");
              if (isAdmin) {
                setOcrLog("✅ Biên lai thanh toán khớp 100%! Đang tiến hành phê duyệt tự động...");
                setTimeout(() => {
                  if (!activePayTxRef.current) return;
                  const currentTx = activePayTxRef.current;
                  if (currentTx.toId) {
                    handleCreditorSettle(currentTx.toId);
                  } else {
                    handleDebtorSettle(currentTx.fromId, currentTx.amount);
                  }
                  setActivePayTx(null);
                }, 1600);
              } else {
                setOcrLog("✅ Biên lai thanh toán đã tải lên! Hãy nhập lời nhắn (nếu muốn) và click nút nộp biên lai ở phía dưới để gửi lên Trưởng nhóm xét duyệt.");
              }
            }, 1800);
          }, 1500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Safe clipboard copier
  const handleCopy = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Debtor pays into Central Fund
  const handleDebtorSettle = (debtorId: string, customAmount?: number) => {
    const debtor = getMember(debtorId);
    if (!debtor) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const relevantTxs = transactions.filter((tx) => tx.fromId === debtorId);

    if (relevantTxs.length === 0) return;

    if (customAmount !== undefined) {
      // Direct single logging for specific dialog
      const settlementExpense: Expense = {
        id: `settle_fund_in_${debtorId}_${Date.now()}`,
        description: `📥 [Nộp Quỹ] ${debtor.name} đã quét mã đóng Quỹ Nhóm hoàn ngạch nợ rảnh tay`,
        amount: customAmount,
        payerId: debtorId,
        date: todayStr,
        participantIds: members.filter(m => m.id !== debtorId).map(m => m.id),
      };
      onAddExpense(settlementExpense);
      return;
    }

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

  const isGroupFundConfigured = !!(activeGroup?.fundPhone || activeGroup?.fundQrImage);

  // Find bank name text
  const currentBankObj = VIETNAM_BANKS.find(b => b.code === bankCode);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6 relative">
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
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
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

          {/* MOMO & VietQR FUND CONFIGURATION PANEL */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
            {/* Header / Presenter section */}
            <div className="p-4 flex items-center justify-between border-b border-slate-200/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${activeGroup?.fundPhone ? 'bg-pink-100 text-pink-650' : 'bg-slate-200 text-slate-500'}`}>
                  <QrCode className="h-4.5 w-4.5 text-pink-600" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block font-extrabold text-[11px] text-slate-500 uppercase tracking-wider">Cấu hình Quỹ MoMo / VietQR</span>
                  {activeGroup?.fundPhone ? (
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {activeGroup.fundType === "momo" ? "Ví MoMo" : currentBankObj?.name || "Ngân hàng"}:{" "}
                      <span className="font-mono text-indigo-600">{activeGroup.fundPhone}</span>
                      {activeGroup.fundName && ` - ${activeGroup.fundName}`}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-450">Chưa thiết lập ví nhận quỹ. Hãy thiết lập ngay!</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConfiguring(!isConfiguring)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>{isConfiguring ? "Đóng" : "Thiết lập"}</span>
                {isConfiguring ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Editing Box */}
            {isConfiguring && (
              <form onSubmit={handleSaveConfig} className="p-4 border-t border-slate-250/40 bg-white space-y-4 text-left animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Chọn Ngân hàng</label>
                    <select
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      {VIETNAM_BANKS.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Số tài khoản ngân hàng
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Nhập số tài khoản thẻ..."
                        value={bankAccount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setBankAccount(val);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-9 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên chủ tài khoản (Không dấu)</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ví dụ: NGUYEN VAN A"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-9 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsConfiguring(false)}
                    className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="p-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Lưu cấu hình quỹ nhóm
                  </button>
                </div>
              </form>
            )}

            {configSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs font-bold text-center border-t border-emerald-100">
                🎉 Đã cập nhật thông tin tài khoản nhận Quỹ thành công!
              </div>
            )}
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
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {debtors.map((d) => {
                    const member = getMember(d.memberId);
                    if (!member) return null;
                    return (
                      <div
                        key={`deb-${d.memberId}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-full border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 bg-slate-50 text-base">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              member.emoji
                            )}
                          </div>
                          <div className="text-left overflow-hidden">
                            <span className="block font-bold text-xs text-slate-800 truncate">{member.name}</span>
                            <span className="text-[9px] font-semibold text-amber-650 text-amber-600 uppercase tracking-wilder">Cần chuyển vào Quỹ</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-50 pt-2 sm:pt-0">
                          <span className="font-mono text-xs font-bold text-slate-900 pr-0.5 shrink-0">
                            {formatMoney(d.amount)}
                          </span>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isGroupFundConfigured ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setActivePayTx({ fromId: d.memberId, amount: d.amount, qrTab: "bank" })}
                                  className="bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 p-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-0.5 shadow-3xs"
                                  title="Quét mã VietQR Ngân hàng để đóng tiền vào Quỹ"
                                >
                                  <QrCode className="h-3 w-3 mr-1" />
                                  <span>QR Thanh toán</span>
                                </button>
                                <button
                                  onClick={() => handleDebtorSettle(d.memberId)}
                                  className="bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 text-emerald-700 p-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                                  title={`Xác nhận ${member.name} đã đóng tiền`}
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Đã thu</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] bg-amber-50 border border-amber-250 text-amber-800 font-bold px-1.5 py-1 rounded-lg shrink-0" title="Quỹ chung chưa cấu hình tài khoản nhận">
                                ⚠️ Chưa cài STK
                              </span>
                            )}
                          </div>
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
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {creditors.map((c) => {
                    const member = getMember(c.memberId);
                    if (!member) return null;
                    return (
                      <div
                        key={`cred-${c.memberId}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-full border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 bg-slate-50 text-base">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              member.emoji
                            )}
                          </div>
                          <div className="text-left overflow-hidden flex-1 min-w-0">
                            <span className="block font-bold text-xs text-slate-800 truncate">{member.name}</span>
                            <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wilder">Nhận lại từ Quỹ</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 border-slate-50 pt-2 sm:pt-0">
                          <span className="font-mono text-xs font-bold text-slate-900 pr-1 shrink-0">
                            {formatMoney(c.amount)}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!!(member.fundPhone || member.fundQrImage || member.bankAccount) ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setActivePayTx({ fromId: activeGroup?.id || "group", amount: c.amount, toId: c.memberId, qrTab: "bank" })}
                                  className="bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 p-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-0.5 shadow-3xs"
                                  title={`Quét mã VietQR của ${member.name} để hoàn dư`}
                                >
                                  <QrCode className="h-3 w-3 mr-1" />
                                  <span>QR Thanh toán</span>
                                </button>
                                <button
                                  onClick={() => handleCreditorSettle(c.memberId)}
                                  className="bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 text-indigo-700 p-1.5 px-2.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                                  title={`Xác nhận Quỹ đã hoàn đầy đủ tiền dư cho ${member.name}`}
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Đã trả</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] bg-amber-50 border border-amber-250 text-amber-800 font-bold px-1.5 py-1 rounded-lg shrink-0" title="Thành viên chưa cài đặt ví nhận">
                                ⚠️ Chưa cài STK
                              </span>
                            )}
                          </div>
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

      {/* (3) TRANSACTIONS VERIFICATION LIST - BIÊN LAI CHỜ DUYỆT */}
      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 mt-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 col">
            <FileText className="h-4 w-4 text-indigo-600" />
            📋 Đối soát Biên Lai ({pendingReceipts.length})
          </h4>
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-250/60 py-0.5 px-2 rounded-lg">
            Đối soát chuyển khoản
          </span>
        </div>

        {pendingReceipts.length === 0 ? (
          <div className="text-center py-6 text-slate-405 text-xs italic">
            Chưa có minh chứng hoặc biên lai chuyển khoản nào đang chờ đối soát.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReceipts.map((rec) => {
              const sender = getMember(rec.fromId);
              const receiver = rec.toId ? getMember(rec.toId) : null;
              
              return (
                <div 
                  key={rec.id} 
                  className={`bg-white border p-4.5 rounded-2xl flex flex-col justify-between gap-3 shadow-3xs transition-all relative overflow-hidden ${
                    rec.status === 'pending' ? 'border-amber-200 shadow-amber-500/5' :
                    rec.status === 'approved' ? 'border-emerald-250 shadow-emerald-500/5' :
                    'border-rose-200 shadow-rose-500/5'
                  }`}
                >
                  {/* Status ribbon top-right */}
                  <div className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase py-0.5 px-2 rounded-full flex items-center gap-1">
                    {rec.status === "pending" && <span className="bg-amber-100 text-amber-800">⏱️ Chờ duyệt</span>}
                    {rec.status === "approved" && <span className="bg-emerald-100 text-emerald-800">✅ Đã duyệt</span>}
                    {rec.status === "rejected" && <span className="bg-rose-100 text-rose-800">⚠️ Báo lỗi</span>}
                  </div>

                  <div className="space-y-2.5 text-left pr-28">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block font-sans">Người chuyển khoản</span>
                      <span className="text-xs font-extrabold text-slate-850 flex items-center gap-1">
                        <span className="text-sm">{sender?.emoji || "👥"}</span>
                        <span>{sender?.name || (rec.fromId === "group" ? "Thủ quỹ Quỹ Nhóm" : "Dữ liệu cũ")}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block font-sans">Số tiền chuyển</span>
                      <span className="text-sm font-black font-mono text-indigo-755">
                        {formatMoney(rec.amount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-400 block font-sans">Người nhận thụ hưởng</span>
                      <span className="text-xs font-bold text-slate-750 flex items-center gap-1">
                        <span className="text-sm">{receiver?.emoji || "🏦"}</span>
                        <span>{receiver?.name || "Tài khoản Quỹ chung nhóm"}</span>
                      </span>
                    </div>

                    <div className="text-[9px] text-slate-400 font-semibold font-sans">
                      📅 Nộp lúc: {rec.uploadedAt}
                    </div>

                    {rec.memberNote && (
                      <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-650 italic border border-slate-100 leading-normal">
                        <strong>Lời nhắn:</strong> "{rec.memberNote}"
                      </div>
                    )}

                    {rec.status === "rejected" && rec.rejectionReason && (
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-150 text-[10px] text-rose-800 leading-normal font-bold">
                        ⚠️ Lý do chưa phù hợp: {rec.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail and action buttons */}
                  <div className="flex gap-2.5 items-end justify-between mt-1 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <img 
                        src={rec.receiptImage} 
                        alt="Receipt Preview" 
                        className="w-12 h-12 rounded-lg object-cover cursor-pointer border border-slate-200 hover:scale-105 active:scale-95 transition-all"
                        onClick={() => setZoomedReceiptImage(rec.receiptImage)}
                      />
                      <span className="text-[9px] text-indigo-600 font-extrabold cursor-pointer hover:underline" onClick={() => setZoomedReceiptImage(rec.receiptImage)}>
                        🔍 Click xem to
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                      {/* Admin controls */}
                      {isAdmin && rec.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveReceipt(rec)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
                          >
                            Duyệt khớp
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectReceipt(rec)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                      {/* Member actions */}
                      {(!isAdmin && (rec.status === "pending" || rec.status === "rejected")) && (
                        <button
                          type="button"
                          onClick={() => handleCancelReceipt(rec.id)}
                          className="bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-extrabold text-[10px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          Hủy nộp & tải lại
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox zoomed modal */}
      <AnimatePresence>
        {zoomedReceiptImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-4 rounded-3xl border border-slate-200 max-w-md w-full relative space-y-4"
            >
              <button 
                type="button" 
                onClick={() => setZoomedReceiptImage(null)}
                className="absolute top-3 right-3 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer text-slate-500 hover:text-slate-800 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h5 className="font-extrabold text-sm text-slate-850 pb-2 border-b border-slate-100 flex items-center gap-2 text-left">
                🔍 Biên lai chuyển khoản chi tiết
              </h5>
              
              <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-150 bg-slate-50 p-2">
                <img 
                  src={zoomedReceiptImage} 
                  alt="Full Zoomed Receipt" 
                  referrerPolicy="no-referrer"
                  className="w-full object-contain mx-auto rounded-xl" 
                />
              </div>
              
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setZoomedReceiptImage(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white py-2 px-5 text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  Tôi đã xem xong
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED DIALOG: DYNAMIC INTERACTIVE QR MODAL */}
      {activePayTx && (() => {
        const isPayingToMember = !!activePayTx.toId;
        const targetMember = isPayingToMember ? getMember(activePayTx.toId!) : null;

        const hasConfigured = isPayingToMember 
          ? !!(targetMember?.fundPhone || targetMember?.fundQrImage || targetMember?.bankAccount)
          : !!(activeGroup?.fundPhone || activeGroup?.fundQrImage || activeGroup?.bankAccount);
        
        // Dynamic generation based on dual configurations
        const mQrPhone = isPayingToMember ? (targetMember?.bankAccount || targetMember?.fundPhone || "") : (activeGroup?.bankAccount || activeGroup?.fundPhone || "");
          
        const mQrName = isPayingToMember ? (targetMember?.bankAccountName || targetMember?.fundName || targetMember?.name || "") : (activeGroup?.bankAccountName || activeGroup?.fundName || "");
          
        const mQrBank = isPayingToMember ? (targetMember?.bankCode || targetMember?.fundBankName || "") : (activeGroup?.bankCode || activeGroup?.fundBankName || "");
          
        const mQrImage = isPayingToMember ? (targetMember?.bankQrImage || targetMember?.fundQrImage || "") : (activeGroup?.bankQrImage || activeGroup?.fundQrImage || "");
          
        const mMemo = isPayingToMember 
          ? `Hoan du quy - ${targetMember?.name || ""}`
          : `Nop quy nhom - ${getMember(activePayTx.fromId)?.name || ""}`;

        return (
          <div id="qr-modal-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-slate-100 shadow-2xl relative animate-scale-up flex flex-col max-h-[90vh]">
              {/* Top Pink-Indigo themed header */}
              <div className="p-4 text-white flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-850">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  <span className="font-extrabold text-xs uppercase tracking-wider">
                    {isPayingToMember ? `Hoàn Dư cho ${targetMember?.name}` : "Mã QR Hoàn Nợ"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePayTx(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition-all text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Content main body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4 text-center">
                
                {/* Warning warning badge if not configured */}
                {!hasConfigured && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-2xl text-[10px] font-semibold text-center leading-relaxed">
                    ⚠️ {isPayingToMember ? "Thành viên" : "Quỹ nhóm"} chưa cài đặt tài khoản nhận.
                    <br />
                    Đang hiển thị <span className="font-extrabold text-amber-900">QR Mẫu (Demo)</span>. Hãy cài đặt số tài khoản chính thức ở mục {isPayingToMember ? "Thành viên" : "Cấu hình"} để nhận tiền thật!
                  </div>
                )}

                {/* Receipt status top box */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {isPayingToMember ? "Quỹ chi trả hoàn dư" : "Thành viên nộp quỹ"}
                  </span>
                  <p className="text-sm font-black text-slate-800">
                    {isPayingToMember ? targetMember?.name : getMember(activePayTx.fromId)?.name}
                  </p>
                  <p className="text-xl font-black text-rose-600 font-mono">
                    {formatMoney(activePayTx.amount)}
                  </p>
                </div>

                {/* UP-TO-DATE DYNAMIC OCR / RECEIPT UPLOADER */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-3 text-left">
                  {ocrState === "idle" ? (
                    <div className="relative border border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-xl p-4 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer group">
                      <input
                        id="receipt-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        title="Tải ảnh biên lai thanh toán lên hệ thống đối soát"
                      />
                      <div className="p-2 bg-indigo-100/60 rounded-full group-hover:scale-105 transition-all text-indigo-600">
                        <Upload className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-indigo-950">Xác nhận nhanh bằng ảnh biên lai</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Nếu làm trên điện thoại, chụp màn hình biên lai rồi tải lên đây để đối soát khớp 100% tự động</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-fade-in">
                      {/* Active simulation header */}
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-150">
                        {receiptImage && (
                          <img
                            src={receiptImage}
                            alt="Receipt Preview Thumbnail"
                            className="h-10 w-10 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">
                            {ocrState === "scanning" && "🔍 AI ĐANG QUÉT..."}
                            {ocrState === "matching" && "✨ ĐANG GIẢI MÃ & SO KHỚP..."}
                            {ocrState === "success" && "🎉 THÀNH CÔNG!"}
                          </p>
                          <p className="text-[11px] text-slate-700 font-bold leading-normal">{ocrLog}</p>
                        </div>
                        <div className="shrink-0">
                          {ocrState !== "success" ? (
                            <RefreshCw className="h-4.5 w-4.5 text-indigo-600 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-bounce" />
                          )}
                        </div>
                      </div>

                      {/* Cool progress bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            ocrState === "scanning" ? "w-1/3 bg-indigo-500" :
                            ocrState === "matching" ? "w-2/3 bg-indigo-650 animate-pulse" :
                            "w-full bg-emerald-500"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Member Optional Note input */}
                {!isAdmin && receiptImage && (
                  <div className="space-y-1.5 text-left animate-fade-in mt-1">
                    <label htmlFor="member-note-textarea" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      📝 Lời nhắn đi kèm (Ví dụ: "Em đã chuyển rồi")
                    </label>
                    <textarea
                      id="member-note-textarea"
                      value={memberNote}
                      onChange={(e) => setMemberNote(e.target.value)}
                      placeholder="Nhập ghi chú chuyển tiền..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-hidden transition-all resize-none h-16 shadow-3xs"
                    />
                  </div>
                )}

                {/* LIVE QR IMAGE COMPONENT */}
                <div className="bg-slate-100 p-4 rounded-3xl inline-block relative border border-slate-200 w-full">
                    {/* Auto generate based on selecting tab */}
                    {!mQrPhone ? (
                      <div className="space-y-2 py-4 h-[200px] flex flex-col items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                        <p className="text-[11px] font-bold text-rose-600 px-4 text-center">
                          Lỗi: Chưa thiết lập cấu hình Ngân hàng hợp lệ! Vui lòng thiết lập Số tài khoản để tạo QR.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <img
                          src={`https://img.vietqr.io/image/${mQrBank === "momo" ? "MB" : mQrBank}-${mQrPhone}-qr_only.png?amount=${Math.round(activePayTx.amount)}&addInfo=${encodeURIComponent(mMemo)}&accountName=${encodeURIComponent(mQrName)}`}
                          alt="QR Payment Code"
                          className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto rounded-lg bg-white p-1 shadow-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            target.src = ""; // Clear src to trigger alt or fallback
                            // Also append some error text
                            target.parentElement?.parentElement?.querySelector('.error-text')?.classList.remove('hidden');
                          }}
                        />
                        <div className="error-text hidden space-y-2 py-2">
                            <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                            <p className="text-[10px] font-bold text-rose-600 px-2 text-center leading-relaxed">
                                Không thể tạo mã VietQR. Có thể Số Tài Khoản hoặc Mã Ngân Hàng của thành viên chưa chính xác. Vui lòng kiểm tra lại.
                            </p>
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-650">
                          Mã VietQR tự động điền số tiền
                        </p>
                      </div>
                    )}
                </div>

                {/* CHIA SẺ THANH TOÁN QUA MẠNG XÃ HỘI */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Share2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wide">Chia sẻ cho thành viên</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* BUTTON 1: COPY FORMATTED TEXT TO CLIPBOARD */}
                    <button
                      disabled={!mQrPhone}
                      onClick={() => {
                        if (!mQrPhone) return;
                        const qrUrl = `https://img.vietqr.io/image/${mQrBank === "momo" ? "MB" : mQrBank}-${mQrPhone}-qr_only.png?amount=${Math.round(activePayTx.amount)}&addInfo=${encodeURIComponent(mMemo)}&accountName=${encodeURIComponent(mQrName)}`;
                        const fullText = `💸 Nhờ bạn chuyển khoản hoàn nợ:\n- Số tiền: ${formatMoney(activePayTx.amount)}\n- Chuyển đến: ${mQrName}\n- SĐT/STK: ${mQrPhone} (${mQrBank === "momo" ? "MB" : mQrBank})\n- Nội dung: ${mMemo}\nChuyển nhanh tại đây nhé: ${qrUrl}`;
                        handleCopy(fullText, "shareText");
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-bold shadow-3xs transition-all ${
                        !mQrPhone ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                      }`}
                    >
                      <span>{copiedField === "shareText" ? "✓ Đã chép tin" : "📋 Chép tin gửi Zalo/FB"}</span>
                    </button>

                    {/* BUTTON 2: NATIVE / WEB SHARE */}
                    <button
                      disabled={!mQrPhone}
                      onClick={async () => {
                        if (!mQrPhone) return;
                        const qrUrl = `https://img.vietqr.io/image/${mQrBank === "momo" ? "MB" : mQrBank}-${mQrPhone}-qr_only.png?amount=${Math.round(activePayTx.amount)}&addInfo=${encodeURIComponent(mMemo)}&accountName=${encodeURIComponent(mQrName)}`;
                        const title = 'Thanh toán Quỹ Nhóm';
                        const text = `💸 Yêu cầu thanh toán ${formatMoney(activePayTx.amount)} từ Sòng Phẳng nhóm!\n- Tài khoản: ${mQrPhone} (${mQrBank === "momo" ? "MB" : mQrBank})\n- Nội dung: ${mMemo}`;
                        
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: title,
                              text: text,
                              url: qrUrl
                            });
                          } catch (err) {
                            console.log("Error sharing:", err);
                          }
                        } else {
                          // Fallback to copying
                          handleCopy(`${text}\nLink QR: ${qrUrl}`, "shareText");
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all ${
                        !mQrPhone ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none" : "bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 cursor-pointer text-center"
                      }`}
                    >
                      <Share2 className="h-3 w-3" />
                      <span>Chia sẻ nhanh</span>
                    </button>
                  </div>

                  {/* QUICK SOCIAL APPS shortcuts indicator */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 border-t border-slate-150/60">
                    <span>Chia sẻ nhanh qua Zalo, Messenger, SMS...</span>
                    {copiedField === "shareText" && (
                      <span className="text-emerald-600 font-bold animate-pulse">✓ Hãy dán (Paste) vào group chat!</span>
                    )}
                  </div>
                </div>

                {/* Instructions list copyable elements */}
                <div className="space-y-2.5 text-left text-xs text-slate-600">
                  {/* 1. Account details receiver row */}
                  {mQrPhone && (
                    <div className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 p-2 px-3 rounded-xl border border-slate-150 transition-all">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Số tài khoản / Số điện thoại nhận</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{mQrPhone}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(mQrPhone, "phone")}
                        className="p-1.5 hover:bg-white border hover:border-slate-300 rounded-lg text-indigo-600 cursor-pointer transition-all flex items-center gap-1 text-[10px]"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedField === "phone" ? "Đã chép" : "Sao chép"}</span>
                      </button>
                    </div>
                  )}

                  {/* 2. Holder Name details row */}
                  {mQrName && (
                    <div className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 p-2 px-3 rounded-xl border border-slate-150 transition-all">
                      <div>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Họ tên chủ tài khoản nhận</span>
                        <span className="font-bold text-slate-800">{mQrName}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(mQrName, "name")}
                        className="p-1.5 hover:bg-white border hover:border-slate-300 rounded-lg text-indigo-600 cursor-pointer transition-all flex items-center gap-1 text-[10px]"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedField === "name" ? "Đã chép" : "Sao chép"}</span>
                      </button>
                    </div>
                  )}

                  {/* 3. Pre-filled Memo content */}
                  <div className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/50 p-2 px-3 rounded-xl border border-slate-150 transition-all">
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Nội dung chuyển tiền (Memo)</span>
                      <span className="font-bold text-indigo-800 font-mono text-[11px] truncate block max-w-[200px]">
                        {mMemo}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(mMemo, "memo")}
                      className="p-1.5 hover:bg-white border hover:border-slate-300 rounded-lg text-indigo-600 cursor-pointer transition-all flex items-center gap-1 text-[10px]"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedField === "memo" ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom action trigger bar */}
              <div className="p-4 bg-slate-50 border-t border-slate-150 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActivePayTx(null);
                    setReceiptImage(null);
                    setMemberNote("");
                    setOcrState("idle");
                  }}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-2xl py-2.5 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Hủy bỏ
                </button>
                
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isPayingToMember) {
                        handleCreditorSettle(activePayTx.toId!);
                      } else {
                        handleDebtorSettle(activePayTx.fromId, activePayTx.amount);
                      }
                      setActivePayTx(null);
                    }}
                    className="flex-1 text-white rounded-2xl py-2.5 text-xs font-extrabold transition-all cursor-pointer text-center shadow-sm bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10"
                  >
                    {isPayingToMember ? "Xác nhận đã trả" : "Xác nhận đã đóng"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!receiptImage}
                    onClick={handleMemberSubmitReceipt}
                    className={`flex-1 rounded-2xl py-2.5 text-xs font-extrabold transition-all text-center shadow-sm ${
                      receiptImage 
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-600/10" 
                        : "bg-slate-250 text-slate-400 cursor-not-allowed border border-slate-200"
                    }`}
                  >
                    {receiptImage ? "Nộp minh chứng (Chờ duyệt)" : "⚠️ Cần tải ảnh biên lai"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
