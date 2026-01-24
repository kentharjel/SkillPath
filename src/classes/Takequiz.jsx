import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc } from "firebase/firestore";

function TakeQuiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const { classId, contentId } = location.state || {};

  const [quiz, setQuiz] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [previousScore, setPreviousScore] = useState(null);

  // Quiz Interaction State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Admin Edit State
  const [editQuestions, setEditQuestions] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return navigate("/login");
      
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = { uid: currentUser.uid, ...userDoc.data() };
      setUser(userData);

      if (classId && contentId) {
        // 1. Fetch Quiz Data
        const quizSnap = await getDoc(doc(db, `classes/${classId}/content`, contentId));
        if (quizSnap.exists()) {
          const data = quizSnap.data();
          setQuiz(data);
          setEditQuestions(data.questions || []);

          // 2. No Retake Logic: Check for previous attempt and get the score
          if (userData.role === "student") {
            const attemptsRef = collection(db, `classes/${classId}/attempts`);
            const q = query(attemptsRef, 
              where("studentId", "==", currentUser.uid), 
              where("quizId", "==", contentId)
            );
            const attemptSnaps = await getDocs(q);
            
            if (!attemptSnaps.empty) {
              // Get the score from the first found attempt
              const attemptData = attemptSnaps.docs[0].data();
              setPreviousScore(attemptData.score);
              setAlreadyAttempted(true);
            }
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId, contentId, navigate]);

  // --- PROFESSOR LOGIC ---
  const handleUpdateQuiz = async () => {
    try {
      await updateDoc(doc(db, `classes/${classId}/content`, contentId), {
        questions: editQuestions
      });
      setQuiz({ ...quiz, questions: editQuestions });
      alert("Quiz updated successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const updateQuestionText = (index, val) => {
    const updated = [...editQuestions];
    updated[index].questionText = val;
    setEditQuestions(updated);
  };

  // --- STUDENT LOGIC ---
  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResult();
    }
  };

  const calculateResult = async () => {
    let totalCorrect = 0;
    quiz.questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) totalCorrect++;
    });

    const finalScore = Math.round((totalCorrect / quiz.questions.length) * 100);
    setScore(finalScore);
    setIsFinished(true);

    // Save attempt to Firestore
    await addDoc(collection(db, `classes/${classId}/attempts`), {
      studentId: user.uid,
      studentName: user.fullname || "Student",
      quizId: contentId,
      quizTitle: quiz.title,
      score: finalScore,
      completedAt: serverTimestamp(),
    });
  };

  if (loading) return <div className="text-center py-5">Loading...</div>;

  // --- RENDER: PROFESSOR VIEW ---
  if (user?.role === "professor") {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold">Edit Quiz: {quiz?.title}</h2>
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Back</button>
        </div>
        {editQuestions.map((q, qIdx) => (
          <div key={qIdx} className="card p-4 mb-3 border-0 shadow-sm rounded-4">
            <input 
              className="form-control fw-bold mb-3" 
              value={q.questionText} 
              onChange={(e) => updateQuestionText(qIdx, e.target.value)}
            />
            <div className="row g-2">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="col-md-6">
                  <div className={`p-2 border rounded ${q.correctAnswer === oIdx ? 'bg-success-subtle border-success' : ''}`}>
                    {opt} {q.correctAnswer === oIdx && "✅"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-primary w-100 py-3 rounded-pill fw-bold" onClick={handleUpdateQuiz}>Save Quiz Changes</button>
      </div>
    );
  }

  // --- RENDER: STUDENT VIEW (LOCKED - SHOW PREVIOUS SCORE) ---
  if (alreadyAttempted && !isFinished) {
    return (
      <div className="container py-5 text-center">
        <div className="card border-0 shadow-lg p-5 rounded-4 mx-auto" style={{ maxWidth: "500px" }}>
          <div className="display-1 mb-4">✅</div>
          <h2 className="fw-bold">Quiz Already Done</h2>
          <p className="text-muted mt-3">
            You have already submitted your answers for <strong>{quiz?.title}</strong>. 
            Your recorded score is:
          </p>
          <div className="display-4 fw-bold text-primary mb-3">{previousScore}%</div>
          <p className="small text-muted mb-4">Retakes are not allowed for this assessment.</p>
          <button className="btn btn-primary rounded-pill px-5" onClick={() => navigate(-1)}>Return to Class</button>
        </div>
      </div>
    );
  }

  // --- RENDER: STUDENT VIEW (RESULT SCREEN FOR NEW ATTEMPT) ---
  if (isFinished) {
    return (
      <div className="container py-5 text-center">
        <div className="card border-0 shadow-lg p-5 rounded-4 mx-auto" style={{ maxWidth: "500px" }}>
          <div className="display-4 mb-3">{score === 100 ? "🌟 Perfect!" : "✅ Submitted"}</div>
          <h2 className="fw-bold">{score}%</h2>
          <p className="text-muted">Your score has been successfully recorded.</p>
          <button className="btn btn-primary mt-4 px-5 rounded-pill" onClick={() => navigate(-1)}>Finish</button>
        </div>
      </div>
    );
  }

  // --- RENDER: STUDENT VIEW (TAKING QUIZ) ---
  const q = quiz.questions[currentQuestion];
  return (
    <div className="container py-5">
      <div className="progress mb-4" style={{ height: "10px" }}>
        <div className="progress-bar" style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}></div>
      </div>
      <div className="card border-0 shadow-sm p-4 p-md-5 rounded-4">
        <h3 className="fw-bold mb-4">{q.questionText}</h3>
        <div className="d-flex flex-column gap-3">
          {q.options.map((opt, idx) => (
            <button 
              key={idx} 
              className={`btn btn-lg text-start p-3 rounded-4 border-2 ${selectedAnswers[currentQuestion] === idx ? 'btn-primary' : 'btn-outline-light text-dark border-light-subtle'}`}
              onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: idx })}
            >
              {opt}
            </button>
          ))}
        </div>
        <button 
          className="btn btn-primary mt-5 py-3 rounded-pill fw-bold" 
          disabled={selectedAnswers[currentQuestion] === undefined}
          onClick={handleNext}
        >
          {currentQuestion === quiz.questions.length - 1 ? "Submit Quiz" : "Next Question"}
        </button>
      </div>
    </div>
  );
}

export default TakeQuiz;