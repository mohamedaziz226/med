// src/components/ChatBox.jsx
import React, { useState } from 'react';
import { Send, Paperclip, CheckCheck, Clock, User, Sparkles } from 'lucide-react';

export default function ChatBox({
  title,
  messages = [],
  currentUserId,
  onSendMessage,
  placeholder = 'Rédigez votre message...',
  quickReplies = []
}) {
  const [text, setText] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  const handleQuickReply = (reply) => {
    onSendMessage(reply);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm shadow-xs">
            {title.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm leading-tight">{title}</h4>
            <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              En ligne / Secrétariat médical
            </span>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
        {messages.length > 0 ? (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1 mb-1">
                  <span className="text-[10px] font-semibold text-slate-500">{msg.senderName}</span>
                  <span className="text-[10px] text-slate-400">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div
                  className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-teal-600 text-white rounded-tr-xs font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Clock className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
            <p className="text-xs">Aucun message pour le moment. Commencez la discussion.</p>
          </div>
        )}
      </div>

      {/* Quick Suggestions Chips */}
      {quickReplies.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center space-x-2 overflow-x-auto">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          {quickReplies.map((reply, index) => (
            <button
              key={index}
              onClick={() => handleQuickReply(reply)}
              className="text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 px-3 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2">
        <button
          type="button"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          title="Joindre un document"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
