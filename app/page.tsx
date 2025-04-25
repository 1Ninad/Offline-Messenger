import { MessageSquare } from "lucide-react"
import ChatInterface from "@/components/chat-interface"

export default function Home() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-sky-50 to-slate-100 text-slate-800">
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-sky-600" />
            <h1 className="text-xl font-semibold text-sky-600">LoRa Chat</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm text-emerald-600">Connected</span>
            </div>
          </div>
        </header>
        <ChatInterface />
      </div>
    </div>
  )
}
