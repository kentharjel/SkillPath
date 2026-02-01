import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  collectionGroup
} from "firebase/firestore";

function Progress() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [pathProgressData, setPathProgressData] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [classroomQuizzes, setClassroomQuizzes] = useState([]);
  const [stats, setStats] = useState({
    totalLessons: 0,
    pathsStarted: 0,
    classesJoined: 0,
    quizzesPassed: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchStudentData(currentUser.uid);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchStudentData = async (uid) => {
    try {
      // 1. Fetch Enrolled Classes
      const classesQuery = query(collection(db, "classes"), where("students", "array-contains", uid));
      const classesSnap = await getDocs(classesQuery);
      const classesList = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnrolledClasses(classesList);

      // 2. Fetch Classroom Quiz Attempts
      let allAttempts = [];
      for (const cls of classesList) {
        const attemptsRef = collection(db, `classes/${cls.id}/attempts`);
        const q = query(attemptsRef, where("studentId", "==", uid));
        const snap = await getDocs(q);
        snap.forEach(doc => allAttempts.push({ id: doc.id, ...doc.data(), className: cls.className }));
      }
      setClassroomQuizzes(allAttempts);

      // 3. Fetch Learning Paths Progress
      const userPathsSnap = await getDocs(collection(db, "users", uid, "userPaths"));
      const pathsPromises = userPathsSnap.docs.map(async (progressDoc) => {
        const pathId = progressDoc.id;
        const progressData = progressDoc.data();
        const completedCount = progressData.completedLessons?.length || 0;
        
        // Quiz progress in Path
        const quizCount = Object.keys(progressData.studentAnswers || {}).length;
        const perfectQuizzes = Object.values(progressData.studentAnswers || {}).filter(q => q.isPerfect).length;

        const pathContentDoc = await getDoc(doc(db, "content", pathId));
        if (!pathContentDoc.exists()) return null;
        const pathContent = pathContentDoc.data();

        const lessonsSnap = await getDocs(collection(db, "content", pathId, "lessons"));
        const totalLessons = lessonsSnap.size;

        return {
          id: pathId,
          title: pathContent.title,
          completedCount,
          totalLessons,
          perfectQuizzes,
          percent: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
          lastUpdated: progressData.updatedAt
        };
      });

      const resolvedPaths = (await Promise.all(pathsPromises)).filter(p => p !== null);
      resolvedPaths.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
      setPathProgressData(resolvedPaths);

      // 4. Calculate Global Stats
      const totalLessonsCompleted = resolvedPaths.reduce((acc, curr) => acc + curr.completedCount, 0);
      const totalPathQuizzes = resolvedPaths.reduce((acc, curr) => acc + curr.perfectQuizzes, 0);
      
      setStats({
        totalLessons: totalLessonsCompleted,
        pathsStarted: resolvedPaths.length,
        classesJoined: classesList.length,
        quizzesPassed: totalPathQuizzes + allAttempts.length
      });

    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOverallProgress = () => {
    if (pathProgressData.length === 0) return 0;
    const totalPercent = pathProgressData.reduce((acc, curr) => acc + curr.percent, 0);
    return Math.round(totalPercent / pathProgressData.length);
  };

  return (
    <>
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">My Progress</h1>
          <p className="lead text-muted mt-3">Track your learning journey, quiz scores, and class performance.</p>
        </div>
      </section>

      <section className="py-5">
        <div className="container" style={{ minHeight: "520px" }}>
          {loading && (
            <div className="text-center text-muted py-5">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p>Loading your profile...</p>
            </div>
          )}

          {!loading && !user && (
            /* UPDATED GUEST UI */
            <div className="row justify-content-center">
              <div className="col-lg-8 text-center py-5 px-4 bg-white rounded-4 border shadow-sm">
                <div className="display-1 mb-4">📊</div>
                <h2 className="fw-bold text-dark">Analyze Your Growth</h2>
                <p className="text-muted mx-auto mb-4" style={{ maxWidth: "550px" }}>
                  Sign in to view your personalized dashboard. Track lesson completion, 
                  quiz performance across classes, and earn certificates as you progress.
                </p>
                <div className="row g-3 justify-content-center mb-4 text-start">
                  <div className="col-sm-5 col-md-4">
                    <div className="p-3 bg-light rounded-3 small">
                      ✅ <strong>Lesson Tracking</strong>
                    </div>
                  </div>
                  <div className="col-sm-5 col-md-4">
                    <div className="p-3 bg-light rounded-3 small">
                      📈 <strong>Skill Analytics</strong>
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/login" className="btn btn-primary btn-lg px-5 rounded-pill shadow-sm">
                    Log In
                  </Link>
                  <Link to="/getstarted" className="btn btn-outline-dark btn-lg px-5 rounded-pill">
                    Join SkillPath
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!loading && user && (
            <>
              <div className="row g-4 mb-5">
                <OverviewCard value={`${getOverallProgress()}%`} label="Avg. Path Completion" highlight="primary" />
                <OverviewCard value={stats.totalLessons} label="Lessons Finished" />
                <OverviewCard value={stats.quizzesPassed} label="Quizzes Passed" highlight="warning" />
                <OverviewCard value={stats.classesJoined} label="Classes Joined" highlight="success" />
              </div>

              {/* LEARNING PATHS SECTION */}
              <section className="mb-5">
                <h2 className="fw-bold mb-4">Learning Paths</h2>
                <div className="row g-4">
                  {pathProgressData.length > 0 ? (
                    pathProgressData.map((path) => (
                      <PathCard key={path.id} path={path} />
                    ))
                  ) : (
                    <div className="col-12 text-center py-5 bg-light rounded-4">
                      <p className="text-muted">No paths started.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* QUIZ PERFORMANCE SECTION */}
              <section className="mb-5">
                <h2 className="fw-bold mb-4">Classroom Quiz Attempts</h2>
                <div className="row g-4">
                  {classroomQuizzes.length > 0 ? (
                    classroomQuizzes.map((quiz) => (
                      <div key={quiz.id} className="col-md-4">
                        <div className="card border-0 shadow-sm rounded-4 h-100">
                          <div className="card-body d-flex align-items-center gap-3">
                            <CircularGauge percent={quiz.score} color={quiz.score >= 70 ? "success" : "primary"} />
                            <div>
                              <h6 className="fw-bold mb-0">{quiz.quizTitle}</h6>
                              <small className="text-muted">{quiz.className}</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-12 text-center py-4 bg-light rounded-4">
                      <p className="text-muted">No classroom quizzes taken yet.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* ENROLLED CLASSES */}
              <section className="mb-5">
                <h2 className="fw-bold mb-4">My Classes</h2>
                <div className="row g-4">
                  {enrolledClasses.length > 0 ? (
                    enrolledClasses.map((cls) => (
                      <ClassCard key={cls.id} classData={cls} />
                    ))
                  ) : (
                      <div className="col-12 text-center py-5 bg-light rounded-4">
                        <p className="text-muted">No enrollments found.</p>
                    </div>
                  )}
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

const CircularGauge = ({ percent, color }) => (
  <div 
    className={`gauge-circle ${color === 'success' ? 'gauge-success' : ''}`} 
    style={{ "--percentage": `${percent}%` }}
  >
    {percent}%
  </div>
);

const OverviewCard = ({ value, label, highlight }) => (
  <div className="col-md-3">
    <div className="card border-0 shadow-sm rounded-4 text-center h-100">
      <div className="card-body p-4">
        <h2 className={`fw-bold ${highlight ? `text-${highlight}` : ""}`}>{value}</h2>
        <p className="text-muted mb-0">{label}</p>
      </div>
    </div>
  </div>
);

const PathCard = ({ path }) => {
  const navigate = useNavigate();
  return (
    <div className="col-md-6">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4 d-flex justify-content-between align-items-center">
          <div className="flex-grow-1">
            <h5 className="fw-semibold mb-1">{path.title}</h5>
            <p className="text-muted small mb-2">{path.completedCount} / {path.totalLessons} Lessons</p>
            <div className="badge bg-light text-dark border small">
              🏆 {path.perfectQuizzes} Perfect Quizzes
            </div>
            <div className="mt-3">
                <button 
                onClick={() => navigate("/viewpath", { state: { pathId: path.id } })}
                className="btn btn-primary btn-sm rounded-pill px-4"
                >
                Continue
                </button>
            </div>
          </div>
          <CircularGauge percent={path.percent} color={path.percent === 100 ? "success" : "primary"} />
        </div>
      </div>
    </div>
  );
};

const ClassCard = ({ classData }) => {
    const navigate = useNavigate();
    return (
        <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 border-start border-4 border-warning">
                <div className="card-body p-4">
                    <h5 className="fw-bold mb-1">{classData.className}</h5>
                    <p className="text-muted small mb-3">Prof. {classData.professorName}</p>
                    <div className="d-grid">
                        <button 
                            className="btn btn-sm btn-light text-primary fw-bold"
                            onClick={() => navigate("/viewclass", { state: { classId: classData.id } })}
                        >
                            Go to Class →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Progress;