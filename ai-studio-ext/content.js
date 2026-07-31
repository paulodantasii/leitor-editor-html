(function() {
  if (document.getElementById('ai-automator-ui')) {
    const existingUi = document.getElementById('ai-automator-ui');
    existingUi.style.display = existingUi.style.display === 'none' ? 'block' : 'none';
    return;
  }

  const ui = document.createElement('div');
  ui.id = 'ai-automator-ui';
  ui.style.cssText = 'position:fixed;top:20px;right:20px;width:380px;background:#1e1e1e;color:#fff;z-index:999999;border-radius:12px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:sans-serif;border:1px solid #333;';
  
  ui.innerHTML = `
    <h3 style="margin:0 0 10px 0;font-size:16px;color:#60a5fa;">🤖 Automador de Prompts</h3>
    <p style="font-size:12px;color:#aaa;margin-bottom:10px;">Cole suas instruções abaixo. Separe cada parte por uma linha contendo apenas <b>"---"</b> (3 traços).</p>
    <textarea id="ai-auto-prompts" style="width:100%;height:150px;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:6px;padding:8px;font-size:12px;box-sizing:border-box;margin-bottom:10px;resize:vertical;" placeholder="Instrução 1\n---\nInstrução 2\n---\nInstrução 3"></textarea>
    
    <details style="margin-bottom:15px;font-size:11px;color:#888;">
      <summary style="cursor:pointer;margin-bottom:5px;">⚙️ Configurações Avançadas (Seletores)</summary>
      <div style="margin-top:5px;">
        <label>Seletor do Campo de Texto (Input):</label>
        <input type="text" id="ai-auto-input-sel" value="textarea[formcontrolname='promptText'], textarea[placeholder*='Start typing']" style="width:100%;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;padding:4px;font-size:11px;box-sizing:border-box;margin-bottom:5px;">
        
        <label>Seletor do Botão Enviar (Run):</label>
        <input type="text" id="ai-auto-btn-sel" value=".run-button-label, button[aria-label*='Run']" style="width:100%;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;padding:4px;font-size:11px;box-sizing:border-box;">
      </div>
    </details>

    <div id="ai-auto-status" style="font-size:13px;color:#fbbf24;margin-bottom:10px;font-weight:bold;text-align:center;">Aguardando inicio...</div>
    
    <div style="display:flex;gap:10px;">
      <button id="ai-auto-start" style="flex:1;background:#3b82f6;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;">▶ Iniciar</button>
      <button id="ai-auto-close" style="background:#ef4444;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;width:40px;">X</button>
    </div>
  `;
  document.body.appendChild(ui);

  const startBtn = document.getElementById('ai-auto-start');
  const closeBtn = document.getElementById('ai-auto-close');
  const statusEl = document.getElementById('ai-auto-status');
  const textareaEl = document.getElementById('ai-auto-prompts');
  
  let isRunning = false;
  let collectedResponses = [];

  closeBtn.onclick = () => { ui.style.display = 'none'; };

  async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function setNativeValue(element, value) {
    const lastValue = element.value;
    element.value = value;
    const event = new Event("input", { bubbles: true });
    const tracker = element._valueTracker;
    if (tracker) {
      tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
  }

  startBtn.onclick = async () => {
    if (isRunning) return;
    
    const rawText = textareaEl.value.trim();
    if (!rawText) {
      alert("Cole os prompts primeiro!");
      return;
    }

    const prompts = rawText.split(/^---$/m).map(p => p.trim()).filter(p => p);
    if (prompts.length === 0) return;

    isRunning = true;
    startBtn.disabled = true;
    startBtn.style.background = '#666';
    collectedResponses = [];

    const inputSel = document.getElementById('ai-auto-input-sel').value;
    const btnSel = document.getElementById('ai-auto-btn-sel').value;

    for (let i = 0; i < prompts.length; i++) {
      statusEl.innerText = "[" + (i + 1) + "/" + prompts.length + "] Pausa prévia (8s)...";
      await wait(8000); // 8 segundos antes de fazer qualquer coisa
      
      statusEl.innerText = "[" + (i + 1) + "/" + prompts.length + "] Buscando campo de texto...";
      
      let inputFields = document.querySelectorAll(inputSel);
      let inputField = inputFields[inputFields.length - 1];
      if (!inputField) {
        statusEl.innerText = "Erro: Campo de texto nao encontrado!";
        isRunning = false;
        startBtn.disabled = false;
        startBtn.style.background = '#3b82f6';
        return;
      }

      if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
        setNativeValue(inputField, prompts[i]);
      } else if (inputField.isContentEditable) {
        inputField.innerText = prompts[i];
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      statusEl.innerText = "[" + (i + 1) + "/" + prompts.length + "] Texto colado. Pausa antes de enviar (8s)...";
      await wait(8000); // 8 segundos após colar o texto e antes de clicar em Run

      // Encontra o botão Run verdadeiro buscando pelo texto exato "Run"
      let runBtnSpan = Array.from(document.querySelectorAll('.run-button-label, span, button')).find(e => e.innerText && e.innerText.trim().toLowerCase() === 'run');
      let runBtn = runBtnSpan ? (runBtnSpan.tagName === 'BUTTON' ? runBtnSpan : runBtnSpan.closest('button')) : null;

      if (runBtn) {
        runBtn.click();
      } else {
        inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      statusEl.innerText = "[" + (i + 1) + "/" + prompts.length + "] Enviado! Aguardando estabilização (8s)...";
      
      await wait(8000); // 8 segundos para o botão mudar para Stop ou desativar com calma

      statusEl.innerText = "[" + (i + 1) + "/" + prompts.length + "] Aguardando IA terminar...";
      
      let isGenerating = true;
      let waitTime = 0;

      while (isGenerating && waitTime < 300000) { // Timeout de 5 minutos
        await wait(3000); // Checa a cada 3 segundos
        waitTime += 3000;
        
        let currentRunBtnSpan = Array.from(document.querySelectorAll('.run-button-label, span, button')).find(e => e.innerText && e.innerText.trim().toLowerCase() === 'run');
        let currentRunBtn = currentRunBtnSpan ? (currentRunBtnSpan.tagName === 'BUTTON' ? currentRunBtnSpan : currentRunBtnSpan.closest('button')) : null;
        
        if (currentRunBtn && !currentRunBtn.disabled && currentRunBtn.offsetWidth > 0) {
            statusEl.innerText = "[" + (i + 1) + "/" + prompts.length + "] Resposta finalizada! Pausa de renderização (8s)...";
            await wait(8000); // 8 segundos extras após o botão acender para garantir que a interface processou todo o Markdown
            isGenerating = false;
        }
      }

      // Busca mensagens no AI Studio com precisão cirúrgica
      let lastOutputHTML = "<p><i>Erro ao extrair resposta.</i></p>";
      
      let allTurns = Array.from(document.querySelectorAll('ms-chat-turn'));
      let validModelTurns = allTurns.filter(turn => {
          let isModel = turn.querySelector('.model, [data-turn-role="Model"]');
          let isThought = turn.classList.contains('thought-activity-host') || turn.querySelector('ms-thought-chunk');
          return isModel && !isThought;
      });

      if (validModelTurns.length > 0) {
          let lastValidTurn = validModelTurns[validModelTurns.length - 1];
          let textChunks = lastValidTurn.querySelectorAll('ms-text-chunk, markdown-view');
          
          if (textChunks.length > 0) {
              lastOutputHTML = Array.from(textChunks).map(chunk => chunk.innerHTML).join('<br><br>');
          } else {
              let fallbackContainer = lastValidTurn.querySelector('.model-prompt-container .turn-content');
              if (fallbackContainer) lastOutputHTML = fallbackContainer.innerHTML;
          }
      } else {
          let possibleOutputs = document.querySelectorAll('.message.assistant, [data-author="model"]');
          if (possibleOutputs.length > 0) {
              lastOutputHTML = possibleOutputs[possibleOutputs.length - 1].innerHTML;
          }
      }
      
      // LIMPEZA DO TEXTO (Avançada):
      let tempDiv = document.createElement('div');
      tempDiv.innerHTML = lastOutputHTML;
      
      // 1. Remove qualquer link ou superscript (<a> ou <sup>) cujo texto seja apenas um número ou [número]
      let citationNodes = tempDiv.querySelectorAll('a, sup, span');
      citationNodes.forEach(node => {
          let txt = node.textContent.trim();
          // Bate com "[1]", "1", "[1, 2]", "[ 1 ]", etc.
          if (/^\[?\s*\d+(\s*,\s*\d+)*\s*\]?$/.test(txt)) {
              // Se for um link (A) ou sobrescrito (SUP), podemos deletar com segurança
              if (node.tagName === 'A' || node.tagName === 'SUP') {
                  node.remove();
              }
          }
      });
      
      lastOutputHTML = tempDiv.innerHTML;
      
      // 2. Remove citações perdidas como texto puro (suportando entidades HTML como &#91; e vírgulas)
      lastOutputHTML = lastOutputHTML.replace(/(\[|&#91;)\s*\d+(\s*,\s*\d+)*\s*(\]|&#93;)/g, '');
      
      // 3. Remove os colchetes vazios "[]" que sobraram, MESMO que estejam separados por tags HTML (como <span> ou <!---->)
      // Essa regex incrível pega o "[" e o "]", permitindo qualquer tag HTML ou espaço em branco entre eles, e deleta apenas os colchetes
      lastOutputHTML = lastOutputHTML.replace(/(?:\[|&#91;)((\s|<[^>]+>|&nbsp;)*)(?:\]|&#93;)/gi, '$1');
      // Roda duas vezes para pegar o caso de [][], que pode ter ficado encavalado
      lastOutputHTML = lastOutputHTML.replace(/(?:\[|&#91;)((\s|<[^>]+>|&nbsp;)*)(?:\]|&#93;)/gi, '$1');
      
      // 4. Remove asteriscos residuais e espaços vazios exagerados
      lastOutputHTML = lastOutputHTML.replace(/\*\*\*/g, '');

      collectedResponses.push({
        prompt: prompts[i],
        responseHTML: lastOutputHTML
      });
      
      statusEl.innerText = "[" + (i + 1) + "/" + prompts.length + "] Concluido!";
      await wait(1500);
    }

    statusEl.innerText = "Finalizado! Gerando arquivo...";
    
    let finalHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Documento AI Automator</title>
<style>body { font-family: sans-serif; max-width: 900px; margin: 40px auto; line-height: 1.6; }</style>
</head>
<body>
`;
    collectedResponses.forEach((item, idx) => {
      finalHtml += "\n<div class=\"generated-part\" id=\"part-" + (idx+1) + "\">\n";
      
      // Adiciona o texto exato da pergunta feita pelo usuário, preservando as quebras de linha
      let promptText = item.prompt.replace(/\n/g, '<br>');
      finalHtml += "<p><strong>" + promptText + "</strong></p>\n";
      
      finalHtml += item.responseHTML;
      finalHtml += "\n</div>\n<br>\n";
    });
    finalHtml += "</body></html>";

    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "resultado_ai_studio_" + new Date().getTime() + ".html";
    a.click();
    URL.revokeObjectURL(url);

    isRunning = false;
    startBtn.disabled = false;
    startBtn.style.background = '#3b82f6';
    statusEl.innerText = "Arquivo salvo na pasta Downloads!";
  };
})();
