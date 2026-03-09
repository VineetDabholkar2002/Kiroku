import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-2">404</h1>
      <p className="mb-4 text-gray-300">We couldn't find the page you're looking for.</p>
      <Link to="/" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
        Go back home
      </Link>
    </div>
  );
};

export default NotFoundPage;
