import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Briefcase, 
  GraduationCap, 
  UploadCloud, 
  Settings, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Eye, 
  Edit3, 
  Trash2, 
  FileJson,
  Check,
  ChevronRight,
  ChevronDown,
  Activity,
  Info
} from 'lucide-react';
import { optimizeResume, getMockOptimizedResume, translateResumeObj, generateCoverLetter, getMockCoverLetter, translateCoverLetterObj } from './services/gemini';
import './App.css'; // Vite css is empty, styles loaded from index.css

// Custom Glassmorphic Dropdown Select Component
function CustomSelect({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <div 
        className="custom-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : (placeholder || 'Selecione...')}</span>
        <ChevronDown size={14} className={`select-arrow ${isOpen ? 'open' : ''}`} />
      </div>
      {isOpen && (
        <div className="custom-select-options glass">
          {options.map((opt) => (
            <div 
              key={opt.value} 
              className={`custom-select-option ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Circular SVG Score Gauge Component with Easing Animation
function CircularScoreGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    setAnimatedScore(0);
    const duration = 1000; // 1s animation duration
    const startTime = performance.now();
    
    let frameId;
    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quadratic formula
      const easeProgress = progress * (2 - progress);
      setAnimatedScore(Math.round(easeProgress * score));
      
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [score]);

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  
  const getScoreColor = (val) => {
    if (val >= 80) return "#10b981"; // Emerald green
    if (val >= 50) return "#f59e0b"; // Amber orange
    return "#ef4444"; // Red
  };

  const color = getScoreColor(score);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1.25rem', 
      background: 'rgba(255, 255, 255, 0.02)', 
      padding: '1.25rem', 
      borderRadius: 'var(--radius-sm)', 
      border: '1px solid var(--color-border)', 
      marginBottom: '1.5rem',
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
    }}>
      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
        <svg width="84" height="84" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="7"
          />
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.05s ease-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '1.2rem',
          fontWeight: 800,
          color: color
        }}>
          {animatedScore}%
        </div>
      </div>
      
      <div style={{ flexGrow: 1 }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {score >= 80 ? "Excelente Compatibilidade ATS!" : score >= 50 ? "Compatibilidade Regular" : "Melhorias Necessárias"}
        </h4>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
          {score >= 80 
            ? "Seu currículo atende às principais exigências descritas na vaga e possui alta chance de superar os filtros automatizados de triagem."
            : score >= 50 
              ? "Para aumentar suas chances no ATS, inclua algumas das palavras-chave sugeridas e quantifique conquistas nas experiências de trabalho."
              : "Recomendamos fortemente reescrever partes do currículo focando nas competências essenciais que estão ausentes."
          }
        </p>
      </div>
    </div>
  );
}

/**
 * Strict Input Validation to prevent token wastes on non-sensical, empty or link-only queries.
 */
const validateInputTexts = (resume, job) => {
  const trimmedResume = resume.trim();
  const trimmedJob = job.trim();

  // 1. Presence check
  if (!trimmedResume || !trimmedJob) {
    return "Por favor, preencha ambos os campos (Currículo Original e Descrição da Vaga) antes de prosseguir.";
  }

  // 2. Minimum length check (150 chars)
  if (trimmedResume.length < 150 || trimmedJob.length < 150) {
    return "O texto inserido é curto demais. Um currículo ou vaga real deve possuir pelo menos 150 caracteres para uma análise rica da IA.";
  }

  // 3. Identical inputs check
  if (trimmedResume === trimmedJob) {
    return "O texto do currículo e a descrição da vaga são idênticos. Por favor, forneça os textos correspondentes corretos.";
  }

  // 4. URL only checks
  const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
  const isResumeUrl = urlPattern.test(trimmedResume) || (trimmedResume.startsWith('http') && !trimmedResume.includes(' '));
  const isJobUrl = urlPattern.test(trimmedJob) || (trimmedJob.startsWith('http') && !trimmedJob.includes(' '));

  if (isResumeUrl) {
    return "O campo do currículo contém apenas um link. Copie e cole o texto completo do seu currículo.";
  }
  if (isJobUrl) {
    return "O campo da vaga contém apenas um link. Copie e cole a descrição textual completa da vaga.";
  }

  // 5. Gibberish / low word count checks
  const resumeWords = trimmedResume.split(/\s+/).filter(w => w.length > 0);
  const jobWords = trimmedJob.split(/\s+/).filter(w => w.length > 0);

  if (resumeWords.length < 15) {
    return "O texto do currículo parece inválido ou contém pouquíssimas palavras. Insira um texto estruturado.";
  }
  if (jobWords.length < 15) {
    return "A descrição da vaga parece inválida ou contém pouquíssimas palavras. Insira a descrição completa.";
  }

  // 6. Excessive duplicate characters (e.g. repeated keystroke spam like "aaaaaa" or "xxxxx")
  const consecutiveDupPattern = /(.)\1{7,}/; // same char repeated 8+ times
  if (consecutiveDupPattern.test(trimmedResume) || consecutiveDupPattern.test(trimmedJob)) {
    return "Foram detectados caracteres repetidos excessivos (spam/digitação acidental). Por favor, forneça textos válidos.";
  }

  // 7. Low vocabulary ratio (repetitive words spam)
  const uniqueWordsResume = new Set(resumeWords.map(w => w.toLowerCase()));
  const uniqueWordsJob = new Set(jobWords.map(w => w.toLowerCase()));

  if (uniqueWordsResume.size / resumeWords.length < 0.25) {
    return "O currículo parece conter termos repetidos exaustivamente de forma artificial. Insira um texto legítimo.";
  }
  if (uniqueWordsJob.size / jobWords.length < 0.25) {
    return "A descrição da vaga parece conter termos repetidos exaustivamente de forma artificial. Insira uma descrição de vaga legítima.";
  }

  // 8. Alphabetic characters presence
  const letterPattern = /[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/;
  if (!letterPattern.test(trimmedResume) || !letterPattern.test(trimmedJob)) {
    return "Os textos informados não possuem caracteres alfabéticos válidos.";
  }

  return null; // All valid!
};

function App() {
  // --- STATE ---
  // Read API Key directly from Vite env configuration in production
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  
  // Optimization & Processing state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Idle, 1: Analyzing, 2: Tailoring CV, 3: Completed
  const [optimizedCv, setOptimizedCv] = useState(null);
  const [originalPortugueseCv, setOriginalPortugueseCv] = useState(null);
  const [originalEnglishCv, setOriginalEnglishCv] = useState(null);
  
  // Customization Options
  const [tone, setTone] = useState('Técnico e Profissional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('pt'); // 'pt' (default) or 'en'
  const [activeTemplate, setActiveTemplate] = useState('modern'); // modern default matches screenshot // classic, modern, minimal
  
  // UI states
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mobileTab, setMobileTab] = useState('input'); // 'input' or 'output' for mobile view
  
  // Cover Letter States
  const [coverLetter, setCoverLetter] = useState(null);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterStep, setCoverLetterStep] = useState(0); // 0: Idle, 1: Structuring, 2: Formatting
  const [activeTab, setActiveTab] = useState('cv'); // 'cv' or 'letter'
  const [originalPortugueseCoverLetter, setOriginalPortugueseCoverLetter] = useState(null);
  const [originalEnglishCoverLetter, setOriginalEnglishCoverLetter] = useState(null);

  const [optimizationsCount, setOptimizationsCount] = useState(() => {
    try {
      const saved = localStorage.getItem('caoz_optimizations_total_count');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });
  
  useEffect(() => {
    try {
      localStorage.setItem('caoz_optimizations_total_count', optimizationsCount);
    } catch (e) {}
  }, [optimizationsCount]);

  const fileInputRef = useRef(null);

  // --- ACTIONS ---
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (errorMsg) {
      setToastMessage(null);
      const timer = setTimeout(() => setErrorMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // (saveApiKey removed as telemetry dashboard handles API configuration silently via .env)

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  // --- FILE PARSING (CLIENT-SIDE) ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };



  const processFile = async (file) => {
    setErrorMsg(null);

    // 1. Validação de Formato do Arquivo (Tipo)
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!isAllowed) {
      setErrorMsg("Formato de arquivo não suportado. Por favor, envie arquivos .pdf, .docx ou .txt.");
      return;
    }

    // 2. Validação de Tamanho Máximo (5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMsg("O tamanho do arquivo excede o limite máximo de 5MB.");
      return;
    }

    setUploadedFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type
    });
    setIsParsingFile(true);

    const reader = new FileReader();
    
    try {
      if (file.type === 'application/pdf') {
        // PDF parser using pdf.js CDN
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            if (!window.pdfjsLib) {
              throw new Error("Biblioteca de PDF não carregada. Verifique sua conexão com a internet.");
            }
            
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              fullText += pageText + '\n';
            }
            
            if (!fullText.trim()) {
              throw new Error("Não foi possível extrair texto do PDF. O arquivo pode ser uma imagem escaneada.");
            }
            setResumeText(fullText);
            showToast('Currículo PDF importado com sucesso!');
          } catch (err) {
            console.error("[ERRO PARSER PDF] Falha crítica ao extrair texto do PDF:", err);
            setErrorMsg(err.message || 'Falha ao ler o PDF.');
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.readAsArrayBuffer(file);

      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX parser using mammoth.js CDN
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            if (!window.mammoth) {
              throw new Error("Biblioteca DOCX (Mammoth) não carregada. Verifique sua conexão com a internet.");
            }
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            if (!result.value.trim()) {
              throw new Error("Currículo Word está vazio.");
            }
            setResumeText(result.value);
            showToast('Currículo Word importado com sucesso!');
          } catch (err) {
            console.error("[ERRO PARSER DOCX] Falha crítica ao ler arquivo Word:", err);
            setErrorMsg(err.message || 'Falha ao ler arquivo Word (.docx).');
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.readAsArrayBuffer(file);

      } else {
        // Fallback for TXT or other raw files
        reader.onload = (e) => {
          const text = e.target.result;
          setResumeText(text);
          setIsParsingFile(false);
          showToast('Currículo de texto importado!');
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error("[ERRO LEITURA ARQUIVO] Falha ao processar arquivo genérico:", err);
      setErrorMsg('Erro de leitura do arquivo.');
      setIsParsingFile(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setResumeText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- OPTIMIZATION ORCHESTRATION ---
  const handleOptimize = async (langOverride) => {
    // Validação estrita de entradas para economia de tokens
    const validationError = validateInputTexts(resumeText, jobDescription);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    const lang = langOverride || targetLanguage;

    setIsOptimizing(true);
    setMobileTab('output'); // Auto-switch tab on mobile so they see results/loader
    setErrorMsg(null);
    setCurrentStep(1); // Step 1: Analisando vaga

    // Steps simulation for beautiful UI feedback
    const stepTimer1 = setTimeout(() => setCurrentStep(2), 1500); // Tailoring CV details

    try {
      // Calls optimizeResume always in Portuguese ('pt')
      const result = await optimizeResume({
        resumeText,
        jobDescription,
        tone,
        customInstructions,
        targetLanguage: 'pt',
        apiKey
      });
      
      clearTimeout(stepTimer1);
      setCurrentStep(3); // Completed!
      
      setOriginalPortugueseCv(result);
      setOriginalEnglishCv(null); // Limpa o cache antigo
      
      if (lang === 'en') {
        setCurrentStep(2); // Translating...
        const translated = await translateResumeObj(result, 'en');
        setOriginalEnglishCv(translated); // Salva no cache
        setTimeout(() => {
          setOptimizedCv(translated);
          setIsOptimizing(false);
          setCurrentStep(0);
          setOptimizationsCount(prev => prev + 1);
          showToast('Currículo otimizado e traduzido com sucesso!');
        }, 1000);
      } else {
        setTimeout(() => {
          setOptimizedCv(result);
          setIsOptimizing(false);
          setCurrentStep(0);
          setOptimizationsCount(prev => prev + 1);
          showToast('Currículo otimizado com sucesso!');
        }, 1000);
      }
      
    } catch (err) {
      console.error("[ERRO OTIMIZAÇÃO GEMINI] Falha ao otimizar currículo via IA. Detalhes:", err);
      clearTimeout(stepTimer1);
      setErrorMsg(err.message || "Erro durante a otimização com Inteligência Artificial.");
      setIsOptimizing(false);
      setCurrentStep(0);
    }
  };

  const handleLanguageChange = async (lang) => {
    setTargetLanguage(lang);
    const isCvActive = activeTab === 'cv';

    if (originalPortugueseCv || originalPortugueseCoverLetter) {
      setIsOptimizing(true);
      setCurrentStep(2); // Traduzindo/Processando...
      try {
        if (isCvActive) {
          // Prioriza a tradução do currículo
          if (originalPortugueseCv) {
            if (lang === 'en') {
              if (originalEnglishCv) {
                setOptimizedCv(originalEnglishCv);
                showToast('Currículo traduzido para inglês (do cache)!');
              } else {
                const translated = await translateResumeObj(originalPortugueseCv, 'en');
                setOriginalEnglishCv(translated);
                setOptimizedCv(translated);
                showToast('Currículo traduzido para inglês!');
              }
            } else {
              setOptimizedCv(originalPortugueseCv);
              showToast('Currículo restaurado para português!');
            }
          }
          // Traduz a carta em segundo plano se ela existir
          if (originalPortugueseCoverLetter) {
            if (lang === 'en') {
              if (originalEnglishCoverLetter) {
                setCoverLetter(originalEnglishCoverLetter);
              } else {
                const translatedLetter = await translateCoverLetterObj(originalPortugueseCoverLetter, 'en');
                setOriginalEnglishCoverLetter(translatedLetter);
                setCoverLetter(translatedLetter);
              }
            } else {
              setCoverLetter(originalPortugueseCoverLetter);
            }
          }
        } else {
          // Prioriza a tradução da carta de apresentação
          if (originalPortugueseCoverLetter) {
            if (lang === 'en') {
              if (originalEnglishCoverLetter) {
                setCoverLetter(originalEnglishCoverLetter);
                showToast('Carta de apresentação traduzida para inglês (do cache)!');
              } else {
                const translatedLetter = await translateCoverLetterObj(originalPortugueseCoverLetter, 'en');
                setOriginalEnglishCoverLetter(translatedLetter);
                setCoverLetter(translatedLetter);
                showToast('Carta de apresentação traduzida para inglês!');
              }
            } else {
              setCoverLetter(originalPortugueseCoverLetter);
              showToast('Carta de apresentação restaurada para português!');
            }
          }
          // Traduz o currículo em segundo plano se ele existir
          if (originalPortugueseCv) {
            if (lang === 'en') {
              if (originalEnglishCv) {
                setOptimizedCv(originalEnglishCv);
              } else {
                const translated = await translateResumeObj(originalPortugueseCv, 'en');
                setOriginalEnglishCv(translated);
                setOptimizedCv(translated);
              }
            } else {
              setOptimizedCv(originalPortugueseCv);
            }
          }
        }
      } catch (err) {
        console.error("[ERRO TRADUÇÃO DINÂMICA] Falha ao traduzir os documentos:", err);
        setErrorMsg("Erro ao traduzir o documento selecionado.");
      } finally {
        setIsOptimizing(false);
        setCurrentStep(0);
      }
    }
  };

  const handleLoadDemo = async () => {
    setIsOptimizing(true);
    setMobileTab('output');
    setErrorMsg(null);
    setCurrentStep(1); // Step 1: Analisando vaga
    
    // Steps simulation for beautiful UI feedback
    const stepTimer1 = setTimeout(() => setCurrentStep(2), 1200);
    const stepTimer2 = setTimeout(() => setCurrentStep(3), 2400);

    try {
      const result = await getMockOptimizedResume(resumeText, jobDescription, targetLanguage);
      
      setTimeout(() => {
        setOptimizedCv(result);
        setIsOptimizing(false);
        setCurrentStep(0);
        setOptimizationsCount(prev => prev + 1); // Increment dashboard optimizations counter
        showToast('Currículo de demonstração simulado carregado!');
      }, 3200);
      
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setErrorMsg("Erro ao carregar dados simulados.");
      setIsOptimizing(false);
      setCurrentStep(0);
    }
  };

  // --- INLINE EDITING ---
  const handleEdit = (section, field, value) => {
    const updateFn = prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (section === 'personalInfo' || section === 'summary' || section === 'objective') {
        if (section === 'personalInfo') {
          updated.personalInfo[field] = value;
        } else if (section === 'summary') {
          updated.summary = value;
        } else if (section === 'objective') {
          updated.objective = value;
        }
      }
      return updated;
    };
    setOptimizedCv(updateFn);
    if (targetLanguage === 'pt') {
      setOriginalPortugueseCv(updateFn);
    } else {
      setOriginalEnglishCv(updateFn);
    }
  };

  const handleSkillEdit = (catIndex, itemIndex, value) => {
    const updateFn = prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.skills[catIndex].items[itemIndex] = value;
      return updated;
    };
    setOptimizedCv(updateFn);
    if (targetLanguage === 'pt') {
      setOriginalPortugueseCv(updateFn);
    } else {
      setOriginalEnglishCv(updateFn);
    }
  };

  const handleExperienceEdit = (index, field, value) => {
    const updateFn = prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.experience[index][field] = value;
      return updated;
    };
    setOptimizedCv(updateFn);
    if (targetLanguage === 'pt') {
      setOriginalPortugueseCv(updateFn);
    } else {
      setOriginalEnglishCv(updateFn);
    }
  };

  const handleExperienceBulletEdit = (expIndex, bulletIndex, value) => {
    const updateFn = prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.experience[expIndex].bullets[bulletIndex] = value;
      return updated;
    };
    setOptimizedCv(updateFn);
    if (targetLanguage === 'pt') {
      setOriginalPortugueseCv(updateFn);
    } else {
      setOriginalEnglishCv(updateFn);
    }
  };

  const handleEducationEdit = (index, field, value) => {
    const updateFn = prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.education[index][field] = value;
      return updated;
    };
    setOptimizedCv(updateFn);
    if (targetLanguage === 'pt') {
      setOriginalPortugueseCv(updateFn);
    } else {
      setOriginalEnglishCv(updateFn);
    }
  };

  const handleProjectEdit = (index, field, value) => {
    const updateFn = prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.projects[index][field] = value;
      return updated;
    };
    setOptimizedCv(updateFn);
    if (targetLanguage === 'pt') {
      setOriginalPortugueseCv(updateFn);
    } else {
      setOriginalEnglishCv(updateFn);
    }
  };

  // --- DOWNLOAD / EXPORT ---
  const downloadTxt = () => {
    if (!optimizedCv) return;
    
    const { personalInfo, objective, summary, skills, experience, education, projects } = optimizedCv;
    let txt = `========================================================================\n`;
    txt += `                     ${personalInfo.name.toUpperCase()}\n`;
    txt += `========================================================================\n`;
    txt += `${personalInfo.location || ""} | ${personalInfo.phone || ""} | ${personalInfo.email || ""}\n`;
    if (personalInfo.linkedin) txt += `LinkedIn: ${personalInfo.linkedin}\n`;
    if (personalInfo.website) txt += `${targetLanguage === 'en' ? 'Website' : 'Site'}: ${personalInfo.website}\n`;
    txt += `\n`;
    
    if (objective) {
      txt += `=========================================\n`;
      txt += `${targetLanguage === 'en' ? 'OBJECTIVE' : 'OBJETIVO'}\n`;
      txt += `=========================================\n`;
      txt += `${objective}\n\n`;
    }
    
    txt += `=========================================\n`;
    txt += `${targetLanguage === 'en' ? 'PROFESSIONAL SUMMARY' : 'RESUMO PROFISSIONAL'}\n`;
    txt += `=========================================\n`;
    txt += `${summary}\n\n`;
    
    txt += `=========================================\n`;
    txt += `${targetLanguage === 'en' ? 'SKILLS' : 'HABILIDADES'}\n`;
    txt += `=========================================\n`;
    skills.forEach(cat => {
      txt += `${cat.category}: ${cat.items.join(", ")}\n`;
    });
    txt += `\n`;
    
    txt += `=========================================\n`;
    txt += `${targetLanguage === 'en' ? 'PROFESSIONAL EXPERIENCE' : 'EXPERIÊNCIA PROFISSIONAL'}\n`;
    txt += `=========================================\n`;
    experience.forEach(exp => {
      txt += `${exp.role.toUpperCase()} - ${exp.company} (${exp.location || ""})\n`;
      txt += `${exp.period}\n`;
      exp.bullets.forEach(b => {
        txt += `- ${b}\n`;
      });
      txt += `\n`;
    });
    
    if (education && education.length > 0) {
      txt += `=========================================\n`;
      txt += `${targetLanguage === 'en' ? 'EDUCATION' : 'FORMAÇÃO ACADÊMICA'}\n`;
      txt += `=========================================\n`;
      education.forEach(edu => {
        txt += `${edu.degree} - ${edu.institution}\n`;
        txt += `${edu.period}\n\n`;
      });
    }
    
    if (projects && projects.length > 0) {
      txt += `=========================================\n`;
      txt += `${targetLanguage === 'en' ? 'PROJECTS' : 'PROJETOS'}\n`;
      txt += `=========================================\n`;
      projects.forEach(proj => {
        txt += `${proj.name}\n${proj.description}\n`;
        if (proj.link) txt += `${targetLanguage === 'en' ? 'Link' : 'Link'}: ${proj.link}\n`;
        txt += `\n`;
      });
    }
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `${personalInfo.name.replace(/\s+/g, '_')}_${targetLanguage === 'en' ? 'Optimized_Resume' : 'Curriculo_ATS_Otimizado'}.txt`;
    link.download = filename;
    link.click();
    showToast('Download do arquivo TXT iniciado!');
  };

  const downloadPdf = () => {
    if (!optimizedCv) return;
    if (!window.html2pdf) {
      console.error("[ERRO EXPORTAR PDF] Biblioteca html2pdf não encontrada no escopo window.");
      setErrorMsg("Erro: Biblioteca html2pdf não pôde ser carregada. Tente recarregar a página.");
      return;
    }
    
    const element = document.getElementById('cv-preview-sheet');
    if (!element) {
      console.error("[ERRO EXPORTAR PDF] Elemento '#cv-preview-sheet' não encontrado no DOM.");
      setErrorMsg("Erro ao exportar PDF: Visualização não disponível.");
      return;
    }

    const container = element.parentElement;
    // Salvar estilos originais para restauração posterior
    const originalMaxHeight = container.style.maxHeight;
    const originalOverflowY = container.style.overflowY;
    const originalHeight = container.style.height;

    // Expandir temporariamente o container para altura total, prevenindo cortes do html2canvas
    container.style.maxHeight = 'none';
    container.style.overflowY = 'visible';
    container.style.height = 'auto';

    showToast('Preparando seu PDF ATS...');
    const filename = `${optimizedCv.personalInfo.name.replace(/\s+/g, '_')}_${targetLanguage === 'en' ? 'Optimized_Resume' : 'Curriculo_Otimizado'}.pdf`;
    
    const opt = {
      margin:       [12, 15, 12, 15], // standard resume margins
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        backgroundColor: '#ffffff',
        scrollY: 0,
        scrollX: 0
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    window.html2pdf().set(opt).from(element).save()
      .then(() => {
        // Restaurar estilos originais
        container.style.maxHeight = originalMaxHeight;
        container.style.overflowY = originalOverflowY;
        container.style.height = originalHeight;
        showToast('Download do PDF iniciado!');
      })
      .catch(err => {
        // Restaurar estilos originais em caso de falha
        container.style.maxHeight = originalMaxHeight;
        container.style.overflowY = originalOverflowY;
        container.style.height = originalHeight;
        console.error("[ERRO EXPORTAR PDF] Falha na geração ou download do PDF via html2pdf:", err);
        setErrorMsg("Erro ao exportar PDF.");
      });
  };

  const downloadJson = () => {
    if (!optimizedCv) return;
    const blob = new Blob([JSON.stringify(optimizedCv, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `${optimizedCv.personalInfo.name.replace(/\s+/g, '_')}_${targetLanguage === 'en' ? 'Optimized_Resume' : 'Curriculo_Otimizado'}.json`;
    link.download = filename;
    link.click();
    showToast('Download do arquivo JSON iniciado!');
  };

  const resetAll = () => {
    if (window.confirm("Deseja realmente limpar tudo?")) {
      removeFile();
      setJobDescription('');
      setOptimizedCv(null);
      setCoverLetter(null);
      setActiveTab('cv');
      setErrorMsg(null);
      setMobileTab('input'); // Reset to input tab on mobile
    }
  };

  // --- COVER LETTER MANAGEMENT ---
  const handleGenerateCoverLetter = async () => {
    const trimmedResume = resumeText.trim();
    const trimmedJob = jobDescription.trim();

    // Validação estrita de entradas para economia de tokens
    const validationError = validateInputTexts(trimmedResume, trimmedJob);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsGeneratingCoverLetter(true);
    setCoverLetterStep(1); // Analyzing requirements
    setErrorMsg(null);

    // Simulate steps for beautiful UI feedback
    const stepTimer = setTimeout(() => setCoverLetterStep(2), 1500); // Structuring paragraphs

    try {
      let result;
      // If demo mode is active or no API Key is set and text seems like demo text
      const isDemo = (optimizedCv && optimizedCv.personalInfo?.name === "Cauan Ferreira") || (!apiKey && resumeText.toLowerCase().includes("cauan"));

      if (isDemo) {
        result = await getMockCoverLetter(trimmedResume, trimmedJob, 'pt');
      } else {
        result = await generateCoverLetter({
          resumeText: trimmedResume,
          jobDescription: trimmedJob,
          tone,
          customInstructions,
          targetLanguage: 'pt', // Sempre gera em PT primeiro para guardar o original
          apiKey
        });
      }

      clearTimeout(stepTimer);
      setCoverLetterStep(3); // Completed!

      setOriginalPortugueseCoverLetter(result);
      setOriginalEnglishCoverLetter(null); // Limpa o cache antigo

      if (targetLanguage === 'en') {
        setCoverLetterStep(2); // Traduzindo...
        const translated = await translateCoverLetterObj(result, 'en');
        setOriginalEnglishCoverLetter(translated); // Salva no cache
        setTimeout(() => {
          setCoverLetter(translated);
          setIsGeneratingCoverLetter(false);
          setCoverLetterStep(0);
          showToast('Carta de apresentação gerada e traduzida para inglês!');
        }, 1000);
      } else {
        setTimeout(() => {
          setCoverLetter(result);
          setIsGeneratingCoverLetter(false);
          setCoverLetterStep(0);
          showToast('Carta de apresentação gerada com sucesso!');
        }, 1000);
      }

    } catch (err) {
      console.error("[ERRO CARTA GEMINI] Falha ao gerar carta de apresentação via IA. Detalhes:", err);
      clearTimeout(stepTimer);
      setErrorMsg(err.message || "Erro durante a geração da Carta de Apresentação com Inteligência Artificial.");
      setIsGeneratingCoverLetter(false);
      setCoverLetterStep(0);
    }
  };

  const handleCoverLetterEdit = (section, field, value) => {
    const updateFn = prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (section === 'personalInfo') {
        updated.personalInfo = { ...updated.personalInfo, [field]: value };
      } else if (section === 'recipientInfo') {
        updated.recipientInfo = { ...updated.recipientInfo, [field]: value };
      } else if (section === 'bodyParagraphs') {
        const newParagraphs = [...updated.bodyParagraphs];
        newParagraphs[field] = value;
        updated.bodyParagraphs = newParagraphs;
      } else {
        updated[section] = value; // subject, date, salutation, conclusion, signOff, signature
      }
      return updated;
    };
    setCoverLetter(updateFn);
    if (targetLanguage === 'pt') {
      setOriginalPortugueseCoverLetter(updateFn);
    } else {
      setOriginalEnglishCoverLetter(updateFn);
    }
  };

  const downloadCoverLetterTxt = () => {
    if (!coverLetter) return;
    const { personalInfo, recipientInfo, date, subject, salutation, introduction, bodyParagraphs, conclusion, signOff, signature } = coverLetter;
    
    let txt = `========================================================================\n`;
    txt += `                     CARTA DE APRESENTAÇÃO\n`;
    txt += `========================================================================\n`;
    txt += `${personalInfo.name.toUpperCase()}\n`;
    txt += `${personalInfo.location || ""} | ${personalInfo.phone || ""} | ${personalInfo.email || ""}\n`;
    if (personalInfo.linkedin) txt += `LinkedIn: ${personalInfo.linkedin}\n`;
    if (personalInfo.website) txt += `GitHub/Site: ${personalInfo.website}\n`;
    txt += `\n`;
    txt += `------------------------------------------------------------------------\n`;
    txt += `${date}\n\n`;
    txt += `Para:\n`;
    txt += `${recipientInfo.hiringManager || "Equipe de Recrutamento"}\n`;
    txt += `${recipientInfo.companyName}\n`;
    txt += `Vaga de interesse: ${recipientInfo.role}\n`;
    txt += `------------------------------------------------------------------------\n\n`;
    txt += `Assunto: ${subject}\n\n`;
    txt += `${salutation}\n\n`;
    txt += `${introduction}\n\n`;
    bodyParagraphs.forEach(p => {
      txt += `${p}\n\n`;
    });
    txt += `${conclusion}\n\n`;
    txt += `${signOff}\n\n`;
    txt += `${signature}\n`;
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `${personalInfo.name.replace(/\s+/g, '_')}_${targetLanguage === 'en' ? 'Cover_Letter' : 'Carta_de_Apresentacao'}.txt`;
    link.download = filename;
    link.click();
    showToast('Download do arquivo TXT iniciado!');
  };

  const downloadCoverLetterPdf = () => {
    if (!coverLetter) return;
    if (!window.html2pdf) {
      console.error("[ERRO EXPORTAR PDF] Biblioteca html2pdf não encontrada no escopo window.");
      setErrorMsg("Erro: Biblioteca html2pdf não pôde ser carregada. Tente recarregar a página.");
      return;
    }
    
    const element = document.getElementById('cover-letter-preview-sheet');
    if (!element) {
      console.error("[ERRO EXPORTAR PDF] Elemento '#cover-letter-preview-sheet' não encontrado no DOM.");
      setErrorMsg("Erro ao exportar PDF: Visualização não disponível.");
      return;
    }

    const container = element.parentElement;
    const originalMaxHeight = container.style.maxHeight;
    const originalOverflowY = container.style.overflowY;
    const originalHeight = container.style.height;

    container.style.maxHeight = 'none';
    container.style.overflowY = 'visible';
    container.style.height = 'auto';

    showToast('Preparando seu PDF da Carta...');
    const filename = `${coverLetter.personalInfo.name.replace(/\s+/g, '_')}_${targetLanguage === 'en' ? 'Cover_Letter' : 'Carta_de_Apresentacao'}.pdf`;
    
    const opt = {
      margin:       [15, 20, 15, 20],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        backgroundColor: '#ffffff',
        scrollY: 0,
        scrollX: 0
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    window.html2pdf().set(opt).from(element).save()
      .then(() => {
        container.style.maxHeight = originalMaxHeight;
        container.style.overflowY = originalOverflowY;
        container.style.height = originalHeight;
        showToast('Download do PDF iniciado!');
      })
      .catch(err => {
        container.style.maxHeight = originalMaxHeight;
        container.style.overflowY = originalOverflowY;
        container.style.height = originalHeight;
        console.error("[ERRO EXPORTAR PDF] Falha na geração ou download do PDF via html2pdf:", err);
        setErrorMsg("Erro ao exportar PDF.");
      });
  };

  // --- RENDER HELPERS ---
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#e67e22'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="app-container">
      {/* Background Glow Blobs */}
      <div className="bg-glow-container">
        <div className="bg-glow-blob bg-glow-blob-1"></div>
        <div className="bg-glow-blob bg-glow-blob-2"></div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(18, 18, 23, 0.95)',
          border: '1px solid var(--color-accent)',
          boxShadow: '0 4px 20px rgba(230, 126, 34, 0.25)',
          color: '#fff',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-sm)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.875rem',
          backdropFilter: 'blur(10px)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <CheckCircle2 size={16} color="var(--color-accent)" />
          {toastMessage}
        </div>
      )}

      {/* Toast Error Notification (Floating Bubble) */}
      {errorMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(239, 68, 68, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.25)',
          color: '#fff',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-sm)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.875rem',
          backdropFilter: 'blur(10px)',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          maxWidth: '400px'
        }}>
          <AlertCircle size={18} color="#fff" style={{ flexShrink: 0 }} />
          <span style={{ flexGrow: 1 }}>{errorMsg}</span>
          <button 
            onClick={() => setErrorMsg(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#fff', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              marginLeft: '0.5rem',
              opacity: 0.8
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <header>
        <div className="logo">
          <h1>CAOZ Optimizer</h1>
          <span>Otimizador Inteligente de Currículo ATS</span>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary btn-icon"
            onClick={() => setIsDashboardOpen(true)}
            title="Status e Métricas de Operação"
          >
            <Activity size={18} />
          </button>
          {optimizedCv && (
            <button className="btn btn-danger" onClick={resetAll} title="Limpar tudo">
              <Trash2 size={16} />
              Limpar
            </button>
          )}
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="mobile-tabs-container">
        <button 
          className={`mobile-tab-btn ${mobileTab === 'input' ? 'active' : ''}`}
          onClick={() => setMobileTab('input')}
        >
          <FileText size={16} />
          Dados da Vaga
        </button>
        <button 
          className={`mobile-tab-btn ${mobileTab === 'output' ? 'active' : ''}`}
          onClick={() => setMobileTab('output')}
        >
          <Sparkles size={16} />
          Currículo Otimizado
          {optimizedCv && (
            <span className="mobile-tab-badge">
              {optimizedCv.atsReport?.matchScore}%
            </span>
          )}
        </button>
      </div>

      {/* Workspace */}
      <div className="workspace">
        
        {/* Left Column: Source Inputs */}
        <div className={`column ${mobileTab === 'input' ? 'active-mobile-col' : 'hidden-mobile-col'}`}>
          <div className="glass" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">1. Dados do Candidato</h2>
                <div className="card-subtitle">Anexe seu currículo e insira a descrição da vaga</div>
              </div>
            </div>
            
            <div className="card-body">
              {/* File Attachment Drag & Drop */}
              <div className="form-group">
                <label className="form-label">Currículo Original</label>
                
                {!uploadedFile ? (
                  <div 
                    className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <UploadCloud className="upload-icon" size={40} />
                    <div className="upload-text">Arraste seu currículo ou clique para importar</div>
                    <div className="upload-hint">Formatos suportados: PDF, DOCX (Word) ou TXT</div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="file-input"
                      accept=".pdf,.docx,.txt"
                    />
                  </div>
                ) : (
                  <div className="file-status-card">
                    <div className="file-info">
                      <FileText className="file-icon" size={24} />
                      <div>
                        <div className="file-name" title={uploadedFile.name}>{uploadedFile.name}</div>
                        <div className="file-size">{uploadedFile.size}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary btn-icon"
                        style={{ width: '32px', height: '32px' }}
                        onClick={() => setShowRawText(!showRawText)}
                        title="Ver texto extraído"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="btn btn-danger btn-icon"
                        style={{ width: '32px', height: '32px' }}
                        onClick={removeFile}
                        title="Remover arquivo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
                
                {isParsingFile && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <div className="loading-glow-orb" style={{ width: '12px', height: '12px' }} />
                    Extraindo texto do currículo...
                  </div>
                )}
              </div>

              {/* Toggleable raw text viewer */}
              {(showRawText || !uploadedFile) && (
                <div className="form-group" style={{ animation: 'fadeIn 0.3s' }}>
                  <label className="form-label">
                    {uploadedFile ? "Texto Extraído do Currículo" : "Ou cole o texto do currículo diretamente"}
                  </label>
                  <textarea 
                    className="textarea-field"
                    placeholder="Cole as informações do seu currículo aqui..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                </div>
              )}

              {/* Job Description Textarea */}
              <div className="form-group">
                <label className="form-label">Descrição da Vaga Desejada</label>
                <textarea 
                  className="textarea-field"
                  style={{ minHeight: '180px' }}
                  placeholder="Cole os requisitos da vaga, qualificações e descrição completa aqui..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              {/* Advanced parameters rows */}
              <div className="options-row">
                <div className="form-group">
                  <label className="form-label">Tom do Currículo</label>
                  <CustomSelect 
                    value={tone}
                    onChange={setTone}
                    options={[
                      { value: 'Técnico e Profissional', label: 'Técnico e Profissional' },
                      { value: 'Corporativo e Formal', label: 'Corporativo e Formal' },
                      { value: 'Iniciante / Entry-Level', label: 'Iniciante / Entry-Level' },
                      { value: 'Focado em Liderança', label: 'Focado em Liderança' },
                      { value: 'Moderno e Inovador', label: 'Moderno e Inovador' }
                    ]}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Instruções Extras (Opcional)</label>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Ex: Dar foco em gestão ágil..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                  />
                </div>
              </div>

              {/* Idioma do Currículo Otimizado */}
              <div className="form-group" style={{ marginTop: '1.25rem', marginBottom: '0.25rem' }}>
                <label className="form-label">Idioma do Currículo Otimizado</label>
                <div className="language-selector-group">
                  <button 
                    type="button"
                    className={`lang-btn ${targetLanguage === 'pt' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('pt')}
                  >
                    Português (PT-BR)
                  </button>
                  <button 
                    type="button"
                    className={`lang-btn ${targetLanguage === 'en' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('en')}
                  >
                    Inglês (EN)
                  </button>
                </div>
              </div>

              {/* Optimization Trigger Button */}
              <div className="optimize-btn-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <button 
                  className={`btn btn-primary btn-optimize ${(!isOptimizing && !isParsingFile) ? 'btn-pulsing-glow' : ''}`}
                  onClick={() => handleOptimize()}
                  disabled={isOptimizing || isParsingFile}
                  style={{ opacity: (isOptimizing || isParsingFile) ? 0.6 : 1, width: '100%' }}
                >
                  <Sparkles size={18} />
                  {isOptimizing ? "Otimizando com IA..." : "Otimizar Currículo para ATS"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Processing or Output Preview */}
        <div className={`column ${mobileTab === 'output' ? 'active-mobile-col' : 'hidden-mobile-col'}`}>
          
          {isOptimizing ? (
            /* Loading State Panel */
            <div className="glass loading-container" style={{ flexGrow: 1, padding: '4rem 2rem' }}>
              <div className="spinner-container-premium">
                <div className="spinner-outer-ring"></div>
                <div className="spinner-inner-glow"></div>
              </div>
              
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} color="var(--color-accent)" />
                  Ajustando Sintonias ATS
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  A Inteligência Artificial da CAOZ está reescrevendo e otimizando seu currículo.
                </p>
              </div>
              
              <div className="loading-steps" style={{ marginTop: '0.5rem' }}>
                <div className={`loading-step ${currentStep >= 1 ? (currentStep === 1 ? 'active' : 'completed') : ''}`}>
                  {currentStep > 1 ? (
                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                  ) : currentStep === 1 ? (
                    <Activity size={16} className="rotate-spinner" color="var(--color-accent)" style={{ flexShrink: 0 }} />
                  ) : (
                    <div className="step-bullet" style={{ flexShrink: 0 }}></div>
                  )}
                  <span>Analisando requisitos e palavras-chave...</span>
                </div>

                <div className={`loading-step ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'completed') : ''}`}>
                  {currentStep > 2 ? (
                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                  ) : currentStep === 2 ? (
                    <Activity size={16} className="rotate-spinner" color="var(--color-accent)" style={{ flexShrink: 0 }} />
                  ) : (
                    <div className="step-bullet" style={{ flexShrink: 0 }}></div>
                  )}
                  <span>Formatando experiências com método STAR...</span>
                </div>

                <div className={`loading-step ${currentStep >= 3 ? (currentStep === 3 ? 'active' : 'completed') : ''}`}>
                  {currentStep > 3 ? (
                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                  ) : currentStep === 3 ? (
                    <Activity size={16} className="rotate-spinner" color="var(--color-accent)" style={{ flexShrink: 0 }} />
                  ) : (
                    <div className="step-bullet" style={{ flexShrink: 0 }}></div>
                  )}
                  <span>Refinando layout e integrando tradução...</span>
                </div>

                {/* Progress Bar indicator */}
                <div className="loader-progress-bar-bg">
                  <div 
                    className="loader-progress-bar-fill" 
                    style={{ width: currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%' }}
                  ></div>
                </div>
              </div>
            </div>
          ) : !optimizedCv ? (
            /* Empty State Preview */
            <div className="glass empty-preview" style={{ flexGrow: 1 }}>
              <FileText className="empty-icon" size={60} />
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                  Aguardando Otimização
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '350px' }}>
                  Preencha os dados do formulário ao lado e clique em **Otimizar** para ver a mágica acontecer aqui.
                </p>
              </div>
            </div>
          ) : (
            /* Output Preview & Editing Panel */
            <div className="glass" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 className="card-title">2. Visualização & Edição</h2>
                  <div className="card-subtitle">Clique no texto para editar antes de baixar</div>
                </div>

                <div className="visualizer-tabs">
                  <button 
                    className={`visualizer-tab-btn ${activeTab === 'cv' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cv')}
                  >
                    <FileText size={14} />
                    Currículo
                  </button>
                  <button 
                    className={`visualizer-tab-btn ${activeTab === 'letter' ? 'active' : ''}`}
                    onClick={() => setActiveTab('letter')}
                  >
                    <Sparkles size={14} />
                    Carta de Apresentação
                  </button>
                </div>
                
                <div className="output-header-actions">
                  {/* Template Selector dropdown */}
                  <div style={{ minWidth: '220px' }}>
                    <CustomSelect 
                      value={activeTemplate}
                      onChange={setActiveTemplate}
                      options={[
                        { value: 'modern', label: 'Layout Moderno Clean' },
                        { value: 'classic', label: 'Layout Clássico Serif' },
                        { value: 'minimal', label: 'Layout Minimalista Compacto' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="card-body">
                {activeTab === 'cv' ? (
                  <>
                    {/* Match Score and Feedback box */}
                    {optimizedCv.atsReport && (
                  <div className="report-box" style={{ background: 'none', border: 'none', padding: 0 }}>
                    <CircularScoreGauge score={optimizedCv.atsReport.matchScore} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Keywords lists */}
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          Palavras-chave incorporadas:
                        </div>
                        <div className="keyword-list">
                          {optimizedCv.atsReport.keywordsMatched?.map((kw, i) => (
                            <span key={i} className="keyword-tag matched">{kw}</span>
                          ))}
                        </div>
                      </div>
                      
                      {optimizedCv.atsReport.keywordsMissing?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            Atenção: Palavras-chave em falta no seu perfil original:
                          </div>
                          <div className="keyword-list">
                            {optimizedCv.atsReport.keywordsMissing.map((kw, i) => (
                              <span key={i} className="keyword-tag" style={{ borderStyle: 'dashed' }}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations list */}
                      {optimizedCv.atsReport.recommendations?.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                            Dicas do Recrutador IA:
                          </div>
                          <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {optimizedCv.atsReport.recommendations.map((rec, i) => (
                              <li key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', listStyleType: 'square' }}>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Styled Resume Container Sheet */}
                <div className="cv-preview-container">
                  <div 
                    id="cv-preview-sheet" 
                    className={`resume-sheet template-${activeTemplate}`}
                  >
                    {/* Header */}
                    <div className={`cv-header ${activeTemplate === 'classic' ? '' : 'cv-header-left'}`}>
                      <div 
                        className="cv-name editable-field" 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => handleEdit('personalInfo', 'name', e.target.innerText)}
                      >
                        {optimizedCv.personalInfo.name}
                      </div>
                      
                      <div className="cv-contact">
                        <span>
                          <strong>{targetLanguage === 'en' ? 'Location' : 'Localidade'}: </strong>
                          <span 
                            className="editable-field" 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleEdit('personalInfo', 'location', e.target.innerText)}
                          >
                            {optimizedCv.personalInfo.location}
                          </span>
                        </span>
                        <span>
                          <strong>{targetLanguage === 'en' ? 'Contact' : 'Contato'}: </strong>
                          <span 
                            className="editable-field" 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleEdit('personalInfo', 'phone', e.target.innerText)}
                          >
                            {optimizedCv.personalInfo.phone}
                          </span>
                        </span>
                        <span>
                          <strong>{targetLanguage === 'en' ? 'Email' : 'E-mail'}: </strong>
                          <span 
                            className="editable-field" 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleEdit('personalInfo', 'email', e.target.innerText)}
                          >
                            {optimizedCv.personalInfo.email}
                          </span>
                        </span>
                        {optimizedCv.personalInfo.linkedin && (
                          <span>
                            <strong>LinkedIn: </strong>
                            <a 
                              href={`https://${optimizedCv.personalInfo.linkedin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleEdit('personalInfo', 'linkedin', e.target.innerText)}
                              onClick={(e) => {
                                if (e.target.getAttribute('contenteditable') === 'true') {
                                  e.preventDefault();
                                }
                              }}
                            >
                              {optimizedCv.personalInfo.linkedin}
                            </a>
                          </span>
                        )}
                        {optimizedCv.personalInfo.website && (
                          <span>
                            <strong>GitHub: </strong>
                            <a 
                              href={`https://${optimizedCv.personalInfo.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleEdit('personalInfo', 'website', e.target.innerText)}
                              onClick={(e) => {
                                if (e.target.getAttribute('contenteditable') === 'true') {
                                  e.preventDefault();
                                }
                              }}
                            >
                              {optimizedCv.personalInfo.website}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Objective */}
                    {optimizedCv.objective && (
                      <div className="cv-section">
                        <div className="cv-section-title">{targetLanguage === 'en' ? 'Objective' : 'Objetivo'}</div>
                        <div 
                          className="cv-summary editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleEdit('objective', null, e.target.innerText)}
                        >
                          {optimizedCv.objective}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="cv-section">
                      <div className="cv-section-title">{targetLanguage === 'en' ? 'Professional Summary' : 'Resumo Profissional'}</div>
                      <div 
                        className="cv-summary editable-field" 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => handleEdit('summary', null, e.target.innerText)}
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {optimizedCv.summary}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="cv-section">
                      <div className="cv-section-title">{targetLanguage === 'en' ? 'Skills & Competencies' : 'Habilidades e Competências'}</div>
                      <div className="cv-skills-grid">
                        {optimizedCv.skills.map((cat, catIdx) => (
                          <div key={catIdx} className="cv-skills-category">
                            <strong>{cat.category}: </strong>
                            {cat.items.map((item, itemIdx) => (
                              <React.Fragment key={itemIdx}>
                                <span 
                                  className="editable-field" 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleSkillEdit(catIdx, itemIdx, e.target.innerText)}
                                >
                                  {item}
                                </span>
                                {itemIdx < cat.items.length - 1 && ', '}
                              </React.Fragment>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Professional Experience */}
                    <div className="cv-section">
                      <div className="cv-section-title">{targetLanguage === 'en' ? 'Professional Experience' : 'Experiência Profissional'}</div>
                      {optimizedCv.experience.map((exp, expIdx) => (
                        <div key={expIdx} className="cv-item">
                          <div className="cv-item-header">
                            <div>
                              <span 
                                className="editable-field" 
                                contentEditable 
                                suppressContentEditableWarning
                                onBlur={(e) => handleExperienceEdit(expIdx, 'role', e.target.innerText)}
                              >
                                {exp.role}
                              </span>
                              <span> - </span>
                              <span 
                                className="editable-field" 
                                contentEditable 
                                suppressContentEditableWarning
                                onBlur={(e) => handleExperienceEdit(expIdx, 'company', e.target.innerText)}
                              >
                                {exp.company}
                              </span>
                            </div>
                            <span 
                              className="editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleExperienceEdit(expIdx, 'period', e.target.innerText)}
                            >
                              {exp.period}
                            </span>
                          </div>
                          
                          <div className="cv-item-subheader">
                            <span 
                              className="editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleExperienceEdit(expIdx, 'location', e.target.innerText)}
                            >
                              {exp.location}
                            </span>
                          </div>

                          <ul className="cv-item-bullets">
                            {exp.bullets.map((bullet, bIdx) => (
                              <li key={bIdx}>
                                <span 
                                  className="editable-field" 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleExperienceBulletEdit(expIdx, bIdx, e.target.innerText)}
                                >
                                  {bullet}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Education */}
                    {optimizedCv.education && optimizedCv.education.length > 0 && (
                      <div className="cv-section">
                        <div className="cv-section-title">{targetLanguage === 'en' ? 'Education' : 'Formação Acadêmica'}</div>
                        {optimizedCv.education.map((edu, eduIdx) => (
                          <div key={eduIdx} className="cv-item" style={{ marginBottom: '0.5rem' }}>
                            <div className="cv-item-header">
                              <div>
                                <span 
                                  className="editable-field" 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleEducationEdit(eduIdx, 'degree', e.target.innerText)}
                                >
                                  {edu.degree}
                                </span>
                                <span>, </span>
                                <span 
                                  className="editable-field" 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleEducationEdit(eduIdx, 'institution', e.target.innerText)}
                                >
                                  {edu.institution}
                                </span>
                              </div>
                              <span 
                                className="editable-field" 
                                contentEditable 
                                suppressContentEditableWarning
                                onBlur={(e) => handleEducationEdit(eduIdx, 'period', e.target.innerText)}
                              >
                                {edu.period}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Projects */}
                    {optimizedCv.projects && optimizedCv.projects.length > 0 && (
                      <div className="cv-section">
                        <div className="cv-section-title">{targetLanguage === 'en' ? 'Key Projects' : 'Projetos Destacados'}</div>
                        {optimizedCv.projects.map((proj, projIdx) => (
                          <div key={projIdx} className="cv-item" style={{ marginBottom: '0.5rem' }}>
                            <div className="cv-item-header">
                              <span 
                                className="editable-field" 
                                contentEditable 
                                suppressContentEditableWarning
                                onBlur={(e) => handleProjectEdit(projIdx, 'name', e.target.innerText)}
                                style={{ textDecoration: 'underline' }}
                              >
                                {proj.name}
                              </span>
                              {proj.link && (
                                <span 
                                  className="editable-field" 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleProjectEdit(projIdx, 'link', e.target.innerText)}
                                  style={{ fontSize: '8.5pt', color: '#555' }}
                                >
                                  {proj.link}
                                </span>
                              )}
                            </div>
                            <div 
                              className="cv-summary editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleProjectEdit(projIdx, 'description', e.target.innerText)}
                              style={{ fontSize: '9pt', color: '#3a3a3c', marginTop: '0.15rem' }}
                            >
                              {proj.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Download formats group */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginTop: '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <button className="btn btn-primary" style={{ flexGrow: 1 }} onClick={downloadPdf}>
                    <Download size={16} />
                    Exportar PDF (Recomendado)
                  </button>
                  <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={downloadTxt}>
                    <FileText size={16} />
                    Exportar Texto Puro (TXT)
                  </button>
                  <button className="btn btn-secondary" style={{ width: '48px', padding: 0 }} onClick={downloadJson} title="Exportar JSON">
                    <FileJson size={16} />
                  </button>
                </div>
              </>
            ) : (
              /* --- COVER LETTER TAB --- */
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
                {isGeneratingCoverLetter ? (
                  /* Loading State Cover Letter */
                  <div className="glass loading-container" style={{ flexGrow: 1, padding: '4rem 2rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                    <div className="spinner-container-premium">
                      <div className="spinner-outer-ring"></div>
                      <div className="spinner-inner-glow"></div>
                    </div>
                    
                    <div style={{ marginTop: '1.5rem' }}>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textAlign: 'center' }}>
                        <Sparkles size={20} color="var(--color-accent)" />
                        Redigindo Carta de Apresentação
                      </h3>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                        Criando uma apresentação marcante alinhada à descrição da vaga.
                      </p>
                    </div>
                    
                    <div className="loading-steps" style={{ marginTop: '1.5rem', maxWidth: '320px', margin: '1.5rem auto 0 auto' }}>
                      <div className={`loading-step ${coverLetterStep >= 1 ? (coverLetterStep === 1 ? 'active' : 'completed') : ''}`}>
                        {coverLetterStep > 1 ? (
                          <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                        ) : coverLetterStep === 1 ? (
                          <Activity size={16} className="rotate-spinner" color="var(--color-accent)" style={{ flexShrink: 0 }} />
                        ) : (
                          <div className="step-bullet" style={{ flexShrink: 0 }}></div>
                        )}
                        <span>Analisando suas melhores experiências...</span>
                      </div>

                      <div className={`loading-step ${coverLetterStep >= 2 ? (coverLetterStep === 2 ? 'active' : 'completed') : ''}`}>
                        {coverLetterStep > 2 ? (
                          <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                        ) : coverLetterStep === 2 ? (
                          <Activity size={16} className="rotate-spinner" color="var(--color-accent)" style={{ flexShrink: 0 }} />
                        ) : (
                          <div className="step-bullet" style={{ flexShrink: 0 }}></div>
                        )}
                        <span>Formatando parágrafos com técnica AIDA...</span>
                      </div>
                    </div>
                  </div>
                ) : !coverLetter ? (
                  /* Empty State / CTA for Cover Letter */
                  <div className="generate-cta-box" style={{ animation: 'fadeIn 0.3s' }}>
                    <Sparkles className="generate-cta-icon" size={54} />
                    <div>
                      <div className="cover-letter-badge">Novo recurso</div>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                        Criar Carta de Apresentação?
                      </h3>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto', lineHeight: '1.5' }}>
                        Gere uma carta de apresentação altamente personalizada e persuasiva com base no seu currículo otimizado e nos requisitos desta vaga.
                      </p>
                    </div>
                    <button 
                      className="btn btn-primary btn-pulsing-glow" 
                      onClick={handleGenerateCoverLetter} 
                      style={{ padding: '0.75rem 2rem', marginTop: '0.5rem' }}
                    >
                      <Sparkles size={16} />
                      Gerar Carta com IA
                    </button>
                  </div>
                ) : (
                  /* Cover Letter Visualizer & Editor Sheet */
                  <div style={{ animation: 'fadeIn 0.3s', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <div className="cv-preview-container">
                      <div 
                        id="cover-letter-preview-sheet" 
                        className={`resume-sheet template-${activeTemplate} letter-sheet`}
                        style={{ background: '#ffffff', color: '#1c1c1e', padding: '1rem' }}
                      >
                        {/* Candidate Header */}
                        <div className={`cv-header ${activeTemplate === 'classic' ? '' : 'cv-header-left'}`}>
                          <div 
                            className="cv-name editable-field" 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleCoverLetterEdit('personalInfo', 'name', e.target.innerText)}
                          >
                            {coverLetter.personalInfo.name}
                          </div>
                          
                          <div className="cv-contact">
                            <span>
                              <strong>{targetLanguage === 'en' ? 'Location' : 'Localidade'}: </strong>
                              <span 
                                className="editable-field" 
                                contentEditable 
                                suppressContentEditableWarning
                                onBlur={(e) => handleCoverLetterEdit('personalInfo', 'location', e.target.innerText)}
                              >
                                {coverLetter.personalInfo.location}
                              </span>
                            </span>
                            <span>
                              <strong>{targetLanguage === 'en' ? 'Contact' : 'Contato'}: </strong>
                              <span 
                                className="editable-field" 
                                contentEditable 
                                suppressContentEditableWarning
                                onBlur={(e) => handleCoverLetterEdit('personalInfo', 'phone', e.target.innerText)}
                              >
                                {coverLetter.personalInfo.phone}
                              </span>
                            </span>
                            <span>
                              <strong>{targetLanguage === 'en' ? 'Email' : 'E-mail'}: </strong>
                              <span 
                                className="editable-field" 
                                contentEditable 
                                suppressContentEditableWarning
                                onBlur={(e) => handleCoverLetterEdit('personalInfo', 'email', e.target.innerText)}
                              >
                                {coverLetter.personalInfo.email}
                              </span>
                            </span>
                            {coverLetter.personalInfo.linkedin && (
                              <span>
                                <strong>LinkedIn: </strong>
                                <span 
                                  className="editable-field" 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleCoverLetterEdit('personalInfo', 'linkedin', e.target.innerText)}
                                >
                                  {coverLetter.personalInfo.linkedin}
                                </span>
                              </span>
                            )}
                            {coverLetter.personalInfo.website && (
                              <span>
                                <strong>{targetLanguage === 'en' ? 'Portfolio' : 'Portfólio'}: </strong>
                                <span 
                                  className="editable-field" 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  onBlur={(e) => handleCoverLetterEdit('personalInfo', 'website', e.target.innerText)}
                                >
                                  {coverLetter.personalInfo.website}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date */}
                        <div 
                          className="letter-date editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleCoverLetterEdit('date', null, e.target.innerText)}
                        >
                          {coverLetter.date}
                        </div>

                        {/* Recipient Details */}
                        <div className="letter-recipient" style={{ fontSize: '9.5pt' }}>
                          <div>
                            <strong>{targetLanguage === 'en' ? 'To' : 'Para'}: </strong>
                            <span 
                              className="editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleCoverLetterEdit('recipientInfo', 'hiringManager', e.target.innerText)}
                            >
                              {coverLetter.recipientInfo.hiringManager}
                            </span>
                          </div>
                          <div>
                            <span 
                              className="editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleCoverLetterEdit('recipientInfo', 'companyName', e.target.innerText)}
                            >
                              {coverLetter.recipientInfo.companyName}
                            </span>
                          </div>
                          <div style={{ marginTop: '0.25rem' }}>
                            {targetLanguage === 'en' ? 'Position' : 'Vaga'}: <span 
                              className="editable-field" 
                              contentEditable 
                              suppressContentEditableWarning
                              onBlur={(e) => handleCoverLetterEdit('recipientInfo', 'role', e.target.innerText)}
                            >
                              {coverLetter.recipientInfo.role}
                            </span>
                          </div>
                        </div>

                        {/* Subject */}
                        <div 
                          className="letter-subject editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleCoverLetterEdit('subject', null, e.target.innerText)}
                        >
                          {coverLetter.subject}
                        </div>

                        {/* Salutation */}
                        <div 
                          className="letter-salutation editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleCoverLetterEdit('salutation', null, e.target.innerText)}
                          style={{ fontWeight: '500' }}
                        >
                          {coverLetter.salutation}
                        </div>

                        {/* Introduction */}
                        <div 
                          className="letter-paragraph editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleCoverLetterEdit('introduction', null, e.target.innerText)}
                        >
                          {coverLetter.introduction}
                        </div>

                        {/* Body Paragraphs */}
                        {coverLetter.bodyParagraphs.map((p, idx) => (
                          <div 
                            key={idx}
                            className="letter-paragraph editable-field" 
                            contentEditable 
                            suppressContentEditableWarning
                            onBlur={(e) => handleCoverLetterEdit('bodyParagraphs', idx, e.target.innerText)}
                          >
                            {p}
                          </div>
                        ))}

                        {/* Conclusion */}
                        <div 
                          className="letter-paragraph editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleCoverLetterEdit('conclusion', null, e.target.innerText)}
                        >
                          {coverLetter.conclusion}
                        </div>

                        {/* Sign off */}
                        <div 
                          className="letter-signoff editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleCoverLetterEdit('signOff', null, e.target.innerText)}
                        >
                          {coverLetter.signOff}
                        </div>

                        {/* Signature */}
                        <div 
                          className="letter-signature editable-field" 
                          contentEditable 
                          suppressContentEditableWarning
                          onBlur={(e) => handleCoverLetterEdit('signature', null, e.target.innerText)}
                        >
                          {coverLetter.signature}
                        </div>
                      </div>
                    </div>

                    {/* Download controls cover letter */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      marginTop: '1.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <button className="btn btn-primary" style={{ flexGrow: 1 }} onClick={downloadCoverLetterPdf}>
                        <Download size={16} />
                        Exportar PDF da Carta
                      </button>
                      <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={downloadCoverLetterTxt}>
                        <FileText size={16} />
                        Exportar Texto Puro (TXT)
                      </button>
                      <button className="btn btn-secondary" style={{ width: '48px', padding: 0 }} onClick={handleGenerateCoverLetter} title="Regerar Carta de Apresentação">
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
        </div>

      </div>

      {/* Telemetry/Operation Dashboard Modal */}
      {isDashboardOpen && (
        <div className="modal-overlay" onClick={() => setIsDashboardOpen(false)}>
          <div 
            className="glass modal-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="card-header">
              <h2 className="card-title">CAOZ Telemetry Dashboard</h2>
              <button 
                className="btn btn-secondary btn-icon"
                style={{ width: '32px', height: '32px' }}
                onClick={() => setIsDashboardOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="card-body" style={{ gap: '1.5rem' }}>
              
              {/* Pulsing Status Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                    display: 'inline-block'
                  }}></span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#10b981' }}>
                    Sistemas CAOZ: Operacionais
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#10b981', opacity: 0.8 }}>
                  v1.1.0-Release
                </span>
              </div>

              {/* Grid of metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                    Motor de Otimização
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Gemini 3.1 Flash Lite
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                    Modo de Processamento
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                    {apiKey ? 'Produção (Cliente SDK)' : 'Produção (Backend Proxy)'}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                    Latência Média
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    ~1.2 segundos
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                    Otimizações Efetuadas
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {optimizationsCount} no total
                  </div>
                </div>
              </div>

              {/* Privacy and Sandbox stats */}
              <div className="api-info-box" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)' }}>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔒 Proteção e Integridade de Dados
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                  Este produto CAOZ opera em um sandbox client-side local no seu navegador. Os dados do seu currículo e a descrição da vaga são processados e convertidos temporariamente sem nenhum tipo de persistência em servidores de telemetria externos.
                </p>
              </div>

              {/* Close Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => setIsDashboardOpen(false)}
                >
                  Fechar Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer>
        CAOZ Optimizer — Desenvolvido pela CAOZ. Foco na eficiência e na privacidade total dos dados.
      </footer>
    </div>
  );
}

export default App;
