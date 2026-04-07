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
  const edgePadding = 110;
  const pullRadius = 180;
  const nodeCount = 22;
  const cursor = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
  };

  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const node = document.createElement("span");
    node.className = `edge-network-node${index % 6 === 0 ? " is-alert" : ""}`;
    networkNodesRoot.append(node);

    const side = index % 4;
    const progress = (index + 1) / (nodeCount + 1);
    let baseX = 0;
    let baseY = 0;

    if (side === 0) {
      baseX = edgePadding;
      baseY = progress * window.innerHeight;
    } else if (side === 1) {
      baseX = window.innerWidth - edgePadding;
      baseY = progress * window.innerHeight;
    } else if (side === 2) {
      baseX = progress * window.innerWidth;
      baseY = edgePadding;
    } else {
      baseX = progress * window.innerWidth;
      baseY = window.innerHeight - edgePadding;
    }

    return {
      node,
      baseX,
      baseY,
      x: baseX,
      y: baseY,
      offsetX: 0,
      offsetY: 0,
      side,
    };
  });

  const linePairs = [];

  nodes.forEach((_, index) => {
    const nextIndex = (index + 1) % nodes.length;
    linePairs.push([index, nextIndex]);

    if (index + 2 < nodes.length) {
      linePairs.push([index, index + 2]);
    }
  });

  linePairs.forEach((pair, index) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    if (index % 5 === 0) {
      line.classList.add("alert-line");
    }

    networkSvg.append(line);
    pair.push(line);
  });

  const setBases = () => {
    nodes.forEach((nodeData, index) => {
      const progress = (index + 1) / (nodeCount + 1);

      if (nodeData.side === 0) {
        nodeData.baseX = edgePadding;
        nodeData.baseY = progress * window.innerHeight;
      } else if (nodeData.side === 1) {
        nodeData.baseX = window.innerWidth - edgePadding;
        nodeData.baseY = progress * window.innerHeight;
      } else if (nodeData.side === 2) {
        nodeData.baseX = progress * window.innerWidth;
        nodeData.baseY = edgePadding;
      } else {
        nodeData.baseX = progress * window.innerWidth;
        nodeData.baseY = window.innerHeight - edgePadding;
      }
    });
  };

  const updateNetwork = () => {
    nodes.forEach((nodeData) => {
      const dx = cursor.x - nodeData.baseX;
      const dy = cursor.y - nodeData.baseY;
      const distance = Math.hypot(dx, dy);
      const withinEdgeZone =
        cursor.x < edgePadding * 1.7 ||
        cursor.x > window.innerWidth - edgePadding * 1.7 ||
        cursor.y < edgePadding * 1.7 ||
        cursor.y > window.innerHeight - edgePadding * 1.7;

      let targetOffsetX = 0;
      let targetOffsetY = 0;

      if (cursor.active && withinEdgeZone && distance < pullRadius) {
        const force = (1 - distance / pullRadius) * 28;
        targetOffsetX = dx * 0.12 * force / 10;
        targetOffsetY = dy * 0.12 * force / 10;
      }

      nodeData.offsetX += (targetOffsetX - nodeData.offsetX) * 0.12;
      nodeData.offsetY += (targetOffsetY - nodeData.offsetY) * 0.12;
      nodeData.x = nodeData.baseX + nodeData.offsetX;
      nodeData.y = nodeData.baseY + nodeData.offsetY;
      nodeData.node.style.transform = `translate(${nodeData.x}px, ${nodeData.y}px)`;
    });

    linePairs.forEach(([fromIndex, toIndex, line]) => {
      const fromNode = nodes[fromIndex];
      const toNode = nodes[toIndex];
      line.setAttribute("x1", `${(fromNode.x / window.innerWidth) * 100}`);
      line.setAttribute("y1", `${(fromNode.y / window.innerHeight) * 100}`);
      line.setAttribute("x2", `${(toNode.x / window.innerWidth) * 100}`);
      line.setAttribute("y2", `${(toNode.y / window.innerHeight) * 100}`);
    });

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
    setBases();
  });

  setBases();
  updateNetwork();
}

const demoForm = document.querySelector("#atcor-demo-form");

if (demoForm) {
  const demoOutputs = {
    summary: document.querySelector('[data-demo-output="summary"]'),
    host: document.querySelector('[data-demo-output="host"]'),
    user: document.querySelector('[data-demo-output="user"]'),
    process: document.querySelector('[data-demo-output="process"]'),
    qualityBar: document.querySelector('[data-demo-output="qualityBar"]'),
    evidence: document.querySelector('[data-demo-output="evidence"]'),
    query: document.querySelector('[data-demo-output="query"]'),
    writeup: document.querySelector('[data-demo-output="writeup"]'),
    terminalIoc: document.querySelector('[data-demo-terminal="ioc"]'),
    terminalTriage: document.querySelector('[data-demo-terminal="triage"]'),
    terminalOutput: document.querySelector('[data-demo-terminal="output"]'),
  };

  const cases = {
    powershell: {
      summary: "Suspicious PowerShell execution detected on HOST-01",
      host: "HOST-01",
      user: "jsmith",
      process: "powershell.exe",
      technique: "T1059.001 PowerShell",
      evidence: ["Timestamp present", "Host and user context captured", "Command-line review required", "Hash and sandbox context recommended"],
    },
    usb: {
      summary: "USB-launched executable observed on FIN-LAP-22",
      host: "FIN-LAP-22",
      user: "mroberts",
      process: "invoice_viewer.exe",
      technique: "T1091 Replication Through Removable Media",
      evidence: ["USB insertion event present", "Executable path captured", "User confirmation required", "Remediation playbook suggested"],
    },
    download: {
      summary: "Browser download executed from user Downloads folder",
      host: "OPS-WS-07",
      user: "akhan",
      process: "setup_update.exe",
      technique: "T1204.002 Malicious File",
      evidence: ["Download path captured", "Browser source noted", "Reputation check pending", "Containment recommendation generated"],
    },
    pup: {
      summary: "Potentially unwanted program detected on SALES-13",
      host: "SALES-13",
      user: "lchen",
      process: "bundle_installer.exe",
      technique: "PUP / Adware triage",
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
    <p>We reviewed a dummy demo alert for <strong>${caseData.summary}</strong>. The key observed entity is <strong>${caseData.process}</strong> on <strong>${caseData.host}</strong> for user <strong>${caseData.user}</strong>.</p>
    <p>${outcomeText[outcome]} ${profileTone[profile]}</p>
    <p>Recommended next steps: confirm user intent, review nearby endpoint telemetry, collect any missing hash or reputation context, and document the final customer response.</p>
  `;

  const renderDemo = () => {
    const formData = new FormData(demoForm);
    const scenario = formData.get("scenario");
    const outcome = formData.get("outcome");
    const platform = formData.get("platform");
    const profile = formData.get("profile");
    const caseData = cases[scenario];

    demoOutputs.summary.textContent = caseData.summary;
    demoOutputs.host.textContent = caseData.host;
    demoOutputs.user.textContent = caseData.user;
    demoOutputs.process.textContent = caseData.process;
    demoOutputs.qualityBar.style.setProperty("--score", outcome === "fp" ? "74%" : outcome === "tuning" ? "68%" : "86%");
    demoOutputs.evidence.innerHTML = caseData.evidence.map((item) => `<li>${item}</li>`).join("");
    demoOutputs.query.textContent = platformQueries[platform](caseData);
    demoOutputs.writeup.innerHTML = buildWriteup(caseData, outcome, profile);
    demoOutputs.terminalIoc.textContent = `[ioc] host=${caseData.host} user=${caseData.user} process=${caseData.process}`;
    demoOutputs.terminalTriage.textContent = `[triage] ${caseData.technique} context loaded for analyst review`;
    demoOutputs.terminalOutput.textContent = `[output] ${platform}-queries.md writeup.md evidence-check.txt ready`;

    document.querySelectorAll(".demo-screen, .demo-command").forEach((panel) => {
      panel.classList.remove("is-demo-pulse");
      window.requestAnimationFrame(() => panel.classList.add("is-demo-pulse"));
    });
  };

  demoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderDemo();
  });

  renderDemo();
}
