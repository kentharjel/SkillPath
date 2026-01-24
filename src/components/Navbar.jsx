import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    isConfirm: false,
    onConfirm: null,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));

          if (userDoc.exists()) {
            setUser({ uid: currentUser.uid, ...userDoc.data() });
          } else {
            setUser({
              uid: currentUser.uid,
              fullname: "User",
              role: "student",
            });
          }
        } catch (err) {
          console.error("Failed to fetch user info:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
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
      
      // Show success modal
      setModal({
        show: true,
        title: "Logged Out",
        message: "You have been successfully logged out. See you soon!",
        isConfirm: false,
        onConfirm: null,
      });

      // Redirect after a short delay so they can see the message
      setTimeout(() => {
        setModal(prev => ({ ...prev, show: false }));
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // ✅ MENU BY ROLE
  const getMenuItems = () => {
    // Not logged in
    if (!user) {
      return [
        { label: "Learning Paths", to: "/learningpaths" },
        { label: "Classes", to: "/classes" },
        { label: "Progress", to: "/progress" },
        { label: "Achievements", to: "/achievements" },
        { label: "About Us", to: "/about" },
      ];
    }

    // STUDENT
    if (user.role === "student") {
      return [
        { label: "Learning Paths", to: "/learningpaths" },
        { label: "Classes", to: "/classes" },
        { label: "Progress", to: "/progress" },
        { label: "Achievements", to: "/achievements" },
      ];
    }

    // PROFESSOR
    if (user.role === "professor") {
      return [
        { label: "Classes", to: "/classes" },
        { label: "About Us", to: "/about" },
      ];
    }

    // ✅ ADMIN ONLY
    if (user.role === "admin") {
      return [
        { label: "Admin Dashboard", to: "/admin" },
        { label: "Learning Paths", to: "/learningpaths" },
      ];
    }

    return [];
  };

  const menuItems = loading
    ? [
        { label: "Learning Paths", to: "/learningpaths" },
        { label: "Classes", to: "/classes" },
        { label: "About Us", to: "/about" },
      ]
    : getMenuItems();

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold fs-4 text-dark" to="/">
            Skill<span className="text-primary">Path</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#skillpathNavbar"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="skillpathNavbar">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-4">
              {menuItems.map((item) => (
                <li key={item.label} className="nav-item">
                  <Link className="nav-link fw-medium text-dark" to={item.to}>
                    {item.label}
                  </Link>
                </li>
              ))}

              <li className="nav-item d-none d-lg-block">
                <span className="border-start mx-3"></span>
              </li>

              {!loading && !user && (
                <>
                  <li className="nav-item">
                    <Link
                      className="btn btn-outline-primary btn-sm px-3"
                      to="/login"
                    >
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      className="btn btn-primary btn-sm px-3 shadow-sm"
                      to="/getstarted"
                    >
                      Get Started
                    </Link>
                  </li>
                </>
              )}

              {!loading && user && (
                <>
                  <li className="nav-item">
                    <span className="nav-link fw-medium text-dark">
                      {user.fullname}
                    </span>
                  </li>
                  <li className="nav-item">
                    <button
                      className="btn btn-outline-danger btn-sm px-3"
                      onClick={handleLogoutClick}
                    >
                      Logout
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* CUSTOM MODAL COMPONENT */}
      {modal.show && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pb-0 pt-4 px-4">
                <h5 className="fw-bold text-dark">{modal.title}</h5>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted mb-0">{modal.message}</p>
              </div>
              <div className="modal-footer border-0 pt-0 pb-4 px-4">
                {modal.isConfirm ? (
                  <>
                    <button 
                      className="btn btn-light px-4 rounded-pill fw-bold" 
                      onClick={() => setModal({ ...modal, show: false })}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-danger px-4 rounded-pill fw-bold" 
                      onClick={modal.onConfirm}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn btn-primary px-5 rounded-pill fw-bold w-100" 
                    onClick={() => {
                      setModal({ ...modal, show: false });
                      navigate("/");
                    }}
                  >
                    Okay
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;