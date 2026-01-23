import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

function ViewPath() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathId = location.state?.pathId;

  const [user, setUser] = useState(null);
  const [path, setPath] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Forms
  const [lessonForm, setLessonForm] = useState({ title: "", description: "" });
  const [quizForm, setQuizForm] = useState([{ question: "", choices: [{ text: "", isCorrect: false }] }]);
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState("");

  // Edit Modals State
  const [editLessonTarget, setEditLessonTarget] = useState(null);
  const [editQuizTarget, setEditQuizTarget] = useState(null);

  const [studentAnswers, setStudentAnswers] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getCollectionName = (type) => (type === "quiz" ? "quizzes" : "lessons");

  // ------------------ Fetch User ------------------
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
      } else {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDoc.exists()
          ? { uid: currentUser.uid, ...userDoc.data() }
          : { uid: currentUser.uid, role: "student", fullname: "Student" };
        setUser(userData);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // ------------------ Fetch Data ------------------
  const fetchData = async () => {
    if (!pathId) return navigate("/learningpaths");
    try {
      const pathDoc = await getDoc(doc(db, "content", pathId));
      if (!pathDoc.exists()) return navigate("/learningpaths");
      setPath({ id: pathDoc.id, ...pathDoc.data() });

      const lessonsSnap = await getDocs(collection(db, "content", pathId, "lessons"));
      setLessons(lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const quizzesSnap = await getDocs(collection(db, "content", pathId, "quizzes"));
      setQuizzes(quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (user?.uid) {
        const userPathDoc = await getDoc(doc(db, "users", user.uid, "userPaths", pathId));
        if (userPathDoc.exists()) {
          const completed = userPathDoc.data().completedLessons || [];
          setProgress(completed.length);
          setStudentAnswers(userPathDoc.data().completedQuizzes || {});
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [pathId, user]);

  // ------------------ Admin Functions ------------------
  const handleAddLesson = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "content", pathId, "lessons"), { 
      ...lessonForm, 
      createdBy: user.uid, 
      createdAt: serverTimestamp() 
    });
    setLessonForm({ title: "", description: "" });
    fetchData();
  };

  const handleUpdateLesson = async () => {
    if (!editLessonTarget) return;
    await updateDoc(doc(db, "content", pathId, "lessons", editLessonTarget.id), {
      title: editLessonTarget.title,
      description: editLessonTarget.description
    });
    setEditLessonTarget(null);
    fetchData();
  };

  const handleUpdateQuiz = async () => {
    if (!editQuizTarget) return;
    await updateDoc(doc(db, "content", pathId, "quizzes", editQuizTarget.id), {
      title: editQuizTarget.title,
      questions: editQuizTarget.questions
    });
    setEditQuizTarget(null);
    fetchData();
  };

  const handleAddQuiz = async () => {
    if (!selectedLessonForQuiz) return alert("Select a lesson");
    await addDoc(collection(db, "content", pathId, "quizzes"), {
      lessonId: selectedLessonForQuiz,
      title: `Quiz for ${lessons.find(l => l.id === selectedLessonForQuiz)?.title}`,
      questions: quizForm,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setQuizForm([{ question: "", choices: [{ text: "", isCorrect: false }] }]);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const collectionName = getCollectionName(deleteTarget.type);
    await deleteDoc(doc(db, "content", pathId, collectionName, deleteTarget.id));
    setDeleteTarget(null);
    fetchData();
  };

  // ------------------ Student Functions ------------------
  const handleCompleteLesson = async (lessonId) => {
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    const userPathDoc = await getDoc(userPathRef);
    const completedLessons = userPathDoc.exists() ? userPathDoc.data().completedLessons || [] : [];
    if (!completedLessons.includes(lessonId)) {
      const updated = [...completedLessons, lessonId];
      await updateDoc(userPathRef, { completedLessons: updated, updatedAt: serverTimestamp() });
      setProgress(updated.length);
    }
  };

  const handleAnswer = async (quizId, questionIndex, choiceIndex) => {
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    const userPathDoc = await getDoc(userPathRef);
    const completedQuizzes = userPathDoc.exists() ? userPathDoc.data().completedQuizzes || {} : {};
    const newQuizProgress = { ...completedQuizzes, [quizId]: { ...completedQuizzes[quizId], [questionIndex]: choiceIndex } };
    
    await updateDoc(userPathRef, { completedQuizzes: newQuizProgress, updatedAt: serverTimestamp() });
    setStudentAnswers(newQuizProgress);
  };

  const handleRedoQuiz = async (quizId) => {
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    const newAnswers = { ...studentAnswers };
    delete newAnswers[quizId];

    await updateDoc(userPathRef, { completedQuizzes: newAnswers, updatedAt: serverTimestamp() });
    setStudentAnswers(newAnswers);
  };

  const isQuizPerfect = (quiz) => {
    const answers = studentAnswers[quiz.id];
    if (!answers || Object.keys(answers).length < quiz.questions.length) return false;

    return quiz.questions.every((q, i) => {
      const selectedIdx = answers[i];
      return q.choices[selectedIdx]?.isCorrect === true;
    });
  };

  if (loading || !path) return <div className="text-center py-5">Loading...</div>;

  const progressPercent = lessons.length ? Math.round((progress / lessons.length) * 100) : 0;

  return (
    <>
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4">
          <h1 className="fw-bold">{path.title}</h1>
          <p className="text-muted">{path.description}</p>
        </div>
      </section>

      {user?.role === "admin" && (
        <section className="py-4 bg-white">
          <div className="container">
            {/* Add Lesson Form */}
            <div className="card shadow-sm p-4 mb-4">
              <h4 className="fw-bold mb-3">Add Lesson</h4>
              <form onSubmit={handleAddLesson}>
                <input 
                  className="form-control mb-2" 
                  placeholder="Lesson Title" 
                  value={lessonForm.title} 
                  onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} 
                  required 
                />
                <textarea 
                  className="form-control mb-2" 
                  placeholder="Lesson Description (Paragraphs allowed)" 
                  rows="3"
                  style={{ overflowY: "auto" }}
                  value={lessonForm.description} 
                  onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} 
                />
                <button className="btn btn-primary">Add Lesson</button>
              </form>
            </div>

            {/* Add Quiz Form */}
            <div className="card shadow-sm p-4 mb-4">
              <h4 className="fw-bold mb-3">Add Quiz</h4>
              <select className="form-select mb-2" value={selectedLessonForQuiz} onChange={e => setSelectedLessonForQuiz(e.target.value)}>
                <option value="">-- Select Lesson --</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>

              {quizForm.map((q, qi) => (
                <div key={qi} className="mb-3 border rounded p-3 bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="fw-bold">Question {qi + 1}</label>
                    {quizForm.length > 1 && (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => {
                        const newForm = [...quizForm]; newForm.splice(qi, 1); setQuizForm(newForm);
                      }}>Remove Question</button>
                    )}
                  </div>
                  <input className="form-control mb-2" placeholder="Enter Question" value={q.question} onChange={e => {
                    const newForm = [...quizForm]; newForm[qi].question = e.target.value; setQuizForm(newForm);
                  }} />

                  {q.choices.map((c, ci) => (
                    <div key={ci} className="input-group mb-2">
                      <input className="form-control" placeholder={`Choice ${ci + 1}`} value={c.text} onChange={e => {
                        const newForm = [...quizForm]; newForm[qi].choices[ci].text = e.target.value; setQuizForm(newForm);
                      }} />
                      <span className="input-group-text">
                        <input type="radio" name={`correct-${qi}`} checked={c.isCorrect} onChange={() => {
                          const newForm = [...quizForm]; newForm[qi].choices.forEach((choice, i) => choice.isCorrect = i === ci); setQuizForm(newForm);
                        }} />
                      </span>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => {
                    const newForm = [...quizForm]; newForm[qi].choices.push({ text: "", isCorrect: false }); setQuizForm(newForm);
                  }}>Add Choice</button>
                </div>
              ))}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-primary" onClick={() => setQuizForm([...quizForm, { question: "", choices: [{ text: "", isCorrect: false }] }])}>Add Another Question</button>
                <button className="btn btn-primary" onClick={handleAddQuiz}>Publish Quiz</button>
              </div>
            </div>

            {/* Admin Content Lists */}
            <h4 className="fw-bold mt-4">Lessons</h4>
            {lessons.map(l => (
              <div key={l.id} className="card p-3 mb-2 d-flex justify-content-between flex-row align-items-center shadow-sm">
                <div style={{ maxWidth: "70%" }}>
                  <h6 className="mb-0 fw-bold">{l.title}</h6>
                  <p className="text-muted small mb-0 text-truncate">{l.description}</p>
                </div>
                <div>
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditLessonTarget(l)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget({ type: "lesson", id: l.id })}>Delete</button>
                </div>
              </div>
            ))}

            <h4 className="fw-bold mt-4">Quizzes</h4>
            {quizzes.map(q => (
              <div key={q.id} className="card p-3 mb-2 d-flex justify-content-between flex-row align-items-center shadow-sm">
                <h6 className="mb-0">{q.title}</h6>
                <div>
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditQuizTarget(q)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget({ type: "quiz", id: q.id })}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- MODALS --- */}
      {editLessonTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5>Edit Lesson</h5><button className="btn-close" onClick={() => setEditLessonTarget(null)}></button></div>
              <div className="modal-body">
                <label className="small fw-bold">Title</label>
                <input className="form-control mb-2" value={editLessonTarget.title} onChange={e => setEditLessonTarget({ ...editLessonTarget, title: e.target.value })} />
                <label className="small fw-bold">Description</label>
                <textarea 
                  className="form-control" 
                  rows="5"
                  style={{ overflowY: "auto" }}
                  value={editLessonTarget.description} 
                  onChange={e => setEditLessonTarget({ ...editLessonTarget, description: e.target.value })} 
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditLessonTarget(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleUpdateLesson}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editQuizTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", overflowY: "auto" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header"><h5>Edit Quiz</h5><button className="btn-close" onClick={() => setEditQuizTarget(null)}></button></div>
              <div className="modal-body">
                <input className="form-control mb-3 fw-bold" value={editQuizTarget.title} onChange={e => setEditQuizTarget({ ...editQuizTarget, title: e.target.value })} />
                {editQuizTarget.questions.map((q, qi) => (
                  <div key={qi} className="border p-3 mb-3 bg-light rounded">
                    <div className="d-flex justify-content-between mb-2">
                      <label className="fw-bold">Question {qi + 1}</label>
                      <button className="btn btn-sm btn-danger" onClick={() => {
                        const qs = [...editQuizTarget.questions]; qs.splice(qi, 1); setEditQuizTarget({ ...editQuizTarget, questions: qs });
                      }}>Remove Question</button>
                    </div>
                    <input className="form-control mb-2" value={q.question} onChange={e => {
                      const qs = [...editQuizTarget.questions]; qs[qi].question = e.target.value; setEditQuizTarget({ ...editQuizTarget, questions: qs });
                    }} />
                    {q.choices.map((c, ci) => (
                      <div key={ci} className="input-group mb-1">
                        <input className="form-control" value={c.text} onChange={e => {
                          const qs = [...editQuizTarget.questions]; qs[qi].choices[ci].text = e.target.value; setEditQuizTarget({ ...editQuizTarget, questions: qs });
                        }} />
                        <span className="input-group-text">
                          <input type="radio" name={`edit-correct-${qi}`} checked={c.isCorrect} onChange={() => {
                            const qs = [...editQuizTarget.questions]; qs[qi].choices.forEach((choice, idx) => choice.isCorrect = idx === ci); setEditQuizTarget({ ...editQuizTarget, questions: qs });
                          }} />
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditQuizTarget(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleUpdateQuiz}>Update Quiz</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5>Confirm Delete</h5></div>
              <div className="modal-body">Are you sure you want to delete this {deleteTarget.type}?</div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student View */}
      {user?.role === "student" && (
        <section className="py-5">
          <div className="container">
            <h4 className="fw-bold">Progress</h4>
            <div className="progress mb-3"><div className="progress-bar bg-primary" style={{ width: `${progressPercent}%` }}></div></div>
            
            {lessons.map((lesson, index) => {
              const completed = progress >= index + 1;
              return (
                <div key={lesson.id} className="mb-4">
                  <div className={`card p-3 ${completed ? "border-success bg-light" : ""}`}>
                    <h5>{index + 1}. {lesson.title}</h5>
                    <p className="small text-muted" style={{ whiteSpace: "pre-wrap" }}>{lesson.description}</p>
                    <button className={`btn btn-sm mt-2 ${completed ? "btn-success" : "btn-outline-primary"}`} onClick={() => handleCompleteLesson(lesson.id)}>{completed ? "Completed" : "Mark Done"}</button>
                  </div>
                  
                  {quizzes.filter(q => q.lessonId === lesson.id).map(quiz => {
                    const quizResults = studentAnswers[quiz.id];
                    const quizFinished = quizResults && Object.keys(quizResults).length === quiz.questions.length;
                    const perfect = isQuizPerfect(quiz);

                    return (
                      <div key={quiz.id} className="card p-3 ms-4 mt-2 shadow-sm border-0 bg-white">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0 fw-bold text-primary">Quiz: {quiz.title}</h6>
                          {quizFinished && !perfect && (
                            <button className="btn btn-sm btn-warning fw-bold" onClick={() => handleRedoQuiz(quiz.id)}>Redo Quiz</button>
                          )}
                          {perfect && <span className="badge bg-success p-2">Perfect Score! 🎉</span>}
                        </div>

                        {quiz.questions.map((q, i) => (
                          <div key={i} className="mt-2 border-top pt-2">
                            <p className="mb-2 fw-semibold">{q.question}</p>
                            {q.choices.map((c, ci) => {
                              const selectedIdx = studentAnswers[quiz.id]?.[i];
                              const isSelected = selectedIdx === ci;
                              let btnCls = "btn btn-sm btn-outline-secondary me-2 mb-1";
                              if (isSelected) {
                                btnCls = c.isCorrect ? "btn btn-sm btn-success me-2 mb-1" : "btn btn-sm btn-danger me-2 mb-1";
                              }

                              return (
                                <button 
                                  key={ci} 
                                  className={btnCls} 
                                  disabled={selectedIdx !== undefined} 
                                  onClick={() => handleAnswer(quiz.id, i, ci)}
                                >
                                  {c.text}
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export default ViewPath;