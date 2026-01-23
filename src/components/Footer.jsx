function Footer() {
  return (
    <footer className="bg-light border-top mt-auto">
      <div className="container py-5">

        <div className="row gy-4">

          {/* Brand */}
          <div className="col-md-4">
            <h5 className="fw-bold text-dark">
              Skill<span className="text-primary">Path</span>
            </h5>
            <p className="text-muted small mt-3">
              SkillPath is a modern learning platform designed to help students
              master skills through structured learning paths while enabling
              professors to guide, manage, and monitor student progress.
            </p>
          </div>

          {/* Platform */}
          <div className="col-md-2">
            <h6 className="fw-semibold text-dark">Platform</h6>
            <ul className="list-unstyled mt-3">
              <li><a href="#" className="text-muted text-decoration-none">Learning Paths</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Classes</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Progress</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Badges</a></li>
            </ul>
          </div>

          {/* Users */}
          <div className="col-md-3">
            <h6 className="fw-semibold text-dark">For Users</h6>
            <ul className="list-unstyled mt-3">
              <li className="text-muted small">Students follow guided learning paths</li>
              <li className="text-muted small">Track lesson completion</li>
              <li className="text-muted small">Earn badges & achievements</li>
              <li className="text-muted small">Professors manage classes & progress</li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-md-3">
            <h6 className="fw-semibold text-dark">Support</h6>
            <ul className="list-unstyled mt-3">
              <li><a href="#" className="text-muted text-decoration-none">Help Center</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Documentation</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Privacy Policy</a></li>
              <li><a href="#" className="text-muted text-decoration-none">Terms of Service</a></li>
            </ul>
          </div>

        </div>

        <hr className="my-4" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
          <p className="text-muted small mb-2 mb-md-0">
            © {new Date().getFullYear()} SkillPath. All rights reserved.
          </p>

          <p className="text-muted small">
            Built for guided learning and skill mastery
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
