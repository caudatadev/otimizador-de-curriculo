# CAOZ Optimizer 🚀 — Otimizador Inteligente de Currículos para ATS

O **CAOZ Optimizer** é uma aplicação web de alta performance desenvolvida para preparar e otimizar currículos com foco em sistemas **ATS (Applicant Tracking Systems)** como Gupy, Workday, Taleo e Greenhouse. 

O projeto foi construído focando no equilíbrio ideal: **otimização de palavras-chave para algoritmos de IA** e **redação fluida e atraente para recrutadores humanos**, com um design visual premium de nível internacional.

---

## 🌟 Recursos Principais

### 1. Otimização Inteligente com IA (Gemini 3.1 Flash Lite)
* Análise semântica profunda comparando o currículo original com os requisitos da vaga.
* Ingestão orgânica de palavras-chave fundamentais, sem poluir o texto (anti-keyword stuffing).
* Adaptação automática e inteligente de cargos com base em sinônimos de mercado equivalentes.

### 2. Método STAR e Foco em Conquistas
* Reestruturação automática dos tópicos de experiências profissionais no formato **STAR** (Situação, Tarefa, Ação e Resultado).
* Foco em dados, ações verbais ativas e métricas plausíveis para destacar o impacto de cada papel desempenhado.

### 3. Realismo Absoluto e Veracidade (Sem Mentiras)
* Otimização restrita ao histórico real fornecido pelo candidato.
* **Proibido alucinar:** A IA nunca inventará qualificações, cursos ou senioridades que não constem no currículo original. 
* Habilidades exigidas pela vaga e ausentes no perfil do candidato são organizadas e listadas exclusivamente no relatório de lacunas (`atsReport.keywordsMissing`) para autoavaliação.

### 4. Tradução Instantânea via Código (Zero Tokens de IA)
* Otimização inicial executada sempre em português.
* Alternador de idioma (**PT-BR** ⇄ **EN**) operando de forma imediata no frontend via chamada de rotina de código à API de tradução do Google (`gtx`).
* **Cache Inteligente:** Armazena a resposta original para que a reversão de idioma seja instantânea e livre de perdas por traduções múltiplas.

### 5. Edição Dinâmica In-Loco (In-line Editing)
* Qualquer campo de texto do currículo gerado (cargos, resumos, conquistas e habilidades) pode ser editado diretamente na tela de visualização antes de ser exportado.

### 6. Sistema de Validação e Segurança
* **Detecção de URL:** Bloqueia o envio se o usuário colar apenas o link da vaga em vez de sua descrição descritiva.
* **Tamanho Mínimo:** Exige pelo menos 150 caracteres em ambos os inputs para garantir contexto rico.
* **Validação de Uploads:** O parser valida o tamanho (máx. 5MB) e formato (`.pdf`, `.docx`, `.txt`) de arquivos enviados.
* **Rate Limiting no Backend:** Segurança baseada em IP limitando requisições a no máximo **5 otimizações por minuto por usuário**.

---

## 🎨 Design Premium & Estética Visual

A interface segue os padrões modernos de design de interfaces internacionais (estilo Linear/Vercel):
* **Background Glow:** Esferas de luz radiais translúcidas (laranja e roxo) flutuantes com animação contínua.
* **Circular Score Gauge:** Medidor de score ATS circular baseado em SVG e renderizado com animação reativa gradiente.
* **Pulsing CTA:** Brilho neon pulsante no botão principal de otimização quando o sistema está ocioso.
* **Loading Glassmorphic:** Spinner orbital animado acompanhado de uma barra de progresso horizontal e checklists dinâmicos das etapas.
* **Exportação Fiel:** Sistema de exportação para PDF (`html2pdf`) recalibrado para expandir dinamicamente a área útil da página, evitando cortes de rolagem ou grandes lacunas em branco.

---

## 🛠️ Tecnologias Utilizadas

* **Vite + React.js** (Frontend veloz e responsivo)
* **Vanilla CSS + Glassmorphism** (Design adaptativo sem frameworks utilitários)
* **Google Gemini API** (Inteligência Artificial por trás do motor de otimização)
* **Cloudflare Workers / Pages Functions** (Proxy de backend robusto e seguro)
* **pdf.js & Mammoth.js** (Parsers de PDF e Word no client-side)
* **html2pdf.js** (Conversão e download fiel de layouts para PDF)

---

## 🛸 Como foi Desenvolvido (Antigravity)

Este projeto foi cocriado em parceria de pair programming com o **Antigravity**, o assistente de codificação de Inteligência Artificial autônomo do time do **Google DeepMind**. 

O desenvolvimento ocorreu de forma iterativa, onde o Antigravity atuou diretamente na arquitetura de estados do React, na escrita de algoritmos assíncronos de tradução, na validação de inputs e segurança de backend na Cloudflare, e no refino estético e calibração de exportações de mídia.

---

## 🚀 Instalação e Execução Local

1. Clone o repositório para sua máquina local.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure a chave de API do Gemini no seu arquivo `.env`:
   ```env
   VITE_GEMINI_API_KEY=sua_chave_aqui
   ```
4. Inicie o servidor de desenvolvimento local:
   ```bash
   npm run dev
   ```
5. Abra o navegador em: [http://localhost:5173/](http://localhost:5173/)
