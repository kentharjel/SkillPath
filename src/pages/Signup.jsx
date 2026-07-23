import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { db, auth } from "../firebase";

function SignUp() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine user role from query string
  const queryParams = new URLSearchParams(location.search);
  const role = queryParams.get("role") || "student"; // Default to student if null

  const title =
    role === "professor"
      ? "Create a Professor Account"
      : "Create a Student Account";

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Sign-In Confirmation Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleFullname, setGoogleFullname] = useState("");

  // Status Modal State
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "success", // "success" or "error"
  });

  // --- MANUAL EMAIL/PASSWORD REGISTRATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        fullname: fullname.trim(),
        email: user.email,
        role: role,
        createdAt: serverTimestamp(),
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

  // --- GOOGLE SIGN-IN HANDLER ---
  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        // Sign out immediately so they are NOT left logged in
        await signOut(auth);

        setModal({
          show: true,
          title: "Account Exists",
          message: "An account with this Google email already exists. Please log in instead.",
          type: "error",
        });
        return;
      }

      // Store temporary Google auth user info and trigger modal for name input
      setGoogleUser(user);
      setGoogleFullname(user.displayName || "");
      setShowGoogleModal(true);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        console.error("Google Sign-Up Error:", err);
        setModal({
          show: true,
          title: "Google Authentication Failed",
          message: "Unable to sign in with Google. Please try again.",
          type: "error",
        });
      }
    }
  };

  // --- COMPLETE GOOGLE ACCOUNT CREATION FROM MODAL ---
  const handleConfirmGoogleSignUp = async (e) => {
    e.preventDefault();
    if (!googleUser || !googleFullname.trim()) return;

    setLoading(true);
    try {
      await setDoc(doc(db, "users", googleUser.uid), {
        fullname: googleFullname.trim(),
        email: googleUser.email,
        role: role,
        createdAt: serverTimestamp(),
      });

      setShowGoogleModal(false);
      setModal({
        show: true,
        title: "Account Created!",
        message: `Welcome! Your ${role} account has been created using Google.`,
        type: "success",
      });
    } catch (err) {
      console.error("Error creating Google profile:", err);
      setModal({
        show: true,
        title: "Setup Failed",
        message: "Failed to complete account setup. Please try again.",
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
              {/* Google Sign Up Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="btn btn-outline-light border text-dark fw-bold w-100 d-flex align-items-center justify-content-center py-3 mb-4 shadow-sm"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/128/300/300221.png"
                  alt="Google"
                  className="me-2"
                  style={{ width: "20px" }}
                />
                Continue with Google
              </button>

              <div className="d-flex align-items-center my-3">
                <hr className="flex-grow-1" />
                <span className="mx-3 text-muted small fw-bold">OR</span>
                <hr className="flex-grow-1" />
              </div>

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

      {/* GOOGLE PROFILE DETAILS MODAL */}
      {showGoogleModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <form onSubmit={handleConfirmGoogleSignUp}>
                <div className="modal-header border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold m-0">Complete Your Profile</h5>
                  {/* Account Role Indicator Badge */}
                  <span className={`badge ${role === "professor" ? "bg-warning text-dark" : "bg-primary"} px-3 py-2 rounded-pill text-uppercase fs-6`}>
                    {role} Account
                  </span>
                </div>
                <div className="modal-body p-4">
                  <p className="text-muted small mb-4">
                    Confirm your details below to finish creating your account.
                  </p>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted text-uppercase">Google Email</label>
                    <input
                      type="email"
                      className="form-control bg-light border-0 py-2 text-muted"
                      value={googleUser?.email || ""}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted text-uppercase">Full Name</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-2"
                      placeholder="Enter your full name"
                      value={googleFullname}
                      onChange={(e) => setGoogleFullname(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pb-4 px-4">
                  <button
                    type="button"
                    className="btn btn-light px-4 rounded-pill fw-bold"
                    onClick={() => {
                      signOut(auth);
                      setShowGoogleModal(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 rounded-pill fw-bold"
                    disabled={loading}
                  >
                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                    Confirm & Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {modal.show && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}>
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