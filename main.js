document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente carregado e analisado.');

    // --- SELEÇÃO DE ELEMENTOS EXISTENTES ---
    const folderPicker = document.getElementById('folder-picker');
    const promptGrid = document.getElementById('prompt-grid');
    const copyToastEl = document.getElementById('copy-toast');
    const copyToast = new bootstrap.Toast(copyToastEl);

    // --- SELEÇÃO DE ELEMENTOS DO MODAL DE CRIAÇÃO ---
    const generatePromptBtn = document.getElementById('generate-prompt-btn');
    const savePromptBtn = document.getElementById('save-prompt-btn');
    const apiKeyInput = document.getElementById('apiKey');
    const generatedPromptTextarea = document.getElementById('generated-prompt');
    const spinner = document.getElementById('spinner');
    
    // --- LÓGICA DE CARREGAR PROMPTS EXISTENTES ---
    if (folderPicker) {
        folderPicker.addEventListener('change', (event) => {
            promptGrid.innerHTML = '';
            const files = event.target.files;
            if (!files || files.length === 0) {
                promptGrid.innerHTML = '<p class="text-center text-muted">Nenhum arquivo foi selecionado na pasta.</p>';
                return;
            }

            const markdownFiles = Array.from(files).filter(file => file.name.endsWith('.md') && file.size > 0);

            if (!markdownFiles.length) {
                promptGrid.innerHTML = '<p class="text-center text-muted">Nenhum arquivo .md encontrado na pasta selecionada (ou estão vazios).</p>';
                return;
            }
            
            markdownFiles.sort((a, b) => a.name.localeCompare(b.name));

            markdownFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    const title = file.name.replace(/\.md$/, '').replace(/[-_]/g, ' ');
                    const summary = createSummary(content);
                    createPromptCard(title, summary, content);
                };
                reader.onerror = (e) => console.error(`Erro ao ler o arquivo ${file.name}:`, e);
                reader.readAsText(file);
            });
        });
    }

    function createSummary(content, maxLength = 120) {
        if (!content) return "";
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength).trim() + '...';
    }

    function createPromptCard(title, summary, fullContent) {
        const cardCol = document.createElement('div');
        cardCol.className = 'col-md-6 col-lg-4';
        const cardHTML = `
            <div class="card bg-dark text-white border-secondary">
                <div class="card-body">
                    <div>
                        <h5 class="card-title text-capitalize">${title}</h5>
                        <p class="card-text text-white-50">${summary}</p>
                    </div>
                    <button class="btn btn-outline-primary btn-copy mt-3">
                        <i class="bi bi-clipboard"></i> Copiar Prompt
                    </button>
                </div>
            </div>`;
        cardCol.innerHTML = cardHTML;
        cardCol.querySelector('.btn-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(fullContent).then(() => {
                copyToast.show();
            }).catch(err => console.error('Erro ao copiar o texto: ', err));
        });
        promptGrid.appendChild(cardCol);
    }

    // --- NOVA LÓGICA PARA O GERADOR DE PROMPT COM IA (USANDO GROQ) ---
    if (generatePromptBtn) {
        generatePromptBtn.addEventListener('click', async () => {
            const apiKey = "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";
            if (!apiKey) {
                alert('Por favor, insira sua chave de API da Groq.');
                return;
            }

            // Coleta os dados do formulário
            const persona = document.getElementById('prompt-persona').value;
            const activity = document.getElementById('prompt-activity').value;
            const context = document.getElementById('prompt-context').value;
            const extras = document.getElementById('prompt-extras').value;

            if (!persona || !activity) {
                alert('Os campos "Persona" e "Atividade" são obrigatórios.');
                return;
            }

            // Monta a instrução para a IA
            const userInstruction = `
                Persona: ${persona}
                Atividade: ${activity}
                Contexto/Detalhes: ${context}
                Refinamentos: ${extras}
            `;

            // Mostra o spinner e desabilita botões
            spinner.classList.remove('d-none');
            generatedPromptTextarea.value = '';
            generatePromptBtn.disabled = true;
            savePromptBtn.disabled = true;

            try {
                const generatedText = await callGroqApi(apiKey, userInstruction);
                generatedPromptTextarea.value = generatedText;
                savePromptBtn.disabled = false; // Habilita o botão de salvar
            } catch (error) {
                console.error('Erro ao chamar a API da Groq:', error);
                generatedPromptTextarea.value = `Erro ao gerar prompt: ${error.message}`;
                alert(`Ocorreu um erro: ${error.message}`);
            } finally {
                // Esconde o spinner e reabilita o botão de gerar
                spinner.classList.add('d-none');
                generatePromptBtn.disabled = false;
            }
        });
    }

    if (savePromptBtn) {
        savePromptBtn.addEventListener('click', () => {
            const content = generatedPromptTextarea.value;
            let filename = document.getElementById('prompt-filename').value.trim();
            if (!filename) {
                filename = 'novo-prompt-gerado';
            }
            if (!filename.endsWith('.md')) {
                filename += '.md';
            }

            if (content) {
                downloadFile(filename, content);
            } else {
                alert('Não há conteúdo gerado para salvar.');
            }
        });
    }

    async function callGroqApi(apiKey, userInstruction) {
        const systemPrompt = `Você é um Especialista em Criação de Prompt Avançado, mestre no Framework de 6 Elementos. Sua tarefa é ajudar o usuário a criar ou refinar um prompt.

A partir da solicitação inicial do usuário, você deve gerar uma resposta estruturada contendo QUATRO seções distintas em Markdown:

1.  **Prompt (Versão 1):**
    Crie a primeira versão do melhor prompt possível com base na solicitação do usuário. Incorpore claramente os 6 elementos (Persona, Tarefa, Estilo, Formato, Público-Alvo, Contexto) e adicione exemplos se necessário. O prompt deve ser escrito da perspectiva do usuário, como se ele estivesse fazendo a solicitação à IA.

2.  **Análise dos Elementos:**
    Faça uma breve análise de como cada um dos 6 elementos foi aplicado no prompt que você acabou de criar.

3.  **Crítica Construtiva:**
    Forneça um parágrafo conciso e rigoroso sobre como o prompt pode ser melhorado. Identifique pontos fracos, suposições feitas ou potenciais ambiguidades. Seja crítico mesmo que o prompt pareça bom.

4.  **Perguntas para Refinamento:**
    Faça um máximo de 3 perguntas essenciais e direcionadas ao usuário para obter as informações que faltam e que permitirão aprimorar o prompt em uma próxima iteração.

**IMPORTANTE:** Sua resposta deve conter TODAS as quatro seções. A resposta final deve ser gerada exclusivamente em Português do Brasil.`;
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192', // Modelo Llama 3 de 8b via Groq
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userInstruction }
                ],
                temperature: 0.5,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro da API: ${response.status} - ${errorData.error.message}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    function downloadFile(filename, text) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
});