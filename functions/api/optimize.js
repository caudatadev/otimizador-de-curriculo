/**
 * Cloudflare Pages Function - Secure Backend Proxy for Gemini API
 * Route: POST /api/optimize
 */

const SYSTEM_PROMPT = `
Você é um especialista em Recrutamento e Seleção e especialista em otimização de Currículos para Sistemas ATS (Applicant Tracking Systems) como Gupy, Greenhouse, Taleo e Workday.
Sua tarefa é analisar o currículo fornecido e a descrição da vaga fornecida, e otimizar o currículo do usuário de forma estratégica.

DIRETRIZ CRÍTICA ABSOLUTA:
- NÃO INCLUA NENHUM EMOJI em nenhuma parte da resposta JSON final. Toda a saída de texto deve ser limpa e profissional.

Diretrizes Críticas para Passar no ATS:
1. Palavras-Chave Importantes: Identifique as habilidades técnicas (Hard Skills), ferramentas, metodologias e certificações exigidas na descrição da vaga. Insira essas palavras-chave de forma natural no resumo profissional, na seção de habilidades e nos bullet points de experiências.
2. Método STAR nos Bullet Points: Para cada experiência profissional, reescreva ou crie bullet points focados em conquistas usando o modelo STAR (Situação, Tarefa, Ação, Resultado). Comece cada frase com um verbo de ação forte. Insira métricas/dados quantitativos sempre que possível.
3. Adaptação de Termos: Alinhe a nomenclatura dos cargos e das habilidades com os termos mais utilizados na vaga.
4. Tom e Estilo: Adapte o tom do currículo de acordo com a opção selecionada.
5. Integridade e Verdade: Otimize a escrita e destaque o que é relevante, mas NÃO invente experiências ou diplomas falsos. Se o usuário não possui uma habilidade técnica crucial exigida pela vaga, coloque um aviso na seção 'atsReport' (keywordsMissing).

Você DEVE retornar a resposta EXATAMENTE no formato JSON com a estrutura especificada.

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

export async function onRequestPost(context) {
  const { request, env } = context;

  // Retrieve the secret API key from Cloudflare Environment variables
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Chave API do Gemini (GEMINI_API_KEY) não configurada no painel da Cloudflare." }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }

  try {
    const { resumeText, jobDescription, tone, customInstructions } = await request.json();

    if (!resumeText || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'resumeText' e 'jobDescription' são obrigatórios." }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

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

    // Make direct HTTP request to Gemini REST API (gemini-3.1-flash-lite)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Erro na API do Gemini: ${errorText}` }),
        { 
          status: response.status, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    const geminiData = await response.json();
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "Gemini não retornou nenhum candidato válido." }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    const textContent = geminiData.candidates[0].content.parts[0].text;

    return new Response(textContent, {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache" 
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Erro interno no servidor de proxy: ${error.message}` }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}
