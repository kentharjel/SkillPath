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
  setDoc,
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
  const [completedLessons, setCompletedLessons] = useState([]); // Tracked as an array of IDs
  const [loading, setLoading] = useState(true);

  // --- ADMIN FORM STATES ---
  const [lessonForm, setLessonForm] = useState({ title: "", description: "" });
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState("");
  const [quizForm, setQuizForm] = useState([
    { question: "", choices: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }
  ]);

  // --- MODAL STATES ---
  const [editLessonTarget, setEditLessonTarget] = useState(null);
  const [editQuizTarget, setEditQuizTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // --- STUDENT STATE ---
  const [studentAnswers, setStudentAnswers] = useState({});

  const getCollectionName = (type) => (type === "quiz" ? "quizzes" : "lessons");

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
        const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
        const userPathDoc = await getDoc(userPathRef);
        if (userPathDoc.exists()) {
          const completed = userPathDoc.data().completedLessons || [];
          setCompletedLessons(completed);
          setStudentAnswers(userPathDoc.data().completedQuizzes || {});
        } else {
          setCompletedLessons([]);
          setStudentAnswers({});
        }
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && pathId) fetchData();
  }, [pathId, user]);

  // --- ADMIN: QUIZ FORM LOGIC ---
  const addQuestion = () => {
    setQuizForm([...quizForm, { question: "", choices: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }]);
  };

  const removeQuestion = (qIndex) => {
    setQuizForm(quizForm.filter((_, i) => i !== qIndex));
  };

  const addChoice = (qIndex) => {
    const newForm = [...quizForm];
    newForm[qIndex].choices.push({ text: "", isCorrect: false });
    setQuizForm(newForm);
  };

  const removeChoice = (qIndex, cIndex) => {
    const newForm = [...quizForm];
    newForm[qIndex].choices = newForm[qIndex].choices.filter((_, i) => i !== cIndex);
    setQuizForm(newForm);
  };

  const handleQuizFieldChange = (qIndex, field, value) => {
    const newForm = [...quizForm];
    newForm[qIndex][field] = value;
    setQuizForm(newForm);
  };

  const handleChoiceFieldChange = (qIndex, cIndex, value) => {
    const newForm = [...quizForm];
    newForm[qIndex].choices[cIndex].text = value;
    setQuizForm(newForm);
  };

  const handleSetCorrect = (qIndex, cIndex) => {
    const newForm = [...quizForm];
    newForm[qIndex].choices.forEach((c, i) => (c.isCorrect = i === cIndex));
    setQuizForm(newForm);
  };

  // --- ACTIONS ---
  const handleAddLesson = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "content", pathId, "lessons"), { ...lessonForm, createdBy: user.uid, createdAt: serverTimestamp() });
    setLessonForm({ title: "", description: "" });
    fetchData();
  };

  const handleAddQuiz = async () => {
    if (!selectedLessonForQuiz) return alert("Select a lesson first!");
    await addDoc(collection(db, "content", pathId, "quizzes"), {
      lessonId: selectedLessonForQuiz,
      title: `Quiz for ${lessons.find(l => l.id === selectedLessonForQuiz)?.title}`,
      questions: quizForm,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setQuizForm([{ question: "", choices: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }]);
    fetchData();
  };

  const handleUpdateLesson = async () => {
    await updateDoc(doc(db, "content", pathId, "lessons", editLessonTarget.id), { title: editLessonTarget.title, description: editLessonTarget.description });
    setEditLessonTarget(null);
    fetchData();
  };

  const handleUpdateQuiz = async () => {
    try {
        await updateDoc(doc(db, "content", pathId, "quizzes", editQuizTarget.id), { 
            title: editQuizTarget.title, 
            questions: editQuizTarget.questions 
        });
        setEditQuizTarget(null);
        fetchData();
    } catch (error) {
        console.error("Update Quiz Error:", error);
    }
  };

  const confirmDelete = async () => {
    await deleteDoc(doc(db, "content", pathId, getCollectionName(deleteTarget.type), deleteTarget.id));
    setDeleteTarget(null);
    fetchData();
  };

  // --- STUDENT PROGRESS LOGIC (FIXED) ---
  const handleCompleteLesson = async (lessonId) => {
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    if (!completedLessons.includes(lessonId)) {
      const updated = [...completedLessons, lessonId];
      await setDoc(userPathRef, { completedLessons: updated, updatedAt: serverTimestamp() }, { merge: true });
      setCompletedLessons(updated);
    }
  };

  const handleResetLesson = async (lessonId) => {
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    const updated = completedLessons.filter(id => id !== lessonId);
    await setDoc(userPathRef, { completedLessons: updated, updatedAt: serverTimestamp() }, { merge: true });
    setCompletedLessons(updated);
  };

  const isQuizPerfect = (quiz) => {
    const answers = studentAnswers[quiz.id];
    if (!answers || Object.keys(answers).length < quiz.questions.length) return false;
    return quiz.questions.every((q, i) => q.choices[answers[i]]?.isCorrect === true);
  };

  const handleAnswer = async (quizId, qIdx, cIdx, quiz) => {
    if (isQuizPerfect(quiz)) return;
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    const newAnswers = { ...studentAnswers, [quizId]: { ...studentAnswers[quizId], [qIdx]: cIdx } };
    await setDoc(userPathRef, { completedQuizzes: newAnswers }, { merge: true });
    setStudentAnswers(newAnswers);
  };

  const handleRedoQuiz = async (quizId) => {
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    const newAnswers = { ...studentAnswers };
    delete newAnswers[quizId];
    await updateDoc(userPathRef, { completedQuizzes: newAnswers });
    setStudentAnswers(newAnswers);
  };

  if (loading || !path) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  const progressPercent = lessons.length ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

  return (
    <div className="bg-light min-vh-100 pb-5">
      <section className="bg-white border-bottom py-5 mb-4 shadow-sm">
        <div className="container">
          <button className="btn btn-link text-decoration-none p-0 mb-3" onClick={() => navigate(-1)}>← Back</button>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="fw-bolder">{path.title}</h1>
              <p className="text-muted">{path.description}</p>
            </div>
            {user?.role === "student" && (
              <div style={{ width: "200px" }}>
                <div className="small fw-bold mb-1">PROGRESS: {progressPercent}%</div>
                <div className="progress" style={{ height: "8px" }}><div className="progress-bar bg-success" style={{ width: `${progressPercent}%` }}></div></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        {user?.role === "admin" ? (
          <div className="row g-4">
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm p-4 mb-4 rounded-4">
                <h5 className="fw-bold text-primary mb-3">Add Lesson</h5>
                <input className="form-control mb-2" placeholder="Title" value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} />
                <textarea className="form-control mb-3" rows="3" placeholder="Description" value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} />
                <button className="btn btn-primary w-100" onClick={handleAddLesson}>Add Lesson</button>
              </div>

              <div className="card border-0 shadow-sm p-4 rounded-4">
                <h5 className="fw-bold text-primary mb-3">Create Quiz</h5>
                <select className="form-select mb-3" value={selectedLessonForQuiz} onChange={e => setSelectedLessonForQuiz(e.target.value)}>
                  <option value="">Attach to Lesson...</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>

                {quizForm.map((q, qi) => (
                  <div key={qi} className="border-bottom mb-4 pb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <label className="fw-bold">Question {qi + 1}</label>
                      {quizForm.length > 1 && <button className="btn btn-sm btn-outline-danger border-0" onClick={() => removeQuestion(qi)}>Remove</button>}
                    </div>
                    <input className="form-control mb-2" value={q.question} onChange={e => handleQuizFieldChange(qi, "question", e.target.value)} />
                    
                    {q.choices.map((c, ci) => (
                      <div key={ci} className="input-group input-group-sm mb-1">
                        <div className="input-group-text bg-white border-0">
                          <input type="radio" name={`correct-${qi}`} checked={c.isCorrect} onChange={() => handleSetCorrect(qi, ci)} />
                        </div>
                        <input className="form-control border-0 bg-light" placeholder="Choice..." value={c.text} onChange={e => handleChoiceFieldChange(qi, ci, e.target.value)} />
                        {q.choices.length > 2 && <button className="btn btn-outline-danger border-0" onClick={() => removeChoice(qi, ci)}>×</button>}
                      </div>
                    ))}
                    <button className="btn btn-sm btn-link text-decoration-none p-0 mt-1" onClick={() => addChoice(qi)}>+ Add Choice</button>
                  </div>
                ))}
                <button className="btn btn-outline-primary w-100 mb-2" onClick={addQuestion}>+ Add Another Question</button>
                <button className="btn btn-primary w-100 fw-bold" onClick={handleAddQuiz}>Publish Quiz</button>
              </div>
            </div>

            <div className="col-lg-7">
              {lessons.map((l, idx) => (
                <div key={l.id} className="card border-0 shadow-sm mb-3 rounded-4">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between">
                      <h5 className="fw-bold">{idx + 1}. {l.title}</h5>
                      <div>
                        <button className="btn btn-sm btn-light me-1" onClick={() => setEditLessonTarget(l)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget({ type: "lesson", id: l.id })}>Delete</button>
                      </div>
                    </div>
                    {quizzes.filter(q => q.lessonId === l.id).map(quiz => (
                      <div key={quiz.id} className="mt-2 p-2 bg-light rounded d-flex justify-content-between align-items-center">
                        <span className="small">📝 {quiz.title}</span>
                        <div>
                          <button className="btn btn-sm text-primary" onClick={() => setEditQuizTarget(quiz)}>Edit</button>
                          <button className="btn btn-sm text-danger" onClick={() => setDeleteTarget({ type: "quiz", id: quiz.id })}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* STUDENT VIEW (FIXED) */
          <div className="row justify-content-center">
            <div className="col-lg-8">
              {lessons.map((lesson, idx) => {
                const isCompleted = completedLessons.includes(lesson.id);

                return (
                  <div key={lesson.id} className="mb-5">
                    <div className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden">
                      <div className={`card-header py-3 border-0 ${isCompleted ? "bg-success text-white" : "bg-primary text-white"}`}>
                        <h5 className="mb-0 fw-bold">Step {idx + 1}: {lesson.title}</h5>
                      </div>
                      <div className="card-body p-4">
                        <p style={{ whiteSpace: "pre-wrap" }}>{lesson.description}</p>
                        <button 
                          className={`btn rounded-pill px-4 fw-bold ${isCompleted ? "btn-outline-secondary" : "btn-primary"}`} 
                          onClick={() => isCompleted ? handleResetLesson(lesson.id) : handleCompleteLesson(lesson.id)}
                        >
                          {isCompleted ? "Read Again" : "Mark as Finished"}
                        </button>
                      </div>
                    </div>

                    {quizzes.filter(q => q.lessonId === lesson.id).map(quiz => {
                      const perfect = isQuizPerfect(quiz);
                      const answers = studentAnswers[quiz.id] || {};
                      const finished = Object.keys(answers).length === quiz.questions.length;

                      return (
                        <div key={quiz.id} className="card border-0 shadow-sm rounded-4 p-4 mb-4 ms-md-5 border-start border-4 border-primary">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold text-primary m-0">Challenge: {quiz.title}</h6>
                            {perfect ? <span className="badge bg-success">100% Locked</span> : finished && <button className="btn btn-sm btn-warning" onClick={() => handleRedoQuiz(quiz.id)}>Retake</button>}
                          </div>
                          {quiz.questions.map((q, qi) => (
                            <div key={qi} className="mb-3">
                              <p className="small fw-bold mb-2">{qi + 1}. {q.question}</p>
                              <div className="d-flex flex-wrap gap-2">
                                {q.choices.map((c, ci) => {
                                  const selected = answers[qi] === ci;
                                  let style = "btn-outline-light text-dark border";
                                  if (selected) style = c.isCorrect ? "btn-success" : "btn-danger text-white";
                                  return (
                                    <button key={ci} className={`btn btn-sm rounded-pill px-3 ${style}`} disabled={answers[qi] !== undefined || perfect} onClick={() => handleAnswer(quiz.id, qi, ci, quiz)}>
                                      {c.text}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {editLessonTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-body p-4">
                <h5 className="fw-bold mb-3">Edit Lesson</h5>
                <input className="form-control mb-2" value={editLessonTarget.title} onChange={e => setEditLessonTarget({ ...editLessonTarget, title: e.target.value })} />
                <textarea className="form-control mb-3" rows="5" value={editLessonTarget.description} onChange={e => setEditLessonTarget({ ...editLessonTarget, description: e.target.value })} />
                <div className="d-flex gap-2">
                  <button className="btn btn-primary w-100" onClick={handleUpdateLesson}>Update</button>
                  <button className="btn btn-light w-100" onClick={() => setEditLessonTarget(null)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editQuizTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)", overflowY: "auto" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
                <div className="modal-header border-0 p-4 pb-0">
                    <h5 className="fw-bold">Edit Quiz</h5>
                </div>
                <div className="modal-body p-4">
                    <input className="form-control mb-4 fw-bold" value={editQuizTarget.title} onChange={e => setEditQuizTarget({...editQuizTarget, title: e.target.value})} />
                    {editQuizTarget.questions.map((q, qi) => (
                        <div key={qi} className="bg-light p-3 rounded-3 mb-3">
                            <input className="form-control mb-2" value={q.question} onChange={e => {
                                const qs = [...editQuizTarget.questions];
                                qs[qi].question = e.target.value;
                                setEditQuizTarget({...editQuizTarget, questions: qs});
                            }} />
                            {q.choices.map((c, ci) => (
                                <div key={ci} className="input-group mb-1">
                                    <div className="input-group-text border-0 bg-transparent">
                                        <input type="radio" checked={c.isCorrect} onChange={() => {
                                            const qs = [...editQuizTarget.questions];
                                            qs[qi].choices.forEach((choice, idx) => choice.isCorrect = idx === ci);
                                            setEditQuizTarget({...editQuizTarget, questions: qs});
                                        }} />
                                    </div>
                                    <input className="form-control" value={c.text} onChange={e => {
                                        const qs = [...editQuizTarget.questions];
                                        qs[qi].choices[ci].text = e.target.value;
                                        setEditQuizTarget({...editQuizTarget, questions: qs});
                                    }} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                    <button className="btn btn-light" onClick={() => setEditQuizTarget(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleUpdateQuiz}>Save Changes</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 rounded-4 p-4 text-center">
              <h6 className="fw-bold mb-3">Delete this {deleteTarget.type}?</h6>
              <div className="d-flex gap-2">
                <button className="btn btn-danger w-100" onClick={confirmDelete}>Delete</button>
                <button className="btn btn-light w-100" onClick={() => setDeleteTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewPath;