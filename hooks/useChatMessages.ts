import { useState, useEffect } from 'react';
import { subscribeToMessages } from '../services/firebaseAPI';
import type { ChatMessage } from '../types';

/**
 * React hook for real-time chat messages
 *
 * @example
 * function ChatComponent({ chatId }: { chatId: string }) {
 *   const { messages, loading, error } = useChatMessages(chatId);
 *
 *   if (loading) return <div>Loading messages...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <div key={msg.id}>{msg.text}</div>
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useChatMessages(chatId: string, limit: number = 50) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToMessages(
      chatId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
      },
      limit
    );

    // Handle errors (subscribeToMessages doesn't expose errors directly,
    // but you can wrap it with try-catch if needed)

    // Cleanup subscription on unmount or chatId change
    return () => {
      unsubscribe();
    };
  }, [chatId, limit]);

  return {
    messages,
    loading,
    error,
  };
}
