import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

function LearningPaths() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [paths, setPaths] = useState([]);
  const [appliedPaths, setAppliedPaths] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    level: "Beginner",
    description: "",
  });

  // FETCH USER & APPLIED PATHS
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      try {
        if (!currentUser) {
          setUser(null);
        } else {
          const userDocSnap = await getDocs(collection(db, "users"));
          const userDoc = userDocSnap.docs.find((d) => d.id === currentUser.uid);
          const currentUserData = userDoc
            ? { uid: currentUser.uid, ...userDoc.data() }
            : { uid: currentUser.uid, fullname: "Student", role: "student" };
          setUser(currentUserData);

          if (currentUserData.role === "student") {
            const appliedSnap = await getDocs(
              collection(db, "users", currentUser.uid, "userPaths")
            );
            setAppliedPaths(appliedSnap.docs.map((d) => d.id));
          }
        }
      } catch (err) {
        console.error(err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // FETCH LEARNING PATHS
  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const snap = await getDocs(collection(db, "content"));
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => d.type === "learning_path");
        setPaths(all);
      } catch (err) {
        console.error(err);
        setPaths([]);
      }
    };

    fetchPaths();
  }, []);

  // ADD PATH (Admin)
  const handleAddPath = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return alert("All fields are required");

    await addDoc(collection(db, "content"), {
      title: form.title,
      type: "learning_path",
      level: form.level,
      description: form.description,
      createdAt: serverTimestamp(),
    });

    setForm({ title: "", level: "Beginner", description: "" });

    // Refetch paths
    const snap = await getDocs(collection(db, "content"));
    const all = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.type === "learning_path");
    setPaths(all);
  };

  // DELETE PATH (Admin)
  const handleDeletePath = async (id) => {
    if (!window.confirm("Delete this learning path?")) return;
    await deleteDoc(doc(db, "content", id));
    setPaths((prev) => prev.filter((p) => p.id !== id));
  };

  // APPLY PATH (Student)
  const handleApplyPath = async (pathId) => {
    if (!user) {
      alert("You must log in to apply for this learning path.");
      navigate("/login");
      return;
    }
    if (user.role !== "student") return;

    await setDoc(doc(db, "users", user.uid, "userPaths", pathId), {
      appliedAt: serverTimestamp(),
      completedLessons: [],
      achievements: [],
    });

    setAppliedPaths((prev) => [...prev, pathId]);
    alert("Successfully applied to the learning path!");
  };

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <div className="spinner-border text-primary mb-3" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">Learning Paths</h1>
          <p className="lead text-muted mt-3">
            Follow structured learning paths to master skills step by step.
          </p>
        </div>
      </section>

      {/* ADMIN FORM */}
      {user?.role === "admin" && (
        <section className="py-4">
          <div className="container">
            <div className="card shadow-sm rounded-4 p-4 mb-4" style={{ minHeight: "220px" }}>
              <h4 className="fw-bold mb-3">Add New Learning Path</h4>
              <form onSubmit={handleAddPath}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Title</label>
                  <input
                    className="form-control"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Level</label>
                  <select
                    className="form-select"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <button className="btn btn-primary">Add Learning Path</button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* LEARNING PATHS LIST */}
      <section className="py-5">
        <div className="container">
          <div className="row g-4">
            {paths.length > 0 ? (
              paths.map((path) => (
                <div key={path.id} className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm rounded-4" style={{ minHeight: "200px" }}>
                    <div className="card-body p-4">
                      <span
                        className={`badge mb-2 ${
                          path.level === "Beginner"
                            ? "bg-primary"
                            : path.level === "Intermediate"
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                      >
                        {path.level}
                      </span>
                      <h5 className="fw-bold">{path.title}</h5>
                      <p className="text-muted small mt-2">{path.description}</p>

                      {user?.role === "admin" && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-danger mt-3"
                            onClick={() => handleDeletePath(path.id)}
                          >
                            Delete
                          </button>
                          <button
                            className="btn btn-outline-primary btn-sm mt-3 ms-2"
                            onClick={() => navigate("/viewpath", { state: { pathId: path.id } })}
                          >
                            View Path
                          </button>
                        </>
                      )}

                      {user?.role === "student" && (
                        <>
                          {appliedPaths.includes(path.id) ? (
                            <button
                              className="btn btn-success btn-sm mt-3"
                              onClick={() => navigate("/viewpath", { state: { pathId: path.id } })}
                            >
                              Start / View Path
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm mt-3"
                              onClick={() => handleApplyPath(path.id)}
                            >
                              Apply
                            </button>
                          )}
                        </>
                      )}

                      {!user && (
                        <button
                          className="btn btn-primary btn-sm mt-3"
                          onClick={() => navigate("/login")}
                        >
                          Log in to Apply
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted mt-4">No learning paths available.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default LearningPaths;
