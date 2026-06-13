import React, { useState, useEffect } from "react";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { Group, Member, Expense } from "./types";
import { MOCK_GROUPS, MEMBER_COLORS, MEMBER_EMOJIS } from "./utils/mockData";
import { calculateBalances, simplifyDebts } from "./utils/debtSimplifier";

import MemberSection from "./components/MemberSection";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import SettleUpSection from "./components/SettleUpSection";
import FundHistoryList from "./components/FundHistoryList";
import StatsSection from "./components/StatsSection";
import ParticipationSection from "./components/ParticipationSection";

import { auth, db, googleProvider, signInWithPopup, signOut } from "./utils/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, query, collection, where, onSnapshot } from "firebase/firestore";

import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Activity,
  ArrowLeftRight,
  Sparkles,
  RotateCcw,
  Plus,
  Compass,
  FolderLock,
  Trash2,
  ListFilter,
  CheckCircle,
  HelpCircle,
  Download,
  Share2,
  UserCheck,
  Cloud,
  Crown,
  Lock
} from "lucide-react";

const saveAccessCodesMapping = async (group: Group) => {
  if (!group || !group.members) return;
  try {
    const promises = group.members.map(async (m) => {
      if (m.accessCode) {
        await setDoc(doc(db, "accessCodes", m.accessCode.toUpperCase()), {
          groupId: group.id,
          memberId: m.id,
          createdAt: new Date().toISOString()
        });
      }
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("Lỗi khi lưu mã truy cập:", err);
  }
};

export default function App() {
  // Firebase Auth & Sync states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [tryOfflineMode, setTryOfflineModeObj] = useState<boolean>(() => {
    return localStorage.getItem("splitmate_tryOfflineMode") === "true";
  });
  
  const handleSetTryOffline = (val: boolean) => {
    setTryOfflineModeObj(val);
    if (val) {
      localStorage.setItem("splitmate_tryOfflineMode", "true");
    } else {
      localStorage.removeItem("splitmate_tryOfflineMode");
    }
  };

  const [memberAccessCodeUser, setMemberAccessCodeUser] = useState<{
    code: string;
    memberId: string;
    groupId: string;
  } | null>(() => {
    const saved = localStorage.getItem("splitmate_memberAccessCodeUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem("splitmate_groups");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_GROUPS;
      }
    }
    return MOCK_GROUPS;
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    const savedId = localStorage.getItem("splitmate_selected_id");
    return savedId || MOCK_GROUPS[0].id;
  });

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        // Logged in as Google User, disable member code credentials
        setMemberAccessCodeUser(null);
        localStorage.removeItem("splitmate_memberAccessCodeUser");
        setIsAdmin(true);
        setViewingMemberId(undefined);
        handleSetTryOffline(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for real-time Firebase groups if logged in as Google Owner
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "groups"), where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedGroups: Group[] = [];
      snapshot.forEach((docSnap) => {
        fetchedGroups.push({ ...(docSnap.data() as Group), id: docSnap.id });
      });

      if (fetchedGroups.length === 0) {
        // Migrate offline groups to cloud
        const offlineGroupsStr = localStorage.getItem("splitmate_groups");
        if (offlineGroupsStr) {
          try {
            const offlineGroups: Group[] = JSON.parse(offlineGroupsStr);
            for (const grp of offlineGroups) {
              const updatedMembers = grp.members.map((m) => {
                if (!m.accessCode) {
                  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                  let code = "";
                  for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                  }
                  return { ...m, accessCode: code };
                }
                return m;
              });
              const codes = updatedMembers.map((m) => m.accessCode || "").filter(Boolean);

              const cloudGroupDoc = {
                ...grp,
                ownerId: user.uid,
                members: updatedMembers,
                memberAccessCodes: codes
              };
              await setDoc(doc(db, "groups", grp.id), cloudGroupDoc);
              await saveAccessCodesMapping(cloudGroupDoc);
            }
          } catch (err) {
            console.error("Migration error:", err);
          }
        }
      } else {
        // Auto-heal groups missing access codes
        const healedGroups = await Promise.all(fetchedGroups.map(async (grp) => {
          let groupModified = false;
          const updatedMembers = grp.members.map((m) => {
            if (!m.accessCode) {
              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              let code = "";
              for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              groupModified = true;
              return { ...m, accessCode: code };
            }
            return m;
          });

          const codes = updatedMembers.map((m) => m.accessCode || "").filter(Boolean);
          if (groupModified || !grp.memberAccessCodes || grp.memberAccessCodes.length !== codes.length) {
            const updatedGroup = {
              ...grp,
              members: updatedMembers,
              memberAccessCodes: codes
            };
            try {
              await setDoc(doc(db, "groups", grp.id), updatedGroup);
              await saveAccessCodesMapping(updatedGroup);
            } catch (err) {
              console.error("Auto-heal save error:", err);
            }
            return updatedGroup;
          }
          return grp;
        }));

        setGroups(healedGroups);
        setSelectedGroupId((prevId) => {
          if (healedGroups.some((g) => g.id === prevId)) return prevId;
          return healedGroups[0].id;
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time listener of group data for Access Code Member mode
  useEffect(() => {
    if (user || !memberAccessCodeUser) return;

    const groupRef = doc(db, "groups", memberAccessCodeUser.groupId);
    const unsubscribe = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupData = { ...(docSnap.data() as Group), id: docSnap.id };
        setGroups([groupData]);
        setSelectedGroupId(groupData.id);
        setIsAdmin(false);
        setViewingMemberId(memberAccessCodeUser.memberId);
      }
    }, (error) => {
      console.error("Snapshot read error for member details:", error);
    });

    return () => unsubscribe();
  }, [user, memberAccessCodeUser]);

  // Unified helper to save active group changes
  const updateGroupOnDbAndState = async (updatedGroup: Group) => {
    if (user) {
      try {
        const updatedMembers = updatedGroup.members.map((m) => {
          if (!m.accessCode) {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let code = "";
            for (let i = 0; i < 6; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return { ...m, accessCode: code };
          }
          return m;
        });
        const codes = updatedMembers.map((m) => m.accessCode || "").filter(Boolean);

        const groupToSave = {
          ...updatedGroup,
          members: updatedMembers,
          memberAccessCodes: codes,
          ownerId: user.uid
        };
        await setDoc(doc(db, "groups", updatedGroup.id), groupToSave);
        await saveAccessCodesMapping(groupToSave);
      } catch (err) {
        console.error("Firestore save error:", err);
        showAlert("Lỗi đồng bộ", "Không thể cập nhật thông tin lên Firebase Cloud.");
      }
    } else {
      setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showAlert("Thủ quỹ đăng nhập", "Đồng bộ dữ liệu đám mây Firebase thành công!");
    } catch (error: any) {
      console.error("Google auth error:", error);
      showAlert("Lỗi kết nối", "Đăng nhập Google thất bại.");
    }
  };

  const handleLogout = async () => {
    try {
      if (user) {
        await signOut(auth);
      }
      setMemberAccessCodeUser(null);
      localStorage.removeItem("splitmate_memberAccessCodeUser");
      setViewingMemberId(undefined);
      setIsAdmin(true);
      handleSetTryOffline(false);
      
      const saved = localStorage.getItem("splitmate_groups");
      if (saved) {
        try { setGroups(JSON.parse(saved)); } catch { setGroups(MOCK_GROUPS); }
      } else {
        setGroups(MOCK_GROUPS);
      }
      showAlert("Đã đăng xuất", "Hệ thống đã chuyển bạn về chế độ màn hình đăng nhập.");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleMemberCodeLogin = async (code: string) => {
    if (!code.trim()) {
      showAlert("Nhập mã", "Vui lòng điền mã đăng nhập thành viên.");
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    try {
      const res = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert("Đăng nhập thất bại", data.error || "Mã không đúng.");
        return;
      }

      const loggedInfo = {
        code: cleanCode,
        memberId: data.memberId,
        groupId: data.group.id,
      };

      setMemberAccessCodeUser(loggedInfo);
      localStorage.setItem("splitmate_memberAccessCodeUser", JSON.stringify(loggedInfo));

      setIsAdmin(false);
      setViewingMemberId(data.memberId);
      setGroups([data.group]);
      setSelectedGroupId(data.group.id);

      showAlert("Chào mừng Thành viên", `Đăng nhập thành công vào nhóm "${data.group.name}"!`);
    } catch (error) {
      console.error("Member login error:", error);
      showAlert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    }
  };

  const [activeTab, setActiveTab] = useState<"bills" | "settle" | "participation">("bills");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Role based access control states
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const saved = localStorage.getItem("splitmate_isAdmin");
    return saved ? JSON.parse(saved) : true;
  });

  const [viewingMemberId, setViewingMemberId] = useState<string | undefined>(() => {
    const saved = localStorage.getItem("splitmate_viewingMemberId");
    return (saved && saved !== "undefined") ? saved : undefined;
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  useEffect(() => {
    if (!memberAccessCodeUser) {
      localStorage.setItem("splitmate_isAdmin", JSON.stringify(isAdmin));
    }
  }, [isAdmin, memberAccessCodeUser]);

  useEffect(() => {
    if (!memberAccessCodeUser) {
      localStorage.setItem("splitmate_viewingMemberId", viewingMemberId || "undefined");
    }
  }, [viewingMemberId, memberAccessCodeUser]);

  // Custom dialogs (confirms & alerts) to bypass iframe browser blockers
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertState, setAlertState] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const askConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      }
    });
  };

  const showAlert = (title: string, message: string) => {
    setAlertState({ title, message });
  };

  // New Group input controls
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSuccess, setNewGroupSuccess] = useState(false);

  // Sync groups to localStorage format (Offline backup)
  useEffect(() => {
    if (!user && !memberAccessCodeUser) {
      localStorage.setItem("splitmate_groups", JSON.stringify(groups));
    }
  }, [groups, user, memberAccessCodeUser]);

  // Sync selected group ID to localStorage
  useEffect(() => {
    localStorage.setItem("splitmate_selected_id", selectedGroupId);
  }, [selectedGroupId]);

  // Find active group
  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // Helper selectors
  const members = activeGroup?.members || [];
  const expenses = activeGroup?.expenses || [];
  const activeIsSettled = activeGroup ? simplifyDebts(activeGroup.members, activeGroup.expenses).length === 0 : true;
  const getMember = (id: string) => members.find((m) => m.id === id);

  // Group Management Handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    // Create owner-as-first-member with custom access code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newGroup: Group = {
      id: "g_" + Date.now(),
      name,
      createdAt: new Date().toISOString().split("T")[0],
      members: [
        { id: "m_first_" + Date.now(), name: "Bạn (Trưởng nhóm)", color: MEMBER_COLORS[0].class, emoji: "🎒", accessCode: code }
      ],
      expenses: [],
    };

    if (user) {
      try {
        const cloudGroup = {
          ...newGroup,
          ownerId: user.uid,
          memberAccessCodes: [code]
        };
        await setDoc(doc(db, "groups", newGroup.id), cloudGroup);
        await saveAccessCodesMapping(cloudGroup);
      } catch (err) {
        console.error("Firestore group creation error:", err);
      }
    } else {
      setGroups((prev) => [...prev, newGroup]);
    }
    
    setSelectedGroupId(newGroup.id);
    setNewGroupName("");
    setIsCreatingGroup(false);
    setNewGroupSuccess(true);
    setTimeout(() => setNewGroupSuccess(false), 2500);
  };

  const handleDeleteGroup = (groupId: string) => {
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return;

    const txs = simplifyDebts(targetGroup.members, targetGroup.expenses);
    const isSettled = txs.length === 0;

    if (!isSettled) {
      showAlert(
        "Chưa sòng phẳng",
        `Không thể xóa nhóm "${targetGroup.name}" vì chưa sòng phẳng! Vui lòng hoàn tất thanh toán sòng phẳng trước khi xóa.`
      );
      return;
    }

    if (groups.length <= 1) {
      askConfirm(
        "Xóa nhóm duy nhất",
        `Bạn có chắc chắn muốn xóa hoàn toàn nhóm cuối cùng "${targetGroup.name}" không? Nhóm này sẽ được reset về trạng thái trống mới tinh.`,
        async () => {
          const cleanGroup: Group = {
            id: "empty-default",
            name: "Nhóm mới tinh ☕",
            createdAt: new Date().toISOString().split("T")[0],
            members: [],
            expenses: [],
          };
          if (user) {
            try {
              const { deleteDoc } = await import("firebase/firestore");
              await deleteDoc(doc(db, "groups", groupId));
              await setDoc(doc(db, "groups", "empty-default"), {
                ...cleanGroup,
                ownerId: user.uid,
                memberAccessCodes: []
              });
            } catch (err) { console.error(err); }
          } else {
            setGroups([cleanGroup]);
            setSelectedGroupId("empty-default");
          }
        }
      );
      return;
    }

    askConfirm(
      "Xác nhận xóa nhóm",
      `Bạn có chắc chắn muốn xóa vĩnh viễn nhóm "${targetGroup.name}" không?`,
      async () => {
        const remaining = groups.filter((g) => g.id !== groupId);
        if (user) {
          try {
            const { deleteDoc } = await import("firebase/firestore");
            await deleteDoc(doc(db, "groups", groupId));
          } catch (err) { console.error(err); }
        } else {
          setGroups(remaining);
          if (selectedGroupId === groupId) {
            setSelectedGroupId(remaining[0].id);
          }
        }
      }
    );
  };

  // Reset current Application Database
  const handleResetToPresets = () => {
    askConfirm(
      "Đặt lại mẫu",
      "Hành động này sẽ xóa dữ liệu hiện tại của bạn và đặt lại các nhóm mẫu. Tiếp tục?",
      async () => {
        if (user) {
          try {
            const { deleteDoc } = await import("firebase/firestore");
            for (const grp of groups) {
              await deleteDoc(doc(db, "groups", grp.id));
            }
            for (const grp of MOCK_GROUPS) {
              const updatedMembers = grp.members.map((m) => {
                if (!m.accessCode) {
                  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                  let c = "";
                  for (let i = 0; i < 6; i++) {
                    c += chars.charAt(Math.floor(Math.random() * chars.length));
                  }
                  return { ...m, accessCode: c };
                }
                return m;
              });
              const codes = updatedMembers.map((m) => m.accessCode || "").filter(Boolean);
              const cloudGroupSpec = {
                ...grp,
                members: updatedMembers,
                memberAccessCodes: codes,
                ownerId: user.uid
              };
              await setDoc(doc(db, "groups", grp.id), cloudGroupSpec);
              await saveAccessCodesMapping(cloudGroupSpec);
            }
          } catch (err) { console.error(err); }
        } else {
          setGroups(MOCK_GROUPS);
          setSelectedGroupId(MOCK_GROUPS[0].id);
          setActiveTab("bills");
        }
      }
    );
  };

  // Clear current active group transactions
  const handleClearActiveGroupData = async () => {
    askConfirm(
      "Xóa sạch chi tiêu",
      "Xóa toàn bộ các chi tiêu đã ghi nhận trong nhóm này? (Danh sách thành viên không đổi)",
      async () => {
        const updated = {
          ...activeGroup,
          expenses: []
        };
        await updateGroupOnDbAndState(updated);
      }
    );
  };

  // Member Management Handlers
  const handleAddMember = async (member: Member) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const memberWithCode = { ...member, accessCode: code };

    const updated = {
      ...activeGroup,
      members: [...activeGroup.members, memberWithCode]
    };
    await updateGroupOnDbAndState(updated);
  };

  const handleRemoveMember = async (memberId: string) => {
    // Remove member
    const updatedMembers = activeGroup.members.filter((m) => m.id !== memberId);
    // Clean expenses where this member was payer OR single participant (if empty, removes expense)
    const updatedExpenses = activeGroup.expenses
      .map((exp) => {
        const newPayerId = exp.payerId === memberId
          ? (updatedMembers[0]?.id || "")
          : exp.payerId;

        const updatedParticipants = exp.participantIds.filter((pId) => pId !== memberId);

        return {
          ...exp,
          payerId: newPayerId,
          participantIds: updatedParticipants,
        };
      })
      .filter((exp) => exp.payerId !== "" && exp.participantIds.length > 0);

    const updated = {
      ...activeGroup,
      members: updatedMembers,
      expenses: updatedExpenses,
    };
    await updateGroupOnDbAndState(updated);
  };

  // Expense Management Handlers
  const handleAddExpense = async (expense: Expense) => {
    const updated = {
      ...activeGroup,
      expenses: [expense, ...activeGroup.expenses]
    };
    await updateGroupOnDbAndState(updated);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const updated = {
      ...activeGroup,
      expenses: activeGroup.expenses.filter((e) => e.id !== expenseId)
    };
    await updateGroupOnDbAndState(updated);
    if (editingExpense?.id === expenseId) {
      setEditingExpense(null);
    }
  };

  const handleEditMember = async (updatedMember: Member) => {
    if (isAdmin) {
      const updated = {
        ...activeGroup,
        members: activeGroup.members.map((m) => (m.id === updatedMember.id ? updatedMember : m))
      };
      await updateGroupOnDbAndState(updated);
    } else {
      if (viewingMemberId !== updatedMember.id) {
        showAlert("Quyền chỉnh sửa", "Bạn chỉ có quyền tự chỉnh sửa thông tin của chính mình.");
        return;
      }
      try {
        const res = await fetch("/api/member/update-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: selectedGroupId,
            memberId: updatedMember.id,
            accessCode: memberAccessCodeUser?.code,
            fundType: updatedMember.fundType,
            momoPhone: updatedMember.momoPhone,
            bankAccount: updatedMember.bankAccount,
            bankCode: updatedMember.bankCode,
            bankAccountName: updatedMember.bankAccountName
          })
        });
        const data = await res.json();
        if (res.ok) {
          setGroups([data.group]);
          showAlert("Thành công", "Đã cập nhật thông tin tài khoản nhận tiền cá nhân của bạn.");
        } else {
          showAlert("Thất bại", data.error || "Không thể cập nhật.");
        }
      } catch (err) {
        console.error(err);
        showAlert("Lỗi hệ thống", "Không thể lưu dữ liệu.");
      }
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    const updated = {
      ...activeGroup,
      expenses: activeGroup.expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
    };
    await updateGroupOnDbAndState(updated);
    setEditingExpense(null);
  };

  const handleUpdateGroupConfig = async (config: {
    fundType?: "momo" | "bank";
    fundPhone?: string;
    fundName?: string;
    fundBankName?: string;
    fundQrImage?: string;
  }) => {
    const updated = {
      ...activeGroup,
      ...config
    };
    await updateGroupOnDbAndState(updated);
  };

  const getReportHTML = () => {
    const element = document.createElement("div");
    element.style.padding = "20px";
    element.style.fontFamily = "sans-serif";
    
    const balances = calculateBalances(members, expenses);
    const debtsData = balances
      .map((b) => {
        const mem = members.find((m) => m.id === b.memberId)?.name || b.memberId;
        return {
          name: mem,
          status: b.netBalance > 0 ? "Nhận về" : (b.netBalance < 0 ? "Cần trả" : "Hoàn tất"),
          amount: Math.round(Math.abs(b.netBalance)),
        };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const historyData = expenses.map((e) => {
      const payer = members.find((m) => m.id === e.payerId)?.name || e.payerId;
      const participants = e.participantIds
        .map((pId) => members.find((m) => m.id === pId)?.name || pId)
        .join(", ");
      return {
        date: new Date(e.date).toLocaleDateString("vi-VN"),
        desc: e.description,
        payer: payer,
        amount: Math.round(e.amount),
        participants: participants,
      };
    });

    element.innerHTML = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Báo Cáo Chi Tiêu</h1>
          <p style="color: #64748b; font-size: 16px; margin: 0;">Nhóm: <strong style="color: #4338ca;">${activeGroup.name}</strong></p>
        </div>
        
        <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #f8fafc; padding: 16px 24px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0; display: flex; align-items: center;">1. Tổng Kết Công Nợ</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 12px; color: #64748b;">
                <th style="padding: 12px 24px; text-align: left; border-bottom: 1px solid #e2e8f0;">Thành viên</th>
                <th style="padding: 12px 24px; text-align: left; border-bottom: 1px solid #e2e8f0;">Trạng thái</th>
                <th style="padding: 12px 24px; text-align: right; border-bottom: 1px solid #e2e8f0;">Số tiền (VND)</th>
              </tr>
            </thead>
            <tbody>
              ${debtsData.length > 0 ? debtsData.map((d, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 16px 24px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${d.name}</td>
                  <td style="padding: 16px 24px; border-bottom: 1px solid #f1f5f9;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; 
                      background-color: ${d.status === 'Nhận về' ? '#ecfdf5' : '#fff1f2'}; 
                      color: ${d.status === 'Nhận về' ? '#059669' : '#e11d48'};">
                      ${d.status}
                    </span>
                  </td>
                  <td style="padding: 16px 24px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 700; font-family: monospace; font-size: 15px;">
                    ${d.amount.toLocaleString('vi-VN')}
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="3" style="padding: 24px; text-align: center; color: #94a3b8; font-style: italic;">Không có khoản nợ nào</td></tr>`}
            </tbody>
          </table>
        </div>

        <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background: #f8fafc; padding: 16px 24px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0;">2. Lịch Sử Chi Tiêu</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 12px; color: #64748b;">
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0;">Ngày</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0;">Mô tả</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0;">Người chi</th>
                <th style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #e2e8f0;">Số tiền</th>
                <th style="padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0;">Chia cho</th>
              </tr>
            </thead>
            <tbody>
              ${historyData.length > 0 ? historyData.map((d, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; white-space: nowrap;">${d.date}</td>
                  <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${d.desc}</td>
                  <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9;">
                    <span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                      ${d.payer}
                    </span>
                  </td>
                  <td style="padding: 14px 16px; text-align: right; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-family: monospace; font-size: 14px;">
                    ${d.amount.toLocaleString('vi-VN')}
                  </td>
                  <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #475569; font-size: 12px; line-height: 1.4;">
                    ${d.participants}
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="padding: 24px; text-align: center; color: #94a3b8; font-style: italic;">Chưa có chi tiêu nào</td></tr>`}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 32px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p>Báo cáo được xuất tự động vào ${new Date().toLocaleDateString('vi-VN')} lúc ${new Date().toLocaleTimeString('vi-VN')}</p>
        </div>
      </div>
    `;
    return element;
  };

  const handleShareReport = async () => {
    try {
      const element = getReportHTML();
      const filename = `Bao_Cao_${activeGroup.name}.pdf`;

      html2pdf().from(element).set({
        margin: 15,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).outputPdf().then((pdfString: string) => {
        // Convert pdf string to ArrayBuffer and then to Blob
        const len = pdfString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = pdfString.charCodeAt(i);
        }
        const pdfBlob = new Blob([bytes.buffer], { type: "application/pdf" });
        const file = new File([pdfBlob], filename, { type: "application/pdf" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: `Báo Cáo Nhóm ${activeGroup.name}`,
            text: "Đây là file báo cáo tổng kết chi tiêu của nhóm."
          }).catch((error) => console.log('Chia sẻ bị hủy:', error));
        } else {
          // If share API is not supported
          alert("Trình duyệt không hỗ trợ chia sẻ file trực tiếp. File sẽ được tải xuống.");
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
      
    } catch (error) {
      console.error("Share error:", error);
      alert("Đã xảy ra lỗi khi tạo file để chia sẻ.");
    }
  };

  const handleExportPDF = () => {
    try {
      const element = getReportHTML();
      
      html2pdf().from(element).set({
        margin: 15,
        filename: `Bao_Cao_${activeGroup.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();
      
    } catch (error) {
      console.error("Export PDF error:", error);
      alert("Đã xảy ra lỗi khi xuất PDF.");
    }
  };

  const totals = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Beautiful Loading state if authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-semibold tracking-wide text-slate-300">Đang khởi động hệ thống chia tiền SplitMate...</p>
        </div>
      </div>
    );
  }

  // 2. Beautiful Landing Page if unauthenticated and not forcing offline demo
  if (!user && !memberAccessCodeUser && !tryOfflineMode) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-indigo-150 selection:text-indigo-900">
        {/* Decorative background grid and blurs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-slate-950 -z-10" />
        <div className="absolute top-20 left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar stripe */}
        <div className="bg-indigo-700 text-white py-2 px-4 text-center text-xs font-black tracking-wide font-sans">
          🔥 CHIA TIỀN TẬP THỂ CHƯA BAO GIỜ DỄ DÀNG ĐẾN THẾ • TỐI ƯU HÓA HOÀN TOÀN TỰ ĐỘNG
        </div>

        {/* Header containing brand name / logo */}
        <header className="border-b border-slate-800/60 backdrop-blur-md sticky top-0 z-50 bg-slate-900/80">
          <div className="max-w-7xl mx-auto px-4 py-4.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 flex items-center justify-center text-white shrink-0">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-1.5 leading-none">
                  SplitMate <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full py-0.5 px-1.5 font-black font-sans uppercase">Premium</span>
                </h1>
                <p className="text-[10px] text-slate-400 mt-1 tracking-wide hidden sm:block">
                  Chia Tiền Nhóm Thông Minh & Chốt Sổ Trả Nợ Tối Ưu
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
              <span className="text-xs text-slate-350 font-bold">Hệ thống Đám mây Hoạt động</span>
            </div>
          </div>
        </header>

        {/* Hero Section Container */}
        <main className="flex-1 flex items-center justify-center py-12 sm:py-20 px-4">
          <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Visual Highlights, Info & Copywriting */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-550/15 border border-indigo-500/30 rounded-full py-1.5 px-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-300 tracking-wider">HỖ TRỢ ĐỒNG BỘ THỜI GIAN THỰC</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12]">
                Chia tiền <span className="text-indigo-400">sòng phẳng</span>,<br />
                giữ vững <span className="text-emerald-400">tình bè bạn</span>!
              </h1>
              
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                Không lo quên chép hóa đơn lẻ hay tính toán phân chia phức tạp sau chuyến đi du lịch, buổi liên hoan, dã ngoại bè bạn. SplitMate tự động tối ưu hóa lộ trình chuyển khoản nhanh gọn, giảm thiểu số lượt giao dịch tối đa.
              </p>

              {/* Bento highlights list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5">
                <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-750/50 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Tối Ưu Hoá Lượt Trả Nợ</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Thuật toán tự động giản lược nợ dây chuyền, tìm ra con đường ngắn nhất để thanh toán nợ lẫn nhau trong nhóm.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-750/50 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Mã Thành Viên Riêng Biệt</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Mỗi người có mã 6 ký tự để tự nộp biên lai chụp ảnh và điền STK nhận lại mà không cần lập tài khoản Gmail mệt mỏi.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-750/50 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Đồng Bộ Gmail Thủ Quỹ</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Thủ quỹ đăng nhập Gmail để quản lý nhiều nhóm, kiểm soát chỉnh sửa hóa đơn & phê duyệt biên nhận chuyển khoản thần tốc.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-750/50 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Minh Bạch & Trực Quan</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tải về báo cáo PDF, chia sẻ kết quả trực tiếp cho nhóm qua Zalo, Messenger... Sòng phẳng tuyệt đối!
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Portal Login forms */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Form container card */}
              <div className="bg-slate-850 border border-slate-805 p-6 sm:p-7.5 rounded-3xl shadow-2xl space-y-6 relative">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black text-[9px] tracking-widest uppercase px-3.5 py-1 rounded-full shadow-md shadow-indigo-500/20">
                  CỔNG KẾT NỐI AN TOÀN
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">BẮT ĐẦU VÀO PHÒNG</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Vui lòng liên kết tài khoản để tham gia với vai trò tương ứng:
                  </p>
                </div>

                {/* Option 1: Gmail Leader */}
                <div className="border border-slate-800/60 p-4 rounded-2xl bg-slate-800/20 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                      <Crown className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/25" />
                    </div>
                    <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">CÀI ĐẶT THỦ QUỸ (GMAIL)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dành cho trưởng nhóm, người cầm quỹ: Đăng nhập Gmail để tạo phòng mới, thêm bớt thành viên & duyệt biên lai nộp tiền.
                  </p>
                  
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-black py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-95 shadow-md shrink-0"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.6a5.64 5.64 0 0 1-2.44 3.7l3.77 2.92c2.2-2.03 3.8-5.03 3.8-8.47z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.77-2.92c-1.08.73-2.46 1.16-4.16 1.16-3.2 0-5.9-2.16-6.87-5.07l-3.9 3.03C3.2 21.09 7.21 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.13 14.26A7.12 7.12 0 0 1 4.75 12c0-.79.13-1.57.38-2.26L1.23 6.71A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.23 5.29l3.9-3.03z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.08 15.24 0 12 0 7.21 0 3.2 2.91 1.23 6.71l3.9 3.03c.97-2.91 3.67-5.07 6.87-5.07z"/>
                    </svg>
                    <span>Tiếp tục với Google Tài Khoản</span>
                  </button>
                </div>

                {/* Divider Line */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-700/40" />
                  <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase">HOẶC THÀNH VIÊN</span>
                  <div className="flex-1 h-px bg-slate-700/40" />
                </div>

                {/* Option 2: Passcode Member */}
                <div className="border border-slate-800/60 p-4 rounded-2xl bg-slate-800/20 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">CỔNG TRUY CẬP THÀNH VIÊN</span>
                  </div>
                  <p className="text-[11.5px] text-slate-400 leading-relaxed">
                    Nhập mã 6 ký tự được thủ quỹ cung cấp để vào phòng nhóm, khai báo thông tin thanh toán & tải ảnh xác minh chuyển khoản.
                  </p>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem("landingMemberCode") as HTMLInputElement;
                    handleMemberCodeLogin(input.value);
                  }} className="flex flex-col sm:flex-row gap-2">
                    <input
                      name="landingMemberCode"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="MÃ 6 KÝ TỰ (VÍ DỤ: AJZ581)"
                      className="flex-1 bg-slate-800 border border-slate-700 text-xs font-mono font-extrabold py-2.5 px-3 rounded-xl uppercase tracking-widest text-emerald-300 placeholder-slate-500 text-center outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] py-2.5 px-4.5 rounded-xl transition-all cursor-pointer uppercase shrink-0 active:scale-95"
                    >
                      Vào nhóm
                    </button>
                  </form>
                </div>

                {/* Local Mode access */}
                <div className="pt-2 text-center">
                  <button
                    onClick={() => handleSetTryOffline(true)}
                    className="text-slate-450 hover:text-indigo-405 text-[11.5px] font-bold transition-colors cursor-pointer hover:underline underline-offset-4"
                  >
                    Dùng thử Chế độ Offline (Không đồng bộ đám mây) →
                  </button>
                </div>
              </div>

              {/* Secure Trust Stamp */}
              <p className="text-[10px] text-slate-505 text-center font-medium leading-relaxed">
                🔒 Thông tin chi tiêu, công nợ nhóm được mã hóa phân tách nợ tối ưu trên nền tảng cơ sở hạ tầng an toàn của Google.
              </p>
            </div>

          </div>
        </main>

        {/* Footer info */}
        <footer className="border-t border-slate-800/40 py-6 text-slate-500 text-center text-xs bg-slate-950/20">
          <p>© 2026 SplitMate Applet. Bản quyền của bạn hoàn toàn được lưu giữ bảo mật.</p>
        </footer>
      </div>
    );
  }

  // 3. For logged in or offline preview users, let's keep the standard layout but tweak the top panels!
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 flex flex-col selection:bg-indigo-100 selection:text-indigo-800">
      {/* Dynamic Success Toast */}
      <AnimatePresence>
        {newGroupSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white py-3 px-5 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-medium"
          >
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span>Đã tạo và chuyển sang nhóm mới thành công!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Notification Stripe */}
      <div className="bg-slate-900 text-slate-300 py-2 px-4 text-center text-xs border-b border-slate-800/80 font-medium font-sans">
        🎯 Giải pháp tối ưu hóa chia tiền nhóm cho các chuyến du lịch, buổi ăn uống, hoạt động tập thể
      </div>

      {/* Cloud & Member Sync Panel/Banner */}
      {user ? (
        /* Logged in as Google User (Leader/Owner/Thu quy) */
        <div className="bg-emerald-950 border-b border-emerald-800 text-white py-3.5 px-4 shadow-sm relative z-20 font-sans">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-400 shrink-0 shadow-sm shadow-emerald-500/20">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-emerald-700 flex items-center justify-center font-bold text-xs uppercase">{user.email?.charAt(0)}</div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs font-black flex items-center justify-center sm:justify-start gap-1 text-emerald-300 tracking-wider">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />
                  CHẾ ĐỘ THỦ QUỸ CLOUD (GMAIL HOẠT ĐỘNG)
                </p>
                <p className="text-[10.5px] text-emerald-200 mt-0.5">
                  Thủ quỹ: <strong className="text-emerald-100">{user.displayName || user.email}</strong> • Toàn bộ thành viên và các chi phí đang tự động cập nhật thời gian thực
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-emerald-800 hover:bg-emerald-705 border border-emerald-700 hover:border-emerald-600 text-emerald-50 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Đăng xuất Thủ quỹ
            </button>
          </div>
        </div>
      ) : memberAccessCodeUser ? (
        /* Logged in as Member User via access code */
        <div className="bg-gradient-to-r from-indigo-950 to-slate-950 border-b border-indigo-805 text-white py-3.5 px-4 shadow-md relative z-20 font-sans">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs font-black text-indigo-300 tracking-wider uppercase flex items-center justify-center sm:justify-start gap-1">
                  <span>Chế độ thành viên: {getMember(viewingMemberId || "")?.name || "Thành viên"}</span>
                  <span className="bg-indigo-500/20 text-indigo-305 text-[9px] font-bold py-0.5 px-1.5 border border-indigo-500/30 rounded">MÃ: {memberAccessCodeUser.code}</span>
                </p>
                <p className="text-[10.5px] text-slate-350 mt-0.5">
                  Nhóm hiện tại: <strong className="text-white">{activeGroup?.name || "Bất định"}</strong> • Bạn có quyền tự điền STK nhận tiền cá nhân & nộp bằng chứng chuyển khoản.
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-indigo-850 hover:bg-indigo-800 border border-indigo-750 hover:border-indigo-655 text-indigo-100 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Rời khỏi nhóm
            </button>
          </div>
        </div>
      ) : (
        /* Cloud Sync Panel - Unauthenticated (Using offline mode now) */
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white py-3.5 px-4 shadow-md relative z-20 font-sans border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-amber-500 tracking-wider uppercase">Chế độ trải nghiệm thử (Offline)</p>
                <p className="text-[10.5px] text-slate-355 mt-0.5">
                  Dữ liệu đang được lưu trữ tạm thời trên trình duyệt của bạn và KHÔNG được ghi lên đám mây Cloud.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handleSetTryOffline(false)}
              className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 hover:border-indigo-400 text-white py-1.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 uppercase"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        </div>
      )}

      {/* Primary Header/Console */}
      <header className="bg-white border-b border-slate-100 shadow-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20 flex items-center justify-center text-white">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h1 className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
                SplitMate <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full py-0.5 px-2 font-bold font-sans">v1.2</span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 tracking-wide">
                Chia Tiền Nhóm Thông Minh & Chốt Sổ Trả Nợ Tối Ưu
              </p>
            </div>
          </div>

          {/* Group and Action control panel */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Quick Switch Select box */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
              <span className="text-xs text-slate-500 font-bold px-1.5 hidden sm:inline">Nhóm:</span>
              <select
                aria-label="Chọn nhóm hoạt động"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none pr-6 pl-1 cursor-pointer"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.members.length} tv)
                  </option>
                ))}
              </select>

              {/* Group Delete utility */}
              {activeIsSettled && (
                <button
                  type="button"
                  onClick={() => handleDeleteGroup(selectedGroupId)}
                  title="Xóa nhóm này"
                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* inline triggers to add quick groups or reset mockup data */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tạo nhóm mới</span>
              </button>

              <button
                onClick={handleResetToPresets}
                title="Trả lại các dữ liệu mẫu cài sẵn"
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-bold py-2.5 p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>

        {/* Create Group Inline Form Drawer */}
        <AnimatePresence>
          {isCreatingGroup && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-50 border-t border-b border-slate-100 overflow-hidden"
            >
              <div className="max-w-2xl mx-auto px-4 py-4.5">
                <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 space-y-1 w-full">
                    <label className="text-xs font-bold text-slate-500" htmlFor="new-group-name">Tên nhóm hoạt động mới</label>
                    <input
                      id="new-group-name"
                      type="text"
                      maxLength={45}
                      required
                      placeholder="Ví dụ: Chuyến đi Vũng Tàu, Nhóm bạn thân ăn nhậu..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 font-semibold text-slate-800 text-xs transition-all"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                    <button
                      type="button"
                      onClick={() => setIsCreatingGroup(false)}
                      className="flex-1 sm:flex-none border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold text-xs py-2 px-3.5 rounded-xl transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Kích hoạt nhóm
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Container Content styled with Bento Grid */}
      <main className="max-w-7xl mx-auto px-4 mt-6 sm:mt-8 flex-1 w-full space-y-6 animate-fade-in">
        
        {/* Dynamic Mode Switcher Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs relative overflow-hidden">
          {/* Subtle decoration background color based on role state */}
          <div className={`absolute top-0 bottom-0 left-0 w-2.5 ${isAdmin ? "bg-indigo-600" : "bg-teal-550"}`} />
          
          <div className="flex items-center gap-3.5 pl-2 text-left">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-3xs ${
              isAdmin ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"
            }`}>
              {isAdmin ? <FolderLock className="w-5.5 h-5.5" /> : <UserCheck className="w-5.5 h-5.5" />}
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Chế độ người dùng</p>
              <h2 className="font-extrabold text-sm text-slate-800 mt-1.5 leading-none flex items-center gap-1.5 flex-wrap">
                {isAdmin ? (
                  <>
                    <span className="text-indigo-600">👑 Trưởng nhóm / Thủ quỹ</span>
                    <span className="text-[9px] bg-indigo-55 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-md font-extrabold uppercase">Toàn quyền</span>
                  </>
                ) : (
                  <>
                    <span className="text-teal-600 font-bold">👥 Thành viên</span>
                    <span className="text-[9px] bg-teal-100/50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-md font-extrabold uppercase">Chỉ xem & tự quản lý STK</span>
                  </>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 md:mt-1.5 leading-normal font-medium">
                {isAdmin 
                  ? "Bạn có toàn quyền thêm/xóa thành viên, ghi chi tiêu, chỉnh sửa quỹ chung và trực tiếp phê duyệt quyết toán." 
                  : `Bạn đang truy cập dưới chế độ Thành viên. Có quyền tự chỉnh sửa SĐT/STK cá nhân & nộp ảnh chụp biên lai.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap pl-2 md:pl-0">
            {/* If member is viewing, let them specify WHO they are to unlock editing that specific member */}
            {!isAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                <span className="text-[10px] text-slate-450 font-extrabold uppercase px-1.5">Tôi là:</span>
                <select
                  aria-label="Chọn tên thành viên của bạn"
                  value={viewingMemberId || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    setViewingMemberId(id || undefined);
                    const name = members.find(m => m.id === id)?.name || "Chưa xác định";
                    showAlert("Thay đổi danh nghĩa", `Bản vẽ SplitMate đã gán bạn là "${name}". Bây giờ bạn có thể tự thay đổi STK / ví nhận tiền của chính mình dưới danh mục Thành Viên!`);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none pr-6 cursor-pointer"
                >
                  <option value="">-- Chọn tên bạn --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setIsAdmin(false);
                  if (members.length > 0) {
                    setViewingMemberId(members[0].id);
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-extrabold py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Chuyển sang Chế Độ Thành Viên (Xem)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginError("");
                  setLoginPassword("");
                  setShowLoginModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5"
              >
                <FolderLock className="w-4 h-4" />
                <span>Đăng nhập Trưởng nhóm</span>
              </button>
            )}
          </div>
        </div>

        {/* Bento Grid Header / Top row */}
        <div className="grid grid-cols-12 gap-5">
          
          {/* Main Balance Box Bento Tile (8/12 col) */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tổng chi tiêu cả nhóm ({activeGroup?.name || "Nhóm trống"})
                </span>
                <p className="text-xs text-slate-400 mt-0.5">Khởi tạo ngày: {activeGroup?.createdAt || "..."}</p>
              </div>
              <span className={`px-2.5 py-1 ${expenses.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"} rounded-full text-[10px] font-bold uppercase shrink-0`}>
                {expenses.length > 0 ? `${expenses.length} hoạt động` : "Sẵn sàng chia"}
              </span>
            </div>

            <div className="my-5 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 leading-none">
                {new Intl.NumberFormat("vi-VN").format(totals)}
              </span>
              <span className="text-lg font-extrabold text-slate-400">VND</span>
            </div>

            {/* Inner Bento Stats cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-100/50">
                <p className="text-xs text-slate-500 mb-1 font-semibold">Thành viên tham gia</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-extrabold text-slate-800">{members.length} người</p>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {members.slice(0, 3).map((m) => (
                      <span key={m.id} title={m.name} className="w-5 h-5 rounded-full bg-white text-[10px] flex items-center justify-center border border-slate-200 shadow-xs overflow-hidden shrink-0">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          m.emoji
                        )}
                      </span>
                    ))}
                    {members.length > 3 && (
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-[8px] font-bold text-slate-600 flex items-center justify-center border border-white">
                        +{members.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 transition-all hover:bg-slate-100/50">
                <p className="text-xs text-slate-500 mb-1 font-semibold">Bình quân đầu người</p>
                <p className="text-lg font-extrabold text-indigo-600">
                  {members.length > 0 ? `${new Intl.NumberFormat("vi-VN").format(Math.round(totals / members.length))}đ` : "0đ"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Interactive Group Selection Bento Tile (4/12 col) */}
          <div className="col-span-12 lg:col-span-4 bg-indigo-950 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg shadow-indigo-100/30">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-indigo-200">Nhóm của bạn</h3>
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-semibold">Tích cực</span>
              </div>
              
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {groups.map((g) => {
                  const isActive = g.id === selectedGroupId;
                  const groupTotal = g.expenses.reduce((sum, e) => sum + e.amount, 0);
                  const txs = simplifyDebts(g.members, g.expenses);
                  const isSettled = txs.length === 0;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer border transition-all relative group/item ${
                        isActive
                          ? "bg-white/15 border-white/20 shadow-md scale-[1.01]"
                          : "bg-indigo-900/30 border-white/5 hover:bg-indigo-900/65"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-orange-400 flex items-center justify-center text-sm font-bold shadow-xs select-none shrink-0">
                        {g.name.includes("🌲") || g.name.toLowerCase().includes("lạt") ? "🌲" : g.name.includes("🍲") || g.name.toLowerCase().includes("ăn") ? "🍲" : "☕"}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-extrabold text-xs truncate">{g.name}</p>
                        <p className="text-[10px] text-indigo-200 flex justify-between items-center mt-0.5">
                          <span>{g.members.length} tv • {new Intl.NumberFormat("vi-VN").format(Math.round(groupTotal / 1000))}k chi</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold tracking-wide ${
                            isSettled ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/20" : "bg-slate-500/25 text-slate-350 border border-white/5"
                          }`}>
                            {isSettled ? "Sòng phẳng" : "Chưa sòng"}
                          </span>
                        </p>
                      </div>

                      {isSettled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(g.id);
                          }}
                          className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-lg shadow-rose-950/40 border border-rose-500/35 hover:scale-[1.03] active:scale-95"
                          title="Xóa nhóm này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa nhóm</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                className="text-xs bg-white text-indigo-900 hover:bg-indigo-50 font-extrabold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Thêm nhóm mới</span>
              </button>

              <button
                onClick={handleResetToPresets}
                title="Trả lại các dữ liệu mẫu cài sẵn"
                className="text-indigo-200 hover:text-white pb-0.5 underline text-[10px] font-bold cursor-pointer"
              >
                Đặt lại mẫu
              </button>
            </div>
          </div>
        </div>

        {/* Tab switchers rendered as an elegant Bento accessory */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-left py-1 px-2">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>🚀 Bảng điều khiển:</span>
              <span className="text-indigo-600 font-black italic">{activeGroup?.name}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab("bills")}
                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === "bills"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Ghi chép chi tiêu</span>
              </button>
              <button
                onClick={() => setActiveTab("settle")}
                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === "settle"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Trả nợ & Thống kê bento</span>
              </button>
              <button
                onClick={() => setActiveTab("participation")}
                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === "participation"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Quản lý tham gia</span>
              </button>
            </div>

            {expenses.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleShareReport}
                  title="Chia sẻ báo cáo PDF (Zalo, Messenger...)"
                  className="p-2 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-[10px] font-bold hidden sm:inline">Chia sẻ</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  title="Tải báo cáo PDF"
                  className="p-2 border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span className="text-[10px] font-bold hidden sm:inline">Xuất PDF</span>
                </button>
                <button
                  onClick={handleClearActiveGroupData}
                  title="Xóa nhanh tất cả chi tiêu trong nhóm"
                  className="p-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Workspace tabs with smooth layout animation */}
        <div>
          {activeTab === "bills" ? (
            /* TAB 1: Core recording & Member registration flow */
            <div className="grid grid-cols-12 gap-5 items-start">
              
              {/* Member registration pane (4/12 col) */}
              <div className="col-span-12 lg:col-span-4 space-y-5">
                <MemberSection
                  members={members}
                  expenses={expenses}
                  onAddMember={handleAddMember}
                  onRemoveMember={handleRemoveMember}
                  onEditMember={handleEditMember}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                />
              </div>

              {/* Expense entries list & creation form (8/12 col) */}
              <div className="col-span-12 lg:col-span-8 space-y-5">
                {isAdmin ? (
                  <ExpenseForm
                    members={members}
                    onAddExpense={handleAddExpense}
                    editingExpense={editingExpense}
                    onCancelEdit={() => setEditingExpense(null)}
                    onUpdateExpense={handleUpdateExpense}
                  />
                ) : (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center py-8 text-center space-y-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-550">
                      <FolderLock className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Chế độ Xem Biên Lai (Thành Viên)</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-normal">
                        Danh sách chi tiêu trong nhóm đã khóa chiều thêm/sửa/xóa để bảo toàn dữ liệu thủ quỹ. Bạn chỉ có thể theo dõi thống kê và nộp đối soát.
                      </p>
                    </div>
                  </div>
                )}
                
                <ExpenseList
                  expenses={expenses}
                  members={members}
                  onDeleteExpense={handleDeleteExpense}
                  onEditExpense={(exp) => {
                    setEditingExpense(exp);
                    window.scrollTo({ top: 380, behavior: "smooth" });
                  }}
                  isAdmin={isAdmin}
                />
              </div>

            </div>
          ) : activeTab === "settle" ? (
            /* TAB 2: Settlement recommendation, balances and visual analyzer charts */
            <div className="grid grid-cols-12 gap-5 items-start">
              
              {/* Settle Up recommendations mapping */}
              <div className="col-span-12 lg:col-span-7 space-y-5">
                <SettleUpSection
                  activeGroup={activeGroup}
                  onUpdateGroupConfig={handleUpdateGroupConfig}
                  members={members}
                  expenses={expenses}
                  onAddExpense={handleAddExpense}
                  isAdmin={isAdmin}
                  viewingMemberId={viewingMemberId}
                  pendingReceipts={activeGroup?.pendingReceipts || []}
                  onUpdatePendingReceipts={async (receipts) => {
                    const updatedGroup = {
                      ...activeGroup,
                      pendingReceipts: receipts
                    };
                    if (isAdmin) {
                      await updateGroupOnDbAndState(updatedGroup);
                    } else {
                      const newReceipt = receipts.find(
                        r => !activeGroup.pendingReceipts?.some(p => p.id === r.id)
                      );
                      if (newReceipt) {
                        try {
                          const res = await fetch("/api/member/upload-receipt", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              groupId: selectedGroupId,
                              memberId: viewingMemberId,
                              accessCode: memberAccessCodeUser?.code,
                              pendingReceipt: newReceipt
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setGroups([data.group]);
                            showAlert("Đã gửi minh chứng", "Minh chứng chuyển khoản của bạn đã được gửi thành công!");
                          } else {
                            showAlert("Gửi thất bại", data.error || "Không thể nộp minh chứng.");
                          }
                        } catch (err) {
                          console.error(err);
                          showAlert("Lỗi hệ thống", "Có lỗi xảy ra khi nộp minh chứng chuyển khoản.");
                        }
                      } else {
                        setGroups((prev) =>
                          prev.map((g) => (g.id === selectedGroupId ? updatedGroup : g))
                        );
                      }
                    }
                  }}
                />
                <FundHistoryList
                  expenses={expenses}
                  members={members}
                  onDeleteExpense={handleDeleteExpense}
                />
              </div>

              {/* Statistics distribution summary & charts */}
              <div className="col-span-12 lg:col-span-5">
                <StatsSection
                  members={members}
                  expenses={expenses}
                />
              </div>

            </div>
          ) : (
            /* TAB 3: Participation Management Panel */
            <div className="space-y-5 animate-in fade-in duration-300">
              <ParticipationSection
                members={members}
                expenses={expenses}
              />
            </div>
          )}
        </div>

        {/* Educational/FAQ block on dividing mechanisms */}
        <footer className="bg-white/60 border border-slate-200 rounded-3xl p-6 text-left text-xs text-slate-500 max-w-4xl mx-auto space-y-3 shadow-xs">
          <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            Về giải pháp chia đều hóa đơn linh hoạt (SplitMate FAQ)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-500">
            <div className="space-y-1.5 leading-relaxed">
              <p className="font-bold text-slate-600">Q: Làm sao để ghi nhận chi phí mà không phải ai cũng tham gia?</p>
              <p>
                Để tiện hóa cho việc "mỗi hoạt động có thành viên khác nhau", khi nhập chi phí mới, bạn có thể <strong>tích chọn cụ thể</strong> những ai thực tế tham gia (chân dưới mục "Chia sẻ cùng ai"). Hệ thống sẽ tự động chỉ chia nhỏ hóa đơn cho những người được tích chọn.
              </p>
            </div>
            <div className="space-y-1.5 leading-relaxed">
              <p className="font-bold text-slate-600">Q: Làm thế nào để thanh toán (Settle up) giữa hai người?</p>
              <p>
                Tại tab <strong>"Trả nợ & Thống kê bento"</strong>, ấn nút <strong>"Xác nhận đã trả"</strong> ở sơ đồ nợ gợi ý. Tính năng sẽ tự động thêm một khoản ghi chú đặc biệt vào lịch sử chi tiêu để bù trừ nợ nần trực tiếp giữa hai bạn, nhanh gọn không cần tính lại bằng tay.
              </p>
            </div>
          </div>
        </footer>

        {/* Custom Confirmation Dialog */}
        <AnimatePresence>
          {confirmState && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmState(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              />
              {/* Box container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl z-10 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-850 text-sm tracking-tight mb-2">
                      {confirmState.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {confirmState.message}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmState(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={confirmState.onConfirm}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm shadow-rose-600/10 cursor-pointer"
                  >
                    Đồng ý
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Alert Dialog */}
        <AnimatePresence>
          {alertState && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAlertState(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              />
              {/* Box container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl z-10 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-850 text-sm tracking-tight mb-2">
                      {alertState.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {alertState.message}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAlertState(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Tôi đã hiểu
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Admin Leader Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLoginModal(false)}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs"
              />
              {/* Box */}
              <motion.div
                initial={{ scale: 0.93, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.93, opacity: 0, y: 15 }}
                className="bg-white border border-slate-200 rounded-3xl p-6.5 max-w-sm w-full relative shadow-2xl z-20 text-left space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <FolderLock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
                      Xác minh Trưởng nhóm
                    </h3>
                    <p className="text-[11px] text-slate-455 mt-1 font-medium leading-relaxed">
                      Nhập mật khẩu quản trị để cấp quyền ghi sổ và phê duyệt trực tiếp.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block" htmlFor="login-password">
                      Mật khẩu Trưởng nhóm
                    </label>
                    <span className="text-[9px] text-indigo-550 font-bold bg-indigo-50 px-1.5 py-0.2 rounded-md">
                      Mặc định: leader123
                    </span>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError("");
                    }}
                    placeholder="Nhập leader123..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-slate-805 placeholder-slate-400 focus:outline-hidden transition-all font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (loginPassword.trim() === "leader123" || loginPassword.trim() === "lidere123") {
                          setIsAdmin(true);
                          setViewingMemberId(undefined);
                          setShowLoginModal(false);
                          setLoginPassword("");
                          showAlert("🎉 Đăng nhập thành công!", "Chào mừng bạn quay trở lại với quyền quản trị viên Trưởng nhóm / Thủ quỹ.");
                        } else {
                          setLoginError("Mật khẩu không khớp. Vui lòng thử lại!");
                        }
                      }
                    }}
                  />
                  {loginError && (
                    <p className="text-[10px] text-rose-500 font-bold leading-none mt-1 animate-pulse">
                      ⚠️ {loginError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setLoginPassword("");
                      setLoginError("");
                    }}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (loginPassword.trim() === "leader123" || loginPassword.trim() === "lidere123") {
                        setIsAdmin(true);
                        setViewingMemberId(undefined);
                        setShowLoginModal(false);
                        setLoginPassword("");
                        showAlert("🎉 Đăng nhập thành công!", "Chào mừng bạn quay trở lại với quyền quản trị viên Trưởng nhóm / Thủ quỹ.");
                      } else {
                        setLoginError("Mật khẩu không khớp. Vui lòng thử lại!");
                      }
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center shadow-lg shadow-indigo-600/10"
                  >
                    Xác minh
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
