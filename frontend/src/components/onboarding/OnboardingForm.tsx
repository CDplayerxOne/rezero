"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create workspace");
      }

      const workspace = await res.json();
      if (workspace?.public_id) {
        router.replace(`/workspace/${workspace.public_id}`);
      } else {
        setError("Workspace created but no public id returned.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg border-gray-300 shadow-md rounded-xl border p-6"
    >
      <label className="block text-lg font-semibold">Workspace name</label>
      <div className="mt-2 flex flex-col px-3 py-2">
        <input
          className="rounded-lg outline-1 outline-gray-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Workspace"
          required
        />
        <button
          type="submit"
          className="rounded-xl hover:bg-gray-100 outline-1 outline-gray-300 font-medium px-4 py-2 text-black disabled:opacity-50 max-w-24 mt-4"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </form>
  );
}
