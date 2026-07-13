import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

function Footer() {
  const [user, setUser] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeRequest, setActiveRequest] = useState(null);
  const [sending, setSending] = useState(false);

  // 1. Monitor user session auth states
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
          setUser({ uid: currentUser.uid, fullname: currentUser.displayName || "User", email: currentUser.email });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time stream to listen to this user's active request ticket thread
  useEffect(() => {
    if (!user || !showHelp) return;

    // We tie the request document ID directly to the user's UID for clean matching
    const requestDocRef = doc(db, "requests", user.uid);
    
    const unsubscribe = onSnapshot(requestDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveRequest(docSnap.data());
      } else {
        setActiveRequest(null);
      }
    });

    return () => unsubscribe();
  }, [user, showHelp]);

  // 3. Dispatch user chat messages to the database
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const requestDocRef = doc(db, "requests", user.uid);
      
      const newMsg = {
        senderId: user.uid,
        senderName: user.fullname || "User",
        message: chatMessage.trim(),
        timestamp: new Date().toISOString(),
        isAdmin: false
      };

      if (!activeRequest) {
        // Create a new support ticket structure if it doesn't exist yet
        await setDoc(requestDocRef, {
          id: user.uid,
          userName: user.fullname || "User",
          userEmail: user.email,
          status: "pending",
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          messages: [newMsg]
        });
      } else {
        // Append message string onto current support conversation array stream
        await updateDoc(requestDocRef, {
          messages: arrayUnion(newMsg),
          status: "pending",
          lastUpdatedAt: new Date().toISOString()
        });
      }

      setChatMessage("");
    } catch (error) {
      console.error("Error committing support communication request:", error);
    } finally {
      setSending(false);
    }
  };

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
                <li><a href="/Learningpaths" className="text-muted text-decoration-none">Learning Paths</a></li>
                <li><a href="/Classes" className="text-muted text-decoration-none">Classes</a></li>
                <li><a href="/Progress" className="text-muted text-decoration-none">Progress</a></li>
                <li><a href="/Achievements" className="text-muted text-decoration-none">Achievements</a></li>
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
                    onClick={() => setShowHelp(true)} 
                    className="btn btn-link p-0 text-muted text-decoration-none"
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

      {/* SUPPORT HELP CENTER MODAL DIALOG POPUP */}
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
                style={{ height: "500px", display: "flex", flexDirection: "column" }}
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
              >
                {/* Header */}
                <div className="p-3 bg-primary text-white d-flex justify-content-between align-items-center shadow-sm">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">💬</span>
                    <h6 className="fw-bold mb-0">SkillPath Support Desk</h6>
                  </div>
                  <button type="button" className="btn-close btn-close-white border-0" onClick={() => setShowHelp(false)}></button>
                </div>

                {/* Main Message Space */}
                <div className="p-3 flex-grow-1 bg-light d-flex flex-column gap-2" style={{ overflowY: "auto" }}>
                  {!user ? (
                    <div className="text-center my-auto p-4">
                      <span className="fs-2">🔒</span>
                      <h6 className="fw-bold mt-2">Authentication Required</h6>
                      <p className="text-muted small mb-0">Please sign in to your SkillPath account to start a direct message thread with system administrators.</p>
                    </div>
                  ) : !activeRequest || !activeRequest.messages || activeRequest.messages.length === 0 ? (
                    <div className="text-center my-auto p-4 text-muted">
                      <span className="fs-3">👋</span>
                      <h6 className="fw-bold mt-2">Hello, {user.fullname}!</h6>
                      <p className="small mb-0">Need any assistance? Type a message below to instantly dispatch a help request directly to our administrators.</p>
                    </div>
                  ) : (
                    activeRequest.messages.map((msg, idx) => {
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
                    })
                  )}
                </div>

                {/* Footer Chat Form Input */}
                {user && (
                  <div className="p-2.5 bg-white border-top">
                    <form onSubmit={handleSendMessage} className="d-flex gap-2">
                      <input 
                        type="text" 
                        required
                        className="form-control form-control-sm rounded-pill px-3 border" 
                        placeholder="Type standard communication message body..."
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
                  </div>
                )}

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Footer;