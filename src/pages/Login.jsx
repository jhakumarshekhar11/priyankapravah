// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/admin');
    } catch (err) {
      setError('Google sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2D0B31] to-[#5D2A66] px-6">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl text-white">
        <div className="text-center mb-8">
          <img src="/pplogo.jpeg" alt="Logo" className="w-20 h-20 mx-auto rounded-full object-cover mb-4" />
          <h2 className="text-3xl font-serif text-[#D13174]">Admin Access</h2>
        </div>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <input 
            type="email" placeholder="Email" required
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-[#D13174]"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-[#D13174]"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full py-3 mt-2 bg-[#D13174] hover:bg-magenta-600 rounded-xl font-bold transition-colors">
            Sign In
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4">
          <hr className="w-full border-white/20" />
          <span className="text-white/50 text-sm">OR</span>
          <hr className="w-full border-white/20" />
        </div>

        <button onClick={handleGoogleLogin} className="w-full mt-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-colors">
          Continue with Google
        </button>
      </div>
    </div>
  );
}