import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
  LayoutDashboard, FileText, MessageSquare,
  ChevronRight, Star, Users, Plus, Trash2,
  Download, Search, Filter, ChevronLeft, X, Check, AlertCircle,
  TrendingUp, RefreshCw, Eye, EyeOff, Save, Edit3,
  BarChart3, Activity, ArrowUpDown, Calendar, 
  ThumbsUp, ThumbsDown, MessageCircle, Sparkles,
  Heart, Send, CheckCircle2, Circle, ArrowRight, ArrowLeft,
  ClipboardList, HeartPulse, Shield, Award, ChevronDown, FileSpreadsheet,
  Bell, LogOut, Settings, UserCog, History, Edit, ToggleLeft, ToggleRight, Power, Mail, Copy
} from 'lucide-react';

const isAdmin = window.location.pathname.startsWith('/admin');

const SESSION_TOKEN_KEY = 'admin_session_token';
const ADMIN_USER_KEY = 'admin_user';

function LoginPage({ onLogin }) {
  const [isRegister, setIsRegister] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [hasUsers, setHasUsers] = React.useState(null);

  React.useEffect(() => {
    async function checkUsers() {
      try {
        const res = await fetch('/api/auth/check', { method: 'GET' });
        const data = await res.json();
        if (res.ok) setHasUsers(data.has_users);
      } catch (e) {
        setHasUsers(true);
      }
    }
    checkUsers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error || 'Login failed');
        
        localStorage.setItem(SESSION_TOKEN_KEY, loginData.token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(loginData.user));
        onLogin(loginData.token, loginData.user);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        
        localStorage.setItem(SESSION_TOKEN_KEY, data.token);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
        onLogin(data.token, data.user);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (hasUsers === null) {
    return (
      <div className="min-h-screen login-bg flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  const showRegister = !hasUsers;

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/50">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">{showRegister ? 'Create your admin account' : 'Sign in to your account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 bg-gray-100/80 backdrop-blur border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 outline-none focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                placeholder="Username"
                required
              />
            </div>
            
            {showRegister && (
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-100/80 backdrop-blur border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 outline-none focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                  placeholder="Email"
                  required
                />
              </div>
            )}

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-100/80 backdrop-blur border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 outline-none focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all pr-12"
                placeholder="Password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all shadow-lg shadow-cyan-200 mt-4"
            >
              {loading ? 'Please wait...' : (showRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [authToken, setAuthToken] = React.useState(() => localStorage.getItem(SESSION_TOKEN_KEY));
  const [currentUser, setCurrentUser] = React.useState(() => {
    const stored = localStorage.getItem(ADMIN_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  function handleLogin(token, user) {
    setAuthToken(token);
    setCurrentUser(user);
  }

  function handleLogout() {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'x-session-token': authToken }
    }).finally(() => {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setAuthToken(null);
      setCurrentUser(null);
    });
  }

  if (isAdmin && !authToken) {
    return (
      <>
        <ToastContainer position="top-right" autoClose={3000} />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      {isAdmin ? <AdminDashboard authToken={authToken} currentUser={currentUser} onLogout={handleLogout} /> : <SurveyPage />}
    </>
  );
}

function StarRating({ value, min = 1, max = 5, onChange, size = 'md' }) {
  const stars = [];
  for (let i = min; i <= max; i += 1) stars.push(i);
  const sizes = { xs: 'w-4 h-4', sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-9 h-9', xl: 'w-11 h-11' };
  const sizeClass = sizes[size] || sizes.md;

  return (
    <div className="flex gap-1">
      {stars.map((starValue) => {
        const active = starValue <= (Number(value) || 0);
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange && onChange(starValue)}
            className={`${sizeClass} transition-all duration-200 hover:scale-110 ${
              active ? 'text-amber-400 drop-shadow-sm' : 'text-gray-300 hover:text-amber-200'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.6l2.9 5.9 6.6 1-4.8 4.6 1.1 6.5L12 17.5 6.2 20.6l1.1-6.5L2.5 9.5l6.6-1L12 2.6z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function SurveyPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || params.get('t');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [isFinished, setIsFinished] = React.useState(false);
  const [finishReason, setFinishReason] = React.useState('');
  const [patientName, setPatientName] = React.useState('');
  const [doctors, setDoctors] = React.useState([]);
  const [doctorQuestions, setDoctorQuestions] = React.useState([]);
  const [generalQuestions, setGeneralQuestions] = React.useState([]);
  const [questionAnswers, setQuestionAnswers] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [selectedLang, setSelectedLang] = React.useState('am');
  const [selectedDoctors, setSelectedDoctors] = React.useState([]);
  const [surveyPhase, setSurveyPhase] = React.useState('select');
  const [doctorSearch, setDoctorSearch] = React.useState('');

  const totalPages = selectedDoctors.length + (generalQuestions.length > 0 ? 1 : 0);

  const translations = {
    welcomeTitle: { en: 'Patient Feedback', am: 'የታካሚ አስተያየት' },
    welcomeSubtitle: { en: 'Your opinion helps us improve care', am: 'አስተያየትዎ አገልግሎታችንን ለማሻሻል ይረዳናል' },
    welcomeTextEn: 'First of all, we would like to thank you for choosing Girum Hospital. We kindly ask for your cooperation in filling out this questionnaire to help us improve our services.',
    welcomeTextAm: 'በቅድሚያ ግሩም ሆሰፒታልን ስለመረጡ እያመሰገንን ፤ አገልግሎታችንን ለማሻሻል እንዲረዳን ይህን መጠየቅ ይሞሉ ዘንድ መልካም ፈቓዶን በትህትና እንጠይቓለን።',
    doctors: { en: 'Doctors', am: 'ዶክተሮች' },
    doctorsShort: { en: 'Doctors', am: 'ዶክተሮች' },
    general: { en: 'General', am: 'አጠቃላይ' },
    doctorSurvey: { en: 'Doctor Survey', am: 'የሐኪሞች መጠይቅ' },
    generalSurvey: { en: 'General Survey', am: 'አጠቃላይ መጠይቅ' },
    next: { en: 'Next', am: 'ቀጣይ' },
    nextGeneral: { en: 'Next: General', am: 'ቀጣይ: አጠቃላይ' },
    previous: { en: 'Previous', am: 'ቀዳሚ' },
    submit: { en: 'Submit Feedback', am: 'አስተያየት ላክ' },
    back: { en: 'Back', am: 'ቀዳሚ' },
    submitting: { en: 'Submitting...', am: 'በማስገባት ላይ...' },
    confidential: { en: 'Your response is confidential and secure', am: 'አስተያየትዎ ሚስጥራዊ ነው እና ደህንነቱ የተጠበቀ ነው' },
    thankYou: { en: 'Thank You!', am: 'እናመሰግናለን!' },
    feedbackSubmitted: { en: 'Your feedback has been submitted successfully!', am: 'አስተያየትዎ በተሳካ ሁኔታ ተልኳል!' },
    surveyCompleted: { en: 'This survey has already been completed.', am: 'ይህ መጠይቅ ቀደም ብሎ ተሞልቷል።' },
    feedback: { en: 'Feedback', am: 'አስተያየት' },
    received: { en: 'Received', am: 'ደርሶናል' },
    yourVoice: { en: 'Your Voice', am: 'የእርስዎ ድምፅ' },
    matters: { en: 'Matters', am: 'ለእኛ ዋጋ አለው' },
    better: { en: 'Better', am: 'ለተሻለ' },
    services: { en: 'Services', am: 'አገልግሎት' },
    responseHelp: { en: 'Your response will help us improve our healthcare services. We appreciate your time!', am: 'አስተያየትዎ የጤና አገልግሎታችንን ለማሻሻል ይረዳናል። ጊዜዎን ስለሰጡን እናመሰግናለን!' },
    eachSurveyOnce: { en: 'Each survey can only be submitted once. Thank you for your understanding.', am: 'እያንዳንዱ መጠይቅ አንድ ጊዜ ብቻ ሊላክ ይችላል። ለማስተዋልዎ እናመሰግናለን።' },
    confidentialFinal: { en: 'Your response is confidential', am: 'አስተያየትዎ ሚስጥራዊ ነው' },
    page: { en: 'Page', am: 'ገጽ' },
    hospitalService: { en: 'Hospital and service feedback', am: 'የሆስፒታል እና አገልግሎት አስተያየት' },
    language: { en: 'Language', am: 'ቋንቋ' },
    loading: { en: 'Loading Survey', am: 'መጠይቅ በማስገባት ላይ' },
    pleaseWait: { en: 'Please wait...', am: 'እባክዎ ይጠብቁ...' },
    rating: { en: 'out of', am: 'ከ' },
    tapToRate: { en: 'Tap to rate', am: 'ደረጃ ይስጡ' },
    shareThoughts: { en: 'Share your thoughts with us...', am: 'አስተያየትዎን ለኛ ያጋሩ...' },
    enterNumber: { en: 'Enter a number', am: 'ቁጥር ያስገቡ' },
    selectDoctors: { en: 'Select Your Doctors', am: 'ሐኪሞችን ይምረጡ' },
    selectDoctorsHelper: { en: 'Select doctors who treated you', am: 'ህክምና የሰጡዎትን ዶክተሮች ይምረጡ' },
    searchDoctors: { en: 'Search doctors...', am: 'ዶክተሮችን ይፈልጉ...' },
    selectedDoctors: { en: 'Selected Doctors', am: 'የተመረጡ ሐኪሞች' },
    yourName: { en: 'Your Name', am: 'ስምዎ' },
    optional: { en: '(optional)', am: '(አማራጭ)' },
    namePlaceholder: { en: 'Enter your name (optional)', am: 'ስምዎን ያስገቡ (አማራጭ)' },
    continue: { en: 'Continue', am: 'ቀጥል' },
    selectAtLeastOne: { en: 'Please select at least one doctor', am: 'ቢያንስ አንድ ሐኪም ይምረጡ' },
  };

  function t(key) {
    const val = translations[key];
    if (typeof val === 'object' && val !== null) {
      return val[selectedLang] || val.en || key;
    }
    return val || key;
  }

  function getQuestionLabel(q) {
    const labelObj = q.label;
    if (typeof labelObj === 'object' && labelObj !== null) {
      return labelObj[selectedLang] || labelObj.en || labelObj;
    }
    return labelObj;
  }

  function getQuestionOptions(q) {
    const opts = q.options;
    if (typeof opts === 'object' && opts !== null && !Array.isArray(opts)) {
      return opts[selectedLang] || opts.en || [];
    }
    return Array.isArray(opts) ? opts : [];
  }

  function getQuestionLabelWithDoctorName(label, doctorName) {
    return label.replace(/\{doctor_name\}/gi, doctorName);
  }

  function getDoctorQuestionKey(doctorId, questionId) {
    return `doctor_${doctorId}_${questionId}`;
  }

  function toggleDoctor(doctor) {
    const exists = selectedDoctors.find(d => d.id === doctor.id);
    if (exists) {
      setSelectedDoctors(selectedDoctors.filter(d => d.id !== doctor.id));
    } else {
      setSelectedDoctors([...selectedDoctors, { id: doctor.id, name: doctor.name }]);
    }
  }

  function getCurrentDoctor() {
    if (currentPage < selectedDoctors.length) {
      return selectedDoctors[currentPage];
    }
    return null;
  }

  function isOnGeneralPage() {
    return currentPage >= selectedDoctors.length;
  }

  function goToNextPage() {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goToPrevPage() {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function validateCurrentPage() {
    return '';
  }

  React.useEffect(() => {
    async function loadSurvey() {
      if (!token) {
        setLoading(false);
        return;
      }

      const completedKey = 'survey_completed_' + token;
      const savedCompletion = localStorage.getItem(completedKey);
      if (savedCompletion) {
        const completionData = JSON.parse(savedCompletion);
        setIsFinished(true);
        setFinishReason('submitted');
        if (completionData.language) {
          setSelectedLang(completionData.language);
        }
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/survey?token=' + encodeURIComponent(token));
        const data = await res.json();
        if (!res.ok || data.error) {
          const apiError = data.error || 'Unable to load survey';
          if (apiError === 'used_token') {
            if (data.language) {
              setSelectedLang(data.language);
            }
            setIsFinished(true);
            setFinishReason('used');
            setError('');
            return;
          }
          throw new Error(apiError);
        }

        setDoctors(data.doctors || []);
        setDoctorQuestions(data.doctor_questions || []);
        setGeneralQuestions(data.general_questions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [token]);

  React.useEffect(() => {
    setError('');
  }, [currentPage]);

  function setQuestionValue(key, value) {
    setQuestionAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMultiChoice(key, option) {
    setQuestionAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(option);
      const next = exists ? current.filter((x) => x !== option) : [...current, option];
      return { ...prev, [key]: next };
    });
  }

  function validateAllQuestions() {
    for (const d of doctors) {
      for (const q of doctorQuestions) {
        if (q.required) {
          const key = getDoctorQuestionKey(d.id, q.id);
          if (!(key in questionAnswers)) return 'Please answer all required doctor questions';
        }
      }
    }
    for (const q of generalQuestions) {
      if (q.required) {
        const answer = questionAnswers[q.id];
        if (answer === undefined || answer === null || answer === '') {
          return 'SUBMIT_VALIDATION: Please answer all required general questions';
        }
      }
    }
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (selectedDoctors.length === 0) {
      setError(t('selectAtLeastOne'));
      return;
    }

    for (const d of selectedDoctors) {
      for (const q of doctorQuestions) {
        if (q.required) {
          const key = getDoctorQuestionKey(d.id, q.id);
          if (!(key in questionAnswers) || questionAnswers[key] === '' || questionAnswers[key] === null || questionAnswers[key] === undefined) {
            setError('Please answer all required questions for ' + d.name);
            return;
          }
        }
      }
    }
    
    for (const q of generalQuestions) {
      if (q.required) {
        const answer = questionAnswers[q.id];
        if (answer === undefined || answer === null || answer === '') {
          setError('Please answer all required general questions');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        token,
        patient_name: patientName || null,
        selected_doctor_ids: selectedDoctors.map(d => d.id),
        selected_doctor_names: selectedDoctors.map(d => d.name),
        question_answers: questionAnswers,
        language: selectedLang
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const apiError = data.error || 'Submit failed';
        if (apiError === 'used_token') {
          setIsFinished(true);
          setFinishReason('used');
          setError('');
          return;
        }
        throw new Error(apiError);
      }

      setIsFinished(true);
      setFinishReason('submitted');
      setError('');
      localStorage.setItem('survey_completed_' + token, JSON.stringify({ language: selectedLang }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestionInput(q, answerKey) {
    const value = questionAnswers[answerKey];

    if (q.type === 'text') {
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setQuestionValue(answerKey, e.target.value)}
          placeholder={t('shareThoughts')}
          className="w-full p-5 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 resize-none transition-all text-gray-700"
          rows={4}
        />
      );
    }

    if (q.type === 'number') {
      return (
        <input
          type="number"
          value={value ?? ''}
          min={q.min ?? undefined}
          max={q.max ?? undefined}
          onChange={(e) => setQuestionValue(answerKey, e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={t('enterNumber')}
          className="w-full p-5 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 transition-all text-gray-700"
        />
      );
    }

    if (q.type === 'yes_no') {
      const yesNoOptions = getQuestionOptions(q);
      const yesLabel = yesNoOptions[0] || 'Yes';
      const noLabel = yesNoOptions[1] || 'No';
      return (
        <div className="flex gap-4 justify-center">
          <button
            key="yes"
            type="button"
            onClick={() => setQuestionValue(answerKey, 'yes')}
            className={`flex-1 max-w-[180px] py-6 rounded-2xl font-bold transition-all flex flex-col items-center gap-2 ${
              value === 'yes'
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-200 scale-105'
                : 'bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 border-2 border-transparent hover:border-emerald-200'
            }`}
          >
            <ThumbsUp className="w-10 h-10" />
            <span className="text-lg">{yesLabel}</span>
          </button>
          <button
            key="no"
            type="button"
            onClick={() => setQuestionValue(answerKey, 'no')}
            className={`flex-1 max-w-[180px] py-6 rounded-2xl font-bold transition-all flex flex-col items-center gap-2 ${
              value === 'no'
                ? 'bg-gradient-to-br from-red-400 to-red-600 text-white shadow-xl shadow-red-200 scale-105'
                : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 border-2 border-transparent hover:border-red-200'
            }`}
          >
            <ThumbsDown className="w-10 h-10" />
            <span className="text-lg">{noLabel}</span>
          </button>
        </div>
      );
    }

    if (q.type === 'single_choice') {
      const options = getQuestionOptions(q);
      return (
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              onClick={() => setQuestionValue(answerKey, opt)}
              className={`py-4 px-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 ${
                value === opt
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-100 hover:border-blue-200'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                value === opt ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (q.type === 'multi_choice') {
      const selected = Array.isArray(value) ? value : [];
      const options = getQuestionOptions(q);
      return (
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleMultiChoice(answerKey, opt)}
              className={`py-4 px-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 ${
                selected.includes(opt)
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-violet-50 hover:text-violet-600 border-2 border-gray-100 hover:border-violet-200'
              }`}
            >
              {selected.includes(opt) && <Check className="w-5 h-5" />}
              {opt}
            </button>
          ))}
        </div>
      );
    }

    const min = Number.isFinite(q.min) ? q.min : 1;
    const max = Number.isFinite(q.max) ? q.max : 5;
    return (
      <div className="flex flex-col items-center gap-4">
        <StarRating value={value} min={min} max={max} onChange={(next) => setQuestionValue(answerKey, next)} size="xl" />
        <span className="text-base text-gray-500 font-medium">
          {value ? `${value} ${t('rating')} ${max}` : `${t('tapToRate')} (${min}-${max})`}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent rounded-full border-t-blue-500 animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('loading')}</h2>
          <p className="text-gray-500">{t('pleaseWait')}</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white opacity-10"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="relative mx-auto mb-6 w-28 h-28">
                <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
                  <Sparkles className="w-14 h-14 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Check className="w-6 h-6 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-3">{t('thankYou')}</h2>
              <p className="text-emerald-100 text-lg">
                {finishReason === 'submitted' 
                  ? t('feedbackSubmitted')
                  : t('surveyCompleted')}
              </p>
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-7 h-7 text-blue-500" />
                </div>
                <p className="text-sm text-gray-500">{t('feedback')}</p>
                <p className="font-bold text-gray-800">{t('received')}</p>
              </div>
              <div className="w-px bg-gray-200"></div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Heart className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-sm text-gray-500">{t('yourVoice')}</p>
                <p className="font-bold text-gray-800">{t('matters')}</p>
              </div>
              <div className="w-px bg-gray-200"></div>
              <div className="text-center">
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-7 h-7 text-purple-500" />
                </div>
                <p className="text-sm text-gray-500">{t('better')}</p>
                <p className="font-bold text-gray-800">{t('services')}</p>
              </div>
            </div>
            
            <p className="text-center text-gray-500">
              {finishReason === 'submitted' 
                ? t('responseHelp')
                : t('eachSurveyOnce')}
            </p>
            
            <div className="mt-8 flex justify-center">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl px-6 py-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">{t('confidentialFinal')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Survey Not Found</h2>
          <p className="text-gray-500 mb-6">Please use the survey link sent to your phone or email.</p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">If you believe this is an error, please contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            <div className="absolute -top-20 -right-20 w-52 h-52 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-cyan-400/20 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src="/image/girum-logo.png" alt="Girum Hospital" className="relative w-36 h-36 object-contain" style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'}} />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold text-white">{t('welcomeTitle')}</h1>
                  <p className="text-emerald-100 mt-0.5 text-sm">{t('welcomeSubtitle')}</p>
                </div>
              </div>
              <div className="flex items-center bg-white/15 backdrop-blur-md rounded-full p-1.5 shadow-lg ring-2 ring-white/20">
                <button
                  onClick={() => setSelectedLang('en')}
                  className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedLang === 'en' 
                      ? 'bg-white text-emerald-700 shadow-md' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg">🇬🇧</span>
                  <span className="hidden sm:inline">English</span>
                </button>
                <button
                  onClick={() => setSelectedLang('am')}
                  className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedLang === 'am' 
                      ? 'bg-white text-emerald-700 shadow-md' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg">🇪🇹</span>
                  <span className="hidden sm:inline">አማርኛ</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-5 mb-6 flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-red-700">Error</p>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            )}

{surveyPhase === 'select' && (
  <div className="doctor-selection">
    <div className="mb-6">
      <label className="block font-semibold text-gray-700 mb-2">{t('yourName')} <span className="text-gray-400 text-sm">{t('optional')}</span></label>
      <input
        type="text"
        value={patientName}
        onChange={(e) => setPatientName(e.target.value)}
        placeholder={t('namePlaceholder')}
        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 transition-all"
      />
    </div>

    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">{t('selectDoctors')}</h2>
      <p className="text-gray-600 text-sm">{t('selectDoctorsHelper')}</p>
    </div>

    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={doctorSearch}
          onChange={(e) => setDoctorSearch(e.target.value)}
          placeholder={t('searchDoctors')}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 transition-all"
        />
      </div>
    </div>

    {selectedDoctors.length > 0 && (
      <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
        <p className="text-sm font-semibold text-green-700 mb-3">
          {t('selectedDoctors')} ({selectedDoctors.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {selectedDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-sm"
            >
              <span className="font-medium">{doctor.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDoctor(doctor);
                }}
                className="w-5 h-5 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="space-y-3 mb-8 max-h-80 overflow-y-auto">
      {doctors.filter(d => 
        d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        (d.department && d.department.toLowerCase().includes(doctorSearch.toLowerCase()))
      ).map((doctor) => {
        const isSelected = selectedDoctors.some(d => d.id === doctor.id);
        return (
          <div
            key={doctor.id}
            onClick={() => toggleDoctor(doctor)}
            className={`doctor-card cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
              isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
            }`}>
              {isSelected && <Check className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{doctor.name}</p>
              {doctor.department && <p className="text-sm text-gray-500">{doctor.department}</p>}
            </div>
          </div>
        );
      })}
    </div>

    <button
      onClick={() => {
        if (selectedDoctors.length === 0) {
          setError(t('selectAtLeastOne'));
          return;
        }
        setError('');
        setSurveyPhase('questions');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
    >
      {t('continue')}
      <ArrowRight className="w-5 h-5" />
    </button>
  </div>
)}

{surveyPhase === 'questions' && (
<form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); } }} className="space-y-6">
              {currentPage === 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100">
                  <p className="text-gray-700 leading-relaxed text-center">
                    <span className="text-lg font-medium block">{selectedLang === 'am' ? t('welcomeTextAm') : t('welcomeTextEn')}</span>
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border-2 border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  {selectedDoctors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                          currentPage < selectedDoctors.length
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {currentPage >= selectedDoctors.length ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Users className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium whitespace-nowrap">{t('doctorsShort')} ({selectedDoctors.length})</span>
                      </div>
                      {generalQuestions.length > 0 && (
                        <div className={`w-6 h-0.5 ${currentPage >= selectedDoctors.length ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                      )}
                    </div>
                  )}
                  {generalQuestions.length > 0 && (
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                        currentPage >= selectedDoctors.length
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('general')}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                      style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                    {currentPage + 1} / {totalPages}
                  </span>
                </div>
              </div>

              {(() => {
                const currentDoctor = getCurrentDoctor();
                
                if (currentDoctor) {
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-xl">{t('doctorSurvey')}</h3>
                          <p className="text-sm text-gray-500">{t('page')} {currentPage + 1} {t('rating')} {totalPages}</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border-2 border-gray-100">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {currentDoctor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-lg">{currentDoctor.name}</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {doctorQuestions.map((q) => {
                            const answerKey = getDoctorQuestionKey(currentDoctor.id, q.id);
                            return (
                              <div key={`${currentDoctor.id}_${q.id}`} className="bg-white rounded-xl p-5 border border-gray-100">
                                <label className="block font-semibold text-gray-800 text-base mb-4 flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5">Q.</span>
                                  {getQuestionLabelWithDoctorName(getQuestionLabel(q), currentDoctor.name)}
                                  {q.required && <span className="text-red-400">*</span>}
                                </label>
                                {renderQuestionInput(q, answerKey)}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setSurveyPhase('select');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                        >
                          <ArrowLeft className="w-5 h-5" />
                          {t('back')}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            
                            if (currentPage < selectedDoctors.length) {
                              const currentDoctor = selectedDoctors[currentPage];
                              for (const q of doctorQuestions) {
                                if (q.required) {
                                  const key = getDoctorQuestionKey(currentDoctor.id, q.id);
                                  const answer = questionAnswers[key];
                                  if (answer === undefined || answer === null || answer === '') {
                                    setError('Please answer all required questions for ' + currentDoctor.name);
                                    return;
                                  }
                                }
                              }
                            }
                            
                            setError('');
                            goToNextPage();
                          }}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                        >
                          {currentPage === selectedDoctors.length - 1 && generalQuestions.length > 0 ? t('nextGeneral') : t('next')}
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <ClipboardList className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-xl">{t('generalSurvey')}</h3>
                        <p className="text-sm text-gray-500">{t('hospitalService')}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {generalQuestions.map((q) => (
                        <div key={q.id} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border-2 border-gray-100">
                          <label className="block font-bold text-gray-800 text-lg mb-4 flex items-start gap-2">
                            <span className="text-emerald-500 mt-1">Q.</span>
                            {getQuestionLabel(q)}
                            {q.required && <span className="text-red-400 mt-1">*</span>}
                          </label>
                          {renderQuestionInput(q, q.id)}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSurveyPhase('select');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 px-8 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        {t('back')}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 px-8 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                      >
                        {submitting ? (
                          <>
                            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            {t('submitting')}
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            {t('submit')}
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-sm text-gray-400 mt-4">
                      <Shield className="w-4 h-4" />
                      <span>{t('confidential')}</span>
                    </div>
                  </div>
                );
              })()}
            </form>
)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ authToken, currentUser, onLogout }) {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [message, setMessage] = React.useState({ type: '', text: '' });
  const [analytics, setAnalytics] = React.useState(null);
  const [dashboardDateFilter, setDashboardDateFilter] = React.useState('today');
  const [dashboardDateRange, setDashboardDateRange] = React.useState({ date_from: '', date_to: '' });
  const dashboardDateFilterRef = React.useRef('today');
  const dashboardDateRangeRef = React.useRef({ date_from: '', date_to: '' });
  const [responses, setResponses] = React.useState([]);
  const [questions, setQuestions] = React.useState([]);
  const [doctorsList, setDoctorsList] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [showUserModal, setShowUserModal] = React.useState(false);
  const [newUser, setNewUser] = React.useState({ username: '', email: '', password: '' });
  const [userLoading, setUserLoading] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]);
  const [hasNewNotifications, setHasNewNotifications] = React.useState(false);
  const [editUserModal, setEditUserModal] = React.useState({ isOpen: false, user: null });
  const [editUserData, setEditUserData] = React.useState({ username: '', email: '', password: '', is_active: true });
  const [activityLogs, setActivityLogs] = React.useState([]);
  const [activityPagination, setActivityPagination] = React.useState({ page: 1, limit: 5, total: 0, total_pages: 0 });
  const [userDeleteModal, setUserDeleteModal] = React.useState({ isOpen: false, user: null });
  const [reportsTab, setReportsTab] = React.useState('doctor-report');
  const [doctorReportData, setDoctorReportData] = React.useState([]);
  const [generalReportData, setGeneralReportData] = React.useState([]);
  const [reportDoctors, setReportDoctors] = React.useState([]);
  const [reportFilters, setReportFilters] = React.useState({
    doctor_id: '',
    date_from: '',
    date_to: ''
  });
  const [reportsLoading, setReportsLoading] = React.useState(false);

  const [filters, setFilters] = React.useState({ search: '', date_from: '', date_to: '' });
  const [searchInput, setSearchInput] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [loadingResponses, setLoadingResponses] = React.useState(false);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 5, total: 0, total_pages: 0 });
  const [pageLimit, setPageLimit] = React.useState(5);
  const [dashboardLoading, setDashboardLoading] = React.useState(false);

  React.useEffect(() => {
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    const range = { date_from: dateStr, date_to: dateStr };
    dashboardDateRangeRef.current = range;
    dashboardDateFilterRef.current = 'today';
    setDashboardDateRange(range);
    loadDashboardData(dateStr, dateStr);
  }, []);

  const [newQuestion, setNewQuestion] = React.useState({
    key: '',
    label_en: '',
    label_am: '',
    type: 'stars',
    required: true,
    options_en: [],
    options_am: [],
    options: [],
    min: 1,
    max: 5,
    page_number: 1,
    category: 'general'
  });
  const [questionFilter, setQuestionFilter] = React.useState('all');
  const [editingQuestion, setEditingQuestion] = React.useState(null);
  const [optionInput, setOptionInput] = React.useState('');
  const [optionInputAm, setOptionInputAm] = React.useState('');
  const [deleteModal, setDeleteModal] = React.useState({ isOpen: false, question: null });
  const [responseDeleteModal, setResponseDeleteModal] = React.useState({ isOpen: false, ids: [], count: 0 });
  const [downloadDropdown, setDownloadDropdown] = React.useState(false);

  const [doctors, setDoctors] = React.useState([]);
  const [doctorsPagination, setDoctorsPagination] = React.useState({ page: 1, limit: 10, total: 0, total_pages: 0 });
  const [doctorsSearch, setDoctorsSearch] = React.useState('');
  const [doctorsSearchInput, setDoctorsSearchInput] = React.useState('');
  const [showDoctorModal, setShowDoctorModal] = React.useState(false);
  const [editingDoctor, setEditingDoctor] = React.useState(null);
  const [doctorForm, setDoctorForm] = React.useState({ name: '', department: '', email: '' });
  const [doctorLoading, setDoctorLoading] = React.useState(false);
  const [deleteDoctorModal, setDeleteDoctorModal] = React.useState({ isOpen: false, doctor: null });

  const showMessage = (text, type = 'info') => {
    if (type === 'error') toast.error(text);
    else if (type === 'success') toast.success(text);
    else toast.info(text);
  };

  function headers() {
    return authToken ? { 'x-session-token': authToken } : {};
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users', { headers: headers() });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }

  async function fetchDoctors(page = 1, search = '') {
    try {
      const params = new URLSearchParams({ page, limit: doctorsPagination.limit });
      if (search) params.set('search', search);
      const res = await fetch('/api/doctors?' + params.toString(), { headers: headers() });
      const data = await res.json();
      if (res.ok) {
        setDoctors(data.doctors || []);
        setDoctorsPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total || 0,
          total_pages: data.total_pages || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  }

  async function fetchDoctorsWithLimit(page = 1, search = '', limit) {
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      const res = await fetch('/api/doctors?' + params.toString(), { headers: headers() });
      const data = await res.json();
      if (res.ok) {
        setDoctors(data.doctors || []);
        setDoctorsPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total || 0,
          total_pages: data.total_pages || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  }

  function handleDoctorsSearch(e) {
    e.preventDefault();
    setDoctorsSearch(doctorsSearchInput);
    fetchDoctors(1, doctorsSearchInput);
  }

  function changeDoctorsPage(newPage) {
    if (newPage < 1 || newPage > doctorsPagination.total_pages) return;
    fetchDoctors(newPage, doctorsSearch);
  }

  function clearDoctorsSearch() {
    setDoctorsSearchInput('');
    setDoctorsSearch('');
    fetchDoctors(1, '');
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setUserLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('User created successfully');
      setNewUser({ username: '', email: '', password: '' });
      setShowUserModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUserLoading(false);
    }
  }

  async function handleDeleteUser(id) {
    try {
      const res = await fetch('/api/admin/users/' + id, {
        method: 'DELETE',
        headers: headers()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('User deleted');
      setUserDeleteModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function confirmDeleteUser(user) {
    setUserDeleteModal({ isOpen: true, user });
  }

  function handleOpenEditUser(user) {
    setEditUserData({
      username: user.username,
      email: user.email,
      password: '',
      is_active: user.is_active
    });
    setEditUserModal({ isOpen: true, user });
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    setUserLoading(true);
    try {
      const updates = {};
      if (editUserData.username !== editUserModal.user.username) updates.username = editUserData.username;
      if (editUserData.email !== editUserModal.user.email) updates.email = editUserData.email;
      if (editUserData.password) updates.password = editUserData.password;
      if (editUserData.is_active !== editUserModal.user.is_active) updates.is_active = editUserData.is_active;

      const res = await fetch('/api/admin/users/' + editUserModal.user.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('User updated successfully');
      setEditUserModal({ isOpen: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUserLoading(false);
    }
  }

  async function handleCreateDoctor(e) {
    e.preventDefault();
    setDoctorLoading(true);
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(doctorForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Doctor created successfully');
      setShowDoctorModal(false);
      setDoctorForm({ name: '', department: '', email: '' });
      fetchDoctors(doctorsPagination.page, doctorsSearch);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDoctorLoading(false);
    }
  }

  async function handleUpdateDoctor(e) {
    e.preventDefault();
    setDoctorLoading(true);
    try {
      const res = await fetch('/api/doctors/' + editingDoctor.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify(doctorForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Doctor updated successfully');
      setEditingDoctor(null);
      setDoctorForm({ name: '', department: '', email: '' });
      fetchDoctors(doctorsPagination.page, doctorsSearch);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDoctorLoading(false);
    }
  }

  async function handleDeleteDoctor() {
    try {
      const res = await fetch('/api/doctors/' + deleteDoctorModal.doctor.id, {
        method: 'DELETE',
        headers: headers()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Doctor deleted');
      setDeleteDoctorModal({ isOpen: false, doctor: null });
      fetchDoctors();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function fetchActivityLogs(page = 1, limit = 5) {
    try {
      const res = await fetch(`/api/admin/activity-logs?page=${page}&limit=${limit}`, { headers: headers() });
      const data = await res.json();
      if (res.ok) {
        setActivityLogs(data.logs || []);
        setActivityPagination({
          page: data.page || 1,
          limit: data.limit || limit,
          total: data.total || 0,
          total_pages: data.total_pages || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  }

  async function fetchReportDoctors() {
    try {
      const res = await fetch('/api/doctors/all', { headers: headers() });
      const data = await res.json();
      if (res.ok) setReportDoctors(data.doctors || []);
    } catch (err) {
      console.error('Failed to fetch report doctors:', err);
    }
  }

  async function fetchDoctorReport() {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportFilters.doctor_id) params.set('doctor_id', reportFilters.doctor_id);
      if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
      if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);
      const res = await fetch('/api/reports/doctors?' + params.toString(), { headers: headers() });
      const data = await res.json();
      if (res.ok) setDoctorReportData(data.doctors || []);
    } catch (err) {
      console.error('Failed to fetch doctor report:', err);
    } finally {
      setReportsLoading(false);
    }
  }

  async function fetchGeneralReport() {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
      if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);
      const res = await fetch('/api/reports/general?' + params.toString(), { headers: headers() });
      const data = await res.json();
      if (res.ok) setGeneralReportData(data.questions || []);
    } catch (err) {
      console.error('Failed to fetch general report:', err);
    } finally {
      setReportsLoading(false);
    }
  }

  function changeActivityPage(newPage) {
    if (newPage < 1 || newPage > activityPagination.total_pages) return;
    fetchActivityLogs(newPage, activityPagination.limit);
  }

  React.useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'activity') fetchActivityLogs();
    if (activeTab === 'doctors') fetchDoctors();
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab === 'reports' && !reportsTab) {
      setReportsTab('doctor-report');
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportDoctors();
      if (reportsTab === 'doctor-report') {
        fetchDoctorReport();
      } else {
        fetchGeneralReport();
      }
    }
  }, [activeTab, reportsTab]);

  const LAST_SEEN_KEY = 'last_seen_response_id';
  const lastSeenIdRef = React.useRef(parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0'));
  
  React.useEffect(() => {
    async function pollForNewResponses() {
      try {
        const res = await fetch('/api/responses?grouped=true&page=1&limit=20', { headers: headers() });
        const data = await res.json();
        
        if (!res.ok) {
          console.error('Poll failed:', data.error);
          return;
        }
        
        if (data.responses && data.responses.length > 0) {
          const latestId = Math.max(...data.responses.map(r => r.submission_id));
          const lastKnownId = lastSeenIdRef.current;
          
          const newResponses = data.responses.filter(r => r.submission_id > lastKnownId);
          
          if (newResponses.length > 0) {
            setNotifications(prev => {
              const existingIds = new Set(prev.map(n => n.submission_id));
              const uniqueNew = newResponses.filter(n => !existingIds.has(n.submission_id));
              return [...uniqueNew, ...prev].slice(0, 10);
            });
            setHasNewNotifications(true);
          }
          
          lastSeenIdRef.current = latestId;
          localStorage.setItem(LAST_SEEN_KEY, String(latestId));
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }

    pollForNewResponses();
    const interval = setInterval(pollForNewResponses, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  function handleOpenNotifications() {
    setShowNotifications(!showNotifications);
    if (!showNotifications && !hasNewNotifications) {
      setShowNotifications(true);
    }
  }

  function handleCloseNotifications() {
    setShowNotifications(false);
    setHasNewNotifications(false);
    setNotifications([]);
  }

  function formatAnswerValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  function formatDoctorNames(questionAnswers, doctorNames) {
    if (doctorNames) return doctorNames;
    if (!questionAnswers || typeof questionAnswers !== 'object') return '-';
    const doctorIds = new Set();
    for (const key of Object.keys(questionAnswers)) {
      const match = key.match(/^doctor_([^_]+)_/);
      if (match) {
        doctorIds.add(match[1]);
      }
    }
    if (doctorIds.size === 0) return '-';
    return 'Doctors (' + doctorIds.size + ')';
  }

  function formatDoctorRatings(ratings) {
    const items = Array.isArray(ratings) ? ratings : [];
    if (!items.length) return '-';
    return items.map((x) => `${x.doctor_name}: ${'★'.repeat(Number(x.rating))}`).join(' | ');
  }

  function getRatingBg(rating) {
    if (rating >= 4.5) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (rating >= 3.5) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (rating >= 2.5) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  }

  function getDateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function handleDashboardDateFilterChange(filterType) {
    const now = new Date();
    let from = '';
    let to = '';
    
    if (filterType === 'today') {
      from = getDateString(now);
      to = getDateString(now);
    } else if (filterType === 'yesterday') {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      from = getDateString(d);
      to = getDateString(d);
    } else if (filterType === 'this_week') {
      const start = new Date(now);
      const day = start.getDay();
      // Monday is start of week: Sunday = 0, so adjust to subtract (day === 0 ? 6 : day - 1)
      const offset = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - offset);
      
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      from = getDateString(start);
      to = getDateString(end);
    } else if (filterType === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      from = getDateString(start);
      to = getDateString(end);
    } else if (filterType === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      from = getDateString(start);
      to = getDateString(end);
    } else if (filterType === 'custom') {
      setDashboardDateFilter('custom');
      dashboardDateFilterRef.current = 'custom';
      return;
    }
    
    dashboardDateFilterRef.current = filterType;
    dashboardDateRangeRef.current = { date_from: from, date_to: to };
    
    setDashboardDateFilter(filterType);
    setDashboardDateRange({ date_from: from, date_to: to });
    loadDashboardData(from, to);
  }

  function handleCustomDateChange(type, value) {
    const range = { ...dashboardDateRangeRef.current, [type]: value };
    dashboardDateRangeRef.current = range;
    dashboardDateFilterRef.current = 'custom';
    setDashboardDateFilter('custom');
    setDashboardDateRange(range);
    loadDashboardData(range.date_from, range.date_to);
  }

  async function loadDashboardData(dateFrom, dateTo) {
    if (dashboardLoading) return;
    setDashboardLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const url = '/api/analytics?' + new URLSearchParams(params).toString();
      const [aRes, qRes, dRes] = await Promise.all([
        fetch(url, { headers: headers() }),
        fetch('/api/questions?all=true', { headers: headers() }),
        fetch('/api/doctors/list', { headers: headers() })
      ]);

      const [aData, qData, dData] = await Promise.all([aRes.json(), qRes.json(), dRes.json()]);

      if (aRes.ok && !aData.error) setAnalytics(aData);
      if (qRes.ok && !qData.error) setQuestions(qData.questions || []);
      if (dRes.ok && !dData.error) {
        const uniqueDoctors = [];
        const seen = new Set();
        for (const d of (dData.doctors || [])) {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            uniqueDoctors.push(d);
          }
        }
        setDoctorsList(uniqueDoctors);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
} finally {
        setDashboardLoading(false);
      }
    }

    async function loadAll(showNotif = true) {
      try {
        if (showNotif) showMessage('Loading...', 'info');

        const range = dashboardDateRangeRef.current;
        const [aRes, rRes, qRes, dRes] = await Promise.all([
          fetch('/api/analytics?' + new URLSearchParams({
            date_from: range.date_from || '',
            date_to: range.date_to || ''
          }), { headers: headers() }),
          fetch(`/api/responses?grouped=true&page=1&limit=${pageLimit}&date_from=${range.date_from || ''}&date_to=${range.date_to || ''}`, { headers: headers() }),
        fetch('/api/questions?all=true', { headers: headers() }),
        fetch('/api/doctors/list', { headers: headers() })
      ]);

      const [aData, rData, qData, dData] = await Promise.all([aRes.json(), rRes.json(), qRes.json(), dRes.json()]);

      if (!aRes.ok || aData.error) throw new Error(aData.error || 'Failed analytics');
      if (!rRes.ok || rData.error) throw new Error(rData.error || 'Failed responses');
      if (!qRes.ok || qData.error) throw new Error(qData.error || 'Failed questions');

      setAnalytics(aData);
      setResponses(rData.responses || []);
      setQuestions(qData.questions || []);
      if (dRes.ok && !dData.error) {
        const uniqueDoctors = [];
        const seen = new Set();
        for (const d of (dData.doctors || [])) {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            uniqueDoctors.push(d);
          }
        }
        setDoctorsList(uniqueDoctors);
      }
        const newLimit = rData.limit || pageLimit;
        setPagination({
          page: rData.page || 1,
          limit: newLimit,
          total: rData.total || 0,
          total_pages: rData.total_pages || 0
        });
        if (rData.limit) setPageLimit(rData.limit);

      setSelectedIds(new Set());
      if (showNotif) showMessage('Loaded successfully', 'success');
    } catch (err) {
      if (showNotif) showMessage('Load failed: ' + err.message, 'error');
    }
}

  async function fetchResponsesWithFilters(pageOverride, currentFilters, limitOverride) {
    setLoadingResponses(true);
    const currentLimit = limitOverride || pageLimit;
    try {
      const params = new URLSearchParams({ grouped: 'true' });
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.date_from) params.set('date_from', currentFilters.date_from);
      if (currentFilters.date_to) params.set('date_to', currentFilters.date_to);
      params.set('page', pageOverride);
      params.set('limit', currentLimit);

      const res = await fetch('/api/responses?' + params.toString(), { headers: headers() });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');

      setResponses(data.responses || []);
      setPagination((p) => ({
        page: data.page || 1,
        limit: data.limit || p.limit,
        total: data.total || 0,
        total_pages: data.total_pages || 0
      }));
    } catch (err) {
      showMessage('Load failed: ' + err.message, 'error');
    } finally {
      setLoadingResponses(false);
    }
  }

  function changePage(newPage) {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    fetchResponsesWithFilters(newPage, filters);
  }

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    setPagination((p) => ({ ...p, page: 1 }));
    setSelectedIds(new Set());
    fetchResponsesWithFilters(1, newFilters);
  }

  React.useEffect(() => {
    loadAll(false);
  }, []);

  React.useEffect(() => {
    if (activeTab === 'responses') {
      fetchResponsesWithFilters(pagination.page, filters);
    }
  }, [activeTab]);

  function setType(type) {
    setNewQuestion((prev) => ({
      ...prev,
      type,
      options: type === 'single_choice' || type === 'multi_choice' || type === 'yes_no' ? prev.options : [],
      options_en: type === 'single_choice' || type === 'multi_choice' || type === 'yes_no' ? prev.options_en : [],
      options_am: type === 'single_choice' || type === 'multi_choice' || type === 'yes_no' ? prev.options_am : [],
      min: type === 'stars' ? 1 : prev.min,
      max: type === 'stars' ? 5 : prev.max
    }));
  }

  function addOption() {
    const opt = optionInput.trim();
    if (!opt) return;
    setNewQuestion((prev) => {
      const currentOptions = prev.options_en || prev.options || [];
      if (currentOptions.includes(opt)) return prev;
      return { ...prev, options_en: [...currentOptions, opt], options: [...currentOptions, opt] };
    });
    setOptionInput('');
  }

  function addOptionAm() {
    const opt = optionInputAm.trim();
    if (!opt) return;
    setNewQuestion((prev) => {
      const currentOptions = prev.options_am || [];
      if (currentOptions.includes(opt)) return prev;
      return { ...prev, options_am: [...currentOptions, opt] };
    });
    setOptionInputAm('');
  }

  function removeOption(value) {
    setNewQuestion((prev) => {
      const options_en = (prev.options_en || prev.options || []).filter((x) => x !== value);
      const options_am = (prev.options_am || []).filter((x) => x !== value);
      return { ...prev, options: options_en, options_en, options_am };
    });
  }

  function removeOptionAm(value) {
    setNewQuestion((prev) => {
      const options_am = (prev.options_am || []).filter((x) => x !== value);
      return { ...prev, options_am };
    });
  }

  async function createQuestion(e) {
    e.preventDefault();
    try {
      if (!newQuestion.label_en.trim()) throw new Error('Question label (English) is required');
      const isChoice = newQuestion.type === 'single_choice' || newQuestion.type === 'multi_choice' || newQuestion.type === 'yes_no';
      if (isChoice && (newQuestion.options_en || newQuestion.options || []).length === 0) {
        throw new Error('Add at least one English option for choice question');
      }

      const payload = {
        key: newQuestion.key,
        label_en: newQuestion.label_en,
        label_am: newQuestion.label_am,
        type: newQuestion.type,
        required: newQuestion.required,
        options_en: newQuestion.options_en || newQuestion.options || [],
        options_am: newQuestion.options_am || [],
        min: newQuestion.min,
        max: newQuestion.max,
        page_number: newQuestion.page_number || 1,
        category: newQuestion.category
      };

      let res, data;
      if (editingQuestion) {
        res = await fetch('/api/questions/' + editingQuestion.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers() },
          body: JSON.stringify(payload)
        });
        data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Question update failed');
        setEditingQuestion(null);
        showMessage('Question updated successfully', 'success');
      } else {
        res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers() },
          body: JSON.stringify(payload)
        });
        data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Question create failed');
        showMessage('Question created successfully', 'success');
      }

      setNewQuestion({ key: '', label_en: '', label_am: '', type: 'stars', required: true, options_en: [], options_am: [], options: [], min: 1, max: 5, page_number: 1, category: 'general' });
      setOptionInput('');
      setOptionInputAm('');
      await loadAll(false);
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  function editQuestion(q) {
    setEditingQuestion(q);
    const labelObj = q.label || q;
    const optionsObj = q.options || {};
    setNewQuestion({
      key: q.key || '',
      label_en: labelObj.en || labelObj,
      label_am: labelObj.am || '',
      type: q.type || 'stars',
      required: q.required !== undefined ? q.required : true,
      options_en: optionsObj.en || (Array.isArray(q.options) ? q.options : []),
      options_am: optionsObj.am || [],
      options: optionsObj.en || (Array.isArray(q.options) ? q.options : []),
      min: q.min_value || q.min || 1,
      max: q.max_value || q.max || 5,
      page_number: q.page_number || 1,
      category: q.category || 'general'
    });
    setOptionInput('');
    setOptionInputAm('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingQuestion(null);
    setNewQuestion({ key: '', label_en: '', label_am: '', type: 'stars', required: true, options_en: [], options_am: [], options: [], min: 1, max: 5, page_number: 1, category: 'general' });
    setOptionInput('');
    setOptionInputAm('');
  }

  async function toggleQuestionActive(q) {
    try {
      const res = await fetch('/api/questions/' + q.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ is_active: !q.is_active })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Question update failed');
      await loadAll(false);
      showMessage(q.is_active ? 'Question disabled' : 'Question enabled', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  }

  async function deleteQuestion(q) {
    setDeleteModal({ isOpen: true, question: q });
  }

  async function confirmDeleteQuestion() {
    if (!deleteModal.question) return;
    try {
      const res = await fetch('/api/questions/' + deleteModal.question.id, {
        method: 'DELETE',
        headers: headers()
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Question delete failed');
      setDeleteModal({ isOpen: false, question: null });
      await loadAll(false);
      showMessage('Question deleted', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
      setDeleteModal({ isOpen: false, question: null });
    }
  }

  async function moveQuestion(questionId, direction) {
    const question = questions.find((x) => x.id === questionId);
    if (!question) return;
    
    const samePageQuestions = questions.filter((q) => (q.page_number || 1) === (question.page_number || 1));
    const idx = samePageQuestions.findIndex((x) => x.id === questionId);
    if (idx < 0) return;

    const next = [...samePageQuestions];
    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= next.length) return;

    const temp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = temp;

    const ids = next.map((q) => q.id);
    const res = await fetch('/api/questions/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ ids })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Reorder failed');

    await loadAll(false);
  }

  function getExportData(data) {
    return data.map((r) => {
      const qa = r.question_answers || {};
      const row = {
        'Submission ID': r.submission_id,
        'Submitted At': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '',
        'Visit ID': r.visit_id,
        'Patient Name': r.patient_name,
        'Doctors': r.doctor_names || '-'
      };
      
      questions.filter(q => q.category === 'doctor').forEach((q) => {
        const answers = [];
        const optionsObj = q.options || {};
        const optionsEn = Array.isArray(optionsObj) ? optionsObj : (optionsObj.en || []);
        const optionsAm = optionsObj.am || [];
        const matchKey = q.key || String(q.id);
        for (const key of Object.keys(qa)) {
          if (key.endsWith('_' + matchKey)) {
            const rawAnswer = qa[key];
            let displayAnswer = rawAnswer;
            if (q.type === 'text') {
              displayAnswer = rawAnswer;
            } else if (Array.isArray(rawAnswer)) {
              const translated = rawAnswer.map(ans => {
                const amIndex = optionsAm.indexOf(String(ans));
                return amIndex !== -1 && optionsEn[amIndex] ? optionsEn[amIndex] : ans;
              });
              displayAnswer = translated.join(', ');
            } else {
              const amIndex = optionsAm.indexOf(String(rawAnswer));
              if (amIndex !== -1 && optionsEn[amIndex]) {
                displayAnswer = optionsEn[amIndex];
              }
            }
            answers.push(displayAnswer);
          }
        }
        row[q.key || q.id] = formatAnswerValue(answers.length > 0 ? answers.join(', ') : '-');
      });
      
      questions.filter(q => q.category === 'general').forEach((q) => {
        const rawAnswer = qa[q.key];
        let displayAnswer = rawAnswer;
        if (q.type === 'text') {
          displayAnswer = rawAnswer;
        } else {
          const optionsObj = q.options || {};
          const optionsEn = Array.isArray(optionsObj) ? optionsObj : (optionsObj.en || []);
          const optionsAm = optionsObj.am || [];
          if (Array.isArray(rawAnswer)) {
            const translated = rawAnswer.map(ans => {
              const amIndex = optionsAm.indexOf(String(ans));
              return amIndex !== -1 && optionsEn[amIndex] ? optionsEn[amIndex] : ans;
            });
            displayAnswer = translated.join(', ');
          } else if (typeof rawAnswer === 'string') {
            const amIndex = optionsAm.indexOf(rawAnswer);
            if (amIndex !== -1 && optionsEn[amIndex]) {
              displayAnswer = optionsEn[amIndex];
            }
          }
        }
        row[q.key] = formatAnswerValue(displayAnswer);
      });
      return row;
    });
  }

  function exportToCSV(data) {
    const rows = getExportData(data);
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => {
        const val = String(r[h] || '').replace(/"/g, '""');
        return '"' + val + '"';
      }).join(','))
    ].join('\n');
    downloadFile(csv, 'responses.csv', 'text/csv');
  }

  function exportSelectedToCSV() {
    const selectedData = responses.filter((r) => selectedIds.has(r.submission_id));
    if (selectedData.length === 0) {
      showMessage('No responses selected', 'error');
      return;
    }
    const rows = getExportData(selectedData);
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => {
        const val = String(r[h] || '').replace(/"/g, '""');
        return '"' + val + '"';
      }).join(','))
    ].join('\n');
    downloadFile(csv, `responses_selected_${selectedIds.size}.csv`, 'text/csv');
    showMessage(`Downloaded ${selectedIds.size} responses as CSV`, 'success');
  }

  function exportSelectedToExcel() {
    const selectedData = responses.filter((r) => selectedIds.has(r.submission_id));
    if (selectedData.length === 0) {
      showMessage('No responses selected', 'error');
      return;
    }
    const rows = getExportData(selectedData);
    if (rows.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `responses_selected_${selectedIds.size}.xlsx`);
    showMessage(`Downloaded ${selectedIds.size} responses as Excel`, 'success');
  }

  function exportToExcel() {
    if (responses.length === 0) {
      showMessage('No responses to export', 'error');
      return;
    }
    const rows = getExportData(responses);
    if (rows.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, 'all_responses.xlsx');
    showMessage(`Downloaded ${responses.length} responses as Excel`, 'success');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportDoctorReportToExcel() {
    const rows = [];
    let idx = 1;
    for (const doctor of doctorReportData) {
      for (const qr of doctor.question_ratings) {
        rows.push({
          'No.': idx++,
          'Doctor Name': doctor.doctor_name,
          'Question Key': qr.question_key,
          'Average Score': qr.average.toFixed(1),
          'Total Average Rating': doctor.total_average.toFixed(1)
        });
      }
    }
    if (rows.length === 0) { showMessage('No data to export', 'error'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Doctor Report');
    XLSX.writeFile(wb, 'doctors_report.xlsx');
    showMessage('Exported to Excel', 'success');
  }

  function exportGeneralReportToExcel() {
    const rows = generalReportData.map((q, idx) => ({
      'No.': idx + 1,
      'Question Key': q.question_key,
      'Average Rating': q.average.toFixed(1)
    }));
    if (rows.length === 0) { showMessage('No data to export', 'error'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'General Report');
    XLSX.writeFile(wb, 'general_report.xlsx');
    showMessage('Exported to Excel', 'success');
  }

  function exportDoctorReportToCSV() {
    const rows = [];
    let idx = 1;
    for (const doctor of doctorReportData) {
      for (const qr of doctor.question_ratings) {
        rows.push({
          'No.': idx++,
          'Doctor Name': doctor.doctor_name,
          'Question Key': qr.question_key,
          'Average Score': qr.average.toFixed(1),
          'Total Average Rating': doctor.total_average.toFixed(1)
        });
      }
    }
    if (rows.length === 0) { showMessage('No data to export', 'error'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => '"' + String(r[h] || '').replace(/"/g, '""') + '"').join(','))].join('\n');
    downloadFile(csv, 'doctors_report.csv', 'text/csv');
    showMessage('Exported to CSV', 'success');
  }

  function exportGeneralReportToCSV() {
    const rows = generalReportData.map((q, idx) => ({
      'No.': idx + 1,
      'Question Key': q.question_key,
      'Average Rating': q.average.toFixed(1)
    }));
    if (rows.length === 0) { showMessage('No data to export', 'error'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => '"' + String(r[h] || '').replace(/"/g, '""') + '"').join(','))].join('\n');
    downloadFile(csv, 'general_report.csv', 'text/csv');
    showMessage('Exported to CSV', 'success');
  }

  async function exportDoctorReportToPDF() {
    try {
      const params = new URLSearchParams({ report_type: 'doctor' });
      if (reportFilters.doctor_id) params.set('doctor_id', reportFilters.doctor_id);
      if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
      if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);
      const res = await fetch('/api/reports/export-pdf?' + params.toString(), { headers: headers() });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'doctors_report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('Exported to PDF', 'success');
    } catch (err) { showMessage('PDF export failed: ' + err.message, 'error'); }
  }

  async function exportGeneralReportToPDF() {
    try {
      const params = new URLSearchParams({ report_type: 'general' });
      if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
      if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);
      const res = await fetch('/api/reports/export-pdf?' + params.toString(), { headers: headers() });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'general_report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('Exported to PDF', 'success');
    } catch (err) { showMessage('PDF export failed: ' + err.message, 'error'); }
  }

  function toggleSelectAll() {
    if (selectedIds.size === responses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(responses.map((r) => r.submission_id)));
    }
  }

  function toggleSelect(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function openDeleteModal() {
    if (selectedIds.size === 0) return;
    setResponseDeleteModal({ isOpen: true, ids: Array.from(selectedIds), count: selectedIds.size });
  }

  async function confirmDeleteResponses() {
    if (responseDeleteModal.ids.length === 0) return;
    try {
      const res = await fetch('/api/responses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ ids: responseDeleteModal.ids })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Delete failed');
      setResponseDeleteModal({ isOpen: false, ids: [], count: 0 });
      setSelectedIds(new Set());
      await fetchResponsesWithFilters(1, filters);
      showMessage('Deleted ' + data.deleted + ' response(s)', 'success');
    } catch (err) {
      showMessage('Delete failed: ' + err.message, 'error');
      setResponseDeleteModal({ isOpen: false, ids: [], count: 0 });
    }
  }

  function deleteSelected() {
    openDeleteModal();
  }

  function clearFilters() {
    setFilters({ search: '', date_from: '', date_to: '' });
    setSearchInput('');
    handleFilterChange({ search: '', date_from: '', date_to: '' });
  }

  const allSelected = responses.length > 0 && selectedIds.size === responses.length;
  const someSelected = selectedIds.size > 0;

  const questionTypeCards = [
    { id: 'stars', label: 'Stars', icon: '★' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'single_choice', label: 'Single', icon: '1' },
    { id: 'multi_choice', label: 'Multi', icon: '∞' },
    { id: 'number', label: 'Number', icon: '#' },
    { id: 'yes_no', label: 'Yes/No', icon: '?' }
  ];

  const isChoice = newQuestion.type === 'single_choice' || newQuestion.type === 'multi_choice' || newQuestion.type === 'yes_no';
  const isRanged = newQuestion.type === 'stars' || newQuestion.type === 'number';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'questions', label: 'Questions', icon: FileText },
    { id: 'responses', label: 'Responses', icon: MessageSquare },
    { id: 'doctor-ratings', label: 'Doctor Ratings', icon: Star },
    { id: 'doctors', label: 'Doctors', icon: Users },
    { id: 'users', label: 'User Management', icon: UserCog },
    { id: 'activity', label: 'Activity Log', icon: History },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet, subItems: [
      { id: 'doctor-report', label: "Doctor's Report" },
      { id: 'general-report', label: 'General Report' }
    ]}
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span>Feedback Admin</span>
              <p className="text-xs text-slate-400 font-normal">Patient Survey</p>
            </div>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <div key={item.id}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 font-semibold shadow-lg shadow-blue-500/30'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  </button>
                  {activeTab === item.id && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subItems.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setReportsTab(sub.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                            reportsTab === sub.id
                              ? 'bg-white/20 font-semibold text-white'
                              : 'hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          {sub.label}
                          {reportsTab === sub.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 font-semibold shadow-lg shadow-blue-500/30'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Data
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'reports' 
                ? (reportsTab === 'doctor-report' ? "Doctor's Report" : 'General Report') 
                : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className={`relative p-3 rounded-xl transition-all ${hasNewNotifications ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'}`}
              >
                <Bell className={`w-6 h-6 ${hasNewNotifications ? 'text-red-500' : 'text-gray-600'}`} />
                {hasNewNotifications && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="fixed inset-0 z-40" onClick={handleCloseNotifications}></div>
              )}
              {showNotifications && hasNewNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">New Responses</h3>
                      <p className="text-slate-400 text-sm">{notifications.length} new response{notifications.length > 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={handleCloseNotifications} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((r, idx) => (
                      <div 
                        key={r.submission_id} 
                        className={`p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all cursor-pointer ${idx === 0 ? 'bg-blue-50' : ''}`} 
                        onClick={() => { setActiveTab('responses'); handleCloseNotifications(); }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 truncate">{r.patient_name}</p>
                            <p className="text-sm text-gray-600 truncate font-medium">{r.doctor_names || 'No doctor assigned'}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(r.submitted_at).toLocaleString()}</p>
                          </div>
                          {idx === 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">NEW</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-gray-50 border-t border-gray-100">
                    <button 
                      onClick={() => { setActiveTab('responses'); handleCloseNotifications(); }}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
                    >
                      View All Responses
                    </button>
                  </div>
                </div>
              )}
              {showNotifications && !hasNewNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
                    <h3 className="font-bold text-white">Notifications</h3>
                    <button onClick={handleCloseNotifications} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No new notifications</p>
                    <p className="text-gray-400 text-sm mt-1">New responses will appear here</p>
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                {currentUser?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-800">{currentUser?.username || 'Admin'}</p>
                <p className="text-xs text-gray-500">{currentUser?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-red-500"
              title="Sign Out"
            >
              <Power className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-8">
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {message.type === 'success' && <Check className="w-5 h-5" />}
            {message.type === 'info' && <Activity className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                <p className="text-gray-500">Overview of your patient feedback system</p>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={dashboardDateFilter}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      handleDashboardDateFilterChange('custom');
                    } else {
                      handleDashboardDateFilterChange(e.target.value);
                    }
                  }}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                {dashboardDateFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dashboardDateRange.date_from}
                      onChange={(e) => { handleCustomDateChange('date_from', e.target.value); }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="date"
                      value={dashboardDateRange.date_to}
                      onChange={(e) => { handleCustomDateChange('date_to', e.target.value); }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => loadAll(false)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Total Submissions</p>
                <p className="text-4xl font-bold text-gray-800 mt-1">{analytics?.total_submissions || 0}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-600 rounded-full font-medium">Doctors</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">Doctors Rated</p>
                <p className="text-4xl font-bold text-gray-800 mt-1">{analytics?.doctor_averages?.length || 0}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-600 rounded-full font-medium">Questions</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">Survey Questions</p>
                <p className="text-4xl font-bold text-gray-800 mt-1">{questions.length}</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                    <Star className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-600 rounded-full font-medium">Avg</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">Average Rating</p>
                <p className="text-4xl font-bold text-gray-800 mt-1">
                  {analytics?.doctor_averages?.length > 0
                    ? (analytics.doctor_averages.reduce((sum, d) => sum + Number(d.avg_rating), 0) / analytics.doctor_averages.length).toFixed(1)
                    : '0.0'}
                </p>
              </div>
</div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  Doctor Performance
                </h3>
              </div>

              {analytics?.doctor_averages?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.doctor_averages.map((doctor, index) => {
                    const rating = Number(doctor.avg_rating || 0);
                    const percentage = (rating / 5) * 100;
                    const questionRatings = doctor.question_ratings || {};
                    const questionAnswers = doctor.question_answers || {};
                    const doctorQuestionsList = questions.filter(q => q.category === 'doctor');
                    const orderedKeys = doctorQuestionsList.map(q => q.key).filter(key => key && (questionRatings[key] !== undefined || questionAnswers[key] !== undefined));
                    const rank = index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                    
                    let badge = null;
                    if (rating >= 4.5) {
                      badge = { label: 'Top Performer', color: 'bg-gradient-to-r from-emerald-500 to-teal-500', text: 'text-white' };
                    } else if (rating >= 4.0) {
                      badge = { label: 'Excellent', color: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'text-white' };
                    } else if (rating < 3.0) {
                      badge = { label: 'Needs Improvement', color: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'text-white' };
                    }
                    
                    return (
                      <div key={doctor.doctor_id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {doctor.doctor_name.charAt(0)}
                              </div>
                              {rank <= 3 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs">
                                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800 text-sm">{doctor.doctor_name}</p>
                                {rank <= 3 && <span className="text-xs">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>}
                              </div>
                              <p className="text-xs text-gray-500">{(doctor.patient_count ?? doctor.rating_count) || 0} patients</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${getRatingBg(rating)}`}>
                              {rating.toFixed(1)}
                            </div>
                            {badge && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.text}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                          <div
                            className={`h-1.5 rounded-full ${
                              rating >= 4.5 ? 'bg-emerald-500' :
                              rating >= 3.5 ? 'bg-blue-500' :
                              rating >= 2.5 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: percentage > 0 ? `${percentage}%` : '0%' }}
                          />
                        </div>
                        
                        {orderedKeys.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            {orderedKeys.map((qKey) => {
                              const starRating = questionRatings[qKey];
                              const otherAnswer = questionAnswers[qKey];
                              
                              if (starRating !== undefined) {
                                return (
                                  <div key={qKey} className="flex items-center justify-between py-0.5">
                                    <span className="text-xs text-gray-600 truncate flex-1">{qKey}</span>
                                    <div className="flex items-center gap-1 ml-2">
                                      <StarRating value={starRating} size="xs" />
                                      <span className="text-xs font-medium text-gray-600">{starRating.toFixed(1)}</span>
                                    </div>
                                  </div>
                                );
                              }
                              
                              if (otherAnswer) {
                                const counts = otherAnswer.counts || {};
                                const percentages = otherAnswer.percentages || {};
                                const total = otherAnswer.total || 0;
                                const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                                
                                return (
                                  <div key={qKey} className="py-1">
                                    <div className="flex items-center justify-between py-0.5">
                                      <span className="text-xs text-gray-600 truncate flex-1">{qKey}</span>
                                    </div>
                                    <div className="space-y-0.5 ml-1">
                                      {entries.map(([answer, count]) => {
                                        const percent = percentages[answer] || 0;
                                        const isYes = answer.toLowerCase() === 'yes';
                                        return (
                                          <div key={answer} className="flex items-center justify-between">
                                            <span className={`text-xs font-medium ${isYes ? 'text-emerald-600' : 'text-red-600'}`}>{answer}</span>
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-gray-500">{count}</span>
                                              <span className="text-xs text-gray-400">({percent}%)</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                              
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No ratings yet</p>
                  <p className="text-sm text-gray-400">Complete surveys to see analytics</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Star className="w-4 h-4 text-white" />
                </div>
                General Questions - Average Rating
              </h3>
              
              {(analytics?.question_breakdown?.length > 0 || analytics?.yesno_breakdown?.length > 0) ? (
                <div className="space-y-6">
                  {(() => {
                    const generalQuestionsList = questions.filter(q => q.category === 'general');
                    const orderedGeneralKeys = generalQuestionsList.map(q => q.key);
                    const starMap = new Map((analytics?.star_rating_breakdown || []).map(q => [q.question_key, q]));
                    const yesNoMap = new Map((analytics?.yesno_breakdown || []).map(q => [q.question_key, q]));
                    const orderedItems = [];
                    for (const key of orderedGeneralKeys) {
                      if (starMap.has(key)) orderedItems.push({ type: 'star', data: starMap.get(key) });
                      if (yesNoMap.has(key)) orderedItems.push({ type: 'yesno', data: yesNoMap.get(key) });
                    }
                    return orderedItems.filter(item => item.data).map((item) => {
                      if (item.type === 'star') {
                        const q = item.data;
                        const avg = q.average || 0;
                        const percentage = (avg / 5) * 100;
                        let color = '#ef4444';
                        if (avg >= 4) color = '#10b981';
                        else if (avg >= 3) color = '#f59e0b';
                        return (
                          <div key={q.question_key}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-800">{q.question_key}</span>
                              <span className="font-bold text-lg" style={{ color }}>{avg.toFixed(1)} / 5</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: color }} />
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                              <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                            </div>
                          </div>
                        );
                      } else {
                        const yn = item.data;
                        return (
                          <div key={yn.question_key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-800">{yn.question_key}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                                  <span className="text-sm text-gray-700">Yes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-800">{yn.yes}</span>
                                  <span className="text-sm text-gray-500">({yn.yes_percent}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${yn.yes_percent}%` }} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                                  <span className="text-sm text-gray-700">No</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-800">{yn.no}</span>
                                  <span className="text-sm text-gray-500">({yn.no_percent}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${yn.no_percent}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No data yet</p>
                  <p className="text-sm text-gray-400">Complete surveys to see analytics</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Question Manager</h2>
              <p className="text-gray-500">Create and manage survey questions</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${editingQuestion ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    {editingQuestion ? <Edit3 className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                  </div>
                  {editingQuestion ? 'Edit Question' : 'Create New Question'}
                </h3>

                <form onSubmit={createQuestion} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                          Question Label (English) <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={newQuestion.label_en || ''}
                        onChange={(e) => setNewQuestion((p) => ({ ...p, label_en: e.target.value }))}
                        placeholder={newQuestion.category === 'doctor' ? "e.g., How would you rate {doctor_name}'s professionalism?" : "e.g., How was your experience?"}
                        className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                          Question Label (አማርኛ) <span className="text-xs text-gray-400">(Amharic)</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={newQuestion.label_am || ''}
                        onChange={(e) => setNewQuestion((p) => ({ ...p, label_am: e.target.value }))}
                        placeholder="e.g., የእይታዎን እንዴት ደረጃ ይሰጣሉ?"
                        className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-200 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Key (optional)</label>
                    <input
                      type="text"
                      value={newQuestion.key}
                      onChange={(e) => setNewQuestion((p) => ({ ...p, key: e.target.value }))}
                      placeholder="e.g., experience_rating"
                      className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Category</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewQuestion((p) => ({ ...p, category: 'general' }))}
                        className={`p-3 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                          newQuestion.category === 'general'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-100'
                        }`}
                      >
                        <span className="text-lg">🏥</span>
                        <span className="text-xs">General</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewQuestion((p) => ({ ...p, category: 'doctor' }))}
                        className={`p-3 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                          newQuestion.category === 'doctor'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-100'
                        }`}
                      >
                        <span className="text-lg">👨‍⚕️</span>
                        <span className="text-xs">Doctor</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {newQuestion.category === 'doctor' && 'Use {doctor_name} in label to inject the doctor\'s name dynamically'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {questionTypeCards.map((typeItem) => (
                        <button
                          key={typeItem.id}
                          type="button"
                          onClick={() => setType(typeItem.id)}
                          className={`p-3 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                            newQuestion.type === typeItem.id
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-100'
                          }`}
                        >
                          <span className="text-lg">{typeItem.icon}</span>
                          <span className="text-xs">{typeItem.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="required"
                      checked={newQuestion.required}
                      onChange={(e) => setNewQuestion((p) => ({ ...p, required: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="required" className="text-sm text-gray-700">Required question</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Survey Page Number</label>
                    <input
                      type="number"
                      min="1"
                      value={newQuestion.page_number}
                      onChange={(e) => setNewQuestion((p) => ({ ...p, page_number: e.target.value === '' ? 1 : Number(e.target.value) }))}
                      className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Questions will be grouped by page number in the survey</p>
                  </div>

                  {isChoice && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Options (English)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={optionInput}
                          onChange={(e) => setOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addOption(); }
                          }}
                          placeholder="Add option..."
                          className="flex-1 p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200"
                        />
                        <button type="button" onClick={addOption} className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(newQuestion.options_en) ? newQuestion.options_en : newQuestion.options || []).map((opt) => (
                          <button key={opt} type="button" onClick={() => removeOption(opt)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1.5 hover:bg-blue-100 transition-colors">
                            {opt} <X className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                      <label className="block text-sm font-medium text-gray-700 mt-4">Options (አማርኛ)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={optionInputAm}
                          onChange={(e) => setOptionInputAm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); addOptionAm(); }
                          }}
                          placeholder="Add Amharic option..."
                          className="flex-1 p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-200"
                        />
                        <button type="button" onClick={addOptionAm} className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(newQuestion.options_am) ? newQuestion.options_am : []).map((opt) => (
                          <button key={opt} type="button" onClick={() => removeOptionAm(opt)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1.5 hover:bg-emerald-100 transition-colors">
                            {opt} <X className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isRanged && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Min Value</label>
                        <input type="number" value={newQuestion.min} onChange={(e) => setNewQuestion((p) => ({ ...p, min: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Value</label>
                        <input type="number" value={newQuestion.max} onChange={(e) => setNewQuestion((p) => ({ ...p, max: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {editingQuestion && (
                      <button type="button" onClick={cancelEdit} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                        <X className="w-5 h-5" /> Cancel
                      </button>
                    )}
                    <button type="submit" className={`flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200`}>
                      {editingQuestion ? <><Check className="w-5 h-5" /> Update Question</> : <><Plus className="w-5 h-5" /> Create Question</>}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    Survey Questions ({questions.length})
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuestionFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        questionFilter === 'all'
                          ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All ({questions.length})
                    </button>
                    <button
                      onClick={() => setQuestionFilter('doctor')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        questionFilter === 'doctor'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Doctor ({questions.filter(q => q.category === 'doctor').length})
                    </button>
                    <button
                      onClick={() => setQuestionFilter('general')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        questionFilter === 'general'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      General ({questions.filter(q => q.category === 'general').length})
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {questions
                    .filter(q => questionFilter === 'all' || q.category === questionFilter)
                    .sort((a, b) => (a.category === 'doctor' ? 0 : 1) - (b.category === 'doctor' ? 0 : 1))
                    .map((q, idx) => {
                      const labelObj = q.label || {};
                      const optionsObj = q.options || {};
                      const labelEn = typeof labelObj === 'object' ? labelObj.en || labelObj : labelObj;
                      const labelAm = typeof labelObj === 'object' ? labelObj.am || '' : '';
                      const optionsEn = Array.isArray(optionsObj) ? optionsObj : (optionsObj.en || []);
                      const optionsAm = optionsObj.am || [];
                      return (
                    <div key={q.id} className={`rounded-2xl p-4 border-2 transition-all ${q.is_active ? 'bg-gray-50 border-gray-200 hover:border-blue-200' : 'bg-gray-100 border-gray-300 opacity-70'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-500">#{idx + 1}</span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${q.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {q.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">{q.type}</span>
                            {q.required && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">Required</span>}
                          </div>
                          <p className="font-semibold text-gray-800">{labelEn}</p>
                          {labelAm && <p className="text-sm text-emerald-600 mt-1 font-medium">{labelAm}</p>}
                          <p className="text-sm text-gray-500 mt-1">Key: {q.key}</p>
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold mt-2 ${
                            q.category === 'doctor' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {q.category === 'doctor' ? '👨‍⚕️ Doctor' : '🏥 General'}
                          </span>
                          {optionsEn.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-1.5">
                                {optionsEn.map((opt, i) => (<span key={opt} className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">{opt}</span>))}
                              </div>
                              {optionsAm.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {optionsAm.map((opt, i) => (<span key={opt} className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">{opt}</span>))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button onClick={() => moveQuestion(q.id, -1)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors" title="Move"><ArrowUpDown className="w-4 h-4 text-gray-600" /></button>
                          <button onClick={() => editQuestion(q)} className="p-2 hover:bg-blue-100 rounded-xl transition-colors text-blue-600" title="Edit"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => toggleQuestionActive(q)} className={`p-2 rounded-xl transition-colors ${q.is_active ? 'hover:bg-red-100 text-red-600' : 'hover:bg-emerald-100 text-emerald-600'}`} title={q.is_active ? 'Disable' : 'Enable'}>
                            {q.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteQuestion(q)} className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                    );
                    })}
                  {questions.filter(q => questionFilter === 'all' || q.category === questionFilter).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No {questionFilter === 'all' ? '' : questionFilter} questions found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'responses' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Responses</h2>
                <p className="text-gray-500">View and manage patient feedback submissions</p>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setDownloadDropdown(!downloadDropdown)} 
                  disabled={responses.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                >
                  <Download className="w-5 h-5" /> Export <ChevronDown className="w-4 h-4" />
                </button>
                {downloadDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <button 
                      onClick={() => { exportToCSV(responses); setDownloadDropdown(false); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
                    >
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Download as CSV
                    </button>
                    <button 
                      onClick={() => { exportToExcel(); setDownloadDropdown(false); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
                    >
                      <FileSpreadsheet className="w-5 h-5 text-green-500" /> Download as Excel
                    </button>
                  </div>
                )}
              </div>
              {downloadDropdown && <div className="fixed inset-0 z-40" onClick={() => setDownloadDropdown(false)}></div>}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px] max-w-[400px]">
                    <div className="relative flex">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" placeholder="Search patient name or doctor name..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { handleFilterChange({ ...filters, search: searchInput }); } }} className="w-full pl-10 pr-14 py-2.5 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200 text-sm transition-all" />
                      <button onClick={() => handleFilterChange({ ...filters, search: searchInput })} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
                        Search
                      </button>
                    </div>
                  </div>
                  <input type="date" value={filters.date_from} onChange={(e) => handleFilterChange({ ...filters, date_from: e.target.value })} className="px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                  <input type="date" value={filters.date_to} onChange={(e) => handleFilterChange({ ...filters, date_to: e.target.value })} className="px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" />
                  <button onClick={clearFilters} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium flex items-center gap-2 text-sm transition-colors">
                    <Filter className="w-4 h-4" /> Clear
                  </button>
                </div>
              </div>

              {someSelected && (
                <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <span className="font-semibold text-blue-700 flex items-center gap-2"><Check className="w-4 h-4" /> {selectedIds.size} responses selected</span>
                  <div className="flex items-center gap-3">
                    <button onClick={toggleSelectAll} className="px-3 py-1.5 text-blue-600 hover:text-blue-800 font-medium text-sm">{allSelected ? 'Deselect All' : 'Select All'}</button>
                    <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-gray-600 hover:text-gray-800 font-medium text-sm">Clear</button>
                    <div className="relative group">
                      <button className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center gap-1.5 text-sm">
                        <Download className="w-4 h-4" /> Download <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <button onClick={() => exportSelectedToCSV()} className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Download CSV
                        </button>
                        <button onClick={() => exportSelectedToExcel()} className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 border-t border-gray-100">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Download Excel
                        </button>
                      </div>
                    </div>
                    <button onClick={deleteSelected} className="px-4 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex items-center gap-1.5 text-sm">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left w-12">
                        <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }} onChange={toggleSelectAll} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Visit</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Doctors</th>
                      {questions
                        .filter(q => q.category === 'doctor')
                        .map((q) => (<th key={q.id} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[150px]">{q.key}</th>))}
                      {questions
                        .filter(q => q.category === 'general')
                        .map((q) => (<th key={q.id} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[150px]">{q.key}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingResponses ? (
                      <tr><td colSpan={5 + questions.length} className="px-4 py-16 text-center"><div className="flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div></div></td></tr>
                    ) : responses.length === 0 ? (
                      <tr><td colSpan={5 + questions.length} className="px-4 py-12 text-center text-gray-500">No responses found</td></tr>
                    ) : (
                      responses.map((r) => (
                        <tr key={r.submission_id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedIds.has(r.submission_id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(r.submission_id)} onChange={() => toggleSelect(r.submission_id)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" /></td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">{r.visit_id}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{r.patient_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDoctorNames(r.question_answers, r.doctor_names)}</td>
                          {questions
                            .filter(q => q.category === 'doctor')
                            .map((q) => {
                              const answers = [];
                              const qa = r.question_answers || {};
                              const optionsObj = q.options || {};
                              const optionsEn = Array.isArray(optionsObj) ? optionsObj : (optionsObj.en || []);
                              const optionsAm = optionsObj.am || [];
                              const matchKey = q.key || String(q.id);
                              for (const key of Object.keys(qa)) {
                                if (key.endsWith('_' + matchKey)) {
                                  const rawAnswer = qa[key];
                                  let displayAnswer = rawAnswer;
                                  if (q.type === 'text') {
                                    displayAnswer = rawAnswer;
                                  } else if (Array.isArray(rawAnswer)) {
                                    const translated = rawAnswer.map(ans => {
                                      const amIndex = optionsAm.indexOf(String(ans));
                                      return amIndex !== -1 && optionsEn[amIndex] ? optionsEn[amIndex] : ans;
                                    });
                                    displayAnswer = translated.join(', ');
                                  } else {
                                    const amIndex = optionsAm.indexOf(String(rawAnswer));
                                    if (amIndex !== -1 && optionsEn[amIndex]) {
                                      displayAnswer = optionsEn[amIndex];
                                    }
                                  }
                                  answers.push(displayAnswer);
                                }
                              }
                              return (
                                <td key={q.id} className="px-4 py-3 text-sm text-gray-700 whitespace-normal max-w-[200px]">
                                  <span className="line-clamp-2">{formatAnswerValue(answers.length > 0 ? answers.join(', ') : '-')}</span>
                                </td>
                              );
                            })}
                          {questions
                            .filter(q => q.category === 'general')
                            .map((q) => {
                              const rawAnswer = (r.question_answers || {})[q.key];
                              let displayAnswer = rawAnswer;
                              if (q.type === 'text') {
                                displayAnswer = rawAnswer;
                              } else {
                                const optionsObj = q.options || {};
                                const optionsEn = Array.isArray(optionsObj) ? optionsObj : (optionsObj.en || []);
                                const optionsAm = optionsObj.am || [];
                                
                                if (Array.isArray(rawAnswer)) {
                                  const translated = rawAnswer.map(ans => {
                                    const amIndex = optionsAm.indexOf(String(ans));
                                    return amIndex !== -1 && optionsEn[amIndex] ? optionsEn[amIndex] : ans;
                                  });
                                  displayAnswer = translated.join(', ');
                                } else if (typeof rawAnswer === 'string') {
                                  const amIndex = optionsAm.indexOf(rawAnswer);
                                  if (amIndex !== -1 && optionsEn[amIndex]) {
                                    displayAnswer = optionsEn[amIndex];
                                  }
                                }
                              }
                              return (<td key={q.id} className="px-4 py-3 text-sm text-gray-700 whitespace-normal max-w-[200px]"><span className="line-clamp-2">{formatAnswerValue(displayAnswer)}</span></td>);
                            })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <p className="text-sm text-gray-500">Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
                <div className="flex items-center gap-2">
                  <select value={pagination.limit} onChange={(e) => { const newLimit = Number(e.target.value); setPageLimit(newLimit); setPagination((p) => ({ ...p, limit: newLimit, page: 1 })); fetchResponsesWithFilters(1, filters, newLimit); }} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                  <button onClick={() => changePage(pagination.page - 1)} disabled={pagination.page <= 1} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm">{pagination.page} / {pagination.total_pages || 1}</span>
                  <button onClick={() => changePage(pagination.page + 1)} disabled={pagination.page >= pagination.total_pages} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <p className="text-gray-500">Manage admin users and permissions</p>
              </div>
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200"
              >
                <Plus className="w-5 h-5" /> Add New User
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Created At</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">{user.username[0].toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-gray-800">{user.username}</span>
                          {user.id === currentUser?.id && <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">You</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditUser(user)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => confirmDeleteUser(user)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editUserModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditUserModal({ isOpen: false, user: null })}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-modal shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Edit User</h3>
                <button onClick={() => setEditUserModal({ isOpen: false, user: null })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={editUserData.username}
                    onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={editUserData.password}
                    onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="Leave empty to keep current password"
                    minLength={6}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Active Status</label>
                  <button
                    type="button"
                    onClick={() => setEditUserData({ ...editUserData, is_active: !editUserData.is_active })}
                    className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors"
                  >
                    {editUserData.is_active ? (
                      <ToggleRight className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-300" />
                    )}
                  </button>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditUserModal({ isOpen: false, user: null })}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={userLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                  >
                    {userLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {reportsTab === 'doctor-report' ? "Doctor's Report" : 'General Report'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {reportsTab === 'doctor-report' 
                    ? 'Doctor-specific survey ratings and averages'
                    : 'Hospital-wide survey ratings and averages'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                {reportsTab === 'doctor-report' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Doctor:</label>
                    <select value={reportFilters.doctor_id} onChange={(e) => setReportFilters({ ...reportFilters, doctor_id: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">All Doctors</option>
                      {reportDoctors.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">From:</label>
                  <input type="date" value={reportFilters.date_from} onChange={(e) => setReportFilters({ ...reportFilters, date_from: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-600">To:</label>
                  <input type="date" value={reportFilters.date_to} onChange={(e) => setReportFilters({ ...reportFilters, date_to: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={() => reportsTab === 'doctor-report' ? fetchDoctorReport() : fetchGeneralReport()} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">
                  Apply Filters
                </button>
                <div className="relative ml-auto">
                  <button onClick={() => setDownloadDropdown(!downloadDropdown)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
                    <Download className="w-4 h-4" />Download<ChevronDown className="w-4 h-4" />
                  </button>
                  {downloadDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                      <button onClick={() => { setDownloadDropdown(false); reportsTab === 'doctor-report' ? exportDoctorReportToExcel() : exportGeneralReportToExcel(); }} className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600" />Excel (.xlsx)</button>
                      <button onClick={() => { setDownloadDropdown(false); reportsTab === 'doctor-report' ? exportDoctorReportToCSV() : exportGeneralReportToCSV(); }} className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-blue-600" />CSV</button>
                      <button onClick={() => { setDownloadDropdown(false); reportsTab === 'doctor-report' ? exportDoctorReportToPDF() : exportGeneralReportToPDF(); }} className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"><FileText className="w-4 h-4 text-red-600" />PDF</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {reportsLoading ? (
                <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="text-gray-500 mt-2">Loading...</p></div>
              ) : reportsTab === 'doctor-report' ? (
                doctorReportData.length === 0 ? <div className="p-8 text-center text-gray-500">No data available</div> :
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No.</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Doctor Name</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Question Key</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Average Score</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Average Rating</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => { let idx = 1; return doctorReportData.map(doctor => doctor.question_ratings.map(qr => (<tr key={doctor.doctor_id + '-' + qr.question_key} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm text-gray-800">{idx++}</td><td className="px-4 py-3 text-sm text-gray-800 font-medium">{doctor.doctor_name}</td><td className="px-4 py-3 text-sm text-gray-600">{qr.question_key}</td><td className="px-4 py-3 text-sm text-gray-800">{qr.average.toFixed(1)}</td><td className="px-4 py-3 text-sm text-gray-800 font-medium">{doctor.total_average.toFixed(1)}</td></tr>))); })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                generalReportData.length === 0 ? <div className="p-8 text-center text-gray-500">No data available</div> :
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No.</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Question Key</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Average Rating</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {generalReportData.map((q, idx) => (<tr key={q.question_key} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm text-gray-800">{idx + 1}</td><td className="px-4 py-3 text-sm text-gray-800 font-medium">{q.question_key}</td><td className="px-4 py-3 text-sm text-gray-800">{q.average.toFixed(1)}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Activity Log</h2>
                <p className="text-gray-500">Track all admin actions and changes</p>
              </div>
              <button
                onClick={() => fetchActivityLogs(activityPagination.page, activityPagination.limit)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Action</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Details</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">{log.username?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <span className="font-medium text-gray-800">{log.username || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            log.action.includes('create') ? 'bg-emerald-100 text-emerald-700' :
                            log.action.includes('update') ? 'bg-blue-100 text-blue-700' :
                            log.action.includes('delete') ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No activity logs yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {activityPagination.total > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {((activityPagination.page - 1) * activityPagination.limit) + 1} to {Math.min(activityPagination.page * activityPagination.limit, activityPagination.total)} of {activityPagination.total} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={activityPagination.limit}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        fetchActivityLogs(1, newLimit);
                      }}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                    <button
                      onClick={() => changeActivityPage(activityPagination.page - 1)}
                      disabled={activityPagination.page <= 1}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: activityPagination.total_pages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => changeActivityPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            page === activityPagination.page
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => changeActivityPage(activityPagination.page + 1)}
                      disabled={activityPagination.page >= activityPagination.total_pages}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'doctor-ratings' && (
          <DoctorRatingsPage showMessage={showMessage} />
        )}

        {activeTab === 'doctors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Doctors</h2>
                <p className="text-gray-500">Manage doctors who can be selected by patients</p>
              </div>
              <button
                onClick={() => {
                  setDoctorForm({ name: '', department: '', email: '' });
                  setShowDoctorModal(true);
                }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Doctor
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <form onSubmit={handleDoctorsSearch} className="flex items-center gap-3">
                  <div className="w-64 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name or ID..."
                      value={doctorsSearchInput}
                      onChange={(e) => setDoctorsSearchInput(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm flex items-center gap-2 text-sm"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                  {doctorsSearch && (
                    <button
                      type="button"
                      onClick={clearDoctorsSearch}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2 text-sm"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </form>
              </div>

              {doctors.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {doctorsSearch ? 'No Doctors Found' : 'No Doctors Yet'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {doctorsSearch ? 'Try a different search term' : 'Add doctors so patients can select them in the survey'}
                  </p>
                  {doctorsSearch ? (
                    <button
                      onClick={clearDoctorsSearch}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowDoctorModal(true)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
                    >
                      Add Your First Doctor
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-6 py-4 font-semibold text-gray-700">Name</th>
                          <th className="text-left px-6 py-4 font-semibold text-gray-700">Department</th>
                          <th className="text-left px-6 py-4 font-semibold text-gray-700">Email</th>
                          <th className="text-left px-6 py-4 font-semibold text-gray-700">Status</th>
                          <th className="text-right px-6 py-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {doctors.map((doctor) => (
                          <tr key={doctor.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {doctor.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{doctor.name}</p>
                                  <p className="text-xs text-gray-400 font-mono">{doctor.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{doctor.department || '-'}</td>
                            <td className="px-6 py-4">
                              {doctor.email ? (
                                <a href={'mailto:' + doctor.email} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  {doctor.email}
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                doctor.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {doctor.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => {
                                  setDoctorForm({ name: doctor.name, department: doctor.department || '', email: doctor.email || '' });
                                  setEditingDoctor(doctor);
                                }}
                                className="text-blue-600 hover:text-blue-800 mr-4"
                              >
                                <Edit3 className="w-5 h-5 inline" />
                              </button>
                              <button
                                onClick={() => setDeleteDoctorModal({ isOpen: true, doctor })}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-5 h-5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {doctorsPagination.total > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                      <p className="text-sm text-gray-500">
                        Showing {Math.min((doctorsPagination.page - 1) * doctorsPagination.limit + 1, doctorsPagination.total)} - {Math.min(doctorsPagination.page * doctorsPagination.limit, doctorsPagination.total)} of {doctorsPagination.total} doctors
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          value={doctorsPagination.limit}
                          onChange={(e) => {
                            const newLimit = Number(e.target.value);
                            setDoctorsPagination(p => ({ ...p, limit: newLimit, page: 1 }));
                            fetchDoctorsWithLimit(1, doctorsSearch, newLimit);
                          }}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                          <option value={50}>50 per page</option>
                        </select>
                        <button
                          onClick={() => changeDoctorsPage(doctorsPagination.page - 1)}
                          disabled={doctorsPagination.page <= 1}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: doctorsPagination.total_pages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => changeDoctorsPage(page)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                                page === doctorsPagination.page
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => changeDoctorsPage(doctorsPagination.page + 1)}
                          disabled={doctorsPagination.page >= doctorsPagination.total_pages}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-modal shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Add New User</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="Enter password (min 6 characters)"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={userLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                  >
                    {userLoading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </main>
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, question: null })}
        onConfirm={confirmDeleteQuestion}
        title="Delete Question"
        message={`Are you sure you want to delete "${deleteModal.question?.label}"? This action cannot be undone.`}
        type="danger"
      />
      <DeleteModal
        isOpen={responseDeleteModal.isOpen}
        onClose={() => setResponseDeleteModal({ isOpen: false, ids: [], count: 0 })}
        onConfirm={confirmDeleteResponses}
        title="Delete Responses"
        message={`Are you sure you want to delete ${responseDeleteModal.count} response(s)? This action cannot be undone.`}
        type="danger"
      />
      {userDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setUserDeleteModal({ isOpen: false, user: null })}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-modal shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete User</h3>
              <p className="text-gray-500 mb-6">Are you sure you want to delete "{userDeleteModal.user?.username}"? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setUserDeleteModal({ isOpen: false, user: null })}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteUser(userDeleteModal.user.id)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDoctorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Add Doctor</h3>
            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200"
                  placeholder="Dr. John Smith"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={doctorForm.department}
                  onChange={(e) => setDoctorForm({ ...doctorForm, department: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200"
                  placeholder="General Medicine"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200"
                  placeholder="doctor@hospital.com"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={doctorLoading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                >
                  {doctorLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Edit Doctor</h3>
            <form onSubmit={handleUpdateDoctor} className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={doctorForm.department}
                  onChange={(e) => setDoctorForm({ ...doctorForm, department: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-200"
                  placeholder="doctor@hospital.com"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={doctorLoading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                >
                  {doctorLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteDoctorModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Doctor</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteDoctorModal.doctor?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteDoctorModal({ isOpen: false, doctor: null })}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDoctor}
                className="flex-1 bg-red-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorRatingsPage({ showMessage }) {
  const [doctorRatings, setDoctorRatings] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [sendingEmail, setSendingEmail] = React.useState(null);
  const [searchInput, setSearchInput] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [dateTo, setDateTo] = React.useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  });
  const [emailModal, setEmailModal] = React.useState({ isOpen: false, doctor: null });
  const [emailForm, setEmailForm] = React.useState({ email: '' });
  const authToken = localStorage.getItem('admin_session_token');

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function parseInputDate(str) {
    const parts = str.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return str;
  }

  function headers() {
    return authToken ? { 'x-session-token': authToken } : {};
  }

  async function fetchRatings(doctorName, fromDate, toDate) {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (doctorName) params.set('doctor_name', doctorName);
      if (fromDate) params.set('date_from', fromDate);
      if (toDate) params.set('date_to', toDate);

      const res = await fetch('/api/doctor-ratings?' + params.toString(), { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDoctorRatings(data.ratings || []);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchRatings(searchInput, dateFrom, dateTo);
  }

  function handleClear() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setSearchInput('');
    setDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    setDateTo(`${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`);
    setDoctorRatings([]);
    setHasSearched(false);
  }

  function getRatingBg(rating) {
    if (rating >= 4.5) return 'bg-emerald-100 text-emerald-700';
    if (rating >= 3.5) return 'bg-blue-100 text-blue-700';
    if (rating >= 2.5) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  async function openEmailModal(doctor) {
    setEmailForm({ email: doctor.email || '' });
    setEmailModal({ isOpen: true, doctor });
  }

  async function handleSendToAll() {
    const doctorsWithEmail = doctorRatings.filter(d => d.email);
    const doctorsWithoutEmail = doctorRatings.filter(d => !d.email);
    
    if (doctorsWithEmail.length === 0) {
      showMessage('No doctors have email addresses configured', 'error');
      return;
    }

    if (doctorsWithoutEmail.length > 0) {
      showMessage(`${doctorsWithoutEmail.length} doctor(s) skipped (no email): ${doctorsWithoutEmail.map(d => d.doctor_name).join(', ')}`, 'info');
    }

    setSendingEmail('all');
    try {
      const res = await fetch('/api/doctor-ratings/send-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          ratings: doctorsWithEmail,
          date_from: dateFrom,
          date_to: dateTo
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showMessage(data.message || `Sent ${doctorsWithEmail.length} emails successfully!`, 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setSendingEmail(null);
    }
  }

  async function handleSendEmail(e) {
    e.preventDefault();
    if (!emailForm.email) {
      showMessage('Email is required', 'error');
      return;
    }

    setSendingEmail(emailModal.doctor.doctor_id);
    try {
      const res = await fetch('/api/doctor-ratings/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          ...emailModal.doctor,
          email: emailForm.email,
          date_from: dateFrom,
          date_to: dateTo
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showMessage('Email sent successfully!', 'success');
      setEmailModal({ isOpen: false, doctor: null });
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setSendingEmail(null);
    }
  }

  function getStarColor(rating) {
    if (rating >= 4.5) return 'text-emerald-500';
    if (rating >= 3.5) return 'text-blue-500';
    if (rating >= 2.5) return 'text-amber-500';
    if (rating >= 1.5) return 'text-orange-500';
    return 'text-red-500';
  }

  function renderStars(rating, size = 'w-5 h-5') {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${size} ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Doctor Ratings Report</h2>
        <p className="text-gray-500">Search for a doctor to view their ratings</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-600 mb-1">Doctor Name / ID</label>
            <input
              type="text"
              placeholder="e.g., Dr Dawit or D0001..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
          >
            <Search className="w-5 h-5 inline mr-2" />
            Search
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Clear
          </button>
        </form>
      </div>

      {!hasSearched && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Search for a doctor</p>
          <p className="text-gray-400 text-sm mt-2">Enter a doctor name or date range and click Search</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {!loading && hasSearched && doctorRatings.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No ratings found</p>
          <p className="text-gray-400 text-sm mt-2">Try a different doctor name or date range</p>
        </div>
      )}

      {!loading && doctorRatings.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5">
                  <span className="text-white font-bold">{doctorRatings.length}</span>
                  <span className="text-emerald-100 ml-1">doctors found</span>
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-1.5">
                  <span className="text-white font-bold">{doctorRatings.filter(d => d.email).length}</span>
                  <span className="text-emerald-100 ml-1">with email</span>
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-1.5">
                  <span className="text-white font-bold">{doctorRatings.filter(d => !d.email).length}</span>
                  <span className="text-emerald-100 ml-1">no email</span>
                </div>
              </div>
              <button
                onClick={handleSendToAll}
                disabled={sendingEmail === 'all' || doctorRatings.filter(d => d.email).length === 0}
                className="px-6 py-2.5 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sendingEmail === 'all' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send to All ({doctorRatings.filter(d => d.email).length})
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-8">
          {doctorRatings.map((doctor) => {
            const rating = Number(doctor.average_rating || 0);
            const totalPatients = doctor.total_patients || 0;
            const questionRatings = doctor.question_ratings || [];
            
            const getRatingStatus = () => {
              if (rating >= 4.5) return { text: 'Excellent', label: 'Outstanding performance', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
              if (rating >= 4.0) return { text: 'Very Good', label: 'Strong performance', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
              if (rating >= 3.5) return { text: 'Good', label: 'Good performance', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
              if (rating >= 3.0) return { text: 'Average', label: 'Moderate performance', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
              if (rating >= 2.0) return { text: 'Below Average', label: 'Needs improvement', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
              return { text: 'Poor', label: 'Requires urgent attention', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
            };
            
            const status = getRatingStatus();
            
            return (
              <div key={doctor.doctor_id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Patient Feedback Report</h2>
                      <p className="text-blue-100 mt-1">Confidential - For Doctor's Review</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-100">Report Period</p>
                      <p className="font-semibold">{dateFrom ? formatDisplayDate(dateFrom) : 'All Time'} - {dateTo ? formatDisplayDate(dateTo) : 'Present'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Doctor Info */}
                <div className="px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                      {doctor.doctor_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800">{doctor.doctor_name}</h3>
                      <p className="text-gray-500">Doctor ID: {doctor.doctor_id} | Department: {doctor.department || 'General'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Summary Box */}
                <div className="px-8 py-6 bg-gray-50">
                  <p className="text-gray-600 leading-relaxed">
                    Dear <span className="font-semibold text-gray-800">{doctor.doctor_name}</span>,
                  </p>
                  <p className="text-gray-600 leading-relaxed mt-3">
                    We are pleased to present your patient feedback report for the period of <span className="font-semibold">{dateFrom ? formatDisplayDate(dateFrom) : 'all available time'}</span> to <span className="font-semibold">{dateTo ? formatDisplayDate(dateTo) : 'present'}</span>. 
                    This report summarizes the feedback collected from <span className="font-semibold">{totalPatients} patient{totalPatients !== 1 ? 's' : ''}</span> who completed our patient satisfaction survey during their visit.
                  </p>
                </div>
                
                {/* Main Rating */}
                <div className="px-8 py-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-gray-500 text-sm uppercase tracking-wide">Overall Rating</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-5xl font-bold text-gray-800">{rating.toFixed(1)}</span>
                        <span className="text-xl text-gray-400">/ 5.0</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <StarRating value={rating} size="md" />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Based on {totalPatients} patient{totalPatients !== 1 ? 's' : ''}</p>
                    </div>
                    <div className={`px-6 py-4 rounded-xl border-2 ${status.bg}`}>
                      <p className={`text-xl font-bold ${status.color}`}>{status.text}</p>
                      <p className="text-sm text-gray-600 mt-1">{status.label}</p>
                    </div>
                  </div>
                  
                  {/* Rating Scale Legend */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Rating Scale:</p>
                    <div className="grid grid-cols-5 gap-2 text-xs text-gray-600">
                      <div className="text-center"><span className="font-bold">5</span> = Excellent</div>
                      <div className="text-center"><span className="font-bold">4</span> = Very Good</div>
                      <div className="text-center"><span className="font-bold">3</span> = Average</div>
                      <div className="text-center"><span className="font-bold">2</span> = Not Good</div>
                      <div className="text-center"><span className="font-bold">1</span> = Very Bad</div>
                    </div>
                  </div>
                  
                  {/* Question Ratings */}
                  {questionRatings.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-4">Detailed Ratings by Category</h4>
                      <div className="space-y-4">
                        {questionRatings.map((qr, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 text-lg">{qr.question_key}</p>
                                {qr.type === 'yes_no' ? (
                                  <div className="flex gap-4 mt-2">
                                    <span className="text-sm text-emerald-600 font-medium">Yes: {qr.yes_count}</span>
                                    <span className="text-sm text-red-600 font-medium">No: {qr.no_count}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 mt-1">
                                    <StarRating value={qr.average} size="sm" />
                                    <span className="text-sm text-gray-500">({qr.average.toFixed(1)} / 5.0)</span>
                                  </div>
                                )}
                                <p className="text-sm text-gray-500 mt-1">{qr.count} patient{qr.count !== 1 ? 's' : ''} rated this aspect</p>
                              </div>
                              {qr.type === 'yes_no' ? (
                                <div className="text-right">
                                  <span className="text-3xl font-bold text-gray-800">{qr.yes_count}</span>
                                  <p className="text-xs text-gray-500">Yes answers</p>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-gray-800">{qr.average.toFixed(1)}</span>
                                    <div className="flex flex-col items-center">
                                      <StarRating value={qr.average} size="sm" />
                                      <span className="text-xs text-gray-500 mt-1">out of 5</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {qr.type !== 'yes_no' && (
                              <div className="mt-3 w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full ${
                                    qr.average >= 4.5 ? 'bg-emerald-500' :
                                    qr.average >= 4.0 ? 'bg-emerald-400' :
                                    qr.average >= 3.5 ? 'bg-blue-500' :
                                    qr.average >= 3.0 ? 'bg-blue-400' :
                                    qr.average >= 2.0 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${(qr.average / 5) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Feedback */}
                <div className="px-8 py-6 bg-blue-50 border-t border-blue-100">
                  <h4 className="font-bold text-gray-800 mb-2">Performance Summary</h4>
                  <p className="text-gray-600">
                    {rating >= 4.0 
                      ? 'Outstanding performance! Patients consistently rate you at the highest levels across all aspects of care. Your dedication to patient satisfaction is evident. Continue providing this exceptional level of care.'
                      : rating >= 3.5 
                      ? 'Good performance. Patients appreciate your care and service. While you are performing well, there are specific areas where focused improvement could elevate patient satisfaction even further.'
                      : rating >= 3.0
                      ? 'Average performance indicates that there is room for improvement. Consider reviewing the detailed feedback below to identify specific areas where you can enhance patient experience.'
                      : 'Below average ratings suggest that improvements are needed. We recommend reviewing the feedback carefully and working with your supervisors to develop an improvement plan.'}
                  </p>
                </div>
                
                {/* Footer */}
                <div className="px-8 py-4 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500">
                      This is an automated report from the Patient Feedback System.
                    </p>
                    {doctor.email ? (
                      <span className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        <Mail className="w-4 h-4" />
                        {doctor.email}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                        <Mail className="w-4 h-4" />
                        No email configured
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openEmailModal(doctor)}
                    disabled={sendingEmail === doctor.doctor_id || !doctor.email}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingEmail === doctor.doctor_id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {emailModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEmailModal({ isOpen: false, doctor: null })}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-modal shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Send Rating Report</h3>
                <p className="text-gray-500 text-sm">Dr. {emailModal.doctor?.doctor_name}</p>
              </div>
              <button onClick={() => setEmailModal({ isOpen: false, doctor: null })} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-3xl font-bold ${getStarColor(emailModal.doctor?.average_rating)}`}>
                  {emailModal.doctor?.average_rating?.toFixed(1)} / 5
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  Based on {emailModal.doctor?.total_patients} reviews
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor's Email</label>
                <div className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  {emailForm.email || 'No email configured'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Email is auto-fetched from doctor profile</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEmailModal({ isOpen: false, doctor: null })}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteModal({ isOpen, onClose, onConfirm, title, message, type = 'danger' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-modal shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 mb-6">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
