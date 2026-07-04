import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Prompt template designed to optimize the CV to pass ATS screeners.
 */
const SYSTEM_PROMPT = `
Você é um especialista em Recrutamento e Seleção e especialista em otimização de Currículos para Sistemas ATS (Applicant Tracking Systems) como Gupy, Greenhouse, Taleo e Workday.
Sua tarefa é analisar o currículo fornecido e a descrição da vaga fornecida, e otimizar o currículo do usuário de forma estratégica.

DIRETRIZ DE REALISMO E DESIGN PARA HUMANOS E ROBÔS (ATS):
O currículo otimizado deve ser estruturado de forma a atingir a pontuação máxima no rastreador ATS (utilizando palavras-chave e a estrutura correta), mas deve ser escrito com um tom natural, fluido e profissional para o recrutador humano. Evite repetições exaustivas ou artificiais de termos técnicos. O currículo deve contar uma história profissional sólida (storytelling), focada em conquistas e impacto real, baseada exclusivamente na história de carreira verídica fornecida no currículo original.

DIRETRIZ CRÍTICA ABSOLUTA:
- NÃO INCLUA NENHUM EMOJI em nenhuma parte da resposta JSON final (nem no resumo profissional, nem em habilidades, nem nos bullet points). Emojis podem quebrar a leitura de parses ATS tradicionais e reduzem a formalidade do currículo. Toda a saída de texto deve ser limpa e profissional.

Diretrizes Críticas para Passar no ATS (Fidelidade e Realismo):
1. Palavras-Chave Importantes: Identifique as habilidades técnicas (Hard Skills), ferramentas, metodologias e certificações exigidas na descrição da vaga. Insira essas palavras-chave de forma natural e orgânica no resumo profissional, na seção de habilidades e nos bullet points, mas APENAS se elas já existirem ou puderem ser logicamente fundamentadas nas experiências e habilidades reais descritas no currículo original. NÃO invente conhecimentos nem sobrecarregue o texto artificialmente (sem keyword stuffing).
2. Acrônimos e Termos por Extenso: Sempre que aplicável, utilize a forma abreviada (acrônimo/sigla) junto com o termo por extenso (Ex: "SEO (Search Engine Optimization)", "TI (Tecnologia da Informação)", "API (Application Programming Interface)") para maximizar as chances de indexação em qualquer termo buscado pelo recrutador no ATS.
3. Método STAR nos Bullet Points: Para cada experiência profissional, reescreva ou crie bullet points focados em conquistas usando o modelo STAR (Situação, Tarefa, Ação, Resultado). Comece cada frase com um verbo de ação forte (Ex: "Liderei", "Otimizei", "Desenvolvi", "Implementei"). Descreva a ação e o benefício gerado (Ex: "reduzindo tempo de carregamento em 30%"), mantendo um tom realista e profissional.
4. Nomenclatura e Sinônimos de Cargos: Alinhe o título dos cargos e as habilidades com os termos mais utilizados na vaga (ex: se a vaga pede "React.js" e o currículo diz "React", utilize "React.js"; se o cargo histórico for um sinônimo direto equivalente, você pode ajustar, por exemplo, de "Programador" para "Desenvolvedor de Software"). NUNCA altere o nível de senioridade ou a área de atuação do cargo real (ex: não mude "Estagiário" para "Líder de Projetos", ou "Suporte Técnico" para "Engenheiro de Dados"). O currículo deve ser 100% verídico.
5. Tom e Estilo: Adapte o tom do currículo de acordo com a opção selecionada. Se a opção for "Iniciante / Entry-Level", o currículo deve focar no potencial de crescimento, projetos acadêmicos/pessoais, facilidade de aprendizado e habilidades fundamentais, sem forçar senioridades, liderança de grandes times ou anos excessivos de experiência que o candidato não possui (evitando parecer um executivo sênior).
6. Idioma de Saída: O currículo deve ser otimizado e gerado sempre em Português do Brasil (PT-BR). As chaves do JSON devem permanecer sempre em inglês exatamente como especificado na estrutura abaixo.
7. Realismo Absoluto e Veracidade (Sem Mentiras): O currículo final deve refletir de maneira fiel o histórico real do cliente. NÃO invente, sob qualquer pretexto, nenhuma experiência de trabalho, empresa, cargo, período de trabalho, projeto, competência técnica ou formação acadêmica que não conste explicitamente no currículo original. É terminantemente proibido criar qualificações artificiais para bater com as exigências da vaga. Se o candidato não possuir uma habilidade crucial solicitada na vaga, liste-a obrigatoriamente e exclusivamente no relatório de compatibilidade (atsReport.keywordsMissing), para que ele saiba da falta, sem poluir o currículo com informações falsas.

Você DEVE retornar a resposta EXATAMENTE no formato JSON com a estrutura especificada. Não adicione markdown adicional de código (como \`\`\`json) fora do JSON final retornado pelo SDK do Gemini (como estamos usando responseMimeType: "application/json", retorne apenas o objeto JSON puro).

A estrutura do JSON de saída deve ser:
{
  "personalInfo": {
    "name": "Nome Completo (Mantenha o original)",
    "email": "E-mail (Mantenha o original)",
    "phone": "Telefone (Mantenha o original)",
    "location": "Cidade/Estado ou Endereço (Mantenha o original)",
    "linkedin": "Link do LinkedIn (Mantenha o original)",
    "website": "Portfólio ou Site (Mantenha o original)"
  },
  "objective": "Objetivo profissional (Opcional, ex: Estagiário ou Engenheiro de Dados Júnior. Máximo 1 ou 2 linhas). Foco em concisão, SEM emojis.",
  "summary": "Resumo profissional otimizado (cerca de 3 a 5 linhas), focado nas habilidades e palavras-chave da vaga e alinhado com o tom selecionado. SEM emojis.",
  "skills": [
    {
      "category": "Ex: Habilidades Técnicas, Ferramentas, Idiomas",
      "items": ["Item A", "Item B", "Item C"]
    }
  ],
  "experience": [
    {
      "company": "Nome da Empresa",
      "role": "Cargo Otimizado (Alinhado com o título da vaga se pertinente)",
      "location": "Localização da empresa",
      "period": "Período (Ex: Jan de 2021 - Presente)",
      "bullets": [
        "Bullet point 1 reescrito no formato STAR usando palavras-chave fortes da vaga.",
        "Bullet point 2 reescrito no formato STAR usando palavras-chave fortes da vaga."
      ]
    }
  ],
  "education": [
    {
      "institution": "Nome da Instituição",
      "degree": "Curso / Grau obtido",
      "period": "Período (Ex: 2018 - 2022)"
    }
  ],
  "projects": [
    {
      "name": "Nome do Projeto (Opcional)",
      "description": "Breve descrição focada em conquistas técnicas e palavras-chave.",
      "link": "Link (opcional)"
    }
  ],
  "atsReport": {
    "matchScore": 85,
    "keywordsMatched": ["palavra-chave-1", "palavra-chave-2"],
    "keywordsMissing": ["palavra-chave-exigida-mas-nao-presente-no-cv-original"],
    "recommendations": [
      "Recomendação de melhoria ou dica para entrevista 1",
      "Recomendação de melhoria ou dica para entrevista 2"
    ]
  }
}
`;

/**
 * Call the Gemini API to optimize a resume.
 */
export async function optimizeResume({ resumeText, jobDescription, tone, customInstructions, targetLanguage = 'pt', apiKey }) {
  // If an API key is provided locally (e.g. from local .env or dev), use the direct client-side SDK call
  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-3.1-flash-lite for maximum speed and cost-efficiency
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    });

    const prompt = `
    Currículo Original:
    """
    ${resumeText}
    """

    Descrição da Vaga:
    """
    ${jobDescription}
    """

    Parâmetros de Otimização:
    - Tom do currículo: ${tone || "Técnico e Direto"}
    - Instruções Customizadas Adicionais: ${customInstructions || "Nenhuma específica."}
    - Idioma de Destino: Português do Brasil (PT-BR)

    Gere o currículo otimizado no formato JSON especificado no prompt do sistema em português.
    `;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: SYSTEM_PROMPT,
      });

      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error) {
      console.error("[ERRO CLIENT-SDK GEMINI] Erro na chamada direta da API do Gemini:", error);
      throw new Error(error.message || "Erro desconhecido ao processar currículo no Gemini.");
    }
  } else {
    // If no client-side key, call our secure Cloudflare serverless proxy function (/api/optimize)
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resumeText, jobDescription, tone, customInstructions, targetLanguage: 'pt' })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch(e) {}
        throw new Error(parsedError?.error || `Erro no servidor backend proxy (Status: ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error("[ERRO PROXY BACKEND] Erro ao conectar ou processar requisição no endpoint /api/optimize:", error);
      throw new Error(error.message || "Não foi possível conectar ao servidor de otimização.");
    }
  }
}

/**
 * High-fidelity mock data generator for Demo Mode matching the Cauan Ferreira screenshot exactly
 */
export function getMockOptimizedResume(resumeText, jobDescription, targetLanguage = 'pt') {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        personalInfo: {
          name: "Cauan Ferreira",
          email: "cauandatadev@gmail.com",
          phone: "(11) 91256-4650",
          location: "Guarulhos, SP",
          linkedin: "linkedin.com/in/cauan-ferreira",
          website: "github.com/caudatadev"
        },
        objective: "Busco minha primeira oportunidade como Estagiário ou Engenheiro de Dados Júnior. Meu objetivo é colaborar na construção, manutenção e automação de fluxos de dados, aplicando meus conhecimentos práticos em SQL, Python e modelagem de bancos de dados relacionais.",
        summary: "Sou estudante de Análise e Desenvolvimento de Sistemas e o tipo de pessoa que aprende executando na prática. Descobri que minha verdadeira paixão na área de tecnologia está na infraestrutura e na fundação: desenhar o caminho que o dado faz, garantir que as tabelas sejam bem modeladas e estruturar automações que facilitem o fluxo de informações.",
        skills: [
          {
            category: "Linguagens de Programação",
            items: ["SQL (consultas intermediárias, JOINS, agregações e manipulação)", "Python (scripts, automação e análise de dados com Pandas)"]
          },
          {
            category: "Bancos de Dados & Infraestrutura",
            items: ["PostgreSQL", "Supabase", "Modelagem de Bancos de Dados Relacionais", "Git & GitHub"]
          }
        ],
        experience: [
          {
            company: "Dados Por Todos (Comunidade)",
            role: "Desenvolvedor de Dados Voluntário",
            location: "Remoto",
            period: "Janeiro de 2025 - Presente",
            bullets: [
              "Estruturei a modelagem de tabelas relacionais do banco PostgreSQL e integrei serviços do Supabase no backend para a centralização de registros dos membros da comunidade.",
              "Automatizei rotinas de extração de dados brutos utilizando scripts em Python, reduzindo o tempo de ingestão manual de planilhas em 75%.",
              "Colaborei ativamente no controle de versão no GitHub, criando documentação de esquemas do banco de dados e ritos de commits organizados."
            ]
          }
        ],
        education: [
          {
            institution: "Faculdade de Tecnologia",
            degree: "Tecnólogo em Análise e Desenvolvimento de Sistemas",
            period: "2024 - 2026"
          }
        ],
        projects: [
          {
            name: "Pipeline de Dados ETL Automatizado",
            description: "Projeto prático de ETL com Python e PostgreSQL. Extração de informações públicas via API, limpeza de nulos com Pandas e carga incremental programada em banco relacional, garantindo integridade de dados.",
            link: "github.com/caudatadev/etl-pipeline"
          }
        ],
        atsReport: {
          matchScore: 95,
          keywordsMatched: ["SQL", "Python", "PostgreSQL", "Supabase", "Modelagem de dados", "GitHub", "Automação", "ETL"],
          keywordsMissing: ["Docker", "Airflow"],
          recommendations: [
            "Excelente otimização do perfil técnico sem uso de emojis, ideal para sistemas de parse de dados.",
            "As palavras-chave fundamentais como SQL e PostgreSQL estão distribuídas de forma inteligente nas conquistas das experiências.",
            "Para entrevistas de Engenheiro de Dados Júnior ou Estágio: esteja preparado para desenhar a estrutura de tabelas relacionais em quadro branco, demonstrando o uso prático de chaves primárias e estrangeiras."
          ]
        }
      });
    }, 2500); // Simulate network latency
  });
}

/**
 * Unofficial client-side translation using Google Translate gtx endpoint.
 * This runs entirely via javascript code and does not call any AI models.
 */
async function translateText(text, fromLang, toLang) {
  if (!text || !text.trim()) return text;
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error("Translation failed");
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
    return text;
  } catch (e) {
    console.error("[ERRO HTTP GOOGLE TRANSLATE] Falha ao conectar ou decodificar API gtx:", e);
    return text;
  }
}

export async function translateResumeObj(cvObj, targetLanguage) {
  const fromLang = targetLanguage === 'en' ? 'pt' : 'en';
  const toLang = targetLanguage === 'en' ? 'en' : 'pt';
  
  const t = async (text) => {
    if (!text || typeof text !== 'string' || !text.trim() || /^\d+$/.test(text)) return text;
    if (text.includes('@') || text.includes('http') || text.includes('.com')) return text;
    return await translateText(text, fromLang, toLang);
  };

  const newCvObj = JSON.parse(JSON.stringify(cvObj));

  if (newCvObj.objective) {
    newCvObj.objective = await t(newCvObj.objective);
  }
  if (newCvObj.summary) {
    newCvObj.summary = await t(newCvObj.summary);
  }
  
  if (newCvObj.skills) {
    for (let i = 0; i < newCvObj.skills.length; i++) {
      newCvObj.skills[i].category = await t(newCvObj.skills[i].category);
      if (newCvObj.skills[i].items) {
        newCvObj.skills[i].items = await Promise.all(
          newCvObj.skills[i].items.map(item => t(item))
        );
      }
    }
  }

  if (newCvObj.experience) {
    for (let i = 0; i < newCvObj.experience.length; i++) {
      newCvObj.experience[i].role = await t(newCvObj.experience[i].role);
      newCvObj.experience[i].location = await t(newCvObj.experience[i].location);
      if (newCvObj.experience[i].bullets) {
        newCvObj.experience[i].bullets = await Promise.all(
          newCvObj.experience[i].bullets.map(b => t(b))
        );
      }
    }
  }

  if (newCvObj.education) {
    for (let i = 0; i < newCvObj.education.length; i++) {
      newCvObj.education[i].degree = await t(newCvObj.education[i].degree);
      newCvObj.education[i].institution = await t(newCvObj.education[i].institution);
    }
  }

  if (newCvObj.projects) {
    for (let i = 0; i < newCvObj.projects.length; i++) {
      newCvObj.projects[i].name = await t(newCvObj.projects[i].name);
      newCvObj.projects[i].description = await t(newCvObj.projects[i].description);
    }
  }

  if (newCvObj.atsReport) {
    if (newCvObj.atsReport.recommendations) {
      newCvObj.atsReport.recommendations = await Promise.all(
        newCvObj.atsReport.recommendations.map(r => t(r))
      );
    }
    if (newCvObj.atsReport.keywordsMissing) {
      newCvObj.atsReport.keywordsMissing = await Promise.all(
        newCvObj.atsReport.keywordsMissing.map(k => t(k))
      );
    }
    if (newCvObj.atsReport.keywordsMatched) {
      newCvObj.atsReport.keywordsMatched = await Promise.all(
        newCvObj.atsReport.keywordsMatched.map(k => t(k))
      );
    }
  }

  return newCvObj;
}

export async function translateCoverLetterObj(letterObj, targetLanguage) {
  const fromLang = targetLanguage === 'en' ? 'pt' : 'en';
  const toLang = targetLanguage === 'en' ? 'en' : 'pt';
  
  const t = async (text) => {
    if (!text || typeof text !== 'string' || !text.trim() || /^\d+$/.test(text)) return text;
    if (text.includes('@') || text.includes('http') || text.includes('.com')) return text;
    return await translateText(text, fromLang, toLang);
  };

  const newLetter = JSON.parse(JSON.stringify(letterObj));

  if (newLetter.recipientInfo) {
    newLetter.recipientInfo.companyName = await t(newLetter.recipientInfo.companyName);
    newLetter.recipientInfo.hiringManager = await t(newLetter.recipientInfo.hiringManager);
    newLetter.recipientInfo.role = await t(newLetter.recipientInfo.role);
  }
  if (newLetter.date) {
    newLetter.date = await t(newLetter.date);
  }
  if (newLetter.subject) {
    newLetter.subject = await t(newLetter.subject);
  }
  if (newLetter.salutation) {
    newLetter.salutation = await t(newLetter.salutation);
  }
  if (newLetter.introduction) {
    newLetter.introduction = await t(newLetter.introduction);
  }
  if (newLetter.bodyParagraphs) {
    newLetter.bodyParagraphs = await Promise.all(
      newLetter.bodyParagraphs.map(p => t(p))
    );
  }
  if (newLetter.conclusion) {
    newLetter.conclusion = await t(newLetter.conclusion);
  }
  if (newLetter.signOff) {
    newLetter.signOff = await t(newLetter.signOff);
  }
  if (newLetter.signature) {
    newLetter.signature = await t(newLetter.signature);
  }

  return newLetter;
}

/**
 * Cover Letter System Prompt template designed to write high-converting cover letters.
 */
const COVER_LETTER_SYSTEM_PROMPT = `
Você é um especialista em Recrutamento e Seleção, recolocação profissional sênior e redator profissional de cartas de apresentação (Cover Letters) de alta conversão.
Sua tarefa é analisar o currículo do usuário e a descrição da vaga fornecida, extrair o perfil profissional do candidato, entender as necessidades e dores da vaga, e redigir uma Carta de Apresentação personalizada de altíssimo impacto estratégico.

DIRETRIZ DE EQUILÍBRIO ATS (ROBÔS) VS. RECRUTADOR (HUMANOS):
- Foco em Robôs (ATS): Identifique as palavras-chave críticas (hard skills, ferramentas, conceitos técnicos) na descrição da vaga e incorpore-as de forma orgânica e estruturada ao longo da carta. Use formatação limpa e profissional nas seções, garantindo que o texto seja legível e indexável.
- Foco em Humanos (Recrutadores): Evite repetições exaustivas ou listas artificiais de termos. A carta deve contar uma história profissional convincente (storytelling), demonstrando entusiasmo genuíno, tom confiante e escrita extremamente fluida, humana, articulada e natural. Não utilize frases prontas ou genéricas.

DIRETRIZES DE CONTEÚDO E ESTRUTURA (AIDA AVANÇADO):
1. Perfil do Candidato: Extraia as principais competências técnicas, experiências práticas e projetos relevantes descritos no currículo original. Não tente resumir todo o currículo; em vez disso, selecione os 2 ou 3 aspectos de maior valor e impacto do perfil que se encaixam como uma luva nos requisitos da vaga.
2. Alinhamento com a Vaga: Analise a descrição da vaga para entender qual é o maior desafio ou painel de responsabilidades daquela posição. Conecte as dores dessa oportunidade com as soluções práticas que o candidato já entregou em seu histórico real.
3. Atenção (Attention): Comece com uma saudação formal e parágrafo de introdução focado no interesse explícito pela vaga, declarando a identidade profissional e demonstrando entusiasmo pela cultura ou missão da empresa.
4. Interesse & Desejo (Interest & Desire): Nos parágrafos do corpo, aprofunde-se no storytelling profissional do candidato. Detalhe conquistas reais e práticas, conectando as competências técnicas e operacionais (extraídas do currículo) aos desafios e à stack de ferramentas exigida pela vaga.
5. Ação (Action): Conclua com um encerramento polido, agradecendo a consideração e expressando abertura imediata para uma conversa ou entrevista presencial/remota para debater o valor que o candidato pode trazer ao time.

DIRETRIZES CRÍTICAS ABSOLUTAS:
- REALISMO TOTAL: É proibido sob qualquer pretexto inventar ou extrapolar experiências de trabalho, empresas, cargos, períodos, projetos ou competências técnicas que não constem explicitamente no currículo fornecido. A carta deve ser 100% verídica.
- NÃO INCLUA NENHUM EMOJI no JSON final para assegurar total profissionalismo perante parsers de e-mail e ATS.
- O idioma de saída deve ser o solicitado pelo parâmetro 'targetLanguage' (Português do Brasil ou Inglês). As chaves do JSON devem permanecer sempre em inglês exatamente como especificado na estrutura abaixo.

Você DEVE retornar a resposta EXATAMENTE no formato JSON com a estrutura especificada.

A estrutura do JSON de saída deve ser:
{
  "personalInfo": {
    "name": "Nome Completo (do currículo)",
    "email": "E-mail (do currículo)",
    "phone": "Telefone (do currículo)",
    "location": "Cidade/Estado (do currículo)",
    "linkedin": "LinkedIn (do currículo, se existir)",
    "website": "Portfólio ou GitHub (do currículo, se existir)"
  },
  "recipientInfo": {
    "companyName": "Nome da Empresa da vaga (se identificável na descrição, senão utilize 'Empresa')",
    "hiringManager": "Nome do Recrutador/Gestor (se identificável na descrição, senão utilize 'Equipe de Atração de Talentos')",
    "role": "Título da Vaga (ex: Engenheiro de Dados Júnior)"
  },
  "date": "Data atual por extenso (ex: 4 de Julho de 2026)",
  "subject": "Assunto da Carta (ex: Candidatura à vaga de [Nome da Vaga] na [Empresa])",
  "salutation": "Saudação formal (ex: Prezada Equipe de Atração de Talentos da [Empresa] ou Prezado(a) [Nome do Gestor],)",
  "introduction": "Primeiro parágrafo de introdução conectando o candidato à oportunidade, expressando o perfil profissional principal e o entusiasmo com a empresa.",
  "bodyParagraphs": [
    "Segundo parágrafo detalhando conquistas, stack e experiências reais do currículo alinhadas de forma profunda às principais exigências técnicas/negócios da vaga.",
    "Terceiro parágrafo articulando projetos específicos ou habilidades complementares que demonstrem como o candidato ajudará a resolver os desafios imediatos daquela vaga."
  ],
  "conclusion": "Quarto parágrafo de fechamento, reiterando o interesse em agendar uma entrevista técnica/comportamental e agradecendo pela atenção.",
  "signOff": "Fechamento formal (ex: Atenciosamente,)",
  "signature": "Nome Completo (do candidato)"
}
`;

/**
 * Call the Gemini API to generate a cover letter.
 */
export async function generateCoverLetter({ resumeText, jobDescription, tone, customInstructions, targetLanguage = 'pt', apiKey }) {
  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-3.1-flash-lite for maximum speed and cost-efficiency
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      }
    });

    const prompt = `
    Currículo:
    """
    ${resumeText}
    """

    Descrição da Vaga:
    """
    ${jobDescription}
    """

    Parâmetros da Carta de Apresentação:
    - Tom: ${tone || "Profissional e Persuasivo"}
    - Instruções Customizadas Adicionais: ${customInstructions || "Nenhuma específica."}
    - Idioma de Destino: ${targetLanguage === 'en' ? "Inglês (EN)" : "Português do Brasil (PT-BR)"}

    Gere a Carta de Apresentação em formato JSON contendo a estrutura exata solicitada nas instruções de sistema, traduzindo todo o conteúdo textual do JSON para o idioma de destino solicitado.
    `;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: COVER_LETTER_SYSTEM_PROMPT,
      });

      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error) {
      console.error("[ERRO CLIENT-SDK GEMINI COVER LETTER] Erro na chamada direta da API do Gemini:", error);
      throw new Error(error.message || "Erro desconhecido ao gerar carta de apresentação no Gemini.");
    }
  } else {
    // If no client-side key, call our secure Cloudflare serverless proxy function (/api/cover-letter)
    try {
      const response = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resumeText, jobDescription, tone, customInstructions, targetLanguage })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch(e) {}
        throw new Error(parsedError?.error || `Erro no servidor backend proxy (Status: ${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error("[ERRO PROXY BACKEND COVER LETTER] Erro ao conectar ou processar requisição no endpoint /api/cover-letter:", error);
      throw new Error(error.message || "Não foi possível conectar ao servidor de geração de carta.");
    }
  }
}

/**
 * High-fidelity mock data generator for Cover Letter in Demo Mode
 */
export function getMockCoverLetter(resumeText, jobDescription, targetLanguage = 'pt') {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        personalInfo: {
          name: "Cauan Ferreira",
          email: "cauandatadev@gmail.com",
          phone: "(11) 91256-4650",
          location: "Guarulhos, SP",
          linkedin: "linkedin.com/in/cauan-ferreira",
          website: "github.com/caudatadev"
        },
        recipientInfo: {
          companyName: "Empresa de Tecnologia S.A.",
          hiringManager: "Equipe de Recrutamento",
          role: "Estagiário ou Engenheiro de Dados Júnior"
        },
        date: new Date().toLocaleDateString(targetLanguage === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
        subject: targetLanguage === 'en' ? "Application for Junior Data Engineer / Intern Position" : "Candidatura à vaga de Engenheiro de Dados Júnior / Estagiário",
        salutation: targetLanguage === 'en' ? "Dear Recruiting Team at Tech Corporation," : "Prezada Equipe de Recrutamento da Empresa de Tecnologia S.A.,",
        introduction: targetLanguage === 'en' 
          ? "It is with great enthusiasm that I submit my application for the Junior Data Engineer or Intern opportunity. I follow your company's path of innovation and identify strongly with the focus on building solid data foundations to drive strategic decisions. I believe that my hands-on dedication and skills in data modeling can make an immediate contribution to the team."
          : "É com grande entusiasmo que apresento minha candidatura para a oportunidade de Estagiário ou Engenheiro de Dados Júnior. Acompanho a trajetória de inovação da empresa e me identifico fortemente com o foco em estruturação de dados sólidos como base para decisões estratégicas. Acredito que minha dedicação prática e habilidades em modelagem de dados podem contribuir de forma imediata para o time.",
        bodyParagraphs: targetLanguage === 'en' ? [
          "As an Analysis and Systems Development student, I have focused my technical preparation on the foundation and infrastructure of data. In my volunteer work at the 'Dados Por Todos' community, I structured the relational PostgreSQL database and integrated Supabase services. This hands-on experience allowed me to design efficient tables, apply complex JOINS, and ensure structural integrity of information from end to end.",
          "In addition to modeling, I developed Python scripts to automate raw data extraction and loading (ETL), saving 75% of the time previously spent on manual spreadsheet processing. I am a pragmatic and results-oriented professional, always looking to understand the data journey to optimize workflows and ensure that clean, reliable data reaches those who need it."
        ] : [
          "Como estudante de Análise e Desenvolvimento de Sistemas, tenho focado minha preparação técnica na fundação e na infraestrutura de dados. Em meu trabalho voluntário na comunidade Dados Por Todos, liderei a estruturação do banco de dados relacional PostgreSQL e integrei serviços do Supabase. Essa experiência prática me permitiu desenhar tabelas eficientes, aplicar JOINS complexos e garantir a integridade estrutural das informações de ponta a ponta.",
          "Além da modelagem, desenvolvi scripts em Python para automatizar a extração e carga de dados brutos (ETL), reduzindo o tempo de ingestão manual de planilhas em 75%. Sou uma pessoa pragmática e focada em resultados, que busca sempre entender a jornada do dado para otimizar processos e garantir que a informação chegue limpa e confiável a quem dela precisa."
        ],
        conclusion: targetLanguage === 'en'
          ? "Thank you for the opportunity to present my professional background. I remain available for a technical interview, where I can demonstrate in detail the automation projects I developed and how I plan to add value to your data team's challenges."
          : "Agradeço a oportunidade de apresentar meu histórico profissional e fico à disposição para uma entrevista técnica, onde poderei demonstrar em detalhes os projetos de automação que desenvolvi e como pretendo agregar valor aos desafios do time de dados.",
        signOff: targetLanguage === 'en' ? "Sincerely," : "Atenciosamente,",
        signature: "Cauan Ferreira"
      });
    }, 2000);
  });
}
