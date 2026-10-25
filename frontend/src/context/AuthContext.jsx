import React, { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState(() => localStorage.getItem("username"));

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUsername(storedUsername);
  }, []);

  const login = (newUsername, token = null) => {
    setUsername(newUsername);
    localStorage.setItem("username", newUsername);
    if (token) {
      localStorage.setItem("authToken", token);
    }
  };

  const logout = () => {
    setUsername(null);
    localStorage.removeItem("username");
    localStorage.removeItem("authToken");
  };

  return (
    <AuthContext.Provider value={{ username, isAuthenticated: !!username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
