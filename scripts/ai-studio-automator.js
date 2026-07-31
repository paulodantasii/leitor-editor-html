javascript:(function() {
  if (document.getElementById('ai-automator-ui')) return;

  // --- 1. UI Creation ---
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
        <input type="text" id="ai-auto-input-sel" value="textarea, [contenteditable='true']" style="width:100%;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;padding:4px;font-size:11px;box-sizing:border-box;margin-bottom:5px;">
        
        <label>Seletor do Botão Enviar (Run):</label>
        <input type="text" id="ai-auto-btn-sel" value="button[aria-label*='Run'], button[aria-label*='Send'], button:has(svg)" style="width:100%;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;padding:4px;font-size:11px;box-sizing:border-box;">
      </div>
    </details>

    <div id="ai-auto-status" style="font-size:13px;color:#fbbf24;margin-bottom:10px;font-weight:bold;text-align:center;">Aguardando início...</div>
    
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

  closeBtn.onclick = () => ui.remove();

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

  // --- 2. Automation Logic ---
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
      statusEl.innerText = \`[${i + 1}/${prompts.length}] Buscando campo de texto...\`;
      
      // A. Find input
      let inputFields = document.querySelectorAll(inputSel);
      let inputField = inputFields[inputFields.length - 1]; // usually the last one is the active chat input
      if (!inputField) {
        statusEl.innerText = "Erro: Campo de texto não encontrado!";
        isRunning = false;
        startBtn.disabled = false;
        startBtn.style.background = '#3b82f6';
        return;
      }

      // B. Insert text
      if (inputField.tagName === 'TEXTAREA' || inputField.tagName === 'INPUT') {
        setNativeValue(inputField, prompts[i]);
      } else if (inputField.isContentEditable) {
        inputField.innerText = prompts[i];
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      await wait(1000); // Wait for React/Angular/Vue to register input

      // C. Find and click run button
      let runBtn = Array.from(document.querySelectorAll(btnSel)).find(b => !b.disabled && b.offsetHeight > 0);
      if (!runBtn) {
        runBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('run') || b.innerText.toLowerCase().includes('send'));
      }

      if (runBtn) {
        runBtn.click();
      } else {
        inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      statusEl.innerText = \`[${i + 1}/${prompts.length}] Aguardando IA terminar...\`;
      
      // D. Wait for generation to start and finish
      await wait(3000); // Wait for loading state to appear

      let isGenerating = true;
      let waitTime = 0;
      while (isGenerating && waitTime < 180000) { // Max 3 minutes wait per prompt
        await wait(2000);
        waitTime += 2000;
        
        // Google AI Studio heuristic: Run button becomes enabled again when finished
        let currentRunBtn = Array.from(document.querySelectorAll(btnSel)).find(b => !b.disabled && b.offsetHeight > 0);
        if (currentRunBtn) {
          isGenerating = false;
        }
      }

      await wait(2000); // Give a little extra time for DOM to render formatting

      // E. Extract response
      let possibleOutputs = document.querySelectorAll('.model-message, .message.assistant, [data-author="model"], markdown-view');
      let lastOutputHTML = "<p><i>Erro ao extrair resposta.</i></p>";

      if (possibleOutputs.length > 0) {
        let lastOutput = possibleOutputs[possibleOutputs.length - 1];
        lastOutputHTML = lastOutput.innerHTML;
      } else {
        // Fallback generic heuristic
        let allDivs = document.querySelectorAll('div, p');
        let longDivs = Array.from(allDivs).filter(d => d.innerText.length > 100);
        if (longDivs.length > 0) {
          lastOutputHTML = longDivs[longDivs.length - 1].innerHTML;
        }
      }

      collectedResponses.push({
        prompt: prompts[i],
        responseHTML: lastOutputHTML
      });
      
      statusEl.innerText = \`[${i + 1}/${prompts.length}] Concluído!\`;
      await wait(1500);
    }

    // --- 3. Export ---
    statusEl.innerText = \`Finalizado! Gerando arquivo...\`;
    
    let finalHtml = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Documento AI Automator</title>
</head>
<body>
\`;
    collectedResponses.forEach((item, idx) => {
      finalHtml += \`\n<!-- Parte \${idx+1} -->\n<div class="generated-part" id="part-\${idx+1}">\n\`;
      finalHtml += item.responseHTML;
      finalHtml += \`\n</div><br><br>\n\`;
    });
    finalHtml += \`</body></html>\`;

    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`resultado_ai_studio_\${new Date().getTime()}.html\`;
    a.click();
    URL.revokeObjectURL(url);

    isRunning = false;
    startBtn.disabled = false;
    startBtn.style.background = '#3b82f6';
    statusEl.innerText = \`Arquivo salvo na pasta Downloads!\`;
  };

})();
