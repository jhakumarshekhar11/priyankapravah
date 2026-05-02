// src/components/ui/Navbar.jsx
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-8 py-3 flex justify-between items-center shadow-lg">
        <Link to="/">
          <img src="/pplogo.jpeg" alt="Priyanka Pravah Logo" className="h-12 w-auto hover:scale-105 transition-transform" />
        </Link>
        
        <div className="flex gap-8 text-white font-medium">
          <Link to="/" className="hover:text-magenta-400 transition-colors">Home</Link>
          <Link to="/about" className="hover:text-magenta-400 transition-colors">About</Link>
          <Link to="/logsig" className="hover:text-magenta-400 transition-colors">Login</Link>
        </div>
      </div>
    </nav>
  );
}