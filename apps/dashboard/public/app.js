document.addEventListener("DOMContentLoaded", () => {
  // Action Buttons
  const btnRunValid = document.getElementById("btn-run-valid");
  const btnRunAttack = document.getElementById("btn-run-attack");
  const btnScrollLab = document.getElementById("btn-scroll-lab");
  const btnOpenPkgModal = document.getElementById("btn-open-pkg-modal");
  const btnViewJsonInline = document.getElementById("btn-view-json-inline");
  const btnToggleConfig = document.getElementById("btn-toggle-config");
  const btnCloseConfig = document.getElementById("btn-close-config");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnOpenChainModal = document.getElementById("btn-open-chain-modal");
  const btnCloseChainModal = document.getElementById("btn-close-chain-modal");

  // Inputs
  const attackSelect = document.getElementById("attack-select");
  const cfgBandwidth = document.getElementById("cfg-bandwidth");
  const cfgLatency = document.getElementById("cfg-latency");
  const cfgLoss = document.getElementById("cfg-loss");
  const vsatConfigDrawer = document.getElementById("vsat-config-drawer");
  const jsonModal = document.getElementById("json-modal");
  const modalJsonContent = document.getElementById("modal-json-content");
  const chainModal = document.getElementById("chain-modal");
  const modalChainContent = document.getElementById("modal-chain-content");

  // Level 1 Focal Card Elements
  const resFocalCard = document.getElementById("res-focal-card");
  const resStatusBadge = document.getElementById("res-status-badge");
  const resFocalTitle = document.getElementById("res-focal-title");
  const resSummaryText = document.getElementById("res-summary-text");
  const resRejectionBox = document.getElementById("res-rejection-box");
  const resRejectionReason = document.getElementById("res-rejection-reason");
  const resFocalRoot = document.getElementById("res-focal-root");

  // Evidence Elements
  const evPublicRoot = document.getElementById("ev-public-root");

  // VSAT Metrics Elements
  const rawSizeDisplay = document.getElementById("raw-size-display");
  const zkSizeDisplay = document.getElementById("zk-size-display");
  const vsatRawKb = document.getElementById("vsat-raw-kb");
  const vsatRawComp = document.getElementById("vsat-raw-comp");
  const vsatZkKb = document.getElementById("vsat-zk-kb");
  const vsatZkComp = document.getElementById("vsat-zk-comp");
  const vsatSavingsPct = document.getElementById("vsat-savings-pct");
  const vsatSpeedup = document.getElementById("vsat-speedup");
  const vsatBarZk = document.getElementById("vsat-bar-zk");
  const vsatBarText = document.getElementById("vsat-bar-text");

  // Lab Elements
  const labAttackName = document.getElementById("lab-attack-name");
  const labActualBadge = document.getElementById("lab-actual-badge");
  const labMitigationType = document.getElementById("lab-mitigation-type");
  const labReason = document.getElementById("lab-reason");
  const labMitigatedTag = document.getElementById("lab-mitigated-tag");

  // Blockchain Elements
  const chainStatusBadge = document.getElementById("chain-status-badge");
  const chainOpId = document.getElementById("chain-op-id");
  const chainWinId = document.getElementById("chain-win-id");
  const chainMerkleRoot = document.getElementById("chain-merkle-root");
  const chainRuleSet = document.getElementById("chain-rule-set");
  const chainTimestamp = document.getElementById("chain-timestamp");
  const chainTxHash = document.getElementById("chain-tx-hash");

  // Package Inspector Elements
  const pkgCircuitId = document.getElementById("pkg-circuit-id");
  const pkgOpId = document.getElementById("pkg-op-id");
  const pkgWinId = document.getElementById("pkg-win-id");
  const pkgRuleSet = document.getElementById("pkg-rule-set");

  let currentVerificationPackage = null;

  function getVsatConfig() {
    return {
      bandwidthKbps: Number(cfgBandwidth.value),
      roundTripLatencyMs: Number(cfgLatency.value),
      packetLossPercent: Number(cfgLoss.value),
    };
  }

  // Initial Baseline Metrics Fetch
  fetchInitialMetrics();

  async function fetchInitialMetrics() {
    try {
      const res = await fetch("/api/metrics");
      const json = await res.json();
      if (json.success && json.data?.comparison) {
        updateVSATMetricsUI(json.data.comparison);
      }
    } catch {
      // Ignore fallback if offline initially
    }
  }

  // Pipeline Step Animation
  function setPipelineStepState(stepId, state, statusText) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.classList.remove("active", "passed", "failed");
    if (state) el.classList.add(state);

    if (statusText) {
      const stepIndex = stepId.replace("step-", "");
      const statusEl = document.getElementById(`step-${getStepNum(stepIndex)}-status`);
      if (statusEl) statusEl.textContent = statusText;
    }
  }

  function getStepNum(name) {
    switch (name) {
      case "telemetry": return "01";
      case "merkle": return "02";
      case "zkp": return "03";
      case "vsat": return "04";
      case "verifier": return "05";
      case "blockchain": return "06";
      default: return "01";
    }
  }

  function resetPipeline() {
    ["telemetry", "merkle", "zkp", "vsat", "verifier", "blockchain"].forEach((name) => {
      setPipelineStepState(`step-${name}`, null, null);
    });
  }

  async function animatePipeline(isSuccess, data) {
    resetPipeline();
    const steps = [
      { id: "step-telemetry", num: "01", time: "64 RECORDS" },
      { id: "step-merkle", num: "02", time: "~12 ms" },
      { id: "step-zkp", num: "03", time: `${data?.shipResult?.proofGenTimeMs || 1940} ms` },
      { id: "step-vsat", num: "04", time: "1.10 KB" },
      { id: "step-verifier", num: "05", time: "~31.5 ms" },
    ];

    for (const step of steps) {
      setPipelineStepState(step.id, "active", "PROCESSING...");
      await new Promise((r) => setTimeout(r, 140));
      setPipelineStepState(step.id, "passed", step.time);
    }

    if (isSuccess) {
      setPipelineStepState("step-blockchain", "passed", "CONFIRMED");
    } else {
      setPipelineStepState("step-verifier", "failed", "REJECTED");
      setPipelineStepState("step-blockchain", null, "SKIPPED");
    }
  }

  function updateVSATMetricsUI(comparison) {
    if (!comparison) return;

    const rawBytes = comparison.rawTelemetryMetrics.rawPayloadBytes;
    const zkBytes = comparison.verificationPackageMetrics.rawPayloadBytes;
    const rawCompBytes = comparison.rawTelemetryMetrics.compressedPayloadBytes;
    const zkCompBytes = comparison.verificationPackageMetrics.compressedPayloadBytes;

    const rawKb = (rawBytes / 1024).toFixed(2);
    const zkKb = (zkBytes / 1024).toFixed(2);

    rawSizeDisplay.textContent = `${rawKb} KB (${rawCompBytes} B compressed)`;
    zkSizeDisplay.textContent = `${zkKb} KB (${zkCompBytes} B compressed)`;

    vsatRawKb.textContent = `${rawKb} KB`;
    vsatRawComp.textContent = `${rawCompBytes} B compressed`;
    vsatZkKb.textContent = `${zkKb} KB`;
    vsatZkComp.textContent = `${zkCompBytes} B compressed`;

    vsatSavingsPct.textContent = `${comparison.byteSavingsPercent}%`;
    vsatSpeedup.textContent = `${comparison.speedupFactor}x`;

    const zkPercent = Math.max(5, Math.min(100, (zkBytes / rawBytes) * 100));
    vsatBarZk.style.width = `${zkPercent.toFixed(1)}%`;
    vsatBarZk.textContent = `ZK Package (${zkKb} KB)`;
    vsatBarText.textContent = `${zkKb} KB ZK Package vs ${rawKb} KB Raw Telemetry (${comparison.byteSavingsPercent}% Savings)`;
  }

  function renderResultUI(data) {
    const { shipResult, comparison, verifierRecord, attackMode } = data;
    currentVerificationPackage = shipResult?.verificationPackage || null;

    // 1. Level 1 Focal Card Update
    if (verifierRecord.status === "PASS") {
      resFocalCard.className = "hero-result-card pass-state";
      resStatusBadge.className = "result-badge pass";
      resStatusBadge.textContent = "✓ ZKP VERIFIED";
      resFocalTitle.textContent = "ZKP COMPLIANCE VERIFIED";
      resSummaryText.textContent = "Complete 64-record telemetry window satisfies BWMS-DEMO-V1 prototype predicate.";
      resRejectionBox.classList.add("hidden");
    } else {
      resFocalCard.className = "hero-result-card reject-state";
      resStatusBadge.className = "result-badge reject";
      resStatusBadge.textContent = "✕ VERIFICATION REJECTED";
      resFocalTitle.textContent = "SECURITY MITIGATION TRIGGERED";
      resSummaryText.textContent = "Verification failed to pass multi-layer security policy enforcement.";
      resRejectionBox.classList.remove("hidden");
      resRejectionReason.textContent = verifierRecord.reason || "Proof verification error";
    }

    const rootVal = verifierRecord.merkleRoot || "--";
    resFocalRoot.textContent = rootVal;
    evPublicRoot.textContent = rootVal;

    // 2. VSAT Metrics Update
    if (comparison) {
      updateVSATMetricsUI(comparison);
    }

    // 3. Adversarial Lab Console Update
    if (attackMode || verifierRecord.status === "REJECT") {
      labAttackName.textContent = attackMode?.name || attackMode?.type || "Attack Simulation";
      labActualBadge.textContent = verifierRecord.status;
      labMitigationType.textContent = verifierRecord.mitigationType || "Application-Level Package Policy";
      labReason.textContent = verifierRecord.reason || "Rejection enforced by verifier.";

      if (verifierRecord.status === "REJECT") {
        labMitigatedTag.className = "lab-tag mitigated";
        labMitigatedTag.textContent = "✓ ATTACK MITIGATED";
      } else {
        labMitigatedTag.className = "lab-tag reject";
        labMitigatedTag.textContent = "✕ UNMITIGATED";
      }
    }

    // 4. Blockchain Attestation Update
    chainOpId.textContent = verifierRecord.operationId || "--";
    chainWinId.textContent = verifierRecord.windowId || "--";
    chainMerkleRoot.textContent = rootVal;
    chainRuleSet.textContent = verifierRecord.ruleSetId || "BWMS-DEMO-V1";
    chainTimestamp.textContent = verifierRecord.verificationTimestamp || "--";

    if (verifierRecord.attestationTxHash) {
      chainStatusBadge.className = "chain-badge confirmed";
      chainStatusBadge.textContent = "CONFIRMED";
      chainTxHash.textContent = verifierRecord.attestationTxHash;
    } else {
      chainStatusBadge.className = "chain-badge idle";
      chainStatusBadge.textContent = "NOT RECORDED";
      chainTxHash.textContent = "None (Attestation skipped for rejected proof)";
    }

    // 5. Package Inspector Metadata
    if (currentVerificationPackage) {
      pkgCircuitId.textContent = currentVerificationPackage.circuit_id || "BWMS-TELEMETRY-64-GROTH16-V1";
      pkgOpId.textContent = currentVerificationPackage.operation_id || "OP-000001";
      pkgWinId.textContent = currentVerificationPackage.window_id || "WIN-000001";
      pkgRuleSet.textContent = currentVerificationPackage.rule_set_id || "BWMS-DEMO-V1";
    }
  }

  function showRawJsonModal() {
    if (!currentVerificationPackage) {
      modalJsonContent.textContent = "No package generated yet. Click 'RUN VERIFICATION' first.";
    } else {
      const displayPkg = {
        circuit_id: currentVerificationPackage.circuit_id,
        operation_id: currentVerificationPackage.operation_id,
        window_id: currentVerificationPackage.window_id,
        merkle_root: currentVerificationPackage.merkle_root,
        public_inputs: currentVerificationPackage.public_inputs,
        rule_set_id: currentVerificationPackage.rule_set_id,
        generated_at: currentVerificationPackage.generated_at,
        proof_system: "Groth16 / BN254",
        raw_telemetry_transmitted: "0 records (Committed ordered window)",
        proof: {
          pi_a: [
            currentVerificationPackage.proof?.pi_a?.[0]?.slice(0, 30) + "...",
            currentVerificationPackage.proof?.pi_a?.[1]?.slice(0, 30) + "..."
          ],
          pi_b: [
            [
              currentVerificationPackage.proof?.pi_b?.[0]?.[0]?.slice(0, 20) + "...",
              currentVerificationPackage.proof?.pi_b?.[0]?.[1]?.slice(0, 20) + "..."
            ],
            [
              currentVerificationPackage.proof?.pi_b?.[1]?.[0]?.slice(0, 20) + "...",
              currentVerificationPackage.proof?.pi_b?.[1]?.[1]?.slice(0, 20) + "..."
            ]
          ],
          pi_c: [
            currentVerificationPackage.proof?.pi_c?.[0]?.slice(0, 30) + "...",
            currentVerificationPackage.proof?.pi_c?.[1]?.slice(0, 30) + "..."
          ],
          protocol: currentVerificationPackage.proof?.protocol || "groth16",
          curve: currentVerificationPackage.proof?.curve || "bn128"
        }
      };
      modalJsonContent.textContent = JSON.stringify(displayPkg, null, 2);
    }
    jsonModal.classList.remove("hidden");
  }

  // Event Listeners
  btnRunValid.addEventListener("click", async () => {
    btnRunValid.disabled = true;
    try {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vsatConfig: getVsatConfig() }),
      });
      const res = await response.json();
      if (res.success) {
        await animatePipeline(true, res.data);
        renderResultUI(res.data);
      }
    } catch (err) {
      alert("Failed to run verification pipeline: " + err.message);
    } finally {
      btnRunValid.disabled = false;
    }
  });

  btnRunAttack.addEventListener("click", async () => {
    btnRunAttack.disabled = true;
    try {
      const attackType = attackSelect.value;
      const response = await fetch("/api/pipeline/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attackType, vsatConfig: getVsatConfig() }),
      });
      const res = await response.json();
      if (res.success) {
        await animatePipeline(false, res.data);
        renderResultUI(res.data);
      }
    } catch (err) {
      alert("Failed to run attack simulation: " + err.message);
    } finally {
      btnRunAttack.disabled = false;
    }
  });

  btnScrollLab.addEventListener("click", () => {
    document.getElementById("adversarial-lab").scrollIntoView({ behavior: "smooth" });
  });

  btnToggleConfig.addEventListener("click", () => {
    vsatConfigDrawer.classList.toggle("hidden");
  });

  btnCloseConfig.addEventListener("click", () => {
    vsatConfigDrawer.classList.add("hidden");
  });

  function showChainModal() {
    const txHash = chainTxHash.textContent;
    if (!txHash || txHash.includes("None")) {
      modalChainContent.textContent = "No on-chain attestation recorded. Click 'RUN VERIFICATION' to generate a valid proof and issue an EVM attestation transaction.";
    } else {
      const displayChainState = {
        network: "Hyperledger Besu / Permissioned QBFT Cluster",
        chain_id: 1337,
        contract_address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        transaction_hash: txHash,
        status: "CONFIRMED",
        attestation_data: {
          operation_id: chainOpId.textContent,
          window_id: chainWinId.textContent,
          merkle_root: chainMerkleRoot.textContent,
          rule_set_id: chainRuleSet.textContent,
          compliant: true,
          verification_timestamp: chainTimestamp.textContent,
          proof_hash: "0xa4f89d8e12b74... (SHA-256 reference of Groth16 proof)",
          verifier_address: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73"
        },
        evm_storage_proof: {
          mapping_key: `keccak256("${chainOpId.textContent}:${chainWinId.textContent}")`,
          raw_telemetry_bytes_on_chain: 0
        },
        event_signature: "AttestationRecorded(bytes32,string,string,uint256,string,bool,uint256,bytes32,address)"
      };
      modalChainContent.textContent = JSON.stringify(displayChainState, null, 2);
    }
    chainModal.classList.remove("hidden");
  }

  btnOpenChainModal.addEventListener("click", showChainModal);

  btnCloseChainModal.addEventListener("click", () => {
    chainModal.classList.add("hidden");
  });

  chainModal.addEventListener("click", (e) => {
    if (e.target === chainModal) chainModal.classList.add("hidden");
  });

  btnOpenPkgModal.addEventListener("click", showRawJsonModal);
  btnViewJsonInline.addEventListener("click", showRawJsonModal);

  btnCloseModal.addEventListener("click", () => {
    jsonModal.classList.add("hidden");
  });

  jsonModal.addEventListener("click", (e) => {
    if (e.target === jsonModal) jsonModal.classList.add("hidden");
  });
});
