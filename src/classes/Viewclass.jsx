function ViewClass() {
  return (
    <>
      {/* PAGE HEADER */}
      <section className="bg-light py-5 border-bottom">
        <div className="container">
          <h1 className="fw-bold display-5">WD-101: Web Development</h1>
          <p className="text-muted">
            This class covers beginner web development topics including HTML, CSS, and JavaScript.
          </p>
          <div className="d-flex gap-3 mt-3 flex-wrap">
            <span className="badge bg-primary">Web Development</span>
            <span className="badge bg-success">3 Learning Paths</span>
            <span className="badge bg-warning text-dark">25 Students</span>
          </div>
        </div>
      </section>

      {/* CLASS LEARNING PATHS */}
      <section className="py-5">
        <div className="container">
          <h4 className="fw-bold mb-4">Assigned Learning Paths</h4>
          <div className="row g-4">

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h5 className="fw-semibold">Web Development Fundamentals</h5>
                  <p className="text-muted small mt-2">
                    12 lessons • Beginner level
                  </p>
                  <a href="#" className="btn btn-outline-primary btn-sm mt-3">
                    View Path
                  </a>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h5 className="fw-semibold">JavaScript Essentials</h5>
                  <p className="text-muted small mt-2">
                    15 lessons • Intermediate level
                  </p>
                  <a href="#" className="btn btn-outline-primary btn-sm mt-3">
                    View Path
                  </a>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <h5 className="fw-semibold">React Fundamentals</h5>
                  <p className="text-muted small mt-2">
                    10 lessons • Intermediate level
                  </p>
                  <a href="#" className="btn btn-outline-primary btn-sm mt-3">
                    View Path
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ENROLLED STUDENTS */}
      <section className="py-5 bg-light">
        <div className="container">
          <h4 className="fw-bold mb-4">Enrolled Students</h4>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Student Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Progress</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">1</th>
                  <td>Kent Harjel Alibango</td>
                  <td>kent@example.com</td>
                  <td>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-primary" style={{ width: "66%" }}></div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-success">Active</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">2</th>
                  <td>Maria Santos</td>
                  <td>maria@example.com</td>
                  <td>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-warning" style={{ width: "45%" }}></div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-success">Active</span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">3</th>
                  <td>Juan Dela Cruz</td>
                  <td>juan@example.com</td>
                  <td>
                    <div className="progress" style={{ height: "8px" }}>
                      <div className="progress-bar bg-secondary" style={{ width: "25%" }}></div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-danger">Inactive</span>
                  </td>
                </tr>
                {/* Add more students here */}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-5">
        <div className="container text-center">
          <div className="bg-primary text-white rounded-4 p-5 shadow-sm">
            <h4 className="fw-bold">Manage Your Class</h4>
            <p className="mt-3 mb-4">
              Assign new learning paths or monitor student progress easily.
            </p>
            <a href="#" className="btn btn-light btn-lg fw-semibold">
              Assign Learning Path
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default ViewClass;
