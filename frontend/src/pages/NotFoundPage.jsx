import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="min-h-screen text-gray-200 relative overflow-hidden bg-[#090c12]">
    <div className="pointer-events-none fixed inset-0" aria-hidden>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-15"
        style={{ background: "radial-gradient(circle,rgba(244,63,94,0.35),transparent)" }}
      />
    </div>
    <div className="relative flex flex-col items-center justify-center min-h-[85vh] text-center px-4">
      <img
        src="/logo.png"
        alt="Kiroku"
        className="w-16 h-16 rounded-2xl shadow-xl shadow-rose-500/20 ring-1 ring-white/10 object-cover mb-4"
      />
      <div
        className="text-[9rem] font-black leading-none select-none"
        style={{
          background: "linear-gradient(135deg,#f43f5e,#fb7185,#fda4af)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </div>
      <h1 className="text-2xl font-bold text-white -mt-2 mb-2">Page not found</h1>
      <p className="text-gray-400 text-sm mb-8 max-w-xs leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-500/25 active:scale-95 transition-all"
      >
        Go back home
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
