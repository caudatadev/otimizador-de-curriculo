import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Prompt template designed to optimize the CV to pass ATS screeners.
 */
const SYSTEM_PROMPT = `
Você é um especialista em Recrutamento e Seleção e especialista em otimização de Currículos para Sistemas ATS (Applicant Tracking Systems) como Gupy, Greenhouse, Taleo e Workday.
Sua tarefa é analisar o currículo fornecido e a descrição da vaga fornecida, e otimizar o currículo do usuário de forma estratégica.

DIRETRIZ CRÍTICA ABSOLUTA:
- NÃO INCLUA NENHUM EMOJI em nenhuma parte da resposta JSON final (nem no resumo profissional, nem em habilidades, nem nos bullet points). Emojis podem quebrar a leitura de parses ATS tradicionais e reduzem a formalidade do currículo. Toda a saída de texto deve ser limpa e profissional.

Diretrizes Críticas para Passar no ATS:
1. Palavras-Chave Importantes: Identifique as habilidades técnicas (Hard Skills), ferramentas, metodologias e certificações exigidas na descrição da vaga. Insira essas palavras-chave de forma natural no resumo profissional, na seção de habilidades e nos bullet points de experiências.
2. Método STAR nos Bullet Points: Para cada experiência profissional, reescreva ou crie bullet points focados em conquistas usando o modelo STAR (Situação, Tarefa, Ação, Resultado). Comece cada frase com um verbo de ação forte (Ex: "Desenvolvi", "Liderei", "Otimizei", "Aumentei"). Insira métricas/dados quantitativos sempre que possível.
3. Adaptação de Termos: Alinhe a nomenclatura dos cargos e das habilidades com os termos mais utilizados na vaga (ex: se a vaga pede "React.js" e o currículo diz "React", utilize "React.js").
4. Tom e Estilo: Adapte o tom do currículo de acordo com a opção selecionada.
5. Integridade e Verdade: Otimize a escrita e destaque o que é relevante, mas NÃO invente experiências ou diplomas falsos. Se o usuário não possui uma habilidade técnica crucial exigida pela vaga, coloque um aviso na seção 'atsReport' (keywordsMissing) em vez de inventar no currículo.

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
export async function optimizeResume({ resumeText, jobDescription, tone, customInstructions, apiKey }) {
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

    Gere o currículo otimizado no formato JSON especificado no prompt do sistema.
    `;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: SYSTEM_PROMPT,
      });

      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Erro na API do Gemini:", error);
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
        body: JSON.stringify({ resumeText, jobDescription, tone, customInstructions })
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
      console.error("Erro ao chamar o proxy backend:", error);
      throw new Error(error.message || "Não foi possível conectar ao servidor de otimização.");
    }
  }
}

/**
 * High-fidelity mock data generator for Demo Mode matching the Cauan Ferreira screenshot exactly
 */
export function getMockOptimizedResume(resumeText, jobDescription) {
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
