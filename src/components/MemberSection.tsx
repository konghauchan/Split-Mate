import React, { useState } from "react";
import { Member, Expense } from "../types";
import { calculateBalances } from "../utils/debtSimplifier";
import { MEMBER_COLORS, MEMBER_EMOJIS } from "../utils/mockData";
import { VIETNAM_BANKS } from "../utils/banks";
import { 
  Plus, 
  Trash2, 
  UserPlus, 
  Users, 
  AlertCircle, 
  Pencil, 
  Check, 
  X, 
  Crown, 
  UploadCloud, 
  RefreshCw, 
  User,
  QrCode,
  Phone,
  CreditCard,
  Upload,
  Lock,
  Copy
} from "lucide-react";

interface MemberSectionProps {
  members: Member[];
  expenses: Expense[];
  onAddMember: (member: Member) => void;
  onRemoveMember: (id: string) => void;
  onEditMember: (member: Member) => void;
  isAdmin?: boolean;
  viewingMemberId?: string;
}

export default function MemberSection({
  members,
  expenses,
  onAddMember,
  onRemoveMember,
  onEditMember,
  isAdmin = true,
  viewingMemberId,
}: MemberSectionProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(MEMBER_COLORS[0].class);
  const [selectedEmoji, setSelectedEmoji] = useState(MEMBER_EMOJIS[0]);
  const [errorMsg, setErrorMsg] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // Dual payment details state for individual member
  const [setupTab, setSetupTab] = useState<"momo" | "bank">("momo");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoQrImage, setMomoQrImage] = useState("");
  
  const [bankAccount, setBankAccount] = useState("");
  const [bankCode, setBankCode] = useState("VCB");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankQrImage, setBankQrImage] = useState("");

  // Editing state for Group Admin
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [loadingEditAvatar, setLoadingEditAvatar] = useState(false);
  const [editError, setEditError] = useState("");

  // Editing payment details state for individual member
  const [editSetupTab, setEditSetupTab] = useState<"momo" | "bank">("momo");
  const [editMomoPhone, setEditMomoPhone] = useState("");
  const [editMomoQrImage, setEditMomoQrImage] = useState("");
  
  const [editBankAccount, setEditBankAccount] = useState("");
  const [editBankCode, setEditBankCode] = useState("VCB");
  const [editBankAccountName, setEditBankAccountName] = useState("");
  const [editBankQrImage, setEditBankQrImage] = useState("");

  const balances = calculateBalances(members, expenses);

  const handleAvatarSelect = (file: File, isEdit: boolean) => {
    if (!file.type.startsWith("image/")) {
      if (isEdit) setEditError("Chỉ hỗ trợ tải lên file hình ảnh.");
      else setErrorMsg("Chỉ hỗ trợ tải lên file hình ảnh.");
      return;
    }

    if (isEdit) {
      setEditError("");
      setLoadingEditAvatar(true);
    } else {
      setErrorMsg("");
      setLoadingAvatar(true);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize and center crop at 128x128 for clean local portrait storage
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          if (isEdit) {
            setEditAvatar(optimizedDataUrl);
          } else {
            setAvatar(optimizedDataUrl);
          }
        } else {
          const rawBase64 = event.target?.result as string;
          if (isEdit) setEditAvatar(rawBase64);
          else setAvatar(rawBase64);
        }
        if (isEdit) setLoadingEditAvatar(false);
        else setLoadingAvatar(false);
      };
      img.onerror = () => {
        const errorText = "Không hiển thị được tệp ảnh này.";
        if (isEdit) setEditError(errorText);
        else setErrorMsg(errorText);
        if (isEdit) setLoadingEditAvatar(false);
        else setLoadingAvatar(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      const errorText = "Lỗi khi đọc file vừa tải lên.";
      if (isEdit) setEditError(errorText);
      else setErrorMsg(errorText);
      if (isEdit) setLoadingEditAvatar(false);
      else setLoadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Vui lòng nhập tên thành viên.");
      return;
    }

    if (members.some((m) => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMsg("Tên này đã tồn tại trong nhóm.");
      return;
    }

    const newMember: Member = {
      id: "m_" + Date.now(),
      name: trimmedName,
      color: selectedColor,
      emoji: selectedEmoji,
      avatar: avatar || undefined,
      momoPhone: momoPhone.trim() || undefined,
      momoQrImage: momoQrImage || undefined,
      bankAccount: bankAccount.trim() || undefined,
      bankAccountName: bankAccountName.trim().toUpperCase() || undefined,
      bankCode: bankCode,
      bankQrImage: bankQrImage || undefined,
      
      // Fallbacks
      fundType: "bank",
      fundPhone: bankAccount.trim(),
      fundName: bankAccountName.trim().toUpperCase() || undefined,
      fundBankName: bankCode,
      fundQrImage: undefined,
    };

    onAddMember(newMember);
    setName("");
    setAvatar(null);
    setMomoPhone("");
    setMomoQrImage("");
    setBankAccount("");
    setBankAccountName("");
    setBankQrImage("");
    setSetupTab("momo");

    // Randomize the color and emoji selections for the next add
    const randomColor = MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)].class;
    const randomEmoji = MEMBER_EMOJIS[Math.floor(Math.random() * MEMBER_EMOJIS.length)];
    setSelectedColor(randomColor);
    setSelectedEmoji(randomEmoji);
  };

  const isMemberInExpenses = (memberId: string) => {
    return expenses.some(
      (exp) => exp.payerId === memberId || exp.participantIds.includes(memberId)
    );
  };

  const handleRemove = (memberId: string) => {
    if (isMemberInExpenses(memberId)) {
      if (
        window.confirm(
          "Thành viên này đang có chi phí liên quan. Xóa thành viên sẽ xóa luôn các chi phí này hoặc chỉnh sửa lại. Bạn có chắc chắn muốn xóa?"
        )
      ) {
        onRemoveMember(memberId);
      }
    } else {
      onRemoveMember(memberId);
    }
  };

  const handleStartEdit = (member: Member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditColor(member.color);
    setEditEmoji(member.emoji);
    setEditAvatar(member.avatar || null);
    
    setEditSetupTab(member.fundType || "momo");
    
    setEditMomoPhone(member.momoPhone || (member.fundType === "momo" ? member.fundPhone || "" : ""));
    setEditMomoQrImage(member.momoQrImage || (member.fundType === "momo" ? member.fundQrImage || "" : ""));
    
    setEditBankAccount(member.bankAccount || (member.fundType === "bank" ? member.fundPhone || "" : ""));
    setEditBankAccountName(member.bankAccountName || member.fundName || "");
    setEditBankCode(member.bankCode || member.fundBankName || "VCB");
    setEditBankQrImage(member.bankQrImage || (member.fundType === "bank" ? member.fundQrImage || "" : ""));

    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (memberId: string) => {
    setEditError("");
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Tên không được bỏ trống");
      return;
    }

    if (members.some((m) => m.id !== memberId && m.name.toLowerCase() === trimmed.toLowerCase())) {
      setEditError("Tên này đã tồn tại.");
      return;
    }

    onEditMember({
      id: memberId,
      name: trimmed,
      color: editColor,
      emoji: editEmoji,
      avatar: editAvatar || undefined,
      
      momoPhone: editMomoPhone.trim() || undefined,
      momoQrImage: editMomoQrImage || undefined,
      bankAccount: editBankAccount.trim() || undefined,
      bankAccountName: editBankAccountName.trim().toUpperCase() || undefined,
      bankCode: editBankCode,
      bankQrImage: editBankQrImage || undefined,

      // Fallbacks
      fundType: "bank",
      fundPhone: editBankAccount.trim(),
      fundName: editBankAccountName.trim().toUpperCase() || undefined,
      fundBankName: editBankCode,
      fundQrImage: undefined,
    });
    setEditingId(null);
  };

  // Safe VND formatting
  const formatBalance = (val: number) => {
    const absVal = Math.round(Math.abs(val));
    const formatted = new Intl.NumberFormat("vi-VN").format(absVal) + " đ";
    if (val > 0.5) return <span className="text-emerald-600 font-bold">+{formatted}</span>;
    if (val < -0.5) return <span className="text-rose-500 font-bold">-{formatted}</span>;
    return <span className="text-slate-400">Đã hòa</span>;
  };

  return (
    <div className="space-y-5">
      {/* Add Member Card Bento Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-indigo-600" />
          Thêm thành viên mới
        </h4>

        {isAdmin ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="member-name-input">
                Tên thành viên
              </label>
              <div className="flex gap-2">
                <span className="inline-flex items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer rounded-2xl border border-slate-200 w-11 h-11 text-xl transition-all relative group shadow-xs">
                  <select
                    aria-label="Chọn biểu tượng cảm xúc cho thành viên"
                    value={selectedEmoji}
                    onChange={(e) => setSelectedEmoji(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  >
                    {MEMBER_EMOJIS.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                  {selectedEmoji}
                </span>

                <input
                  id="member-name-input"
                  type="text"
                  placeholder="Ví dụ: Hoàng Nam, Thùy Chi..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-800 text-sm transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Color choice */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Màu đại diện</span>
              <div className="flex flex-wrap gap-2">
                {MEMBER_COLORS.map((col) => {
                  const isActive = selectedColor === col.class;
                  return (
                    <button
                      key={col.class}
                      type="button"
                      onClick={() => setSelectedColor(col.class)}
                      title={col.label}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        isActive ? "scale-110 ring-2 ring-indigo-500/30" : "scale-100 opacity-80"
                      } ${col.class.split(" ")[0]} border-white shadow-xs flex items-center justify-center`}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Avatar Photo upload */}
            <div className="space-y-1.5 text-left">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-600" />
                Ảnh đại diện thành viên (Tùy chọn)
              </span>
              
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="member-avatar-upload"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAvatarSelect(e.target.files[0], false);
                    }
                  }}
                  className="hidden"
                  disabled={loadingAvatar}
                />

                {avatar ? (
                  <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-200 w-full justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={avatar}
                        alt="Avatar Preview"
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 object-cover rounded-full border border-indigo-200 shadow-xs"
                      />
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-indigo-650">
                          Đã tải ảnh đại diện lên
                        </p>
                        <p className="text-[10px] text-slate-400">Hình đại diện sẽ hiển thị trong nhóm</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAvatar(null)}
                      className="p-1 px-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer border border-rose-100"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="member-avatar-upload"
                    className={`w-full border border-dashed rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[70px] ${
                      loadingAvatar
                        ? "border-indigo-400 bg-indigo-50/20 cursor-wait"
                        : "border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {loadingAvatar ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
                        <p className="text-[10px] text-indigo-650 font-bold">Đang tải và tối ưu hóa ảnh...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="h-5 w-5 text-slate-400 mb-1" />
                        <p className="text-[11px] font-extrabold text-slate-700">Tải ảnh đại diện của bạn lên</p>
                        <p className="text-[9px] text-slate-450 mt-0.5">Hệ thống tự động điều chỉnh tỷ lệ 1:1 đẹp mắt</p>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Personal payment channel (Optional) */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-3.5 text-left">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <QrCode className="h-4 w-4 text-indigo-600" />
                Tài khoản nhận tiền (Tùy chọn)
              </span>
              <p className="text-[10px] text-slate-400 -mt-1 leading-normal">
                Khi mọi người thanh toán trực tiếp qua Settle Up, QR chuyển khoản chuẩn sẽ tự động khớp tên & số tài khoản này! Gửi hoặc nhận tiền rảnh tay cực kỳ tiện lợi.
              </p>

              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Chọn Ngân hàng</label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    {VIETNAM_BANKS.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Số tài khoản nhận</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Nhập số tài khoản..."
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 pl-8 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên không dấu</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ví dụ: NGUYEN VAN A"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 pl-8 text-xs font-bold text-slate-850 focus:outline-none focus:border-indigo-500 uppercase"
                        />
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-2xl py-3 px-4 font-extrabold text-xs uppercase tracking-wider hover:bg-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10"
            >
              <Plus className="h-4 w-4" />
              Thêm vào nhóm
            </button>
          </form>
        ) : (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center py-7 text-slate-500 leading-normal space-y-2.5">
            <Lock className="h-7 w-7 text-indigo-600 mx-auto" />
            <div>
              <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Chế độ Thành viên: Thêm mới bị khóa</p>
              <p className="text-[11px] text-slate-450 mt-1 max-w-sm mx-auto">
                Chỉ <strong>Trưởng nhóm (Admin) 👑</strong> mới có quyền thêm mới thành viên. Để thực hiện, vui lòng đăng nhập quyền Trưởng nhóm ở phía trên.
              </p>
            </div>
            {viewingMemberId ? (
              <p className="text-indigo-600 font-extrabold text-[11px] bg-indigo-50/50 py-2.5 px-3 rounded-xl border border-indigo-100/50 leading-relaxed">
                💡 Bạn có thể tự chỉnh sửa thông tin Ngân hàng/Momo nhận tiền của mình bằng cách bấm nút bút chì <span className="inline-block text-xs">✏️</span> bên cạnh tên của bạn ở danh sách dưới!
              </p>
            ) : (
              <p className="text-amber-600 font-bold text-[11px] bg-amber-50/50 py-2.5 px-3 rounded-xl border border-amber-150 leading-relaxed">
                ⚠️ Hãy chọn tên của bạn ở thanh điều khiển phía trên để sửa cài đặt ngân hàng nhận tiền của chính mình!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Members List Card Bento Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-50">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            Thành viên nhóm ({members.length})
          </h4>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wilder">Số dư</span>
        </div>

        {isAdmin ? (
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-100/60 rounded-2xl flex items-center gap-2 text-[11px] text-indigo-850">
            <Crown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="leading-tight font-medium"><strong>Quyền Admin:</strong> Click biểu tượng bút sửa để chỉnh sửa tên, màu sắc, tài khoản nhận tiền thành viên.</span>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-[11px] text-slate-600">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="leading-tight font-medium"><strong>Thành viên xem:</strong> Bạn có thể tự chỉnh sửa thông tin nhận tiền của chính mình bằng việc chọn tên bạn ở trên và bấm nút bút chì ✏️.</span>
          </div>
        )}

        {members.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs space-y-2">
            <p className="font-medium">Nhóm chưa có thành viên nào.</p>
            <p className="text-slate-400">Hãy thêm thành viên để bắt đầu ghi chi phí.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
            {members.map((member) => {
              const bal = balances.find((b) => b.memberId === member.id);
              const isPayerOrDebtor = isMemberInExpenses(member.id);
              const isEditing = editingId === member.id;

              if (isEditing) {
                return (
                  <div
                    key={member.id}
                    className="p-3 bg-slate-50/80 border border-slate-205 rounded-2xl space-y-3 transition-all my-1.5 first:mt-0 last:mb-0 text-left"
                  >
                    <div className="flex gap-2 items-center">
                      {isAdmin ? (
                        <>
                          <span className="inline-flex items-center justify-center bg-white hover:bg-slate-100 cursor-pointer rounded-xl border border-slate-200 w-9 h-9 text-lg transition-all relative shrink-0">
                            <select
                              aria-label="Chọn biểu tượng cảm xúc mới"
                              value={editEmoji}
                              onChange={(e) => setEditEmoji(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            >
                              {MEMBER_EMOJIS.map((em) => (
                                <option key={em} value={em}>{em}</option>
                              ))}
                            </select>
                            {editEmoji}
                          </span>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={40}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1 font-semibold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 w-9 h-9 text-lg shrink-0">
                            {member.emoji}
                          </span>
                          <span className="font-extrabold text-slate-800 text-sm">
                            {member.name}
                          </span>
                        </>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {MEMBER_COLORS.map((col) => {
                          const isActive = editColor === col.class;
                          return (
                            <button
                              key={col.class}
                              type="button"
                              onClick={() => setEditColor(col.class)}
                              className={`w-5 h-5 rounded-full border border-white transition-transform ${
                                isActive ? "scale-110 ring-1 ring-indigo-500" : "opacity-80"
                              } ${col.class.split(" ")[0]} flex items-center justify-center`}
                            >
                              {isActive && <span className="w-1 h-1 bg-slate-800 rounded-full"></span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Edit Member Avatar */}
                    {isAdmin && (
                      <div className="space-y-1 text-left bg-white/40 p-2 rounded-xl border border-slate-150">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="h-3 w-3 text-indigo-500" />
                          Ảnh đại diện (Tùy chọn)
                        </span>
                        <input
                          type="file"
                          id={`edit-avatar-upload-${member.id}`}
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleAvatarSelect(e.target.files[0], true);
                            }
                          }}
                          className="hidden"
                          disabled={loadingEditAvatar}
                        />

                        {editAvatar ? (
                          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-xl border border-slate-200 justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={editAvatar}
                                alt="Edit Preview"
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 object-cover rounded-full border border-indigo-100"
                              />
                              <p className="text-[9px] text-indigo-650 truncate font-extrabold">Đã tải ảnh lên</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditAvatar(null)}
                              className="p-1 px-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[9px] font-extrabold transition-all shrink-0 cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`edit-avatar-upload-${member.id}`}
                            className={`w-full border border-dashed rounded-xl p-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[50px] ${
                              loadingEditAvatar
                                ? "border-indigo-400 bg-indigo-50/10 cursor-wait"
                                : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            {loadingEditAvatar ? (
                              <div className="flex items-center gap-1 justify-center">
                                <RefreshCw className="h-3 w-3 text-indigo-500 animate-spin" />
                                <span className="text-[9px] text-indigo-650 font-bold">Đang tải...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-center">
                                <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[9px] font-extrabold text-slate-600">Thay đổi ảnh đại diện</span>
                              </div>
                            )}
                          </label>
                        )}
                      </div>
                    )}

                    {/* Sửa thông tin tài khoản nhận tiền */}
                    <div className="bg-white/50 p-3 rounded-xl border border-slate-200 space-y-2.5 text-left">
                      <span className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                        <QrCode className="h-3 w-3 text-indigo-500" />
                        Tài khoản nhận tiền (Tùy chọn)
                      </span>

                      <div className="space-y-2.5 mt-1">
                        <div className="space-y-1">
                          <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wildest">Mã Ngân hàng</label>
                          <select
                            value={editBankCode}
                            onChange={(e) => setEditBankCode(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                          >
                            {VIETNAM_BANKS.map((bank) => (
                              <option key={bank.code} value={bank.code}>
                                {bank.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wildest">Số tài khoản</label>
                            <input
                              type="text"
                              placeholder="Nhập số tài khoản..."
                              value={editBankAccount}
                              onChange={(e) => setEditBankAccount(e.target.value.replace(/[^0-9]/g, ""))}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-mono font-bold text-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wildest">Họ tên chủ thẻ</label>
                            <input
                              type="text"
                              placeholder="TÊN KHÔNG DẤU"
                              value={editBankAccountName}
                              onChange={(e) => setEditBankAccountName(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-bold text-slate-805 uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {editError && <p className="text-[10px] text-rose-500 font-bold">{editError}</p>}

                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 px-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Bỏ qua
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(member.id)}
                        className="p-1 px-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                        Lưu
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-slate-50/50 px-2 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-lg shadow-xs border ${member.color} shrink-0`}
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        member.emoji
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-800">{member.name}</span>
                        {isAdmin && member.accessCode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(member.accessCode || "");
                              alert(`Đã copy mã truy cập của ${member.name}: ${member.accessCode}`);
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-mono text-[9.5px] font-extrabold border border-indigo-100 rounded-md px-1.5 py-0.5 cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                            title="Bấm để copy mã đăng nhập thành viên"
                          >
                            <span>Mã: {member.accessCode}</span>
                            <Copy className="w-2.5 h-2.5 shrink-0 text-indigo-505" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {isPayerOrDebtor
                          ? `Đã chi: ${new Intl.NumberFormat("vi-VN").format(Math.round(bal?.paid || 0))}đ`
                          : "Chưa tham gia hoạt động"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="text-right text-xs font-mono mr-2">
                      {bal ? formatBalance(bal.netBalance) : "0đ"}
                    </div>
                    
                    {/* Admin editing or self-editing button */}
                    {(isAdmin || viewingMemberId === member.id) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(member)}
                        title={viewingMemberId === member.id ? "Sửa tài khoản nhận tiền của tôi" : `Sửa thông tin thành viên ${member.name}`}
                        className="p-1 px-1.5 text-slate-400 hover:text-indigo-650 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-0.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {viewingMemberId === member.id && <span className="text-[10px] font-black italic text-indigo-600">Tôi</span>}
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member.id)}
                        title={`Xóa ${member.name}`}
                        className="p-1 px-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
