function GetStarted() {
  return (
    <>
      {/* PAGE HEADER */}
      <section className="bg-light py-5 border-bottom">
        <div className="container py-4 text-center">
          <h1 className="fw-bold display-5 text-dark">Get Started with SkillPath</h1>
          <p className="lead text-muted mt-3">
            Choose how you want to use SkillPath and begin your learning journey.
          </p>
        </div>
      </section>

      {/* ROLE SELECTION */}
      <section className="py-5">
        <div className="container py-4">
          <div className="row g-4 justify-content-center">

            {/* STUDENT CARD */}
            <div className="col-md-5">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-5 text-center">
                  <div className="mb-3 fs-1">🎓</div>
                  <h3 className="fw-bold">I’m a Student</h3>
                  <p className="text-muted mt-3">
                    Join professor-created classes, follow structured learning
                    paths, complete lessons and activities, and track your
                    progress and achievements.
                  </p>

                  <ul className="list-unstyled text-muted small mt-4">
                    <li>✔ Access guided learning paths</li>
                    <li>✔ Complete lessons and quizzes</li>
                    <li>✔ Track progress automatically</li>
                    <li>✔ Earn badges and achievements</li>
                  </ul>

                  <a
                    href="/signup?role=student"
                    className="btn btn-primary btn-lg mt-4 px-4 shadow-sm"
                  >
                    Continue as Student
                  </a>
                </div>
              </div>
            </div>

            {/* PROFESSOR CARD */}
            <div className="col-md-5">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-5 text-center">
                  <div className="mb-3 fs-1">👨‍🏫</div>
                  <h3 className="fw-bold">I’m a Professor</h3>
                  <p className="text-muted mt-3">
                    Create and manage classes, assign learning paths, guide
                    students, and monitor learning progress in one place.
                  </p>

                  <ul className="list-unstyled text-muted small mt-4">
                    <li>✔ Create and manage classes</li>
                    <li>✔ Assign learning paths</li>
                    <li>✔ Monitor student progress</li>
                    <li>✔ Support guided learning</li>
                  </ul>

                  <a
                    href="/signup?role=professor"
                    className="btn btn-outline-primary btn-lg mt-4 px-4"
                  >
                    Continue as Professor
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* NEXT STEPS */}
      <section className="bg-light py-5">
        <div className="container py-4 text-center">
          <h2 className="fw-bold">What Happens Next?</h2>
          <p className="text-muted mt-3">
            After choosing your role, you’ll be guided through account creation
            and setup so you can start learning or teaching right away.
          </p>

          <div className="row g-4 mt-4">

            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100 rounded-4">
                <div className="card-body p-4">
                  <h6 className="fw-semibold">Create an Account</h6>
                  <p className="text-muted small mt-2">
                    Sign up securely and set up your SkillPath profile.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100 rounded-4">
                <div className="card-body p-4">
                  <h6 className="fw-semibold">Join or Create Classes</h6>
                  <p className="text-muted small mt-2">
                    Students join classes while professors create and manage them.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100 rounded-4">
                <div className="card-body p-4">
                  <h6 className="fw-semibold">Start Learning or Teaching</h6>
                  <p className="text-muted small mt-2">
                    Follow learning paths or guide students toward skill mastery.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

export default GetStarted;
