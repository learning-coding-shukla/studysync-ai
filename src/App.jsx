import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, FileText, HelpCircle, Activity, 
  Sparkles, TrendingUp, Target, Upload, 
  ChevronDown, ChevronUp, Loader2, X, AlertCircle, 
  BookMarked, BrainCircuit, History, Download
} from 'lucide-react';

// ==========================================
// 🚀 GITHUB & LOCAL DEVELOPMENT SETUP 🚀
// ==========================================
// To run this app locally or publish it on platforms like Vercel:
// 1. Create a `.env` file in your local project root.
// 2. Add your key: VITE_GEMINI_API_KEY=your_actual_api_key_here
// 3. Change the line below to: const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_KEY = "AIzaSyBlsMt9oXy6fxTWNy6y6YVKDIbzGGOkF8A"; // Kept empty so Canvas injects it automatically
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

// Helper to clean markdown formatting from JSON responses
const cleanAndParseJSON = (text) => {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
};

// Utility to dynamically load html2pdf.js from CDN for PDF generation
const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () => reject(new Error("Failed to load PDF library"));
    document.head.appendChild(script);
  });
};

// Generic API caller with retry logic
const callGeminiAPI = async (prompt, isJson = false, fileData = null, retries = 2) => {
  const parts = [{ text: prompt }];
  
  if (fileData) {
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data
      }
    });
  }

  const payload = {
    contents: [{ parts }],
  };

  if (isJson) {
    payload.generationConfig = { responseMimeType: "application/json" };
  }

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
        const text = result.candidates[0].content.parts[0].text;
        return isJson ? cleanAndParseJSON(text) : text;
      }
      throw new Error("Invalid response structure from API");
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('syllabus'); // 'syllabus' | 'pyq'
  
  // Syllabus State
  const [syllabusInput, setSyllabusInput] = useState('');
  const [topics, setTopics] = useState([]);
  const [isAnalyzingSyllabus, setIsAnalyzingSyllabus] = useState(false);
  
  // PYQ State
  const [pyqFile, setPyqFile] = useState(null);
  const [pyqAnalysis, setPyqAnalysis] = useState(null);
  const [isAnalyzingPYQ, setIsAnalyzingPYQ] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Modals & Dynamic Generation State
  const [modalState, setModalState] = useState({ isOpen: false, type: null, title: null, content: null });
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});

  const handleAnalyzeSyllabus = async () => {
    if (!syllabusInput.trim()) return;
    setIsAnalyzingSyllabus(true);
    setError(null);
    
    const prompt = `
      Act as an expert educational structural analyst. Read the following syllabus text and extract the main topics and their subtopics.
      Return the data strictly as a JSON array of objects following this exact schema:
      [
        {
          "topicName": "Name of the main topic",
          "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"]
        }
      ]
      Do not include any extra text or markdown wrappers, just the JSON array.
      
      Syllabus Text:
      ${syllabusInput}
    `;

    try {
      const extractedTopics = await callGeminiAPI(prompt, true);
      setTopics(extractedTopics);
    } catch (err) {
      setError(err.message || "Failed to analyze syllabus. Please try again.");
    } finally {
      setIsAnalyzingSyllabus(false);
    }
  };

  const toggleTopic = (index) => {
    setExpandedTopics(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleGenerateNotes = async (topicName, subtopics) => {
    setIsGeneratingNotes(true);
    setModalState({ isOpen: true, type: 'loading', title: 'Generating Notes...', content: null });
    
    const prompt = `
      Act as an expert tutor. Generate highly detailed, comprehensive, and well-structured study notes for the following topic and its subtopics. 
      Use clear headings, bullet points, and highlight key terms.
      
      Main Topic: ${topicName}
      Subtopics to cover: ${subtopics.join(', ')}
    `;

    try {
      const notes = await callGeminiAPI(prompt, false);
      setModalState({ 
        isOpen: true, 
        type: 'notes', 
        title: (
          <><BookOpen className="text-indigo-500 w-6 h-6" /> Notes: {topicName}</>
        ), 
        content: notes 
      });
    } catch (err) {
      setModalState({ isOpen: false });
      setError("Failed to generate notes.");
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handleGenerateQuestions = async (topicName) => {
    setIsGeneratingQuestions(true);
    setModalState({ isOpen: true, type: 'loading', title: 'Crafting Questions...', content: null });
    
    const prompt = `
      Act as an examiner. Generate practice questions for the topic: "${topicName}".
      Return the data strictly as a JSON object following this exact schema:
      {
        "veryShort": ["Question 1", "Question 2"],
        "short": ["Question 1", "Question 2"],
        "long": ["Question 1", "Question 2"],
        "veryLong": ["Question 1", "Question 2"]
      }
      Provide 3 questions for each category. Ensure questions test different cognitive levels (recall, application, analysis).
    `;

    try {
      const questions = await callGeminiAPI(prompt, true);
      setModalState({ 
        isOpen: true, 
        type: 'questions', 
        title: (
          <><HelpCircle className="text-amber-500 w-6 h-6" /> Questions: {topicName}</>
        ), 
        content: questions 
      });
    } catch (err) {
      setModalState({ isOpen: false });
      setError("Failed to generate questions.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      setPyqFile({ mimeType: file.type, data: base64String, name: file.name });
      setError(null);
    };
    reader.onerror = () => setError("Failed to read the file.");
    reader.readAsDataURL(file);
  };

  const handleAnalyzePYQ = async () => {
    if (!pyqFile) return;
    setIsAnalyzingPYQ(true);
    setError(null);
    
    const prompt = `
      Act as an expert exam analyst. Read the attached PDF containing Previous Year Questions (PYQs) and analyze it.
      1. Identify the topics being tested.
      2. Analyze the frequency/repetition of these topics to determine priority (High, Medium, Low).
      3. Identify specific recurring themes or patterns.
      4. Suggest 5 new, highly probable similar questions based on these patterns.
      
      Return strictly as a JSON object with this schema:
      {
        "prioritizedTopics": [
          { "topic": "Topic Name", "priority": "High" | "Medium" | "Low", "reason": "Brief reason why" }
        ],
        "repeatedThemes": ["Theme 1", "Theme 2"],
        "suggestedQuestions": ["Q1", "Q2", "Q3", "Q4", "Q5"]
      }
    `;

    try {
      const analysis = await callGeminiAPI(prompt, true, pyqFile);
      setPyqAnalysis(analysis);
    } catch (err) {
      setError(err.message || "Failed to analyze PYQs.");
    } finally {
      setIsAnalyzingPYQ(false);
    }
  };

  const handleGenerateSamplePaperPDF = async () => {
    if (!pyqAnalysis) return;
    setIsGeneratingPDF(true);
    setError(null);

    try {
      // 1. Generate the paper content using Gemini
      const prompt = `
        Act as an expert academic examiner. Based on the following analyzed patterns from past year questions:
        Prioritized Topics: ${JSON.stringify(pyqAnalysis.prioritizedTopics)}
        Repeated Themes: ${JSON.stringify(pyqAnalysis.repeatedThemes)}
        
        Create a comprehensive, realistic full-length Sample Question Paper. 
        Structure it professionally with:
        - A clear main title (e.g., "Sample Question Paper")
        - General Instructions (Time, Marks, etc.)
        - Section A: Very Short Answer Questions
        - Section B: Short Answer Questions
        - Section C: Long Answer / Essay Questions
        
        Return the output strictly as beautifully formatted HTML code (using <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>).
        Include basic inline CSS styles within tags to ensure it looks like an official exam paper.
        Do not include markdown wrappers like \`\`\`html. Output ONLY the raw HTML string.
      `;

      let htmlContent = await callGeminiAPI(prompt, false);
      htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

      // 2. Load html2pdf library dynamically
      const html2pdf = await loadHtml2Pdf();

      // 3. Create a wrapper element to format the PDF nicely
      const wrapper = document.createElement('div');
      wrapper.style.padding = '40px';
      wrapper.style.fontFamily = 'Arial, sans-serif';
      wrapper.style.color = '#1e293b';
      wrapper.style.lineHeight = '1.6';
      wrapper.innerHTML = htmlContent;

      // 4. Configure PDF options and save
      const opt = {
        margin:       0.5,
        filename:     'StudySync_Sample_Paper.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(wrapper).save();

    } catch (err) {
      setError(err.message || "Failed to generate Sample Paper PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <BrainCircuit className="w-8 h-8" />
            <h1 className="text-2xl font-extrabold tracking-tight">StudySync<span className="text-slate-400 font-medium ml-1">AI</span></h1>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('syllabus')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'syllabus' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <BookMarked className="w-4 h-4" /> Syllabus Master
            </button>
            <button 
              onClick={() => setActiveTab('pyq')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'pyq' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <History className="w-4 h-4" /> PYQ Analyzer
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {activeTab === 'syllabus' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
            
            {/* Input Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5 text-indigo-500" /> 
                Upload & Extract Syllabus
              </h2>
              <p className="text-slate-500 text-sm mb-4">Paste your syllabus text below. Our AI will break it down into manageable topics and subtopics for focused learning.</p>
              
              <textarea 
                className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y transition-all text-sm font-mono text-slate-700 placeholder-slate-400"
                placeholder="Paste module 1, module 2, topics, chapters..."
                value={syllabusInput}
                onChange={(e) => setSyllabusInput(e.target.value)}
              />
              
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={handleAnalyzeSyllabus}
                  disabled={isAnalyzingSyllabus || !syllabusInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {isAnalyzingSyllabus ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Sparkles className="w-5 h-5" /> Extract Topics</>}
                </button>
              </div>
            </section>

            {/* Visualizer Section */}
            {topics.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                  <Activity className="w-6 h-6 text-indigo-500" /> Syllabus Breakdown
                </h2>
                
                <div className="grid gap-4">
                  {topics.map((topic, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200 hover:border-indigo-200">
                      
                      {/* Topic Header */}
                      <div 
                        className="p-5 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition-colors"
                        onClick={() => toggleTopic(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <h3 className="font-semibold text-lg text-slate-800">{topic.topicName}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-medium px-2.5 py-1 bg-slate-200 text-slate-600 rounded-full">
                            {topic.subtopics.length} Subtopics
                          </span>
                          {expandedTopics[index] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>

                      {/* Topic Content (Expanded) */}
                      {expandedTopics[index] && (
                        <div className="p-5 border-t border-slate-100 bg-white animate-in slide-in-from-top-2 fade-in duration-200">
                          <ul className="grid sm:grid-cols-2 gap-3 mb-6">
                            {topic.subtopics.map((sub, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <Target className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                <span>{sub}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                            <button 
                              onClick={() => handleGenerateNotes(topic.topicName, topic.subtopics)}
                              className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <FileText className="w-4 h-4" /> Prepare Notes
                            </button>
                            <button 
                              onClick={() => handleGenerateQuestions(topic.topicName)}
                              className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <HelpCircle className="w-4 h-4" /> Generate Questions
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'pyq' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
            
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-emerald-500" /> 
                Analyze Previous Year Questions
              </h2>
              <p className="text-slate-500 text-sm mb-4">Upload a PDF containing questions from past exams. The AI will detect patterns, prioritize topics, and predict potential future questions.</p>
              
              <div className="w-full h-40 border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/30 rounded-xl flex flex-col items-center justify-center transition-all relative overflow-hidden group">
                {pyqFile ? (
                  <div className="flex flex-col items-center gap-2 z-10">
                    <FileText className="w-10 h-10 text-emerald-500" />
                    <span className="font-medium text-slate-700 text-center px-4 truncate max-w-full">{pyqFile.name}</span>
                    <button 
                      onClick={(e) => { e.preventDefault(); setPyqFile(null); }}
                      className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 mt-2 bg-red-50 px-3 py-1 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" /> Remove PDF
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-emerald-100 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-slate-600 font-medium">Click or drag PDF to upload</p>
                    <p className="text-slate-400 text-sm mt-1">Extracts past questions automatically</p>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileChange} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                      title="Upload PDF"
                    />
                  </>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={handleAnalyzePYQ}
                  disabled={isAnalyzingPYQ || !pyqFile}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {isAnalyzingPYQ ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Patterns...</> : <><TrendingUp className="w-5 h-5" /> Discover Patterns</>}
                </button>
              </div>
            </section>

            {pyqAnalysis && (
              <div className="space-y-8">
                <section className="grid md:grid-cols-2 gap-6 items-start">
                  
                  {/* Column 1: Priorities & Themes */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-rose-500" /> Prioritized Topics
                      </h3>
                      <div className="space-y-3">
                        {pyqAnalysis.prioritizedTopics.map((pt, i) => (
                          <div key={i} className="flex flex-col gap-1 p-3 rounded-xl border border-slate-100 bg-slate-50">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800 text-sm">{pt.topic}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide
                                ${pt.priority.toLowerCase() === 'high' ? 'bg-rose-100 text-rose-700' : 
                                  pt.priority.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-emerald-100 text-emerald-700'}`}>
                                {pt.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{pt.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" /> Recurring Themes
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
                        {pyqAnalysis.repeatedThemes.map((theme, i) => (
                          <li key={i} className="leading-relaxed">{theme}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Column 2: Suggested Questions */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" /> AI Predicted Questions
                    </h3>
                    <div className="space-y-4">
                      {pyqAnalysis.suggestedQuestions.map((q, i) => (
                        <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                          <div className="bg-amber-100 text-amber-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">{q}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </section>

                {/* NEW PDF GENERATION BANNER */}
                <section className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 rounded-2xl shadow-md text-white flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-2">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                      <FileText className="w-6 h-6 text-emerald-100" /> Generate Sample Paper
                    </h3>
                    <p className="text-emerald-50 text-sm max-w-xl leading-relaxed">
                      Based on the analyzed patterns above, our AI can generate a full-length sample question paper. It's perfectly tailored to give you the most highly probable questions for your upcoming exam.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateSamplePaperPDF}
                    disabled={isGeneratingPDF}
                    className="bg-white text-teal-700 hover:bg-emerald-50 disabled:opacity-75 disabled:cursor-not-allowed px-6 py-3.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    {isGeneratingPDF ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Drafting PDF...</>
                    ) : (
                      <><Download className="w-5 h-5" /> Download as PDF</>
                    )}
                  </button>
                </section>

              </div>
            )}
          </div>
        )}

      </main>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ isOpen: false, type: null, title: null, content: null })}
        title={modalState.title}
      >
        {modalState.type === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="animate-pulse">{modalState.title}</p>
          </div>
        )}

        {modalState.type === 'notes' && (
          <div className="prose prose-slate max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600 text-sm md:text-base leading-relaxed">
            {modalState.content.split('\n').map((line, i) => {
              if (line.startsWith('### ')) return <h4 key={i} className="text-lg font-bold mt-6 mb-2">{line.replace('### ', '')}</h4>;
              if (line.startsWith('## ')) return <h3 key={i} className="text-xl font-extrabold mt-8 mb-3 border-b pb-2">{line.replace('## ', '')}</h3>;
              if (line.startsWith('# ')) return <h2 key={i} className="text-2xl font-black mt-10 mb-4">{line.replace('# ', '')}</h2>;
              if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 mb-1">{line.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>;
              if (line.trim() === '') return <br key={i} />;
              const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              return <p key={i} className="mb-3" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
            })}
          </div>
        )}

        {modalState.type === 'questions' && modalState.content && (
          <div className="space-y-8">
            {Object.entries({
              'Very Short Answer Type': modalState.content.veryShort,
              'Short Answer Type': modalState.content.short,
              'Long Answer Type': modalState.content.long,
              'Very Long Answer / Essay Type': modalState.content.veryLong
            }).map(([category, questions], i) => (
              questions && questions.length > 0 && (
                <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800">{category}</h4>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {questions.map((q, idx) => (
                      <li key={idx} className="p-4 flex gap-3 items-start hover:bg-white transition-colors">
                        <span className="text-slate-400 font-mono text-sm mt-0.5">Q{idx + 1}.</span>
                        <p className="text-slate-700 text-sm leading-relaxed">{q}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}
      </Modal>

    </div>
  );
}
