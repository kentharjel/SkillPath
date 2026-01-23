import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: currentUser.uid, ...userDoc.data() });
          } else {
            setUser({ uid: currentUser.uid, fullname: "User", role: "student" });
          }
        } catch (err) {
          console.error("Failed to fetch user info:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Buttons in Hero Section based on role
  const renderHeroButtons = () => {
    if (loading) return null;

    if (!user) {
      return (
        <>
          <a href="/getstarted" className="btn btn-primary btn-lg shadow-sm">
            Get Started
          </a>
          <a href="/learningpaths" className="btn btn-outline-primary btn-lg">
            Explore Learning Paths
          </a>
        </>
      );
    } else if (user.role === "student") {
      return (
        <>
          <Link to="/learningpaths" className="btn btn-primary btn-lg shadow-sm">
            My Learning Paths
          </Link>
          <Link to="/classes" className="btn btn-outline-primary btn-lg">
            My Classes
          </Link>
        </>
      );
    } else if (user.role === "professor") {
      return (
        <>
          <Link to="/classes" className="btn btn-primary btn-lg shadow-sm">
            Manage Classes
          </Link>
          <Link to="/progress" className="btn btn-outline-primary btn-lg">
            Track Students
          </Link>
        </>
      );
    }
  };

  // Cards in Features Section based on role
  const renderFeatureCards = () => {
    if (!user) {
      // Guest sees all
      return (
        <>
          {/* Structured Learning Paths */}
          <FeatureCard
            title="Structured Learning Paths"
            description="Follow step-by-step learning paths designed to build skills progressively based on your level and goals."
          />
          {/* Progress Tracking */}
          <FeatureCard
            title="Progress Tracking"
            description="Automatically track completed lessons, quizzes, and milestones so you always know where you stand."
          />
          {/* Class Management */}
          <FeatureCard
            title="Class Management"
            description="Professors can create classes, assign learning paths, and monitor student progress in one dashboard."
          />
        </>
      );
    } else if (user.role === "student") {
      return (
        <>
          <FeatureCard
            title="Structured Learning Paths"
            description="Follow step-by-step learning paths designed to build skills progressively based on your level and goals."
          />
          <FeatureCard
            title="Progress Tracking"
            description="Automatically track completed lessons, quizzes, and milestones so you always know where you stand."
          />
        </>
      );
    } else if (user.role === "professor") {
      return (
        <>
          <FeatureCard
            title="Class Management"
            description="Create classes, assign learning paths, and monitor student progress efficiently."
          />
          <FeatureCard
            title="Progress Tracking"
            description="Track your students' completed lessons and overall progress easily."
          />
        </>
      );
    }
  };

  // Cards in How It Works section based on role
  const renderHowItWorks = () => {
    if (!user || user.role === "student") {
      return (
        <>
          <HowItWorksCard number="1" title="Join a Class" description="Students join professor-created classes to access lessons." />
          <HowItWorksCard number="2" title="Follow Learning Paths" description="Complete lessons, exercises, and quizzes step-by-step." />
          <HowItWorksCard number="3" title="Track Progress" description="View completed lessons and overall progress automatically." />
          <HowItWorksCard number="4" title="Earn Badges" description="Stay motivated by earning badges for achievements." />
        </>
      );
    } else if (user.role === "professor") {
      return (
        <>
          <HowItWorksCard number="1" title="Create Classes" description="Create and manage your classes efficiently." />
          <HowItWorksCard number="2" title="Assign Learning Paths" description="Assign structured learning paths to your students." />
          <HowItWorksCard number="3" title="Track Student Progress" description="Monitor your students' completed lessons and performance." />
          <HowItWorksCard number="4" title="Evaluate & Give Feedback" description="Provide feedback and guide your students effectively." />
        </>
      );
    }
  };

  return (
    <>
      {/* HERO SECTION */}
      <section className="bg-light py-5">
        <div className="container py-5">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h1 className="fw-bold display-5 text-dark">
                Build Skills with
                <span className="text-primary"> Structured Learning Paths</span>
              </h1>
              <p className="lead text-muted mt-4">
                SkillPath helps students master skills through guided lessons
                while enabling professors to manage classes and track progress
                efficiently.
              </p>
              <div className="d-flex gap-3 mt-4">
                {renderHeroButtons()}
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <div className="bg-white shadow-sm rounded-4 p-5">
                <h5 className="fw-semibold text-muted">📚 Guided Learning Dashboard Preview</h5>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-5">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Why Choose SkillPath?</h2>
            <p className="text-muted">Everything you need for guided and effective learning</p>
          </div>
          <div className="row g-4">{renderFeatureCards()}</div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-light py-5">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="fw-bold">How SkillPath Works</h2>
            <p className="text-muted">Simple steps for students and professors</p>
          </div>
          <div className="row g-4">{renderHowItWorks()}</div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-5">
        <div className="container py-4">
          <div className="bg-primary text-white rounded-4 p-5 text-center shadow-sm">
            <h2 className="fw-bold">Start Your Learning Journey Today</h2>
            <p className="mt-3 mb-4">Join SkillPath and experience structured, guided learning.</p>
            {!user && (
              <a href="/getstarted" className="btn btn-light btn-lg fw-semibold">
                Create an Account
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// Feature Card Component
const FeatureCard = ({ title, description }) => (
  <div className="col-md-4">
    <div className="card h-100 border-0 shadow-sm rounded-4">
      <div className="card-body p-4">
        <h5 className="fw-semibold">{title}</h5>
        <p className="text-muted small mt-2">{description}</p>
      </div>
    </div>
  </div>
);

// How It Works Card Component
const HowItWorksCard = ({ number, title, description }) => (
  <div className="col-md-3">
    <div className="card border-0 shadow-sm h-100 rounded-4">
      <div className="card-body p-4 text-center">
        <h5 className="fw-bold text-primary">{number}</h5>
        <h6 className="fw-semibold mt-3">{title}</h6>
        <p className="text-muted small">{description}</p>
      </div>
    </div>
  </div>
);

export default Home;
