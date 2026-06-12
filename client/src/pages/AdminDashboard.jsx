import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import EmojiPicker from "emoji-picker-react";

const socket = io(import.meta.env.VITE_SOCKET_URL);
const API_BASE_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const roleNames = {
  super: "Super Admin",
  billing: "Billing Admin",
  tech: "Tech Support",
  sales: "Sales Admin",
  support: "General Support",
};


const responsiveStyles = `
  * {
    box-sizing: border-box;
  }

  .admin-app {
    display: block !important;
    width: 100vw !important;
    overflow-x: hidden !important;
  }

  .admin-mobile-menu-btn,
  .admin-sidebar-close {
    display: flex !important;
  }

  .admin-sidebar {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    height: 100vh !important;
    width: 280px !important;
    max-width: 82vw !important;
    transform: translateX(-105%) !important;
    transition: transform 0.25s ease !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25) !important;
  }

  .admin-sidebar-open {
    transform: translateX(0) !important;
  }

  .admin-main {
    width: 100% !important;
  }

  @media (max-width: 900px) {
    .admin-app {
      display: block !important;
    }

    .admin-sidebar {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      height: 100vh !important;
      width: 280px !important;
      max-width: 82vw !important;
      transform: translateX(-105%) !important;
      transition: transform 0.25s ease !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25) !important;
    }

    .admin-sidebar-open {
      transform: translateX(0) !important;
    }

    .admin-sidebar-close,
    .admin-mobile-menu-btn {
      display: flex !important;
    }

    .admin-main {
      width: 100% !important;
      padding: 14px !important;
    }

    .admin-header {
      padding: 14px !important;
      gap: 12px !important;
      align-items: center !important;
      border-radius: 14px !important;
    }

    .admin-header h2 {
      font-size: 18px !important;
      line-height: 1.25 !important;
    }

    .admin-header p {
      font-size: 12px !important;
      word-break: break-word !important;
    }

    .admin-refresh-btn {
      padding: 9px 12px !important;
      white-space: nowrap !important;
    }

    .admin-stats-grid {
      grid-template-columns: 1fr 1fr !important;
      gap: 12px !important;
    }

    .admin-chat-layout {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
    }

    .admin-chat-list-panel {
      height: auto !important;
      max-height: 360px !important;
    }

    .admin-chat-window-panel {
      height: 72vh !important;
      min-height: 520px !important;
    }

    .admin-chat-header {
      align-items: flex-start !important;
      gap: 12px !important;
      flex-direction: column !important;
    }

    .admin-chat-header-actions {
      width: 100% !important;
      justify-content: space-between !important;
      flex-wrap: wrap !important;
    }

    .admin-message-bubble {
      max-width: 88% !important;
    }

    .admin-reply-box {
  flex-wrap: nowrap !important;
  align-items: center !important;
}

.admin-reply-input {
  flex: 1 !important;
  height: 58px !important;
  min-height: 58px !important;
}

.admin-send-btn {
  width: 150px !important;
  height: 58px !important;
  flex-shrink: 0 !important;
}

    .admin-table {
      min-width: 760px !important;
    }

    .admin-filter-drawer {
      width: calc(100vw - 20px) !important;
      height: calc(100vh - 28px) !important;
      max-width: calc(100vw - 20px) !important;
    }

    .admin-filter-body {
      grid-template-columns: 140px 1fr !important;
    }
  }

  @media (max-width: 560px) {
    .admin-stats-grid {
      grid-template-columns: 1fr !important;
    }

    .admin-header {
      display: grid !important;
      grid-template-columns: 42px 1fr auto !important;
    }

    .admin-chat-window-panel {
      height: 70vh !important;
      min-height: 500px !important;
      padding: 12px !important;
    }

    .admin-filter-body {
      grid-template-columns: 1fr !important;
    }

    .admin-filter-sidebar {
      display: flex !important;
      overflow-x: auto !important;
      border-right: none !important;
      border-bottom: 1px solid #dfe4ec !important;
      padding: 8px !important;
    }

    .admin-filter-sidebar button {
      min-width: max-content !important;
      border-bottom: none !important;
      padding: 12px 10px !important;
    }

    .admin-filter-footer {
      padding: 10px 14px !important;
      gap: 10px !important;
    }
  }
`;

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [remarks, setRemarks] = useState("");
const [replyFile, setReplyFile] = useState(null);
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [searchTerm, setSearchTerm] = useState("");

const [showFilters, setShowFilters] = useState(false);
const [activeFilterSection, setActiveFilterSection] = useState("labels");
const [labelSearch, setLabelSearch] = useState("");

const [labelFilter, setLabelFilter] = useState([]);
const [tagFilter, setTagFilter] = useState([]);
const [chatStatusFilter, setChatStatusFilter] = useState([]);
const [assigneeFilter, setAssigneeFilter] = useState([]);
const [replyStatusFilter, setReplyStatusFilter] = useState([]);
const [readFilter, setReadFilter] = useState([]);
const [responseWindowFilter, setResponseWindowFilter] = useState([]);
const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const convRes = await API.get("/conversations");
      const ticketRes = await API.get("/tickets");
      const paymentRes = await API.get("/payments");

      const latestConversations = convRes.data.conversations || [];

      setConversations(latestConversations);
      setTickets(ticketRes.data.tickets || []);
      setPayments(paymentRes.data.payments || []);

      setSelectedConversation((current) => {
        if (!current) return current;

        const currentId = current._id || current.id;

        const updated = latestConversations.find(
          (c) => (c._id || c.id) === currentId
        );

        return updated || current;
      });
    } catch (err) {
      console.log("Dashboard fetch error:", err);
    }
  };

  useEffect(() => {
    const savedAdmin = JSON.parse(localStorage.getItem("admin"));

    if (!savedAdmin) {
      navigate("/admin-login");
      return;
    }

    setAdmin(savedAdmin);
    fetchData();

    const handleUpdate = () => {
      fetchData();
    };

    socket.on("new_conversation", handleUpdate);
    socket.on("new_message", handleUpdate);
    socket.on("admin_reply", handleUpdate);
    socket.on("new_payment", handleUpdate);
    socket.on("payment_updated", handleUpdate);
    socket.on("ticket_updated", handleUpdate);
    socket.on("new_ticket", handleUpdate);
    socket.on("conversation_updated", handleUpdate);

    return () => {
      socket.off("new_conversation", handleUpdate);
      socket.off("new_message", handleUpdate);
      socket.off("admin_reply", handleUpdate);
       socket.off("new_payment", handleUpdate);
       socket.off("payment_updated", handleUpdate);
       socket.off("ticket_updated", handleUpdate);
       socket.off("new_ticket", handleUpdate);
       socket.off("conversation_updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const logout = () => {
    localStorage.removeItem("admin");
    navigate("/admin-login");
  };

const sendReply = async () => {
  if (!replyText.trim() && !replyFile) {
    return alert("Please type a reply or attach a file");
  }

  if (!selectedConversation) {
    return alert("Please select a conversation");
  }

  const conversationId = selectedConversation._id || selectedConversation.id;

  try {
    const formData = new FormData();
    formData.append("text", replyText);
    formData.append("adminName", admin.name);

    if (replyFile) {
      formData.append("attachment", replyFile);
    }

    const res = await API.post(
      `/conversations/${conversationId}/reply`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setSelectedConversation(res.data.conversation);
    setReplyText("");
    setReplyFile(null);
    fetchData();
  } catch (err) {
    console.log(err.response?.data || err);
    alert("Could not send reply");
  }
};

const closeConversation = async () => {
  if (!selectedConversation) return;

  const conversationId = selectedConversation._id || selectedConversation.id;

  try {
    const res = await API.put(`/conversations/${conversationId}/status`, {
      status: "closed",
    });

    if (res.data?.conversation) {
      setSelectedConversation(res.data.conversation);
    }

    fetchData();
  } catch (err) {
    console.log(err.response?.data || err);
    alert("Could not close chat");
  }
};

  if (!admin) return null;

  const getLastMessage = (conversation) => {
    const messages = conversation.messages || [];
    return messages[messages.length - 1];
  };

  const getConversationLabel = (conversation) => {
    if (conversation.status === "closed" || conversation.status === "Closed") {
      return "CLOSED";
    }

    if (conversation.category === "New Connection") {
      return "New lead";
    }

    if (!conversation.category) {
      return "No Label Attached";
    }

    return conversation.category;
  };

  const getReplyStatus = (conversation) => {
    const lastMessage = getLastMessage(conversation);
    return lastMessage?.from === "admin" ? "Replied" : "Not Replied";
  };

  const getReadStatus = (conversation) => {
    return conversation.isRead ? "Read" : "Unread";
  };

  const getResponseWindowStatus = (conversation) => {
    const lastMessage = getLastMessage(conversation);
    if (!lastMessage?.createdAt) return "Unknown";

    const diffHours =
      (Date.now() - new Date(lastMessage.createdAt).getTime()) /
      (1000 * 60 * 60);

    return diffHours <= 24 ? "Within 24 Hours" : "Expired";
  };

  const toggleFilterValue = (value, selectedValues, setter) => {
    setter(
      selectedValues.includes(value)
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value]
    );
  };

  const resetAllFilters = () => {
    setLabelFilter([]);
    setTagFilter([]);
    setChatStatusFilter([]);
    setAssigneeFilter([]);
    setReplyStatusFilter([]);
    setReadFilter([]);
    setResponseWindowFilter([]);
    setLabelSearch("");
  };

  const roleFilteredConversations =
    admin.role === "super"
      ? conversations
      : conversations.filter((c) => c.assignedTo === admin.role);

  const visibleConversations = roleFilteredConversations.filter((c) => {
    const searchValue = searchTerm.trim().toLowerCase();

    const searchMatch =
      !searchValue ||
      String(c.name || "").toLowerCase().includes(searchValue) ||
      String(c.phone || "").toLowerCase().includes(searchValue) ||
      String(c.crmId || "").toLowerCase().includes(searchValue) ||
      String(c.category || "").toLowerCase().includes(searchValue) ||
      String(c.assignedTo || "").toLowerCase().includes(searchValue) ||
      String(c.status || "").toLowerCase().includes(searchValue);

    if (!searchMatch) return false;

    const labelMatch =
      labelFilter.length === 0 || labelFilter.includes(getConversationLabel(c));

    const tagMatch =
      tagFilter.length === 0 || tagFilter.includes(c.category);

    const statusMatch =
      chatStatusFilter.length === 0 ||
      chatStatusFilter.includes(String(c.status || "").toLowerCase());

    const assigneeMatch =
      assigneeFilter.length === 0 ||
      assigneeFilter.includes(String(c.assignedTo || "").toLowerCase());

    const replyMatch =
      replyStatusFilter.length === 0 ||
      replyStatusFilter.includes(getReplyStatus(c));

    const readMatch =
      readFilter.length === 0 || readFilter.includes(getReadStatus(c));

    const responseWindowMatch =
      responseWindowFilter.length === 0 ||
      responseWindowFilter.includes(getResponseWindowStatus(c));

    return (
      labelMatch &&
      tagMatch &&
      statusMatch &&
      assigneeMatch &&
      replyMatch &&
      readMatch &&
      responseWindowMatch
    );
  });

  const visiblePayments =
    admin.role === "super" || admin.role === "billing" ? payments : [];

  const visibleTickets =
    admin.role === "super" || admin.role === "tech" ? tickets : [];

  const menuItems = [
    { key: "dashboard", label: "Dashboard", show: true },
    { key: "chats", label: "Conversations", show: true },
    {
      key: "tickets",
      label: "Tickets",
      show: admin.role === "super" || admin.role === "tech",
    },
    {
      key: "payments",
      label: "Payments",
      show: admin.role === "super" || admin.role === "billing",
    },
  ];

  const updatePayment = async (id, status) => {
  try {
    await API.put(`/payments/${id}/status`, {
      status,
      remarks,
    });

    fetchData();
  } catch (error) {
    console.log(error);
  }
};

const updateTicket = async (id, status) => {
  try {
    await API.put(`/tickets/${id}/status`, {
      status,
    });

    fetchData();
  } catch (error) {
    console.log(error);
    alert("Ticket update failed");
  }
};

  return (
    <div style={styles.app} className="admin-app">
      <style>{responsiveStyles}</style>

      {sidebarOpen && (
        <div
          style={styles.mobileOverlay}
          className="admin-mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          ...(sidebarOpen ? styles.sidebarOpen : {}),
        }}
        className={`admin-sidebar ${sidebarOpen ? "admin-sidebar-open" : ""}`}
      >
        <div style={styles.sidebarTop}>
          <div>
            <h2 style={styles.logo}>LogonBroadband</h2>
            <p style={styles.role}>{roleNames[admin.role]}</p>
          </div>

          <button
            type="button"
            style={styles.sidebarCloseBtn}
            className="admin-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div style={styles.menu}>
          {menuItems
            .filter((item) => item.show)
            .map((item) => (
              <button
                key={item.key}
                style={{
                  ...styles.menuBtn,
                  background:
                    activeTab === item.key ? "#185FA5" : "transparent",
                  color: activeTab === item.key ? "white" : "#333",
                }}
                onClick={() => {
                  setActiveTab(item.key);
                  setSelectedConversation(null);
                  setSidebarOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
        </div>

        <button style={styles.logoutBtn} onClick={logout}>
          Logout
        </button>
      </aside>

      <main style={styles.main} className="admin-main">
        <header style={styles.header} className="admin-header">
          <button
            type="button"
            style={styles.mobileMenuBtn}
            className="admin-mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div>
            <h2 style={{ margin: 0 }}>{roleNames[admin.role]} Dashboard</h2>
            <p style={{ margin: "4px 0 0", color: "#777" }}>{admin.email}</p>
          </div>

          <button style={styles.refreshBtn} className="admin-refresh-btn" onClick={fetchData}>
            Refresh
          </button>
        </header>

        {activeTab === "dashboard" && (
          <>
            <div style={styles.statsGrid} className="admin-stats-grid">
              <StatCard
                title="Assigned Chats"
                value={visibleConversations.length}
              />
              <StatCard title="Open Tickets" value={visibleTickets.length} />
              <StatCard
                title="Pending Payments"
                value={visiblePayments.length}
              />
              <StatCard title="Role" value={roleNames[admin.role]} small />
            </div>

            <Section title="Recent Conversations">
              <ConversationTable
                conversations={visibleConversations}
                onView={(c) => {
                  setSelectedConversation(c);
                  setActiveTab("chats");
                }}
              />
            </Section>
          </>
        )}

        {activeTab === "chats" && (
          <div style={styles.chatLayout} className="admin-chat-layout">
            <div style={styles.chatListPanel} className="admin-chat-list-panel">
              <div style={styles.chatListHeader}>
                <h3 style={{ margin: 0 }}>Conversations</h3>

                <button
                  style={styles.filterBtn}
                  onClick={() => setShowFilters(true)}
                >
                  Filters
                </button>
              </div>

              <input
                type="text"
                placeholder="Search name, phone, CRM, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />

              {visibleConversations.length === 0 && (
                <p style={styles.empty}>No conversations found.</p>
              )}

              {visibleConversations.map((c) => (
                <div
                  key={c.id || c._id}
                  style={{
                    ...styles.chatItem,
                    border:
                      (selectedConversation?._id || selectedConversation?.id) ===
                      (c._id || c.id)
                        ? "2px solid #185FA5"
                        : "1px solid #e5e7eb",
                  }}
                  onClick={() => setSelectedConversation(c)}
                >
                  <p style={styles.chatTitle}>{c.crmId}</p>
                  <p style={styles.chatSub}>
                    {c.name} · {c.phone}
                  </p>
                  <p style={styles.chatSub}>{c.category}</p>
                  <span style={styles.badge}>{c.status}</span>
                </div>
              ))}
            </div>

            <div style={styles.chatWindowPanel} className="admin-chat-window-panel">
              {!selectedConversation ? (
                <p style={styles.empty}>
                  Select a conversation to view full chat.
                </p>
              ) : (
                <>
                  <div style={styles.chatHeader} className="admin-chat-header">
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {selectedConversation.name}
                      </h3>
                      <p style={{ margin: "4px 0 0", color: "#777" }}>
                        {selectedConversation.crmId} ·{" "}
                        {selectedConversation.phone}
                      </p>
                    </div>
                    <div style={styles.chatHeaderActions} className="admin-chat-header-actions">
                      <span style={styles.badge}>
                        {selectedConversation.category}
                      </span>

                      {selectedConversation.status !== "closed" &&
                        selectedConversation.status !== "Closed" && (
                          <button
                            style={styles.closeChatBtn}
                            onClick={closeConversation}
                          >
                            Close Chat
                          </button>
                        )}
                    </div>
                  </div>

                  <div style={styles.messagesBox}>
                    {selectedConversation.messages?.map((m, index) => (
                      <div
                        key={index}
                        className="admin-message-bubble"
                        style={{
                          ...styles.messageBubble,
                          alignSelf:
                            m.from === "admin" ? "flex-end" : "flex-start",
                          background:
                            m.from === "admin"
                              ? "#185FA5"
                              : m.from === "user"
                              ? "#E1F5EE"
                              : "#f5f7fb",
                          color: m.from === "admin" ? "white" : "#111",
                        }}
                      >
                        <p style={styles.messageFrom}>
                          {m.from === "admin"
                            ? m.adminName || "Admin"
                            : m.from === "user"
                            ? "Customer"
                            : "Bot"}
                        </p>
                        <p style={{ margin: 0, whiteSpace: "pre-line" }}>
                          {m.text}
                        </p>
                        {m.attachmentUrl && (
  <div style={{ marginTop: "8px" }}>
    {m.attachmentType?.startsWith("image/") ? (
      <a
  href={`${API_BASE_URL}${m.attachmentUrl}`}
  target="_blank"
  rel="noreferrer"
>
  <img
    src={`${API_BASE_URL}${m.attachmentUrl}`}
    alt={m.attachmentName || "attachment"}
    style={{
      maxWidth: "220px",
      borderRadius: "10px",
      display: "block",
      cursor: "pointer",
    }}
  />
</a>
    ) : (
      <a
        href={`${API_BASE_URL}${m.attachmentUrl}`}
        target="_blank"
        rel="noreferrer"
      >
        📎 {m.attachmentName || "View attachment"}
      </a>
    )}
  </div>
)}
                      </div>
                    ))}
                  </div>

                <div style={styles.replyBox} className="admin-reply-box">
  <textarea
    style={styles.replyInput}
    className="admin-reply-input"
    placeholder={`Reply as ${admin.name}`}
    value={replyText}
    onChange={(e) => setReplyText(e.target.value)}
  />

  <label style={styles.replyPinBtn}>
  📎

  <input
    type="file"
    style={{ display: "none" }}
    onChange={(e) => setReplyFile(e.target.files[0])}
  />
</label>

  {replyFile && (
    <div style={styles.selectedFile}>
      <span style={styles.selectedFileName}>📄 {replyFile.name}</span>
      <button
        type="button"
        style={styles.removeFileBtn}
        onClick={() => setReplyFile(null)}
      >
        ✕
      </button>
    </div>
  )}

  <div style={{ position: "relative" }}>
    <button
      type="button"
      style={styles.emojiBtn}
      onClick={() => setShowEmojiPicker((prev) => !prev)}
    >
      😊
    </button>

    {showEmojiPicker && (
      <div style={styles.emojiPickerBox}>
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            setReplyText((prev) => prev + emojiData.emoji);
            setShowEmojiPicker(false);
          }}
        />
      </div>
    )}
  </div>

  <button style={styles.sendBtn} className="admin-send-btn" onClick={sendReply}>
    Send Reply
  </button>
</div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "tickets" && (
          <Section title="Tickets">
            <TicketTable
  tickets={visibleTickets}
  onUpdateTicket={updateTicket}
/>
          </Section>
        )}

        {activeTab === "payments" && (
          <Section title="Payment Verification">
           <PaymentTable
  payments={visiblePayments}
  onUpdatePayment={updatePayment}
/>
          </Section>
        )}

        {showFilters && (
          <FilterModal
            activeFilterSection={activeFilterSection}
            setActiveFilterSection={setActiveFilterSection}
            labelSearch={labelSearch}
            setLabelSearch={setLabelSearch}
            labelFilter={labelFilter}
            tagFilter={tagFilter}
            chatStatusFilter={chatStatusFilter}
            assigneeFilter={assigneeFilter}
            replyStatusFilter={replyStatusFilter}
            readFilter={readFilter}
            responseWindowFilter={responseWindowFilter}
            setLabelFilter={setLabelFilter}
            setTagFilter={setTagFilter}
            setChatStatusFilter={setChatStatusFilter}
            setAssigneeFilter={setAssigneeFilter}
            setReplyStatusFilter={setReplyStatusFilter}
            setReadFilter={setReadFilter}
            setResponseWindowFilter={setResponseWindowFilter}
            toggleFilterValue={toggleFilterValue}
            resetAllFilters={resetAllFilters}
            onClose={() => setShowFilters(false)}
            onApply={() => setShowFilters(false)}
          />
        )}
      </main>
    </div>
  );
}


function FilterModal({
  activeFilterSection,
  setActiveFilterSection,
  labelSearch,
  setLabelSearch,
  labelFilter,
  tagFilter,
  chatStatusFilter,
  assigneeFilter,
  replyStatusFilter,
  readFilter,
  responseWindowFilter,
  setLabelFilter,
  setTagFilter,
  setChatStatusFilter,
  setAssigneeFilter,
  setReplyStatusFilter,
  setReadFilter,
  setResponseWindowFilter,
  toggleFilterValue,
  resetAllFilters,
  onClose,
  onApply,
}) {
  const filterSections = [
    { key: "labels", label: "Labels" },
    { key: "tags", label: "Tags" },
    { key: "chatStatus", label: "Chat Status" },
    { key: "assignee", label: "Assignee" },
    { key: "replyStatus", label: "Reply Status" },
    { key: "readStatus", label: "Read/Unread" },
    { key: "responseWindow", label: "Response Window" },
  ];

  const filterOptions = {
    labels: [
      "No Label Attached",
      "CLOSED",
      "New lead",
      "Billing",
      "Internet Issue",
      "Image Support",
      "Shift Plan",
      "Add-On Services",
      "General Question",
    ],
    tags: [
      "Billing",
      "Internet Issue",
      "Image Support",
      "Shift Plan",
      "Add-On Services",
      "General Question",
      "New Connection",
    ],
    chatStatus: ["assigned", "open", "closed", "pending"],
    assignee: ["sales", "billing", "tech", "support"],
    replyStatus: ["Replied", "Not Replied"],
    readStatus: ["Read", "Unread"],
    responseWindow: ["Within 24 Hours", "Expired", "Unknown"],
  };

  const selectedMap = {
    labels: labelFilter,
    tags: tagFilter,
    chatStatus: chatStatusFilter,
    assignee: assigneeFilter,
    replyStatus: replyStatusFilter,
    readStatus: readFilter,
    responseWindow: responseWindowFilter,
  };

  const setterMap = {
    labels: setLabelFilter,
    tags: setTagFilter,
    chatStatus: setChatStatusFilter,
    assignee: setAssigneeFilter,
    replyStatus: setReplyStatusFilter,
    readStatus: setReadFilter,
    responseWindow: setResponseWindowFilter,
  };

  const sectionTitle =
    filterSections.find((section) => section.key === activeFilterSection)
      ?.label || "Filters";

  const currentOptions =
    activeFilterSection === "labels"
      ? filterOptions.labels.filter((item) =>
          item.toLowerCase().includes(labelSearch.toLowerCase())
        )
      : filterOptions[activeFilterSection];

  return (
    <div style={styles.filterOverlay}>
      <div style={styles.filterDrawer} className="admin-filter-drawer">
        <div style={styles.filterTopBar}>
          <h2 style={styles.filterTitle}>Filters</h2>

          <button style={styles.filterCloseBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.filterBody} className="admin-filter-body">
          <div style={styles.filterSidebar} className="admin-filter-sidebar">
            {filterSections.map((section) => (
              <button
                key={section.key}
                style={{
                  ...styles.filterSidebarBtn,
                  background:
                    activeFilterSection === section.key
                      ? "#eef8f4"
                      : "transparent",
                  fontWeight:
                    activeFilterSection === section.key ? "700" : "600",
                }}
                onClick={() => setActiveFilterSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div style={styles.filterContent}>
            <div style={styles.filterContentHeader}>
              <h3 style={{ margin: 0 }}>{sectionTitle}</h3>

              <button
                style={styles.clearFilterBtn}
                onClick={() => setterMap[activeFilterSection]([])}
              >
                Clear
              </button>
            </div>

            {activeFilterSection === "labels" && (
              <div style={styles.filterSearchBox}>
                <span style={{ fontSize: "22px", color: "#8090b0" }}>⌕</span>
                <input
                  style={styles.filterSearchInput}
                  placeholder="Search Labels"
                  value={labelSearch}
                  onChange={(e) => setLabelSearch(e.target.value)}
                />
              </div>
            )}

            <div style={styles.checkboxList}>
              {currentOptions.map((option) => (
                <label key={option} style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={selectedMap[activeFilterSection].includes(option)}
                    onChange={() =>
                      toggleFilterValue(
                        option,
                        selectedMap[activeFilterSection],
                        setterMap[activeFilterSection]
                      )
                    }
                    style={styles.checkboxInput}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.filterFooter} className="admin-filter-footer">
          <button style={styles.resetAllBtn} onClick={resetAllFilters}>
            Reset All
          </button>

          <button style={styles.applyFilterBtn} onClick={onApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, small }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statTitle}>{title}</p>
      <h2 style={{ ...styles.statValue, fontSize: small ? "20px" : "34px" }}>
        {value}
      </h2>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function ConversationTable({ conversations, onView }) {
  if (conversations.length === 0) {
    return <p style={styles.empty}>No conversations found.</p>;
  }

  return (
    <table style={styles.table} className="admin-table">
      <thead>
        <tr>
          <th style={styles.th}>CRM ID</th>
          <th style={styles.th}>Name</th>
          <th style={styles.th}>Phone</th>
          <th style={styles.th}>Category</th>
          <th style={styles.th}>Assigned</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Action</th>
        </tr>
      </thead>
      <tbody>
        {conversations.map((c) => (
          <tr key={c.id || c._id}>
            <td style={styles.td}>{c.crmId}</td>
            <td style={styles.td}>{c.name}</td>
            <td style={styles.td}>{c.phone}</td>
            <td style={styles.td}>{c.category}</td>
            <td style={styles.td}>{c.assignedTo}</td>
            <td style={styles.td}>
              <span style={styles.badge}>{c.status}</span>
            </td>
            <td style={styles.td}>
              <button style={styles.viewBtn} onClick={() => onView(c)}>
                View Chat
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TicketTable({ tickets, onUpdateTicket }) {
  if (tickets.length === 0) {
    return <p style={styles.empty}>No tickets found.</p>;
  }

  return (
    <table style={styles.table} className="admin-table">
      <thead>
        <tr>
          <th style={styles.th}>Ticket ID</th>
          <th style={styles.th}>CRM ID</th>
          <th style={styles.th}>Phone</th>
          <th style={styles.th}>Issue</th>
          <th style={styles.th}>Priority</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Action</th>
        </tr>
      </thead>

      <tbody>
        {tickets.map((t) => (
          <tr key={t.ticketId || t._id}>
            <td style={styles.td}>{t.ticketId}</td>
            <td style={styles.td}>{t.crmId}</td>
            <td style={styles.td}>{t.phone}</td>
            <td style={styles.td}>{t.category}</td>
            <td style={styles.td}>{t.priority}</td>

            <td style={styles.td}>
              <span style={styles.badge}>{t.status}</span>
            </td>

            <td style={styles.td}>
              {t.status === "Open" ? (
                <button
                  style={styles.verifyBtn}
                  onClick={() => onUpdateTicket(t._id, "Closed")}
                >
                  Mark Resolved
                </button>
              ) : (
                <span style={styles.finalStatusText}>Resolved</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


function PaymentTable({ payments, onUpdatePayment }) {
  if (payments.length === 0) {
    return <p style={styles.empty}>No payment requests found.</p>;
  }

  return (
    <table style={styles.table} className="admin-table">
      <thead>
        <tr>
          <th style={styles.th}>Payment ID</th>
          <th style={styles.th}>CRM ID</th>
          <th style={styles.th}>Phone</th>
          <th style={styles.th}>UTR</th>
          <th style={styles.th}>Amount</th>
          <th style={styles.th}>Image</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Action</th>
        </tr>
      </thead>

      <tbody>
        {payments.map((p) => (
          <tr key={p.paymentId || p._id}>
            <td style={styles.td}>{p.paymentId}</td>
            <td style={styles.td}>{p.crmId}</td>
            <td style={styles.td}>{p.phone}</td>
            <td style={styles.td}>{p.utr}</td>
            <td style={styles.td}>{p.amount}</td>

            <td style={styles.td}>
              {p.imageUrl ? (
                <a
                  href={`${API_BASE_URL}${p.imageUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.imageLink}
                >
                  View Image
                </a>
              ) : (
                "No image"
              )}
            </td>

            <td style={styles.td}>
              <span style={styles.badge}>{p.status}</span>
            </td>

          <td style={styles.td}>
  {p.status === "pending" ? (
    <div style={styles.paymentActionBox}>
      <button
        style={styles.verifyBtn}
        onClick={() => onUpdatePayment(p._id, "verified")}
      >
        Verify
      </button>

      <button
        style={styles.rejectBtn}
        onClick={() => onUpdatePayment(p._id, "rejected")}
      >
        Reject
      </button>
    </div>
  ) : (
    <span style={styles.finalStatusText}>
      {p.status === "verified" ? "Verified" : "Rejected"}
    </span>
  )}
</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    width: "100vw",
    display: "block",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    overflowX: "hidden",
  },

  main: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    padding: window.innerWidth <= 768 ? "12px" : "26px",
    overflowY: "auto",
    overflowX: "hidden",
  },

  replyBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "12px",
    flexWrap: "nowrap",
    width: "100%",
  },

  replyInput: {
    flex: 1,
    height: "46px",
    minHeight: "46px",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    resize: "none",
    fontFamily: "Arial, sans-serif",
    outline: "none",
  },

  replyPinBtn: {
    width: "46px",
    minWidth: "46px",
    height: "46px",
    borderRadius: "10px",
    border: "1px solid #ddd",
    background: "#f5f7fb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "20px",
    flexShrink: 0,
  },

  emojiBtn: {
    width: "46px",
    minWidth: "46px",
    height: "46px",
    border: "none",
    borderRadius: "10px",
    background: "#f5f7fb",
    cursor: "pointer",
    fontSize: "20px",
    flexShrink: 0,
  },

  sendBtn: {
    width: "130px",
    minWidth: "130px",
    height: "46px",
    border: "none",
    borderRadius: "10px",
    background: "#185FA5",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    flexShrink: 0,
  },

  selectedFile: {
    minWidth: "120px",
    maxWidth: "150px",
    height: "46px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "6px",
    padding: "0 8px",
    boxSizing: "border-box",
    flexShrink: 0,
  },

  selectedFileName: {
    fontSize: "12px",
    color: "#555",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  removeFileBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#b42318",
    fontWeight: "bold",
    fontSize: "14px",
  },

  emojiPickerBox: {
    position: "absolute",
    bottom: "55px",
    right: "0",
    zIndex: 9999,
  },
};