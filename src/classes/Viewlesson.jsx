import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function ViewLesson() {
  const location = useLocation();
  const navigate = useNavigate();
  const { classId, contentId } = location.state || {};

  const [user, setUser] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", content: "", videoUrl: "" });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return navigate("/login");
      
      // Fetch User Role
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      setUser({ uid: currentUser.uid, ...userDoc.data() });

      // Fetch Lesson Data
      if (classId && contentId) {
        const lessonSnap = await getDoc(doc(db, `classes/${classId}/content`, contentId));
        if (lessonSnap.exists()) {
          const data = lessonSnap.data();
          setLesson(data);
          setEditData(data); // Initialize edit form with current data
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId, contentId, navigate]);

  const handleSave = async () => {
    try {
      const lessonRef = doc(db, `classes/${classId}/content`, contentId);
      await updateDoc(lessonRef, editData);
      setLesson(editData);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating lesson:", err);
      alert("Failed to save changes.");
    }
  };

  if (loading) return <div className="text-center py-5">Loading Lesson...</div>;
  if (!lesson) return <div className="text-center py-5">Lesson not found.</div>;

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          
          {/* NAVIGATION & ACTIONS */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
              &larr; Back to Class
            </button>
            
            {user?.role === "professor" && (
              <div>
                {isEditing ? (
                  <>
                    <button className="btn btn-success btn-sm me-2" onClick={handleSave}>Save Changes</button>
                    <button className="btn btn-light btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                  </>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)}>Edit Lesson</button>
                )}
              </div>
            )}
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            {/* VIDEO SECTION (If URL exists) */}
            {lesson.videoUrl && !isEditing && (
              <div className="ratio ratio-16x9 bg-dark">
                <iframe 
                  src={lesson.videoUrl.replace("watch?v=", "embed/")} 
                  title="Lesson Video" 
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <div className="card-body p-4 p-md-5">
              {isEditing ? (
                /* EDIT VIEW */
                <div className="edit-form">
                  <label className="form-label fw-bold small text-muted">LESSON TITLE</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg mb-4" 
                    value={editData.title} 
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                  />

                  <label className="form-label fw-bold small text-muted">VIDEO URL (YOUTUBE)</label>
                  <input 
                    type="url" 
                    className="form-control mb-4" 
                    value={editData.videoUrl} 
                    onChange={(e) => setEditData({...editData, videoUrl: e.target.value})}
                  />

                  <label className="form-label fw-bold small text-muted">LESSON CONTENT</label>
                  <textarea 
                    className="form-control" 
                    rows="15" 
                    value={editData.content} 
                    onChange={(e) => setEditData({...editData, content: e.target.value})}
                  ></textarea>
                </div>
              ) : (
                /* READ VIEW (Student & Prof Default) */
                <article>
                  <h1 className="display-5 fw-bold mb-3">{lesson.title}</h1>
                  <hr className="my-4 opacity-10" />
                  <div className="lesson-text" style={{ whiteSpace: "pre-wrap", lineHeight: "1.8", fontSize: "1.1rem" }}>
                    {lesson.content}
                  </div>
                </article>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ViewLesson;