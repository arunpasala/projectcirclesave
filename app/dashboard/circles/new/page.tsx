"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCirclePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please login first");
        router.push("/auth/login");
        return;
      }

      const res = await fetch("/api/circles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          contributionAmount: Number(amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create circle");
      }

      alert("Circle created successfully");

      // Redirect to dashboard
      router.push("/dashboard/circles");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-md space-y-6">

        <h1 className="text-2xl font-bold text-center">
          Create Circle
        </h1>

        {/* Circle Name */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Circle Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="Enter circle name"
          />
        </div>

        {/* Contribution Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Contribution Amount ($)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="Enter amount"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Circle"}
        </button>

      </div>
    </div>
  );
}