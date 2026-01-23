import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";

function Progress() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* PAGE HEADER (ALWAYS PRESENT) */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">My Progress</h1>
          <p className="lead text-muted mt-3">
            Track your learning progress, completed lessons, and achievements.
          </p>
        </div>
      </section>

      {/* PAGE BODY (RESERVED SPACE — NO SHIFT) */}
      <section className="py-5">
        <div className="container" style={{ minHeight: "520px" }}>

          {/* LOADING */}
          {loading && (
            <div className="text-center text-muted py-5">
              Loading your progress...
            </div>
          )}

          {/* GUEST VIEW */}
          {!loading && !user && (
            <div className="text-center py-5">
              <p className="lead text-muted">
                Please log in to view your progress.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg mt-3">
                Log In
              </Link>
            </div>
          )}

          {/* LOGGED-IN VIEW */}
          {!loading && user && (
            <>
              {/* OVERVIEW CARDS */}
              <div className="row g-4 mb-5">
                <OverviewCard value="68%" label="Overall Progress" highlight="primary" />
                <OverviewCard value="24" label="Lessons Completed" />
                <OverviewCard value="5" label="Learning Paths" />
                <OverviewCard value="8" label="Badges Earned" highlight="success" />
              </div>

              {/* LEARNING PATH PROGRESS */}
              <section className="mb-5">
                <div className="mb-4">
                  <h2 className="fw-bold">Learning Path Progress</h2>
                  <p className="text-muted">
                    See how far you’ve progressed in each learning path.
                  </p>
                </div>

                <div className="row g-4">
                  <PathCard
                    title="Web Development Fundamentals"
                    progressText="8 of 12 lessons completed"
                    percent="66%"
                    color="primary"
                  />
                  <PathCard
                    title="JavaScript & React Essentials"
                    progressText="10 of 15 lessons completed"
                    percent="67%"
                    color="success"
                  />
                </div>
              </section>

              {/* RECENT ACTIVITY */}
              <section>
                <div className="mb-4">
                  <h2 className="fw-bold">Recent Activity</h2>
                  <p className="text-muted">
                    Your latest learning activities and achievements.
                  </p>
                </div>

                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item">
                        ✅ Completed lesson <strong>“CSS Flexbox Basics”</strong>
                      </li>
                      <li className="list-group-item">
                        🏅 Earned badge <strong>“Web Fundamentals”</strong>
                      </li>
                      <li className="list-group-item">
                        ✅ Completed lesson <strong>“JavaScript Functions”</strong>
                      </li>
                      <li className="list-group-item">
                        📘 Joined class <strong>“JS-201”</strong>
                      </li>
                    </ul>
                  </div>
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

const OverviewCard = ({ value, label, highlight }) => (
  <div className="col-md-3">
    <div className="card border-0 shadow-sm rounded-4 text-center h-100">
      <div className="card-body p-4">
        <h2 className={`fw-bold ${highlight ? `text-${highlight}` : ""}`}>
          {value}
        </h2>
        <p className="text-muted mb-0">{label}</p>
      </div>
    </div>
  </div>
);

const PathCard = ({ title, progressText, percent, color }) => (
  <div className="col-md-6">
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <h5 className="fw-semibold">{title}</h5>
        <p className="text-muted small">{progressText}</p>

        <div className="progress mb-3" style={{ height: "8px" }}>
          <div
            className={`progress-bar bg-${color}`}
            style={{ width: percent }}
          ></div>
        </div>

        <button className="btn btn-outline-primary btn-sm">
          Continue Learning
        </button>
      </div>
    </div>
  </div>
);

export default Progress;
