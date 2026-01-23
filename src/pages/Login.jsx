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
      const role = snap.exists() ? snap.data().role : "student"; // default to student

      alert("Logged in successfully!");

      // Redirect based on role
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "professor") {
        navigate("/classes"); // or another professor dashboard
      } else {
        navigate("/classes"); // student dashboard
      }
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
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh", backgroundColor: "#f4f6f9" }}
    >
      <div className="card shadow-lg p-4 rounded-4" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">SkillPath</h2>
          <p className="text-muted small">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">
              Email
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label fw-semibold">
              Password
            </label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
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
            <a href="#" className="small text-primary">
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="btn btn-primary w-100 fw-semibold" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="text-center my-3 text-muted small">OR</div>

        <div className="d-grid gap-2">
          <button className="btn btn-outline-primary fw-semibold">Continue with Google</button>
          <button className="btn btn-outline-secondary fw-semibold">Continue with Facebook</button>
        </div>

        <p className="text-center text-muted small mt-4">
          Don’t have an account?{" "}
          <a href="/getstarted" className="text-primary fw-semibold">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;
