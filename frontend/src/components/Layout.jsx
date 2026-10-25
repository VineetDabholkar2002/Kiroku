import React from "react";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 w-full flex flex-col">
        {children}
      </div>
    </div>
  );
}
