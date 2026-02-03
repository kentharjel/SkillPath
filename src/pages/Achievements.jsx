import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";

function Achievements() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- REAL DATA STATES ---
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedPaths: 0,
    quizzesPassed: 0,
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

          let lessonCount = 0;
          let completedPathsCount = 0;
          let quizCount = 0;
          let earnedBadges = [];

          // 2. Fetch Learning Paths Progress
          const progressSnap = await getDocs(collection(db, "users", currentUser.uid, "userPaths"));

          for (const progressDoc of progressSnap.docs) {
            const progressData = progressDoc.data();
            const pathId = progressDoc.id;
            
            const completedInThisPath = progressData.completedLessons?.length || 0;
            lessonCount += completedInThisPath;

            if (progressData.quizScores) {
              quizCount += Object.keys(progressData.quizScores).length;
            }

            const contentSnap = await getDoc(doc(db, "content", pathId));
            if (contentSnap.exists()) {
              const pathDetails = contentSnap.data();
              const lessonsMetaSnap = await getDocs(collection(db, "content", pathId, "lessons"));
              const totalLessonsInPath = lessonsMetaSnap.size;

              if (completedInThisPath >= totalLessonsInPath && totalLessonsInPath > 0) {
                completedPathsCount++;
                earnedBadges.push({
                  id: `path-${pathId}`,
                  title: `${pathDetails.title} Expert`,
                  desc: `Mastered every lesson and quiz in this path.`,
                  icon: "🎓",
                  category: "Mastery"
                });
              }
            }
          }

          // 3. Fetch Classroom Quizzes (TakeQuiz)
          const classesQuery = query(collection(db, "classes"), where("students", "array-contains", currentUser.uid));
          const classesSnap = await getDocs(classesQuery);
          
          for (const classDoc of classesSnap.docs) {
            const attemptsRef = collection(db, `classes/${classDoc.id}/attempts`);
            const q = query(attemptsRef, where("studentId", "==", currentUser.uid));
            const attemptSnaps = await getDocs(q);

            attemptSnaps.forEach(attemptDoc => {
              const attempt = attemptDoc.data();
              quizCount++;
              
              if (attempt.score === 100) {
                earnedBadges.push({
                  id: `ace-${attemptDoc.id}`,
                  title: "Exam Ace",
                  desc: `Perfect 100% score in ${attempt.quizTitle || 'Class Quiz'}.`,
                  icon: "🌟",
                  category: "Quiz"
                });
              }
            });
          }

          // 4. Milestone Badges
          if (quizCount >= 1) {
            earnedBadges.push({
              id: "quiz-starter", title: "Test Taker", desc: "Completed your first assessment.", icon: "📝", category: "Milestone"
            });
          }
          if (lessonCount >= 5) {
            earnedBadges.push({
              id: "growing", title: "On a Roll", desc: "Completed 5 lessons across your paths.", icon: "🚀", category: "Milestone"
            });
          }

          setStats({
            totalLessons: lessonCount,
            completedPaths: completedPathsCount,
            quizzesPassed: quizCount,
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
      <style>
        {`
          .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
          .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 1rem 3rem rgba(0,0,0,0.1) !important; }
          .ls-tight { letter-spacing: -0.5px; }
          .btn-no-anim, .btn-no-anim:hover, .btn-no-anim:active, .btn-no-anim:focus { 
            transition: none !important; 
            transform: none !important; 
            animation: none !important;
          }
        `}
      </style>

      <header className="py-5 border-bottom bg-light">
        <div className="container py-4 text-center">
          <span className="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill mb-2 px-3 fw-bold">Hall of Fame</span>
          <h1 className="fw-bold display-5 text-dark ls-tight">Achievements & Badges</h1>
          <p className="lead text-muted mx-auto mt-3" style={{ maxWidth: "700px" }}>
            Track your milestones from both your independent Learning Paths and your Classroom Quizzes.
          </p>
        </div>
      </header>

      <main className="py-5">
        <div className="container" style={{ minHeight: "500px" }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="text-muted mt-3">Fetching your rewards...</p>
            </div>
          ) : !user ? (
            /* UPDATED GUEST VIEW UI */
            <div className="row justify-content-center">
              <div className="col-lg-8 text-center py-5 px-4 bg-white rounded-4 border shadow-sm">
                <div className="display-1 mb-4">🏅</div>
                <h2 className="fw-bold text-dark">Celebrate Your Milestones</h2>
                <p className="text-muted mx-auto mb-4" style={{ maxWidth: "550px" }}>
                  Earn digital badges as you complete lessons, master learning paths, and ace classroom quizzes. 
                  Start building your professional showcase today.
                </p>
                <div className="row g-3 justify-content-center mb-4 text-start">
                  <div className="col-sm-5 col-md-4">
                    <div className="p-3 bg-light rounded-3 small">
                      ⭐ <strong>Skill Mastery</strong>
                    </div>
                  </div>
                  <div className="col-sm-5 col-md-4">
                    <div className="p-3 bg-light rounded-3 small">
                      🏆 <strong>Quiz Rewards</strong>
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/login" className="btn btn-primary btn-lg px-5 rounded-pill shadow-sm btn-no-anim">
                    Log In
                  </Link>
                  <Link to="/getstarted" className="btn btn-outline-dark btn-lg px-5 rounded-pill btn-no-anim">
                    Join Now
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* STATS SUMMARY */}
              <div className="row g-4 mb-5">
                <SummaryCard value={stats.badges.length} label="Badges Earned" color="primary" bg="bg-primary-subtle" icon="🏅" />
                <SummaryCard value={stats.quizzesPassed} label="Quizzes Taken" color="warning" bg="bg-warning-subtle" icon="📝" />
                <SummaryCard value={stats.completedPaths} label="Paths Mastered" color="success" bg="bg-success-subtle" icon="🎓" />
              </div>

              <div className="p-4 p-md-5 rounded-4 bg-light border shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
                  <div>
                    <h2 className="fw-bold mb-0">Digital Showcase</h2>
                    <p className="text-muted mb-0">Rewards for lessons and classroom performance.</p>
                  </div>
                  <Link to="/learningpaths" className="btn btn-white border rounded-pill shadow-sm px-4 btn-no-anim">
                    Earn More
                  </Link>
                </div>

                <div className="row g-4">
                  {stats.badges.length > 0 ? (
                    stats.badges.map((badge) => (
                      <BadgeCard key={badge.id} badge={badge} />
                    ))
                  ) : (
                    <div className="col-12 text-center py-5">
                      <div className="display-1 opacity-25 mb-3">🛡️</div>
                      <h5>No badges yet</h5>
                      <p className="text-muted">Take a quiz or finish a lesson to start your collection!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="mt-5 p-5 rounded-4 bg-primary text-white text-center shadow">
                <h2 className="fw-bold mb-3">Keep the Momentum!</h2>
                <p className="opacity-75 mb-4">Every quiz you take and every lesson you finish adds to your skills.</p>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/learningpaths" className="btn btn-light rounded-pill px-4 fw-bold btn-no-anim">
                    Independent Paths
                  </Link>
                  <Link to="/progress" className="btn btn-outline-light rounded-pill px-4 btn-no-anim">
                    View Class Progress
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const SummaryCard = ({ value, label, color, bg, icon }) => (
  <div className="col-md-4">
    <div className={`card border-0 rounded-4 p-4 hover-lift h-100 ${bg}`}>
      <div className="card-body d-flex align-items-center">
        <div className="display-6 me-3">{icon}</div>
        <div>
          <h2 className={`fw-black text-${color} mb-0`}>{value}</h2>
          <span className="text-uppercase fw-bold small text-muted">{label}</span>
        </div>
      </div>
    </div>
  </div>
);

const BadgeCard = ({ badge }) => (
  <div className="col-sm-6 col-md-4 col-lg-3">
    <div className="card h-100 border-0 shadow-sm rounded-4 text-center p-4 hover-lift bg-white">
      <div className="display-4 mb-3">{badge.icon}</div>
      <h6 className="fw-bold mb-1">{badge.title}</h6>
      <p className="text-muted small mb-3">{badge.desc}</p>
      <div className="mt-auto">
        <span className={`badge rounded-pill px-3 py-2 ${
          badge.category === 'Quiz' ? 'bg-warning-subtle text-warning' :
          badge.category === 'Mastery' ? 'bg-primary-subtle text-primary' :
          'bg-success-subtle text-success'
        }`}>
          {badge.category}
        </span>
      </div>
    </div>
  </div>
);

export default Achievements;