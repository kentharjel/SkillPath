function ResumeLesson() {
  return (
    <>
      {/* PAGE HEADER */}
      <section className="bg-light py-5 border-bottom">
        <div className="container">
          <h1 className="fw-bold display-5">CSS Flexbox & Grid</h1>
          <p className="text-muted">
            Lesson 3 of "Web Development Fundamentals" • Estimated time: 25 min
          </p>
          <div className="progress mt-3" style={{ height: "10px" }}>
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{ width: "25%" }}
              aria-valuenow="25"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <small className="text-muted">25% completed</small>
        </div>
      </section>

      {/* LESSON CONTENT */}
      <section className="py-5">
        <div className="container">
          <h4 className="fw-bold mb-4">Lesson Content</h4>

          <p>
            Flexbox and Grid are modern CSS layout techniques that allow you
            to create responsive and organized layouts easily.
          </p>

          <h6 className="fw-semibold mt-4">Flexbox Basics</h6>
          <ul>
            <li>Flex container: display: flex;</li>
            <li>Flex items: align, justify, and order content</li>
            <li>Common properties: flex-direction, justify-content, align-items</li>
          </ul>

          <h6 className="fw-semibold mt-4">Grid Basics</h6>
          <ul>
            <li>Grid container: display: grid;</li>
            <li>Define columns and rows using grid-template-columns / grid-template-rows</li>
            <li>Place items using grid-area, grid-column, and grid-row</li>
          </ul>

          <div className="alert alert-info mt-4">
            📝 Tip: Try creating a simple Flexbox layout in your practice environment.
          </div>
        </div>
      </section>

      {/* LESSON NAVIGATION */}
      <section className="py-5 bg-light">
        <div className="container d-flex justify-content-between flex-wrap gap-3">

          <a href="#" className="btn btn-outline-secondary fw-semibold">
            ← Previous Lesson
          </a>

          <a href="#" className="btn btn-primary fw-semibold">
            Next Lesson →
          </a>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-5">
        <div className="container text-center">
          <div className="bg-primary text-white rounded-4 p-5 shadow-sm">
            <h4 className="fw-bold">Keep Learning!</h4>
            <p className="mt-3 mb-4">
              Complete this lesson to continue your learning path and earn progress points.
            </p>
            <a href="#" className="btn btn-light btn-lg fw-semibold">
              Mark as Complete
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default ResumeLesson;
