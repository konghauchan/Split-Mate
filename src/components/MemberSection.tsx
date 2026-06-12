import React, { useState } from "react";
import { Member, Expense } from "../types";
import { calculateBalances } from "../utils/debtSimplifier";
import { MEMBER_COLORS, MEMBER_EMOJIS } from "../utils/mockData";
import { Plus, Trash2, UserPlus, Users, AlertCircle, Pencil, Check, X, Crown } from "lucide-react";

interface MemberSectionProps {
  members: Member[];
  expenses: Expense[];
  onAddMember: (member: Member) => void;
  onRemoveMember: (id: string) => void;
  onEditMember: (member: Member) => void;
}

export default function MemberSection({
  members,
  expenses,
  onAddMember,
  onRemoveMember,
  onEditMember,
}: MemberSectionProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(MEMBER_COLORS[0].class);
  const [selectedEmoji, setSelectedEmoji] = useState(MEMBER_EMOJIS[0]);
  const [errorMsg, setErrorMsg] = useState("");

  // Editing state for Group Admin
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editError, setEditError] = useState("");

  const balances = calculateBalances(members, expenses);

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
    };

    onAddMember(newMember);
    setName("");

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

        {/* Admin mode active banner */}
        <div className="p-2.5 bg-indigo-50/70 border border-indigo-100/60 rounded-2xl flex items-center gap-2 text-[11px] text-indigo-850">
          <Crown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="leading-tight font-medium"><strong>Quyền Admin:</strong> Click biểu tượng bút sữa để chỉnh sửa tên, emoji, màu sắc thành viên.</span>
        </div>

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
                    <div className="flex gap-2">
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
                    </div>

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
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-xs border ${member.color}`}
                    >
                      {member.emoji}
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-sm text-slate-800">{member.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
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
                    
                    {/* Admin editing button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(member)}
                      title={`Sửa thông tin thành viên ${member.name}`}
                      className="p-1 px-1.5 text-slate-400 hover:text-indigo-650 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(member.id)}
                      title={`Xóa ${member.name}`}
                      className="p-1 px-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
