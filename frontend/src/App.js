// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import Signup from './SignUp';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import AdminLogin from './AdminLogin';

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (data) => {
    setUser(data.user); // Assuming the data contains a user object
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token); // Store JWT token in localStorage
    setToken(data.token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={<AdminPanel token={token} />} />
          <Route path="/admin-login" element={<AdminLogin setToken={setToken} />} />
          <Route path="/" element={<h1>Welcome to the Document Management System</h1>} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
