import React, { useState } from "react";
import { Member, Expense } from "../types";
import {
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UserCheck,
  Award,
  DollarSign,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Info,
  CheckSquare,
  Square
} from "lucide-react";

interface ParticipationSectionProps {
  members: Member[];
  expenses: Expense[];
}

export default function ParticipationSection({
  members,
  expenses,
}: ParticipationSectionProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    return members.length > 0 ? members[0].id : "";
  });

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  // Safe VND currency formatter for the Vietnamese market
  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Math.round(num));
  };

  return (
    <div className="grid grid-cols-12 gap-5 items-start">
      {/* LEFT COLUMN: Overview & Future Attendance Toggles (5/12) */}
      <div className="col-span-12 xl:col-span-5 space-y-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-left">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-4.5 w-4.5 text-indigo-600" />
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Điểm danh & Tự động chia</h4>
              <p className="text-[10px] text-slate-400 font-medium">Bật/tắt trạng thái tham gia cho các hoạt động mới sắp tới</p>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Vui lòng thêm thành viên trước.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 space-y-1">
              {members.map((m) => {
                const isUpcomingActive = m.isUpcomingActive !== false;
                
                // Calculate actual statistics for this member
                const totalParticipated = expenses.filter((e) => e.participantIds.includes(m.id)).length;
                const totalPaidCount = expenses.filter((e) => e.payerId === m.id).length;
                const rate = expenses.length > 0 ? Math.round((totalParticipated / expenses.length) * 100) : 0;

                const isSelected = m.id === selectedMemberId;

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl flex items-center justify-between transition-all ${
                      isSelected ? "bg-indigo-50/45 border border-indigo-100/50" : "hover:bg-slate-50/55"
                    }`}
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setSelectedMemberId(m.id)}
                    >
                      <div className="relative shrink-0">
                        <span className="w-9.5 h-9.5 rounded-full bg-slate-100 text-base flex items-center justify-center border border-slate-200 overflow-hidden">
                          {m.avatar ? (
                            <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            m.emoji
                          )}
                        </span>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          isUpcomingActive ? "bg-emerald-500" : "bg-slate-350"
                        }`} />
                      </div>

                      <div className="text-left">
                        <p className={`font-bold text-xs ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                          {m.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1.5 label-wrap">
                          <span>Tham gia: <strong className="text-slate-600">{totalParticipated}/{expenses.length}</strong> ({rate}%)</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>Chi hộ: <strong className="text-slate-600">{totalPaidCount} lần</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        title={isUpcomingActive ? "Đang đi chung (Mặc định được tích chọn khi thêm chi tiêu mới)" : "Vắng mặt / Không đi chung (Mặc định bỏ tích chọn)"}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border ${
                          isUpcomingActive
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      >
                        {isUpcomingActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đi chung</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Vắng mặt</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Guide Card inline */}
          <div className="p-3 bg-indigo-50/40 border border-indigo-150 rounded-2xl flex items-start gap-2.5 text-left">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-[11px] font-extrabold text-indigo-900 leading-tight">Mẹo tự động hóa:</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Những thành viên cài đặt trạng thái <strong className="text-slate-600">"Vắng mặt"</strong> sẽ tự động không được tích chọn khi bạn thêm hóa đơn mới, đỡ tốn công bỏ chọn từng người một!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Past Experience Participation Editor (7/12) */}
      <div className="col-span-12 xl:col-span-7 space-y-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Chi tiết lần đi chung lịch sử</h4>
                <p className="text-[10px] text-slate-400 font-medium">Sửa nhanh ai được chia / miễn trừ tiền trong từng hóa đơn cụ thể</p>
              </div>
            </div>
            {selectedMember && (
              <span className="text-[11px] bg-indigo-600 text-white font-extrabold px-3 py-1 rounded-full shrink-0 flex items-center gap-1">
                {selectedMember.emoji} {selectedMember.name}
              </span>
            )}
          </div>

          {!selectedMember ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Vui lòng ghép nhóm hoặc tạo ít nhất một thành viên để xem danh sách.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Thống kê riêng cho {selectedMember.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-left">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Hóa đơn tham gia chia</p>
                    <p className="text-base font-extrabold text-indigo-600 mt-1">
                      {expenses.filter(e => e.participantIds.includes(selectedMember.id)).length} / {expenses.length} lần
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-left">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Tổng tiền phải trả thực tế</p>
                    <p className="text-base font-extrabold text-slate-800 mt-1">
                      {formatVnd(
                        expenses.reduce((sum, e) => {
                          if (e.participantIds.includes(selectedMember.id)) {
                            return sum + e.amount / e.participantIds.length;
                          }
                          return sum;
                        }, 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Trạng thái tham gia chi tiết lịch sử (Chỉ xem, sửa tại mục Ghi chép chi tiêu):
                </span>
                
                {expenses.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 border border-dashed rounded-2xl">
                    Chưa có hoạt động chi tiêu nào được tạo trong nhóm này.
                  </div>
                ) : (() => {
                  const participatedExpenses = expenses.filter(e => e.participantIds.includes(selectedMember.id));
                  if (participatedExpenses.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs text-slate-450 bg-slate-50/50 border border-dashed rounded-2xl">
                        Thành viên <strong>{selectedMember.name}</strong> chưa tham gia bất kỳ khoản chi tiêu nào.
                      </div>
                    );
                  }
                  return participatedExpenses.map((e) => {
                    const splitPrice = Math.round(e.amount / e.participantIds.length);
                    const payerObj = members.find(m => m.id === e.payerId);

                    return (
                      <div
                        key={e.id}
                        className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 transition-all bg-white border-indigo-150"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="text-left min-w-0">
                            <h5 className="font-bold text-xs text-slate-800 truncate mb-0.5">{e.description}</h5>
                            <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-450 font-medium">
                              <span>Ngày: {new Date(e.date).toLocaleDateString("vi-VN")}</span>
                              <span>•</span>
                              <span>Tổng: <strong>{formatVnd(e.amount)}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                Người chi: 
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-1 rounded">
                                  {payerObj ? payerObj.name : "Ẩn danh"}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-400 font-medium">Chia đều ({e.participantIds.length} người):</p>
                            <p className="text-xs font-black text-indigo-600">{formatVnd(splitPrice)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
