import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

function Classes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        setUser(
          snap.exists()
            ? { uid: currentUser.uid, ...snap.data() }
            : { uid: currentUser.uid, role: "student" }
        );
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* PAGE HEADER (STABLE) */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">Classes</h1>
          <p className="lead text-muted mt-3">
            Join classes, manage learning paths, and track student progress in one place.
          </p>
        </div>
      </section>

      {/* PAGE BODY (RESERVED SPACE — NO SHIFT) */}
      <section className="py-5">
        <div className="container" style={{ minHeight: "420px" }}>

          {/* ACTION BAR (ALWAYS RENDERED) */}
          <div className="d-flex justify-content-end mb-4 gap-2" style={{ minHeight: "44px" }}>
            {!loading && user?.role === "student" && (
              <button className="btn btn-primary">Join a Class</button>
            )}
            {!loading && user?.role === "professor" && (
              <button className="btn btn-outline-primary">Create a Class</button>
            )}
          </div>

          {/* CONTENT AREA */}
          <div>

            {/* LOADING */}
            {loading && (
              <div className="text-center text-muted py-5">
                Loading classes...
              </div>
            )}

            {/* GUEST */}
            {!loading && !user && (
              <div className="text-center py-5">
                <p className="lead text-muted">
                  Please log in to view classes.
                </p>
                <Link to="/login" className="btn btn-primary btn-lg mt-3">
                  Log In
                </Link>
              </div>
            )}

            {/* LOGGED-IN */}
            {!loading && user && (
              <div className="row g-4">
                <ClassCard
                  badge="Web Development"
                  badgeColor="primary"
                  code="WD-101"
                  description="Learn the fundamentals of web development through guided lessons and structured learning paths."
                  professor="Prof. Juan Dela Cruz"
                  paths="3 Learning Paths"
                  students="25 Students"
                />
              </div>
            )}

          </div>
        </div>
      </section>
    </>
  );
}

/* CLASS CARD */
const ClassCard = ({
  badge,
  badgeColor,
  code,
  description,
  professor,
  paths,
  students,
}) => (
  <div className="col-md-4">
    <div className="card h-100 border-0 shadow-sm rounded-4">
      <div className="card-body p-4">
        <span className={`badge bg-${badgeColor} mb-3`}>{badge}</span>
        <h5 className="fw-bold">{code}</h5>

        <p className="text-muted small mt-2">{description}</p>

        <ul className="list-unstyled small text-muted mt-3">
          <li>👨‍🏫 {professor}</li>
          <li>📘 {paths}</li>
          <li>👥 {students}</li>
        </ul>

        <Link to="/viewclass" className="btn btn-outline-primary btn-sm mt-3">
          View Class
        </Link>
      </div>
    </div>
  </div>
);

export default Classes;
