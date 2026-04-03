import React, { useState } from 'react';
import { ArrowDownToLine, Zap } from 'lucide-react';

export default function MotorCard({ motorType, maxProduction, onWithdraw }) {
  const [quantity, setQuantity] = useState(1);

  const handleWithdraw = () => {
    if (quantity > 0 && quantity <= maxProduction) {
      onWithdraw(motorType, quantity);
      setQuantity(1);
    }
  };

  const getMotorColor = () => {
    switch(motorType) {
      case '3HP': return { bg: '#E8F0EA', color: '#2B593F' };
      case '5HP': return { bg: '#FDF3E1', color: '#B36B00' };
      case '7.5HP': return { bg: '#FAECEB', color: '#A33022' };
      default: return { bg: '#E2E2D9', color: '#596157' };
    }
  };

  const colors = getMotorColor();

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#E2E2D9' }} data-testid={`motor-card-${motorType}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: colors.bg }}>
              <Zap className="w-5 h-5" style={{ color: colors.color }} />
            </div>
            <h3 className="text-lg font-medium" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>
              {motorType} Motor
            </h3>
          </div>
        </div>

        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#F5F5F0' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#596157' }}>Max Production</p>
          <p className="text-3xl font-semibold" style={{ color: '#1E231D' }} data-testid={`max-production-${motorType}`}>
            {maxProduction}
          </p>
          <p className="text-xs mt-1" style={{ color: '#596157' }}>units available</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#596157' }}>
              Withdraw Quantity
            </label>
            <input
              type="number"
              min="1"
              max={maxProduction}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E2D9',
                color: '#1E231D'
              }}
              data-testid={`withdraw-input-${motorType}`}
            />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={quantity <= 0 || quantity > maxProduction}
            className="w-full px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: quantity > 0 && quantity <= maxProduction ? '#3A5C45' : '#E2E2D9',
              color: quantity > 0 && quantity <= maxProduction ? '#FFFFFF' : '#A0A89D',
              cursor: quantity > 0 && quantity <= maxProduction ? 'pointer' : 'not-allowed'
            }}
            onMouseEnter={(e) => {
              if (quantity > 0 && quantity <= maxProduction) {
                e.target.style.backgroundColor = '#2D4836';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (quantity > 0 && quantity <= maxProduction) {
                e.target.style.backgroundColor = '#3A5C45';
                e.target.style.transform = 'translateY(0)';
              }
            }}
            data-testid={`withdraw-btn-${motorType}`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Withdraw Components
          </button>
        </div>
      </div>
    </div>
  );
}
