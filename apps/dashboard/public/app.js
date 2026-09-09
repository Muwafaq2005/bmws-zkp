document.addEventListener("DOMContentLoaded", () => {
  const btnRunValid = document.getElementById("btn-run-valid");
  const btnRunAttack = document.getElementById("btn-run-attack");
  const attackSelect = document.getElementById("attack-select");

  const cfgBandwidth = document.getElementById("cfg-bandwidth");
  const cfgLatency = document.getElementById("cfg-latency");
  const cfgLoss = document.getElementById("cfg-loss");

  const statusBadge = document.getElementById("status-badge");
  const attackTag = document.getElementById("attack-tag");

  const resOpId = document.getElementById("res-op-id");
  const resWinId = document.getElementById("res-win-id");
  const resRuleSet = document.getElementById("res-rule-set");
  const resTimestamp = document.getElementById("res-timestamp");
  const resMerkleRoot = document.getElementById("res-merkle-root");
  const resTxHash = document.getElementById("res-tx-hash");
  const resReason = document.getElementById("res-reason");
  const reasonCard = document.getElementById("reason-card");

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

    if (verifierRecord.status === "PASS") {
      statusBadge.className = "badge badge-pass";
      statusBadge.textContent = "CRYPTOGRAPHICALLY VERIFIED (PASS)";
      reasonCard.classList.add("hidden");
      attackTag.classList.add("hidden");
    } else {
      statusBadge.className = "badge badge-reject";
      statusBadge.textContent = "ATTACK REJECTED (REJECT)";
      resReason.textContent = `${verifierRecord.attackVector}: ${verifierRecord.reason}`;
      reasonCard.classList.remove("hidden");

      if (attackMode) {
        attackTag.textContent = `Security Test: ${attackMode.type}`;
        attackTag.classList.remove("hidden");
      }
    }

    resOpId.textContent = verifierRecord.operationId;
    resWinId.textContent = verifierRecord.windowId;
    resRuleSet.textContent = verifierRecord.ruleSetId;
    resTimestamp.textContent = verifierRecord.verificationTimestamp;
    resMerkleRoot.textContent = verifierRecord.merkleRoot;
    resTxHash.textContent = verifierRecord.attestationTxHash || "None (Rejected/Offline)";

    // Render Metrics
    const rawKb = (comparison.rawTelemetryMetrics.rawPayloadBytes / 1024).toFixed(2);
    const zkKb = (comparison.verificationPackageMetrics.rawPayloadBytes / 1024).toFixed(2);

    metricRawSize.textContent = `${rawKb} KB`;
    metricZkSize.textContent = `${zkKb} KB`;
    metricSavings.textContent = `${comparison.byteSavingsPercent}%`;
    metricSpeedup.textContent = `${comparison.speedupFactor}x`;

    const zkPercent = Math.max(5, Math.min(100, (zkKb / rawKb) * 100));
    barZk.style.width = `${zkPercent.toFixed(1)}%`;
    barSummary.textContent = `${zkKb} KB vs ${rawKb} KB (${comparison.byteSavingsPercent}% Reduction)`;
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

  // Initial load metrics fetch
  fetch("/api/metrics")
    .then((r) => r.json())
    .then((res) => {
      if (res.success && res.data.comparison) {
        const rawKb = (res.data.comparison.rawTelemetryMetrics.rawPayloadBytes / 1024).toFixed(2);
        const zkKb = (res.data.comparison.verificationPackageMetrics.rawPayloadBytes / 1024).toFixed(2);
        metricRawSize.textContent = `${rawKb} KB`;
        metricZkSize.textContent = `${zkKb} KB`;
        metricSavings.textContent = `${res.data.comparison.byteSavingsPercent}%`;
        metricSpeedup.textContent = `${res.data.comparison.speedupFactor}x`;
      }
    });
});
