import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";

function ViewClass() {
  const location = useLocation();
  const navigate = useNavigate();
  const classId = location.state?.classId;

  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [classContent, setClassContent] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [studentAttempts, setStudentAttempts] = useState([]);
  const [allQuizScores, setAllQuizScores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Lesson State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", content: "", links: [] });
  const [linkInput, setLinkInput] = useState({ title: "", url: "" });

  // Quiz State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([
    { questionText: "", options: ["", "", "", ""], correctAnswer: 0 }
  ]);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, title: "" });

  // --- NEW LOGO HELPER ---
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
      const userData = { uid: currentUser.uid, ...userDoc.data() };
      setUser(userData);
      fetchClassDetails(userData);
    });
    return () => unsubscribe();
  }, [classId, navigate]);

  const fetchClassDetails = async (userData) => {
    if (!classId) return navigate("/classes");
    try {
      const classSnap = await getDoc(doc(db, "classes", classId));
      if (!classSnap.exists()) return navigate("/classes");
      setClassData({ id: classSnap.id, ...classSnap.data() });

      const contentSnap = await getDocs(
        query(collection(db, `classes/${classId}/content`), orderBy("createdAt", "asc"))
      );
      setClassContent(contentSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (userData.role === "student") {
        const attemptsSnap = await getDocs(
          query(
            collection(db, `classes/${classId}/attempts`), 
            where("studentId", "==", userData.uid)
          )
        );
        const attemptedQuizIds = attemptsSnap.docs.map(doc => doc.data().quizId);
        setStudentAttempts(attemptedQuizIds);
      }

      if (userData.role === "professor") {
        const cData = classSnap.data();
        if (cData.students?.length > 0) {
          const sSnap = await getDocs(query(collection(db, "users"), where("__name__", "in", cData.students)));
          setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        
        const allAttemptsSnap = await getDocs(
          query(collection(db, `classes/${classId}/attempts`), orderBy("completedAt", "desc"))
        );
        setAllQuizScores(allAttemptsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, `classes/${classId}/content`, deleteModal.id));
      setClassContent(classContent.filter(item => item.id !== deleteModal.id));
      setDeleteModal({ show: false, id: null, title: "" });
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const addLinkToLesson = () => {
    if (!linkInput.title || !linkInput.url) return;
    setNewLesson({ ...newLesson, links: [...(newLesson.links || []), linkInput] });
    setLinkInput({ title: "", url: "" });
  };

  const removeLinkFromLesson = (idx) => {
    setNewLesson({ ...newLesson, links: newLesson.links.filter((_, i) => i !== idx) });
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, `classes/${classId}/content`), {
      ...newLesson,
      type: "lesson",
      createdAt: serverTimestamp()
    });
    setShowLessonModal(false);
    setNewLesson({ title: "", content: "", links: [] });
    fetchClassDetails(user);
  };

  const addQuestionField = () => {
    setQuestions([...questions, { questionText: "", options: ["", "", "", ""], correctAnswer: 0 }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleAddQuiz = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, `classes/${classId}/content`), {
      title: quizTitle,
      questions: questions,
      type: "quiz",
      createdAt: serverTimestamp()
    });
    setQuizTitle("");
    setQuestions([{ questionText: "", options: ["", "", "", ""], correctAnswer: 0 }]);
    setShowQuizModal(false);
    fetchClassDetails(user);
  };

  if (loading || !classData) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <style>
        {`
          .resource-link-card {
            display: flex;
            align-items: center;
            padding: 10px 15px;
            background: #f8f9fa;
            border-radius: 10px;
            border: 1px solid #eee;
            text-decoration: none;
            transition: 0.2s;
            margin-bottom: 8px;
          }
          .resource-link-card:hover {
            background: #e9ecef;
            transform: translateY(-2px);
          }
        `}
      </style>

      {/* HEADER SECTION */}
      <section className="bg-light py-5 border-bottom">
        <div className="container d-flex justify-content-between align-items-center">
          <div>
            <h1 className="fw-bold text-dark">{classData.className}</h1>
            <p className="text-muted mb-0">Professor: {classData.professorName}</p>
          </div>
          {user.role === "professor" && (
            <div className="text-end">
              <small className="text-muted d-block fw-bold">CLASS CODE</small>
              <code className="h4 text-primary bg-white px-3 py-1 rounded shadow-sm border">{classData.classCode}</code>
            </div>
          )}
        </div>
      </section>

      {/* MATERIALS SECTION */}
      <section className="py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0">Class Materials</h4>
            {user.role === "professor" && (
              <div className="d-flex gap-2">
                <button className="btn btn-primary shadow-sm" onClick={() => setShowLessonModal(true)}>+ Add Lesson</button>
                <button className="btn btn-outline-primary shadow-sm" onClick={() => setShowQuizModal(true)}>+ Add Quiz</button>
              </div>
            )}
          </div>

          <div className="row g-4">
            {classContent.length > 0 ? (
              classContent.map((item) => {
                const isCompleted = item.type === 'quiz' && studentAttempts.includes(item.id);
                
                return (
                  <div key={item.id} className="col-md-6">
                    <div className={`card border-0 shadow-sm rounded-4 h-100 border-start border-4 ${isCompleted ? 'border-success' : 'border-primary'}`}>
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="d-flex gap-2 align-items-center">
                            <span className={`badge px-3 py-2 ${item.type === 'lesson' ? 'bg-info text-white' : 'bg-warning text-dark'}`}>
                              {item.type.toUpperCase()}
                            </span>
                            {isCompleted && (
                              <span className="badge bg-success px-3 py-2">DONE ✅</span>
                            )}
                            {item.links?.slice(0, 3).map((l, i) => (
                              <span key={i} className="ms-1">{getLinkIcon(l.url)}</span>
                            ))}
                          </div>
                          {user.role === "professor" && (
                            <button 
                              className="btn btn-sm btn-outline-danger border-0 rounded-circle" 
                              onClick={() => setDeleteModal({ show: true, id: item.id, title: item.title })}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h5 className={`fw-bold mb-1 ${isCompleted ? 'text-success' : ''}`}>{item.title}</h5>
                            <p className="text-muted small mb-0">
                              {item.type === 'lesson' ? 'Reading Material' : `${item.questions?.length} Questions`}
                            </p>
                          </div>
                          <button 
                            className={`btn rounded-pill px-4 shadow-sm ${isCompleted ? 'btn-success' : 'btn-primary'}`} 
                            onClick={() => navigate(item.type === 'lesson' ? "/viewlesson" : "/takequiz", { state: { contentId: item.id, classId } })}
                          >
                            {isCompleted ? "View Result" : "Open"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-5 text-muted">No materials posted yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER VIEW */}
      {user.role === "professor" ? (
        <ProfessorGradebook 
          students={students} 
          scores={allQuizScores} 
          classContent={classContent} 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      ) : (
        <StudentProgressOverview />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.show && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-body p-4 text-center">
                <div className="display-4 text-danger mb-3">⚠️</div>
                <h5 className="fw-bold">Delete "{deleteModal.title}"?</h5>
                <p className="text-muted">This action cannot be undone and will remove this material for all students.</p>
                <div className="d-flex gap-2 justify-content-center mt-4">
                  <button className="btn btn-light px-4 rounded-pill" onClick={() => setDeleteModal({ show: false, id: null, title: "" })}>Cancel</button>
                  <button className="btn btn-danger px-4 rounded-pill fw-bold" onClick={confirmDelete}>Delete Permanently</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUIZ MODAL */}
      {showQuizModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", overflowY: "auto" }}>
          <div className="modal-dialog modal-lg">
            <form className="modal-content border-0 shadow-lg rounded-4" onSubmit={handleAddQuiz}>
              <div className="modal-header border-0 p-4 pb-0">
                <h5 className="fw-bold">Create New Quiz</h5>
              </div>
              <div className="modal-body p-4">
                <div className="mb-4">
                  <label className="form-label small fw-bold text-muted">QUIZ TITLE</label>
                  <input type="text" className="form-control form-control-lg fw-bold" placeholder="e.g. Unit 1 Mastery Check" 
                    onChange={e => setQuizTitle(e.target.value)} required />
                </div>
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="p-4 border rounded-4 mb-4 bg-white shadow-sm position-relative">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="badge bg-secondary-subtle text-secondary px-3">QUESTION {qIndex + 1}</span>
                      {questions.length > 1 && (
                        <button type="button" className="btn btn-link text-danger text-decoration-none p-0 small fw-bold" onClick={() => removeQuestion(qIndex)}>&times; Remove</button>
                      )}
                    </div>
                    <input type="text" className="form-control mb-3" placeholder="What is the question?" 
                      value={q.questionText} onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)} required />
                    <div className="row g-3">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="col-md-6">
                          <div className="input-group">
                            <div className="input-group-text bg-white border-end-0">
                              <input type="radio" className="form-check-input" name={`correct-${qIndex}`} checked={q.correctAnswer === oIndex} 
                                onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)} />
                            </div>
                            <input type="text" className="form-control border-start-0" placeholder={`Option ${oIndex + 1}`} 
                              value={opt} onChange={e => updateOption(qIndex, oIndex, e.target.value)} required />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-outline-primary w-100 py-2 border-dashed fw-bold" onClick={addQuestionField}>+ Add Another Question</button>
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <button type="button" className="btn btn-light px-4" onClick={() => setShowQuizModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-5 fw-bold">Save Quiz</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LESSON MODAL */}
      {showLessonModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <form className="modal-content border-0 shadow rounded-4 p-4" onSubmit={handleAddLesson}>
              <h5 className="fw-bold mb-3">Create New Lesson</h5>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">TITLE</label>
                <input type="text" className="form-control fw-bold" placeholder="Lesson Name" onChange={e => setNewLesson({...newLesson, title: e.target.value})} required />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">CONTENT</label>
                <textarea className="form-control" rows="5" placeholder="Lesson details..." onChange={e => setNewLesson({...newLesson, content: e.target.value})} required />
              </div>

              <div className="bg-light p-3 rounded-3 mb-3 border">
                <label className="small fw-bold text-primary mb-2">ATTACH RESOURCES (Youtube, Docs, etc.)</label>
                <div className="input-group input-group-sm mb-2">
                  <input className="form-control" placeholder="Link Title" value={linkInput.title} onChange={e => setLinkInput({ ...linkInput, title: e.target.value })} />
                  <input className="form-control" placeholder="URL (https://...)" value={linkInput.url} onChange={e => setLinkInput({ ...linkInput, url: e.target.value })} />
                  <button type="button" className="btn btn-dark" onClick={addLinkToLesson}>Add</button>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {newLesson.links?.map((link, i) => (
                    <span key={i} className="badge bg-white text-dark border p-2 d-flex align-items-center gap-2">
                      {getLinkIcon(link.url)} {link.title}
                      <button type="button" className="btn-close" style={{ fontSize: '8px' }} onClick={() => removeLinkFromLesson(i)}></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-end">
                <button type="button" className="btn btn-light me-2" onClick={() => setShowLessonModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary px-4 shadow-sm">Post Lesson</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ProfessorGradebook({ students, scores, classContent, searchTerm, setSearchTerm }) {
  const quizHeaders = classContent.filter(item => item.type === 'quiz');
  const filteredStudents = students.filter(s => s.fullname?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <h4 className="fw-bold mb-0">Class Gradebook</h4>
          <div className="position-relative" style={{ maxWidth: "350px", width: "100%" }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">🔍</span>
            <input type="text" className="form-control ps-5 rounded-pill shadow-sm border-0" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-bordered align-middle mb-0">
              <thead className="table-white sticky-top">
                <tr>
                  <th className="p-4 bg-white">Student Name</th>
                  {quizHeaders.map((quiz) => (
                    <th key={quiz.id} className="text-center p-3 bg-white">
                      <div className="small fw-bold text-primary">{quiz.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="p-4 fw-bold">{s.fullname}</td>
                    {quizHeaders.map((quiz) => {
                      const attempt = scores.find(a => a.studentId === s.id && a.quizId === quiz.id);
                      const totalQuestions = quiz.questions?.length || 0;
                      const rawScore = attempt ? Math.round((attempt.score / 100) * totalQuestions) : 0;
                      
                      return (
                        <td key={quiz.id} className="text-center p-3">
                          {attempt ? (
                            <span className="fw-bold text-dark">
                              {rawScore} / {totalQuestions}
                            </span>
                          ) : (
                            <span className="text-muted opacity-50">---</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function StudentProgressOverview() {
  return (
    <section className="py-5 bg-light">
      <div className="container">
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-primary text-white">
          <div className="d-flex align-items-center">
            <div className="display-4 me-3">💡</div>
            <div>
              <h4 className="fw-bold mb-1">Learning Tip</h4>
              <p className="mb-0 opacity-75">Review all lessons thoroughly. You only get retakes on quizzes if you haven't mastered them yet!</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ViewClass;