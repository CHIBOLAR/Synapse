import React from 'react';

/**
 * 🎯 Meeting Type Selector Component
 * 
 * Allows users to select meeting type for context-aware analysis
 * 6 meeting types for optimized AI prompts
 */

const MeetingTypeSelector = ({ selectedType, onTypeChange, disabled }) => {
  
  const meetingTypes = [
    {
      id: 'general',
      name: 'General Meeting',
      icon: '💼',
      description: 'Standard team meetings, updates, discussions'
    },
    {
      id: 'standup',
      name: 'Daily Standup',
      icon: '🏃',
      description: 'Daily status updates, blockers, sprint planning'
    },
    {
      id: 'retrospective',
      name: 'Retrospective',
      icon: '🔄',
      description: 'Sprint reviews, lessons learned, process improvements'
    },
    {
      id: 'planning',
      name: 'Planning Session',
      icon: '📋',
      description: 'Project planning, roadmap discussions, requirements'
    },
    {
      id: 'technical',
      name: 'Technical Review',
      icon: '⚙️',
      description: 'Code reviews, architecture decisions, technical debt'
    },
    {
      id: 'stakeholder',
      name: 'Stakeholder Meeting',
      icon: '👥',
      description: 'Client meetings, executive updates, external discussions'
    }
  ];

  return (
    <div className="meeting-type-selector">
      <div className="selector-header">
        <h3>🎯 Meeting Type</h3>
        <p>Select the type of meeting for optimized AI analysis</p>
      </div>

      <div className="meeting-types-grid">
        {meetingTypes.map((type) => (
          <div
            key={type.id}
            className={`meeting-type-card ${selectedType === type.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onTypeChange(type.id)}
          >
            <div className="type-icon">{type.icon}</div>
            <div className="type-info">
              <h4 className="type-name">{type.name}</h4>
              <p className="type-description">{type.description}</p>
            </div>
            {selectedType === type.id && (
              <div className="selected-indicator">✓</div>
            )}
          </div>
        ))}
      </div>

      {selectedType && (
        <div className="selection-summary">
          <span className="summary-text">
            Selected: <strong>
              {meetingTypes.find(t => t.id === selectedType)?.name}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default MeetingTypeSelector;