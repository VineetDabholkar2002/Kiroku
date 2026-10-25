import { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import { AuthContext } from "../context/AuthContext";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/popular";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/api/v1/user/login", { username, password });
      const resolvedUsername = data?.username ?? data?.user?.username;
      const token = data?.token;

      if (!resolvedUsername) {
        throw new Error("Login response did not include a username.");
      }

      login(resolvedUsername, token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#090c12]">
      {/* ── Left decorative panel (Midnight Sakura Theme) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 border-r border-white/[0.06]">
        {/* Deep midnight mesh */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(145deg, #090c12 0%, #121622 50%, #090c12 100%)",
          }}
        />

        {/* Soft glowing sakura moonlight orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full blur-[140px] opacity-25 pointer-events-none"
          style={{ background: "radial-gradient(circle, #f43f5e 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full blur-[120px] opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #fb7185 0%, transparent 70%)" }}
        />

        {/* Decorative subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Floating cards with sakura rose tint */}
        <div className="absolute inset-0 pointer-events-none">
          {[
            { top: "12%", left: "8%", rotate: "-8deg", w: "80px", h: "112px", delay: "0s", bg: "rgba(244,63,94,0.12)" },
            { top: "20%", left: "60%", rotate: "6deg", w: "64px", h: "90px", delay: "0.4s", bg: "rgba(251,113,133,0.12)" },
            { top: "55%", left: "15%", rotate: "4deg", w: "72px", h: "100px", delay: "0.8s", bg: "rgba(244,63,94,0.10)" },
            { top: "65%", left: "68%", rotate: "-5deg", w: "68px", h: "96px", delay: "0.2s", bg: "rgba(251,113,133,0.10)" },
            { top: "38%", left: "42%", rotate: "10deg", w: "56px", h: "78px", delay: "0.6s", bg: "rgba(244,63,94,0.08)" },
            { top: "78%", left: "35%", rotate: "-3deg", w: "60px", h: "84px", delay: "1s", bg: "rgba(251,113,133,0.10)" },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute rounded-xl border border-white/[0.08] backdrop-blur-sm"
              style={{
                top: c.top,
                left: c.left,
                width: c.w,
                height: c.h,
                transform: `rotate(${c.rotate})`,
                background: c.bg,
                animation: `float 6s ease-in-out ${c.delay} infinite alternate`,
              }}
            />
          ))}
        </div>

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/logo.png"
              alt="Kiroku"
              className="w-11 h-11 rounded-2xl shadow-xl shadow-rose-500/25 ring-1 ring-white/10 object-cover"
            />
            <span
              className="text-2xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg,#f43f5e 0%,#fb7185 50%,#fda4af 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Kiroku
            </span>
          </div>
        </div>

        {/* Hero Tagline & Description */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/25 rounded-full px-3.5 py-1.5 mb-6 text-xs font-semibold text-rose-300">
            <HiSparkles className="text-rose-400" />
            Your anime tracking companion
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-[1.15] mb-4 tracking-tight">
            Track every series.<br />
            <span
              style={{
                background: "linear-gradient(135deg,#f43f5e 0%,#fb7185 50%,#fda4af 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Never lose your place.
            </span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Manage your anime list, discover soundtracks, and build playlists in one place.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 flex items-center gap-8">
          {[
            { value: "30k+", label: "Anime" },
            { value: "50k+", label: "Songs" },
            { value: "69k+", label: "Characters" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Subtle ambient rose background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 right-1/4 w-[350px] h-[350px] rounded-full blur-[140px] opacity-15"
            style={{ background: "radial-gradient(circle,rgba(244,63,94,0.35),transparent)" }}
          />
        </div>

        <div className="relative w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <img
              src="/logo.png"
              alt="Kiroku"
              className="w-10 h-10 rounded-xl shadow-md ring-1 ring-white/10 object-cover"
            />
            <span
              className="text-xl font-black"
              style={{
                background: "linear-gradient(135deg,#f43f5e 0%,#fb7185 50%,#fda4af 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Kiroku
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/25 text-red-300 rounded-xl px-4 py-3 text-sm">
              <span className="text-base shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
              >
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
                className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-slate-500 border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-rose-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-rose-500/20 transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
              >
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
                  className="w-full px-4 py-3 pr-11 rounded-xl text-white text-sm placeholder-slate-500 border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-rose-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-rose-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin text-sm" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Guest tip */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
            <p className="text-xs text-slate-500 leading-relaxed">
              Don't have an account yet? You can still browse anime, discover soundtracks, and search without signing in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
