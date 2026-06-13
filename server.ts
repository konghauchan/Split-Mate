import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase configurations
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

let appInstance;
try {
  const existingApp = getApps().find(app => app.name === "splitmate-admin");
  if (!existingApp) {
    appInstance = initializeApp({
      credential: applicationDefault(),
      projectId: firebaseConfig.projectId,
    }, "splitmate-admin");
  } else {
    appInstance = existingApp;
  }
} catch (e) {
  console.log("Firebase Admin SDK lazy initialization:", e);
}

const firestoreDb = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set up Express JSON parser with higher limit for base64 images
  app.use(express.json({ limit: "15mb" }));

  // Initialize server-side Gemini client
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // API Endpoints
  app.post("/api/avatar/anime", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh." });
      }

      // Check if API client exists
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm key trong Settings > Secrets.",
        });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      }

      // Base64 regex for schema data:image/png;base64,XXXXXX
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let mimeType = "image/png";
      let base64Data = image;

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }

      console.log(`Đang gửi yêu cầu Anime- hóa ảnh có định dạng: ${mimeType} tới Gemini...`);

      // Call Gemini 2.5 flash image model for transforming and editing images
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "Thực hiện tạo ra một ảnh chân dung 1:1 phong cách Anime (vibrant anime profile photo) hoàn toàn tương ứng nhất từ khuôn mặt, góc chụp, tóc và trang phục của tấm ảnh này. Ảnh đầu ra phải là một tác phẩm Anime kỹ thuật số, tươi sáng, sắc nét từng chi tiết, cân đối căn giữa, có viền hoặc nền tối giản đẹp mắt làm hình đại diện.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      if (!response.candidates?.[0]?.content?.parts) {
        return res.status(500).json({ error: "Không nhận được phản hồi hợp lệ từ mô hình AI." });
      }

      // Iterate through parts to find the image block
      let base64ResultImage = null;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64ResultImage = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (base64ResultImage) {
        return res.json({ animeAvatar: base64ResultImage });
      } else {
        // Fallback or describe response
        const textResponse = response.text || "Không tìm thấy dữ liệu ảnh.";
        return res.status(500).json({
          error: "Không thể trích xuất phần ảnh AI từ Gemini. Phản hồi mô tả: " + textResponse,
        });
      }
    } catch (error: any) {
      console.error("Lỗi khi xử lý hình ảnh Anime:", error);
      return res.status(500).json({
        error: error.message || "Đã xảy ra lỗi hệ thống trong quá trình xử lý sinh ảnh Anime.",
      });
    }
  });

  // ====== METADATA SECURE MEMBER ROUTES ======

  // 1. Member login with Access Code
  app.post("/api/member/login", async (req, res) => {
    try {
      const { accessCode } = req.body;
      if (!accessCode) {
        return res.status(400).json({ error: "Thiếu mã đăng ký/đăng nhập." });
      }

      const cleanCode = accessCode.trim().toUpperCase();
      console.log(`[AUTH] Đang tìm kiếm nhóm có mã thành viên: ${cleanCode}`);

      // Query groups where memberAccessCodes contains the code
      const querySnapshot = await firestoreDb
        .collection("groups")
        .where("memberAccessCodes", "array-contains", cleanCode)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return res.status(404).json({ error: "Mã truy cập không chính xác hoặc nhóm đã bị xóa." });
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();

      // Find the specific member with this code
      const matchedMember = groupData.members?.find((m: any) => m.accessCode === cleanCode);

      if (!matchedMember) {
        return res.status(404).json({ error: "Thành viên sử dụng mã này không tồn tại trong hệ thống." });
      }

      return res.json({
        group: {
          ...groupData,
          id: groupDoc.id
        },
        memberId: matchedMember.id
      });
    } catch (error: any) {
      console.error("Lỗi đăng ký/đăng nhập của thành viên:", error);
      return res.status(500).json({ error: "Không thể xác thực mã lúc này. Vui lòng thử lại sau." });
    }
  });

  // 2. Member updates their own SĐT/STK
  app.post("/api/member/update-info", async (req, res) => {
    try {
      const { groupId, memberId, accessCode, fundType, momoPhone, bankAccount, bankCode, bankAccountName } = req.body;

      if (!groupId || !memberId || !accessCode) {
        return res.status(400).json({ error: "Yêu cầu thiếu dữ liệu xác thực (ID nhóm, ID thành viên, hoặc Mã)." });
      }

      const cleanCode = accessCode.trim().toUpperCase();
      const groupRef = firestoreDb.collection("groups").doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        return res.status(404).json({ error: "Nhóm không tồn tại hoặc đã bị xóa." });
      }

      const groupData = groupDoc.data() || {};
      const members = groupData.members || [];
      const memberIndex = members.findIndex((m: any) => m.id === memberId);

      if (memberIndex === -1) {
        return res.status(404).json({ error: "Không tìm thấy thành viên trong nhóm này." });
      }

      const member = members[memberIndex];
      if (member.accessCode !== cleanCode) {
        return res.status(403).json({ error: "Mã truy cập của bạn đã hết hạn hoặc không khớp hệ thống." });
      }

      // Update their bank details
      const updatedMember = {
        ...member,
        fundType: fundType || member.fundType,
        momoPhone: momoPhone !== undefined ? (momoPhone.trim() || undefined) : member.momoPhone,
        bankAccount: bankAccount !== undefined ? (bankAccount.trim() || undefined) : member.bankAccount,
        bankCode: bankCode !== undefined ? (bankCode || undefined) : member.bankCode,
        bankAccountName: bankAccountName !== undefined ? (bankAccountName.trim().toUpperCase() || undefined) : member.bankAccountName,
        
        // Populate legacy fallbacks
        fundPhone: bankAccount !== undefined ? bankAccount.trim() : member.fundPhone,
        fundName: bankAccountName !== undefined ? bankAccountName.trim().toUpperCase() : member.fundName,
        fundBankName: bankCode !== undefined ? bankCode : member.fundBankName
      };

      const updatedMembers = [...members];
      updatedMembers[memberIndex] = updatedMember;

      await groupRef.update({ members: updatedMembers });

      return res.json({
        success: true,
        group: {
          ...groupData,
          id: groupId,
          members: updatedMembers
        }
      });
    } catch (error: any) {
      console.error("Lỗi cập nhật thông tin thành viên:", error);
      return res.status(500).json({ error: "Có lỗi khi ghi nhận thông tin SĐT/STK lên máy chủ." });
    }
  });

  // 3. Member submits proof photo (pendingReceipts)
  app.post("/api/member/upload-receipt", async (req, res) => {
    try {
      const { groupId, memberId, accessCode, pendingReceipt } = req.body;

      if (!groupId || !memberId || !accessCode || !pendingReceipt) {
        return res.status(400).json({ error: "Thiếu dữ liệu minh chứng giao dịch." });
      }

      const cleanCode = accessCode.trim().toUpperCase();
      const groupRef = firestoreDb.collection("groups").doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        return res.status(404).json({ error: "Nhóm không tồn tại hoặc đã bị xóa." });
      }

      const groupData = groupDoc.data() || {};
      const members = groupData.members || [];
      const member = members.find((m: any) => m.id === memberId);

      if (!member) {
        return res.status(404).json({ error: "Không tìm thấy thành viên tương ứng." });
      }

      if (member.accessCode !== cleanCode) {
        return res.status(403).json({ error: "Xác thực thất bại, mã không chính xác." });
      }

      const currentReceipts = groupData.pendingReceipts || [];
      const updatedReceipts = [pendingReceipt, ...currentReceipts];

      await groupRef.update({ pendingReceipts: updatedReceipts });

      return res.json({
        success: true,
        group: {
          ...groupData,
          id: groupId,
          pendingReceipts: updatedReceipts
        }
      });
    } catch (error: any) {
      console.error("Lỗi đăng tải minh chứng giao dịch:", error);
      return res.status(500).json({ error: "Có trục trặc khi lưu trữ minh chứng giao dịch. Vui lòng thử lại." });
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // Serve static assets or mount Vite middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Khởi chạy Vite Middleware trong chế độ phát triển (Development)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Đang phục vụ tệp tĩnh trong chế độ vận hành (Production)...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
