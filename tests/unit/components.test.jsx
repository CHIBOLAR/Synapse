/**
 * 🧪 SYNAPSE - React Components Unit Tests
 * 
 * Unit tests for React components
 * Tests component behavior, state management, and user interactions
 * 
 * Uses React Testing Library for user-centric testing approach
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import MeetingAnalyzer from '../../static/main-app/src/components/MeetingAnalyzer';
import FileUploader from '../../static/main-app/src/components/FileUploader';
import MeetingTypeSelector from '../../static/main-app/src/components/MeetingTypeSelector';

// Mock Forge bridge
jest.mock('@forge/bridge', () => ({
  invoke: jest.fn()
}));

describe('MeetingAnalyzer Component Tests', () => {
  const mockProps = {
    userConfig: { analysisPreferences: {} },
    addNotification: jest.fn(),
    updatePerformanceMetrics: jest.fn(),
    performanceMetrics: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render initial state correctly', () => {
    render(<MeetingAnalyzer {...mockProps} />);
    
    expect(screen.getByText('📋 Meeting Analysis')).toBeInTheDocument();
    expect(screen.getByText(/Upload your meeting notes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /General Meeting/ })).toBeInTheDocument();
  });

  it('should handle meeting type selection', () => {
    render(<MeetingAnalyzer {...mockProps} />);
    
    const standupButton = screen.getByRole('button', { name: /Daily Standup/ });
    fireEvent.click(standupButton);
    
    expect(mockProps.updatePerformanceMetrics).toHaveBeenCalledWith({
      lastMeetingTypeChange: 'standup'
    });
  });

  it('should display file ready state after upload', async () => {
    const { invoke } = require('@forge/bridge');
    invoke.mockResolvedValue({ isValid: true });

    render(<MeetingAnalyzer {...mockProps} />);
    
    const fileUploader = screen.getByTestId('file-uploader');
    const file = new File(['meeting content'], 'meeting.txt', { type: 'text/plain' });
    
    // Simulate file upload
    fireEvent.drop(fileUploader, {
      dataTransfer: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText('📄 File Ready for Analysis')).toBeInTheDocument();
      expect(screen.getByText('🧠 Start AI Analysis')).toBeInTheDocument();
    });
  });

  it('should show error for invalid file', async () => {
    render(<MeetingAnalyzer {...mockProps} />);
    
    const fileUploader = screen.getByTestId('file-uploader');
    const invalidFile = new File(['short'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.drop(fileUploader, {
      dataTransfer: { files: [invalidFile] }
    });

    await waitFor(() => {
      expect(mockProps.addNotification).toHaveBeenCalledWith(
        expect.stringContaining('too short'),
        'error'
      );
    });
  });
});

describe('FileUploader Component Tests', () => {
  const mockProps = {
    onFileUpload: jest.fn(),
    supportedFormats: ['.txt', '.docx'],
    maxSize: 500 * 1024
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload zone correctly', () => {
    render(<FileUploader {...mockProps} />);
    
    expect(screen.getByText('Upload Meeting Notes')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your file here')).toBeInTheDocument();
    expect(screen.getByText('Supported: .txt, .docx')).toBeInTheDocument();
  });

  it('should handle drag and drop', () => {
    render(<FileUploader {...mockProps} />);
    
    const uploadZone = screen.getByTestId('upload-zone');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.dragOver(uploadZone);
    expect(uploadZone).toHaveClass('drag-over');
    
    fireEvent.drop(uploadZone, {
      dataTransfer: { files: [file] }
    });
    
    expect(mockProps.onFileUpload).toHaveBeenCalledWith(file, 'content');
  });

  it('should reject unsupported file types', async () => {
    render(<FileUploader {...mockProps} />);
    
    const uploadZone = screen.getByTestId('upload-zone');
    const unsupportedFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.drop(uploadZone, {
      dataTransfer: { files: [unsupportedFile] }
    });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported file type/)).toBeInTheDocument();
    });
  });

  it('should reject files that are too large', async () => {
    render(<FileUploader {...mockProps} />);
    
    const uploadZone = screen.getByTestId('upload-zone');
    const largeContent = 'x'.repeat(600 * 1024); // 600KB file
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
    
    Object.defineProperty(largeFile, 'size', { value: 600 * 1024 });
    
    fireEvent.drop(uploadZone, {
      dataTransfer: { files: [largeFile] }
    });

    await waitFor(() => {
      expect(screen.getByText(/File too large/)).toBeInTheDocument();
    });
  });
});

describe('MeetingTypeSelector Component Tests', () => {
  const mockProps = {
    selectedType: 'general',
    onTypeChange: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all meeting types', () => {
    render(<MeetingTypeSelector {...mockProps} />);
    
    expect(screen.getByText('General Meeting')).toBeInTheDocument();
    expect(screen.getByText('Daily Standup')).toBeInTheDocument();
    expect(screen.getByText('Retrospective')).toBeInTheDocument();
    expect(screen.getByText('Planning Session')).toBeInTheDocument();
    expect(screen.getByText('Technical Review')).toBeInTheDocument();
    expect(screen.getByText('Stakeholder Meeting')).toBeInTheDocument();
  });

  it('should show selected meeting type', () => {
    render(<MeetingTypeSelector {...mockProps} />);
    
    const generalMeeting = screen.getByText('General Meeting').closest('.meeting-type-card');
    expect(generalMeeting).toHaveClass('selected');
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should handle meeting type selection', () => {
    render(<MeetingTypeSelector {...mockProps} />);
    
    const standupCard = screen.getByText('Daily Standup').closest('.meeting-type-card');
    fireEvent.click(standupCard);
    
    expect(mockProps.onTypeChange).toHaveBeenCalledWith('standup');
  });

  it('should disable interaction when disabled prop is true', () => {
    render(<MeetingTypeSelector {...mockProps} disabled={true} />);
    
    const cards = screen.getAllByRole('button');
    cards.forEach(card => {
      expect(card).toHaveClass('disabled');
    });
    
    const standupCard = screen.getByText('Daily Standup').closest('.meeting-type-card');
    fireEvent.click(standupCard);
    
    expect(mockProps.onTypeChange).not.toHaveBeenCalled();
  });

  it('should display selection summary', () => {
    render(<MeetingTypeSelector {...mockProps} />);
    
    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
    expect(screen.getByText('General Meeting')).toBeInTheDocument();
  });
});

describe('Component Integration Tests', () => {
  it('should integrate MeetingAnalyzer with child components', async () => {
    const mockProps = {
      userConfig: { analysisPreferences: {} },
      addNotification: jest.fn(),
      updatePerformanceMetrics: jest.fn(),
      performanceMetrics: {}
    };

    const { invoke } = require('@forge/bridge');
    invoke.mockResolvedValue({ isValid: true });

    render(<MeetingAnalyzer {...mockProps} />);
    
    // 1. Select meeting type
    const standupButton = screen.getByText('Daily Standup').closest('.meeting-type-card');
    fireEvent.click(standupButton);
    
    // 2. Upload file
    const uploadZone = screen.getByTestId('upload-zone');
    const file = new File(['valid meeting content'], 'meeting.txt', { type: 'text/plain' });
    fireEvent.drop(uploadZone, {
      dataTransfer: { files: [file] }
    });
    
    // 3. Wait for file ready state
    await waitFor(() => {
      expect(screen.getByText('📄 File Ready for Analysis')).toBeInTheDocument();
    });
    
    // 4. Start analysis
    const analyzeButton = screen.getByText('🧠 Start AI Analysis');
    fireEvent.click(analyzeButton);
    
    // Verify the flow
    expect(mockProps.updatePerformanceMetrics).toHaveBeenCalledWith({
      lastMeetingTypeChange: 'standup'
    });
    expect(invoke).toHaveBeenCalledWith('startAnalysis', expect.any(Object));
  });
});

// Mock implementations for complex components
const MockAnalysisResults = ({ results, onNewAnalysis }) => (
  <div data-testid="analysis-results">
    <h3>Analysis Complete</h3>
    <p>{results.issues?.length || 0} issues found</p>
    <button onClick={onNewAnalysis}>New Analysis</button>
  </div>
);

const MockProcessingStatus = ({ status, onCancel }) => (
  <div data-testid="processing-status">
    <h3>Processing: {status.stage}</h3>
    <div>Progress: {status.progress}%</div>
    <button onClick={onCancel}>Cancel</button>
  </div>
);

// Export mocks for use in other test files
export { MockAnalysisResults, MockProcessingStatus };