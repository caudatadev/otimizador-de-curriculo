/**
 * Cloudflare Pages Function - Secure Backend Proxy for Gemini API
 * Route: POST /api/optimize
 */

const rateLimitMap = new Map();

const SYSTEM_PROMPT = `
Você é um especialista em Recrutamento e Seleção e especialista em otimização de Currículos para Sistemas ATS (Applicant Tracking Systems) como Gupy, Greenhouse, Taleo e Workday.
Sua tarefa é analisar o currículo fornecido e a descrição da vaga fornecida, e otimizar o currículo do usuário de forma estratégica.

DIRETRIZ DE REALISMO E DESIGN PARA HUMANOS E ROBÔS (ATS):
O currículo otimizado deve ser estruturado de forma a atingir a pontuação máxima no rastreador ATS (utilizando palavras-chave e a estrutura correta), mas deve ser escrito com um tom natural, fluido e profissional para o recrutador humano. Evite repetições exaustivas ou artificiais de termos técnicos. O currículo deve contar uma história profissional sólida (storytelling), focada em conquistas e impacto real, baseada exclusivamente na história de carreira verídica fornecida no currículo original.

DIRETRIZ CRÍTICA ABSOLUTA:
- NÃO INCLUA NENHUM EMOJI em nenhuma parte da resposta JSON final. Toda a saída de texto deve ser limpa e profissional.

Diretrizes Críticas para Passar no ATS (Fidelidade e Realismo):
1. Palavras-Chave Importantes: Identifique as habilidades técnicas (Hard Skills), ferramentas, metodologias e certificações exigidas na descrição da vaga. Insira essas palavras-chave de forma natural e orgânica no resumo profissional, na seção de habilidades e nos bullet points, mas APENAS se elas já existirem ou puderem ser logicamente fundamentadas nas experiências e habilidades reais descritas no currículo original. NÃO invente conhecimentos nem sobrecarregue o texto artificialmente (sem keyword stuffing).
2. Acrônimos e Termos por Extenso: Sempre que aplicável, utilize a forma abreviada (acrônimo/sigla) junto com o termo por extenso (Ex: "SEO (Search Engine Optimization)", "TI (Tecnologia da Informação)", "API (Application Programming Interface)") para maximizar as chances de indexação em qualquer termo buscado pelo recrutador no ATS.
3. Método STAR nos Bullet Points: Para cada experiência profissional, reescreva ou crie bullet points focados em conquistas usando o modelo STAR (Situação, Tarefa, Ação, Resultado). Comece cada frase com um verbo de ação forte. Descreva a ação e o benefício gerado (Ex: "reduzindo custos e otimizando a velocidade"), mantendo um tom realista, fluido e profissional.
4. Nomenclatura e Sinônimos de Cargos: Alinhe o título dos cargos e as habilidades com os termos mais utilizados na vaga (ex: se a vaga pede "React.js" e o currículo diz "React", utilize "React.js"; se o cargo histórico for um sinônimo direto equivalente, você pode ajustar, por exemplo, de "Programador" para "Desenvolvedor de Software"). NUNCA altere o nível de senioridade ou a área de atuação do cargo real (ex: não mude "Estagiário" para "Líder de Projetos", ou "Suporte Técnico" para "Engenheiro de Dados"). O currículo deve ser 100% verídico.
5. Tom e Estilo: Adapte o tom do currículo de acordo com a opção selecionada. Se a opção for "Iniciante / Entry-Level", o currículo deve focar no potencial de crescimento, projetos acadêmicos/pessoais, facilidade de aprendizado e habilidades fundamentais, sem forçar senioridades, liderança de grandes times ou anos excessivos de experiência que o candidato não possui (evitando parecer um executivo sênior).
6. Idioma de Saída: O currículo deve ser otimizado e gerado sempre em Português do Brasil (PT-BR). As chaves do JSON devem permanecer sempre em inglês exatamente como especificado na estrutura abaixo.
7. Realismo Absoluto e Veracidade (Sem Mentiras): O currículo final deve refletir de maneira fiel o histórico real do cliente. NÃO invente, sob qualquer pretexto, nenhuma experiência de trabalho, empresa, cargo, período de trabalho, projeto, competência técnica ou formação acadêmica que não conste explicitamente no currículo original. É terminantemente proibido criar qualificações artificiais para bater com as exigências da vaga. Se o candidato não possuir uma habilidade crucial solicitada na vaga, liste-a obrigatoriamente e exclusivamente no relatório de compatibilidade (atsReport.keywordsMissing), para que ele saiba da falta, sem poluir o currículo com informações falsas.

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

  // Retrieve client IP for Rate Limiting
  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const now = Date.now();

  // Inline cleanup of expired entries in rateLimitMap to prevent memory leaks
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetTime) {
      rateLimitMap.delete(key);
    }
  }

  // Rate Limiting Logic: 5 optimizations per minute per IP
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
    - Idioma de Destino do Currículo Otimizado: ${targetLanguage === 'en' ? "Inglês (EN)" : "Português do Brasil (PT-BR)"}

    Gere o currículo otimizado no formato JSON especificado no prompt do sistema, traduzindo e adaptando o conteúdo textual inteiramente para o idioma de destino solicitado.
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
