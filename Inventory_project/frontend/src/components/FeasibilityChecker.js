import React, { useState } from 'react';
import axios from 'axios';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FeasibilityChecker() {
  const [hp3, setHp3] = useState(0);
  const [hp5, setHp5] = useState(0);
  const [hp75, setHp75] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/check-feasibility`, {
        hp_3: hp3,
        hp_5: hp5,
        hp_7_5: hp75
      });
      setResult(response.data);
      
      if (response.data.possible) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error checking feasibility:', error);
      toast.error('Failed to check feasibility');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#E2E2D9' }} data-testid="feasibility-checker">
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>
          Combined Production Check
        </h3>
        <p className="text-sm mb-4" style={{ color: '#596157' }}>
          Check if you can produce multiple motor types simultaneously
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#596157' }}>
              3HP Motors
            </label>
            <input
              type="number"
              min="0"
              value={hp3}
              onChange={(e) => setHp3(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E2D9',
                color: '#1E231D'
              }}
              data-testid="feasibility-input-3hp"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#596157' }}>
              5HP Motors
            </label>
            <input
              type="number"
              min="0"
              value={hp5}
              onChange={(e) => setHp5(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E2D9',
                color: '#1E231D'
              }}
              data-testid="feasibility-input-5hp"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#596157' }}>
              7.5HP Motors
            </label>
            <input
              type="number"
              min="0"
              value={hp75}
              onChange={(e) => setHp75(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E2D9',
                color: '#1E231D'
              }}
              data-testid="feasibility-input-7.5hp"
            />
          </div>
        </div>

        <button
          onClick={handleCheck}
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm mb-4"
          style={{
            backgroundColor: '#3A5C45',
            color: '#FFFFFF'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2D4836';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#3A5C45';
            e.target.style.transform = 'translateY(0)';
          }}
          data-testid="feasibility-check-btn"
        >
          {loading ? 'Checking...' : 'Check Feasibility'}
        </button>

        {result && (
          <div 
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: result.possible ? '#E8F0EA' : '#FAECEB',
              borderColor: result.possible ? '#2B593F' : '#A33022'
            }}
            data-testid="feasibility-result"
          >
            <div className="flex items-center gap-2 mb-2">
              {result.possible ? (
                <CheckCircle2 className="w-5 h-5" style={{ color: '#2B593F' }} />
              ) : (
                <AlertCircle className="w-5 h-5" style={{ color: '#A33022' }} />
              )}
              <p className="font-semibold text-sm" style={{ color: result.possible ? '#2B593F' : '#A33022' }}>
                {result.message}
              </p>
            </div>
            
            {result.missing_components && result.missing_components.length > 0 && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: result.possible ? '#2B593F' : '#A33022' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#596157' }}>Missing Components:</p>
                <ul className="space-y-1">
                  {result.missing_components.map((comp, idx) => (
                    <li key={idx} className="text-xs" style={{ color: '#596157' }}>
                      • {comp.component}: need {comp.shortage.toFixed(2)} more (have {comp.available.toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
