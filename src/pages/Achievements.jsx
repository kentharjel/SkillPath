import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

function Achievements() {
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
      {/* PAGE HEADER (ALWAYS PRESENT) */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">
            Achievements & Badges
          </h1>
          <p className="lead text-muted mt-3">
            View your earned badges and accomplishments as you progress through
            your learning paths.
          </p>
        </div>
      </section>

      {/* PAGE BODY (RESERVED SPACE → NO LAYOUT SHIFT) */}
      <section className="py-5">
        <div className="container" style={{ minHeight: "520px" }}>

          {/* LOADING */}
          {loading && (
            <div className="text-center text-muted py-5">
              Loading achievements...
            </div>
          )}

          {/* GUEST VIEW */}
          {!loading && !user && (
            <div className="text-center py-5">
              <p className="lead text-muted">
                Please log in to view achievements.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg mt-3">
                Log In
              </Link>
            </div>
          )}

          {/* LOGGED-IN VIEW */}
          {!loading && user && (
            <>
              {/* ACTION BAR (ROLE BASED) */}
              <div className="d-flex justify-content-end mb-4 gap-2">
                {user.role === "student" && (
                  <button className="btn btn-primary">
                    Join a Class
                  </button>
                )}

                {user.role === "professor" && (
                  <button className="btn btn-outline-primary">
                    Create a Class
                  </button>
                )}
              </div>

              {/* SUMMARY CARDS */}
              <div className="row g-4 mb-5">
                <SummaryCard value="8" label="Total Badges" color="primary" />
                <SummaryCard value="5" label="Completed Learning Paths" color="success" />
                <SummaryCard value="24" label="Lessons Completed" color="warning" />
              </div>

              {/* BADGES GRID */}
              <section className="bg-light py-5 rounded-4">
                <div className="container">

                  <div className="mb-4 text-center">
                    <h2 className="fw-bold">Your Badges</h2>
                    <p className="text-muted">
                      Badges earned by completing lessons and learning paths.
                    </p>
                  </div>

                  <div className="row g-4">
                    <BadgeCard
                      icon="🎓"
                      title="Web Fundamentals"
                      desc="Completed Web Development Fundamentals Path"
                    />
                    <BadgeCard
                      icon="🖥️"
                      title="JavaScript Beginner"
                      desc="Completed JavaScript Basics Lessons"
                    />
                    <BadgeCard
                      icon="🏅"
                      title="React Starter"
                      desc="Completed React Essentials Path"
                    />
                    <BadgeCard
                      icon="📘"
                      title="Capstone Achiever"
                      desc="Completed Full-Stack Capstone Project"
                    />
                  </div>

                </div>
              </section>

              {/* CTA */}
              <section className="py-5">
                <div className="bg-primary text-white rounded-4 p-5 text-center shadow-sm">
                  <h2 className="fw-bold">Keep Earning Badges!</h2>
                  <p className="mt-3 mb-4">
                    Complete more lessons and learning paths to unlock new achievements.
                  </p>
                  <Link
                    to="/learningpaths"
                    className="btn btn-light btn-lg fw-semibold"
                  >
                    Explore Learning Paths
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </>
  );
}

/* ---------- COMPONENTS ---------- */

const SummaryCard = ({ value, label, color }) => (
  <div className="col-md-4">
    <div className="card border-0 shadow-sm rounded-4 text-center h-100">
      <div className="card-body p-4">
        <h2 className={`fw-bold text-${color}`}>{value}</h2>
        <p className="text-muted mb-0">{label}</p>
      </div>
    </div>
  </div>
);

const BadgeCard = ({ icon, title, desc }) => (
  <div className="col-md-3">
    <div className="card h-100 border-0 shadow-sm rounded-4 text-center p-4">
      <div className="fs-1 mb-3">{icon}</div>
      <h6 className="fw-semibold">{title}</h6>
      <p className="text-muted small mt-2">{desc}</p>
    </div>
  </div>
);

export default Achievements;
