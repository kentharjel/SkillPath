function About() {
  return (
    <>
      {/* PAGE HEADER */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">About SkillPath</h1>
          <p className="lead text-muted mt-3">
            A guided learning platform designed to improve skill development
            through structured and personalized learning paths.
          </p>
        </div>
      </section>

      {/* ABOUT CONTENT */}
      <section className="py-5">
        <div className="container py-4">
          <div className="row align-items-center">

            {/* Text */}
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h2 className="fw-bold">What is SkillPath?</h2>
              <p className="text-muted mt-3">
                SkillPath is a simple and user-friendly learning platform that
                helps students develop and master skills through structured
                learning paths. It allows students to join professor-created
                classes where lessons and activities are organized in a clear
                and guided manner.
              </p>
              <p className="text-muted">
                Professors can create classes, assign learning paths, and monitor
                student progress, while students can easily access lessons,
                complete activities, and track their achievements.
              </p>
            </div>

            {/* Visual Card */}
            <div className="col-lg-6 text-center">
              <div className="bg-white shadow-sm rounded-4 p-5">
                <h5 className="fw-semibold text-muted">
                  🎓 Supporting Guided & Effective Learning
                </h5>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* MISSION & VISION */}
      <section className="bg-light py-5">
        <div className="container py-4">
          <div className="row g-4">

            <div className="col-md-6">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h4 className="fw-bold">Our Mission</h4>
                  <p className="text-muted mt-3">
                    To provide a guided and interactive learning platform that
                    helps students build skills effectively while giving
                    professors the tools to manage learning paths and track
                    progress with ease.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h4 className="fw-bold">Our Vision</h4>
                  <p className="text-muted mt-3">
                    To become a reliable learning support system that promotes
                    structured skill development, continuous learning, and
                    meaningful progress for both students and educators.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES SUMMARY */}
      <section className="py-5">
        <div className="container py-4">

          <div className="text-center mb-5">
            <h2 className="fw-bold">What SkillPath Offers</h2>
            <p className="text-muted">
              Core features designed for students and professors
            </p>
          </div>

          <div className="row g-4">

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h6 className="fw-semibold">Structured Learning Paths</h6>
                  <p className="text-muted small mt-2">
                    Organized lessons, exercises, and quizzes that guide
                    learners step-by-step based on skill level and goals.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h6 className="fw-semibold">Progress Monitoring</h6>
                  <p className="text-muted small mt-2">
                    Automatic tracking of completed lessons and overall learning
                    progress for both students and professors.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h6 className="fw-semibold">Motivation & Achievements</h6>
                  <p className="text-muted small mt-2">
                    Badges and achievements that encourage learners to stay
                    engaged and motivated.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-5">
        <div className="container py-4">
          <div className="bg-primary text-white rounded-4 p-5 text-center shadow-sm">
            <h2 className="fw-bold">Learn Smarter with SkillPath</h2>
            <p className="mt-3 mb-4">
              Experience guided learning designed for real skill development.
            </p>
            <a href="/getstarted" className="btn btn-light btn-lg fw-semibold">
              Get Started
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default About;
