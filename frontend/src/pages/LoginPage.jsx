import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";
import KirokuLogo from "../assets/kiroku-logo.svg"; // Assuming you have a logo file

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Call your backend login API - adjust URL and request body accordingly
      const response = await axios.post("/api/v1/user/login", {
        username,
        password,
      });

      // Example: suppose response.data contains auth token & user info
      const { token, user } = response.data;

      // Save user info & token in localStorage for persistence
      localStorage.setItem("authToken", token);
      localStorage.setItem("username", user.username);

      // You can also set axios default header for authorization for further API calls
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Navigate to user’s playlist or main page
      navigate("/playlist");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 border border-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md transition-all duration-300 transform hover:scale-[1.01]">
        <div className="flex flex-col items-center mb-8">
          <img src={KirokuLogo} alt="Kiroku Logo" className="w-16 h-16 mb-4" />
          <h2 className="text-3xl font-extrabold text-white text-center">Login to Kiroku</h2>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-6 bg-red-800 text-white p-3 rounded-lg text-center font-medium shadow-md">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-400">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-400">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 transition-colors py-3 rounded-lg font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Don't have an account?{" "}
          <a href="/register" className="text-purple-500 hover:underline font-semibold">
            Sign up here
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;