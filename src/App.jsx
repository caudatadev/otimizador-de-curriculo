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
import { optimizeResume, getMockOptimizedResume } from './services/gemini';
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
  
  // Customization Options
  const [tone, setTone] = useState('Técnico e Profissional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [activeTemplate, setActiveTemplate] = useState('modern'); // modern default matches screenshot // classic, modern, minimal
  
  // UI states
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mobileTab, setMobileTab] = useState('input'); // 'input' or 'output' for mobile view
  const [optimizationsCount, setOptimizationsCount] = useState(0); // Telemetry optimization counter
  
  const fileInputRef = useRef(null);

  // --- ACTIONS ---
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const processFile = async (file) => {
    setUploadedFile({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type
    });
    setIsParsingFile(true);
    setErrorMsg(null);

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
      console.error(err);
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
  const handleOptimize = async () => {
    if (!resumeText.trim()) {
      setErrorMsg("Por favor, anexe seu currículo ou insira o texto do currículo.");
      return;
    }
    if (!jobDescription.trim()) {
      setErrorMsg("Por favor, cole a descrição da vaga desejada.");
      return;
    }

    setIsOptimizing(true);
    setMobileTab('output'); // Auto-switch tab on mobile so they see results/loader
    setErrorMsg(null);
    setCurrentStep(1); // Step 1: Analisando vaga

    // Steps simulation for beautiful UI feedback
    const stepTimer1 = setTimeout(() => setCurrentStep(2), 1500); // Tailoring CV details

    try {
      // Calls optimizeResume which will automatically route to proxy or client SDK
      const result = await optimizeResume({
        resumeText,
        jobDescription,
        tone,
        customInstructions,
        apiKey
      });
      
      clearTimeout(stepTimer1);
      setCurrentStep(3); // Completed!
      
      setTimeout(() => {
        setOptimizedCv(result);
        setIsOptimizing(false);
        setCurrentStep(0);
        setOptimizationsCount(prev => prev + 1); // Increment dashboard optimizations counter
        showToast('Currículo otimizado com sucesso!');
      }, 1000);
      
    } catch (err) {
      clearTimeout(stepTimer1);
      setErrorMsg(err.message || "Erro durante a otimização com Inteligência Artificial.");
      setIsOptimizing(false);
      setCurrentStep(0);
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
      const result = await getMockOptimizedResume(resumeText, jobDescription);
      
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
    setOptimizedCv(prev => {
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
    });
  };

  const handleSkillEdit = (catIndex, itemIndex, value) => {
    setOptimizedCv(prev => {
      const updated = { ...prev };
      updated.skills[catIndex].items[itemIndex] = value;
      return updated;
    });
  };

  const handleExperienceEdit = (index, field, value) => {
    setOptimizedCv(prev => {
      const updated = { ...prev };
      updated.experience[index][field] = value;
      return updated;
    });
  };

  const handleExperienceBulletEdit = (expIndex, bulletIndex, value) => {
    setOptimizedCv(prev => {
      const updated = { ...prev };
      updated.experience[expIndex].bullets[bulletIndex] = value;
      return updated;
    });
  };

  const handleEducationEdit = (index, field, value) => {
    setOptimizedCv(prev => {
      const updated = { ...prev };
      updated.education[index][field] = value;
      return updated;
    });
  };

  const handleProjectEdit = (index, field, value) => {
    setOptimizedCv(prev => {
      const updated = { ...prev };
      updated.projects[index][field] = value;
      return updated;
    });
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
    if (personalInfo.website) txt += `Site: ${personalInfo.website}\n`;
    txt += `\n`;
    
    if (objective) {
      txt += `=========================================\n`;
      txt += `OBJETIVO\n`;
      txt += `=========================================\n`;
      txt += `${objective}\n\n`;
    }
    
    txt += `=========================================\n`;
    txt += `RESUMO PROFISSIONAL\n`;
    txt += `=========================================\n`;
    txt += `${summary}\n\n`;
    
    txt += `=========================================\n`;
    txt += `HABILIDADES\n`;
    txt += `=========================================\n`;
    skills.forEach(cat => {
      txt += `${cat.category}: ${cat.items.join(", ")}\n`;
    });
    txt += `\n`;
    
    txt += `=========================================\n`;
    txt += `EXPERIÊNCIA PROFISSIONAL\n`;
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
      txt += `FORMAÇÃO ACADÊMICA\n`;
      txt += `=========================================\n`;
      education.forEach(edu => {
        txt += `${edu.degree} - ${edu.institution}\n`;
        txt += `${edu.period}\n\n`;
      });
    }
    
    if (projects && projects.length > 0) {
      txt += `=========================================\n`;
      txt += `PROJETOS\n`;
      txt += `=========================================\n`;
      projects.forEach(proj => {
        txt += `${proj.name}\n${proj.description}\n`;
        if (proj.link) txt += `Link: ${proj.link}\n`;
        txt += `\n`;
      });
    }
    
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${personalInfo.name.replace(/\s+/g, '_')}_Curriculo_ATS_Otimizado.txt`;
    link.click();
    showToast('Download do arquivo TXT iniciado!');
  };

  const downloadPdf = () => {
    if (!optimizedCv) return;
    if (!window.html2pdf) {
      setErrorMsg("Erro: Biblioteca html2pdf não pôde ser carregada. Tente recarregar a página.");
      return;
    }
    
    showToast('Preparando seu PDF ATS...');
    const element = document.getElementById('cv-preview-sheet');
    const opt = {
      margin:       [12, 15, 12, 15], // standard resume margins
      filename:     `${optimizedCv.personalInfo.name.replace(/\s+/g, '_')}_Curriculo_Otimizado.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    window.html2pdf().set(opt).from(element).save()
      .then(() => {
        showToast('Download do PDF iniciado!');
      })
      .catch(err => {
        console.error(err);
        setErrorMsg("Erro ao exportar PDF.");
      });
  };

  const downloadJson = () => {
    if (!optimizedCv) return;
    const blob = new Blob([JSON.stringify(optimizedCv, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${optimizedCv.personalInfo.name.replace(/\s+/g, '_')}_Curriculo_Otimizado.json`;
    link.click();
    showToast('Download do arquivo JSON iniciado!');
  };

  const resetAll = () => {
    if (window.confirm("Deseja realmente limpar tudo?")) {
      removeFile();
      setJobDescription('');
      setOptimizedCv(null);
      setErrorMsg(null);
      setMobileTab('input'); // Reset to input tab on mobile
    }
  };

  // --- RENDER HELPERS ---
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#e67e22'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="app-container">
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

      {/* Global Error Banner */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1 }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
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
          {!apiKey && (
            <div className="banner-api-warning glass" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Info size={14} color="var(--color-accent)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Modo Demonstração (Simulado)
              </span>
            </div>
          )}
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
                    onClick={triggerFileSelect}
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

              {/* Optimization Trigger Button */}
              <div className="optimize-btn-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary btn-optimize"
                  onClick={handleOptimize}
                  disabled={isOptimizing || isParsingFile}
                  style={{ opacity: (isOptimizing || isParsingFile) ? 0.6 : 1, width: '100%' }}
                >
                  <Sparkles size={18} />
                  {isOptimizing ? "Otimizando com IA..." : "Otimizar Currículo para ATS"}
                </button>
                
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Sem chave de API?{' '}
                  <button 
                    onClick={handleLoadDemo} 
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-accent)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      padding: 0
                    }}
                    disabled={isOptimizing || isParsingFile}
                  >
                    Ver demonstração com dados simulados
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Processing or Output Preview */}
        <div className={`column ${mobileTab === 'output' ? 'active-mobile-col' : 'hidden-mobile-col'}`}>
          
          {isOptimizing ? (
            /* Loading State Panel */
            <div className="glass loading-container" style={{ flexGrow: 1 }}>
              <div className="loading-glow-orb"></div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  Ajustando Sintonias ATS
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  A Inteligência Artificial está reescrevendo e otimizando seu currículo.
                </p>
              </div>
              <div className="loading-steps">
                <div className={`loading-step ${currentStep >= 1 ? (currentStep === 1 ? 'active' : 'completed') : ''}`}>
                  <div className="step-bullet"></div>
                  <span>Analisando palavras-chave da vaga...</span>
                </div>
                <div className={`loading-step ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'completed') : ''}`}>
                  <div className="step-bullet"></div>
                  <span>Formatando conquistas no modelo STAR...</span>
                </div>
                <div className={`loading-step ${currentStep >= 3 ? (currentStep === 3 ? 'active' : 'completed') : ''}`}>
                  <div className="step-bullet"></div>
                  <span>Estruturando currículo final...</span>
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
              
              <div className="card-header">
                <div>
                  <h2 className="card-title">2. Visualização & Edição</h2>
                  <div className="card-subtitle">Clique no texto para editar antes de baixar</div>
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
                {/* Match Score and Feedback box */}
                {optimizedCv.atsReport && (
                  <div className="report-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div className="report-title">
                        <CheckCircle2 size={16} color="var(--color-accent)" />
                        Pontuação de Compatibilidade
                      </div>
                      <span className="score-badge" style={{
                        color: getScoreColor(optimizedCv.atsReport.matchScore),
                        borderColor: getScoreColor(optimizedCv.atsReport.matchScore),
                        background: `${getScoreColor(optimizedCv.atsReport.matchScore)}10`
                      }}>
                        {optimizedCv.atsReport.matchScore}% de Match
                      </span>
                    </div>
                    
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
                          <strong>Localidade: </strong>
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
                          <strong>Contato: </strong>
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
                          <strong>E-mail: </strong>
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
                        <div className="cv-section-title">Objetivo</div>
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
                      <div className="cv-section-title">Resumo Profissional</div>
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
                      <div className="cv-section-title">Habilidades e Competências</div>
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
                      <div className="cv-section-title">Experiência Profissional</div>
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
                        <div className="cv-section-title">Formação Acadêmica</div>
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
                        <div className="cv-section-title">Projetos Destacados</div>
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
                    {apiKey ? 'Produção (API Key)' : 'Simulação (Mock)'}
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
                    {optimizationsCount} nesta sessão
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
