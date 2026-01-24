import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

function Achievements() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- REAL DATA STATES ---
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedPaths: 0,
    badges: []
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // 1. Get User Profile
          const userSnap = await getDoc(doc(db, "users", currentUser.uid));
          const userData = userSnap.exists() 
            ? { uid: currentUser.uid, ...userSnap.data() } 
            : { uid: currentUser.uid, role: "student" };
          setUser(userData);

          // 2. Fetch User Progress from "userPaths" sub-collection
          const progressSnap = await getDocs(collection(db, "users", currentUser.uid, "userPaths"));
          
          let lessonCount = 0;
          let completedPathsCount = 0;
          let earnedBadges = [];

          // 3. Process each path the user has interacted with
          const progressDocs = progressSnap.docs;
          
          for (const progressDoc of progressDocs) {
            const progressData = progressDoc.data();
            const pathId = progressDoc.id;
            const completedInThisPath = progressData.completedLessons?.length || 0;
            
            lessonCount += completedInThisPath;

            // To check if a path is FULLY completed, we need the total lesson count from the content collection
            const contentSnap = await getDoc(doc(db, "content", pathId));
            if (contentSnap.exists()) {
              const pathDetails = contentSnap.data();
              // Get total lessons in this path
              const lessonsMetaSnap = await getDocs(collection(db, "content", pathId, "lessons"));
              const totalLessonsInPath = lessonsMetaSnap.size;

              // If user completed all lessons, they get a badge
              if (completedInThisPath >= totalLessonsInPath && totalLessonsInPath > 0) {
                completedPathsCount++;
                earnedBadges.push({
                  id: pathId,
                  title: pathDetails.title,
                  desc: `Mastered all lessons in ${pathDetails.title}`,
                  icon: "🏆"
                });
              }
            }
          }

          setStats({
            totalLessons: lessonCount,
            completedPaths: completedPathsCount,
            badges: earnedBadges
          });

        } catch (error) {
          console.error("Error fetching achievements:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white min-vh-100">
      {/* CSS for Shadow Hover */}
      <style>
        {`
          .achievement-card {
            transition: all 0.3s ease;
          }
          .achievement-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 1rem 3rem rgba(0,0,0,0.1) !important;
          }
        `}
      </style>

      {/* PAGE HEADER */}
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

      {/* PAGE BODY */}
      <section className="py-5">
        <div className="container" style={{ minHeight: "520px" }}>

          {/* LOADING */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3"></div>
              <p className="text-muted">Calculating your accomplishments...</p>
            </div>
          )}

          {/* GUEST VIEW */}
          {!loading && !user && (
            <div className="text-center py-5">
              <p className="lead text-muted">
                Please log in to view achievements.
              </p>
              <Link to="/login" className="btn btn-primary btn-lg mt-3 rounded-pill px-5 shadow-sm">
                Log In
              </Link>
            </div>
          )}

          {/* LOGGED-IN VIEW */}
          {!loading && user && (
            <>
              {/* ACTION BAR */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Student Dashboard</h4>
                <div className="d-flex gap-2">
                  {user.role === "student" ? (
                    <Link to="/learningpaths" className="btn btn-primary rounded-pill px-4">
                      Continue Learning
                    </Link>
                  ) : (
                    <button className="btn btn-outline-primary rounded-pill px-4">
                      Create a Class
                    </button>
                  )}
                </div>
              </div>

              {/* SUMMARY CARDS */}
              <div className="row g-4 mb-5">
                <SummaryCard value={stats.badges.length} label="Total Badges" color="primary" />
                <SummaryCard value={stats.completedPaths} label="Completed Paths" color="success" />
                <SummaryCard value={stats.totalLessons} label="Lessons Completed" color="warning" />
              </div>

              {/* BADGES GRID */}
              <section className="bg-light py-5 rounded-4 shadow-sm">
                <div className="container">
                  <div className="mb-5 text-center">
                    <h2 className="fw-bold">Your Badge Collection</h2>
                    <p className="text-muted">
                      {stats.badges.length > 0 
                        ? "You've been busy! Here are your earned milestones." 
                        : "Start completing learning paths to unlock your first badge!"}
                    </p>
                  </div>

                  <div className="row g-4 justify-content-center">
                    {stats.badges.length > 0 ? (
                      stats.badges.map((badge) => (
                        <BadgeCard
                          key={badge.id}
                          icon={badge.icon}
                          title={badge.title}
                          desc={badge.desc}
                        />
                      ))
                    ) : (
                      <div className="col-12 text-center py-4">
                        <div className="display-1 text-muted opacity-25 mb-3">Empty</div>
                        <p className="text-muted">No badges earned yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* CTA */}
              <section className="py-5">
                <div className="bg-primary text-white rounded-4 p-5 text-center shadow">
                  <h2 className="fw-bold">Keep Earning Badges!</h2>
                  <p className="mt-3 mb-4 opacity-75">
                    Every lesson you finish brings you closer to your next achievement.
                  </p>
                  <Link
                    to="/learningpaths"
                    className="btn btn-light btn-lg fw-semibold rounded-pill px-5"
                  >
                    Explore Learning Paths
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

const SummaryCard = ({ value, label, color }) => (
  <div className="col-md-4">
    <div className="card border-0 shadow-sm rounded-4 text-center h-100 achievement-card">
      <div className="card-body p-4">
        <h1 className={`fw-bold text-${color} display-4`}>{value}</h1>
        <p className="text-uppercase fw-bold small text-muted mb-0">{label}</p>
      </div>
    </div>
  </div>
);

const BadgeCard = ({ icon, title, desc }) => (
  <div className="col-md-3">
    <div className="card h-100 border-0 shadow-sm rounded-4 text-center p-4 achievement-card">
      <div className="display-4 mb-3">{icon}</div>
      <h6 className="fw-bold mb-1">{title}</h6>
      <p className="text-muted small mb-0">{desc}</p>
      <div className="mt-3">
        <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">Unlocked</span>
      </div>
    </div>
  </div>
);

export default Achievements;