import React, { useState } from 'react';
import BookInterviewOptions from './BookInterviewOptions';
import MeetingPage from './MeetingPage';


function CandidateSelectPage({ onStartMockInterview }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [interviewType, setInterviewType] = useState(null);

  const handleAIMockInterview = () => {
    // Start the AI mock interview flow
    onStartMockInterview();
  };

  const handleBookInterview = () => {
    setSelectedOption('book');
  };

  const handleInterviewTypeSelect = (type) => {
    setInterviewType(type);
  };

  const resetSelection = () => {
    setSelectedOption(null);
    setInterviewType(null);
  };

  // For redirecting to landing page after meeting ends
  const handleMeetingEnd = () => {
    // This will reset the component state and effectively show the "landing page" view
    resetSelection();

    // If you want to navigate to a completely different page, you could use:
    // window.location.href = '/'; // Replace with your landing page URL
  };


  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat text-white p-4"
      style={{
        backgroundImage: "url('https://img.freepik.com/free-photo/medicine-blue-background-flat-lay_23-2149341573.jpg?t=st=1743072900~exp=1743076500~hmac=6610216c1f39800e45457e70ec1d9940d52926f7a6144c2e83f4a419860e1f71&w=1060')",
        backgroundColor: 'rgba(236, 234, 234, 0)',
        backgroundBlendMode: 'multiply'
      }}
    >
      <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          HealthCare+
        </h1>

        {!selectedOption && (
          <div className="space-y-4">
            <button
              onClick={handleAIMockInterview}
              className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Session
            </button>
          </div>
        )}

        {selectedOption === 'book' && !interviewType && (
          <BookInterviewOptions
            onSelect={handleInterviewTypeSelect}
            onBack={resetSelection}
          />
        )}

        {selectedOption === 'book' && interviewType && (
          <MeetingPage
            interviewType={interviewType}
            onMeetingEnd={handleMeetingEnd}
          />
        )}
      </div>
    </div>
  );
}
export default CandidateSelectPage;