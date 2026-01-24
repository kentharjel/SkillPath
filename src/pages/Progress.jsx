import { useEffect, useState } from "react";
import { auth, db } from "../firebase"; // Ensure db is imported
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from "firebase/firestore";

function Progress() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Real Data State
  const [pathProgressData, setPathProgressData] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [stats, setStats] = useState({
    totalLessons: 0,
    pathsStarted: 0,
    classesJoined: 0
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
      // Query: Find classes where the 'students' array contains the user's UID
      const classesQuery = query(collection(db, "classes"), where("students", "array-contains", uid));
      const classesSnap = await getDocs(classesQuery);
      const classesList = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnrolledClasses(classesList);

      // 2. Fetch Learning Paths Progress
      // Get the tracking docs from users/{uid}/userPaths
      const userPathsSnap = await getDocs(collection(db, "users", uid, "userPaths"));
      
      const pathsPromises = userPathsSnap.docs.map(async (progressDoc) => {
        const pathId = progressDoc.id;
        const progressData = progressDoc.data(); // Contains completedLessons array
        const completedCount = progressData.completedLessons?.length || 0;

        // Fetch the actual Path details (Title, etc.)
        const pathContentDoc = await getDoc(doc(db, "content", pathId));
        
        if (!pathContentDoc.exists()) return null; // path might have been deleted
        const pathContent = pathContentDoc.data();

        // Fetch total lessons count for this path to calculate %
        // (Fetching the subcollection size)
        const lessonsSnap = await getDocs(collection(db, "content", pathId, "lessons"));
        const totalLessons = lessonsSnap.size;

        return {
          id: pathId,
          title: pathContent.title,
          completedCount,
          totalLessons,
          percent: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
          lastUpdated: progressData.updatedAt // For sorting recent activity
        };
      });

      // Wait for all path data to resolve
      const resolvedPaths = (await Promise.all(pathsPromises)).filter(p => p !== null);
      
      // Sort by recently updated if possible, otherwise just list
      resolvedPaths.sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));

      setPathProgressData(resolvedPaths);

      // 3. Calculate Global Stats
      const totalLessonsCompleted = resolvedPaths.reduce((acc, curr) => acc + curr.completedCount, 0);
      
      setStats({
        totalLessons: totalLessonsCompleted,
        pathsStarted: resolvedPaths.length,
        classesJoined: classesList.length
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
      {/* PAGE HEADER */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">My Progress</h1>
          <p className="lead text-muted mt-3">
            Track your learning progress, completed lessons, and class enrollments.
          </p>
        </div>
      </section>

      {/* PAGE BODY */}
      <section className="py-5">
        <div className="container" style={{ minHeight: "520px" }}>

          {/* LOADING */}
          {loading && (
            <div className="text-center text-muted py-5">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p>Loading your profile...</p>
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
                <OverviewCard 
                  value={`${getOverallProgress()}%`} 
                  label="Avg. Path Completion" 
                  highlight="primary" 
                />
                <OverviewCard 
                  value={stats.totalLessons} 
                  label="Total Lessons Finished" 
                />
                <OverviewCard 
                  value={stats.pathsStarted} 
                  label="Active Learning Paths" 
                />
                <OverviewCard 
                  value={stats.classesJoined} 
                  label="Classes Enrolled" 
                  highlight="success" 
                />
              </div>

              {/* LEARNING PATH PROGRESS */}
              <section className="mb-5">
                <div className="mb-4 d-flex justify-content-between align-items-end">
                  <div>
                    <h2 className="fw-bold">Learning Paths</h2>
                    <p className="text-muted mb-0">Courses you have started.</p>
                  </div>
                  <Link to="/learningpaths" className="btn btn-outline-secondary btn-sm">Find More Paths</Link>
                </div>

                <div className="row g-4">
                  {pathProgressData.length > 0 ? (
                    pathProgressData.map((path) => (
                      <PathCard
                        key={path.id}
                        pathId={path.id}
                        title={path.title}
                        progressText={`${path.completedCount} of ${path.totalLessons} lessons completed`}
                        percent={path.percent}
                        color={path.percent === 100 ? "success" : "primary"}
                      />
                    ))
                  ) : (
                    <div className="col-12 text-center py-5 bg-light rounded-4">
                        <p className="text-muted mb-2">You haven't started any learning paths yet.</p>
                        <Link to="/learningpaths" className="btn btn-primary btn-sm">Start Learning</Link>
                    </div>
                  )}
                </div>
              </section>

              {/* ENROLLED CLASSES */}
              <section className="mb-5">
                <div className="mb-4">
                  <h2 className="fw-bold">My Classes</h2>
                  <p className="text-muted">Classes you are currently enrolled in.</p>
                </div>

                <div className="row g-4">
                  {enrolledClasses.length > 0 ? (
                    enrolledClasses.map((cls) => (
                      <ClassCard 
                        key={cls.id} 
                        classData={cls} 
                      />
                    ))
                  ) : (
                     <div className="col-12 text-center py-5 bg-light rounded-4">
                        <p className="text-muted mb-2">You are not enrolled in any classes.</p>
                        <Link to="/classes" className="btn btn-primary btn-sm">Browse Classes</Link>
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

const PathCard = ({ pathId, title, progressText, percent, color }) => {
  const navigate = useNavigate();
  return (
    <div className="col-md-6">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4">
          <h5 className="fw-semibold">{title}</h5>
          <p className="text-muted small">{progressText}</p>

          <div className="progress mb-3" style={{ height: "8px" }}>
            <div
              className={`progress-bar bg-${color}`}
              style={{ width: `${percent}%` }}
            ></div>
          </div>

          <button 
            onClick={() => navigate("/viewpath", { state: { pathId } })}
            className="btn btn-outline-primary btn-sm rounded-pill px-4"
          >
            {percent === 100 ? "Review Path" : "Continue Learning"}
          </button>
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