import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex bg-[#030712] h-screen text-slate-100 font-sans antialiased overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Dynamic Glowing Accents */}
        <div className="absolute top-[-20%] left-[25%] w-[45%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[35%] h-[45%] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none z-0" />
        
        {/* Top Navbar */}
        <Navbar />

        {/* Dynamic Panel Scroll Area */}
        <main className="flex-1 overflow-y-auto px-8 py-8 z-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[1400px] mx-auto h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
