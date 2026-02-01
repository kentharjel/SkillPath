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
  deleteDoc,
  arrayUnion, 
  arrayRemove,
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

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    classId: null
  });

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

  /* TRIGGER DELETE MODAL */
  const triggerDelete = (classId, className) => {
    setConfirmModal({
      show: true,
      title: "Delete Class",
      message: `Are you sure you want to delete "${className}"? This action cannot be undone and all student data will be lost.`,
      onConfirm: async () => {
        await deleteDoc(doc(db, "classes", classId));
        fetchClasses(user);
      }
    });
  };

  /* TRIGGER UNENROLL MODAL */
  const triggerUnenroll = (classId, className) => {
    setConfirmModal({
      show: true,
      title: "Unenroll Class",
      message: `Are you sure you want to unenroll from "${className}"?`,
      onConfirm: async () => {
        await updateDoc(doc(db, "classes", classId), {
          students: arrayRemove(user.uid)
        });
        fetchClasses(user);
      }
    });
  };

  const handleConfirmAction = async () => {
    if (confirmModal.onConfirm) {
      await confirmModal.onConfirm();
    }
    setConfirmModal({ ...confirmModal, show: false });
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
              <div className="col-12 text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-3 text-muted">Loading classes...</p>
              </div>
            ) : !user ? (
              /* UPDATED GUEST UI */
              <div className="col-12">
                <div className="text-center py-5 px-4 bg-white rounded-4 border shadow-sm">
                  <div className="display-1 mb-4">🏫</div>
                  <h2 className="fw-bold text-dark">Your Digital Classroom Awaits</h2>
                  <p className="text-muted mx-auto mb-4" style={{ maxWidth: "600px" }}>
                    Join a class with a code from your professor or create your own academic hub. 
                    Sign in to sync your progress across all your devices.
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <Link to="/login" className="btn btn-primary btn-lg px-5 rounded-pill shadow-sm">
                      Log In to Start
                    </Link>
                    <Link to="/getstarted" className="btn btn-outline-dark btn-lg px-5 rounded-pill">
                      Register
                    </Link>
                  </div>
                </div>
              </div>
            ) : classList.length > 0 ? (
              classList.map(cls => (
                <ClassCard 
                  key={cls.id} 
                  cls={cls} 
                  userRole={user.role} 
                  onDelete={() => triggerDelete(cls.id, cls.className)} 
                  onUnenroll={() => triggerUnenroll(cls.id, cls.className)}
                />
              ))
            ) : (
              <div className="col-12 text-center py-5 text-muted">
                <div className="mb-3 display-4 opacity-25">📂</div>
                <h5>No classes found</h5>
                <p>Join or create one to get started!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <form className="modal-content border-0 shadow rounded-4" onSubmit={handleJoinClass}>
              <div className="modal-header border-0"><h5>Join Class</h5></div>
              <div className="modal-body">
                <input className="form-control form-control-lg" placeholder="Enter 6-digit Class Code" value={classCodeInput} onChange={e => setClassCodeInput(e.target.value)} required />
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-light" onClick={() => setShowJoinModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-4">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <form className="modal-content border-0 shadow rounded-4" onSubmit={handleCreateClass}>
              <div className="modal-header border-0"><h5>Create New Class</h5></div>
              <div className="modal-body">
                <input className="form-control form-control-lg" placeholder="Class Name (e.g. CS-101)" value={newClassName} onChange={e => setNewClassName(e.target.value)} required />
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-light" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-4">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL CONFIRMATION MODAL */}
      {confirmModal.show && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 pt-4 px-4">
                <h5 className="fw-bold text-danger mb-0">{confirmModal.title}</h5>
              </div>
              <div className="modal-body px-4 py-3">
                <p className="text-muted mb-0">{confirmModal.message}</p>
              </div>
              <div className="modal-footer border-0 pb-4 px-4">
                <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</button>
                <button type="button" className="btn btn-danger rounded-pill px-4" onClick={handleConfirmAction}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const ClassCard = ({ cls, userRole, onDelete, onUnenroll }) => (
  <div className="col-md-4">
    <div className="card h-100 border-0 shadow-sm rounded-4">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start">
            <span className="badge bg-primary mb-3">Class</span>
            {userRole === "professor" ? (
              <div className="text-end">
                <span className="text-primary d-block fw-bold small">{cls.classCode}</span>
                <button 
                  onClick={onDelete} 
                  className="btn btn-sm text-danger p-0 mt-1" 
                  style={{ fontSize: "0.75rem" }}
                >
                  Delete Class
                </button>
              </div>
            ) : (
              <button 
                onClick={onUnenroll} 
                className="btn btn-sm text-danger p-0" 
                style={{ fontSize: "0.75rem" }}
              >
                Unenroll
              </button>
            )}
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