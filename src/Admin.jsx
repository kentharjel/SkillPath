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
} from "react-icons/ai";

function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);

  /* AUTH + ROLE CHECK */
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

  /* FETCH USERS */
  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setStudents(all.filter((u) => u.role === "student"));
    setProfessors(all.filter((u) => u.role === "professor"));
  };

  /* EDIT USER */
  const handleEditUser = async (u) => {
    const newName = prompt("Enter new full name:", u.fullname);
    if (!newName) return;

    await updateDoc(doc(db, "users", u.id), { fullname: newName });
    fetchUsers();
  };

  /* DELETE USER */
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    await deleteDoc(doc(db, "users", id));
    fetchUsers();
  };

  /* REGISTER ADMIN (PROFESSORS ONLY) */
  const handleRegisterAdmin = async (prof) => {
    if (
      !window.confirm(
        `Register "${prof.fullname}" as an Admin?\nThis action grants full access.`
      )
    )
      return;

    await updateDoc(doc(db, "users", prof.id), {
      role: "admin",
    });

    alert("Professor successfully registered as Admin.");
    fetchUsers();
  };

  /* ROUTE GUARDS */
  if (!loading && !user) return <Navigate to="/login" />;
  if (!loading && user === "unauthorized") return <Navigate to="/" />;

  return (
    <>
      {/* HEADER */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5">Admin Dashboard</h1>
          <p className="lead text-muted mt-3">
            Manage users and administrative access.
          </p>
        </div>
      </section>

      {/* BODY */}
      <section className="py-5">
        <div className="container" style={{ minHeight: "500px" }}>
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border text-primary mb-3" />
              <p>Loading admin dashboard...</p>
            </div>
          ) : (
            <>
              {/* STUDENTS */}
              <UserTable
                title="Students"
                users={students}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
              />

              {/* PROFESSORS */}
              <UserTable
                title="Professors"
                users={professors}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
              />

              {/* REGISTER ADMIN */}
              <RegisterAdminTable
                professors={professors}
                onRegister={handleRegisterAdmin}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}

/* REUSABLE USER TABLE */
function UserTable({ title, users, onEdit, onDelete }) {
  return (
    <div className="mb-5">
      <h3 className="fw-bold mb-3">{title}</h3>

      <div className="table-responsive">
        <table
          className="table table-bordered table-hover"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "55%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>

          <thead className="table-light">
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="text-truncate" title={u.fullname}>
                  {u.fullname || "Unnamed"}
                </td>
                <td className="text-truncate" title={u.email}>
                  {u.email || "No email"}
                </td>
                <td className="text-center">
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => onEdit(u)}
                  >
                    <AiOutlineEdit />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDelete(u.id)}
                  >
                    <AiOutlineDelete />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* REGISTER ADMIN TABLE */
function RegisterAdminTable({ professors, onRegister }) {
  return (
    <div className="mb-5">
      <h3 className="fw-bold mb-3">Register Admin (Professors Only)</h3>

      <div className="table-responsive">
        <table
          className="table table-bordered table-hover"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "60%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead className="table-light">
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th className="text-center">Register</th>
            </tr>
          </thead>

          <tbody>
            {professors.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center text-muted py-4">
                  No professors available.
                </td>
              </tr>
            ) : (
              professors.map((p) => (
                <tr key={p.id}>
                  <td className="text-truncate" title={p.fullname}>
                    {p.fullname || "Unnamed"}
                  </td>
                  <td className="text-truncate" title={p.email}>
                    {p.email || "No email"}
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => onRegister(p)}
                      title="Register as Admin"
                    >
                      <AiOutlineUserAdd />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin;
