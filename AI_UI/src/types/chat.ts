// Shared chat message type for both client and server
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}
