import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function InventoryTable({ components, requirements = [], onUpdateQuantity }) {
  const [editingValues, setEditingValues] = useState({});

  const handleInputChange = (componentId, value) => {
    setEditingValues(prev => ({
      ...prev,
      [componentId]: value
    }));
  };

  const handleSave = async (componentId, originalValue) => {
    const value = editingValues[componentId];
    if (value === undefined || value === '') {
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue !== originalValue) {
      await onUpdateQuantity(componentId, numValue);
    }
    
    // Clear editing state
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[componentId];
      return newState;
    });
  };

  const handleKeyPress = (e, componentId, originalValue) => {
    if (e.key === 'Enter') {
      e.target.blur(); // This will trigger onBlur which calls handleSave
    }
  };

  const getStockStatus = (component, requirements) => {
    // Find max requirement for this component across all motor types
    const maxReq = requirements
      .filter(r => r.component_id === component.id)
      .reduce((max, r) => Math.max(max, r.required_quantity), 0);
    
    // Low stock threshold = can produce less than 5 motors
    const lowStockThreshold = maxReq > 0 ? maxReq * 5 : 10;
    
    if (component.quantity === 0) {
      return { label: 'Critical', color: '#A33022', bgColor: '#FAECEB', threshold: lowStockThreshold };
    }
    if (component.quantity < lowStockThreshold) {
      return { label: 'Low Stock', color: '#B36B00', bgColor: '#FDF3E1', threshold: lowStockThreshold };
    }
    return { label: 'In Stock', color: '#2B593F', bgColor: '#E8F0EA', threshold: lowStockThreshold };
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#E2E2D9' }}>
      <div className="p-6 border-b" style={{ borderColor: '#E2E2D9' }}>
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight" style={{ color: '#1E231D', fontFamily: 'Outfit, sans-serif' }}>
          Inventory Components
        </h2>
        <p className="text-sm mt-1" style={{ color: '#596157' }}>Manage stock levels - click to edit quantities directly</p>
      </div>

      <div className="overflow-x-auto" data-testid="inventory-table">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y" style={{ backgroundColor: '#F0F0E8', borderColor: '#E2E2D9' }}>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#596157' }}>Item Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#596157' }}>Category</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#596157' }}>Unit</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#596157' }}>Quantity</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#596157' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {components.map((component) => {
              const status = getStockStatus(component, requirements);
              const rowBgColor = component.quantity === 0 ? '#ffe6e6' : component.quantity < status.threshold ? '#fff9e6' : 'transparent';
              
              return (
                <tr 
                  key={component.id} 
                  className="border-b transition-colors duration-150"
                  style={{ borderColor: '#E2E2D9', backgroundColor: rowBgColor }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = component.quantity === 0 ? '#ffcccc' : component.quantity < status.threshold ? '#fff3cc' : '#F9F9F7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rowBgColor}
                  data-testid={`row-${component.id}`}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: '#1E231D' }}>
                    {component.name}
                    {component.quantity === 0 && (
                      <AlertCircle className="inline-block ml-2 w-4 h-4" style={{ color: '#A33022' }} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#596157' }}>{component.category}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#596157' }}>{component.unit}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={editingValues[component.id] !== undefined ? editingValues[component.id] : component.quantity}
                      onChange={(e) => handleInputChange(component.id, e.target.value)}
                      onBlur={() => handleSave(component.id, component.quantity)}
                      onKeyPress={(e) => handleKeyPress(e, component.id, component.quantity)}
                      className="w-28 px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 transition-all text-center font-medium"
                      style={{ 
                        backgroundColor: component.quantity === 0 ? '#ffe6e6' : component.quantity < status.threshold ? '#fff9e6' : '#FFFFFF',
                        borderColor: component.quantity === 0 ? '#e74c3c' : component.quantity < status.threshold ? '#f39c12' : '#E2E2D9',
                        color: component.quantity === 0 ? '#A33022' : '#1E231D'
                      }}
                      min="0"
                      step="0.1"
                      data-testid={`input-${component.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: status.bgColor, color: status.color }}
                      data-testid={`status-${component.id}`}
                      title={`Threshold: ${status.threshold} (5 motors worth)`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
