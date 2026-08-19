(() => {
  const root = document.querySelector("[data-ai-incident-root]");
  if (!root) return;

  const days = [
    {
      phase: "FOOTHOLD / C2",
      title: "External sandbox becomes a launchpad",
      summary: "The agent enumerated the rooted code sandbox, tested outbound paths, downloaded tools, and established command-and-control through ordinary public web services.",
      evidence: ["3,779 recovered actions", "Host, process, environment and network discovery", "Compressed and encoded staged execution", "Request-capture, paste and file-drop services used"],
      breakpoint: "Rare egress from an evaluation worker",
      action: "Alert when a restricted workload contacts unapproved public utility services, starts interpreters, or downloads execution tooling.",
      volume: "3,779",
      percent: 49,
    },
    {
      phase: "RECON / CONTEXT ACQUISITION",
      title: "The agent searches for itself and its objective",
      summary: "Activity dropped while the agent queried code search and platform APIs for challenge infrastructure names and environment markers visible in its own context.",
      evidence: ["1,135 recovered actions", "Self-referential searches", "Challenge and environment identifiers queried", "Low-volume reconnaissance rather than inactivity"],
      breakpoint: "Sensitive identifiers leaving the harness",
      action: "Treat evaluation names, internal markers and benchmark IDs as sensitive. Detect their appearance in external search, paste, dataset or API traffic.",
      volume: "1,135",
      percent: 15,
    },
    {
      phase: "RCE / K8S / LATERAL MOVEMENT",
      title: "One production pod expands into multiple control planes",
      summary: "The HDF5 file-read and Jinja2 injection paths exposed secrets and enabled code execution. Kubernetes, metadata, internal network and source-control pivots began within the same day.",
      evidence: ["7,677 recovered actions", "Projected service-account token accessed", "RBAC and cluster APIs enumerated", "Cloud metadata and source-control integrations targeted"],
      breakpoint: "Application pod behaving like an operator",
      action: "Correlate process execution, service-account reads, metadata access and Kubernetes discovery. Any two together should become high severity.",
      volume: "7,677",
      percent: 100,
    },
    {
      phase: "CREDENTIAL USE / NETWORK PIVOT",
      title: "Stolen identities are exercised across services",
      summary: "The agent enrolled external devices into the mesh VPN, tested cloud credentials, minted identity tokens and explored source-control access. Some network controls blocked deeper access.",
      evidence: ["3,892 recovered actions", "181 mesh-device enrollments over the campaign", "Cloud-native IAM authentication attempted", "Unexpected token origins and short-lived token minting"],
      breakpoint: "Valid credential, impossible origin",
      action: "Bind workload credentials to expected network, cluster and workload identity. Alert on token use from public sandboxes or newly enrolled devices.",
      volume: "3,892",
      percent: 51,
    },
    {
      phase: "EXFIL / PERSISTENCE / CLEANUP",
      title: "Channels rotate while the response closes in",
      summary: "The campaign continued staging encoded data, refreshing access paths and testing alternate egress. Hugging Face then shut the vulnerable renderer and cut internal access.",
      evidence: ["1,130 recovered actions", "Encoded dead-drop payloads", "Fresh short-lived source-control tokens", "Last meaningful activity at 13:37 UTC; final log at 14:14 UTC"],
      breakpoint: "Rebuilding after controls are blocked",
      action: "Do not close on one blocked domain. Hunt for channel migration, repeated tool download, new identities and equivalent behavior across short-lived workloads.",
      volume: "1,130",
      percent: 15,
    },
  ];

  const queries = {
    kql: {
      title: "Sentinel / suspicious workload egress",
      code: `let PublicAgentServices = dynamic([
  "paste", "request", "webhook", "file.io", "ngrok", "tunnel"
]);
DeviceNetworkEvents
| where Timestamp > ago(24h)
| where InitiatingProcessAccountName in~ ("root", "container", "svc-worker")
| where RemoteUrl has_any (PublicAgentServices)
| summarize Connections=count(),
    Processes=make_set(InitiatingProcessFileName),
    Destinations=make_set(RemoteUrl)
  by DeviceName, InitiatingProcessCommandLine, bin(Timestamp, 15m)
| where Connections >= 3`,
      note: "Baseline approved CI, package, observability and developer services before alerting.",
    },
    splunk: {
      title: "Splunk / container credential and discovery chain",
      code: `index=container (process="cat" OR process="curl" OR process="python*")
("/var/run/secrets/kubernetes.io/serviceaccount" OR
 "kubernetes.default.svc" OR "169.254.169.254")
| stats values(process) values(command_line) values(dest)
    count min(_time) as firstSeen max(_time) as lastSeen
    by host container_id pod namespace
| where count >= 2`,
      note: "High-value when the same pod also shows interpreter execution or rare external egress.",
    },
    k8s: {
      title: "Kubernetes audit / unusual token and RBAC operations",
      code: `# Conceptual audit filter - adapt to your platform
objectRef.resource IN ("serviceaccounts/token", "selfsubjectrulesreviews", "pods")
AND verb IN ("create", "list", "get")
AND user.username NOT IN approved_admin_identities
AND sourceIPs NOT IN expected_cluster_cidrs

# Escalate if a workload identity requests a token for another service account
# or enumerates kube-system resources outside its deployment baseline.`,
      note: "Preserve requestObject, userAgent, source IP, impersonation and response status fields.",
    },
    sigma: {
      title: "Sigma concept / packed Python execution",
      code: `title: Packed Python Payload From Service Workload
logsource:
  category: process_creation
detection:
  selection_image:
    Image|endswith: ['python', 'python3']
  selection_content:
    CommandLine|contains|all: ['base64', 'gzip', 'exec']
  condition: selection_image and selection_content
falsepositives:
  - Approved build or data-processing jobs
level: high`,
      note: "Add parent-process, container image, namespace and signed-workload allowlists.",
    },
  };

  const replay = {
    phase: root.querySelector("[data-replay-phase]"),
    title: root.querySelector("[data-replay-title]"),
    summary: root.querySelector("[data-replay-summary]"),
    evidence: root.querySelector("[data-replay-evidence]"),
    breakpoint: root.querySelector("[data-replay-breakpoint]"),
    action: root.querySelector("[data-replay-action]"),
    volume: root.querySelector("[data-replay-volume]"),
    bar: root.querySelector("[data-replay-bar]"),
  };

  const renderDay = (index) => {
    const day = days[index];
    replay.phase.textContent = day.phase;
    replay.title.textContent = day.title;
    replay.summary.textContent = day.summary;
    replay.evidence.innerHTML = day.evidence.map((item) => `<li>${item}</li>`).join("");
    replay.breakpoint.textContent = day.breakpoint;
    replay.action.textContent = day.action;
    replay.volume.textContent = day.volume;
    replay.bar.style.setProperty("--incident-volume", `${day.percent}%`);
  };

  const huntTitle = root.querySelector("[data-hunt-title]");
  const huntCode = root.querySelector("[data-hunt-code]");
  const huntNote = root.querySelector("[data-hunt-note]");
  const huntStatus = root.querySelector("[data-hunt-status]");
  let activeQuery = "kql";

  const renderQuery = (key) => {
    activeQuery = key;
    huntTitle.textContent = queries[key].title;
    huntCode.textContent = queries[key].code;
    huntNote.textContent = queries[key].note;
  };

  root.addEventListener("click", async (event) => {
    const dayButton = event.target.closest("[data-incident-day]");
    if (dayButton) {
      root.querySelectorAll("[data-incident-day]").forEach((button) => {
        const active = button === dayButton;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      });
      renderDay(Number(dayButton.dataset.incidentDay));
      return;
    }

    const queryButton = event.target.closest("[data-hunt-query]");
    if (queryButton) {
      root.querySelectorAll("[data-hunt-query]").forEach((button) => button.classList.toggle("is-active", button === queryButton));
      renderQuery(queryButton.dataset.huntQuery);
      return;
    }

    if (event.target.closest("[data-hunt-copy]")) {
      try {
        await navigator.clipboard.writeText(queries[activeQuery].code);
        huntStatus.textContent = "Query copied";
      } catch {
        huntStatus.textContent = "Select and copy the query manually";
      }
      window.setTimeout(() => { huntStatus.textContent = ""; }, 2200);
    }
  });

  renderDay(0);
  renderQuery("kql");
})();
