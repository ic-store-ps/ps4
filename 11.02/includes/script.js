let timerId = null; 
const label = document.getElementById('autoJbLabel');
const checkbox = document.getElementById('autoJbInput');
const jeilbrekBtn = document.getElementById('jeilbrek');
const UAElement = document.getElementById("UA");

const storedAutoJb = localStorage.getItem("autoJb");
let autoJbValue = storedAutoJb !== null ? storedAutoJb === "true" : false;

// choose one of kernel exploits
var exploitChain = localStorage.getItem("exploitChain") || "lapse";
const netctrlRadio = document.getElementById("netctrl-exploit");
const lapseRadio = document.getElementById("lapse-exploit");
const kexForm = document.getElementById('kernel-options');

// Show user agent
if (UAElement) UAElement.innerText += " " + navigator.userAgent;

kexForm.addEventListener("change", function (event) {
    localStorage.setItem("exploitChain", event.target.value);
    exploitChain = event.target.value;
});

// jailbreak execution
jeilbrekBtn.addEventListener("click", function (e){
    jeilbrekBtn.disabled = true;
    stopInterval();
    
    // Clear terminal
    const terminal = document.getElementById('console');
    if (terminal) terminal.innerHTML = '';
    
    doJb()
      .then(() => { logToTerminal('✅ Jailbreak completed successfully!', 'success'); })
      .catch((err) => { logToTerminal(`❌ Jailbreak failed: ${err.message}`, 'error'); })
      .finally(() => { jeilbrekBtn.disabled = false; });
});

function logToTerminal(msg, type = 'info') {
    const terminal = document.getElementById('console');
    if (!terminal) return;
    
    const colors = { info: '#00ff00', error: '#ff4444', warn: '#ffaa00', success: '#00ff00' };
    const prefixes = { info: '[INFO]', error: '[ERROR]', warn: '[WARN]', success: '[OK]' };
    
    const line = document.createElement('div');
    line.style.color = colors[type] || '#00ff00';
    line.style.margin = '2px 0';
    line.style.fontFamily = 'monospace';
    line.textContent = `${prefixes[type] || '[INFO]'} ${msg}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

// Supported FW versions
const SUPPORTED_FW = {
    min: '1.01',
    max: '13.00',
    versions: ['1.01-6.72', '7.00-7.55', '8.00-8.52', '9.00-9.60', '10.00-10.71', '11.00-11.02', '11.50', '11.52', '12.00', '12.02', '12.50', '12.52', '13.00']
};

checkbox.addEventListener('change', function () {
    localStorage.setItem("autoJb", checkbox.checked);
    if (checkbox.checked == true && jeilbrekBtn.disabled == false) {
        jailbreakCountdown();
        return;
    }

    stopInterval();
});

function stopInterval(){
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
    label.textContent = "Auto Jailbreak";
}

function jailbreakCountdown() {   
    stopInterval();

    let countdown = 5;
    label.textContent = `Auto Jailbreaking in: ${countdown}`;
    timerId = setInterval(() => {
        countdown--;
        label.textContent = `Auto Jailbreaking in: ${countdown}`;

        if (countdown < 0) {
            jeilbrekBtn.disabled = true; 
            clearInterval(timerId);
            timerId = null;
            label.textContent = 'Executing';
            doJb()
              .catch((err) => { logToTerminal(`❌ Auto jailbreak failed: ${err.message}`, 'error'); })
              .finally(() => { jeilbrekBtn.disabled = false; });
        }
    }, 1000);
}

function cacheProgress(e) {
    var Percent = (Math.round(e.loaded / e.total * 100));
    document.title = "Caching: " + Percent + "%";
}

function displayCacheProgress() {
    setTimeout(function () {
        // show a tick
        document.title = "\u2713";
    }, 1000);
    setTimeout(function () {
        // location.reload();
        document.title = "CSSFontFace exploit";
    }, 3000);
}

document.addEventListener("DOMContentLoaded", function() {
    // Cache handling
    if (window.applicationCache) {
        window.applicationCache.addEventListener("progress", cacheProgress, false);
        window.applicationCache.oncached = function (e) { displayCacheProgress(); };
        window.applicationCache.onupdateready = function (e) { displayCacheProgress(); };
    }

    // choose prefered exploit chain
    if (exploitChain == "netctrl") {
        netctrlRadio.checked = true;
    } else {
        lapseRadio.checked = true;
    }

    // apply autojb localStorage value
    checkbox.checked = autoJbValue;

    if (autoJbValue) jailbreakCountdown();
});