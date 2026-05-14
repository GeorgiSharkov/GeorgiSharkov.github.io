const revealItems = document.querySelectorAll(".panel, .info-card, .section-heading");

revealItems.forEach((item) => {
  item.setAttribute("data-reveal", "");
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
  }
);

revealItems.forEach((item) => observer.observe(item));

const networkRoot = document.querySelector(".edge-network");
const networkSvg = document.querySelector(".edge-network-lines");
const networkNodesRoot = document.querySelector(".edge-network-nodes");

if (networkRoot && networkSvg && networkNodesRoot) {
  const isCompactViewport = window.matchMedia("(max-width: 720px)").matches;
  const pullRadius = isCompactViewport ? 170 : 250;
  const lineRadius = isCompactViewport ? 145 : 205;
  const nodeCount = isCompactViewport ? 20 : 34;
  const cursor = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
  };

  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const node = document.createElement("span");
    node.className = `edge-network-node${index % 6 === 0 ? " is-alert" : ""}`;
    networkNodesRoot.append(node);

    return {
      node,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      drift: 0.08 + Math.random() * 0.16,
      seed: Math.random() * Math.PI * 2,
    };
  });

  const maxLineCount = nodeCount * 3;
  const lines = Array.from({ length: maxLineCount }, (_, index) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    if (index % 5 === 0) {
      line.classList.add("alert-line");
    }

    networkSvg.append(line);
    return line;
  });

  const resetNodePositions = () => {
    nodes.forEach((nodeData) => {
      nodeData.x = Math.random() * window.innerWidth;
      nodeData.y = Math.random() * window.innerHeight;
    });
  };

  const updateNetwork = () => {
    const time = performance.now() * 0.0012;

    nodes.forEach((nodeData, index) => {
      const driftX = Math.cos(time * nodeData.drift + nodeData.seed) * 0.016;
      const driftY = Math.sin(time * nodeData.drift + nodeData.seed * 1.2) * 0.016;

      nodeData.vx += driftX;
      nodeData.vy += driftY;

      if (cursor.active) {
        const dx = cursor.x - nodeData.x;
        const dy = cursor.y - nodeData.y;
        const distance = Math.hypot(dx, dy);

        if (distance < pullRadius) {
          const force = 1 - distance / pullRadius;
          const orbitRadius = 24 + (index % 6) * 8;
          const orbitAngle = time * (0.5 + index * 0.01) + nodeData.seed;
          const targetX = cursor.x + Math.cos(orbitAngle) * orbitRadius;
          const targetY = cursor.y + Math.sin(orbitAngle) * orbitRadius;
          const tx = targetX - nodeData.x;
          const ty = targetY - nodeData.y;

          nodeData.vx += tx * force * 0.0055;
          nodeData.vy += ty * force * 0.0055;

          if (distance < lineRadius * 0.75) {
            nodeData.vx += dx * force * 0.0009;
            nodeData.vy += dy * force * 0.0009;
          }
        }
      }

      nodeData.vx *= 0.992;
      nodeData.vy *= 0.992;
      nodeData.x += nodeData.vx;
      nodeData.y += nodeData.vy;

      if (nodeData.x < -30) {
        nodeData.x = window.innerWidth + 30;
      } else if (nodeData.x > window.innerWidth + 30) {
        nodeData.x = -30;
      }

      if (nodeData.y < -30) {
        nodeData.y = window.innerHeight + 30;
      } else if (nodeData.y > window.innerHeight + 30) {
        nodeData.y = -30;
      }

      nodeData.node.style.transform = `translate(${nodeData.x}px, ${nodeData.y}px)`;
      nodeData.node.style.opacity = `${0.42 + ((Math.sin(time + index) + 1) * 0.16)}`;
    });

    let lineIndex = 0;

    for (let index = 0; index < nodes.length; index += 1) {
      const fromNode = nodes[index];

      for (let nextIndex = index + 1; nextIndex < nodes.length; nextIndex += 1) {
        const toNode = nodes[nextIndex];
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= lineRadius && lineIndex < lines.length) {
          const line = lines[lineIndex];
          const opacity = 1 - distance / lineRadius;

          line.setAttribute("x1", `${(fromNode.x / window.innerWidth) * 100}`);
          line.setAttribute("y1", `${(fromNode.y / window.innerHeight) * 100}`);
          line.setAttribute("x2", `${(toNode.x / window.innerWidth) * 100}`);
          line.setAttribute("y2", `${(toNode.y / window.innerHeight) * 100}`);
          line.style.opacity = `${opacity * 0.8}`;
          lineIndex += 1;
        }
      }
    }

    while (lineIndex < lines.length) {
      lines[lineIndex].style.opacity = "0";
      lineIndex += 1;
    }

    window.requestAnimationFrame(updateNetwork);
  };

  window.addEventListener("pointermove", (event) => {
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.active = true;
  });

  window.addEventListener("pointerleave", () => {
    cursor.active = false;
  });

  window.addEventListener("resize", () => {
    resetNodePositions();
  });

  resetNodePositions();
  updateNetwork();
}

const previewForm = document.querySelector("#atcor-preview-form");

if (previewForm) {
  const ownerToken = "GeorgiSharkov";
  const ownerKey = "atcorPreviewOwner";
  const attemptKey = "atcorPreviewAttempts";
  const maxVisitorAttempts = 3;
  const params = new URLSearchParams(window.location.search);

  if (params.get("owner") === ownerToken) {
    window.localStorage.setItem(ownerKey, "true");
    params.delete("owner");

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }

  const isOwner = window.localStorage.getItem(ownerKey) === "true";
  const submitButton = previewForm.querySelector('button[type="submit"]');
  const limitStatus = document.querySelector("[data-preview-limit-status]");
  const previewOutputs = {
    summary: document.querySelector('[data-preview-output="summary"]'),
    host: document.querySelector('[data-preview-output="host"]'),
    user: document.querySelector('[data-preview-output="user"]'),
    process: document.querySelector('[data-preview-output="process"]'),
    qualityBar: document.querySelector('[data-preview-output="qualityBar"]'),
    evidence: document.querySelector('[data-preview-output="evidence"]'),
    query: document.querySelector('[data-preview-output="query"]'),
    writeup: document.querySelector('[data-preview-output="writeup"]'),
    appTemplate: document.querySelector('[data-preview-output="appTemplate"]'),
    appTitle: document.querySelector('[data-preview-output="appTitle"]'),
    appHost: document.querySelector('[data-preview-output="appHost"]'),
    appUser: document.querySelector('[data-preview-output="appUser"]'),
    appProcess: document.querySelector('[data-preview-output="appProcess"]'),
    appRawAlert: document.querySelector('[data-preview-output="appRawAlert"]'),
    appTi: document.querySelector('[data-preview-output="appTi"]'),
    terminalIoc: document.querySelector('[data-preview-terminal="ioc"]'),
    terminalTriage: document.querySelector('[data-preview-terminal="triage"]'),
    terminalOutput: document.querySelector('[data-preview-terminal="output"]'),
  };

  const cases = {
    powershell: {
      summary: "Suspicious PowerShell execution detected on HOST-01",
      host: "HOST-01",
      user: "jsmith",
      process: "powershell.exe",
      technique: "T1059.001 PowerShell",
      template: "Suspicious PowerShell",
      evidence: ["Timestamp present", "Host and user context captured", "Command-line review required", "Hash and sandbox context recommended"],
    },
    usb: {
      summary: "USB-launched executable observed on FIN-LAP-22",
      host: "FIN-LAP-22",
      user: "mroberts",
      process: "invoice_viewer.exe",
      technique: "T1091 Replication Through Removable Media",
      template: "USB execution",
      evidence: ["USB insertion event present", "Executable path captured", "User confirmation required", "Remediation playbook suggested"],
    },
    download: {
      summary: "Browser download executed from user Downloads folder",
      host: "OPS-WS-07",
      user: "akhan",
      process: "setup_update.exe",
      technique: "T1204.002 Malicious File",
      template: "Downloaded from the internet",
      evidence: ["Download path captured", "Browser source noted", "Reputation check pending", "Containment recommendation generated"],
    },
    pup: {
      summary: "Potentially unwanted program detected on SALES-13",
      host: "SALES-13",
      user: "lchen",
      process: "bundle_installer.exe",
      technique: "PUP / Adware triage",
      template: "Potentially unwanted program",
      evidence: ["Detection name captured", "Install path present", "Business impact appears low", "Cleanup guidance generated"],
    },
  };

  const profileTone = {
    mdr: "We are sharing this advisory so your team can validate whether the activity was expected and confirm the preferred next action.",
    enterprise: "For the internal SOC queue, we recommend validating ownership, reviewing nearby endpoint events, and documenting the final disposition.",
    pentest: "Because this may fall within approved testing scope, please confirm the engagement window and tester activity before escalation.",
  };

  const outcomeText = {
    confirmed: "The available evidence suggests the activity should be treated as suspicious until validated.",
    fp: "The current evidence is consistent with expected activity, but the case should retain the supporting context for audit trail quality.",
    tuning: "The alert appears suitable for tuning review if the same benign pattern repeats across similar assets.",
  };

  const platformQueries = {
    sentinel: ({ host, process }) => `DeviceProcessEvents
| where DeviceName =~ "${host}"
| where FileName =~ "${process}"
| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine`,
    splunk: ({ host, process }) => `index=* host="${host}" "${process}"
| table _time host user process command_line parent_process
| sort - _time`,
    elastic: ({ host, process }) => `host.name: "${host}" and process.name: "${process}"
| fields @timestamp, host.name, user.name, process.command_line`,
    crowdstrike: ({ host, process }) => `event_simpleName=ProcessRollup2 ComputerName="${host}" FileName="${process}"
| table timestamp ComputerName UserName FileName CommandLine`,
  };

  const buildWriteup = (caseData, outcome, profile) => `
    <p>Hello,</p>
    <p>We reviewed an alert for <strong>${caseData.summary}</strong>. The key observed entity is <strong>${caseData.process}</strong> on <strong>${caseData.host}</strong> for user <strong>${caseData.user}</strong>.</p>
    <p>${outcomeText[outcome]} ${profileTone[profile]}</p>
    <p>Recommended next steps: confirm user intent, review nearby endpoint telemetry, collect any missing hash or reputation context, and document the final customer response.</p>
  `;

  const getAttempts = () => Number(window.localStorage.getItem(attemptKey) || "0");

  const setLimitStatus = () => {
    if (!limitStatus || !submitButton) {
      return;
    }

    limitStatus.classList.remove("is-warning", "is-owner");

    if (isOwner) {
      limitStatus.textContent = "Owner mode enabled: unlimited generated outputs available.";
      limitStatus.classList.add("is-owner");
      submitButton.disabled = false;
      return;
    }

    const remaining = Math.max(maxVisitorAttempts - getAttempts(), 0);
    submitButton.disabled = remaining === 0;

    if (remaining === 0) {
      limitStatus.textContent = "Visitor preview limit reached. Please contact Georgi for full access.";
      limitStatus.classList.add("is-warning");
    } else {
      limitStatus.textContent = `Visitor preview limit: ${remaining} generated output${remaining === 1 ? "" : "s"} remaining.`;
    }
  };

  const renderPreview = ({ countAttempt = false } = {}) => {
    if (countAttempt && !isOwner) {
      const attempts = getAttempts();

      if (attempts >= maxVisitorAttempts) {
        setLimitStatus();
        return;
      }

      window.localStorage.setItem(attemptKey, `${attempts + 1}`);
    }

    const formData = new FormData(previewForm);
    const scenario = formData.get("scenario");
    const outcome = formData.get("outcome");
    const platform = formData.get("platform");
    const profile = formData.get("profile");
    const caseData = cases[scenario];

    previewOutputs.summary.textContent = caseData.summary;
    previewOutputs.host.textContent = caseData.host;
    previewOutputs.user.textContent = caseData.user;
    previewOutputs.process.textContent = caseData.process;
    previewOutputs.qualityBar.style.setProperty("--score", outcome === "fp" ? "74%" : outcome === "tuning" ? "68%" : "86%");
    previewOutputs.evidence.innerHTML = caseData.evidence.map((item) => `<li>${item}</li>`).join("");
    previewOutputs.query.textContent = platformQueries[platform](caseData);
    previewOutputs.writeup.innerHTML = buildWriteup(caseData, outcome, profile);
    previewOutputs.appTemplate.textContent = caseData.template;
    previewOutputs.appTitle.textContent = caseData.summary;
    previewOutputs.appHost.textContent = caseData.host;
    previewOutputs.appUser.textContent = caseData.user;
    previewOutputs.appProcess.textContent = caseData.process;
    previewOutputs.appRawAlert.textContent = `AlertName=${caseData.summary}; Host=${caseData.host}; User=${caseData.user}; Process=${caseData.process}; Outcome=${outcome}`;
    previewOutputs.appTi.textContent = `${caseData.technique} context loaded with analyst-side notes for enrichment and customer-safe wording.`;
    previewOutputs.terminalIoc.textContent = `[ioc] host=${caseData.host} user=${caseData.user} process=${caseData.process}`;
    previewOutputs.terminalTriage.textContent = `[triage] ${caseData.technique} context loaded for analyst review`;
    previewOutputs.terminalOutput.textContent = `[output] ${platform}-queries.md writeup.md evidence-check.txt ready`;

    document.querySelectorAll(".preview-screen, .preview-command").forEach((panel) => {
      panel.classList.remove("is-preview-pulse");
      window.requestAnimationFrame(() => panel.classList.add("is-preview-pulse"));
    });

    setLimitStatus();
  };

  previewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderPreview({ countAttempt: true });
  });

  renderPreview();
  setLimitStatus();
}
