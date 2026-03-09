// src/context/AuthContext.jsx
import axios from "axios";
import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [username, setUsername] = useState(null);

  useEffect(() => {
    // On mount read from localStorage
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUsername(storedUsername);
  }, []);

  const login = (username) => {
    setUsername(username);
    localStorage.setItem("username", username);
  };

  const logout = () => {
    setUsername(null);
    localStorage.removeItem("username");
    localStorage.removeItem("authToken");
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
