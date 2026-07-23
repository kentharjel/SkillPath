import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";

function Footer() {
  const [user, setUser] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [view, setView] = useState("main"); // "main" | "create" | "chat"
  
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [sending, setSending] = useState(false);

  // 1. Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: currentUser.uid, ...userDoc.data() });
          } else {
            setUser({ uid: currentUser.uid, fullname: currentUser.displayName || "User", email: currentUser.email });
          }
        } catch (err) {
          console.error("Error loading user in footer:", err);
          setUser({ uid: currentUser.uid, fullname: currentUser.displayName || "User", email: currentUser.email });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time stream of all user tickets
  useEffect(() => {
    if (!user || !showHelp) return;

    const q = query(collection(db, "tickets"), where("userId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTickets = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setTickets(fetchedTickets);

      if (activeTicket) {
        const updatedActive = fetchedTickets.find((t) => t.id === activeTicket.id);
        if (updatedActive) setActiveTicket(updatedActive);
      }
    }, (error) => {
      console.error("Firestore snapshot error in footer:", error);
    });

    return () => unsubscribe();
  }, [user, showHelp, activeTicket?.id]);

  // 3. Gemini AI Auto-Reply Function
  const generateAIReply = async (userMsgText) => {
    try {
      const API_KEY = "YOUR_GEMINI_API_KEY"; 
      
      if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY") {
        return "Thank you for creating a support ticket! Our team has received your message and will respond shortly.";
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const systemContext = `You are an AI Support Assistant for "SkillPath", a learning platform where students follow structured learning paths and earn badges, and professors manage classes. Provide a short, friendly acknowledgment or support answer (1-3 sentences maximum). Tone: helpful. Always speak as "Admin Support".`;

      const finalPrompt = `${systemContext}\n\nUser Question: ${userMsgText}\nAdmin Support:`;

      const result = await model.generateContent(finalPrompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("AI Auto-reply generation failed:", error);
      return "Your ticket was created successfully. Admin Support will get back to you as soon as possible!";
    }
  };

  // 4. Create Ticket & Trigger AI Auto-Reply ONCE (First Chat Only)
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    const cleanSubject = ticketSubject.trim();
    const cleanMessage = chatMessage.trim();
    if (!cleanSubject || !cleanMessage || !user || sending) return;

    setSending(true);
    try {
      const ticketId = `TICKET_${Date.now()}`;
      const newTicketRef = doc(db, "tickets", ticketId);

      const initialMessage = {
        senderId: user.uid,
        senderName: user.fullname || "User",
        message: cleanMessage,
        timestamp: new Date().toISOString(),
        isAdmin: false
      };

      const newTicket = {
        id: ticketId,
        userId: user.uid,
        userName: user.fullname || "User",
        userEmail: user.email || "",
        subject: cleanSubject,
        status: "pending", // "pending" | "resolved"
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        messages: [initialMessage]
      };

      await setDoc(newTicketRef, newTicket);

      setTicketSubject("");
      setChatMessage("");
      setActiveTicket(newTicket);
      setView("chat");

      // Trigger AI reply only once for this initial first message
      setTimeout(async () => {
        const aiAnswer = await generateAIReply(cleanMessage);
        if (aiAnswer) {
          const aiReply = {
            senderId: "ai-assistant",
            senderName: "Admin AI Support",
            message: aiAnswer,
            timestamp: new Date().toISOString(),
            isAdmin: true
          };

          await updateDoc(newTicketRef, {
            messages: arrayUnion(aiReply),
            status: "replied",
            lastUpdatedAt: new Date().toISOString()
          });
        }
      }, 1000);

    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setSending(false);
    }
  };

  // 5. Direct User Message inside existing ticket (NO AI response here)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const cleanMessage = chatMessage.trim();
    if (!cleanMessage || !user || !activeTicket || sending) return;

    setSending(true);
    try {
      const ticketRef = doc(db, "tickets", activeTicket.id);
      
      const newMsg = {
        senderId: user.uid,
        senderName: user.fullname || "User",
        message: cleanMessage,
        timestamp: new Date().toISOString(),
        isAdmin: false
      };

      await updateDoc(ticketRef, {
        messages: arrayUnion(newMsg),
        status: "pending", // Re-opens or keeps ticket active for admin
        lastUpdatedAt: new Date().toISOString()
      });

      setChatMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const resolvedTickets = tickets.filter((t) => t.status === "resolved");
  const unresolvedTickets = tickets.filter((t) => t.status !== "resolved");

  return (
    <>
      <footer className="bg-light border-top mt-auto">
        <div className="container py-5">
          <div className="row gy-4">

            {/* Brand */}
            <div className="col-md-4">
              <h5 className="fw-bold text-dark">
                Skill<span className="text-primary">Path</span>
              </h5>
              <p className="text-muted small mt-3">
                SkillPath is a modern learning platform designed to help students
                master skills through structured learning paths while enabling
                professors to guide, manage, and monitor student progress.
              </p>
            </div>

            {/* Platform */}
            <div className="col-md-2">
              <h6 className="fw-semibold text-dark">Platform</h6>
              <ul className="list-unstyled mt-3">
                <li><a href="/learningpaths" className="text-muted text-decoration-none">Learning Paths</a></li>
                <li><a href="/classes" className="text-muted text-decoration-none">Classes</a></li>
                <li><a href="/progress" className="text-muted text-decoration-none">Progress</a></li>
                <li><a href="/achievements" className="text-muted text-decoration-none">Achievements</a></li>
              </ul>
            </div>

            {/* Users */}
            <div className="col-md-3">
              <h6 className="fw-semibold text-dark">For Users</h6>
              <ul className="list-unstyled mt-3">
                <li className="text-muted small">Students follow guided learning paths</li>
                <li className="text-muted small">Track lesson completion</li>
                <li className="text-muted small">Earn badges & achievements</li>
                <li className="text-muted small">Professors manage classes & progress</li>
              </ul>
            </div>

            {/* Support */}
            <div className="col-md-3">
              <h6 className="fw-semibold text-dark">Support</h6>
              <ul className="list-unstyled mt-3">
                <li>
                  <button 
                    type="button"
                    onClick={() => {
                      setView("main");
                      setShowHelp(true);
                    }} 
                    className="btn btn-link p-0 text-muted text-decoration-none border-0 bg-transparent align-baseline"
                  >
                    Help Center
                  </button>
                </li>
              </ul>
            </div>

          </div>

          <hr className="my-4" />

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
            <p className="text-muted small mb-2 mb-md-0">
              © {new Date().getFullYear()} SkillPath. All rights reserved.
            </p>
            <p className="text-muted small">
              Built for guided learning and skill mastery
            </p>
          </div>
        </div>
      </footer>

      {/* SUPPORT MODAL */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            className="modal d-block" 
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2060 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <motion.div 
                className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white"
                style={{ height: "550px", display: "flex", flexDirection: "column" }}
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                {/* Header */}
                <div className="p-3 bg-primary text-white d-flex justify-content-between align-items-center shadow-sm">
                  <div className="d-flex align-items-center gap-2">
                    {view !== "main" && (
                      <button 
                        className="btn btn-sm text-white p-0 me-1" 
                        onClick={() => setView("main")}
                      >
                        ←
                      </button>
                    )}
                    <span className="fs-5">📋</span>
                    <h6 className="fw-bold mb-0">Help Center & Support Desk</h6>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white border-0" 
                    onClick={() => setShowHelp(false)}
                  ></button>
                </div>

                {/* Body Content */}
                <div className="p-3 flex-grow-1 bg-light d-flex flex-column gap-3" style={{ overflowY: "auto" }}>
                  {!user ? (
                    <div className="text-center my-auto p-4">
                      <span className="fs-2">🔒</span>
                      <h6 className="fw-bold mt-2">Authentication Required</h6>
                      <p className="text-muted small mb-0">Please sign in to your account to open support tickets.</p>
                    </div>
                  ) : view === "main" ? (
                    <>
                      {/* Top Action: Create Ticket */}
                      <div className="p-3 bg-white rounded-3 shadow-sm text-center">
                        <h6 className="fw-bold mb-1">Need assistance?</h6>
                        <p className="text-muted small mb-3">Submit a new ticket and our admin team will reply back.</p>
                        <button 
                          className="btn btn-primary btn-sm w-100 fw-semibold rounded-pill"
                          onClick={() => setView("create")}
                        >
                          + Create Ticket
                        </button>
                      </div>

                      {/* Active/Unresolved Tickets */}
                      {unresolvedTickets.length > 0 && (
                        <div>
                          <h6 className="fw-bold text-dark mb-2 small">Active Tickets (In Progress)</h6>
                          <div className="d-flex flex-column gap-2">
                            {unresolvedTickets.map((ticket) => (
                              <div 
                                key={ticket.id}
                                onClick={() => {
                                  setActiveTicket(ticket);
                                  setView("chat");
                                }}
                                className="p-3 bg-white rounded-3 shadow-sm border border-primary border-opacity-25"
                                style={{ cursor: "pointer" }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="fw-semibold text-dark small">{ticket.subject}</span>
                                  <span className="badge bg-warning text-dark" style={{ fontSize: "0.65rem" }}>
                                    {ticket.status}
                                  </span>
                                </div>
                                <p className="text-muted mb-0 text-truncate" style={{ fontSize: "0.75rem" }}>
                                  {ticket.messages[ticket.messages.length - 1]?.message || "No messages yet."}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resolved Tickets */}
                      <div>
                        <h6 className="fw-bold text-secondary mb-2 small">Resolved Tickets</h6>
                        {resolvedTickets.length === 0 ? (
                          <p className="text-muted small text-center my-2">No resolved tickets found.</p>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {resolvedTickets.map((ticket) => (
                              <div 
                                key={ticket.id}
                                onClick={() => {
                                  setActiveTicket(ticket);
                                  setView("chat");
                                }}
                                className="p-2.5 bg-white rounded-3 border text-muted"
                                style={{ cursor: "pointer" }}
                              >
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="fw-medium small">{ticket.subject}</span>
                                  <span className="badge bg-success" style={{ fontSize: "0.65rem" }}>
                                    Resolved
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : view === "create" ? (
                    /* Ticket Creation Form */
                    <form onSubmit={handleCreateTicket} className="d-flex flex-column gap-3 my-auto bg-white p-3 rounded-3 shadow-sm">
                      <h6 className="fw-bold text-dark mb-0">Create Support Ticket</h6>
                      <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Subject</label>
                        <input 
                          type="text" 
                          required
                          className="form-control form-control-sm"
                          placeholder="Brief description of the issue..."
                          value={ticketSubject}
                          onChange={(e) => setTicketSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label small fw-semibold text-muted mb-1">Message</label>
                        <textarea 
                          required
                          rows="4"
                          className="form-control form-control-sm"
                          placeholder="Provide details about your problem..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                        ></textarea>
                      </div>
                      <button 
                        type="submit" 
                        disabled={sending} 
                        className="btn btn-primary btn-sm fw-bold rounded-pill"
                      >
                        {sending ? "Submitting..." : "Submit Ticket"}
                      </button>
                    </form>
                  ) : (
                    /* Direct Ticket Chat View */
                    <div className="d-flex flex-column h-100">
                      <div className="pb-2 border-bottom mb-2">
                        <span className="badge bg-secondary mb-1" style={{ fontSize: "0.65rem" }}>
                          Ticket ID: {activeTicket?.id}
                        </span>
                        <h6 className="fw-bold mb-0 text-dark">{activeTicket?.subject}</h6>
                      </div>

                      <div className="flex-grow-1 d-flex flex-column gap-2" style={{ overflowY: "auto" }}>
                        {activeTicket?.messages?.map((msg, idx) => {
                          const isMe = msg.senderId === user.uid;
                          return (
                            <div key={idx} className={`d-flex flex-column ${isMe ? "align-items-end" : "align-items-start"}`}>
                              <div 
                                className={`p-2.5 rounded-3 shadow-sm px-3 small ${
                                  isMe ? "bg-primary text-white rounded-bottom-end-0" : "bg-white text-dark rounded-bottom-start-0 border"
                                }`}
                                style={{ maxWidth: "80%" }}
                              >
                                <p className="mb-0 text-break">{msg.message}</p>
                              </div>
                              <span className="text-muted px-1 mt-0.5" style={{ fontSize: "0.62rem" }}>
                                {isMe ? "You" : msg.senderName}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Chat Input allowed if ticket is not resolved */}
                      {activeTicket?.status !== "resolved" ? (
                        <form onSubmit={handleSendMessage} className="d-flex gap-2 pt-2 border-top mt-2">
                          <input 
                            type="text" 
                            required
                            className="form-control form-control-sm rounded-pill px-3 border" 
                            placeholder="Type your reply..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            disabled={sending}
                          />
                          <button 
                            type="submit" 
                            disabled={!chatMessage.trim() || sending} 
                            className="btn btn-primary btn-sm px-3 rounded-pill fw-bold"
                          >
                            {sending ? "..." : "Send"}
                          </button>
                        </form>
                      ) : (
                        <div className="p-2 bg-light border rounded text-center text-muted small mt-2">
                          This ticket has been marked as resolved by Admin.
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Footer;