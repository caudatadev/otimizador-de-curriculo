/**
 * Cloudflare Pages Function - Secure Backend Proxy for Gemini API
 * Route: POST /api/cover-letter
 */

const rateLimitMap = new Map();

const SYSTEM_PROMPT = `
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

export async function onRequestPost(context) {
  const { request, env } = context;

  // Retrieve client IP for Rate Limiting
  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const now = Date.now();

  // Inline cleanup of expired entries in rateLimitMap to prevent memory leaks
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetTime) {
      rateLimitMap.delete(key);
    }
  }

  // Rate Limiting Logic: 5 cover letters per minute per IP
  const rateLimitDuration = 60000; // 1 minute
  const maxRequests = 5;

  let clientLimit = rateLimitMap.get(ip);
  if (!clientLimit) {
    clientLimit = { count: 1, resetTime: now + rateLimitDuration };
    rateLimitMap.set(ip, clientLimit);
  } else {
    if (now > clientLimit.resetTime) {
      clientLimit.count = 1;
      clientLimit.resetTime = now + rateLimitDuration;
    } else {
      clientLimit.count += 1;
    }
  }

  if (clientLimit.count > maxRequests) {
    return new Response(
      JSON.stringify({ error: "Limite de requisições excedido. Por favor, aguarde um minuto antes de tentar novamente." }),
      {
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((clientLimit.resetTime - now) / 1000).toString()
        }
      }
    );
  }

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
    const { resumeText, jobDescription, tone, customInstructions, targetLanguage } = await request.json();

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
    Currículo (Base de dados verídica):
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
          temperature: 0.4
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
