import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // 1. Listen to all incoming user requests in real-time
  useEffect(() => {
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(docsData);
      
      // Keep selected request updated in real-time if messages change while chat modal is open
      if (selectedRequest) {
        const updated = docsData.find(r => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedRequest?.id]);

  // 2. Handle pushing an admin reply message into the request chat thread array
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedRequest || sending || selectedRequest.status === "resolved") return;

    setSending(true);
    try {
      const requestDocRef = doc(db, "requests", selectedRequest.id);
      
      const newReply = {
        senderId: auth.currentUser?.uid || "admin",
        senderName: "Admin Support",
        message: replyText.trim(),
        timestamp: new Date().toISOString(),
        isAdmin: true
      };

      await updateDoc(requestDocRef, {
        messages: arrayUnion(newReply),
        status: "replied", 
        lastUpdatedAt: new Date().toISOString()
      });

      setReplyText("");
    } catch (error) {
      console.error("Error transmitting admin response:", error);
    } finally {
      setSending(false);
    }
  };

  // 3. Close ticket functionality via the 3-dots menu action
  const handleCloseTicket = async () => {
    if (!selectedRequest) return;
    try {
      const requestDocRef = doc(db, "requests", selectedRequest.id);
      await updateDoc(requestDocRef, {
        status: "resolved",
        lastUpdatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error closing ticket:", error);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ marginTop: "80px" }}>
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-muted mt-3">Loading incoming requests panel...</p>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100 py-5" style={{ marginTop: "20px" }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h3 className="fw-bold text-dark mb-1">User Service Requests</h3>
                <p className="text-muted small mb-0">Review text communications and dispatch real-time admin replies.</p>
              </div>
              <span className="badge bg-primary px-3 py-2 rounded-pill fw-bold">
                {requests.filter(r => r.status !== "resolved").length} Active / {requests.length} Total
              </span>
            </div>

            {/* REQUEST LIST TILES */}
            {requests.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
                <span className="fs-1">🎉</span>
                <h5 className="fw-bold mt-3">All Clear!</h5>
                <p className="text-muted mb-0 small">No active help or configuration requests requested by users at this time.</p>
              </div>
            ) : (
              <div className="row g-3">
                {requests.map((req) => (
                  <div className="col-100" key={req.id}>
                    <motion.div 
                      className="card border-0 shadow-sm rounded-4 bg-white p-4 hover-shadow"
                      style={{ cursor: "pointer" }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedRequest(req)}
                    >
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-3">
                          <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fw-semibold" style={{ width: "48px", height: "48px" }}>
                            {req.userName ? req.userName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <h6 className="fw-bold mb-0 text-dark">{req.userName || "Unknown User"}</h6>
                            <p className="text-muted small mb-0">{req.userEmail || "No Email Provided"}</p>
                          </div>
                        </div>

                        <div className="text-end d-flex align-items-center gap-3">
                          <span className={`badge rounded-pill px-3 py-1.5 small fw-bold text-capitalize ${
                            req.status === "resolved" ? "bg-secondary text-white" :
                            req.status === "replied" ? "bg-light text-success border border-success" : "bg-danger text-white animate-pulse"
                          }`}>
                            {req.status === "resolved" ? "Resolved" : req.status || "Pending Admin Action"}
                          </span>
                          <span className="text-muted fs-5">💬</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 bg-light p-2.5 rounded-3 border-start border-primary border-3">
                        <p className="text-secondary small mb-0 text-truncate">
                          <strong>Latest Message:</strong> {req.messages && req.messages.length > 0 ? req.messages[req.messages.length - 1].message : "No message logs."}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* CHAT-LIKE FULL SCREEN MODAL DIALOG POPUP */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div 
            className="modal d-block" 
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2050 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <motion.div 
                className="modal-content border-0 shadow-xl rounded-4 overflow-hidden bg-white"
                style={{ height: "600px", display: "flex", flexDirection: "column" }}
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                
                {/* CHAT HEADER LAYOUT */}
                <div className="p-4 bg-primary text-white d-flex justify-content-between align-items-center shadow-sm">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fs-5" style={{ width: "42px", height: "42px" }}>
                      {selectedRequest.userName ? selectedRequest.userName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <h5 className="fw-bold mb-0">{selectedRequest.userName}</h5>
                      <span className="small text-white-50">{selectedRequest.userEmail}</span>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-2">
                    {/* 3 DOTS ACTIONS ACTION MENU */}
                    {selectedRequest.status !== "resolved" && (
                      <div className="dropdown">
                        <button 
                          className="btn btn-link text-white p-0 border-0 fs-4 lh-1 text-decoration-none me-2" 
                          type="button" 
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          ⋮
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 mt-2">
                          <li>
                            <button className="dropdown-item text-danger small fw-semibold py-2" onClick={handleCloseTicket}>
                              🔒 Close Ticket
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                    <button type="button" className="btn-close btn-close-white border-0" onClick={() => setSelectedRequest(null)} aria-label="Close"></button>
                  </div>
                </div>

                {/* RESOLVED TICKET NOTIFICATION BANNER */}
                {selectedRequest.status === "resolved" && (
                  <div className="bg-secondary text-white text-center py-2 small fw-bold">
                    🔒 This service request has been closed and marked as resolved.
                  </div>
                )}

                {/* CHAT BUBBLE CONVERSATION CONTAINER BOX */}
                <div className="p-4 flex-grow-1 bg-light overflow-auto d-flex flex-column gap-3" style={{ overflowY: "auto" }}>
                  {selectedRequest.messages?.map((msg, index) => {
                    const isAdminSender = msg.isAdmin || msg.senderId === auth.currentUser?.uid;
                    return (
                      <div 
                        key={index} 
                        className={`d-flex flex-column ${isAdminSender ? "align-items-end" : "align-items-start"}`}
                      >
                        <div 
                          className={`p-3 rounded-4 shadow-sm small ${
                            isAdminSender 
                              ? "bg-primary text-white rounded-bottom-end-0" 
                              : "bg-white text-dark rounded-bottom-start-0 border"
                          }`}
                          style={{ maxWidth: "75%" }}
                        >
                          <p className="mb-1 m-0 text-break">{msg.message}</p>
                          <div className={`text-end ${isAdminSender ? "text-white-50" : "text-muted"}`} style={{ fontSize: "0.65rem" }}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </div>
                        </div>
                        <span className="text-muted px-1 mt-0.5" style={{ fontSize: '0.65rem' }}>
                          {isAdminSender ? "You" : selectedRequest.userName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CHAT INPUT FIELD FORM FOOTER */}
                <div className="p-3 bg-white border-top">
                  <form onSubmit={handleSendReply} className="d-flex gap-2">
                    <input 
                      type="text" 
                      className="form-control rounded-pill px-4 border" 
                      placeholder={selectedRequest.status === "resolved" ? "Ticket is resolved..." : `Reply to ${selectedRequest.userName}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={sending || selectedRequest.status === "resolved"}
                    />
                    <button 
                      type="submit" 
                      disabled={!replyText.trim() || sending || selectedRequest.status === "resolved"} 
                      className="btn btn-primary px-4 rounded-pill fw-bold d-flex align-items-center gap-2 shadow-sm"
                    >
                      {sending ? "Sending..." : "Send 🚀"}
                    </button>
                  </form>
                </div>

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Requests;