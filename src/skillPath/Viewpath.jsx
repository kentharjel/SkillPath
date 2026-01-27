import { useEffect, useState, useRef } from "react";
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

  const quizTopRef = useRef(null);

  const [user, setUser] = useState(null);
  const [path, setPath] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]); 
  const [loading, setLoading] = useState(true);

  // --- HEART SYSTEM STATE ---
  const [hearts, setHearts] = useState(5);
  const [showHeartModal, setShowHeartModal] = useState(false);
  const [nextHeartTime, setNextHeartTime] = useState("");

  // --- STUDENT NAVIGATION ENGINE ---
  const [viewMode, setViewMode] = useState("list"); 
  const [activeItem, setActiveItem] = useState(null);

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

  // --- STUDENT DATA STATE ---
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

  // HEART REGEN TIMER LOGIC
  useEffect(() => {
    if (hearts >= 5) {
        setNextHeartTime("");
        return;
    }

    const interval = setInterval(async () => {
        const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
        const userPathDoc = await getDoc(userPathRef);
        
        if (userPathDoc.exists()) {
            const data = userPathDoc.data();
            const lastLoss = data.lastHeartLoss?.toDate();
            if (lastLoss) {
                const now = new Date();
                const nextHeartDate = new Date(lastLoss.getTime() + (3 * 60 * 60 * 1000));
                const diff = nextHeartDate - now;

                if (diff <= 0) {
                    fetchData(); // Refresh if heart is earned
                } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setNextHeartTime(`${h}h ${m}m ${s}s`);
                }
            }
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [hearts, user, pathId]);

  const fetchData = async () => {
    if (!pathId) return navigate("/learningpaths");
    try {
      const pathDoc = await getDoc(doc(db, "content", pathId));
      if (!pathDoc.exists()) return navigate("/learningpaths");
      setPath({ id: pathDoc.id, ...pathDoc.data() });

      const lessonsSnap = await getDocs(collection(db, "content", pathId, "lessons"));
      const sortedLessons = lessonsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setLessons(sortedLessons);

      const quizzesSnap = await getDocs(collection(db, "content", pathId, "quizzes"));
      const sortedQuizzes = quizzesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setQuizzes(sortedQuizzes);

      if (user?.uid) {
        const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
        const userPathDoc = await getDoc(userPathRef);
        
        if (userPathDoc.exists()) {
          const data = userPathDoc.data();
          setCompletedLessons(data.completedLessons || []);
          setStudentAnswers(data.completedQuizzes || {});
          
          let currentHearts = data.hearts !== undefined ? data.hearts : 5;
          const lastLoss = data.lastHeartLoss?.toDate();
          
          if (currentHearts < 5 && lastLoss) {
            const now = new Date();
            const msPassed = now - lastLoss;
            const hoursPassed = Math.floor(msPassed / (1000 * 60 * 60));
            const heartsToRestore = Math.floor(hoursPassed / 3);
            
            if (heartsToRestore > 0) {
                currentHearts = Math.min(5, currentHearts + heartsToRestore);
                await updateDoc(userPathRef, { 
                    hearts: currentHearts,
                    lastHeartLoss: currentHearts === 5 ? null : new Date(lastLoss.getTime() + (heartsToRestore * 3 * 60 * 60 * 1000))
                });
            }
          }
          setHearts(currentHearts);
        } else {
          await setDoc(userPathRef, { hearts: 5, completedLessons: [], completedQuizzes: {} });
          setHearts(5);
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

  // --- ADMIN LOGIC ---
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
  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title) return alert("Title required");
    await addDoc(collection(db, "content", pathId, "lessons"), { ...lessonForm, createdBy: user.uid, createdAt: serverTimestamp() });
    setLessonForm({ title: "", description: "" });
    fetchData();
  };
  const handleAddQuiz = async () => {
    if (!selectedLessonForQuiz) return alert("Select a lesson first!");
    await addDoc(collection(db, "content", pathId, "quizzes"), {
      lessonId: selectedLessonForQuiz,
      title: `Quiz: ${lessons.find(l => l.id === selectedLessonForQuiz)?.title}`,
      questions: quizForm,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setQuizForm([{ question: "", choices: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] }]);
    setSelectedLessonForQuiz("");
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

  // --- STUDENT PROGRESS LOGIC ---
  const handleCompleteLesson = async (lessonId) => {
    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    if (!completedLessons.includes(lessonId)) {
      const updated = [...completedLessons, lessonId];
      await setDoc(userPathRef, { completedLessons: updated, updatedAt: serverTimestamp() }, { merge: true });
      setCompletedLessons(updated);
    }
  };

  const isQuizPerfect = (quiz) => {
    if (!quiz) return false;
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
    const currentQuiz = quizzes.find(q => q.id === quizId);
    if (isQuizPerfect(currentQuiz)) {
        alert("You have already perfected this quiz! No need to retake.");
        return;
    }
    if (hearts <= 0) {
        alert("You have no hearts left! Please wait for them to regenerate.");
        return;
    }

    if (quizTopRef.current) {
        quizTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    const userPathRef = doc(db, "users", user.uid, "userPaths", pathId);
    const newHeartCount = hearts - 1;
    const newAnswers = { ...studentAnswers };
    delete newAnswers[quizId];
    setHearts(newHeartCount);
    setStudentAnswers(newAnswers);
    const updateData = { 
        completedQuizzes: newAnswers,
        hearts: newHeartCount
    };
    if (hearts === 5) {
        updateData.lastHeartLoss = new Date();
    }
    try {
        await updateDoc(userPathRef, updateData);
    } catch (error) {
        console.error("Redo error:", error);
        fetchData();
    }
  };

  if (loading || !path) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  const progressPercent = lessons.length ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

  return (
    <div className="bg-light min-vh-100 pb-5">
      <style>
        {`
          .choice-card-btn {
            transition: all 0.2s ease-in-out;
            border: 2px solid #dee2e6 !important;
            color: #212529 !important;
            background-color: #ffffff !important;
          }
          .choice-card-btn:hover:not(:disabled) {
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
            transform: translateY(-2px);
          }
          .choice-card-btn.answer-correct {
            background-color: #198754 !important;
            color: white !important;
            border-color: #198754 !important;
          }
          .choice-card-btn.answer-incorrect {
            background-color: #dc3545 !important;
            color: white !important;
            border-color: #dc3545 !important;
          }
          .heart-main { color: #ff4b2b; font-size: 1.2rem; cursor: pointer; }
          .heart-container:hover { background-color: #fff5f5 !important; }
        `}
      </style>

      {/* HEADER SECTION */}
      <section className="bg-white border-bottom py-4 mb-4 shadow-sm">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <button 
                className="btn btn-sm btn-outline-secondary rounded-pill" 
                onClick={() => viewMode === "list" ? navigate(-1) : setViewMode("list")}
            >
                ← {viewMode === "list" ? "Back to Paths" : "Back to Course Menu"}
            </button>
            
            {user?.role === "student" && (
                <div 
                  className="bg-white px-3 py-1 rounded-pill border d-flex align-items-center shadow-sm heart-container" 
                  style={{cursor: 'pointer'}}
                  onClick={() => setShowHeartModal(true)}
                >
                    <span className="heart-main me-2">❤️</span>
                    <span className="fw-bold text-dark" style={{fontSize: '1.1rem'}}>
                        {hearts}
                    </span>
                    {hearts < 5 && <span className="ms-2 badge bg-light text-muted border" style={{fontSize: '10px'}}>Regenerating...</span>}
                </div>
            )}
          </div>
          
          {viewMode === "list" && (
            <div className="d-flex justify-content-between align-items-end">
              <div>
                <span className="badge bg-primary mb-2 text-uppercase">{user?.role === 'admin' ? 'Path Management' : 'Learning Path'}</span>
                <h1 className="fw-bolder mb-1">{path.title}</h1>
                <p className="text-muted mb-0">{path.description}</p>
              </div>
              {user?.role === "student" && (
                <div className="text-end" style={{ width: "220px" }}>
                  <div className="d-flex justify-content-between small fw-bold mb-1">
                    <span>PATH PROGRESS</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="progress" style={{ height: "10px" }}>
                    <div className="progress-bar bg-success progress-bar-striped progress-bar-animated" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="container">
        {user?.role === "admin" ? (
          /* --- ADMIN SECTION --- */
          <div className="row g-4">
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm p-4 mb-4 rounded-4">
                <h5 className="fw-bold text-primary mb-3">Add New Lesson</h5>
                <input className="form-control mb-2" placeholder="Lesson Title" value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} />
                <textarea className="form-control mb-3" rows="3" placeholder="Lesson Content..." value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} />
                <button className="btn btn-primary w-100 fw-bold" onClick={handleAddLesson}>Create Lesson</button>
              </div>

              <div className="card border-0 shadow-sm p-4 rounded-4">
                <h5 className="fw-bold text-primary mb-3">Create Quiz</h5>
                <label className="small fw-bold text-muted mb-1">SELECT LESSON TO ATTACH</label>
                <select className="form-select mb-3 border-primary" value={selectedLessonForQuiz} onChange={e => setSelectedLessonForQuiz(e.target.value)}>
                  <option value="">Choose a lesson...</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.title} {quizzes.find(q => q.lessonId === l.id) ? "(Already has quiz)" : ""}
                    </option>
                  ))}
                </select>

                {quizForm.map((q, qi) => (
                  <div key={qi} className="border-bottom mb-4 pb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <label className="fw-bold small">Question {qi + 1}</label>
                      {quizForm.length > 1 && <button className="btn btn-sm text-danger p-0" onClick={() => removeQuestion(qi)}>Remove</button>}
                    </div>
                    <input className="form-control mb-2" placeholder="Question text" value={q.question} onChange={e => handleQuizFieldChange(qi, "question", e.target.value)} />
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
                <button className="btn btn-outline-primary w-100 mb-2 btn-sm" onClick={addQuestion}>+ Add Another Question</button>
                <button className="btn btn-primary w-100 fw-bold" onClick={handleAddQuiz}>Publish Quiz</button>
              </div>
            </div>

            <div className="col-lg-7">
              <h5 className="fw-bold mb-3">Curriculum Preview</h5>
              {lessons.map((l, idx) => {
                const attachedQuiz = quizzes.find(q => q.lessonId === l.id);
                return (
                  <div key={l.id} className="card border-0 shadow-sm mb-4 rounded-4 overflow-hidden">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="fw-bold mb-0">{l.title}</h5>
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setEditLessonTarget(l)}>Edit Lesson</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget({ type: "lesson", id: l.id })}>Delete</button>
                        </div>
                      </div>
                      <p className="text-muted small text-truncate" style={{ maxWidth: "400px" }}>{l.description}</p>
                      <div className="mt-3 pt-3 border-top">
                        {attachedQuiz ? (
                          <div className="bg-light p-3 rounded-3 d-flex justify-content-between align-items-center">
                            <div>
                              <span className="badge bg-info text-dark mb-1">Attached Quiz</span>
                              <div className="fw-bold">{attachedQuiz.questions.length} Questions</div>
                            </div>
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-light border" onClick={() => setEditQuizTarget(attachedQuiz)}>Edit Quiz</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget({ type: "quiz", id: attachedQuiz.id })}>Delete Quiz</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted small italic p-2 border border-dashed rounded-3">
                            No quiz attached to this lesson. Use the form on the left to add one.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* --- STUDENT VIEW ENGINE --- */
          <div className="row justify-content-center">
            <div className="col-lg-10">
              {viewMode === "list" && (
                <div>
                  <h4 className="fw-bold mb-4 text-secondary">Course Curriculum</h4>
                  {lessons.map((lesson, idx) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const lessonQuiz = quizzes.find(q => q.lessonId === lesson.id);
                    const quizDone = isQuizPerfect(lessonQuiz);
                    return (
                      <div key={lesson.id} className="card border-0 shadow-sm rounded-4 mb-3 p-2 border-start border-5 border-primary">
                        <div className="card-body d-flex justify-content-between align-items-center">
                          <div>
                            <h4 className="fw-bold mb-1">{lesson.title}</h4>
                            <div className="d-flex gap-3">
                              <span className={`small ${isCompleted ? 'text-success fw-bold' : 'text-muted'}`}>
                                {isCompleted ? "✓ Lesson Read" : "○ Not Read"}
                              </span>
                              {lessonQuiz && (
                                <span className={`small ${quizDone ? 'text-success fw-bold' : 'text-muted'}`}>
                                  {quizDone ? "✓ Quiz Passed" : "○ Quiz Pending"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
                              onClick={() => { setActiveItem(lesson); setViewMode("lesson"); }}
                            >
                              Open Lesson
                            </button>
                            {lessonQuiz && (
                              <button 
                                className={`btn rounded-pill px-4 fw-bold ${quizDone ? 'btn-outline-success' : 'btn-outline-warning'}`}
                                onClick={() => { setActiveItem(lessonQuiz); setViewMode("quiz"); }}
                              >
                                {quizDone ? "Review Quiz" : "Take Quiz"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === "lesson" && activeItem && (
                <div className="card border-0 shadow rounded-4 p-5 bg-white">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <span className="badge bg-primary px-3 py-2 rounded-pill mb-2">READING MODE</span>
                      <h1 className="fw-bolder">{activeItem.title}</h1>
                    </div>
                    {completedLessons.includes(activeItem.id) && <h5 className="text-success fw-bold mt-2">✓ Completed</h5>}
                  </div>
                  <hr className="mb-4" />
                  <div className="content-body mb-5" style={{ whiteSpace: "pre-wrap", fontSize: "1.15rem", lineHeight: "1.8", color: "#333" }}>
                    {activeItem.description}
                  </div>
                  <div className="d-flex justify-content-between border-top pt-4">
                    <button className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setViewMode("list")}>Back to Curriculum</button>
                    <button 
                      className={`btn rounded-pill px-5 fw-bold ${completedLessons.includes(activeItem.id) ? 'btn-success' : 'btn-primary shadow'}`}
                      onClick={() => handleCompleteLesson(activeItem.id)}
                    >
                      {completedLessons.includes(activeItem.id) ? "✓ Mark as Read" : "Finish Lesson"}
                    </button>
                  </div>
                </div>
              )}

              {viewMode === "quiz" && activeItem && (
                <div className="card border-0 shadow rounded-4 p-5 bg-white" ref={quizTopRef}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold mb-0 text-primary">{activeItem.title}</h2>
                    {isQuizPerfect(activeItem) && <span className="badge bg-success p-2 px-3 rounded-pill shadow-sm">100% Correct</span>}
                  </div>
                  <p className="text-muted mb-4">Select the correct answer for each question.</p>
                  <hr className="mb-5" />
                  {activeItem.questions.map((q, qi) => {
                    const answers = studentAnswers[activeItem.id] || {};
                    return (
                      <div key={qi} className="mb-5 p-4 border rounded-4 bg-light shadow-sm">
                        <h5 className="fw-bold mb-4">{qi + 1}. {q.question}</h5>
                        <div className="row g-3">
                          {q.choices.map((c, ci) => {
                            const selected = answers[qi] === ci;
                            let extraClass = "";
                            if (selected) {
                                extraClass = c.isCorrect ? "answer-correct" : "answer-incorrect";
                            }
                            return (
                              <div key={ci} className="col-md-6">
                                <button 
                                  className={`btn w-100 text-start p-3 rounded-3 fw-bold choice-card-btn ${extraClass}`}
                                  disabled={answers[qi] !== undefined || isQuizPerfect(activeItem)}
                                  onClick={() => handleAnswer(activeItem.id, qi, ci, activeItem)}
                                >
                                  {c.text}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="d-flex gap-3 mt-4">
                    <button className="btn btn-light rounded-pill px-4 fw-bold" onClick={() => setViewMode("list")}>Exit Quiz</button>
                    {Object.keys(studentAnswers[activeItem.id] || {}).length === activeItem.questions.length && !isQuizPerfect(activeItem) && (
                        <button 
                            className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm" 
                            onClick={() => handleRedoQuiz(activeItem.id)}
                            disabled={hearts <= 0}
                        >
                            {hearts > 0 ? `Reset & Retake (-1 ❤️)` : "Out of Hearts"}
                        </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- HEART STATUS MODAL (STUDENT ONLY) --- */}
      {showHeartModal && user?.role === "student" && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 rounded-4 shadow p-4 text-center">
                    <div className="mb-3">
                        <span style={{fontSize: '4rem'}}>❤️</span>
                    </div>
                    {hearts >= 5 ? (
                        <>
                            <h3 className="fw-bold">Hearts are Full!</h3>
                            <p className="text-muted">You are in peak condition. Go ahead and tackle those quizzes!</p>
                        </>
                    ) : (
                        <>
                            <h3 className="fw-bold">Next Heart In</h3>
                            <h2 className="text-primary fw-bolder mb-3">{nextHeartTime || "Calculating..."}</h2>
                            <p className="text-muted">Hearts are used to retry quizzes you didn't perfect. One heart regenerates every 3 hours.</p>
                        </>
                    )}
                    
                    <div className="bg-light p-3 rounded-4 mb-4 border border-primary">
                        <h6 className="fw-bold mb-1 text-primary">✨ Unlimited Hearts</h6>
                        <p className="small mb-2">Never wait for hearts again with a Pro subscription.</p>
                        <button className="btn btn-primary w-100 rounded-pill fw-bold" onClick={() => alert("Subscription feature coming soon!")}>Subscribe Now</button>
                    </div>

                    <button className="btn btn-light w-100 rounded-pill fw-bold" onClick={() => setShowHeartModal(false)}>Close</button>
                </div>
            </div>
        </div>
      )}

      {/* --- ADMIN MODALS --- */}
      {editLessonTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
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
                <div className="modal-header border-0 p-4 pb-0"><h5 className="fw-bold">Edit Quiz Details</h5></div>
                <div className="modal-body p-4">
                    <input className="form-control mb-4 fw-bold border-primary" value={editQuizTarget.title} onChange={e => setEditQuizTarget({...editQuizTarget, title: e.target.value})} />
                    {editQuizTarget.questions.map((q, qi) => (
                        <div key={qi} className="bg-light p-3 rounded-3 mb-3 border">
                            <input className="form-control mb-2 fw-bold" value={q.question} onChange={e => {
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
                    <button className="btn btn-primary px-4 fw-bold" onClick={handleUpdateQuiz}>Save Quiz Updates</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 rounded-4 p-4 text-center shadow">
              <h6 className="fw-bold mb-3 text-danger">Are you sure?</h6>
              <p className="small text-muted mb-3">Deleting this {deleteTarget.type} cannot be undone.</p>
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