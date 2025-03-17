import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://specialbond.arlonlabalan.com");
const peerConnections = {};

const ChatApp = () => {
  const [chatId, setChatId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setMessages((prevMessages) => {
        if (
          prevMessages.length > 0 &&
          prevMessages[prevMessages.length - 1].content === msg.content
        ) {
          return prevMessages;
        }
        return [
          ...prevMessages,
          { ...msg, sentByMe: sentMessages.includes(msg.messageId) },
        ];
      });
    });

    socket.on("video_chat_started", async ({ from }) => {
      if (from !== socket.id) {
        const peerConnection = createPeerConnection(from);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", { offer, to: from });
      }
    });

    socket.on("offer", async ({ offer, from }) => {
      const peerConnection = createPeerConnection(from);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from });
    });

    socket.on("answer", async ({ answer, from }) => {
      const peerConnection = peerConnections[from];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("ice-candidate", ({ candidate, from }) => {
      const peerConnection = peerConnections[from];
      if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("video_chat_started");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [sentMessages]);

  useEffect(() => {
    socket.on("chat_history", (history) => {
      setMessages(history.map((msg) => ({ ...msg, sentByMe: false })));
    });

    return () => {
      socket.off("chat_history");
    };
  }, []);

  const joinChat = () => {
    if (chatId.trim()) {
      socket.emit("join_chat", chatId);
      socket.emit("get_chat_history", chatId);
      console.log("Joined chat:", chatId);
    }
  };

  const sendMessage = () => {
    if (chatId && message.trim()) {
      const messageId = Date.now().toString();
      const newMessage = {
        chatId,
        content: message,
        messageId,
        sentByMe: true,
      };

      socket.emit("send_message", newMessage);

      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].content === message) {
          return prev;
        }
        return [...prev, newMessage];
      });
      setSentMessages((prev) => [...prev, messageId]);
      setMessage("");
    }
  };

  const startVideoChat = async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
      videoRef.current.srcObject = userStream;
      socket.emit("start_video_chat", { chatId });
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  const createPeerConnection = (peerId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnections[peerId] = peerConnection;

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, to: peerId });
      }
    };
    peerConnection.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };
    return peerConnection;
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
          <ul className="space-y-2">
            {messages.map((msg, index) => (
              <li key={index} className={`flex ${msg.sentByMe ? "justify-end" : "justify-start"}`}>
                <div className={`p-2 mb-1 rounded-lg shadow-sm max-w-xs ${msg.sentByMe ? "bg-green-200 text-right" : "bg-white text-left"}`}>
                  {msg.content}
                </div>
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
        <div className="mt-4">
          <button onClick={startVideoChat} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
            Start Video Chat
          </button>
        </div>
        {stream && <video ref={videoRef} autoPlay className="w-full rounded-lg shadow-lg" />}
        <video ref={remoteVideoRef} autoPlay className="w-full rounded-lg shadow-lg mt-4" />
      </div>
    </div>
  );
};

export default ChatApp;
