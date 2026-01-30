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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", content: "", videoUrl: "", links: [] });
  
  // State for the new link being typed in edit mode
  const [newLinkInput, setNewLinkInput] = useState({ title: "", url: "" });

  const getLinkIcon = (url) => {
    try {
      const domain = new URL(url).hostname;
      return (
        <img 
          src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`} 
          alt="icon" 
          style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '3px' }} 
        />
      );
    } catch (e) {
      return <span>🔗</span>;
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return navigate("/login");
      
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      setUser({ uid: currentUser.uid, ...userDoc.data() });

      if (classId && contentId) {
        const lessonSnap = await getDoc(doc(db, `classes/${classId}/content`, contentId));
        if (lessonSnap.exists()) {
          const data = lessonSnap.data();
          setLesson(data);
          setEditData({
            ...data,
            links: data.links || [] // Ensure links is always an array
          }); 
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId, contentId, navigate]);

  // --- EDIT MODE LINK HELPERS ---
  const addLinkToEdit = () => {
    if (!newLinkInput.title || !newLinkInput.url) return;
    setEditData({
      ...editData,
      links: [...editData.links, newLinkInput]
    });
    setNewLinkInput({ title: "", url: "" });
  };

  const removeLinkFromEdit = (index) => {
    const updatedLinks = editData.links.filter((_, i) => i !== index);
    setEditData({ ...editData, links: updatedLinks });
  };

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
                <div className="edit-form">
                  <label className="form-label fw-bold small text-muted">LESSON TITLE</label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg mb-4" 
                    value={editData.title} 
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                  />

                  <label className="form-label fw-bold small text-muted">LESSON CONTENT</label>
                  <textarea 
                    className="form-control mb-4" 
                    rows="10" 
                    value={editData.content} 
                    onChange={(e) => setEditData({...editData, content: e.target.value})}
                  ></textarea>

                  {/* --- EDIT LINKS MANAGER --- */}
                  <div className="p-3 bg-light rounded-3 border">
                    <label className="form-label fw-bold small text-primary">MANAGE RESOURCES</label>
                    
                    {/* Add Link Row */}
                    <div className="input-group input-group-sm mb-3">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Link Title" 
                        value={newLinkInput.title}
                        onChange={(e) => setNewLinkInput({...newLinkInput, title: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="URL (https://...)" 
                        value={newLinkInput.url}
                        onChange={(e) => setNewLinkInput({...newLinkInput, url: e.target.value})}
                      />
                      <button className="btn btn-primary" type="button" onClick={addLinkToEdit}>Add</button>
                    </div>

                    {/* Current Links List */}
                    <div className="d-flex flex-wrap gap-2">
                      {editData.links.map((link, index) => (
                        <div key={index} className="badge bg-white text-dark border p-2 d-flex align-items-center gap-2 shadow-sm">
                          {getLinkIcon(link.url)}
                          <span className="text-truncate" style={{maxWidth: '150px'}}>{link.title}</span>
                          <button 
                            type="button" 
                            className="btn-close" 
                            style={{fontSize: '0.6rem'}} 
                            onClick={() => removeLinkFromEdit(index)}
                          ></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <article>
                  <h1 className="display-5 fw-bold mb-3">{lesson.title}</h1>
                  <hr className="my-4 opacity-10" />
                  
                  <div className="lesson-text mb-5" style={{ whiteSpace: "pre-wrap", lineHeight: "1.8", fontSize: "1.1rem" }}>
                    {lesson.content}
                  </div>

                  {lesson.links && lesson.links.length > 0 && (
                    <div className="mt-5 p-4 bg-light rounded-4 border">
                      <h6 className="fw-bold text-muted mb-3 small uppercase">📎 ATTACHED RESOURCES</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {lesson.links.map((link, index) => (
                          <a 
                            key={index} 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-white border btn-sm d-flex align-items-center gap-2 rounded-3 px-3 py-2 shadow-sm bg-white"
                          >
                            {getLinkIcon(link.url)}
                            <span>{link.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
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