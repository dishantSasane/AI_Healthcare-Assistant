import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

export default function PrescriptionCheck({ onNext }) {
  const [hasPrescription, setHasPrescription] = useState(null);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const extractTextFromPDF = async (file) => {
    setIsProcessing(true);
    setError('');
    
    try {
      const reader = new FileReader();
      
      const fileReadPromise = new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });
  
      reader.readAsArrayBuffer(file);
      await fileReadPromise;
  
      const pdf = await pdfjsLib.getDocument(reader.result).promise;
      let extractedText = '';
  
      const pagePromises = Array.from({ length: pdf.numPages }, (_, i) => 
        pdf.getPage(i + 1).then(page => 
          page.getTextContent().then(content => 
            content.items.map(item => item.str).join(' ')
          )
        ))
  
      const pagesText = await Promise.all(pagePromises);
      extractedText = pagesText.join('\n').replace(/\s+/g, ' ').trim();
  
      if (!extractedText) {
        throw new Error('PDF appears to be image-based or contains no extractable text');
      }
  
      setPrescriptionText(extractedText);
      setIsProcessing(false);
    } catch (err) {
      console.error('PDF processing error:', err);
      setError(err.message || 'Failed to process PDF. Please ensure it contains text.');
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    setPrescriptionFile(file);
    setError('');
    await extractTextFromPDF(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (hasPrescription === null) {
      setError('Please select an option');
      return;
    }

    if (hasPrescription && !prescriptionText) {
      setError('Please upload a valid prescription PDF');
      return;
    }

    onNext(hasPrescription, prescriptionText);
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
          Medical Prescription Check
        </h1>
  
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-400 rounded-lg text-red-200">
            ⚠️ {error}
          </div>
        )}
  
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-lg font-semibold block mb-2">Do you have a previous prescription?</span>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setHasPrescription(true)}
                  className={`flex-1 py-3 rounded-lg transition-all duration-300 ${
                    hasPrescription === true 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setHasPrescription(false)}
                  className={`flex-1 py-3 rounded-lg transition-all duration-300 ${
                    hasPrescription === false 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
  
            {hasPrescription && (
              <label className="block space-y-2">
                <span className="text-lg font-semibold">Upload Prescription</span>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full p-3 rounded-lg bg-[#2a2a2a] border border-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  <div className="mt-2 text-sm text-gray-400">
                    {prescriptionFile && (
                      <span className={`${isProcessing ? 'text-blue-400' : 'text-green-400'}`}>
                        {isProcessing ? 'Analyzing PDF...' : `Loaded: ${prescriptionFile.name}`}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            )}
          </div>
  
          <button
            type="submit"
            disabled={isProcessing || (hasPrescription === null) || (hasPrescription && !prescriptionText)}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Continue →'
            )}
          </button>
        </form>
      </div>
    </div>

  );
}