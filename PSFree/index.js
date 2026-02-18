async function loadMultipleModules(files) {
  try {
    // Dynamically import all modules
    const modules = await Promise.all(files.map(file => import(file)));
    return modules; // array of imported modules
  } catch (error) {
    console.error("Error loading modules:", error);
    throw error;
  }
}

function showabout() {
  document.getElementById('about-popup').style.display = 'block'; // Show popup
  document.getElementById('overlay-popup').style.display = 'block'; // Show overlay
}

function closeabout() {
  document.getElementById('about-popup').style.display = 'none'; // Hide popup
  document.getElementById('overlay-popup').style.display = 'none'; // Hide overlay
}

function CheckFW() {
  var fwUA = navigator.userAgent.substring(navigator.userAgent.indexOf('5.0 (') + 19, navigator.userAgent.indexOf(') Apple'));
  var FwUAR = fwUA.replace("layStation 4/","");
  if (FwUAR == "9.00") {
    document.getElementById('PS4FW').textContent = `PS4 FW: ${FwUAR} | Compatible`;
    document.getElementById('PS4FW').style.color = 'green';
  }else{
    document.getElementById('PS4FW').textContent = `PS4 FW: ${FwUAR} | Incompatible`;
    document.getElementById('PS4FW').style.color = 'red';
    document.getElementById('jailbreak-page').style.display = 'none';
    document.getElementById('payloadsbtn').style.display = 'none';
  };
}

function showpayloads() {
  if (document.getElementById('payloadsbtn').textContent == 'Payloads') {
  document.getElementById('jailbreak-page').style.display = 'none';
  document.getElementById('PS4FW').style.display = 'none';
  document.getElementById('payloads-page').style.display = 'block';
  document.getElementById('payloadsbtn').textContent = 'Jailbreak';
  localStorage.setItem('visibleDiv', 'payloads-page');
  }else{
  document.getElementById('jailbreak-page').style.display = 'block';
  document.getElementById('PS4FW').style.display = 'flex';
  document.getElementById('payloads-page').style.display = 'none';
  document.getElementById('payloadsbtn').textContent = 'Payloads';
  localStorage.setItem('visibleDiv', 'jailbreak-page');

  };
  CheckFW();
}

function showtoolspayloads() {
  document.getElementById('payloads-linux').style.display = 'none';
  document.getElementById('payloads-game').style.display = 'none';
  document.getElementById('payloads-tools').style.display = 'block';
}

function showgamepayloads() {
  document.getElementById('payloads-linux').style.display = 'none';
  document.getElementById('payloads-game').style.display = 'block';
  document.getElementById('payloads-tools').style.display = 'none';
}

function showlinuxpayloads() {
  document.getElementById('payloads-linux').style.display = 'block';
  document.getElementById('payloads-game').style.display = 'none';
  document.getElementById('payloads-tools').style.display = 'none';
}

async function jailbreak() {
  try {
    const modules = await loadMultipleModules([
      './alert.mjs'
    ]);
    console.log("All modules are loaded!");

    const goldhenModule = modules[0];
    if (goldhenModule && typeof goldhenModule.GoldHEN === 'function') {
      goldhenModule.GoldHEN();
    } else {
      console.error("GoldHEN function not found in goldhen.js module");
    }
  } catch (e) {
    console.error("Failed to jailbreak:", e);
  }
}

function isHttps() {
  return window.location.protocol === 'https:';
}

async function Loadpayloads(payload) {
  try {
    let modules;

    if (isHttps()) {
      modules = await loadMultipleModules([
        '../payloads/payloads.js',
        './alert.mjs'
      ]);
      console.log("All modules are loaded!");
    } else {
      modules = await loadMultipleModules([
        '../payloads/payloads.js'
      ]);
      console.log("All modules are loaded!");
    }

    const payloadModule = modules[0];
    if (payloadModule && typeof payloadModule[payload] === 'function') {
      payloadModule[payload]();
    } else {
      console.error(`${payload} function not found in payloads.js module`);
    }
  } catch (e) {
    console.error(`Failed to load ${payload}:`, e);
  }
}

document.getElementById('jailbreak').addEventListener('click', () => {
  jailbreak();
});

document.querySelectorAll('button[data-func]').forEach(button => {
  button.addEventListener('click', () => {
    const payload = button.getAttribute('data-func');
    Loadpayloads(payload);
  });
});

document.getElementById('generate-cache-btn').addEventListener('click', () => {
  fetch('/generate_manifest', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
      alert(data.message);
    })
    .catch(error => {
      alert('Error: ' + error + "\nThis option only work on local server !\nPlease make sure you'r server is up.");
    });
});

document.getElementById('update-exploit').addEventListener('click', () => {
  fetch('/update_exploit', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      document.getElementById('console').textContent = data.results.join('\n') + "\nPlease don't forget to update the cache !";
    })
    .catch(err => {
      alert('Error: ' + err + "\nThis option only work on local server !\nPlease make sure you'r server is up.");
    });
});

const checkbox = document.getElementById('autogoldhen');

function onCheckboxChange(checked) {
  if (checked) {
    console.log('Checkbox is checked!');
  } else {
    console.log('Checkbox is unchecked!');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('autogoldhenstate');
  if (saved !== null) {
    checkbox.checked = saved === 'true';
    onCheckboxChange(checkbox.checked);
  }

  if (checkbox.checked) {
    if (confirm('The jailbreak is going to start please confirm !\nWARNING :\nThis option make the jailbreak unstable and this option is not recommended please use the jailbreak button instead !')) {
      jailbreak();
    }
  }

  const visibleDiv = localStorage.getItem('visibleDiv') || 'jailbreak-page';
  if (visibleDiv === 'jailbreak-page') {
    document.getElementById('jailbreak-page').style.display = 'block';
    document.getElementById('PS4FW').style.display = 'flex';
    document.getElementById('payloads-page').style.display = 'none';
    document.getElementById('payloadsbtn').textContent = 'Payloads';
  } else {
    document.getElementById('jailbreak-page').style.display = 'none';
    document.getElementById('PS4FW').style.display = 'none';
    document.getElementById('payloads-page').style.display = 'block';
    document.getElementById('payloadsbtn').textContent = 'Jailbreak';
    localStorage.setItem('visibleDiv', 'payloads-page');
  }
});

checkbox.addEventListener('change', (e) => {
  alert("WARNING :\nThis option make the jailbreak unstable and this option is not recommended please use the jailbreak button instead !")
  localStorage.setItem('autogoldhenstate', e.target.checked);
  onCheckboxChange(e.target.checked);
});
