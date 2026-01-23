import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Navigate } from "react-router-dom";
import {
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineUserAdd,
  AiOutlineSearch,
  AiOutlineUser,
  AiOutlineIdcard,
  AiOutlineExclamationCircle,
} from "react-icons/ai";

function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // --- MODAL STATES ---
  const [editTarget, setEditTarget] = useState(null); // stores {id, fullname}
  const [deleteTarget, setDeleteTarget] = useState(null); // stores id
  const [promoteTarget, setPromoteTarget] = useState(null); // stores {id, fullname}

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (!snap.exists() || snap.data().role !== "admin") {
        setUser("unauthorized");
        setLoading(false);
        return;
      }
      setUser({ uid: currentUser.uid, ...snap.data() });
      await fetchUsers();
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setStudents(all.filter((u) => u.role === "student"));
    setProfessors(all.filter((u) => u.role === "professor"));
  };

  /* MODAL HANDLERS */
  const handleConfirmEdit = async () => {
    if (!editTarget.fullname.trim()) return;
    await updateDoc(doc(db, "users", editTarget.id), { fullname: editTarget.fullname });
    setEditTarget(null);
    fetchUsers();
  };

  const handleConfirmDelete = async () => {
    await deleteDoc(doc(db, "users", deleteTarget));
    setDeleteTarget(null);
    fetchUsers();
  };

  const handleConfirmPromote = async () => {
    await updateDoc(doc(db, "users", promoteTarget.id), { role: "admin" });
    setPromoteTarget(null);
    fetchUsers();
  };

  const filterUsers = (list) =>
    list.filter(
      (u) =>
        u.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (!loading && !user) return <Navigate to="/login" />;
  if (!loading && user === "unauthorized") return <Navigate to="/" />;

  return (
    <div className="bg-light min-vh-100">
      {/* HEADER */}
      <div className="bg-white border-bottom shadow-sm mb-4">
        <div className="container py-4">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="fw-bold h3 mb-1">Admin Dashboard</h1>
              <p className="text-muted mb-0">Manage system users and access levels</p>
            </div>
            <div className="col-md-6 mt-3 mt-md-0">
              <div className="input-group shadow-sm rounded">
                <span className="input-group-text bg-white border-end-0">
                  <AiOutlineSearch className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container pb-5">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" />
            <p className="text-muted">Loading directory...</p>
          </div>
        ) : (
          <>
            <div className="row g-3 mb-5">
              <StatCard title="Total Students" count={students.length} icon={<AiOutlineUser />} color="primary" />
              <StatCard title="Total Professors" count={professors.length} icon={<AiOutlineIdcard />} color="success" />
            </div>

            <SectionWrapper title="Student Directory">
              <UserTable
                users={filterUsers(students)}
                onEdit={(u) => setEditTarget({ id: u.id, fullname: u.fullname })}
                onDelete={(id) => setDeleteTarget(id)}
              />
            </SectionWrapper>

            <SectionWrapper title="Professor Directory">
              <UserTable
                users={filterUsers(professors)}
                onEdit={(u) => setEditTarget({ id: u.id, fullname: u.fullname })}
                onDelete={(id) => setDeleteTarget(id)}
                onRegister={(u) => setPromoteTarget({ id: u.id, fullname: u.fullname })}
              />
            </SectionWrapper>
          </>
        )}
      </div>

      {/* --- EDIT MODAL --- */}
      {editTarget && (
        <ModalWrapper title="Edit User Profile" onClose={() => setEditTarget(null)}>
          <div className="mb-3">
            <label className="form-label small fw-bold">Full Name</label>
            <input
              className="form-control"
              value={editTarget.fullname}
              onChange={(e) => setEditTarget({ ...editTarget, fullname: e.target.value })}
              autoFocus
            />
          </div>
          <button className="btn btn-primary w-100" onClick={handleConfirmEdit}>Save Changes</button>
        </ModalWrapper>
      )}

      {/* --- DELETE MODAL --- */}
      {deleteTarget && (
        <ModalWrapper title="Confirm Deletion" onClose={() => setDeleteTarget(null)}>
          <div className="text-center py-3">
            <AiOutlineExclamationCircle className="text-danger display-4 mb-3" />
            <p>Are you sure you want to delete this user? This action is permanent.</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-danger w-100" onClick={handleConfirmDelete}>Delete User</button>
            <button className="btn btn-light border w-100" onClick={() => setDeleteTarget(null)}>Cancel</button>
          </div>
        </ModalWrapper>
      )}

      {/* --- PROMOTE MODAL --- */}
      {promoteTarget && (
        <ModalWrapper title="Grant Admin Privileges" onClose={() => setPromoteTarget(null)}>
          <div className="text-center py-3">
            <AiOutlineUserAdd className="text-success display-4 mb-3" />
            <p>Promote <strong>{promoteTarget.fullname}</strong> to Administrator status?</p>
          </div>
          <button className="btn btn-success w-100" onClick={handleConfirmPromote}>Confirm Promotion</button>
        </ModalWrapper>
      )}
    </div>
  );
}

/* HELPER COMPONENTS */
function StatCard({ title, count, icon, color }) {
  return (
    <div className="col-md-6">
      <div className={`card border-0 border-start border-4 border-${color} shadow-sm rounded-3`}>
        <div className="card-body d-flex align-items-center justify-content-between">
          <div>
            <p className="text-muted small text-uppercase mb-1 fw-bold">{title}</p>
            <h2 className="mb-0 fw-bolder">{count}</h2>
          </div>
          <div className={`h1 mb-0 text-${color} opacity-25`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function SectionWrapper({ title, children }) {
  return (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-5">
      <div className="card-header bg-white py-3 border-bottom">
        <h5 className="mb-0 fw-bold text-dark">{title}</h5>
      </div>
      <div className="card-body p-0">{children}</div>
    </div>
  );
}

function ModalWrapper({ title, children, onClose }) {
  return (
    <div className="modal d-block shadow-lg" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4">
          <div className="modal-header border-0 pb-0">
            <h6 className="modal-title fw-bold">{title}</h6>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function UserTable({ users, onEdit, onDelete, onRegister }) {
  if (users.length === 0) {
    return (
      <div className="text-center py-5 text-muted small">No records found.</div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr className="small text-uppercase fw-bold">
            <th className="px-4 py-3">Name</th>
            <th className="py-3">Email</th>
            <th className="text-center py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4">
                <div className="d-flex align-items-center">
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style={{ width: "36px", height: "36px", border: "1px solid #eee" }}>
                    <span className="small fw-bold text-secondary">{u.fullname?.charAt(0)}</span>
                  </div>
                  <span className="fw-semibold text-dark">{u.fullname}</span>
                </div>
              </td>
              <td className="text-muted small">{u.email}</td>
              <td className="text-center px-4">
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-white btn-sm border shadow-sm" onClick={() => onEdit(u)} title="Edit">
                    <AiOutlineEdit className="text-primary" />
                  </button>
                  {onRegister && (
                    <button className="btn btn-white btn-sm border shadow-sm" onClick={() => onRegister(u)} title="Make Admin">
                      <AiOutlineUserAdd className="text-success" />
                    </button>
                  )}
                  <button className="btn btn-white btn-sm border shadow-sm" onClick={() => onDelete(u.id)} title="Delete">
                    <AiOutlineDelete className="text-danger" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Admin;