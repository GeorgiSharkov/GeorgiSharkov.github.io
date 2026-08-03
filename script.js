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
    confidence: document.querySelector('[data-preview-output="confidence"]'),
    stance: document.querySelector('[data-preview-output="stance"]'),
    nextActions: document.querySelector('[data-preview-output="nextActions"]'),
    timezoneChip: document.querySelector('[data-preview-output="timezoneChip"]'),
    severityChip: document.querySelector('[data-preview-output="severityChip"]'),
    dashboardQueue: document.querySelector('[data-preview-output="dashboardQueue"]'),
    dashboardSeverity: document.querySelector('[data-preview-output="dashboardSeverity"]'),
    dashboardConfidence: document.querySelector('[data-preview-output="dashboardConfidence"]'),
    dashboardTimezone: document.querySelector('[data-preview-output="dashboardTimezone"]'),
    dashboardSource: document.querySelector('[data-preview-output="dashboardSource"]'),
    dashboardFollow: document.querySelector('[data-preview-output="dashboardFollow"]'),
    dashboardHeadline: document.querySelector('[data-preview-output="dashboardHeadline"]'),
    dashboardSummary: document.querySelector('[data-preview-output="dashboardSummary"]'),
    qualityBar: document.querySelector('[data-preview-output="qualityBar"]'),
    evidence: document.querySelector('[data-preview-output="evidence"]'),
    query: document.querySelector('[data-preview-output="query"]'),
    writeup: document.querySelector('[data-preview-output="writeup"]'),
    appTemplate: document.querySelector('[data-preview-output="appTemplate"]'),
    appTitle: document.querySelector('[data-preview-output="appTitle"]'),
    appHost: document.querySelector('[data-preview-output="appHost"]'),
    appUser: document.querySelector('[data-preview-output="appUser"]'),
    appProcess: document.querySelector('[data-preview-output="appProcess"]'),
    appSource: document.querySelector('[data-preview-output="appSource"]'),
    appSeverity: document.querySelector('[data-preview-output="appSeverity"]'),
    appConfidence: document.querySelector('[data-preview-output="appConfidence"]'),
    appStance: document.querySelector('[data-preview-output="appStance"]'),
    appTimezoneLabel: document.querySelector('[data-preview-output="appTimezoneLabel"]'),
    appLocalTime: document.querySelector('[data-preview-output="appLocalTime"]'),
    appTimezoneDelta: document.querySelector('[data-preview-output="appTimezoneDelta"]'),
    appNextActions: document.querySelector('[data-preview-output="appNextActions"]'),
    platformFollowPrimary: document.querySelector('[data-preview-output="platformFollowPrimary"]'),
    platformFollowSecondary: document.querySelector('[data-preview-output="platformFollowSecondary"]'),
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
      nextActions: "Confirm whether the command was expected, inspect child-process and network activity, and prepare containment if the script chain extends beyond approved admin use.",
    },
    usb: {
      summary: "USB-launched executable observed on FIN-LAP-22",
      host: "FIN-LAP-22",
      user: "mroberts",
      process: "invoice_viewer.exe",
      technique: "T1091 Replication Through Removable Media",
      template: "USB execution",
      evidence: ["USB insertion event present", "Executable path captured", "User confirmation required", "Remediation playbook suggested"],
      nextActions: "Validate business purpose for the device, review recent file execution from removable media, and preserve copied file paths before user cleanup removes evidence.",
    },
    download: {
      summary: "Browser download executed from user Downloads folder",
      host: "OPS-WS-07",
      user: "akhan",
      process: "setup_update.exe",
      technique: "T1204.002 Malicious File",
      template: "Downloaded from the internet",
      evidence: ["Download path captured", "Browser source noted", "Reputation check pending", "Containment recommendation generated"],
      nextActions: "Check file reputation, review browser history and parent process context, and isolate the host if execution chains or follow-on downloads suggest broader compromise.",
    },
    pup: {
      summary: "Potentially unwanted program detected on SALES-13",
      host: "SALES-13",
      user: "lchen",
      process: "bundle_installer.exe",
      technique: "PUP / Adware triage",
      template: "Potentially unwanted program",
      evidence: ["Detection name captured", "Install path present", "Business impact appears low", "Cleanup guidance generated"],
      nextActions: "Validate whether the software was user-approved, review persistence or browser-extension changes, and use the case for tuning if the pattern is repeatedly benign.",
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

  const queueState = {
    confirmed: "Escalate and prepare response",
    fp: "Document and close cleanly",
    tuning: "Tuning review and analyst note",
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

  const severityState = {
    critical: {
      label: "Critical",
      score: "93%",
      confidence: "High confidence",
      stance: "Contain rapidly and escalate immediately.",
    },
    high: {
      label: "High",
      score: "86%",
      confidence: "Moderate confidence",
      stance: "Validate quickly and prepare containment.",
    },
    medium: {
      label: "Medium",
      score: "74%",
      confidence: "Working confidence",
      stance: "Investigate deeply before taking disruptive action.",
    },
    low: {
      label: "Low",
      score: "61%",
      confidence: "Low confidence",
      stance: "Monitor and document while checking for repeat patterns.",
    },
  };

  const timezoneState = {
    london: {
      label: "Europe / London",
      delta: "+1 hour local offset",
      localTime: "2026-04-07 22:04:32 BST",
    },
    newyork: {
      label: "US / New York",
      delta: "-4 hours local offset",
      localTime: "2026-04-07 17:04:32 EDT",
    },
    tokyo: {
      label: "Asia / Tokyo",
      delta: "+9 hours local offset",
      localTime: "2026-04-08 06:04:32 JST",
    },
    sofia: {
      label: "Europe / Sofia",
      delta: "+3 hours local offset",
      localTime: "2026-04-08 00:04:32 EEST",
    },
  };

  const sourceState = {
    splunk: {
      label: "Splunk exported alert",
      followPrimary: "Follow in Splunk",
      followSecondary: "Open source alert export",
    },
    wazuh: {
      label: "Wazuh exported alert",
      followPrimary: "Follow in Wazuh",
      followSecondary: "Open Wazuh alert payload",
    },
    secops: {
      label: "Google SecOps exported alert",
      followPrimary: "Follow in Google SecOps",
      followSecondary: "Open SecOps alert export",
    },
    manual: {
      label: "Manual analyst intake",
      followPrimary: "Review pasted intake",
      followSecondary: "Open analyst notes",
    },
  };

  const buildWriteup = (caseData, outcome, profile, severity, timezone) => `
    <p>Hello,</p>
    <p>We reviewed an alert for <strong>${caseData.summary}</strong>. The key observed entity is <strong>${caseData.process}</strong> on <strong>${caseData.host}</strong> for user <strong>${caseData.user}</strong>.</p>
    <p>${outcomeText[outcome]} ${profileTone[profile]}</p>
    <p>The current severity stance is <strong>${severity.label}</strong>, and the alert time has been compared against <strong>${timezone.label}</strong> to help align the investigation context.</p>
    <p>Recommended next steps: ${caseData.nextActions}</p>
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
    const severity = formData.get("severity");
    const timezone = formData.get("timezone");
    const source = formData.get("source");
    const caseData = cases[scenario];
    const severityData = severityState[severity];
    const timezoneData = timezoneState[timezone];
    const sourceData = sourceState[source];

    previewOutputs.summary.textContent = caseData.summary;
    previewOutputs.host.textContent = caseData.host;
    previewOutputs.user.textContent = caseData.user;
    previewOutputs.process.textContent = caseData.process;
    previewOutputs.confidence.textContent = severityData.confidence;
    previewOutputs.stance.textContent = severityData.stance;
    previewOutputs.nextActions.textContent = caseData.nextActions;
    previewOutputs.timezoneChip.textContent = timezoneData.label;
    previewOutputs.severityChip.textContent = severityData.label;
    previewOutputs.dashboardQueue.textContent = queueState[outcome];
    previewOutputs.dashboardSeverity.textContent = severityData.label;
    previewOutputs.dashboardConfidence.textContent = severityData.confidence;
    previewOutputs.dashboardTimezone.textContent = timezoneData.label;
    previewOutputs.dashboardSource.textContent = sourceData.label;
    previewOutputs.dashboardFollow.textContent = sourceData.followPrimary;
    previewOutputs.dashboardHeadline.textContent = `${caseData.summary} ${outcome === "confirmed" ? "needs analyst escalation." : outcome === "fp" ? "looks consistent with expected activity." : "should be reviewed for tuning."}`;
    previewOutputs.dashboardSummary.textContent = `${severityData.stance} ${caseData.nextActions} Source path: ${sourceData.label}.`;
    previewOutputs.qualityBar.style.setProperty("--score", outcome === "fp" ? "74%" : outcome === "tuning" ? "68%" : severityData.score);
    previewOutputs.evidence.innerHTML = caseData.evidence.map((item) => `<li>${item}</li>`).join("");
    previewOutputs.query.textContent = platformQueries[platform](caseData);
    previewOutputs.writeup.innerHTML = buildWriteup(caseData, outcome, profile, severityData, timezoneData);
    previewOutputs.appTemplate.textContent = caseData.template;
    previewOutputs.appTitle.textContent = caseData.summary;
    previewOutputs.appHost.textContent = caseData.host;
    previewOutputs.appUser.textContent = caseData.user;
    previewOutputs.appProcess.textContent = caseData.process;
    previewOutputs.appSource.textContent = sourceData.label;
    previewOutputs.appSeverity.textContent = severityData.label;
    previewOutputs.appConfidence.textContent = severityData.confidence;
    previewOutputs.appStance.textContent = severityData.stance;
    previewOutputs.appTimezoneLabel.textContent = `${timezoneData.label.replace(" / ", "/")}:`;
    previewOutputs.appLocalTime.textContent = timezoneData.localTime;
    previewOutputs.appTimezoneDelta.textContent = timezoneData.delta;
    previewOutputs.appNextActions.textContent = caseData.nextActions;
    previewOutputs.platformFollowPrimary.textContent = sourceData.followPrimary;
    previewOutputs.platformFollowSecondary.textContent = sourceData.followSecondary;
    previewOutputs.appRawAlert.textContent = `AlertName=${caseData.summary}; Source=${sourceData.label}; Host=${caseData.host}; User=${caseData.user}; Process=${caseData.process}; Outcome=${outcome}; Severity=${severityData.label}; Timezone=${timezoneData.label}`;
    previewOutputs.appTi.textContent = `${caseData.technique} context loaded with analyst-side notes, local time comparison for ${timezoneData.label}, source path ${sourceData.label}, and customer-safe wording guidance.`;
    previewOutputs.terminalIoc.textContent = `[ioc] host=${caseData.host} user=${caseData.user} process=${caseData.process}`;
    previewOutputs.terminalTriage.textContent = `[triage] ${caseData.technique} context loaded with ${severityData.label.toLowerCase()} severity and ${timezoneData.label} local time`;
    previewOutputs.terminalOutput.textContent = `[output] ${platform}-queries.md writeup.md next-actions.txt response-pack ready`;

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

const guidanceRoot = document.querySelector("[data-guidance-root]");

if (guidanceRoot) {
  const guidanceSearch = document.querySelector("[data-guidance-search]");
  const guidanceFilters = document.querySelector("[data-guidance-filters]");
  const guidanceTableBody = document.querySelector("[data-guidance-table-body]");
  const guidanceResultsLabel = document.querySelector("[data-guidance-results-label]");
  const guidanceActiveFilter = document.querySelector("[data-guidance-active-filter]");
  const guidanceDetail = {
    alert: document.querySelector('[data-guidance-detail="alert"]'),
    technique: document.querySelector('[data-guidance-detail="technique"]'),
    tactics: document.querySelector('[data-guidance-detail="tactics"]'),
    summary: document.querySelector('[data-guidance-detail="summary"]'),
    investigation: document.querySelector('[data-guidance-detail="investigation"]'),
    evidence: document.querySelector('[data-guidance-detail="evidence"]'),
    remediation: document.querySelector('[data-guidance-detail="remediation"]'),
    related: document.querySelector('[data-guidance-detail="related"]'),
    mitreLink: document.querySelector('[data-guidance-detail="mitre-link"]'),
  };
  const guidanceStats = {
    count: document.querySelector('[data-guidance-stat="count"]'),
    tactics: document.querySelector('[data-guidance-stat="tactics"]'),
    focus: document.querySelector('[data-guidance-stat="focus"]'),
  };
  const guidanceEntries = [
    {
      id: "powershell-execution",
      alert: "Suspicious PowerShell execution",
      alertFamily: "Encoded commands, download cradle, or unusual child-process activity",
      techniqueId: "T1059.001",
      techniqueName: "PowerShell",
      mitreUrl: "https://attack.mitre.org/techniques/T1059/001/",
      tactics: ["Execution"],
      platforms: ["Windows"],
      focus: "Command line, script block logging, parent-child process chain",
      summary: "Use this playbook when the alert points to PowerShell being used for execution, staging, reconnaissance, or scripted follow-on actions. Treat it as higher priority if the command line is encoded, hidden, or immediately followed by network or persistence activity.",
      investigation: [
        "Confirm who launched PowerShell, from which host, and whether the parent process is expected for that user or system role.",
        "Review the full command line, script block logs, and any encoded or compressed content before deciding whether the activity is administrative or malicious.",
        "Check for immediate follow-on actions such as file download, scheduled task creation, registry persistence, credential access tooling, or outbound network connections.",
        "Validate whether the host is part of a known admin workflow, automation path, or sanctioned support action before escalating the case.",
        "Pivot across nearby endpoint events for the same user, host, script path, hash, URL, or child process to determine whether the activity is isolated or campaign-like.",
      ],
      evidence: [
        "Process tree including parent, child, and sibling processes",
        "PowerShell command line, script block logs, and transcript coverage if enabled",
        "User logon context, asset criticality, and recent change window",
        "Network connections, downloaded files, and persistence indicators created after execution",
      ],
      remediation: [
        "Isolate the host if execution is confirmed and the command performed staging, credential access, or persistence actions.",
        "Block or contain the malicious script path, URL, hash, or delivery mechanism at the relevant control points.",
        "Reset credentials or tokens if the script touched credential material, admin tooling, or privileged sessions.",
        "Harden PowerShell logging and restrict unnecessary execution paths if the same blind spot appears across multiple alerts.",
      ],
      related: [
        { id: "T1105", name: "Ingress Tool Transfer", url: "https://attack.mitre.org/techniques/T1105/" },
        { id: "T1053.005", name: "Scheduled Task", url: "https://attack.mitre.org/techniques/T1053/005/" },
      ],
      keywords: ["powershell", "encodedcommand", "script", "iex", "downloadstring", "execution"],
    },
    {
      id: "malicious-file-execution",
      alert: "Suspicious browser or email file execution",
      alertFamily: "Downloaded archive, ISO, Office file, LNK, or executable launched by user action",
      techniqueId: "T1204.002",
      techniqueName: "User Execution: Malicious File",
      mitreUrl: "https://attack.mitre.org/techniques/T1204/002/",
      tactics: ["Execution"],
      platforms: ["Windows", "Linux", "macOS"],
      focus: "Delivery path, user interaction, attachment lineage, and follow-on behavior",
      summary: "Use this playbook when a suspicious file appears to have been opened by a user from email, browser download, chat, shared storage, or removable media. The key decision is whether the file was benign business content, a policy breach, or malicious execution that triggered follow-on activity.",
      investigation: [
        "Trace the file delivery path from email, browser, chat, cloud storage, or removable media into the execution event.",
        "Confirm whether the file type, name, icon, and extension match user expectation or show signs of masquerading.",
        "Review child processes, script launch, DLL load behavior, or network calls that followed the user opening the file.",
        "Check whether the same file hash, name, or URL touched other users or hosts during the same timeframe.",
        "Decide whether the event is a user mistake, benign business content, or confirmed malicious execution based on follow-on evidence.",
      ],
      evidence: [
        "File path, hash, signer, prevalence, and creation timestamps",
        "Browser or email source, referring URL, message details, and download history",
        "Process lineage and post-open activity such as macro, script, or LOLBin execution",
        "Any reputation, sandbox, or detonation output available during triage",
      ],
      remediation: [
        "Quarantine the file and isolate the host if execution produced malicious child activity or outbound communications.",
        "Block the sender, URL, hash, or delivery path at the relevant mail, proxy, or endpoint control.",
        "Reset affected credentials and review user exposure if the file led to phishing, malware staging, or hands-on-keyboard activity.",
        "Feed the validated indicators back into detection logic to catch the same lure or payload earlier next time.",
      ],
      related: [
        { id: "T1105", name: "Ingress Tool Transfer", url: "https://attack.mitre.org/techniques/T1105/" },
        { id: "T1059.001", name: "PowerShell", url: "https://attack.mitre.org/techniques/T1059/001/" },
      ],
      keywords: ["download", "attachment", "browser", "email", "iso", "lnk", "office", "malicious file"],
    },
    {
      id: "removable-media",
      alert: "Removable media execution or USB spread",
      alertFamily: "USB insertion followed by file execution, copy, or autorun-like behavior",
      techniqueId: "T1091",
      techniqueName: "Replication Through Removable Media",
      mitreUrl: "https://attack.mitre.org/techniques/T1091/",
      tactics: ["Initial Access", "Lateral Movement"],
      platforms: ["Windows"],
      focus: "Device history, file movement, user intent, and spread potential",
      summary: "Use this playbook when the case points to activity from removable media, especially if a file is executed shortly after insertion, copied to multiple hosts, or disguised as legitimate business content.",
      investigation: [
        "Confirm the removable device identifier, insertion time, host timeline, and user associated with the event.",
        "Review file creation, copy, and execution activity immediately before and after the device was mounted.",
        "Validate whether the same device serial or file hash appeared on other endpoints to assess potential spread.",
        "Check whether the payload name, icon, or location suggests disguise or user deception.",
        "Determine whether the activity matches sanctioned business use or whether it needs containment as potential lateral spread or initial access.",
      ],
      evidence: [
        "USB device serial, vendor, mount history, and endpoint timeline",
        "Executed file path, hash, signer, and launch chain after insertion",
        "Any copy events to shares, other removable media, or user profile locations",
        "Cross-host sightings of the same device or file indicators",
      ],
      remediation: [
        "Isolate affected hosts if the media introduced malware or the same payload appears across multiple endpoints.",
        "Block or restrict removable media use on the impacted segment when policy or threat posture requires it.",
        "Collect and secure the physical media if escalation, DFIR, or legal review is required.",
        "Rotate credentials and review nearby user actions if the device was used as part of broader intrusion activity.",
      ],
      related: [
        { id: "T1204.002", name: "Malicious File", url: "https://attack.mitre.org/techniques/T1204/002/" },
      ],
      keywords: ["usb", "removable media", "autorun", "device control", "lateral movement", "initial access"],
    },
    {
      id: "registry-run-keys",
      alert: "Registry run key or startup folder persistence",
      alertFamily: "Startup location modification, autorun registration, or suspicious logon persistence",
      techniqueId: "T1547.001",
      techniqueName: "Registry Run Keys / Startup Folder",
      mitreUrl: "https://attack.mitre.org/techniques/T1547/001/",
      tactics: ["Persistence", "Privilege Escalation"],
      platforms: ["Windows"],
      focus: "Modified startup locations, binary path trust, and persistence durability",
      summary: "Use this playbook when an alert shows a new or modified run key, run-once value, startup folder item, or policy-based autorun path. Treat it as more serious if the referenced binary is unsigned, hidden in user space, or tied to a recent suspicious execution chain.",
      investigation: [
        "Confirm the exact registry path or startup folder location that changed and capture the before/after value if available.",
        "Validate the referenced binary, script, or shortcut path, including signer, hash, file age, and whether it lives in an unusual directory.",
        "Review the process and user context that created or modified the persistence mechanism.",
        "Check whether the same persistence location or payload exists on additional hosts or user profiles.",
        "Determine whether the entry aligns with sanctioned software installation or whether it is durable malicious persistence.",
      ],
      evidence: [
        "Registry modification event details or startup folder file metadata",
        "Referenced binary or script path, hash, signer, and parent process lineage",
        "User logon history and whether the artifact executed during the next session",
        "Cross-host or cross-user prevalence for the same persistence item",
      ],
      remediation: [
        "Remove the malicious run key, startup folder item, or dependent artifact once the payload and execution chain are understood.",
        "Quarantine the referenced file and isolate the host if persistence is linked to active compromise.",
        "Review nearby admin actions and software deployment records before deleting legitimate enterprise tooling entries.",
        "Add or improve detections for new autorun entries that reference user-space scripts, LOLBins, or unsigned binaries.",
      ],
      related: [
        { id: "T1112", name: "Modify Registry", url: "https://attack.mitre.org/techniques/T1112/" },
        { id: "T1053.005", name: "Scheduled Task", url: "https://attack.mitre.org/techniques/T1053/005/" },
      ],
      keywords: ["run key", "startup folder", "registry", "persistence", "autorun", "hkcu", "hklm"],
    },
    {
      id: "scheduled-task",
      alert: "Suspicious scheduled task creation or modification",
      alertFamily: "schtasks, Task Scheduler, or XML task registration tied to unusual binaries",
      techniqueId: "T1053.005",
      techniqueName: "Scheduled Task",
      mitreUrl: "https://attack.mitre.org/techniques/T1053/005/",
      tactics: ["Execution", "Persistence", "Privilege Escalation"],
      platforms: ["Windows"],
      focus: "Task action, run-as account, trigger logic, and referenced payload path",
      summary: "Use this playbook when an alert points to a newly created or modified Windows scheduled task, especially if it runs from temp paths, user profile locations, script interpreters, or disguised names that imitate enterprise software.",
      investigation: [
        "Capture the task name, XML details, author, trigger, run-as account, and action target.",
        "Review the binary or script launched by the task and compare it against expected software deployment or admin maintenance activity.",
        "Check whether the task was created by a script interpreter, MSI, remote admin tool, or suspicious parent process.",
        "Look for execution history showing whether the task already ran, failed, or spawned additional processes.",
        "Assess whether the task is legitimate automation, noisy admin tooling, or malicious persistence/execution.",
      ],
      evidence: [
        "Task definition, trigger timing, and command arguments",
        "Creator process lineage and user or service account context",
        "Artifacts written by the launched payload and any follow-on network activity",
        "Comparative sightings of the same task name or XML body on other hosts",
      ],
      remediation: [
        "Disable and remove the malicious task after preserving evidence of the action target and execution history.",
        "Quarantine the referenced payload and isolate the host if the task was used for repeated execution or persistence.",
        "Audit administrative task creation rights if the same technique appears in multiple systems without a valid business driver.",
        "Add detections for task registration from script interpreters, user-writeable locations, or misleading Microsoft-like names.",
      ],
      related: [
        { id: "T1059.001", name: "PowerShell", url: "https://attack.mitre.org/techniques/T1059/001/" },
        { id: "T1547.001", name: "Registry Run Keys / Startup Folder", url: "https://attack.mitre.org/techniques/T1547/001/" },
      ],
      keywords: ["scheduled task", "schtasks", "task scheduler", "xml", "persistence", "privilege escalation"],
    },
    {
      id: "tool-transfer",
      alert: "Suspicious tool download or remote payload transfer",
      alertFamily: "curl, certutil, bitsadmin, PowerShell, or script-based payload retrieval",
      techniqueId: "T1105",
      techniqueName: "Ingress Tool Transfer",
      mitreUrl: "https://attack.mitre.org/techniques/T1105/",
      tactics: ["Command and Control"],
      platforms: ["Windows", "Linux", "macOS"],
      focus: "Transfer utility, source destination, payload path, and post-download execution",
      summary: "Use this playbook when a tool or payload is transferred from an external source into the environment through shell utilities, scripts, or command-and-control behavior. The core question is whether the transfer was sanctioned administration, software deployment, or threat staging.",
      investigation: [
        "Identify the transfer mechanism, destination path, remote source, and whether the utility is expected on that host.",
        "Review the downloaded file hash, signer, file type, and whether it executed immediately after landing.",
        "Correlate the transfer with the initiating user, session, script, or service context to determine intent.",
        "Check whether the same remote source, destination path, or payload hash appears across additional hosts.",
        "Decide whether the event is an admin workflow, a policy violation, or malicious staging for follow-on execution.",
      ],
      evidence: [
        "Command line and process chain for curl, certutil, bitsadmin, PowerShell, or equivalent utility",
        "Remote source host, URL, TLS metadata, and any proxy or DNS visibility available",
        "File write path, hash, signer, and first execution evidence",
        "Nearby persistence, credential access, or beaconing behavior after the transfer",
      ],
      remediation: [
        "Block the malicious source domain, IP, URL, or object hash at the relevant control points.",
        "Quarantine the transferred payload and isolate the host if the tool was staged for execution or persistence.",
        "Reset credentials or invalidate tokens if the download was linked to hands-on-keyboard or remote session abuse.",
        "Tune detections to elevate transfers that land in temp, user profile, or script-driven staging locations.",
      ],
      related: [
        { id: "T1059.001", name: "PowerShell", url: "https://attack.mitre.org/techniques/T1059/001/" },
        { id: "T1204.002", name: "Malicious File", url: "https://attack.mitre.org/techniques/T1204/002/" },
      ],
      keywords: ["download", "transfer", "curl", "certutil", "bitsadmin", "payload", "tool transfer", "command and control"],
    },
    {
      id: "registry-modification",
      alert: "Suspicious registry modification tied to defense evasion or persistence",
      alertFamily: "Key or value modifications affecting startup, security settings, or tool configuration",
      techniqueId: "T1112",
      techniqueName: "Modify Registry",
      mitreUrl: "https://attack.mitre.org/techniques/T1112/",
      tactics: ["Persistence"],
      platforms: ["Windows"],
      focus: "Changed key intent, privilege required, and whether the key weakens defenses or stores attacker state",
      summary: "Use this playbook when a detection highlights suspicious registry changes outside normal installer or policy activity. The priority rises when keys weaken defenses, store suspicious configuration, or pair with execution and persistence artifacts.",
      investigation: [
        "Identify the exact key, value, old state, and new state to understand whether the change affects persistence, policy, or defense configuration.",
        "Confirm which process and user context performed the modification and whether that actor normally changes the targeted hive.",
        "Review whether the same process also created files, tasks, services, or network activity immediately before or after the registry change.",
        "Check if the modified value enables macros, weakens browser or Office controls, hides artifacts, or stages persistence.",
        "Validate whether the change came from sanctioned software deployment, admin activity, or attacker tradecraft.",
      ],
      evidence: [
        "Registry path, previous and current value data, and write timestamp",
        "Creator process lineage and any associated command line or script content",
        "Nearby host changes such as service creation, scheduled task registration, or dropped binaries",
        "Change-management or software-installation context if the host is part of a managed rollout",
      ],
      remediation: [
        "Revert unauthorized registry changes after preserving enough evidence to explain their purpose and impact.",
        "Contain the host if the change weakened controls, enabled persistence, or supported confirmed malicious execution.",
        "Restrict unnecessary write access to sensitive registry locations where practical.",
        "Create follow-on detections for the same key family, writer process, or actor pattern if the case is confirmed.",
      ],
      related: [
        { id: "T1547.001", name: "Registry Run Keys / Startup Folder", url: "https://attack.mitre.org/techniques/T1547/001/" },
      ],
      keywords: ["modify registry", "reg add", "policy", "defense evasion", "persistence", "runonce", "windows registry"],
    },
    {
      id: "spearphishing-link",
      alert: "Suspicious phishing link or credential-harvest redirect",
      alertFamily: "Inbound message followed by a risky URL click, download, OAuth consent, or credential entry",
      techniqueId: "T1566.002",
      techniqueName: "Phishing: Spearphishing Link",
      mitreUrl: "https://attack.mitre.org/techniques/T1566/002/",
      tactics: ["Initial Access"],
      platforms: ["Identity Provider", "Office Suite", "SaaS", "Windows", "Linux", "macOS"],
      focus: "Message provenance, URL chain, user interaction, identity activity, and endpoint follow-on",
      summary: "Use this playbook when a user receives or follows a suspicious link from email, chat, or another messaging service. Correlate the message, redirect chain, browser activity, identity events, and endpoint behavior before deciding whether the case is delivery only, credential exposure, consent abuse, or malware execution.",
      investigation: [
        "Preserve the original message and identify the sender, recipient scope, authentication results, embedded URLs, and delivery time.",
        "Resolve the complete redirect chain safely and compare the final domain, registration age, certificate, page purpose, and reputation with the claimed sender.",
        "Confirm whether the user clicked, entered credentials, approved an OAuth application, supplied a device code, or downloaded and opened content.",
        "Review identity-provider, proxy, DNS, browser, and endpoint telemetry for suspicious sign-ins, token grants, downloads, or child processes after the click.",
        "Search for the same sender, subject, URL, domain, or campaign markers across other mailboxes and endpoints to establish blast radius.",
      ],
      evidence: [
        "Original message headers, body, attachments, URLs, and mail-security verdicts",
        "URL redirect chain, DNS and proxy records, browser history, and download events",
        "IdP sign-ins, MFA prompts, OAuth consent grants, token activity, and mailbox changes",
        "Endpoint process lineage and network activity immediately following user interaction",
      ],
      remediation: [
        "Purge matching messages and block confirmed malicious senders, URLs, domains, and downloaded objects.",
        "Reset exposed credentials, revoke sessions and refresh tokens, and remove malicious OAuth grants when identity compromise is possible.",
        "Isolate the endpoint if the link led to file execution, browser exploitation, or suspicious child-process activity.",
        "Notify affected users with precise guidance and feed validated campaign indicators into mail, web, identity, and endpoint detections.",
      ],
      related: [
        { id: "T1204.001", name: "Malicious Link", url: "https://attack.mitre.org/techniques/T1204/001/" },
        { id: "T1078", name: "Valid Accounts", url: "https://attack.mitre.org/techniques/T1078/" },
      ],
      keywords: ["phishing", "spearphishing", "url", "link", "credential harvest", "oauth", "device code", "email", "redirect"],
    },
    {
      id: "windows-service",
      alert: "Suspicious Windows service creation or modification",
      alertFamily: "New service, altered ImagePath, unusual service account, or service execution from a user-writeable path",
      techniqueId: "T1543.003",
      techniqueName: "Create or Modify System Process: Windows Service",
      mitreUrl: "https://attack.mitre.org/techniques/T1543/003/",
      tactics: ["Persistence", "Privilege Escalation"],
      platforms: ["Windows"],
      focus: "Service configuration, creator process, execution account, payload trust, and remote origin",
      summary: "Use this playbook when a service is installed or changed outside an expected deployment. Prioritise services that run as SYSTEM, reference scripts or binaries in temporary and user-writeable locations, imitate trusted software, or appear after remote administration activity.",
      investigation: [
        "Capture the service name, display name, ImagePath, start type, service account, description, recovery actions, and creation or modification time.",
        "Identify the process, command line, user, and logon session that created or changed the service, including remote service-control activity.",
        "Validate the referenced binary or script using signer, hash, prevalence, file age, path ownership, and approved software records.",
        "Review service start events and child processes, network connections, file writes, and privilege changes produced by the service.",
        "Search for the same service name, payload, creator, or command line on additional hosts to determine whether it is deployment activity or lateral movement.",
      ],
      evidence: [
        "Service Control Manager events and current service configuration",
        "Registry values under the service key and referenced payload metadata",
        "Creator process tree, user or remote logon context, and source host",
        "Service execution history, child processes, network traffic, and cross-host prevalence",
      ],
      remediation: [
        "Stop and disable a confirmed malicious service, then preserve and quarantine its payload before removal.",
        "Isolate affected hosts when the service provides persistence, privilege escalation, or remote execution.",
        "Rotate credentials used to create or run the service if they may be compromised, especially privileged or service accounts.",
        "Restrict remote service administration and alert on new services using user-writeable paths, script interpreters, or misleading names.",
      ],
      related: [
        { id: "T1569.002", name: "Service Execution", url: "https://attack.mitre.org/techniques/T1569/002/" },
        { id: "T1021.002", name: "SMB/Windows Admin Shares", url: "https://attack.mitre.org/techniques/T1021/002/" },
      ],
      keywords: ["service", "sc.exe", "services.exe", "imagepath", "system", "persistence", "service control manager", "remote service"],
    },
    {
      id: "credential-dumping",
      alert: "Credential dumping or suspicious LSASS and SAM access",
      alertFamily: "Sensitive process memory access, registry hive export, credential-dumping utility, or replication abuse",
      techniqueId: "T1003",
      techniqueName: "OS Credential Dumping",
      mitreUrl: "https://attack.mitre.org/techniques/T1003/",
      tactics: ["Credential Access"],
      platforms: ["Windows", "Linux", "macOS"],
      focus: "Sensitive credential-store access, privilege context, tool lineage, and subsequent account use",
      summary: "Use this playbook when a process accesses LSASS memory, exports SAM or SECURITY hives, targets NTDS, reads credential stores, or resembles known dumping behavior. Because successful dumping enables rapid privilege escalation and lateral movement, suspicious activity should be handled as potentially high impact.",
      investigation: [
        "Identify the process, signer, hash, command line, integrity level, user, and parent chain responsible for accessing the credential store.",
        "Determine which credential source was targeted, such as LSASS, SAM, LSA Secrets, cached credentials, NTDS, DCSync, or Unix credential files.",
        "Validate whether an approved security, backup, identity, or diagnostic tool can explain the access and whether its execution path is expected.",
        "Look for dump files, handle access, registry saves, shadow copies, replication requests, archive creation, or outbound transfer after the event.",
        "Hunt for subsequent use of affected accounts through remote logons, service creation, scheduled tasks, SMB, RDP, VPN, cloud, or privileged actions.",
      ],
      evidence: [
        "Sensitive process-access telemetry, handle rights, memory-read events, and process lineage",
        "Command history, registry hive exports, dump files, archives, and NTDS or replication activity",
        "Account privileges, interactive and remote logons, and authentication source hosts",
        "EDR prevention verdicts, security-tool allowlists, and known administrative maintenance windows",
      ],
      remediation: [
        "Isolate the host and preserve volatile evidence when credential access is confirmed or cannot be safely explained.",
        "Reset or rotate exposed user, admin, service, and machine credentials according to the credential source and blast radius.",
        "Revoke active sessions and tokens, then monitor affected identities for reuse across endpoint, VPN, SaaS, and cloud services.",
        "Enable credential protections such as LSASS protection, Credential Guard, relevant ASR rules, least privilege, and restricted admin workflows where applicable.",
      ],
      related: [
        { id: "T1003.001", name: "LSASS Memory", url: "https://attack.mitre.org/techniques/T1003/001/" },
        { id: "T1078", name: "Valid Accounts", url: "https://attack.mitre.org/techniques/T1078/" },
      ],
      keywords: ["credential dumping", "lsass", "mimikatz", "sam", "ntds", "dcsync", "lsa secrets", "procdump", "credential access"],
    },
    {
      id: "smb-admin-shares",
      alert: "Suspicious SMB or Windows admin-share lateral movement",
      alertFamily: "Unexpected ADMIN$, C$, or IPC$ access, remote file copy, service execution, or authenticated SMB fan-out",
      techniqueId: "T1021.002",
      techniqueName: "Remote Services: SMB/Windows Admin Shares",
      mitreUrl: "https://attack.mitre.org/techniques/T1021/002/",
      tactics: ["Lateral Movement"],
      platforms: ["Windows"],
      focus: "Source identity and host, share access, remote execution chain, payload movement, and fan-out",
      summary: "Use this playbook when a host or identity accesses Windows administrative shares unexpectedly, transfers executables remotely, or combines SMB with service, task, WMI, or PsExec-like execution. Separate legitimate management activity from credential-backed lateral movement by validating source, scope, and follow-on behavior.",
      investigation: [
        "Identify the source host, destination host, account, logon type, authentication package, share name, object path, and connection timeline.",
        "Check whether the source system and account are approved for remote administration of the destination and whether the timing matches a change window.",
        "Review files written to ADMIN$, C$, or other shares and determine whether they were executed through a service, task, WMI, or another remote mechanism.",
        "Assess fan-out by searching for the same source, account, hash, filename, or share-access pattern across the environment.",
        "Correlate with credential-access alerts, unusual privilege use, failed logons, firewall events, and endpoint activity on both source and destination.",
      ],
      evidence: [
        "SMB share-access and network logon events with source and destination context",
        "Remote file creation, hash, signer, path, and execution evidence",
        "Service, scheduled-task, WMI, PsExec-like, or RPC activity following the share connection",
        "Identity history, source-host posture, administrative scope, and cross-host fan-out",
      ],
      remediation: [
        "Contain source and affected destination hosts if the activity represents unauthorised remote execution or payload movement.",
        "Disable or reset the compromised account, revoke sessions, and investigate where its credentials were obtained.",
        "Block malicious payloads and restrict SMB and administrative-share access to approved management paths and administrator tiers.",
        "Review other systems reachable by the same identity and source host before declaring containment complete.",
      ],
      related: [
        { id: "T1078", name: "Valid Accounts", url: "https://attack.mitre.org/techniques/T1078/" },
        { id: "T1543.003", name: "Windows Service", url: "https://attack.mitre.org/techniques/T1543/003/" },
      ],
      keywords: ["smb", "admin$", "c$", "ipc$", "psexec", "lateral movement", "remote service", "network logon", "share access"],
    },
    {
      id: "valid-account-abuse",
      alert: "Anomalous valid-account sign-in or session use",
      alertFamily: "Impossible travel, unfamiliar source, atypical device, MFA anomalies, off-hours access, or unexpected privilege use",
      techniqueId: "T1078",
      techniqueName: "Valid Accounts",
      mitreUrl: "https://attack.mitre.org/techniques/T1078/",
      tactics: ["Initial Access", "Persistence", "Privilege Escalation", "Defense Evasion"],
      platforms: ["Identity Provider", "SaaS", "IaaS", "Windows", "Linux", "macOS"],
      focus: "Identity baseline, authentication chain, device and location trust, session activity, and account impact",
      summary: "Use this playbook when authentication succeeds but the context is inconsistent with the account's normal behaviour. A valid login is not automatically benign: verify the user, device, source, MFA flow, privilege level, session actions, and whether credentials or tokens may have been obtained elsewhere.",
      investigation: [
        "Establish a baseline for the account's normal locations, devices, applications, working hours, authentication methods, and administrative responsibilities.",
        "Review the complete sign-in sequence, including failures, MFA prompts, conditional-access outcomes, token issuance, source infrastructure, and session identifiers.",
        "Confirm the activity with the user through an approved channel without relying on contact details or prompts contained in the suspicious session.",
        "Examine post-authentication actions such as mailbox rules, OAuth grants, role changes, data access, remote logons, security-setting changes, or lateral movement.",
        "Search for the same source IP, device, user agent, token pattern, or authentication anomaly across other identities and services.",
      ],
      evidence: [
        "IdP sign-in, risk, MFA, conditional-access, token, and device-compliance records",
        "VPN, SaaS, cloud, endpoint, and directory logs tied to the session and identity",
        "User confirmation, travel or support context, and recent password or MFA changes",
        "Mailbox rules, OAuth grants, privilege changes, downloads, and other actions after authentication",
      ],
      remediation: [
        "Revoke active sessions and tokens, reset credentials, and require fresh MFA registration if account compromise is likely.",
        "Disable or restrict the account temporarily when privileged access, persistence, or active attacker behaviour is present.",
        "Remove unauthorised mailbox rules, OAuth grants, devices, keys, roles, and persistence created through the compromised session.",
        "Apply conditional access, phishing-resistant MFA, least privilege, and location or device restrictions appropriate to the account risk.",
      ],
      related: [
        { id: "T1110", name: "Brute Force", url: "https://attack.mitre.org/techniques/T1110/" },
        { id: "T1539", name: "Steal Web Session Cookie", url: "https://attack.mitre.org/techniques/T1539/" },
      ],
      keywords: ["valid account", "impossible travel", "risky sign-in", "mfa fatigue", "oauth", "vpn", "cloud", "identity", "account takeover"],
    },
  ];
  const guidanceState = {
    query: "",
    tactic: "all",
    selectedId: guidanceEntries[0].id,
  };

  const guidanceEscapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const updateGuidanceStats = (entries) => {
    const tacticCount = new Set(guidanceEntries.flatMap((entry) => entry.tactics)).size;

    guidanceStats.count.textContent = `${guidanceEntries.length}`;
    guidanceStats.tactics.textContent = `${tacticCount}`;
    guidanceStats.focus.textContent = `${entries.length} shown`;
  };

  const getGuidanceSearchBlob = (entry) => [
    entry.alert,
    entry.alertFamily,
    entry.techniqueId,
    entry.techniqueName,
    entry.focus,
    entry.summary,
    entry.tactics.join(" "),
    entry.platforms.join(" "),
    entry.keywords.join(" "),
    entry.related.map((item) => `${item.id} ${item.name}`).join(" "),
  ].join(" ").toLowerCase();

  const getFilteredGuidanceEntries = () => guidanceEntries.filter((entry) => {
    const tacticMatch = guidanceState.tactic === "all" || entry.tactics.includes(guidanceState.tactic);
    const queryMatch = !guidanceState.query || getGuidanceSearchBlob(entry).includes(guidanceState.query);
    return tacticMatch && queryMatch;
  });

  const renderGuidanceDetail = (entry) => {
    if (!entry) {
      return;
    }

    guidanceDetail.alert.textContent = entry.alert;
    guidanceDetail.technique.textContent = `${entry.techniqueId} / ${entry.techniqueName}`;
    guidanceDetail.tactics.textContent = entry.tactics.join(" / ");
    guidanceDetail.summary.textContent = entry.summary;
    guidanceDetail.investigation.innerHTML = entry.investigation
      .map((item) => `<li>${guidanceEscapeHtml(item)}</li>`)
      .join("");
    guidanceDetail.evidence.innerHTML = entry.evidence
      .map((item) => `<li>${guidanceEscapeHtml(item)}</li>`)
      .join("");
    guidanceDetail.remediation.innerHTML = entry.remediation
      .map((item) => `<li>${guidanceEscapeHtml(item)}</li>`)
      .join("");
    guidanceDetail.related.innerHTML = entry.related
      .map((item) => `<a href="${item.url}" target="_blank" rel="noreferrer">${guidanceEscapeHtml(`${item.id} ${item.name}`)}</a>`)
      .join("");
    guidanceDetail.mitreLink.href = entry.mitreUrl;
    guidanceDetail.mitreLink.textContent = `Open ${entry.techniqueId} on MITRE ATT&CK`;
  };

  const renderGuidanceTable = (entries) => {
    guidanceResultsLabel.textContent = `${entries.length} alert patterns currently match the selected search and tactic filter.`;
    guidanceActiveFilter.textContent = guidanceState.tactic === "all" ? "All tactics" : guidanceState.tactic;
    updateGuidanceStats(entries);

    if (!entries.length) {
      guidanceTableBody.innerHTML = `
        <article class="guidance-table-empty">
          <h3>No guidance entries match this search</h3>
          <p>Try a broader alert name, a technique ID such as T1059.001, or switch back to all tactics.</p>
        </article>
      `;
      return;
    }

    if (!entries.some((entry) => entry.id === guidanceState.selectedId)) {
      guidanceState.selectedId = entries[0].id;
    }

    guidanceTableBody.innerHTML = entries.map((entry) => `
      <article class="guidance-table-row${entry.id === guidanceState.selectedId ? " is-selected" : ""}">
        <button class="guidance-row-button" type="button" data-guidance-select="${entry.id}">
          <strong>${guidanceEscapeHtml(entry.alert)}</strong>
          <span>${guidanceEscapeHtml(entry.alertFamily)}</span>
        </button>
        <div class="guidance-row-technique">
          <strong>${guidanceEscapeHtml(entry.techniqueId)}</strong>
          <span>${guidanceEscapeHtml(entry.techniqueName)}</span>
        </div>
        <div class="guidance-row-meta">${guidanceEscapeHtml(entry.tactics.join(", "))}</div>
        <div class="guidance-row-meta">${guidanceEscapeHtml(entry.platforms.join(", "))}</div>
        <div class="guidance-row-focus">
          <strong>Look at</strong>
          <span>${guidanceEscapeHtml(entry.focus)}</span>
        </div>
      </article>
    `).join("");

    renderGuidanceDetail(entries.find((entry) => entry.id === guidanceState.selectedId));
  };

  guidanceSearch.addEventListener("input", (event) => {
    guidanceState.query = event.target.value.trim().toLowerCase();
    renderGuidanceTable(getFilteredGuidanceEntries());
  });

  guidanceFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guidance-filter]");

    if (!button) {
      return;
    }

    guidanceState.tactic = button.getAttribute("data-guidance-filter");
    guidanceFilters.querySelectorAll("[data-guidance-filter]").forEach((chip) => {
      chip.classList.toggle("is-active", chip === button);
    });
    renderGuidanceTable(getFilteredGuidanceEntries());
  });

  guidanceTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guidance-select]");

    if (!button) {
      return;
    }

    guidanceState.selectedId = button.getAttribute("data-guidance-select");
    renderGuidanceTable(getFilteredGuidanceEntries());
  });

  renderGuidanceTable(getFilteredGuidanceEntries());
}

const threatPulseRoot = document.querySelector("[data-threat-pulse-root]");

if (threatPulseRoot) {
  const pulseStatus = document.querySelector("[data-threat-pulse-status]");
  const pulseGrid = document.querySelector("[data-threat-pulse-grid]");
  const pulseCatalog = document.querySelector("[data-threat-pulse-catalog]");
  const pulseRelease = document.querySelector("[data-threat-pulse-release]");
  const pulseCount = document.querySelector("[data-threat-pulse-count]");
  const pulseGenerated = document.querySelector("[data-threat-pulse-generated]");
  const pulseEpssStatus = document.querySelector("[data-threat-pulse-epss-status]");
  const pulseVisibleCount = document.querySelector("[data-threat-pulse-visible-count]");
  const pulseFilterState = document.querySelector("[data-threat-pulse-filter-state]");
  const pulseHealthBadge = document.querySelector("[data-threat-pulse-health-badge]");
  const pulseTrendWeek = document.querySelector("[data-threat-trend-week]");
  const pulseTrendRansomware = document.querySelector("[data-threat-trend-ransomware]");
  const pulseTrendVendor = document.querySelector("[data-threat-trend-vendor]");
  const pulseTrendEpss = document.querySelector("[data-threat-trend-epss]");
  const filterForm = document.querySelector("[data-threat-filter-form]");
  const radwareGrid = document.querySelector("[data-threat-radware-grid]");
  const radwareUpdated = document.querySelector("[data-threat-radware-updated]");
  const radwareBadge = document.querySelector("[data-threat-radware-badge]");
  const radwareButtons = Array.from(document.querySelectorAll("[data-threat-radware-interval]"));
  const radwareMap = document.querySelector("[data-threat-radware-map]");
  const radwareWindow = document.querySelector("[data-threat-radware-window]");
  const radwareTopRegion = document.querySelector("[data-threat-radware-top-region]");
  const radwareRegionCount = document.querySelector("[data-threat-radware-region-count]");
  const radwareTotal = document.querySelector("[data-threat-radware-total]");
  const localFeedVersion = "20260622-3";
  const kevUrl = `threat-pulse-data.json?v=${localFeedVersion}`;
  const radwareSnapshotUrl = `radware-threat-map.json?v=${localFeedVersion}`;
  const epssUrl = "https://api.first.org/data/v1/epss?cve=";
  const filterState = {
    vendor: "all",
    priority: "all",
    ransomware: "all",
    window: "all",
  };
  const radwareState = {
    interval: "hour",
  };
  let allEntries = [];
  let epssOverlayAvailable = false;
  let radwareSnapshot = null;
  const regionNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
  const radwareFallbackSnapshot = {
    title: "Radware Live Threat Map Top Attacked Regions",
    generatedAt: "2026-06-22T20:49:24Z",
    source: "https://livethreatmap.radware.com/",
    intervals: {
      hour: [
        { name: "US", value: 7 },
        { name: "BR", value: 5 },
        { name: "IN", value: 4 },
        { name: "IT", value: 3 },
        { name: "JP", value: 3 },
      ],
      day: [
        { name: "US", value: 7 },
        { name: "BR", value: 5 },
        { name: "IN", value: 3 },
        { name: "JP", value: 3 },
        { name: "AU", value: 3 },
      ],
    },
  };
  const regionCoordinates = {
    US: { x: 108, y: 108 },
    CA: { x: 95, y: 78 },
    MX: { x: 120, y: 142 },
    BR: { x: 180, y: 180 },
    AR: { x: 172, y: 220 },
    GB: { x: 270, y: 82 },
    IE: { x: 257, y: 83 },
    FR: { x: 281, y: 96 },
    DE: { x: 296, y: 90 },
    IT: { x: 305, y: 110 },
    ES: { x: 268, y: 108 },
    NL: { x: 289, y: 82 },
    PL: { x: 315, y: 86 },
    TR: { x: 342, y: 111 },
    AE: { x: 368, y: 126 },
    SA: { x: 352, y: 138 },
    ZA: { x: 336, y: 215 },
    IN: { x: 390, y: 132 },
    SG: { x: 433, y: 168 },
    JP: { x: 478, y: 112 },
    KR: { x: 462, y: 104 },
    CN: { x: 432, y: 112 },
    AU: { x: 470, y: 206 },
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const formatDate = (value) => {
    if (!value) {
      return "Unknown";
    }

    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(new Date(value));
  };

  const formatRelease = (value) => {
    if (!value) {
      return "Unknown";
    }

    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const formatTime = (value) => {
    if (!value) {
      return "Unknown";
    }

    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  };

  const daysBetween = (value) => {
    const ms = Date.now() - new Date(value).getTime();
    return Math.floor(ms / 86400000);
  };

  const getRegionLabel = (value) => {
    const code = String(value || "").toUpperCase();

    if (!code) {
      return "Unknown region";
    }

    try {
      return regionNames?.of(code) || code;
    } catch (error) {
      return code;
    }
  };

  const getRadwareCoordinates = (code, index) => {
    if (regionCoordinates[code]) {
      return regionCoordinates[code];
    }

    return {
      x: 100 + (index * 64) % 360,
      y: 70 + (index * 34) % 120,
    };
  };

  const renderRadwareIdleMap = (label = "Snapshot standby") => {
    if (!radwareMap) {
      return;
    }

    radwareMap.innerHTML = `
      <defs>
        <linearGradient id="threat-map-scan" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stop-color="#59f3ff" stop-opacity="0" />
          <stop offset="50%" stop-color="#59f3ff" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#59f3ff" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${[0, 1, 2, 3, 4, 5].map((item) => `<line class="map-grid-line" x1="${80 + item * 80}" y1="24" x2="${80 + item * 80}" y2="236"></line>`).join("")}
      ${[0, 1, 2, 3].map((item) => `<line class="map-grid-line" x1="24" y1="${58 + item * 42}" x2="536" y2="${58 + item * 42}"></line>`).join("")}
      <path class="map-contour" d="M58 94 L110 62 L160 78 L178 110 L135 128 L82 118 Z"></path>
      <path class="map-contour" d="M190 78 L236 62 L275 74 L282 102 L248 114 L198 108 Z"></path>
      <path class="map-contour" d="M286 88 L350 72 L424 84 L460 112 L430 132 L346 126 L294 112 Z"></path>
      <path class="map-contour" d="M426 182 L470 170 L496 190 L482 214 L436 214 L416 196 Z"></path>
      <circle class="map-core-ring" cx="280" cy="130" r="18"></circle>
      <circle class="map-core" cx="280" cy="130" r="4"></circle>
      <rect class="map-scan" x="-180" y="0" width="180" height="260"></rect>
      <text class="map-label" x="28" y="30">${escapeHtml(label)}</text>
      <text class="map-value" x="28" y="48">Waiting for attack-region snapshot</text>
    `;
  };

  const setRadwareLoadingState = () => {
    if (!radwareBadge || !radwareUpdated || !radwareGrid) {
      return;
    }

    radwareBadge.textContent = "Loading snapshot";
    radwareBadge.classList.remove("is-ok", "is-warning");
    radwareUpdated.textContent = "Refreshing local attack-region snapshot";
    if (radwareWindow) {
      radwareWindow.textContent = radwareState.interval === "hour" ? "Last hour snapshot" : "Last day snapshot";
    }
    if (radwareTopRegion) {
      radwareTopRegion.textContent = "Loading";
    }
    if (radwareRegionCount) {
      radwareRegionCount.textContent = "Loading";
    }
    if (radwareTotal) {
      radwareTotal.textContent = "Loading";
    }
    renderRadwareIdleMap("Loading snapshot");
    radwareGrid.innerHTML = `
      <article class="info-card threat-live-placeholder">
        <span class="card-tag">SNAPSHOT / REGION</span>
        <h3>Collecting regional pressure view</h3>
        <p>The board is loading the latest attacked-region snapshot for this window.</p>
      </article>
    `;
  };

  const setRadwareWarningState = (message) => {
    if (!radwareBadge || !radwareUpdated || !radwareGrid) {
      return;
    }

    radwareBadge.textContent = "Source warning";
    radwareBadge.classList.remove("is-ok");
    radwareBadge.classList.add("is-warning");
    radwareUpdated.textContent = message;
    if (radwareTopRegion) {
      radwareTopRegion.textContent = "Snapshot retry";
    }
    if (radwareRegionCount) {
      radwareRegionCount.textContent = "Unavailable";
    }
    if (radwareTotal) {
      radwareTotal.textContent = "Unavailable";
    }
    renderRadwareIdleMap("Snapshot retry");
    radwareGrid.innerHTML = `
      <article class="info-card threat-live-placeholder">
        <span class="card-tag">SNAPSHOT / RETRY</span>
        <h3>Regional attack snapshot unavailable right now</h3>
        <p>
          The latest stored region snapshot could not be loaded during this attempt.
          The live map link is still available while the local capture refreshes.
        </p>
        <div class="threat-links">
          <a href="https://livethreatmap.radware.com/" target="_blank" rel="noreferrer">Open Radware live map</a>
        </div>
      </article>
    `;
  };

  const updateRadwareControls = () => {
    radwareButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.getAttribute("data-threat-radware-interval") === radwareState.interval
      );
    });
  };

  const renderRadwareMap = (entries) => {
    if (!radwareMap) {
      return;
    }

    const items = entries.slice(0, 5);

    radwareMap.innerHTML = `
      <defs>
        <linearGradient id="threat-map-scan" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stop-color="#59f3ff" stop-opacity="0" />
          <stop offset="50%" stop-color="#59f3ff" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#59f3ff" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${[0, 1, 2, 3, 4, 5].map((item) => `<line class="map-grid-line" x1="${80 + item * 80}" y1="24" x2="${80 + item * 80}" y2="236"></line>`).join("")}
      ${[0, 1, 2, 3].map((item) => `<line class="map-grid-line" x1="24" y1="${58 + item * 42}" x2="536" y2="${58 + item * 42}"></line>`).join("")}
      <path class="map-contour" d="M58 94 L110 62 L160 78 L178 110 L135 128 L82 118 Z"></path>
      <path class="map-contour" d="M190 78 L236 62 L275 74 L282 102 L248 114 L198 108 Z"></path>
      <path class="map-contour" d="M286 88 L350 72 L424 84 L460 112 L430 132 L346 126 L294 112 Z"></path>
      <path class="map-contour" d="M426 182 L470 170 L496 190 L482 214 L436 214 L416 196 Z"></path>
      <circle class="map-core-ring" cx="280" cy="130" r="18"></circle>
      <circle class="map-core" cx="280" cy="130" r="4"></circle>
      <rect class="map-scan" x="-180" y="0" width="180" height="260"></rect>
      ${items.map((entry, index) => {
        const code = String(entry.name || "").toUpperCase();
        const point = getRadwareCoordinates(code, index);
        const curveX = 280 + (point.x - 280) * 0.48;
        const curveY = point.y < 130 ? point.y - 26 : point.y + 22;

        return `
          <path
            class="map-arc"
            d="M280 130 Q ${curveX} ${curveY} ${point.x} ${point.y}"
            style="animation-delay: ${index * 0.35}s"
          ></path>
          <circle class="map-ping" cx="${point.x}" cy="${point.y}" r="${13 + index * 1.4}" style="animation-delay: ${index * 0.22}s"></circle>
          <circle class="map-node" cx="${point.x}" cy="${point.y}" r="${4.2 + Math.max(0, 4 - index) * 0.28}"></circle>
          <text class="map-label" x="${point.x + 8}" y="${point.y - 10}">${escapeHtml(code)}</text>
          <text class="map-value" x="${point.x + 8}" y="${point.y + 8}">${escapeHtml(String(entry.value || 0))}</text>
        `;
      }).join("")}
    `;
  };

  const renderRadwareEntries = (entries) => {
    if (!radwareGrid) {
      return;
    }

    if (!entries.length) {
      setRadwareWarningState("The feed returned no live regional entries");
      return;
    }

    const maxValue = Math.max(...entries.map((entry) => Number(entry.value || 0)), 1);
    const topEntry = entries[0];
    const totalObservations = entries.reduce(
      (sum, entry) => sum + Number(entry.value || 0),
      0
    );

    if (radwareWindow) {
      radwareWindow.textContent = radwareState.interval === "hour" ? "Last hour snapshot" : "Last day snapshot";
    }

    if (radwareTopRegion) {
      radwareTopRegion.textContent = `${getRegionLabel(topEntry.name)} (${topEntry.value})`;
    }

    if (radwareRegionCount) {
      radwareRegionCount.textContent = `${entries.length} regions`;
    }

    if (radwareTotal) {
      radwareTotal.textContent = `${totalObservations} observations`;
    }

    renderRadwareMap(entries);

    radwareGrid.innerHTML = entries
      .slice(0, 6)
      .map((entry, index) => {
        const code = String(entry.name || "").toUpperCase();
        const label = getRegionLabel(code);
        const value = Number(entry.value || 0);
        const width = Math.max(14, Math.round((value / maxValue) * 100));

        return `
          <article class="info-card threat-live-region">
            <div class="threat-live-region-top">
              <div>
              <span class="card-tag">${escapeHtml(code || "N/A")}</span>
                <h3>${escapeHtml(label)}</h3>
                <p>Captured in the stored Radware snapshot for the active window.</p>
              </div>
              <span class="threat-live-rank">#${index + 1}</span>
            </div>
            <strong class="threat-live-value">${value}</strong>
            <div class="threat-live-bar" aria-hidden="true">
              <span style="width: ${width}%"></span>
            </div>
            <div class="threat-live-meta">
              <span>${radwareState.interval === "hour" ? "Window: last hour" : "Window: last day"}</span>
              <span>${value} attack observations</span>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const loadRadwareBoard = async (interval = radwareState.interval) => {
    if (!radwareGrid || !radwareUpdated || !radwareBadge) {
      return;
    }

    radwareState.interval = interval;
    updateRadwareControls();
    setRadwareLoadingState();

    try {
      const response = await fetch(radwareSnapshotUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Radware snapshot returned ${response.status}`);
      }

      radwareSnapshot = await response.json();
    } catch (error) {
      console.error(error);
      radwareSnapshot = radwareFallbackSnapshot;
    }

    try {
      const data = radwareSnapshot?.intervals?.[radwareState.interval] || [];

      if (!data.length) {
        throw new Error("No snapshot entries available for the selected interval");
      }

      radwareBadge.textContent = radwareSnapshot === radwareFallbackSnapshot ? "Fallback snapshot" : "Snapshot ready";
      radwareBadge.classList.remove("is-warning");
      radwareBadge.classList.add("is-ok");
      radwareUpdated.textContent = `Updated ${formatTime(radwareSnapshot.generatedAt)} / source: Radware`;
      renderRadwareEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      setRadwareWarningState("Retry needed for the local region snapshot");
      console.error(error);
    }
  };

  const getPriority = (entry) => {
    const ransomwareKnown = entry.knownRansomwareCampaignUse === "Known";
    const epss = Number(entry.epss || 0);
    const percentile = Number(entry.percentile || 0);

    if (ransomwareKnown || epss >= 0.5 || percentile >= 0.97) {
      return { label: "Critical", css: "is-critical" };
    }

    if (epss >= 0.2 || percentile >= 0.9) {
      return { label: "High", css: "is-high" };
    }

    return { label: "Watch", css: "is-watch" };
  };

  const getAnalystAction = (entry) => {
    const vendor = `${entry.vendorProject} ${entry.product}`.trim();
    const ransomwareKnown = entry.knownRansomwareCampaignUse === "Known";
    const description = `${entry.vulnerabilityName} ${entry.shortDescription}`.toLowerCase();
    const notes = [];

    if (ransomwareKnown) {
      notes.push("Treat this as patch-and-hunt territory because CISA flags known ransomware campaign use.");
    } else {
      notes.push("Validate whether the vulnerable product is present in your estate and whether any instance is internet-facing.");
    }

    if (description.includes("authentication bypass") || description.includes("unauthenticated")) {
      notes.push("Prioritise external exposure review, remote access paths, and authentication logs.");
    } else if (description.includes("remote code execution") || description.includes("command injection")) {
      notes.push("Review exposed services, patch status, and recent process or child-process telemetry for signs of exploitation.");
    } else if (description.includes("privilege escalation")) {
      notes.push("Pair patching with local admin, service account, and suspicious execution-chain review.");
    } else if (description.includes("malicious code") || description.includes("credential")) {
      notes.push("Check for affected packages or extensions in build pipelines and rotate exposed credentials if the product is present.");
    } else {
      notes.push("Use vendor advisory details to guide targeted hunting and customer-safe remediation communication.");
    }

    return `${vendor}: ${notes.join(" ")}`;
  };

  const extractLinks = (notesValue) => {
    if (!notesValue) {
      return [];
    }

    return Array.from(new Set(notesValue.match(/https?:\/\/[^\s;]+/g) || [])).slice(0, 3);
  };

  const updateTrendCards = (entries) => {
    const thisWeekCount = entries.filter((entry) => daysBetween(entry.dateAdded) <= 7).length;
    const ransomwareCount = entries.filter((entry) => entry.knownRansomwareCampaignUse === "Known").length;
    const vendorCounts = entries.reduce((accumulator, entry) => {
      const vendor = entry.vendorProject || "Unknown";
      accumulator.set(vendor, (accumulator.get(vendor) || 0) + 1);
      return accumulator;
    }, new Map());
    const topVendor = [...vendorCounts.entries()].sort((left, right) => right[1] - left[1])[0];
    const highestEpss = entries.reduce((current, entry) => {
      const value = Number(entry.epss || 0);
      return value > current ? value : current;
    }, 0);

    pulseTrendWeek.textContent = `${thisWeekCount}`;
    pulseTrendRansomware.textContent = `${ransomwareCount}`;
    pulseTrendVendor.textContent = topVendor ? `${topVendor[0]} (${topVendor[1]})` : "None";
    pulseTrendEpss.textContent = epssOverlayAvailable
      ? (entries.length ? `${(highestEpss * 100).toFixed(2)}%` : "0%")
      : "Overlay retry";
  };

  const applyFilters = () => allEntries.filter((entry) => {
    const priority = getPriority(entry).label;

    if (filterState.vendor !== "all" && entry.vendorProject !== filterState.vendor) {
      return false;
    }

    if (filterState.priority !== "all" && priority !== filterState.priority) {
      return false;
    }

    if (filterState.ransomware !== "all" && entry.knownRansomwareCampaignUse !== filterState.ransomware) {
      return false;
    }

    if (filterState.window !== "all" && daysBetween(entry.dateAdded) > Number(filterState.window)) {
      return false;
    }

    return true;
  });

  const updateFilterStateLabel = (entries) => {
    const activeFilters = [];

    if (filterState.vendor !== "all") {
      activeFilters.push(filterState.vendor);
    }

    if (filterState.priority !== "all") {
      activeFilters.push(`${filterState.priority} priority`);
    }

    if (filterState.ransomware !== "all") {
      activeFilters.push(`ransomware ${filterState.ransomware.toLowerCase()}`);
    }

    if (filterState.window !== "all") {
      activeFilters.push(`last ${filterState.window} days`);
    }

    pulseFilterState.textContent = activeFilters.length ? activeFilters.join(" / ") : "All entries";
    pulseVisibleCount.textContent = `${entries.length} shown`;
  };

  const renderVisibleEntries = (entries) => {
    updateFilterStateLabel(entries);
    updateTrendCards(entries);

    if (!entries.length) {
      pulseGrid.innerHTML = `
        <article class="info-card threat-card">
          <span class="card-tag">FILTER / EMPTY</span>
          <h3>No entries match the current filter set</h3>
          <p>Try widening the date window or clearing vendor and priority filters.</p>
        </article>
      `;
      return;
    }

    pulseGrid.innerHTML = entries.map(renderPulseCard).join("");
  };

  const populateVendorFilter = (entries) => {
    const vendorSelect = filterForm.querySelector('[data-threat-filter="vendor"]');
    const vendors = [...new Set(entries.map((entry) => entry.vendorProject).filter(Boolean))].sort();

    vendorSelect.innerHTML = `<option value="all">All vendors</option>${vendors
      .map((vendor) => `<option value="${vendor}">${vendor}</option>`)
      .join("")}`;
  };

  const renderPulseCard = (entry) => {
    const priority = getPriority(entry);
    const hasEpss = entry.epss !== undefined && entry.percentile !== undefined;
    const epssPercent = hasEpss
      ? `${(Number(entry.epss || 0) * 100).toFixed(2)}%`
      : "Retry";
    const percentileValue = hasEpss
      ? `${(Number(entry.percentile || 0) * 100).toFixed(1)}th percentile`
      : "EPSS pending";
    const links = extractLinks(entry.notes);

    return `
      <article class="info-card threat-card">
        <div>
          <span class="card-tag">${priority.label.toUpperCase()} / ${entry.cveID}</span>
          <h3>${entry.vulnerabilityName}</h3>
        </div>
        <p>${entry.shortDescription}</p>
        <div class="threat-badges">
          <span class="pulse-badge ${priority.css}">${priority.label} priority</span>
          <span class="pulse-badge">EPSS ${epssPercent}</span>
          <span class="pulse-badge">${percentileValue}</span>
        </div>
        <div class="threat-meta">
          <span><strong>Vendor:</strong> ${entry.vendorProject}</span>
          <span><strong>Product:</strong> ${entry.product}</span>
          <span><strong>Date added:</strong> ${formatDate(entry.dateAdded)}</span>
          <span><strong>Due date:</strong> ${formatDate(entry.dueDate)}</span>
          <span><strong>Ransomware use:</strong> ${entry.knownRansomwareCampaignUse}</span>
          <span><strong>Catalog action:</strong> ${entry.requiredAction}</span>
        </div>
        <div class="threat-note">
          <strong>Analyst action</strong>
          <p>${getAnalystAction(entry)}</p>
        </div>
        <div class="threat-links">
          <a href="https://nvd.nist.gov/vuln/detail/${entry.cveID}" target="_blank" rel="noreferrer">View NVD</a>
          ${links.map((link, index) => `<a href="${link}" target="_blank" rel="noreferrer">${index === 0 ? "Vendor advisory" : `Reference ${index + 1}`}</a>`).join("")}
        </div>
      </article>
    `;
  };

  const loadThreatPulse = async () => {
    try {
      const kevResponse = await fetch(kevUrl, {
        cache: "no-store",
      });

      if (!kevResponse.ok) {
        throw new Error(`KEV feed returned ${kevResponse.status}`);
      }

      const kevData = await kevResponse.json();
      const recentEntries = [...kevData.vulnerabilities]
        .sort((left, right) => new Date(right.dateAdded) - new Date(left.dateAdded))
        .slice(0, 8);
      const cveBatch = recentEntries.map((entry) => entry.cveID).join(",");
      let epssByCve = new Map();

      epssOverlayAvailable = false;

      try {
        const epssResponse = await fetch(`${epssUrl}${encodeURIComponent(cveBatch)}`, {
          cache: "no-store",
        });

        if (!epssResponse.ok) {
          throw new Error(`EPSS feed returned ${epssResponse.status}`);
        }

        const epssData = await epssResponse.json();
        epssByCve = new Map((epssData.data || []).map((entry) => [entry.cve, entry]));
        epssOverlayAvailable = epssByCve.size > 0;
      } catch (epssError) {
        console.error(epssError);
      }

      const priorityOrder = { Critical: 3, High: 2, Watch: 1 };
      allEntries = recentEntries
        .map((entry) => ({
          ...entry,
          ...(epssByCve.get(entry.cveID) || {}),
        }))
        .sort((left, right) => {
          const leftPriority = priorityOrder[getPriority(left).label];
          const rightPriority = priorityOrder[getPriority(right).label];

          if (rightPriority !== leftPriority) {
            return rightPriority - leftPriority;
          }

          return new Date(right.dateAdded) - new Date(left.dateAdded);
        });

      populateVendorFilter(allEntries);
      pulseCatalog.textContent = kevData.catalogVersion || "Live";
      pulseRelease.textContent = formatRelease(kevData.dateReleased);
      pulseCount.textContent = `${kevData.count || kevData.vulnerabilities.length}`;
      pulseGenerated.textContent = formatRelease(kevData.generatedAt || kevData.dateReleased);
      pulseHealthBadge.classList.remove("is-warning", "is-ok");

      if (epssOverlayAvailable) {
        pulseEpssStatus.textContent = "Live and healthy";
        pulseHealthBadge.textContent = "Feeds healthy";
        pulseHealthBadge.classList.add("is-ok");
        pulseStatus.textContent = "Threat Pulse is using a fresh official CISA KEV snapshot with live FIRST EPSS overlay. Use it to spot fresh exploitation signal, patch pressure, and where hunting effort likely pays off first.";
      } else {
        pulseEpssStatus.textContent = "Overlay retry";
        pulseHealthBadge.textContent = "KEV live / EPSS retry";
        pulseHealthBadge.classList.add("is-warning");
        pulseStatus.textContent = "Threat Pulse is still using a fresh official CISA KEV snapshot. The EPSS overlay is temporarily unavailable, so the feed remains usable with KEV-led prioritisation while the live overlay retries.";
      }

      renderVisibleEntries(applyFilters());
    } catch (error) {
      pulseStatus.textContent = "The live pulse feed could not load right now. The page sources remain valid, but the remote data request needs another try.";
      pulseGenerated.textContent = "Unavailable";
      pulseEpssStatus.textContent = "Retry needed";
      pulseVisibleCount.textContent = "0 shown";
      pulseFilterState.textContent = "Unavailable";
      pulseHealthBadge.textContent = "Source warning";
      pulseHealthBadge.classList.remove("is-ok");
      pulseHealthBadge.classList.add("is-warning");
      pulseTrendWeek.textContent = "Unavailable";
      pulseTrendRansomware.textContent = "Unavailable";
      pulseTrendVendor.textContent = "Unavailable";
      pulseTrendEpss.textContent = "Unavailable";
      pulseGrid.innerHTML = `
        <article class="info-card threat-card">
          <span class="card-tag">FEED / RETRY</span>
          <h3>Live source temporarily unavailable</h3>
          <p>
            The page is set up for a local official KEV snapshot and the live
            FIRST EPSS API, but the browser could not load them during this attempt.
          </p>
          <div class="threat-links">
            <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noreferrer">Open CISA KEV</a>
            <a href="https://www.first.org/epss" target="_blank" rel="noreferrer">Open FIRST EPSS</a>
          </div>
        </article>
      `;
      console.error(error);
    }
  };

  filterForm.addEventListener("change", (event) => {
    const control = event.target;
    const key = control.getAttribute("data-threat-filter");

    if (!key) {
      return;
    }

    filterState[key] = control.value;
    renderVisibleEntries(applyFilters());
  });

  filterForm.querySelector("[data-threat-filter-reset]").addEventListener("click", () => {
    filterState.vendor = "all";
    filterState.priority = "all";
    filterState.ransomware = "all";
    filterState.window = "all";
    filterForm.reset();
    renderVisibleEntries(applyFilters());
  });

  radwareButtons.forEach((button) => {
    button.addEventListener("click", () => {
      loadRadwareBoard(button.getAttribute("data-threat-radware-interval") || "hour");
    });
  });

  loadThreatPulse();
  loadRadwareBoard();
}
