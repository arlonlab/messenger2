import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("https://specialbond.arlonlabalan.com");

const ChatApp = () => {
  const [chatId, setChatId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(1);

  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  useEffect(() => {
    socket.on("chat_history", (history) => {
      setMessages(history);
    });
  }, []);

  const joinChat = () => {
    if (chatId) {
      socket.emit("join_chat", chatId);
      socket.emit("get_chat_history", chatId);
      console.log("Joined chat:", chatId);
    }
  };

  const sendMessage = () => {
    if (chatId && message.trim()) {
      const newMessage = { senderId: userId, content: message };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      socket.emit("send_message", { chatId, senderId: userId, content: message });
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-center mb-4">Chat Room</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter Chat ID"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
          />
          <button
            onClick={joinChat}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Join
          </button>
        </div>
        <div className="border rounded-lg p-4 h-64 overflow-y-auto bg-gray-50">
          <ul>
            {messages.map((msg, index) => (
              <li
                key={index}
                className={`p-2 mb-2 rounded-lg shadow-sm ${msg.senderId === userId ? "bg-green-200 text-right" : "bg-white text-left"}`}
              >
                <span className="font-semibold">{msg.senderId === userId ? "Me" : `User ${msg.senderId}`}:</span> {msg.content}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            onClick={sendMessage}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
