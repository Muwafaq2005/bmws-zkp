document.addEventListener("DOMContentLoaded", () => {
  // Navigation Tabs
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Ship Console Controls
  const btnShipOperate = document.getElementById("btn-ship-operate");
  const btnShipProof = document.getElementById("btn-ship-proof");
  const btnShipTransmit = document.getElementById("btn-ship-transmit");
  const btnCopyRoot = document.getElementById("btn-copy-root");

  // Ship UI Elements
  const shipOpId = document.getElementById("ship-op-id");
  const shipWinId = document.getElementById("ship-win-id");
  const shipTimestamp = document.getElementById("ship-timestamp");
  const sensFlow = document.getElementById("sens-flow");
  const sensUv = document.getElementById("sens-uv");
  const sensTemp = document.getElementById("sens-temp");
  const sensSalinity = document.getElementById("sens-salinity");
  const sensTurb = document.getElementById("sens-turb");
  const winCounterText = document.getElementById("win-counter-text");
  const winProgressFill = document.getElementById("win-progress-fill");
  const shipMerkleRoot = document.getElementById("ship-merkle-root");
  const shipProofStatus = document.getElementById("ship-proof-status");
  const shipProofSize = document.getElementById("ship-proof-size");
  const vsatRawSize = document.getElementById("vsat-raw-size");
  const vsatZkSize = document.getElementById("vsat-zk-size");
  const vsatSavings = document.getElementById("vsat-savings");

  // Port Verification Controls & UI
  const portOpWin = document.getElementById("port-op-win");
  const portPkgTime = document.getElementById("port-pkg-time");
  const portMerkleRoot = document.getElementById("port-merkle-root");
  const btnRunVerification = document.getElementById("btn-run-verification");
  const btnRecordAttestation = document.getElementById("btn-record-attestation");
  const portResultBanner = document.getElementById("port-result-banner");
  const portBannerTitle = document.getElementById("port-banner-title");
  const portBannerDesc = document.getElementById("port-banner-desc");

  // Transaction Lifecycle Elements
  const txStepSubmit = document.getElementById("tx-step-submit");
  const txStepBroadcast = document.getElementById("tx-step-broadcast");
  const txStepPending = document.getElementById("tx-step-pending");
  const txStepConfirmed = document.getElementById("tx-step-confirmed");
  const txHash = document.getElementById("tx-hash");
  const txBlockNum = document.getElementById("tx-block-num");
  const txContractAddr = document.getElementById("tx-contract-addr");
  const txVerifierAddr = document.getElementById("tx-verifier-addr");

  // Blockchain History Elements
  const btnRefreshHistory = document.getElementById("btn-refresh-history");
  const histContract = document.getElementById("hist-contract");
  const histTotalCount = document.getElementById("hist-total-count");
  const historyTableBody = document.getElementById("history-table-body");
  const headerChainStatus = document.getElementById("header-chain-status");

  // Security Lab Controls & UI
  const labAttackSelect = document.getElementById("lab-attack-select");
  const attackDescText = document.getElementById("attack-desc-text");
  const btnRunAttackSimulation = document.getElementById("btn-run-attack-simulation");
  const repAttackName = document.getElementById("rep-attack-name");
  const repActualResult = document.getElementById("rep-actual-result");
  const repMitigationType = document.getElementById("rep-mitigation-type");
  const repExpectedProperty = document.getElementById("rep-expected-property");
  const repRejectionReason = document.getElementById("rep-rejection-reason");
  const labMitigatedBadge = document.getElementById("lab-mitigated-badge");

  // Modal Elements
  const detailModal = document.getElementById("detail-modal");
  const btnCloseDetail = document.getElementById("btn-close-detail");
  const modalDetailJson = document.getElementById("modal-detail-json");

  let currentVerificationPackage = null;
  let currentVerifierRecord = null;
  let historyCache = [];

  // TAB SWITCHING LOGIC
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;
      navTabs.forEach((t) => t.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(targetTab)?.classList.add("active");

      if (targetTab === "tab-history") {
        fetchBlockchainHistory();
      }
    });
  });

  // INITIALIZE BLOCKCHAIN STATUS & HISTORY
  fetchBlockchainHistory();

  async function fetchBlockchainHistory() {
    try {
      const res = await fetch("/api/blockchain/history");
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        headerChainStatus.textContent = d.connected ? "CONNECTED" : "OFFLINE";
        headerChainStatus.className = d.connected ? "pill-value text-green" : "pill-value";

        histContract.textContent = d.contractAddress || "--";
        histTotalCount.textContent = d.totalAttestations || "0";
        historyCache = d.history || [];

        renderHistoryTable(historyCache);
      }
    } catch {
      headerChainStatus.textContent = "DISCONNECTED";
    }
  }

  function renderHistoryTable(records) {
    if (!records || records.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-row">No on-chain attestations recorded yet. Execute a valid ship & verifier workflow to issue an EVM transaction.</td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = records
      .map((r, index) => {
        const shortRoot = r.merkleRoot.length > 16 ? r.merkleRoot.slice(0, 10) + "..." + r.merkleRoot.slice(-6) : r.merkleRoot;
        const shortTx = r.transactionHash ? r.transactionHash.slice(0, 10) + "..." + r.transactionHash.slice(-6) : "--";
        const dateStr = r.verificationTimestamp ? new Date(r.verificationTimestamp).toLocaleString() : "--";

        return `
          <tr data-index="${index}">
            <td class="mono font-bold">${r.blockNumber || "--"}</td>
            <td>${dateStr}</td>
            <td class="mono highlight">${r.operationId}</td>
            <td class="mono highlight">${r.windowId}</td>
            <td class="mono">${shortRoot}</td>
            <td class="mono">${r.ruleSetId}</td>
            <td><span class="badge pass">✓ COMPLIANT</span></td>
            <td class="mono">${shortTx}</td>
            <td><button class="btn btn-secondary btn-sm btn-inspect" data-index="${index}">🔍 Inspect</button></td>
          </tr>
        `;
      })
      .join("");

    document.querySelectorAll(".btn-inspect").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.index);
        showDetailModal(historyCache[idx]);
      });
    });
  }

  function showDetailModal(record) {
    if (!record) return;
    modalDetailJson.textContent = JSON.stringify(record, null, 2);
    detailModal.classList.remove("hidden");
  }

  btnCloseDetail?.addEventListener("click", () => detailModal.classList.add("hidden"));
  detailModal?.addEventListener("click", (e) => {
    if (e.target === detailModal) detailModal.classList.add("hidden");
  });

  // STEP 1: SHIP START OPERATION
  btnShipOperate.addEventListener("click", async () => {
    btnShipOperate.disabled = true;
    try {
      const response = await fetch("/api/ship/operate", { method: "POST" });
      const res = await response.json();

      if (res.success && res.data) {
        const d = res.data;
        shipOpId.textContent = d.vessel.operationId;
        shipWinId.textContent = d.vessel.windowId;
        shipTimestamp.textContent = d.vessel.timestamp;

        sensFlow.innerHTML = `${(d.sensors.flowRate / 10).toFixed(1)} <span class="unit">m³/h</span>`;
        sensUv.innerHTML = `${(d.sensors.uvIntensity / 10).toFixed(1)} <span class="unit">mW/cm²</span>`;
        sensTemp.innerHTML = `${(d.sensors.temperature / 10).toFixed(1)} <span class="unit">°C</span>`;
        sensSalinity.innerHTML = `${(d.sensors.salinity / 10).toFixed(1)} <span class="unit">PSU</span>`;
        sensTurb.innerHTML = `${(d.sensors.turbidity / 10).toFixed(1)} <span class="unit">NTU</span>`;

        // Animate Window Buildup
        for (let i = 1; i <= 64; i += 8) {
          winCounterText.textContent = `${i} / 64 RECORDS`;
          winProgressFill.style.width = `${(i / 64) * 100}%`;
          await new Promise((r) => setTimeout(r, 40));
        }
        winCounterText.textContent = `64 / 64 RECORDS`;
        winProgressFill.style.width = `100%`;

        // Update Integrity Check Badges
        document.getElementById("chk-complete").className = "check-item passed";
        document.getElementById("chk-seq").className = "check-item passed";
        document.getElementById("chk-ts").className = "check-item passed";
        document.getElementById("chk-op").className = "check-item passed";
        document.getElementById("chk-win").className = "check-item passed";

        shipMerkleRoot.textContent = d.merkleRoot;
        btnShipProof.disabled = false;
      }
    } catch (err) {
      alert("Failed to initialize ship operation: " + err.message);
    } finally {
      btnShipOperate.disabled = false;
    }
  });

  // STEP 2: GENERATE ZK PROOF
  btnShipProof.addEventListener("click", async () => {
    btnShipProof.disabled = true;
    try {
      shipProofStatus.textContent = "GENERATING PROOF...";
      shipProofStatus.className = "zk-v badge ready";

      const response = await fetch("/api/ship/generate-proof", { method: "POST" });
      const res = await response.json();

      if (res.success && res.data) {
        currentVerificationPackage = res.data.verificationPackage;
        shipProofStatus.textContent = "✓ GROTH16 PROOF GENERATED";
        shipProofStatus.className = "zk-v badge pass";
        shipProofSize.textContent = res.data.proofSize;

        btnShipTransmit.disabled = false;
      }
    } catch (err) {
      shipProofStatus.textContent = "FAILED";
      shipProofStatus.className = "zk-v badge reject";
      alert("Failed to generate ZK proof: " + err.message);
    } finally {
      btnShipProof.disabled = false;
    }
  });

  // STEP 3: TRANSMIT TO PORT
  btnShipTransmit.addEventListener("click", async () => {
    btnShipTransmit.disabled = true;
    try {
      const response = await fetch("/api/ship/transmit", { method: "POST" });
      const res = await response.json();

      if (res.success && res.data) {
        const comp = res.data.comparison;
        vsatRawSize.textContent = `${(comp.rawTelemetryMetrics.rawPayloadBytes / 1024).toFixed(2)} KB`;
        vsatZkSize.textContent = `${(comp.verificationPackageMetrics.rawPayloadBytes / 1024).toFixed(2)} KB`;
        vsatSavings.textContent = `${comp.byteSavingsPercent}%`;

        // Update Port Console
        portOpWin.textContent = `${currentVerificationPackage.operation_id} : ${currentVerificationPackage.window_id}`;
        portPkgTime.textContent = currentVerificationPackage.generated_at;
        portMerkleRoot.textContent = currentVerificationPackage.merkle_root;

        // Auto Switch to Port Tab
        navTabs[1].click();
      }
    } catch (err) {
      alert("Failed to transmit verification package: " + err.message);
    } finally {
      btnShipTransmit.disabled = false;
    }
  });

  // COPY MERKLE ROOT
  btnCopyRoot?.addEventListener("click", () => {
    const rootText = shipMerkleRoot.textContent;
    if (rootText && !rootText.includes("--")) {
      navigator.clipboard.writeText(rootText);
      alert("Merkle root copied to clipboard!");
    }
  });

  // PORT: RUN VERIFICATION PIPELINE
  btnRunVerification.addEventListener("click", async () => {
    btnRunVerification.disabled = true;
    resetPipelineUI();

    try {
      const response = await fetch("/api/verifier/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationPackage: currentVerificationPackage }),
      });
      const res = await response.json();

      if (res.success && res.data) {
        currentVerifierRecord = res.data.verifierRecord;
        await animatePipelineStages(currentVerifierRecord.status === "PASS");

        if (currentVerifierRecord.status === "PASS") {
          portResultBanner.className = "result-banner pass";
          portBannerTitle.textContent = "✓ ZERO-KNOWLEDGE PROOF VERIFIED";
          portBannerDesc.textContent = "Complete 64-record telemetry window satisfies BWMS-DEMO-V1 prototype predicate.";
          btnRecordAttestation.disabled = false;
        } else {
          portResultBanner.className = "result-banner reject";
          portBannerTitle.textContent = "✕ VERIFICATION FAILED";
          portBannerDesc.textContent = currentVerifierRecord.reason || "Proof failed verification policy.";
          btnRecordAttestation.disabled = true;
        }
      }
    } catch (err) {
      alert("Verification pipeline error: " + err.message);
    } finally {
      btnRunVerification.disabled = false;
    }
  });

  function resetPipelineUI() {
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById(`pipe-stage-${i}`);
      const st = document.getElementById(`pipe-status-${i}`);
      if (el) el.className = "pipe-stage";
      if (st) st.textContent = i === 6 ? "UNCOMMITTED" : "PENDING";
    }
    btnRecordAttestation.disabled = true;
  }

  async function animatePipelineStages(isPass) {
    const stages = [1, 2, 3, 4, 5];
    for (const st of stages) {
      const el = document.getElementById(`pipe-stage-${st}`);
      const statusEl = document.getElementById(`pipe-status-${st}`);
      if (el) el.className = "pipe-stage active";
      if (statusEl) statusEl.textContent = "RUNNING...";

      await new Promise((r) => setTimeout(r, 120));

      if (isPass || st < 4) {
        if (el) el.className = "pipe-stage passed";
        if (statusEl) statusEl.textContent = "PASSED";
      } else {
        if (el) el.className = "pipe-stage failed";
        if (statusEl) statusEl.textContent = "FAILED";
        break;
      }
    }
  }

  // PORT: RECORD ATTESTATION ON-CHAIN
  btnRecordAttestation.addEventListener("click", async () => {
    btnRecordAttestation.disabled = true;
    resetTxLifecycleUI();

    try {
      txStepSubmit.className = "tx-step active";
      await new Promise((r) => setTimeout(r, 150));
      txStepBroadcast.className = "tx-step active";
      await new Promise((r) => setTimeout(r, 150));
      txStepPending.className = "tx-step active";

      const response = await fetch("/api/blockchain/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationPackage: currentVerificationPackage }),
      });
      const res = await response.json();

      if (res.success && res.data?.verifierRecord?.attestationTxHash) {
        const rec = res.data.verifierRecord;
        txStepConfirmed.className = "tx-step confirmed";
        txHash.textContent = rec.attestationTxHash;
        txBlockNum.textContent = rec.blockNumber || "1";
        txContractAddr.textContent = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        txVerifierAddr.textContent = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73";

        const pipeStage6 = document.getElementById("pipe-stage-6");
        const pipeStatus6 = document.getElementById("pipe-status-6");
        if (pipeStage6) pipeStage6.className = "pipe-stage passed";
        if (pipeStatus6) pipeStatus6.textContent = "CONFIRMED";

        fetchBlockchainHistory();
      } else {
        alert("Blockchain attestation failed: " + (res.data?.verifierRecord?.reason || res.error || "Unknown EVM transaction failure"));
      }
    } catch (err) {
      alert("Failed to submit blockchain attestation: " + err.message);
    } finally {
      btnRecordAttestation.disabled = false;
    }
  });

  function resetTxLifecycleUI() {
    [txStepSubmit, txStepBroadcast, txStepPending, txStepConfirmed].forEach((el) => {
      if (el) el.className = "tx-step";
    });
    txHash.textContent = "--";
    txBlockNum.textContent = "--";
  }

  // REFRESH HISTORY BUTTON
  btnRefreshHistory?.addEventListener("click", fetchBlockchainHistory);

  // SECURITY ATTACK LAB LOGIC
  const attackDescriptions = {
    proof_mutation: "Mutates Groth16 proof point (pi_a) to simulate elliptic curve proof forgery.",
    root_mutation: "Alters the Poseidon Merkle root commitment to claim unverified telemetry data.",
    unsupported_ruleset: "Submits proof under unauthorized rule set (BWMS-RELAXED-V0).",
    stale_package: "Replays an expired verification package generated >24 hours ago.",
    replay: "Replays an attestation window package that has already been verified and recorded on-chain.",
    operation_mismatch: "Clears or alters operation_id in verification package metadata.",
    window_mismatch: "Clears or alters window_id in verification package metadata.",
  };

  labAttackSelect?.addEventListener("change", () => {
    const val = labAttackSelect.value;
    attackDescText.textContent = attackDescriptions[val] || "Select an attack vector.";
  });

  btnRunAttackSimulation?.addEventListener("click", async () => {
    btnRunAttackSimulation.disabled = true;
    try {
      const attackType = labAttackSelect.value;
      const response = await fetch("/api/pipeline/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attackType }),
      });
      const res = await response.json();

      if (res.success && res.data) {
        const d = res.data;
        repAttackName.textContent = d.attackMode.name;
        repActualResult.textContent = d.verifierRecord.status;
        repActualResult.className = d.verifierRecord.status === "REJECT" ? "r-v badge reject" : "r-v badge pass";
        repMitigationType.textContent = d.verifierRecord.mitigationType || "Application Policy";
        repExpectedProperty.textContent = d.attackMode.expectedProperty;
        repRejectionReason.textContent = d.verifierRecord.reason || "Verification rejected.";

        if (d.verifierRecord.status === "REJECT") {
          labMitigatedBadge.textContent = "✓ ATTACK MITIGATED";
          labMitigatedBadge.className = "badge pass";
        } else {
          labMitigatedBadge.textContent = "✕ UNMITIGATED";
          labMitigatedBadge.className = "badge reject";
        }
      }
    } catch (err) {
      alert("Attack simulation error: " + err.message);
    } finally {
      btnRunAttackSimulation.disabled = false;
    }
  });
});
