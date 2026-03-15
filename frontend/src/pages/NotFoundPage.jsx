import { Link } from "react-router-dom";
import Navbar from "../skeletons/Navbar";

const NotFoundPage = () => (
  <div className="min-h-screen text-gray-200 relative overflow-hidden" style={{ background: "#080c14" }}>
    <div className="pointer-events-none fixed inset-0" aria-hidden>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10"
        style={{ background: "radial-gradient(circle,#3b82f6,#7c3aed)" }} />
    </div>
    <Navbar />
    <div className="relative flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="text-[10rem] font-black leading-none"
        style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(124,58,237,0.2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        404
      </div>
      <h1 className="text-2xl font-bold text-white -mt-4 mb-3">Page not found</h1>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white
          shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}
      >
        Go back home
      </Link>
    </div>
  </div>
);

export default NotFoundPage;