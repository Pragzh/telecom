import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";
import API from "../api";
import { useLocation } from "react-router-dom";

const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function ChatbotWidget() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;

  // ... rest of your existing code unchanged
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  const [verified, setVerified] = useState(false);
  const [question, setQuestion] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("");
  const [troubleshootText, setTroubleshootText] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const bodyRef = useRef(null);
const customerRef = useRef(null);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);



  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [chatHistory, verified]);

const handleAdminReply = (data) => {
  console.log("admin_reply received:", data);
  console.log("current customer:", customerRef.current);
  if (customerRef.current && data.crmId === customerRef.current.crmId) {
    setChatHistory((prev) => [...prev, data.message]);
  }
};

useEffect(() => {
  socket.on("admin_reply", handleAdminReply);
  return () => socket.off("admin_reply", handleAdminReply);
}, []);

useEffect(() => {
  window.parent.postMessage({ type: "chatbot-resize", open }, "*");
}, [open]);

  const verifyCustomer = async () => {
  if (!phone.trim()) return alert("Please enter mobile number");

  try {
    const res = await API.post("/customer/identify", { phone });
    const customerData = res.data.customer;

    setCustomer(customerData);
    customerRef.current = customerData;
    setVerified(true);

    const historyRes = await API.get(
      `/conversations/customer/${customerData.crmId}`
    );

    const allMessages = [];

    historyRes.data.conversations.forEach((conversation) => {
      allMessages.push(...conversation.messages);
    });

    if (allMessages.length > 0) {
      setChatHistory(allMessages);
    } else {
      setChatHistory([
        {
          from: "bot",
          text: `Welcome, ${customerData.name}! Your CRM ID is ${customerData.crmId}.`,
        },
        {
          from: "bot",
          text: "How can I help you today?",
        },
      ]);
    }
  } catch (err) {
    console.log(err);
    alert("Backend error");
  }
};
  const addUserAndCard = (userText, cardType) => {
    setChatHistory((prev) => [
      ...prev,
      { from: "user", text: userText },
      { from: "bot", type: cardType },
    ]);
  };

  const openNewConnection = () => {
    addUserAndCard("New Connection", "new_connection_card");
  };

  const openExistingConnection = () => {
    addUserAndCard("Existing Connection", "existing_connection_card");
  };

  const openAskQuestion = () => {
    addUserAndCard("Ask Question", "ask_question_card");
  };

  const openExistingOption = (option) => {
    const options = {
      billing: ["Billing", "billing_card"],
      internet: ["Internet Issue", "internet_card"],
      shift_plan: ["Shift Plan", "shift_plan_card"],
      addon: ["Add-On Services", "addon_card"],
      payment: ["Payment Screenshot", "payment_card"],
    };

    const [userText, cardType] = options[option];
    addUserAndCard(userText, cardType);
  };

  const saveConversation = async (category, assignedTo, userText, botText) => {
    try {
      const userMsg = { from: "user", text: userText };
      const botMsg = { from: "bot", text: botText };

      setChatHistory((prev) => [...prev, userMsg, botMsg]);

      const res = await API.post("/conversations", {
        crmId: customer.crmId,
        name: customer.name,
        phone: customer.phone,
        category,
        assignedTo,
        status: "assigned",
        messages: [userMsg, botMsg],
      });

      socket.emit("join_conversation", res.data.conversation.id);
    } catch (err) {
      console.log(err);
      alert("Could not save request");
    }
  };

  const saveNewConnectionLead = () => {
    saveConversation(
      "New Connection",
      "sales",
      "Customer wants a new connection",
      "Lead saved and assigned to Sales Admin."
    );
  };

  const saveBillingRequest = () => {
    saveConversation(
      "Billing",
      "billing",
      "Customer has a billing query",
      "Billing query assigned to Billing Admin."
    );
  };

  const saveShiftPlanRequest = () => {
    saveConversation(
      "Shift Plan",
      "sales",
      "Customer wants to shift/change plan",
      "Plan shift request assigned to Sales Admin."
    );
  };

  const saveAddonRequest = () => {
    saveConversation(
      "Add-On Services",
      "sales",
      "Customer wants add-on service",
      "Add-on request assigned to Sales Admin."
    );
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return alert("Please type your question");

    const userQuestion = question;
    setQuestion("");

    await saveConversation(
      "General Question",
      "support",
      userQuestion,
      "Thanks for your question. I have forwarded it to the support team. They will assist you shortly."
    );
  };

  const startTroubleshooting = (issueType) => {
    setSelectedIssue(issueType);

    let steps = "";

    if (issueType === "No Internet") {
      steps =
        "1. Check router power cable\n2. Check fiber/LAN cable\n3. Restart router\n4. Wait 2 minutes\n5. Check LOS/Internet light";
    }

    if (issueType === "Slow Speed") {
      steps =
        "1. Restart router\n2. Move closer to WiFi\n3. Disconnect extra devices\n4. Stop background downloads\n5. Run speed test again";
    }

    if (issueType === "Router Issue") {
      steps =
        "1. Check router adapter\n2. Restart router\n3. Check if red LOS light is blinking\n4. Reset router only if instructed\n5. Contact support if issue continues";
    }

    setTroubleshootText(steps);

    setChatHistory((prev) => [
      ...prev,
      { from: "user", text: issueType },
      {
        from: "bot",
        type: "troubleshoot_card",
        issueType,
        steps,
      },
    ]);
  };

  const markIssueResolved = (cardIndex) => {
    setChatHistory((prev) =>
      prev
        .filter((_, index) => index !== cardIndex)
        .concat([
          { from: "user", text: "Yes, Resolved" },
          { from: "bot", text: "Glad your issue is resolved!" },
        ])
    );

    setSelectedIssue("");
    setTroubleshootText("");
  };

  const createInternetTicket = async (cardIndex) => {
    try {
      const ticketRes = await API.post("/tickets", {
        crmId: customer.crmId,
        phone: customer.phone,
        category: selectedIssue,
      });

      const messages = [
        { from: "user", text: "No, Create Ticket" },
        {
          from: "bot",
          text: `Ticket created: ${ticketRes.data.ticket.ticketId}. Assigned to Tech Support.`,
        },
      ];

      setChatHistory((prev) =>
        prev.filter((_, index) => index !== cardIndex).concat(messages)
      );

      const res = await API.post("/conversations", {
        crmId: customer.crmId,
        name: customer.name,
        phone: customer.phone,
        category: "Internet Issue",
        assignedTo: "tech",
        status: "assigned",
        messages: [
          { from: "user", text: `Customer selected issue: ${selectedIssue}` },
          {
            from: "bot",
            text: `Troubleshooting steps shown:\n${troubleshootText}`,
          },
          ...messages,
        ],
      });

      socket.emit("join_conversation", res.data.conversation.id);
    } catch (err) {
      console.log(err);
      alert("Could not create ticket");
    }
  };

  const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    setChatHistory((prev) => [
      ...prev,
      { from: "user", text: `📎 Uploaded image: ${file.name}` },
      { from: "bot", text: "Scanning image..." },
    ]);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("crmId", customer.crmId);
    formData.append("phone", customer.phone);

    const res = await API.post("/ai/scan-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    setChatHistory((prev) => {
      const withoutScanning = prev.filter(
        (msg) => msg.text !== "Scanning image..."
      );

      return [
  ...withoutScanning,
  res.data.type === "other"
    ? {
        from: "bot",
        type: "troubleshoot_card",
        issueType: "Technical Issue",
        steps: res.data.reply,
      }
    : { from: "bot", text: res.data.reply },
];
    });
    if (res.data.type === "other") {
  setSelectedIssue("Technical Issue");
  setTroubleshootText(res.data.reply);
}
  } catch (err) {
    console.log(err);
    alert("Image scan failed");
  }

  e.target.value = "";
};

  const renderMessage = (msg, index) => {
    if (msg.type === "new_connection_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>New Connection Plans</h4>
          <p>Basic 30Mbps — ₹499/month</p>
          <p>Standard 100Mbps — ₹799/month</p>
          <p>Premium 300Mbps — ₹1299/month</p>

          <button style={styles.primaryBtn} onClick={saveNewConnectionLead}>
            Save Lead
          </button>
        </BotCard>
      );
    }

    if (msg.type === "existing_connection_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>Existing Connection</h4>

          <button
            style={styles.optionBtn}
            onClick={() => openExistingOption("billing")}
          >
            💳 Billing
          </button>

          <button
            style={styles.optionBtn}
            onClick={() => openExistingOption("internet")}
          >
            🌐 Internet Issue
          </button>

          <button
            style={styles.optionBtn}
            onClick={() => openExistingOption("shift_plan")}
          >
            🔄 Shift Plan
          </button>

          <button
            style={styles.optionBtn}
            onClick={() => openExistingOption("addon")}
          >
            ➕ Add-On Services
          </button>

          <button
            style={styles.optionBtn}
            onClick={() => openExistingOption("payment")}
          >
            📸 Payment Screenshot
          </button>
        </BotCard>
      );
    }

    if (msg.type === "ask_question_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>Ask Question</h4>

          <input
            style={styles.input}
            placeholder="Type your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button style={styles.primaryBtn} onClick={handleAskQuestion}>
            Send
          </button>
        </BotCard>
      );
    }

    if (msg.type === "billing_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>Billing Request</h4>
          <p>Your billing query will be assigned to Billing Admin.</p>

          <button style={styles.primaryBtn} onClick={saveBillingRequest}>
            Assign to Billing Admin
          </button>
        </BotCard>
      );
    }

    if (msg.type === "internet_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>Internet Issue</h4>
          <p>Please select your issue:</p>

          <button
            style={styles.optionBtn}
            onClick={() => startTroubleshooting("No Internet")}
          >
            No Internet
          </button>

          <button
            style={styles.optionBtn}
            onClick={() => startTroubleshooting("Slow Speed")}
          >
            Slow Speed
          </button>

          <button
            style={styles.optionBtn}
            onClick={() => startTroubleshooting("Router Issue")}
          >
            Router Issue
          </button>
        </BotCard>
      );
    }

    if (msg.type === "troubleshoot_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>{msg.issueType}</h4>
          <p style={{ whiteSpace: "pre-line" }}>{msg.steps}</p>
          <p>
            <b>Is your issue resolved?</b>
          </p>

          <button
            style={styles.primaryBtn}
            onClick={() => markIssueResolved(index)}
          >
            Yes, Resolved
          </button>

          <button
            style={styles.dangerBtn}
            onClick={() => createInternetTicket(index)}
          >
            No, Create Ticket
          </button>
        </BotCard>
      );
    }

    if (msg.type === "shift_plan_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>Shift Plan</h4>
          <p>Your plan change request will be assigned to Sales Admin.</p>

          <button style={styles.primaryBtn} onClick={saveShiftPlanRequest}>
            Assign to Sales Admin
          </button>
        </BotCard>
      );
    }

    if (msg.type === "addon_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>Add-On Services</h4>
          <p>OTT Basic ₹149</p>
          <p>OTT Premium ₹299</p>
          <p>OTT + IPTV ₹449</p>

          <button style={styles.primaryBtn} onClick={saveAddonRequest}>
            Assign to Sales Admin
          </button>
        </BotCard>
      );
    }

    if (msg.type === "payment_card") {
      return (
        <BotCard key={index}>
          <h4 style={styles.cardTitle}>Payment Screenshot</h4>
          <p>Upload payment screenshot. AI scanning will be added next.</p>

          <input style={styles.input} type="file" accept="image/*" />

          <button style={styles.primaryBtn}>Upload Screenshot</button>
        </BotCard>
      );
    }

    if (msg.from === "admin") {
      return (
        <div key={index} style={styles.adminGroup}>
          <div style={styles.adminBubble}>
            <b>{msg.adminName || "Admin"}</b>
            <br />
            {msg.text}
            {msg.attachmentUrl && (
  <div style={{ marginTop: "8px" }}>
    {msg.attachmentType?.startsWith("image/") ? (
      <img
        src={`http://localhost:5000${msg.attachmentUrl}`}
        alt={msg.attachmentName || "attachment"}
        style={{
          maxWidth: "180px",
          borderRadius: "10px",
          display: "block",
        }}
      />
    ) : (
      <a
        href={`http://localhost:5000${msg.attachmentUrl}`}
        target="_blank"
        rel="noreferrer"
        style={{ color: "white", fontWeight: "bold" }}
      >
        📎 {msg.attachmentName || "View attachment"}
      </a>
    )}
  </div>
)}
          </div>
          <span style={styles.timeText}>Admin</span>
        </div>
      );
    }

    if (msg.from === "user") {
      return (
        <div key={index} style={styles.userGroup}>
          <div style={styles.userBubble}>{msg.text}</div>
          <span style={styles.timeText}>You</span>
        </div>
      );
    }

    return (
      <div key={index} style={styles.botGroup}>
        <div style={styles.botBubble}>{msg.text}</div>
        <span style={styles.timeText}>Bot</span>
      </div>
    );
  };

  return (
    <>
      {open && (
        <div style={styles.chatBox}>
          <div style={styles.header}>
            <div style={styles.avatarWrap}>
              <div style={styles.avatar}>🤖</div>
              <span style={styles.onlineDot}></span>
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={styles.title}>Chat Support</h3>
              <p style={styles.status}>Active</p>
            </div>

            <button style={styles.closeBtn} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div ref={bodyRef} style={styles.body}>
            {!verified && (
              <BotCard>
                <p>Hello! I'm your AI assistant.</p>
                <p>Please enter your registered mobile number.</p>

                <input
                  style={styles.input}
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <button style={styles.primaryBtn} onClick={verifyCustomer}>
                  Verify Number
                </button>
              </BotCard>
            )}

            {verified && (
              <div style={styles.conversationArea}>
                {chatHistory.map(renderMessage)}
              </div>
            )}
          </div>

          {verified && (
            <div style={styles.bottomArea}>
              <div style={styles.chips}>
                <button style={styles.chipBtn} onClick={openNewConnection}>
                  🆕 New Connection
                </button>

                <button style={styles.chipBtn} onClick={openExistingConnection}>
                  📶 Existing Connection
                </button>

                <button style={styles.chipBtn} onClick={openAskQuestion}>
                  ❓ Ask Question
                </button>
              </div>

              <div style={styles.inputBar}>
                <button
                  style={styles.uploadBtn}
                  onClick={() => cameraRef.current.click()}
                  title="Open camera"
                >
                  📷
                </button>

                <button
                  style={styles.uploadBtn}
                  onClick={() => galleryRef.current.click()}
                  title="Upload from gallery"
                >
                  📎
                </button>

                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />

                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />

                <input
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAskQuestion();
                  }}
                />

                <button style={styles.sendRoundBtn} onClick={handleAskQuestion}>
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button style={styles.widgetBtn} onClick={() => setOpen(!open)}>
        💬
      </button>
    </>
  );
}

function BotCard({ children }) {
  return (
    <div style={styles.botGroup}>
      <div style={styles.card}>{children}</div>
      <span style={styles.timeText}>Bot</span>
    </div>
  );
}

const styles = {
  widgetBtn: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "none",
    background: "#FF6B2B",
    color: "white",
    fontSize: "28px",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    zIndex: 9999,
  },

  chatBox: {
    position: "fixed",
    right: "24px",
    bottom: "100px",
    width: "430px",
    height: "650px",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 120px)",
    background: "#FAFCFF",
    borderRadius: "24px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Be Vietnam Pro', Arial, sans-serif",
    zIndex: 9999,
  },

  header: {
    height: "72px",
    background:  "#FF6B2B" ,
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #FFD4BC",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    flexShrink: 0,
  },

  avatarWrap: {
    position: "relative",
  },

  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#E8F0FB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
  },

  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "11px",
    height: "11px",
    borderRadius: "50%",
    background: "#22c55e",
    border: "2px solid white",
  },

  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "#0b1c30",
  },

  status: {
    margin: "2px 0 0",
    fontSize: "12px",
    color: "#576065",
  },

  closeBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "none",
    background: "#FFE8DC",
    color: "#FF6B2B",
    cursor: "pointer",
    fontSize: "16px",
  },

  body: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    background: "#FAFCFF",
  },

  bottomArea: {
    borderTop: "1px solid #FFD4BC",
    background: "rgba(248,249,255,0.95)",
    backdropFilter: "blur(12px)",
    padding: "10px 12px 14px",
    flexShrink: 0,
  },

  chips: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "10px",
  },

  chipBtn: {
    whiteSpace: "nowrap",
    background: "white",
    border: "1px solid #FF6B2B",
    color: "#FF6B2B",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },

  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  uploadBtn: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "1px solid #c3c6d7",
    background: "white",
    cursor: "pointer",
    fontSize: "18px",
  },

  messageInput: {
    flex: 1,
    height: "42px",
    borderRadius: "999px",
    border: "1px solid #c3c6d7",
    padding: "0 14px",
    fontSize: "14px",
    outline: "none",
  },

  sendRoundBtn: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "none",
    background: "#FF6B2B",
    color: "white",
    cursor: "pointer",
    fontSize: "17px",
  },

  botGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    maxWidth: "85%",
    marginBottom: "14px",
  },

  userGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
    maxWidth: "85%",
    marginLeft: "auto",
    marginBottom: "14px",
  },

  adminGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
    maxWidth: "85%",
    marginBottom: "14px",
  },

  botBubble: {
    background: "#185FA5",
    color: "#dbe2e6",
    padding: "12px 16px",
    borderRadius: "20px 20px 20px 4px",
    fontSize: "14px",
    lineHeight: "20px",
  },

  userBubble: {
    background: "#FF6B2B",
    color: "white",
    padding: "12px 16px",
    borderRadius: "20px 20px 4px 20px",
    fontSize: "14px",
    lineHeight: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },

  adminBubble: {
    background: "#FF6B2B",
    color: "white",
    padding: "12px 16px",
    borderRadius: "20px 20px 20px 4px",
    fontSize: "14px",
    lineHeight: "20px",
  },

  timeText: {
    fontSize: "11px",
    color: "#737686",
    padding: "0 8px",
  },

  conversationArea: {
    display: "flex",
    flexDirection: "column",
  },

  card: {
    background: "white",
    border: "1px solid #c3c6d7",
    borderRadius: "16px",
    padding: "14px",
    width: "100%",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    fontSize: "14px",
    lineHeight: "20px",
    color: "#0b1c30",
  },

  cardTitle: {
    margin: "0 0 10px",
    fontSize: "15px",
    fontWeight: 700,
  },

  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "999px",
    border: "1px solid #c3c6d7",
    marginTop: "8px",
    marginBottom: "12px",
    boxSizing: "border-box",
    fontSize: "14px",
    outline: "none",
  },

  primaryBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "999px",
    border: "none",
    background: "#185FA5",
    color: "white",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    marginTop: "8px",
  },

  dangerBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "999px",
    border: "none",
    background: "#ba1a1a",
    color: "white",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    marginTop: "8px",
  },

  optionBtn: {
    display: "block",
    width: "100%",
    padding: "11px 12px",
    marginTop: "8px",
    borderRadius: "999px",
    border: "1px solid #c3c6d7",
    background: "#185FA5",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
     color: "white",
  },
};