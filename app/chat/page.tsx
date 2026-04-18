import Chatbot from "@/components/chat/Chatbot";

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-white">
         Hi,   CircleSave Assistant
        </h1>
        <p className="mb-6 text-sm text-gray-300">
          Ask about circles, contributions, payouts, cycles, and notifications.
        </p>
        <Chatbot />
      </div>
    </main>
  );
}