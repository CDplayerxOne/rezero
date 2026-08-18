"use client";

import { useState, ChangeEvent, useEffect } from "react";

export default function FilesTab({ workspaceId }: { workspaceId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<
    Array<{
      filename: string;
      file_type: string;
      url: string;
      public_id: string;
    }>
  >([]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/files/workspace/${workspaceId}?page=1&limit=10`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );
        const data = await response.json();
        setLoading(false);
        setFiles(data);
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    };

    fetchFiles();
  }, [workspaceId]);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      // Request presigned URL from FastAPI
      const response = await fetch(
        `http://localhost:8000/files/upload/${workspaceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            file_type: file.type,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to get presigned URL");

      const { url, public_id } = await response.json();
      console.log("url", url);

      // Upload file directly to Amazon S3
      const s3Response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type, // MUST match the type sent to FastAPI
        },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload file to S3");
      }

      console.log("File uploaded successfully to S3");

      // Refresh the file list after successful upload
      const newFile = await fetch(
        `http://localhost:8000/files/get/${public_id}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (!newFile.ok) throw new Error("Failed to fetch new file details");

      const newFileData = await newFile.json();
      setFiles((prevFiles) => [newFileData, ...prevFiles]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Files</h2>
      <form action={handleUpload} className="flex flex-col gap-4 p-6 max-w-sm">
        <label className="block text-sm font-medium text-gray-700">
          Choose a file to upload:
        </label>
        <input
          type="file"
          accept=".pdf" // Adjust accepted file types as needed
          name="file" // This name attribute maps to the FormData key
          required
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          type="submit"
          className={`bg-blue-600 text-white py-2 px-4 rounded-md ${uploading || !file ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"} transition`}
          disabled={uploading || !file}
        >
          Upload File
        </button>
      </form>
      {loading && <p>Loading files...</p>}
      <div className="grid grid-cols-3 gap-4">
        {files.map((file) => (
          <div key={file.public_id} className="border rounded-lg p-4">
            <div className="font-medium">{file.filename}</div>
            <div className="text-sm text-muted-foreground">
              {file?.file_type === "application/pdf" && (
                <iframe
                  src={file.url}
                  className="w-full h-64 rounded border"
                  title="PDF Preview"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
