import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    navigate("/");
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
                    onClick={handleLogout}
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
  );
}

export default Navbar;
