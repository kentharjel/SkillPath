import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

// React Icons for eye toggle
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modal State
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "success", // "success" or "error"
    onClose: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const currentUser = userCredential.user;

      // Fetch role from Firestore
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      const role = snap.exists() ? snap.data().role : "student";

      setModal({
        show: true,
        title: "Welcome Back!",
        message: "Logged in successfully. Redirecting you now...",
        type: "success",
        onClose: () => {
          if (role === "admin") {
            navigate("/admin");
          } else if (role === "professor") {
            navigate("/classes");
          } else {
            navigate("/classes");
          }
        }
      });

      // Auto-redirect after 1.5 seconds if they don't click "Continue"
      setTimeout(() => {
        if (role === "admin") navigate("/admin");
        else navigate("/classes");
      }, 1500);

    } catch (error) {
      console.error("Login error:", error);

      let message = "Failed to login. Please try again.";
      if (error.code === "auth/user-not-found") {
        message = "User not found. Please check your email or sign up first.";
      } else if (error.code === "auth/wrong-password") {
        message = "Wrong password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        message = "Invalid email format.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      }
      
      setModal({
        show: true,
        title: "Login Error",
        message: message,
        type: "error",
        onClose: null
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh", backgroundColor: "#f4f6f9" }}
    >
      <div className="card shadow-lg p-4 rounded-4 border-0" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">SkillPath</h2>
          <p className="text-muted small">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-bold small text-muted text-uppercase">
              Email
            </label>
            <input
              type="email"
              className="form-control form-control-lg bg-light border-0"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label fw-bold small text-muted text-uppercase">
              Password
            </label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control form-control-lg bg-light border-0"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-light border-0 d-flex align-items-center justify-content-center"
                onClick={() => setShowPassword(!showPassword)}
                style={{ width: "45px" }}
              >
                {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
              </button>
            </div>
          </div>

          <div className="mb-3 d-flex justify-content-between align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="rememberMe" />
              <label className="form-check-label small" htmlFor="rememberMe">
                Remember Me
              </label>
            </div>
            <a href="#" className="small text-primary text-decoration-none fw-bold">
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="btn btn-primary w-100 fw-bold py-3 shadow-sm" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2"></span>
            ) : null}
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="text-center my-3 text-muted small">OR</div>

        <div className="d-grid gap-2">
          <button className="btn btn-outline-light border text-dark fw-bold d-flex align-items-center justify-content-center">
            Continue with Google
          </button>
        </div>

        <p className="text-center text-muted small mt-4">
          Don’t have an account?{" "}
          <a href="/getstarted" className="text-primary fw-bold text-decoration-none">
            Sign Up
          </a>
        </p>
      </div>

      {/* STATUS MODAL */}
      {modal.show && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pt-4 px-4 pb-0">
                <h5 className={`fw-bold ${modal.type === "error" ? "text-danger" : "text-success"}`}>
                  {modal.title}
                </h5>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted mb-0">{modal.message}</p>
              </div>
              <div className="modal-footer border-0 pb-4 px-4">
                <button 
                  className={`btn ${modal.type === "error" ? "btn-danger" : "btn-primary"} px-5 rounded-pill fw-bold w-100`} 
                  onClick={() => {
                    if (modal.onClose) modal.onClose();
                    setModal({ ...modal, show: false });
                  }}
                >
                  {modal.type === "error" ? "Try Again" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;