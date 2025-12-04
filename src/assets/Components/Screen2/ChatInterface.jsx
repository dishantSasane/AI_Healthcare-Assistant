import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";

const HealthcareAssistant = forwardRef(({ onMessageCountUpdate }, ref) => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const API_KEY = "[REDACTED]";
  const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  // Symptom tracking state
  const [symptomTracker, setSymptomTracker] = useState({
    age: null,
    gender: null,
    primarySymptoms: [],
    duration: null,
    additionalSymptoms: [],
    severity: null
  });

  useImperativeHandle(ref, () => ({
    getSymptomSummary: () => symptomTracker
  }));

  useEffect(() => {
    scrollToBottom();
    if (onMessageCountUpdate) {
      onMessageCountUpdate(messages.length);
    }
  }, [messages, onMessageCountUpdate]);

  useEffect(() => {
    startHealthInterview();
  }, []);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        if (finalTranscript !== '') {
          setUserInput(prevInput => prevInput + finalTranscript + ' ');
        }
        setTranscript(interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser.');
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const speakMessage = (text, onEnd) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  };

  const startHealthInterview = async () => {
    const initialMessage = "Welcome to the Health Symptom Assistant. I'll help you understand your symptoms. Can you tell me your age?";
    setMessages([{ sender: "ai", text: initialMessage }]);
    setTimeout(() => {
      speakMessage(initialMessage, () => {
        setIsTyping(false);
      });
    }, 100);
  };

  const generateAIResponse = async (conversation) => {
    try {
      setIsTyping(true);
      const prompt = `
You are a medical AI assistant conducting a health symptom interview. 
Carefully gather information about the patient's symptoms, health condition, and medical history.
Ask precise, empathetic questions to understand the patient's health concerns.
Based on the conversation history, determine the next most important question to ask.
If possible, provide guidance on potential causes or recommend next steps.
Avoid giving definitive medical diagnoses.
Conversation history:
${conversation}
Provide your next question or guidance.`;

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      return data.candidates[0].content.parts[0].text || "Can you tell me more about your symptoms?";
    } catch (error) {
      console.error("Error generating AI response:", error);
      return "Can you provide more details about how you're feeling?";
    }
  };

  const handleSymptomTracking = (userText, aiResponse) => {
    const lowerText = userText.toLowerCase();
    
    // Age tracking
    if (!symptomTracker.age) {
      const ageMatch = lowerText.match(/(\d+)\s*years?\s*old/);
      if (ageMatch) {
        setSymptomTracker(prev => ({ ...prev, age: parseInt(ageMatch[1]) }));
      }
    }

    // Gender tracking
    if (!symptomTracker.gender) {
      if (lowerText.includes('male') || lowerText.includes('man')) {
        setSymptomTracker(prev => ({ ...prev, gender: 'male' }));
      } else if (lowerText.includes('female') || lowerText.includes('woman')) {
        setSymptomTracker(prev => ({ ...prev, gender: 'female' }));
      }
    }

    // Symptoms tracking
    const symptomKeywords = [
      'fever', 'cough', 'headache', 'pain', 'fatigue', 
      'sore throat', 'congestion', 'nausea', 'vomiting', 
      'diarrhea', 'muscle ache', 'chills', 'body ache'
    ];

    symptomKeywords.forEach(symptom => {
      if (lowerText.includes(symptom)) {
        setSymptomTracker(prev => ({
          ...prev,
          primarySymptoms: [...new Set([...prev.primarySymptoms, symptom])]
        }));
      }
    });

    // Severity tracking
    if (lowerText.includes('mild')) {
      setSymptomTracker(prev => ({ ...prev, severity: 'mild' }));
    } else if (lowerText.includes('severe') || lowerText.includes('intense')) {
      setSymptomTracker(prev => ({ ...prev, severity: 'severe' }));
    }

    // Duration tracking
    const durationKeywords = {
      'day': 1,
      'days': 1,
      'week': 7,
      'weeks': 7,
      'month': 30
    };

    Object.entries(durationKeywords).forEach(([keyword, days]) => {
      const durationMatch = lowerText.match(new RegExp(`(\\d+)\\s*${keyword}`));
      if (durationMatch) {
        setSymptomTracker(prev => ({ 
          ...prev, 
          duration: `${durationMatch[1]} ${keyword}`
        }));
      }
    });
  };

  const handleAIResponse = async (userText) => {
    const updatedMessages = messages.concat({ sender: "user", text: userText });
    const conversationHistory = updatedMessages
      .map(msg => `${msg.sender === "ai" ? "Healthcare Assistant" : "Patient"}: ${msg.text}`)
      .join("\n");
    
    // Track symptoms before generating response
    handleSymptomTracking(userText, "");
    
    const aiResponse = await generateAIResponse(conversationHistory);
    setMessages([...updatedMessages, { sender: "ai", text: aiResponse }]);
    setIsTyping(false);
    setTimeout(() => {
      speakMessage(aiResponse);
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (userInput.trim() === "") return;
    setMessages((prevMessages) => [...prevMessages, { sender: "user", text: userInput }]);
    const currentInput = userInput;
    setUserInput("");
    setTranscript("");
    handleAIResponse(currentInput);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      if (transcript) {
        setUserInput(prevInput => prevInput + transcript);
        setTranscript("");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#171717] text-white overflow-hidden">
      <div className="bg-[#1e1e1e] p-3 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-bold text-lg">Healthcare Symptom Assistant</h2>
        <div className="text-sm text-gray-400">
          Questions: {Math.floor(messages.length / 2)}
        </div>
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="flex-grow overflow-y-auto p-4 bg-[#1e1e1e]"
        style={{ maxHeight: "calc(100% - 130px)" }}
      >
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`${msg.sender === "ai" ? "bg-[#2a2a2a]" : "bg-[#333333]"} p-4 rounded-lg mb-4`}>
              <div className="flex items-center mb-2">
                <div className={`w-8 h-8 rounded-full ${msg.sender === "ai" ? "bg-blue-600" : "bg-green-600"} flex items-center justify-center mr-2`}>
                  <span className="text-sm font-bold">{msg.sender === "ai" ? "AI" : "You"}</span>
                </div>
                <span className="font-medium">{msg.sender === "ai" ? "Healthcare Assistant" : "You"}</span>
              </div>
              <p className="text-gray-200">{msg.text}</p>
            </div>
          ))}
          {isTyping && (
            <div className="bg-[#2a2a2a] p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
                  <span className="text-sm font-bold">AI</span>
                </div>
                <span className="font-medium">Healthcare Assistant</span>
              </div>
              <p className="text-gray-400">Analyzing your response...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 bg-[#1e1e1e] border-t border-gray-700">
        <form onSubmit={handleSendMessage}>
          <div className="mb-2">
            {transcript && (
              <div className="text-gray-400 text-sm italic mb-2">Hearing: {transcript}</div>
            )}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={startListening}
                disabled={isListening || isSpeaking}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-300 focus:outline-none disabled:opacity-50"
              >
                Start Speaking
              </button>
              <button
                type="button"
                onClick={stopListening}
                disabled={!isListening || isSpeaking}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-300 focus:outline-none disabled:opacity-50"
              >
                Stop Speaking
              </button>
            </div>
          </div>
          <div className="flex">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-grow p-3 border border-gray-700 bg-[#2a2a2a] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-l"
              placeholder="Describe your symptoms or use speech buttons..."
            />
            <button 
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-r hover:bg-blue-700 transition duration-300 focus:outline-none"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default HealthcareAssistant;