document.addEventListener("DOMContentLoaded", () => {
  const btnRunValid = document.getElementById("btn-run-valid");
  const btnRunAttack = document.getElementById("btn-run-attack");
  const attackSelect = document.getElementById("attack-select");

  const cfgBandwidth = document.getElementById("cfg-bandwidth");
  const cfgLatency = document.getElementById("cfg-latency");
  const cfgLoss = document.getElementById("cfg-loss");

  const statusZkpBadge = document.getElementById("status-zkp-badge");
  const statusChainBadge = document.getElementById("status-chain-badge");

  const resOpId = document.getElementById("res-op-id");
  const resWinId = document.getElementById("res-win-id");
  const resRuleSet = document.getElementById("res-rule-set");
  const resTimestamp = document.getElementById("res-timestamp");
  const resMerkleRoot = document.getElementById("res-merkle-root");
  const resTxHash = document.getElementById("res-tx-hash");

  const attackMitigationCard = document.getElementById("attack-mitigation-card");
  const resAttackName = document.getElementById("res-attack-name");
  const resAttackActual = document.getElementById("res-attack-actual");
  const resMitigationType = document.getElementById("res-mitigation-type");
  const resReason = document.getElementById("res-reason");
  const packageJsonView = document.getElementById("package-json-view");

  const metricRawSize = document.getElementById("metric-raw-size");
  const metricZkSize = document.getElementById("metric-zk-size");
  const metricSavings = document.getElementById("metric-savings");
  const metricSpeedup = document.getElementById("metric-speedup");

  const barRaw = document.getElementById("bar-raw");
  const barZk = document.getElementById("bar-zk");
  const barSummary = document.getElementById("bar-summary");

  function getVsatConfig() {
    return {
      bandwidthKbps: Number(cfgBandwidth.value),
      roundTripLatencyMs: Number(cfgLatency.value),
      packetLossPercent: Number(cfgLoss.value),
    };
  }

  function setPipelineStepState(stepId, state) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.classList.remove("active", "passed", "failed");
    if (state) el.classList.add(state);
  }

  function resetPipeline() {
    ["step-telemetry", "step-merkle", "step-zkp", "step-vsat", "step-verifier", "step-blockchain"].forEach((step) => {
      setPipelineStepState(step, null);
    });
  }

  async function animatePipeline(isSuccess) {
    resetPipeline();
    const steps = ["step-telemetry", "step-merkle", "step-zkp", "step-vsat", "step-verifier"];
    for (const step of steps) {
      setPipelineStepState(step, "active");
      await new Promise((r) => setTimeout(r, 120));
      setPipelineStepState(step, "passed");
    }
    if (isSuccess) {
      setPipelineStepState("step-blockchain", "passed");
    } else {
      setPipelineStepState("step-verifier", "failed");
    }
  }

  function renderResult(data) {
    const { shipResult, comparison, verifierRecord, attackMode } = data;

    // 1. Render ZKP Verification Status
    if (verifierRecord.status === "PASS") {
      statusZkpBadge.className = "badge badge-pass";
      statusZkpBadge.textContent = "ZKP VERIFIED (PASS)";
      attackMitigationCard.classList.add("hidden");
    } else {
      statusZkpBadge.className = "badge badge-reject";
      statusZkpBadge.textContent = "ATTACK REJECTED (REJECT)";

      if (attackMode) {
        resAttackName.textContent = attackMode.name || attackMode.type;
        resAttackActual.textContent = verifierRecord.status;
        resMitigationType.textContent = verifierRecord.mitigationType || "Application Policy";
        resReason.textContent = verifierRecord.reason || "Verification failed";
        attackMitigationCard.classList.remove("hidden");
      }
    }

    // 2. Render Blockchain Attestation Status
    if (verifierRecord.attestationTxHash) {
      statusChainBadge.className = "badge badge-confirmed";
      statusChainBadge.textContent = `CONFIRMED (TX: ${verifierRecord.attestationTxHash.slice(0, 10)}...)`;
      resTxHash.textContent = verifierRecord.attestationTxHash;
    } else {
      statusChainBadge.className = "badge badge-idle";
      statusChainBadge.textContent = "NOT RECORDED (On-Chain skipped)";
      resTxHash.textContent = "None (Rejected or Unconfirmed)";
    }

    resOpId.textContent = verifierRecord.operationId;
    resWinId.textContent = verifierRecord.windowId;
    resRuleSet.textContent = `${verifierRecord.ruleSetId} (Metadata)`;
    resTimestamp.textContent = verifierRecord.verificationTimestamp;
    resMerkleRoot.textContent = verifierRecord.merkleRoot;

    // 3. Render Verification Package View (Collapsible)
    if (shipResult && shipResult.verificationPackage) {
      const displayPkg = {
        circuit_id: shipResult.verificationPackage.circuit_id,
        operation_id: shipResult.verificationPackage.operation_id,
        window_id: shipResult.verificationPackage.window_id,
        merkle_root: shipResult.verificationPackage.merkle_root,
        public_inputs: shipResult.verificationPackage.public_inputs,
        rule_set_id: shipResult.verificationPackage.rule_set_id,
        generated_at: shipResult.verificationPackage.generated_at,
        proof_system: "Groth16 / BN254",
        raw_telemetry_transmitted: "0 records (Committed ordered window)",
        proof: {
          pi_a: [
            shipResult.verificationPackage.proof?.pi_a?.[0]?.slice(0, 20) + "...",
            shipResult.verificationPackage.proof?.pi_a?.[1]?.slice(0, 20) + "..."
          ],
          protocol: shipResult.verificationPackage.proof?.protocol || "groth16",
          curve: shipResult.verificationPackage.proof?.curve || "bn128"
        }
      };
      packageJsonView.textContent = JSON.stringify(displayPkg, null, 2);
    }

    // 4. Render Dynamic VSAT Metrics
    if (comparison) {
      const rawBytes = comparison.rawTelemetryMetrics.rawPayloadBytes;
      const zkBytes = comparison.verificationPackageMetrics.rawPayloadBytes;
      const rawKb = (rawBytes / 1024).toFixed(2);
      const zkKb = (zkBytes / 1024).toFixed(2);

      metricRawSize.textContent = `${rawKb} KB`;
      metricZkSize.textContent = `${zkKb} KB`;
      metricSavings.textContent = `${comparison.byteSavingsPercent}%`;
      metricSpeedup.textContent = `${comparison.speedupFactor}x`;

      const zkPercent = Math.max(5, Math.min(100, (zkBytes / rawBytes) * 100));
      barZk.style.width = `${zkPercent.toFixed(1)}%`;
      barSummary.textContent = `${zkKb} KB vs ${rawKb} KB (${comparison.byteSavingsPercent}% Bandwidth Savings)`;
    }
  }

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
        await animatePipeline(true);
        renderResult(res.data);
      }
    } catch (err) {
      alert("Failed to run pipeline: " + err.message);
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
        await animatePipeline(false);
        renderResult(res.data);
      }
    } catch (err) {
      alert("Failed to run attack simulation: " + err.message);
    } finally {
      btnRunAttack.disabled = false;
    }
  });
});
