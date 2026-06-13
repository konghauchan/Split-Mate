import React, { useState, useEffect } from "react";
import { Member, Expense } from "../types";
import { Receipt, Calendar, User, Users, AlertCircle, Sparkles, UploadCloud, X, ArrowLeft, Check, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

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
  
  const toDMY = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const [dateInput, setDateInput] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${day}/${month}/${year}`;
  });

  // Custom Vietnamese Calendar Dropdown states
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (!showCalendar) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".calendar-popover-container") && !target.closest("#expense-date-wrapper")) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showCalendar]);

  const parseInputToCalendar = (val: string) => {
    const parts = val.split("/");
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1990 && y <= 2100 && m >= 0 && m < 12 && d >= 1 && d <= 31) {
        setCurrentMonth(m);
        setCurrentYear(y);
      }
    }
  };

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
      setDateInput(toDMY(editingExpense.date));
      setSelectedParticipants(editingExpense.participantIds);
      setReceiptImage(editingExpense.receiptImage || null);
    } else {
      if (members.length > 0) {
        if (!payerId) {
          setPayerId(members[0].id);
        }
        // Default to select active participants who are set of upcoming active
        if (selectedParticipants.length === 0) {
          const activeParticipants = members.filter((m) => m.isUpcomingActive !== false);
          setSelectedParticipants(activeParticipants.length > 0 ? activeParticipants.map((m) => m.id) : members.map((m) => m.id));
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

  // Mask and format date: "1206" -> "12/06", "1206202" -> "12/06/202"
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Keep only numbers
    const digits = rawVal.replace(/\D/g, "");
    let formatted = "";
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += "/" + digits.substring(2, 4);
    }
    if (digits.length > 4) {
      formatted += "/" + digits.substring(4, 8);
    }
    setDateInput(formatted);
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

    // Validate and parse dateInput (dd/mm/yyyy)
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const dateMatch = dateInput.trim().match(datePattern);
    if (!dateMatch) {
      setErrorMsg("Ngày phát sinh chưa đúng định dạng dd/mm/yyyy (Ví dụ: 12/06/2026).");
      return;
    }

    const dayInt = parseInt(dateMatch[1], 10);
    const monthInt = parseInt(dateMatch[2], 10);
    const yearInt = parseInt(dateMatch[3], 10);

    if (monthInt < 1 || monthInt > 12) {
      setErrorMsg("Tháng không hợp lệ (phải từ 01 đến 12).");
      return;
    }
    if (dayInt < 1 || dayInt > 31) {
      setErrorMsg("Ngày không hợp lệ (phải từ 01 đến 31).");
      return;
    }

    // Checking if valid calendar day
    const parsedDate = new Date(yearInt, monthInt - 1, dayInt);
    if (parsedDate.getFullYear() !== yearInt || parsedDate.getMonth() !== monthInt - 1 || parsedDate.getDate() !== dayInt) {
      setErrorMsg("Ngày phát sinh không tồn tại trong lịch.");
      return;
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const formattedIsoDate = `${yearInt}-${pad(monthInt)}-${pad(dayInt)}`;

    if (editingExpense) {
      const updatedExpense: Expense = {
        id: editingExpense.id,
        description: trimmedDesc,
        amount,
        payerId,
        date: formattedIsoDate,
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
        date: formattedIsoDate,
        participantIds: selectedParticipants,
        receiptImage: receiptImage || undefined,
      };

      onAddExpense(newExpense);
    }

    // Reset fields
    setDescription("");
    setAmountStr("");
    setReceiptImage(null);

    // Reset dateInput to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setDateInput(`${day}/${month}/${year}`);
  };

  const VIETNAMESE_MONTHS = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];
  const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const buildCalendarGrid = () => {
    const list: { day: number; isCurrent: boolean; dateObj: Date; isSelected: boolean; isToday: boolean }[] = [];
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    // Leading padding days (from previous month)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dObj = new Date(currentYear, currentMonth - 1, prevMonthDays - i);
      list.push({
        day: prevMonthDays - i,
        isCurrent: false,
        dateObj: dObj,
        isSelected: false,
        isToday: isSameDay(dObj, new Date()),
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(currentYear, currentMonth, d);
      let isSel = false;
      const parts = dateInput.split("/");
      if (parts.length === 3) {
        const dayI = parseInt(parts[0], 10);
        const monthI = parseInt(parts[1], 10) - 1;
        const yearI = parseInt(parts[2], 10);
        if (d === dayI && currentMonth === monthI && currentYear === yearI) {
          isSel = true;
        }
      }
      list.push({
        day: d,
        isCurrent: true,
        dateObj: dObj,
        isSelected: isSel,
        isToday: isSameDay(dObj, new Date()),
      });
    }

    // Trailing padding days (from next month)
    const totalCells = 42; // standard 6 rows grid
    const remaining = totalCells - list.length;
    for (let i = 1; i <= remaining; i++) {
      const dObj = new Date(currentYear, currentMonth + 1, i);
      list.push({
        day: i,
        isCurrent: false,
        dateObj: dObj,
        isSelected: false,
        isToday: isSameDay(dObj, new Date()),
      });
    }

    return list;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const selectDay = (dateObj: Date) => {
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = dateObj.getFullYear();
    setDateInput(`${d}/${m}/${y}`);
    setShowCalendar(false);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
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
            onClick={() => {
              setDescription("");
              setAmountStr("");
              setReceiptImage(null);
              setErrorMsg("");
              
              const today = new Date();
              const year = today.getFullYear();
              const month = String(today.getMonth() + 1).padStart(2, "0");
              const day = String(today.getDate()).padStart(2, "0");
              setDateInput(`${day}/${month}/${year}`);
              
              onCancelEdit();
            }}
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
            <div className="space-y-1" id="expense-date-wrapper">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="expense-date">
                Ngày phát sinh
              </label>
              <div className="relative">
                <input
                  id="expense-date"
                  type="text"
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  value={dateInput}
                  onChange={handleDateInputChange}
                  onFocus={() => {
                    parseInputToCalendar(dateInput);
                    setShowCalendar(true);
                  }}
                  onClick={() => {
                    parseInputToCalendar(dateInput);
                    setShowCalendar(true);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 pr-10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono font-medium text-slate-800 text-sm transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    parseInputToCalendar(dateInput);
                    setShowCalendar((prev) => !prev);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Calendar className="h-4 w-4" />
                </button>

                {/* Custom Vietnamese Calendar Popover */}
                {showCalendar && (
                  <div className="calendar-popover-container absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-fade-in space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {VIETNAMESE_MONTHS[currentMonth]} năm {currentYear}
                      </span>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-400">
                      {WEEKDAYS.map((w) => (
                        <div key={w} className="py-1">{w}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {buildCalendarGrid().map((cell, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectDay(cell.dateObj)}
                          className={`h-7 w-7 mx-auto rounded-full text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                            cell.isSelected
                              ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30"
                              : cell.isCurrent
                              ? cell.isToday
                                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                                : "text-slate-700 hover:bg-slate-100"
                              : "text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {cell.day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-indigo-600 font-semibold pl-1 pt-0.5">
                Nhập tay liên tục ví dụ: <span className="underline">12062026</span> để tự động thành <span className="font-bold">12/06/2026</span>
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
                    <div className="relative flex items-center justify-center">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.name}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 inline-block shrink-0"
                        />
                      ) : (
                        <span className="inline-block text-base">{m.emoji}</span>
                      )}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-505 bg-indigo-600 rounded-full border border-white"></div>
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
