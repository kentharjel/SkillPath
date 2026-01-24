import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase";

function SignUp() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine user role from query string
  const queryParams = new URLSearchParams(location.search);
  const role = queryParams.get("role"); // "student" or "professor"

  const title =
    role === "professor"
      ? "Create a Professor Account"
      : "Create a Student Account";

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "success", // "success" or "error"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      // 2️⃣ Save user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullname,
        email: user.email,
        password: password, 
        role,
        createdAt: new Date(),
      });

      setModal({
        show: true,
        title: "Success!",
        message: "Your account has been created successfully.",
        type: "success",
      });
    } catch (err) {
      console.error("Sign up error:", err);

      let message = "Failed to create account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        message = "Email already in use. Try logging in.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email format.";
      } else if (err.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      }

      setModal({
        show: true,
        title: "Registration Failed",
        message: message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    const isSuccess = modal.type === "success";
    setModal({ ...modal, show: false });
    if (isSuccess) {
      navigate("/");
    }
  };

  return (
    <>
      {/* Page Header */}
      <section className="bg-light py-5 border-bottom">
        <div className="container text-center py-4">
          <h1 className="fw-bold display-5 text-dark">{title}</h1>
          <p className="lead text-muted mt-3">
            Fill in your details below to set up your SkillPath account.
          </p>
        </div>
      </section>

      {/* SignUp Form */}
      <section className="py-5">
        <div className="container d-flex justify-content-center">
          <div
            className="card shadow-sm rounded-4 w-100 border-0"
            style={{ maxWidth: "500px" }}
          >
            <div className="card-body p-5">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="fullname" className="form-label fw-bold small text-muted text-uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg bg-light border-0"
                    id="fullname"
                    placeholder="Enter your full name"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label fw-bold small text-muted text-uppercase">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control form-control-lg bg-light border-0"
                    id="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label fw-bold small text-muted text-uppercase">
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-lg bg-light border-0"
                    id="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="d-grid mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg fw-bold shadow-sm py-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : null}
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>
                </div>
              </form>

              <p className="text-center text-muted small mt-4">
                Already have an account?{" "}
                <a href="/login" className="text-decoration-none fw-bold">
                  Login here
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

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
                  onClick={handleCloseModal}
                >
                  {modal.type === "error" ? "Try Again" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SignUp;