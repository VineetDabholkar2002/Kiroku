import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

const LoginPage = () => {
  const [username, setUsername]     = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const navigate                    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/user/login", { username, password });
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("username", data.user.username);
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      navigate("/playlist");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#080c14" }}>

      {/* ── Left decorative panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">

        {/* Background gradient mesh */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, #0d1526 0%, #080c14 50%, #0a0f1e 100%)"
        }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-30"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20"
          style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />

        {/* Decorative dot grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }} />

        {/* Floating anime cards */}
        <div className="absolute inset-0 pointer-events-none">
          {[
            { top: "12%",  left: "8%",   rotate: "-8deg",  w: "80px",  h: "112px", delay: "0s",    bg: "rgba(59,130,246,0.15)"  },
            { top: "20%",  left: "60%",  rotate: "6deg",   w: "64px",  h: "90px",  delay: "0.4s",  bg: "rgba(124,58,237,0.15)"  },
            { top: "55%",  left: "15%",  rotate: "4deg",   w: "72px",  h: "100px", delay: "0.8s",  bg: "rgba(16,185,129,0.12)"  },
            { top: "65%",  left: "68%",  rotate: "-5deg",  w: "68px",  h: "96px",  delay: "0.2s",  bg: "rgba(59,130,246,0.12)"  },
            { top: "38%",  left: "42%",  rotate: "10deg",  w: "56px",  h: "78px",  delay: "0.6s",  bg: "rgba(245,158,11,0.10)"  },
            { top: "78%",  left: "35%",  rotate: "-3deg",  w: "60px",  h: "84px",  delay: "1s",    bg: "rgba(124,58,237,0.12)"  },
          ].map((c, i) => (
            <div key={i} className="absolute rounded-xl border border-white/[0.08] backdrop-blur-sm"
              style={{
                top: c.top, left: c.left, width: c.w, height: c.h,
                transform: `rotate(${c.rotate})`,
                background: c.bg,
                animation: `float 6s ease-in-out ${c.delay} infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"
              style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}>
              <span className="text-white font-black text-base">K</span>
            </div>
            <span className="text-xl font-black tracking-tight"
              style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Kiroku
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1.5 mb-6 text-xs text-blue-300/80">
            <HiSparkles className="text-blue-400" />
            Your anime tracking companion
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Track every series.<br />
            <span style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Never lose your place.
            </span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            Manage your anime list, discover soundtracks, and build playlists — all in one place.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {[
            { value: "20k+", label: "Anime" },
            { value: "50k+", label: "Songs" },
            { value: "40+",  label: "Genres" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-gray-600 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">

        {/* Subtle background for right side */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10"
            style={{ background: "radial-gradient(circle,#3b82f6,transparent)" }} />
        </div>

        <div className="relative w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}>
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-lg font-black"
              style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Kiroku
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
            <p className="text-gray-600 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
              <span className="text-base shrink-0">⚠</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600
                  border border-white/[0.08] bg-white/[0.04]
                  focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07]
                  focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]
                  transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl text-white text-sm placeholder-gray-600
                    border border-white/[0.08] bg-white/[0.04]
                    focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07]
                    focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]
                    transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white
                disabled:opacity-40 disabled:cursor-not-allowed
                active:scale-[0.98] transition-all duration-150
                shadow-lg shadow-blue-600/20"
              style={{ background: "linear-gradient(135deg,#3b82f6,#6d28d9)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin text-xs" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-gray-700">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Register link */}
          <p className="text-center text-gray-600 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) rotate(var(--r, 0deg)); }
          to   { transform: translateY(-12px) rotate(var(--r, 0deg)); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;