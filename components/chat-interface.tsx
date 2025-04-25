"use client"

import { useState, useEffect, useRef } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { PanelRightOpen } from "lucide-react"

type Message = {
  id: string
  sender: string
  content: string
  timestamp: Date
  status: "sending" | "sent" | "delivered" | "read"
  isMe: boolean
}

type LoRaDeviceData = {
  signalStrength: "Excellent" | "Good" | "Fair" | "Poor"
  frequency: string
  bandwidth: string
  spreadingFactor: string
  lastPing: string
  sentMessages: number
  receivedMessages: number
  deliveryRate: number
  latency: string
}

export default function ChatInterface() {
  const [inputValue, setInputValue] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  const [loraData, setLoraData] = useState<LoRaDeviceData>({
    signalStrength: "Good",
    frequency: "-",
    bandwidth: "-",
    spreadingFactor: "-",
    lastPing: "-",
    sentMessages: 0,
    receivedMessages: 0,
    deliveryRate: 0,
    latency: "-",
  })

  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8765")
    wsRef.current = ws

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.type === "message") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "Remote",
            content: message.data,
            timestamp: new Date(),
            status: "delivered",
            isMe: false,
          },
        ])
      }

      if (message.type === "stats") {
        console.log("Stats received:", message.data)
        setLoraData({
          signalStrength: rssiToLabel(message.data.signalStrength),
          frequency: `${message.data.frequency / 1000000} MHz`,
          bandwidth: `${message.data.bandwidth / 1000} kHz`,
          spreadingFactor: `SF${message.data.spreadingFactor}`,
          lastPing: `${Math.round((Date.now() - message.data.lastPing) / 1000)}s ago`,
          sentMessages: message.data.messagesSent,
          receivedMessages: message.data.messagesReceived,
          deliveryRate: message.data.deliveryRate,
          latency: `${message.data.avgLatency.toFixed(1)} ms`,
        })
      }
    }

    return () => ws.close()
  }, [])

  const rssiToLabel = (rssi: number): "Excellent" | "Good" | "Fair" | "Poor" => {
    if (rssi > -70) return "Excellent"
    if (rssi > -85) return "Good"
    if (rssi > -100) return "Fair"
    return "Poor"
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "You",
      content: inputValue,
      timestamp: new Date(),
      status: "sending",
      isMe: true,
    }

    setMessages([...messages, newMessage])
    setInputValue("")

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "send", data: inputValue }))
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${message.isMe ? "order-2" : "order-1"}`}>
                  {!message.isMe && (
                    <div className="flex items-center space-x-2 mb-1">
                      <Avatar className="h-6 w-6 bg-sky-200">
                        <div className="text-xs font-semibold text-sky-700">{message.sender.charAt(0)}</div>
                      </Avatar>
                      <span className="text-sm font-medium text-sky-700">{message.sender}</span>
                    </div>
                  )}

                  <div
                    className={`rounded-lg p-3 ${
                      message.isMe ? "bg-sky-500 text-white" : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-end mt-1 space-x-1">
                      <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-slate-200">
          <Tabs defaultValue="message">
            <TabsList className="mb-3 bg-slate-100">
              <TabsTrigger value="message">Message</TabsTrigger>
              <TabsTrigger value="commands">Commands</TabsTrigger>
            </TabsList>

            <TabsContent value="message" className="mt-0">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="bg-slate-100 border-slate-200 text-slate-800 placeholder:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage()
                      }
                    }}
                  />
                </div>
                <Button onClick={handleSendMessage} className="bg-sky-500 hover:bg-sky-600">
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-slate-100 border-slate-200 md:hidden"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <PanelRightOpen className="h-4 w-4 text-sky-600" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="commands" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" className="bg-slate-100 border-slate-200 justify-start">
                  <span className="text-sky-600 mr-2">/status</span> Report Status
                </Button>
                <Button variant="outline" className="bg-slate-100 border-slate-200 justify-start">
                  <span className="text-sky-600 mr-2">/sos</span> Emergency Signal
                </Button>
                <Button variant="outline" className="bg-slate-100 border-slate-200 justify-start">
                  <span className="text-sky-600 mr-2">/ping</span> Test Connection
                </Button>
                <Button variant="outline" className="bg-slate-100 border-slate-200 justify-start">
                  <span className="text-sky-600 mr-2">/battery</span> Report Battery
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div
        className={`${
          showDetails ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-80 bg-white/80 backdrop-blur-sm border-l border-slate-200`}
      >
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-sky-600">Connection Details</h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <Card className="bg-slate-50 border-slate-200">
              <div className="p-4">
                <h3 className="text-sm font-medium text-sky-600 mb-2">Signal Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Signal Strength</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                      {loraData.signalStrength}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Frequency</span>
                    <span className="text-sm text-slate-600">{loraData.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Bandwidth</span>
                    <span className="text-sm text-slate-600">{loraData.bandwidth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Spreading Factor</span>
                    <span className="text-sm text-slate-600">{loraData.spreadingFactor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Last Ping</span>
                    <span className="text-sm text-slate-600">{loraData.lastPing}</span>
                  </div>
                </div>
              </div>
            </Card>

            <div>
              <h3 className="text-sm font-medium text-sky-600 mb-2">Message Statistics</h3>
              <div className="grid grid-cols-2 gap-2">
                <Card className="bg-slate-50 border-slate-200 p-3">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-sky-600">{loraData.sentMessages}</span>
                    <p className="text-xs text-slate-600 mt-1">Sent</p>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-3">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-sky-600">{loraData.receivedMessages}</span>
                    <p className="text-xs text-slate-600 mt-1">Received</p>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-3">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-sky-600">{loraData.deliveryRate}%</span>
                    <p className="text-xs text-slate-600 mt-1">Delivery Rate</p>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-200 p-3">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-sky-600">{loraData.latency}</span>
                    <p className="text-xs text-slate-600 mt-1">Avg. Latency</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}