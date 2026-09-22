document.addEventListener("DOMContentLoaded", () => {
  // Navigation Tabs
  const navTabs = document.querySelectorAll(".nav-tab");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Ship Console Controls & Elements
  const btnShipOperate = document.getElementById("btn-ship-operate");
  const btnShipProof = document.getElementById("btn-ship-proof");
  const btnShipTransmit = document.getElementById("btn-ship-transmit");
  const btnCopyRoot = document.getElementById("btn-copy-root");
  const shipScenarioSelect = document.getElementById("ship-scenario-select");
  const scenarioNoteText = document.getElementById("scenario-note-text");
  const sensorSampleBadge = document.getElementById("sensor-sample-badge");

  // Ship UI Elements
  const shipOpId = document.getElementById("ship-op-id");
  const shipWinId = document.getElementById("ship-win-id");
  const shipTimestamp = document.getElementById("ship-timestamp");
  const sensFlow = document.getElementById("sens-flow");
  const sensUv = document.getElementById("sens-uv");
  const sensTemp = document.getElementById("sens-temp");
  const sensSalinity = document.getElementById("sens-salinity");
  const sensTurb = document.getElementById("sens-turb");

  const cardFlow = document.getElementById("card-flow");
  const cardUv = document.getElementById("card-uv");
  const cardTemp = document.getElementById("card-temp");
  const cardSalinity = document.getElementById("card-salinity");
  const cardTurb = document.getElementById("card-turb");

  const telemetryTableBody = document.getElementById("telemetry-table-body");
  const winCounterText = document.getElementById("win-counter-text");
  const winProgressFill = document.getElementById("win-progress-fill");
  const shipMerkleRoot = document.getElementById("ship-merkle-root");
  const shipProofStatus = document.getElementById("ship-proof-status");
  const shipProofSize = document.getElementById("ship-proof-size");

  const vsatRawSize = document.getElementById("vsat-raw-size");
  const vsatZkSize = document.getElementById("vsat-zk-size");
  const vsatSavings = document.getElementById("vsat-savings");

  // Port Verification Controls & UI Elements
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

  // Security Lab Controls & UI Elements
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

  // TAB SWITCHING LOGIC (SHIP ZKP CONSOLE, PORT VERIFICATION, BLOCKCHAIN HISTORY, SECURITY LAB)
  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;
      navTabs.forEach((t) => t.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add("active");

      if (targetTab === "tab-history") {
        fetchBlockchainHistory();
      }
    });
  });

  // INITIALIZE BLOCKCHAIN STATUS & HISTORY ON LOAD
  fetchBlockchainHistory();

  async function fetchBlockchainHistory() {
    try {
      const res = await fetch("/api/blockchain/history");
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        if (headerChainStatus) {
          headerChainStatus.textContent = d.connected ? "CONNECTED" : "OFFLINE";
          headerChainStatus.className = d.connected ? "pill-value text-green" : "pill-value";
        }
        if (histContract) histContract.textContent = d.contractAddress || "--";
        if (histTotalCount) histTotalCount.textContent = d.totalAttestations || "0";
        historyCache = d.history || [];

        renderHistoryTable(historyCache);
      }
    } catch {
      if (headerChainStatus) headerChainStatus.textContent = "DISCONNECTED";
    }
  }

  function renderHistoryTable(records) {
    if (!historyTableBody) return;
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
        const shortRoot = r.merkleRoot && r.merkleRoot.length > 16 ? r.merkleRoot.slice(0, 10) + "..." + r.merkleRoot.slice(-6) : (r.merkleRoot || "--");
        const shortTx = r.transactionHash ? r.transactionHash.slice(0, 10) + "..." + r.transactionHash.slice(-6) : "--";
        const dateStr = r.verificationTimestamp ? new Date(r.verificationTimestamp).toLocaleString() : "--";

        return `
          <tr data-index="${index}">
            <td class="mono font-bold">${r.blockNumber ?? "--"}</td>
            <td>${dateStr}</td>
            <td class="mono highlight">${r.operationId || "--"}</td>
            <td class="mono highlight">${r.windowId || "--"}</td>
            <td class="mono">${shortRoot}</td>
            <td class="mono">${r.ruleSetId || "--"}</td>
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
    if (!record || !modalDetailJson || !detailModal) return;
    modalDetailJson.textContent = JSON.stringify(record, null, 2);
    detailModal.classList.remove("hidden");
  }

  btnCloseDetail?.addEventListener("click", () => detailModal?.classList.add("hidden"));
  detailModal?.addEventListener("click", (e) => {
    if (e.target === detailModal) detailModal.classList.add("hidden");
  });

  // Scenario Descriptions
  const scenarioNotes = {
    NORMAL: "Generates 64 realistic incremental telemetry values satisfying all BWMS-DEMO-V1 compliance bounds.",
    LOW_UV: "Generates telemetry with UV intensity falling below the 40.0 mW/cm² requirement (Predicate Violation).",
    LOW_FLOW: "Generates telemetry with ballast flow rate falling below 800.0 m³/h (Predicate Violation).",
    HIGH_TURBIDITY: "Generates telemetry with turbidity exceeding 5.0 NTU (Predicate Violation).",
    TEMPERATURE_EXCURSION: "Generates telemetry with water temperature exceeding 30.0°C (Predicate Violation).",
    SENSOR_DRIFT: "Simulates gradual downward sensor calibration drift below compliance thresholds.",
    OUTLIER: "Injects a single transient turbidity spike at record 32 violating compliance.",
    MISSING_READING: "Simulates sequence counter gap (skips sequence 25) triggering window validation failure.",
  };

  shipScenarioSelect?.addEventListener("change", () => {
    const scenario = shipScenarioSelect.value;
    if (scenarioNoteText) {
      scenarioNoteText.textContent = scenarioNotes[scenario] || "Simulates telemetry under specified operational scenario.";
    }
  });

  // STEP 1: SHIP START OPERATION & INCREMENTAL SENSOR STREAMING
  btnShipOperate?.addEventListener("click", async () => {
    btnShipOperate.disabled = true;
    if (btnShipProof) btnShipProof.disabled = true;
    if (btnShipTransmit) btnShipTransmit.disabled = true;
    if (shipScenarioSelect) shipScenarioSelect.disabled = true;

    // Reset UI State
    if (telemetryTableBody) {
      telemetryTableBody.innerHTML = `<tr><td colspan="7" class="empty-row">Initializing sensor simulation stream...</td></tr>`;
    }
    if (shipMerkleRoot) shipMerkleRoot.textContent = "-- (Collecting Telemetry...)";
    if (shipProofStatus) {
      shipProofStatus.textContent = "SAMPLING IN PROGRESS";
      shipProofStatus.className = "zk-v badge ready";
    }

    resetSensorCards();
    resetChecklist();

    const selectedScenario = shipScenarioSelect ? shipScenarioSelect.value : "NORMAL";

    try {
      // 1. Initialize Simulation Session
      const initRes = await fetch("/api/ship/operate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: selectedScenario }),
      });
      const initJson = await initRes.json();

      if (!initJson.success) {
        throw new Error(initJson.error || "Failed to start operation session.");
      }

      const initialSession = initJson.data.sessionState;
      if (shipOpId) shipOpId.textContent = initialSession.operationId;
      if (shipWinId) shipWinId.textContent = initialSession.windowId;

      if (telemetryTableBody) telemetryTableBody.innerHTML = "";

      // 2. Step Loop: Collect 64 Readings Incrementally
      let currentState = initialSession.state;
      let sessionData = initialSession;

      while (currentState === "RUNNING") {
        const stepRes = await fetch("/api/ship/step", { method: "POST" });
        const stepJson = await stepRes.json();

        if (!stepJson.success) {
          throw new Error(stepJson.error || "Sensor step execution error.");
        }

        sessionData = stepJson.data.sessionState;
        currentState = sessionData.state;
        const reading = stepJson.data.latestReading;

        if (reading) {
          updateSensorGauges(reading);
          appendTelemetryRow(reading);
        }

        const count = sessionData.currentReadingCount;
        if (winCounterText) winCounterText.textContent = `${count} / 64 RECORDS`;
        if (winProgressFill) winProgressFill.style.width = `${(count / 64) * 100}%`;
        if (sensorSampleBadge) sensorSampleBadge.textContent = `SEQUENCE ${count} / 64`;

        // Small interval to make incremental collection visible to user
        await new Promise((r) => setTimeout(r, 100));
      }

      // 3. Finalize UI based on Sealing & Compliance outcome
      if (currentState === "SEALED") {
        if (shipTimestamp) {
          shipTimestamp.textContent = sessionData.readings[sessionData.readings.length - 1]?.timestamp || new Date().toISOString();
        }
        if (shipMerkleRoot) shipMerkleRoot.textContent = sessionData.merkleRoot || "--";

        const chkComplete = document.getElementById("chk-complete");
        const chkSeq = document.getElementById("chk-seq");
        const chkTs = document.getElementById("chk-ts");
        if (chkComplete) chkComplete.className = "check-item passed";
        if (chkSeq) chkSeq.className = "check-item passed";
        if (chkTs) chkTs.className = "check-item passed";

        const chkCompliance = document.getElementById("chk-compliance");
        if (sessionData.isCompliant) {
          if (chkCompliance) {
            chkCompliance.className = "check-item passed";
            const label = chkCompliance.querySelector(".chk-label");
            if (label) label.textContent = "BWMS-DEMO-V1 Compliant ✓";
          }
          if (shipProofStatus) {
            shipProofStatus.textContent = "READY TO GENERATE PROOF";
            shipProofStatus.className = "zk-v badge pass";
          }
          if (btnShipProof) btnShipProof.disabled = false;
        } else {
          if (chkCompliance) {
            chkCompliance.className = "check-item";
            chkCompliance.style.borderColor = "var(--red-border)";
            chkCompliance.style.background = "var(--red-dim)";
            chkCompliance.style.color = "var(--red-failed)";
            const label = chkCompliance.querySelector(".chk-label");
            if (label) label.textContent = "BWMS-DEMO-V1 Violation ✕";
          }
          if (shipProofStatus) {
            shipProofStatus.textContent = "NON-COMPLIANT (PROOF BLOCKED)";
            shipProofStatus.className = "zk-v badge reject";
          }
          if (btnShipProof) btnShipProof.disabled = true;
        }
      } else if (currentState === "FAILED") {
        if (shipMerkleRoot) shipMerkleRoot.textContent = "SIMULATION FAILED";
        if (shipProofStatus) {
          shipProofStatus.textContent = "FAILED (SEQUENCE GAP)";
          shipProofStatus.className = "zk-v badge reject";
        }

        const chkSeq = document.getElementById("chk-seq");
        if (chkSeq) {
          chkSeq.style.borderColor = "var(--red-border)";
          chkSeq.style.background = "var(--red-dim)";
          chkSeq.style.color = "var(--red-failed)";
          const label = chkSeq.querySelector(".chk-label");
          if (label) label.textContent = "Sequence Integrity Failure ✕";
        }
      }
    } catch (err) {
      alert("Ship sensor simulation error: " + err.message);
      if (shipProofStatus) {
        shipProofStatus.textContent = "ERROR";
        shipProofStatus.className = "zk-v badge reject";
      }
    } finally {
      btnShipOperate.disabled = false;
      if (shipScenarioSelect) shipScenarioSelect.disabled = false;
    }
  });

  function resetSensorCards() {
    [cardFlow, cardUv, cardTemp, cardSalinity, cardTurb].forEach((card) => {
      if (card) card.classList.remove("violation");
    });
  }

  function resetChecklist() {
    ["chk-complete", "chk-seq", "chk-ts", "chk-compliance"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.className = "check-item";
        el.style = "";
      }
    });
  }

  function getField(r, propCamel, propSnake) {
    if (r && typeof r[propSnake] === "number") return r[propSnake];
    if (r && typeof r[propCamel] === "number") return r[propCamel];
    return undefined;
  }

  function updateSensorGauges(r) {
    const flowVal = getField(r, "flowRate", "flow_rate");
    const uvVal = getField(r, "uvIntensity", "uv_intensity");
    const tempVal = getField(r, "temperature", "temperature");
    const salVal = getField(r, "salinity", "salinity");
    const turbVal = getField(r, "turbidity", "turbidity");

    const flowM3 = typeof flowVal === "number" ? flowVal.toFixed(1) : "--";
    const uvMw = typeof uvVal === "number" ? uvVal.toFixed(1) : "--";
    const tempC = typeof tempVal === "number" ? tempVal.toFixed(1) : "--";
    const salPsu = typeof salVal === "number" ? salVal.toFixed(1) : "--";
    const turbNtu = typeof turbVal === "number" ? turbVal.toFixed(1) : "--";

    if (sensFlow) sensFlow.innerHTML = `${flowM3} <span class="unit">m³/h</span>`;
    if (sensUv) sensUv.innerHTML = `${uvMw} <span class="unit">mW/cm²</span>`;
    if (sensTemp) sensTemp.innerHTML = `${tempC} <span class="unit">°C</span>`;
    if (sensSalinity) sensSalinity.innerHTML = `${salPsu} <span class="unit">PSU</span>`;
    if (sensTurb) sensTurb.innerHTML = `${turbNtu} <span class="unit">NTU</span>`;

    // Check violations against BWMS-DEMO-V1 compliance thresholds
    const flowViolated = typeof flowVal === "number" && flowVal < 800.0;
    const uvViolated = typeof uvVal === "number" && uvVal < 40.0;
    const tempViolated = typeof tempVal === "number" && (tempVal < 20.0 || tempVal > 30.0);
    const salViolated = typeof salVal === "number" && (salVal < 25.0 || salVal > 35.0);
    const turbViolated = typeof turbVal === "number" && turbVal > 5.0;

    if (cardFlow) cardFlow.classList.toggle("violation", flowViolated);
    if (cardUv) cardUv.classList.toggle("violation", uvViolated);
    if (cardTemp) cardTemp.classList.toggle("violation", tempViolated);
    if (cardSalinity) cardSalinity.classList.toggle("violation", salViolated);
    if (cardTurb) cardTurb.classList.toggle("violation", turbViolated);
  }

  function appendTelemetryRow(r) {
    if (!telemetryTableBody) return;
    const container = document.querySelector(".rolling-table-container");

    const flowVal = getField(r, "flowRate", "flow_rate");
    const uvVal = getField(r, "uvIntensity", "uv_intensity");
    const tempVal = getField(r, "temperature", "temperature");
    const salVal = getField(r, "salinity", "salinity");
    const turbVal = getField(r, "turbidity", "turbidity");
    const seqVal = r.sequence ?? r.sequenceNumber ?? "--";

    const flowViolated = typeof flowVal === "number" && flowVal < 800.0;
    const uvViolated = typeof uvVal === "number" && uvVal < 40.0;
    const tempViolated = typeof tempVal === "number" && (tempVal < 20.0 || tempVal > 30.0);
    const salViolated = typeof salVal === "number" && (salVal < 25.0 || salVal > 35.0);
    const turbViolated = typeof turbVal === "number" && turbVal > 5.0;

    const isViolating = flowViolated || uvViolated || tempViolated || salViolated || turbViolated;

    const row = document.createElement("tr");
    if (isViolating) row.className = "violating-row";

    const flowStr = typeof flowVal === "number" ? flowVal.toFixed(1) : "--";
    const uvStr = typeof uvVal === "number" ? uvVal.toFixed(1) : "--";
    const tempStr = typeof tempVal === "number" ? tempVal.toFixed(1) : "--";
    const salStr = typeof salVal === "number" ? salVal.toFixed(1) : "--";
    const turbStr = typeof turbVal === "number" ? turbVal.toFixed(1) : "--";

    const tsTime = r.timestamp && r.timestamp.includes("T") ? r.timestamp.split("T")[1].replace("Z", "") : (r.timestamp || "--");

    row.innerHTML = `
      <td class="mono font-bold">${seqVal}</td>
      <td class="mono">${tsTime}</td>
      <td class="${flowViolated ? "cell-violation" : ""}">${flowStr}</td>
      <td class="${uvViolated ? "cell-violation" : ""}">${uvStr}</td>
      <td class="${tempViolated ? "cell-violation" : ""}">${tempStr}</td>
      <td class="${salViolated ? "cell-violation" : ""}">${salStr}</td>
      <td class="${turbViolated ? "cell-violation" : ""}">${turbStr}</td>
    `;

    telemetryTableBody.appendChild(row);
    if (container) container.scrollTop = container.scrollHeight;
  }

  // STEP 2: GENERATE ZK PROOF
  btnShipProof?.addEventListener("click", async () => {
    btnShipProof.disabled = true;
    try {
      if (shipProofStatus) {
        shipProofStatus.textContent = "GENERATING PROOF...";
        shipProofStatus.className = "zk-v badge ready";
      }

      const response = await fetch("/api/ship/generate-proof", { method: "POST" });
      const res = await response.json();

      if (res.success && res.data) {
        currentVerificationPackage = res.data.verificationPackage;
        if (shipProofStatus) {
          shipProofStatus.textContent = "✓ GROTH16 PROOF GENERATED";
          shipProofStatus.className = "zk-v badge pass";
        }
        if (shipProofSize) {
          shipProofSize.textContent = res.data.proofSize || "805 bytes";
        }
        if (btnShipTransmit) btnShipTransmit.disabled = false;
      } else {
        throw new Error(res.error || "Failed to generate ZK proof.");
      }
    } catch (err) {
      if (shipProofStatus) {
        shipProofStatus.textContent = "FAILED";
        shipProofStatus.className = "zk-v badge reject";
      }
      alert("Failed to generate ZK proof: " + err.message);
    } finally {
      btnShipProof.disabled = false;
    }
  });

  // STEP 3: TRANSMIT TO PORT
  btnShipTransmit?.addEventListener("click", async () => {
    btnShipTransmit.disabled = true;
    try {
      const response = await fetch("/api/ship/transmit", { method: "POST" });
      const res = await response.json();

      if (res.success && res.data) {
        const comp = res.data.comparison;
        if (vsatRawSize) vsatRawSize.textContent = `${(comp.rawTelemetryMetrics.rawPayloadBytes / 1024).toFixed(2)} KB`;
        if (vsatZkSize) vsatZkSize.textContent = `${(comp.verificationPackageMetrics.rawPayloadBytes / 1024).toFixed(2)} KB`;
        if (vsatSavings) vsatSavings.textContent = `${comp.byteSavingsPercent}%`;

        // Update Port Console Payload Header
        if (currentVerificationPackage) {
          if (portOpWin) portOpWin.textContent = `${currentVerificationPackage.operation_id} : ${currentVerificationPackage.window_id}`;
          if (portPkgTime) portPkgTime.textContent = currentVerificationPackage.generated_at;
          if (portMerkleRoot) portMerkleRoot.textContent = currentVerificationPackage.merkle_root;
        }

        // Auto Switch to Port Tab
        if (navTabs[1]) navTabs[1].click();
      } else {
        throw new Error(res.error || "Transmission failed.");
      }
    } catch (err) {
      alert("Failed to transmit verification package: " + err.message);
    } finally {
      btnShipTransmit.disabled = false;
    }
  });

  // COPY MERKLE ROOT BUTTON
  btnCopyRoot?.addEventListener("click", () => {
    const rootText = shipMerkleRoot ? shipMerkleRoot.textContent : "";
    if (rootText && !rootText.includes("--")) {
      navigator.clipboard.writeText(rootText);
      alert("Merkle root copied to clipboard!");
    }
  });

  // PORT: RUN VERIFICATION PIPELINE
  btnRunVerification?.addEventListener("click", async () => {
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
          if (portResultBanner) portResultBanner.className = "result-banner pass";
          if (portBannerTitle) portBannerTitle.textContent = "✓ ZERO-KNOWLEDGE PROOF VERIFIED";
          if (portBannerDesc) portBannerDesc.textContent = "Complete 64-record telemetry window satisfies BWMS-DEMO-V1 prototype predicate.";
          if (btnRecordAttestation) btnRecordAttestation.disabled = false;
        } else {
          if (portResultBanner) portResultBanner.className = "result-banner reject";
          if (portBannerTitle) portBannerTitle.textContent = "✕ VERIFICATION FAILED";
          if (portBannerDesc) portBannerDesc.textContent = currentVerifierRecord.reason || "Proof failed verification policy.";
          if (btnRecordAttestation) btnRecordAttestation.disabled = true;
        }
      } else {
        throw new Error(res.error || "Verification pipeline failed.");
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
    if (btnRecordAttestation) btnRecordAttestation.disabled = true;
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
  btnRecordAttestation?.addEventListener("click", async () => {
    btnRecordAttestation.disabled = true;
    resetTxLifecycleUI();

    try {
      if (txStepSubmit) txStepSubmit.className = "tx-step active";
      await new Promise((r) => setTimeout(r, 150));
      if (txStepBroadcast) txStepBroadcast.className = "tx-step active";
      await new Promise((r) => setTimeout(r, 150));
      if (txStepPending) txStepPending.className = "tx-step active";

      const response = await fetch("/api/blockchain/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationPackage: currentVerificationPackage }),
      });
      const res = await response.json();

      if (res.success && res.data?.verifierRecord?.attestationTxHash) {
        const rec = res.data.verifierRecord;
        if (txStepConfirmed) txStepConfirmed.className = "tx-step confirmed";
        if (txHash) txHash.textContent = rec.attestationTxHash;
        if (txBlockNum) txBlockNum.textContent = rec.blockNumber ?? "1";
        if (txContractAddr) txContractAddr.textContent = rec.contractAddress || histContract?.textContent || "--";
        if (txVerifierAddr) txVerifierAddr.textContent = rec.verifier || "--";

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
    if (txHash) txHash.textContent = "--";
    if (txBlockNum) txBlockNum.textContent = "--";
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
    if (attackDescText) attackDescText.textContent = attackDescriptions[val] || "Select an attack vector.";
  });

  btnRunAttackSimulation?.addEventListener("click", async () => {
    btnRunAttackSimulation.disabled = true;
    try {
      const attackType = labAttackSelect ? labAttackSelect.value : "proof_mutation";
      const response = await fetch("/api/pipeline/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attackType }),
      });
      const res = await response.json();

      if (res.success && res.data) {
        const d = res.data;
        if (repAttackName) repAttackName.textContent = d.attackMode.name;
        if (repActualResult) {
          repActualResult.textContent = d.verifierRecord.status;
          repActualResult.className = d.verifierRecord.status === "REJECT" ? "r-v badge reject" : "r-v badge pass";
        }
        if (repMitigationType) repMitigationType.textContent = d.verifierRecord.mitigationType || "Application Policy";
        if (repExpectedProperty) repExpectedProperty.textContent = d.attackMode.expectedProperty;
        if (repRejectionReason) repRejectionReason.textContent = d.verifierRecord.reason || "Verification rejected.";

        if (labMitigatedBadge) {
          if (d.verifierRecord.status === "REJECT") {
            labMitigatedBadge.textContent = "✓ ATTACK MITIGATED";
            labMitigatedBadge.className = "badge pass";
          } else {
            labMitigatedBadge.textContent = "✕ UNMITIGATED";
            labMitigatedBadge.className = "badge reject";
          }
        }
      } else {
        throw new Error(res.error || "Attack simulation failed.");
      }
    } catch (err) {
      alert("Attack simulation error: " + err.message);
    } finally {
      btnRunAttackSimulation.disabled = false;
    }
  });
});
