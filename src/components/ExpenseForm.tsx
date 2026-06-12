import React, { useState, useEffect } from "react";
import { Member, Expense } from "../types";
import { Receipt, Calendar, User, Users, AlertCircle, Sparkles, UploadCloud, X, ArrowLeft, Check, Image as ImageIcon } from "lucide-react";

interface ExpenseFormProps {
  members: Member[];
  onAddExpense: (expense: Expense) => void;
  editingExpense?: Expense | null;
  onCancelEdit?: () => void;
  onUpdateExpense?: (expense: Expense) => void;
}

export default function ExpenseForm({
  members,
  onAddExpense,
  editingExpense,
  onCancelEdit,
  onUpdateExpense,
}: ExpenseFormProps) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [payerId, setPayerId] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Keep list of selected participants
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Receipt image upload
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Sync participants and payer with members prop on change / prefill for Editing
  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description);
      setAmountStr(editingExpense.amount.toLocaleString("vi-VN"));
      setPayerId(editingExpense.payerId);
      setDate(editingExpense.date);
      setSelectedParticipants(editingExpense.participantIds);
      setReceiptImage(editingExpense.receiptImage || null);
    } else {
      if (members.length > 0) {
        if (!payerId) {
          setPayerId(members[0].id);
        }
        // Default to select everyone who is not already selected or all if state is empty
        if (selectedParticipants.length === 0) {
          setSelectedParticipants(members.map((m) => m.id));
        } else {
          // Keeps only valid remaining member IDs
          const validIds = members.map((m) => m.id);
          setSelectedParticipants((prev) => prev.filter((id) => validIds.includes(id)));
        }
      }
    }
  }, [editingExpense, members]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Chỉ hỗ trợ upload hình ảnh (PNG, JPG, JPEG).");
      return;
    }
    if (file.size > 1.2 * 1024 * 1024) {
      setErrorMsg("Kích thước ảnh quá lớn. Vui lòng chọn ảnh < 1.2MB để đảm bảo bộ nhớ lưu trữ.");
      return;
    }
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReceiptImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectAll = () => {
    setSelectedParticipants(members.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedParticipants([]);
  };

  const handleToggleParticipant = (memberId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Safe numerical parser
  const getAmountNumber = () => {
    return parseInt(amountStr.replace(/[^0-9]/g, "")) || 0;
  };

  // Visual formatting as user types: "100000" -> "100.000"
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (rawVal === "") {
      setAmountStr("");
      return;
    }
    const num = parseInt(rawVal);
    setAmountStr(num.toLocaleString("vi-VN"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const amount = getAmountNumber();
    const trimmedDesc = description.trim();

    if (!trimmedDesc) {
      setErrorMsg("Vui lòng nhập nội dung chi phí.");
      return;
    }

    if (amount <= 0) {
      setErrorMsg("Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }

    if (!payerId) {
      setErrorMsg("Vui lòng chọn người thanh toán.");
      return;
    }

    if (selectedParticipants.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 thành viên tham gia chia tiền.");
      return;
    }

    if (editingExpense) {
      const updatedExpense: Expense = {
        id: editingExpense.id,
        description: trimmedDesc,
        amount,
        payerId,
        date,
        participantIds: selectedParticipants,
        receiptImage: receiptImage || undefined,
      };

      if (onUpdateExpense) {
        onUpdateExpense(updatedExpense);
      }
    } else {
      const newExpense: Expense = {
        id: "exp_" + Date.now(),
        description: trimmedDesc,
        amount,
        payerId,
        date,
        participantIds: selectedParticipants,
        receiptImage: receiptImage || undefined,
      };

      onAddExpense(newExpense);
    }

    // Reset fields
    setDescription("");
    setAmountStr("");
    setReceiptImage(null);
  };

  const amount = getAmountNumber();
  const costPerPerson = selectedParticipants.length > 0 ? Math.round(amount / selectedParticipants.length) : 0;

  return (
    <div id="expense-form-root" className={`bg-white p-6 rounded-3xl border shadow-xs space-y-5 transition-all duration-300 ${editingExpense ? "border-indigo-300 ring-2 ring-indigo-500/20" : "border-slate-200"}`}>
      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          {editingExpense ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-indigo-700 font-extrabold">Đang sửa chi phí</span>
            </>
          ) : (
            <>
              <Receipt className="h-4 w-4 text-emerald-600" />
              <span>Thêm khoản chi chung</span>
            </>
          )}
        </h4>

        {editingExpense && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Hủy, tạo mới
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-center text-xs text-amber-700 font-medium">
          Vui lòng thêm thành viên vào nhóm trước khi tạo chi phí!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="expense-desc">
                Nội dung chi phí
              </label>
              <div className="relative">
                <input
                  id="expense-desc"
                  type="text"
                  placeholder="Ví dụ: Ăn lẩu hột vịt lộn, Vé tàu hỏa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={100}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-800 text-sm transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="expense-amount">
                Số tiền mặt (VND)
              </label>
              <div className="relative">
                <input
                  id="expense-amount"
                  type="text"
                  placeholder="0"
                  value={amountStr}
                  onChange={handleAmountChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono font-bold text-slate-800 text-sm transition-all text-right shadow-xs"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                  ₫
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payer Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="expense-payer">
                Người trả tiền trước
              </label>
              <div className="relative">
                <select
                  id="expense-payer"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 pr-10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-800 text-sm transition-all appearance-none cursor-pointer shadow-xs"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Date Pick */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="expense-date">
                Ngày phát sinh
              </label>
              <div className="relative">
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-800 text-sm transition-all cursor-pointer shadow-xs"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[10px] text-indigo-600 font-extrabold pl-1 pt-0.5">
                Định dạng lưu: {(() => {
                  if (!date) return "";
                  const parts = date.split("-");
                  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
                })()}
              </p>
            </div>
          </div>

          {/* Upload ảnh hóa đơn (tùy chọn) */}
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 justify-start">
              <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
              Ảnh hóa đơn / Biên lai (Tùy chọn)
            </span>
            
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center min-h-[90px] ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/50"
                  : receiptImage
                  ? "border-slate-300 bg-slate-50/45"
                  : "border-slate-200 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <input
                type="file"
                id="receipt-upload"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              
              {receiptImage ? (
                <div className="w-full flex flex-col sm:flex-row items-center gap-3 justify-between">
                  <div className="flex items-center gap-2.5 max-w-[80%] min-w-0">
                    <img
                      src={receiptImage}
                      alt="Receipt Preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 truncate">Ảnh hóa đơn lưu thành công</p>
                      <p className="text-[10px] text-slate-400">Có thể xem lại trong lịch sử chi phí</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="p-1.5 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100/85 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                </div>
              ) : (
                <label htmlFor="receipt-upload" className="cursor-pointer w-full h-full py-1 block">
                  <div className="flex flex-col items-center justify-center">
                    <UploadCloud className={`h-8 w-8 mb-1.5 text-slate-350 ${dragActive ? "animate-bounce" : ""}`} />
                    <p className="text-xs font-extrabold text-slate-750">Kéo thả ảnh hoặc click để tải lên hóa đơn</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG dưới 1.2MB</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Selective split toggles */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-550" />
                <span className="text-xs font-bold text-slate-700">Chia sẻ cùng ai ({selectedParticipants.length} người)</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-all cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300 text-xs">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-700 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-all cursor-pointer"
                >
                  Xóa hết chọn
                </button>
              </div>
            </div>

            {/* Dynamic sharing preview box */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {members.map((m) => {
                const isSelected = selectedParticipants.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleToggleParticipant(m.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-indigo-200 text-indigo-900 shadow-sm shadow-indigo-100/50 scale-[1.02]"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100/50"
                    }`}
                  >
                    <div className="relative">
                      <span className="inline-block text-base">{m.emoji}</span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white"></div>
                      )}
                    </div>
                    <span className="truncate flex-1">{m.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Price forecast preview feedback */}
            {amount > 0 && selectedParticipants.length > 0 && (
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-100/30 rounded-xl flex items-center justify-between text-xs text-indigo-800 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span>Dự báo mỗi người đóng:</span>
                </div>
                <span className="font-bold font-mono text-indigo-700">
                  {new Intl.NumberFormat("vi-VN").format(costPerPerson)} ₫
                </span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className={`w-full text-white rounded-2xl py-3.5 px-4 font-bold text-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
              editingExpense
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15"
            }`}
          >
            {editingExpense ? (
              <>
                <Check className="h-4 w-4" />
                Lưu thay đổi khoản chi
              </>
            ) : (
              "Thêm chi phí này vào quỹ chung"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
