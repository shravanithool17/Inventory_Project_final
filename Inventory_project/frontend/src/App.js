import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ThreeHP from './pages/ThreeHP';
import FiveHP from './pages/FiveHP';
import SevenHalfHP from './pages/SevenHalfHP';
import './App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/3hp" element={<ThreeHP />} />
          <Route path="/5hp" element={<FiveHP />} />
          <Route path="/7-5hp" element={<SevenHalfHP />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
