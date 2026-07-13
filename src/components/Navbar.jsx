import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore"; // Added collection and onSnapshot
import { useNavigate, Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestCount, setRequestCount] = useState(0); // Added for admin request counter badge
  const collapseRef = useRef(null);

  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    isConfirm: false,
    onConfirm: null,
  });

  useEffect(() => {
    const navbarCollapse = collapseRef.current;
    if (navbarCollapse && navbarCollapse.classList.contains("show")) {
      const bsCollapse = window.bootstrap?.Collapse.getInstance(navbarCollapse);
      if (bsCollapse) {
        bsCollapse.hide();
      } else {
        navbarCollapse.classList.remove("show");
      }
    }
  }, [location]);

  useEffect(() => {
    let unsubscribeRequests = () => {}; // Holder to clean up real-time listener

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          let userData;
          
          if (userDoc.exists()) {
            userData = { uid: currentUser.uid, ...userDoc.data() };
          } else {
            userData = { uid: currentUser.uid, fullname: currentUser.displayName || "User", role: "student" };
          }
          
          setUser(userData);

          // Real-time counter synchronization if authenticated as an administrator
          if (userData.role === "admin") {
            unsubscribeRequests = onSnapshot(
              collection(db, "requests"),
              (snapshot) => {
                // Filters out resolved tickets so the badge count accurately displays only active items
                const activeTickets = snapshot.docs.filter(doc => doc.data().status !== "resolved");
                setRequestCount(activeTickets.length);
              },
              (error) => {
                console.error("Error listening to database request streams:", error);
              }
            );
          }
        } catch (err) {
          setUser({ uid: currentUser.uid, fullname: currentUser.displayName || "User", role: "student" });
        }
      } else {
        setUser(null);
        setRequestCount(0);
        unsubscribeRequests(); // Detach tracking stream on logout
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRequests();
    };
  }, []);

  const handleLogoutClick = () => {
    setModal({
      show: true,
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your account?",
      isConfirm: true,
      onConfirm: performLogout,
    });
  };

  const performLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setModal({
        show: true,
        title: "Logged Out",
        message: "You have been successfully logged out. See you soon!",
        isConfirm: false,
        onConfirm: null,
      });
      setTimeout(() => {
        setModal((prev) => ({ ...prev, show: false }));
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const getMenuItems = () => {
    if (!user) return [
      { label: "Learning Paths", to: "/learningpaths" },
      { label: "Classes", to: "/classes" },
      { label: "Progress", to: "/progress" },
      { label: "Achievements", to: "/achievements" },
      { label: "About Us", to: "/about" },
    ];
    if (user.role === "student") return [
      { label: "Learning Paths", to: "/learningpaths" },
      { label: "Classes", to: "/classes" },
      { label: "Progress", to: "/progress" },
      { label: "Achievements", to: "/achievements" },
      { label: "Profile", to: "/profile" },
    ];
    if (user.role === "professor") return [
      { label: "Classes", to: "/classes" },
      { label: "About Us", to: "/about" },
      { label: "Profile", to: "/profile" },
    ];
    if (user.role === "admin") return [
      { label: "Admin Dashboard", to: "/admin" },
      { label: "Requests", to: "/requests", badge: requestCount }, // Admin requests item with numeric badge counter
      { label: "Learning Paths", to: "/learningpaths" },
      { label: "Profile", to: "/profile" },
    ];
    return [];
  };

  const menuItems = loading ? [] : getMenuItems();

  return (
    <>
      <style>
        {`
          .nav-link-custom {
            position: relative;
            text-decoration: none;
            padding: 0.5rem 0;
            transition: color 0.3s ease;
          }
          .active-underline {
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 2px;
            background: #0d6efd;
            border-radius: 2px;
          }
        `}
      </style>

      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
        <div className="container">
          <Link className="navbar-brand fw-bold fs-4 text-dark" to="/">
            Skill<span className="text-primary">Path</span>
          </Link>

          <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#skillpathNavbar">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="skillpathNavbar" ref={collapseRef}>
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-4">
              {menuItems.map((item, index) => (
                <motion.li 
                  key={item.label} 
                  className="nav-item"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NavLink
                    className={({ isActive }) => `nav-link nav-link-custom fw-medium ${isActive ? "text-primary" : "text-dark"}`}
                    to={item.to}
                  >
                    {({ isActive }) => (
                      <motion.div whileHover={{ scale: 1.02 }} className="d-flex align-items-center gap-2" style={{ position: 'relative' }}>
                        <span>{item.label}</span>
                        
                        {/* Dynamic Count Badge Indicator rendering if parameter holds an active evaluation */}
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="badge rounded-pill bg-danger" style={{ fontSize: "0.72rem", padding: "0.35em 0.6em" }}>
                            {item.badge}
                          </span>
                        )}

                        {isActive && (
                          <motion.div 
                            layoutId="nav-underline"
                            className="active-underline"
                          />
                        )}
                      </motion.div>
                    )}
                  </NavLink>
                </motion.li>
              ))}

              <li className="nav-item d-none d-lg-block">
                <span className="border-start mx-2" style={{ height: '20px', display: 'inline-block' }}></span>
              </li>

              <AnimatePresence mode="wait">
                {!loading && !user ? (
                  <motion.div 
                    key="logged-out-actions"
                    className="d-flex gap-2"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <Link className="btn btn-outline-primary btn-sm px-3 rounded-pill" to="/login">Login</Link>
                    <Link className="btn btn-primary btn-sm px-3 shadow-sm rounded-pill" to="/getstarted">Get Started</Link>
                  </motion.div>
                ) : !loading && user ? (
                  <motion.div 
                    key="logged-in-actions"
                    className="d-flex align-items-center gap-3"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <Link to="/profile" className="text-decoration-none fw-bold text-primary small hover-opacity">
                      👤 {user.fullname}
                    </Link>
                    <button className="btn btn-outline-danger btn-sm px-3 rounded-pill" onClick={handleLogoutClick}>Logout</button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </nav>

      <div style={{ height: "76px" }} className="w-100 d-block"></div>

      {/* ANIMATED LOGOUT MODAL */}
      <AnimatePresence>
        {modal.show && (
          <motion.div 
            className="modal d-block" 
            style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 2000 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <motion.div 
                className="modal-content border-0 shadow-lg rounded-4"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
              >
                <div className="modal-header border-0 pb-0 pt-4 px-4">
                  <h5 className="fw-bold">{modal.title}</h5>
                </div>
                <div className="modal-body p-4">
                  <p className="text-muted mb-0">{modal.message}</p>
                </div>
                <div className="modal-footer border-0 pt-0 pb-4 px-4">
                  {modal.isConfirm ? (
                    <>
                      <button className="btn btn-light px-4 rounded-pill fw-bold" onClick={() => setModal({ ...modal, show: false })}>Cancel</button>
                      <button className="btn btn-danger px-4 rounded-pill fw-bold" onClick={modal.onConfirm}>Logout</button>
                    </>
                  ) : (
                    <button className="btn btn-primary px-5 rounded-pill fw-bold w-100" onClick={() => setModal({ ...modal, show: false })}>Okay</button>
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

export default Navbar;