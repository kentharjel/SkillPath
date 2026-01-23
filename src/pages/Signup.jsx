import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase"; // make sure your firebase.js exports `auth` and `db`

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

      // 2️⃣ Save user info in Firestore with UID as document ID
      await setDoc(doc(db, "users", user.uid), {
        fullname,
        email: user.email,
        role,
        createdAt: new Date(),
      });

      alert("Account created successfully!");
      navigate("/");
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

      alert(message);
    } finally {
      setLoading(false);
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
            className="card shadow-sm rounded-4 w-100"
            style={{ maxWidth: "500px" }}
          >
            <div className="card-body p-5">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="fullname" className="form-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="fullname"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="d-grid mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>
                </div>
              </form>

              <p className="text-center text-muted small mt-3">
                Already have an account?{" "}
                <a href="/login" className="text-decoration-none">
                  Login here
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default SignUp;
