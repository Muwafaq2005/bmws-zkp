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
    scenarioNoteText.textContent = scenarioNotes[scenario] || "Simulates telemetry under specified operational scenario.";
  });

  // STEP 1: SHIP START OPERATION & INCREMENTAL SENSOR STREAMING
  btnShipOperate.addEventListener("click", async () => {
    btnShipOperate.disabled = true;
    btnShipProof.disabled = true;
    btnShipTransmit.disabled = true;
    if (shipScenarioSelect) shipScenarioSelect.disabled = true;

    // Reset UI State
    telemetryTableBody.innerHTML = `<tr><td colspan="7" class="empty-row">Initializing sensor simulation stream...</td></tr>`;
    shipMerkleRoot.textContent = "-- (Collecting Telemetry...)";
    shipProofStatus.textContent = "SAMPLING IN PROGRESS";
    shipProofStatus.className = "zk-v badge ready";

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
      shipOpId.textContent = initialSession.operationId;
      shipWinId.textContent = initialSession.windowId;

      telemetryTableBody.innerHTML = "";

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
        winCounterText.textContent = `${count} / 64 RECORDS`;
        winProgressFill.style.width = `${(count / 64) * 100}%`;
        if (sensorSampleBadge) sensorSampleBadge.textContent = `SEQUENCE ${count} / 64`;

        // Small interval to make incremental collection visible to user
        await new Promise((r) => setTimeout(r, 120));
      }

      // 3. Finalize UI based on Sealing & Compliance outcome
      if (currentState === "SEALED") {
        shipTimestamp.textContent = sessionData.readings[sessionData.readings.length - 1]?.timestamp || new Date().toISOString();
        shipMerkleRoot.textContent = sessionData.merkleRoot || "--";

        document.getElementById("chk-complete").className = "check-item passed";
        document.getElementById("chk-seq").className = "check-item passed";
        document.getElementById("chk-ts").className = "check-item passed";

        const chkCompliance = document.getElementById("chk-compliance");
        if (sessionData.isCompliant) {
          if (chkCompliance) {
            chkCompliance.className = "check-item passed";
            chkCompliance.querySelector(".chk-label").textContent = "BWMS-DEMO-V1 Compliant ✓";
          }
          shipProofStatus.textContent = "READY TO GENERATE PROOF";
          shipProofStatus.className = "zk-v badge pass";
          btnShipProof.disabled = false;
        } else {
          if (chkCompliance) {
            chkCompliance.className = "check-item";
            chkCompliance.style.borderColor = "var(--red-border)";
            chkCompliance.style.background = "var(--red-dim)";
            chkCompliance.style.color = "var(--red-failed)";
            chkCompliance.querySelector(".chk-label").textContent = "BWMS-DEMO-V1 Violation ✕";
          }
          shipProofStatus.textContent = "NON-COMPLIANT (PROOF BLOCKED)";
          shipProofStatus.className = "zk-v badge reject";
          btnShipProof.disabled = true;
        }
      } else if (currentState === "FAILED") {
        shipMerkleRoot.textContent = "SIMULATION FAILED";
        shipProofStatus.textContent = "FAILED (SEQUENCE GAP)";
        shipProofStatus.className = "zk-v badge reject";

        document.getElementById("chk-seq").style.borderColor = "var(--red-border)";
        document.getElementById("chk-seq").style.background = "var(--red-dim)";
        document.getElementById("chk-seq").style.color = "var(--red-failed)";
        document.getElementById("chk-seq").querySelector(".chk-label").textContent = "Sequence Integrity Failure ✕";
      }
    } catch (err) {
      alert("Ship sensor simulation error: " + err.message);
      shipProofStatus.textContent = "ERROR";
      shipProofStatus.className = "zk-v badge reject";
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

  function updateSensorGauges(r) {
    const flowM3 = (r.flowRate / 10).toFixed(1);
    const uvMw = (r.uvIntensity / 10).toFixed(1);
    const tempC = (r.temperature / 10).toFixed(1);
    const salPsu = (r.salinity / 10).toFixed(1);
    const turbNtu = (r.turbidity / 10).toFixed(1);

    sensFlow.innerHTML = `${flowM3} <span class="unit">m³/h</span>`;
    sensUv.innerHTML = `${uvMw} <span class="unit">mW/cm²</span>`;
    sensTemp.innerHTML = `${tempC} <span class="unit">°C</span>`;
    sensSalinity.innerHTML = `${salPsu} <span class="unit">PSU</span>`;
    sensTurb.innerHTML = `${turbNtu} <span class="unit">NTU</span>`;

    // Check violations against BWMS-DEMO-V1 bounds
    const flowViolated = r.flowRate < 8000;
    const uvViolated = r.uvIntensity < 400;
    const tempViolated = r.temperature < 200 || r.temperature > 300;
    const salViolated = r.salinity < 250 || r.salinity > 350;
    const turbViolated = r.turbidity > 50;

    if (cardFlow) cardFlow.classList.toggle("violation", flowViolated);
    if (cardUv) cardUv.classList.toggle("violation", uvViolated);
    if (cardTemp) cardTemp.classList.toggle("violation", tempViolated);
    if (cardSalinity) cardSalinity.classList.toggle("violation", salViolated);
    if (cardTurb) cardTurb.classList.toggle("violation", turbViolated);
  }

  function appendTelemetryRow(r) {
    const container = document.querySelector(".rolling-table-container");
    const isViolating = r.flowRate < 8000 || r.uvIntensity < 400 || r.temperature < 200 || r.temperature > 300 || r.salinity < 250 || r.salinity > 350 || r.turbidity > 50;

    const row = document.createElement("tr");
    if (isViolating) row.className = "violating-row";

    const flowStr = (r.flowRate / 10).toFixed(1);
    const uvStr = (r.uvIntensity / 10).toFixed(1);
    const tempStr = (r.temperature / 10).toFixed(1);
    const salStr = (r.salinity / 10).toFixed(1);
    const turbStr = (r.turbidity / 10).toFixed(1);

    const tsTime = r.timestamp.includes("T") ? r.timestamp.split("T")[1].replace("Z", "") : r.timestamp;

    row.innerHTML = `
      <td class="mono font-bold">${r.sequenceNumber}</td>
      <td class="mono">${tsTime}</td>
      <td class="${r.flowRate < 8000 ? "cell-violation" : ""}">${flowStr}</td>
      <td class="${r.uvIntensity < 400 ? "cell-violation" : ""}">${uvStr}</td>
      <td class="${r.temperature < 200 || r.temperature > 300 ? "cell-violation" : ""}">${tempStr}</td>
      <td class="${r.salinity < 250 || r.salinity > 350 ? "cell-violation" : ""}">${salStr}</td>
      <td class="${r.turbidity > 50 ? "cell-violation" : ""}">${turbStr}</td>
    `;

    telemetryTableBody.appendChild(row);
    if (container) container.scrollTop = container.scrollHeight;
  }


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
