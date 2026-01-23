import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp 
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

function Classes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classList, setClassList] = useState([]);
  
  // Modal States
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classCodeInput, setClassCodeInput] = useState("");
  const [newClassName, setNewClassName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        const userData = snap.exists() 
          ? { uid: currentUser.uid, ...snap.data() } 
          : { uid: currentUser.uid, role: "student" };
        setUser(userData);
        fetchClasses(userData);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchClasses = async (userData) => {
    try {
      let q;
      if (userData.role === "professor") {
        q = query(collection(db, "classes"), where("professorId", "==", userData.uid));
      } else {
        q = query(collection(db, "classes"), where("students", "array-contains", userData.uid));
      }
      const snap = await getDocs(q);
      setClassList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  /* PROFESSOR: CREATE CLASS */
  const handleCreateClass = async (e) => {
    e.preventDefault();
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await addDoc(collection(db, "classes"), {
      className: newClassName,
      classCode: generatedCode,
      professorId: user.uid,
      professorName: user.fullname || "Professor",
      students: [],
      createdAt: serverTimestamp(),
    });

    setNewClassName("");
    setShowCreateModal(false);
    fetchClasses(user);
  };

  /* STUDENT: JOIN CLASS */
  const handleJoinClass = async (e) => {
    e.preventDefault();
    const q = query(collection(db, "classes"), where("classCode", "==", classCodeInput.trim()));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert("Invalid Class Code");
      return;
    }

    const classDoc = snap.docs[0];
    await updateDoc(doc(db, "classes", classDoc.id), {
      students: arrayUnion(user.uid)
    });

    setClassCodeInput("");
    setShowJoinModal(false);
    fetchClasses(user);
  };

  return (
    <>
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">Classes</h1>
          <p className="lead text-muted mt-3">Manage your academic spaces and progress.</p>
        </div>
      </section>

      <section className="py-5">
        <div className="container" style={{ minHeight: "420px" }}>
          
          {/* ACTION BAR */}
          <div className="d-flex justify-content-end mb-4 gap-2">
            {!loading && user?.role === "student" && (
              <button className="btn btn-primary" onClick={() => setShowJoinModal(true)}>Join a Class</button>
            )}
            {!loading && user?.role === "professor" && (
              <button className="btn btn-outline-primary" onClick={() => setShowCreateModal(true)}>Create a Class</button>
            )}
          </div>

          <div className="row g-4">
            {loading ? (
              <div className="text-center py-5">Loading classes...</div>
            ) : !user ? (
              <div className="text-center py-5">
                <p className="lead text-muted">Please log in to view classes.</p>
                <Link to="/login" className="btn btn-primary btn-lg mt-3">Log In</Link>
              </div>
            ) : classList.length > 0 ? (
              classList.map(cls => (
                <ClassCard key={cls.id} cls={cls} userRole={user.role} />
              ))
            ) : (
              <div className="text-center py-5 text-muted">No classes found. Join or create one to get started!</div>
            )}
          </div>
        </div>
      </section>

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleJoinClass}>
              <div className="modal-header"><h5>Join Class</h5></div>
              <div className="modal-body">
                <input className="form-control" placeholder="Enter 6-digit Class Code" value={classCodeInput} onChange={e => setClassCodeInput(e.target.value)} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleCreateClass}>
              <div className="modal-header"><h5>Create New Class</h5></div>
              <div className="modal-body">
                <input className="form-control" placeholder="Class Name (e.g. CS-101)" value={newClassName} onChange={e => setNewClassName(e.target.value)} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const ClassCard = ({ cls, userRole }) => (
  <div className="col-md-4">
    <div className="card h-100 border-0 shadow-sm rounded-4">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between">
            <span className="badge bg-primary mb-3">Class</span>
            {userRole === "professor" && <span className="text-primary fw-bold small">{cls.classCode}</span>}
        </div>
        <h5 className="fw-bold">{cls.className}</h5>
        <ul className="list-unstyled small text-muted mt-3">
          <li>👨‍🏫 {cls.professorName}</li>
          <li>👥 {cls.students?.length || 0} Students</li>
        </ul>
        <Link to="/viewclass" state={{ classId: cls.id }} className="btn btn-outline-primary btn-sm mt-3 w-100">
          View Class
        </Link>
      </div>
    </div>
  </div>
);

export default Classes;