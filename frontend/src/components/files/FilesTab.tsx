"use client";

import { Trash2 } from "lucide-react";
import { useState, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "../ui/Modal";

type FileItem = {
  filename: string;
  file_type: string;
  url: string;
  public_id: string;
};

const fetchFiles = async (workspaceId: string): Promise<FileItem[]> => {
  const response = await fetch(
    `http://localhost:8000/files/workspace/${workspaceId}?page=1&limit=10`,
    {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch files");
  }

  return response.json();
};

export default function FilesTab({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["files", workspaceId],
    queryFn: () => fetchFiles(workspaceId),
  });

  const deleteMutation = useMutation({
    mutationFn: async (public_id: string) => {
      const response = await fetch(
        `http://localhost:8000/files/delete/${public_id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
    },
    onSuccess: (_, public_id) => {
      queryClient.setQueryData<FileItem[]>(
        ["files", workspaceId],
        (prev = []) => prev.filter((f) => f.public_id !== public_id),
      );
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] });
      setIsModalOpen(false);
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleOpenModal = (public_id: string) => {
    setFileToDelete(public_id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (deleting) return; // Prevent closing the modal while deleting
    setFileToDelete(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (public_id: string) => {
    if (!public_id) return;
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync(public_id);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
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

      const s3Response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload file to S3");
      }

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

      const res = await fetch(
        `http://localhost:8000/files/embed/${public_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            workspace_id: workspaceId,
          }),
        },
      );

      if (!res.ok)
        throw new Error("Failed to generate embeddings for the file");

      const newFileData = await newFile.json();

      queryClient.setQueryData<FileItem[]>(
        ["files", workspaceId],
        (prev = []) => [newFileData, ...prev],
      );
      queryClient.invalidateQueries({ queryKey: ["files", workspaceId] });
      setFile(null);
      const input =
        document.querySelector<HTMLInputElement>("input[type='file']");
      if (input) input.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <p>Are you sure you want to delete this file?</p>
        <div className="flex justify-between gap-2 mt-4">
          <button
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            onClick={handleCloseModal}
          >
            Cancel
          </button>
          <button
            className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
            onClick={async () => await handleDelete(fileToDelete!)} // Non-null assertion since we ensure a file is selected before opening the modal}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Files</h2>
        <form
          action={handleUpload}
          className="flex flex-col gap-4 p-6 max-w-sm"
        >
          <label className="block text-sm font-medium text-gray-700">
            Choose a file to upload:
          </label>
          <input
            type="file"
            accept=".pdf" // Adjust accepted file types as needed
            name="file" // This name attribute maps to the FormData key
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 hover:file:cursor-pointer"
          />
          <button
            type="submit"
            className={`bg-blue-600 text-white py-2 px-4 rounded-md ${uploading || !file ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"} transition`}
            disabled={uploading || !file}
          >
            Upload File
          </button>
        </form>
        {isLoading && <p>Loading files...</p>}
        <div className="grid grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.public_id}
              className="border rounded-lg p-4 bg-stone-100 shadow-md hover:shadow-lg transition duration-200 border-gray-300"
            >
              <div className="font-medium flex m-2 justify-between items-center">
                <p className="shrink h-16 flex items-center line-clamp-2 overflow-hidden text-ellipsis">
                  {file.filename}
                </p>
                <Trash2
                  className="cursor-pointer text-red-500 hover:text-red-700 w-16"
                  onClick={() => handleOpenModal(file.public_id)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {file?.file_type === "application/pdf" && (
                  <iframe
                    src={file.url}
                    className="w-full h-64 rounded-lg border"
                    title="PDF Preview"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
