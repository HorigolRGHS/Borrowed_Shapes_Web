"use client";

import { useState } from "react";

export default function DownloadTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload state
  const [adminToken, setAdminToken] = useState("");
  const [fileVersion, setFileVersion] = useState("1.0.0");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const BACKEND_URL = "http://localhost:3001/api";

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const versionsRes = await fetch(`${BACKEND_URL}/downloads/versions`);
      const versionsData = await versionsRes.json();

      const items = versionsData?.data?.items ?? [];
      if (items.length === 0) {
        setError("Không tìm thấy phiên bản nào. Hãy upload file trước.");
        setLoading(false);
        return;
      }

      const targetFile =
        items.find((f: any) => f.fileName.includes("Meo")) || items[0];

      const downloadRes = await fetch(
        `${BACKEND_URL}/downloads/versions/${targetFile.id}/download`,
        { method: "POST" }
      );
      const downloadData = await downloadRes.json();

      if (!downloadData?.success || !downloadData?.data?.downloadUrl) {
        setError(downloadData?.message || "Không thể tạo link download.");
        setLoading(false);
        return;
      }

      const { downloadUrl, fileName, fileVersion, fileSize } =
        downloadData.data;

      setSuccess(
        `✅ Đã tạo link tải thành công!\n📄 File: ${fileName}\n📦 Version: ${fileVersion}\n📏 Size: ${fileSize} bytes\n\nĐang mở link tải...`
      );

      window.open(downloadUrl, "_blank");
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi download.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!adminToken) return setError("Vui lòng nhập Admin Token");
    if (!selectedFile) return setError("Vui lòng chọn file");
    if (!fileVersion) return setError("Vui lòng nhập Version");

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Force mimeType to octet-stream to pass backend validation
      const mimeType = "application/octet-stream";

      // 1. Request upload URL
      const uploadUrlRes = await fetch(
        `${BACKEND_URL}/downloads/admin/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileVersion: fileVersion,
            fileSize: selectedFile.size,
            mimeType: mimeType,
          }),
        }
      );

      const uploadUrlData = await uploadUrlRes.json();
      if (!uploadUrlData?.success) {
        throw new Error(uploadUrlData?.message || "Không thể lấy Upload URL");
      }

      const { uploadUrl, key } = uploadUrlData.data;

      // 2. Upload file directly to R2
      console.log("R2 upload method:", "PUT");
      console.log("R2 upload url includes PutObject:", uploadUrl.includes("PutObject"));
      console.log("R2 upload content type:", mimeType);
      console.log("Selected file:", selectedFile.name, selectedFile.type, selectedFile.size);

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: selectedFile,
        credentials: "omit",
      });

      if (!putRes.ok) {
        const errorText = await putRes.text().catch(() => "");
        throw new Error(`R2 upload failed: ${putRes.status} ${errorText}`);
      }

      // 3. Confirm upload
      const confirmRes = await fetch(
        `${BACKEND_URL}/downloads/admin/confirm-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileVersion: fileVersion,
            filePath: key,
            fileSize: selectedFile.size,
            mimeType: mimeType,
          }),
        }
      );

      const confirmData = await confirmRes.json();
      if (!confirmData?.success) {
        throw new Error(confirmData?.message || "Không thể confirm upload");
      }

      setSuccess(
        `✅ Upload thành công!\n📄 File: ${selectedFile.name}\n📦 Version: ${fileVersion}\n\nGiờ bạn có thể test Download.`
      );
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        fontFamily: "'Inter', sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "2rem",
          maxWidth: "900px",
          width: "100%",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Upload Panel */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: "1.5rem",
            padding: "2.5rem",
            flex: "1 1 400px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem", textAlign: "center" }}>
            ☁️
          </div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#fff",
              textAlign: "center",
              marginBottom: "1.5rem",
            }}
          >
            Upload File
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
            <input
              type="text"
              placeholder="Admin JWT Token (Bearer ...)"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#f8fafc",
              }}
            />
            <input
              type="text"
              placeholder="Version (vd: 1.0.0)"
              value={fileVersion}
              onChange={(e) => setFileVersion(e.target.value)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "#f8fafc",
              }}
            />
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ color: "#94a3b8" }}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              width: "100%",
              padding: "1rem 2rem",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#fff",
              background: loading
                ? "rgba(16, 185, 129, 0.5)"
                : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              borderRadius: "0.75rem",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "⏳ Đang upload..." : "⬆️ Upload File"}
          </button>
        </div>

        {/* Download Panel */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: "1.5rem",
            padding: "2.5rem",
            flex: "1 1 400px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem", textAlign: "center" }}>
              🎮
            </div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#fff",
                textAlign: "center",
                marginBottom: "0.5rem",
              }}
            >
              Download Test
            </h2>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "0.9rem",
                textAlign: "center",
                marginBottom: "2rem",
              }}
            >
              Không cần đăng nhập. Sẽ lấy file đầu tiên (hoặc file tên "Meo").
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={loading}
            style={{
              width: "100%",
              padding: "1rem 2rem",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#fff",
              background: loading
                ? "rgba(99, 102, 241, 0.5)"
                : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              border: "none",
              borderRadius: "0.75rem",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "⏳ Đang xử lý..." : "⬇️ Download Game"}
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div style={{ width: "100%", maxWidth: "900px", marginTop: "2rem" }}>
        {error && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "0.75rem",
              color: "#fca5a5",
              fontSize: "0.9rem",
            }}
          >
            ❌ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "0.75rem",
              color: "#86efac",
              fontSize: "0.9rem",
              whiteSpace: "pre-line",
            }}
          >
            {success}
          </div>
        )}
      </div>

      <p style={{ color: "#475569", fontSize: "0.8rem", marginTop: "2rem" }}>
        Backend: {BACKEND_URL}
      </p>
    </main>
  );
}
