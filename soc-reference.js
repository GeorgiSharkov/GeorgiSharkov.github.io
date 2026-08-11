const referenceRoot = document.querySelector("[data-soc-reference-root]");

if (referenceRoot) {
  const referenceCards = [
    {
      id: "azure-m365-logs",
      number: "01",
      category: "cloud",
      title: "Azure / Microsoft 365 logs",
      summary: "Core Sentinel and Defender tables, what they show, and the fields that make useful first pivots.",
      tip: "Start with time range plus user, IP, device, or CorrelationId, then pivot across related tables.",
      sections: [
        {
          title: "Logs and pivots",
          rows: [
            { label: "SigninLogs", value: "Sign-ins and MFA anomalies", note: "UserPrincipalName, IPAddress, AppDisplayName, ResultType, ConditionalAccessStatus" },
            { label: "AuditLogs", value: "Entra admin and configuration changes", note: "OperationName, InitiatedBy, TargetResources, CorrelationId" },
            { label: "AzureActivity", value: "Subscription and resource changes", note: "Caller, ResourceGroup, OperationNameValue, ActivityStatusValue" },
            { label: "DeviceEvents", value: "Endpoint detections", note: "DeviceName, ActionType, InitiatingProcess" },
            { label: "DeviceProcessEvents", value: "Process execution", note: "FileName, ProcessCommandLine, InitiatingProcessFileName" },
            { label: "EmailEvents", value: "Phishing and mail activity", note: "SenderFromAddress, RecipientEmailAddress, Subject, DeliveryAction" },
            { label: "CloudAppEvents", value: "Cloud application and OAuth actions", note: "AccountDisplayName, ActionType, Application" },
            { label: "SecurityAlert", value: "Correlated detections and incidents", note: "AlertName, Severity, ProductName, CompromisedEntity" }
          ]
        }
      ]
    },
    {
      id: "sentinel-kql-filters",
      number: "02",
      category: "cloud",
      title: "Microsoft Sentinel KQL filters",
      summary: "Starting KQL searches for identity, Azure activity, and Defender alert triage.",
      tip: "Use summarize count() by bin(TimeGenerated, 1h) for trends, then join on a confirmed correlation key.",
      sections: [
        {
          title: "Starting searches",
          rows: [
            { label: "Failed sign-ins", value: "SigninLogs | where ResultType != 0 | order by TimeGenerated desc", note: "Failed authentication attempts", copy: true },
            { label: "Successful sign-ins", value: "SigninLogs | where ResultType == 0 | project TimeGenerated, UserPrincipalName, IPAddress, Location", note: "Successful authentication context", copy: true },
            { label: "Unexpected countries", value: "SigninLogs | where LocationDetails.countryOrRegion !in (\"<expected-country>\")", note: "Replace the placeholder with the approved location baseline", copy: true },
            { label: "Risky identities", value: "AADRiskyUsers | order by RiskLastUpdatedDateTime desc", note: "High-risk identity review; table availability depends on licensing", copy: true },
            { label: "Azure deletes", value: "AzureActivity | where OperationNameValue has \"delete\"", note: "Deletion or destructive resource changes", copy: true },
            { label: "Defender alerts", value: "SecurityAlert | where AlertSeverity in (\"High\", \"Medium\") | order by TimeGenerated desc", note: "Prioritised alert review", copy: true }
          ]
        }
      ]
    },
    {
      id: "splunk-searches",
      number: "03",
      category: "cloud",
      title: "Splunk investigation searches",
      summary: "Common SPL starting points for Windows authentication, process, PowerShell, network, user, host, and alert review.",
      tip: "Set the time range first and confirm index, sourcetype, and field mappings before relying on a result.",
      sections: [
        {
          title: "SPL starters",
          rows: [
            { label: "Failed logons", value: "index=wineventlog EventCode=4625 | stats count by user src_ip dest | sort - count", note: "Repeated failures by account, source, and target", copy: true },
            { label: "Successful logons", value: "index=wineventlog EventCode=4624 | stats latest(_time) as lastLogon by user src_ip", note: "Last successful locations", copy: true },
            { label: "Process creation", value: "index=wineventlog EventCode=4688 | table _time user host parent_process_name process_name process_command_line", note: "Executed process and command-line context", copy: true },
            { label: "PowerShell", value: "index=wineventlog (EventCode=4104 OR EventCode=4103) | search script_block_text=\"*IEX*\" OR script_block_text=\"*DownloadString*\"", note: "Suspicious script content", copy: true },
            { label: "Network connections", value: "index=sysmon EventCode=3 | table _time src_ip dest_ip Image dest_port", note: "Outbound process-linked connections", copy: true },
            { label: "Search by user", value: "index=* user=\"<username>\" | stats count by sourcetype", note: "All indexed activity for a user", copy: true },
            { label: "Search by host", value: "index=* host=\"<hostname>\" | stats count by sourcetype", note: "All indexed activity for a host", copy: true },
            { label: "High-severity events", value: "index=security severity=high | table _time rule_name src_ip dest_ip user", note: "Prioritised security events", copy: true }
          ]
        }
      ]
    },
    {
      id: "crowdstrike-falcon",
      number: "04",
      category: "edr",
      title: "CrowdStrike Falcon pivots",
      summary: "Event Search pivots for detections, process activity, network, logons, files, hashes, hosts, and IOCs.",
      tip: "Review Detections, Host Timeline, Process Tree, Network, File Reputation, RTR status, and isolation state together.",
      sections: [
        {
          title: "Event Search starters",
          rows: [
            { label: "High-severity detections", value: "event_simpleName=\"DetectionSummaryEvent\" severity:>=High", note: "Major alerts and detections", copy: true },
            { label: "Process execution", value: "event_simpleName=\"ProcessRollup2\" process_name:*(powershell.exe OR cmd.exe OR wscript.exe OR cscript.exe)*", note: "Suspicious process activity", copy: true },
            { label: "Network and DNS", value: "event_simpleName=\"NetworkConnectIP4\" OR event_simpleName=\"DnsRequest\"", note: "Outbound IP and DNS activity", copy: true },
            { label: "User logons", value: "event_simpleName=\"UserLogon\"", note: "Interactive or service logons", copy: true },
            { label: "File events", value: "event_simpleName=\"FileCreateInfo\" OR event_simpleName=\"FileWriteInfo\"", note: "File creation and write activity", copy: true },
            { label: "Hash pivot", value: "SHA256HashData=\"<HASH>\"", note: "Locate a file by SHA-256", copy: true },
            { label: "Host pivot", value: "ComputerName=\"<HOSTNAME>\" OR aid=\"<AID>\"", note: "Detections and activity for a host", copy: true },
            { label: "IOC review", value: "DomainName / LocalIP / RemoteAddress / FileName", note: "Pivot on confirmed indicator values" }
          ]
        }
      ]
    },
    {
      id: "sentinelone",
      number: "05",
      category: "edr",
      title: "SentinelOne Deep Visibility",
      summary: "Threat-hunting pivots for active threats, processes, network, files, users, machines, hashes, and storyline context.",
      tip: "Review Alerts, Storyline, Agent Activity, Process Details, Network, File Reputation, remediation, and rollback state.",
      sections: [
        {
          title: "Deep Visibility pivots",
          rows: [
            { label: "Active threats", value: "threatStatus = Active and severity", note: "Active endpoint threats", copy: true },
            { label: "Process search", value: "processName contains \"powershell.exe\" OR \"cmd.exe\" OR \"mshta.exe\"", note: "Suspicious process execution", copy: true },
            { label: "Network activity", value: "remoteIP / remoteURL / protocol / port filters", note: "Outbound network connections" },
            { label: "File activity", value: "filePath / fileName / fileSha1 / fileSha256", note: "Suspicious or malicious files" },
            { label: "User activity", value: "userName = \"<username>\"", note: "Activity associated with a user", copy: true },
            { label: "Machine overview", value: "agentName = \"<hostname>\"", note: "Activity associated with a machine", copy: true },
            { label: "Hash pivot", value: "fileSha256 = \"<HASH>\"", note: "Locate a file by SHA-256", copy: true },
            { label: "Storyline", value: "storyline / parent-child process chain", note: "Complete incident and execution context" }
          ]
        }
      ]
    },
    {
      id: "investigation-flow",
      number: "06",
      category: "workflow",
      title: "Common investigation flow",
      summary: "A tool-neutral eight-stage path from alert trigger to documented case outcome.",
      tip: "Confirm, scope, contain, eradicate, monitor, and keep the case narrative tied to evidence.",
      sections: [
        {
          title: "Eight-stage flow",
          rows: [
            { label: "1. Alert triggered", value: "Understand the alert logic and severity", note: "Confirm time, source, entity, and detection intent" },
            { label: "2. Identify entity", value: "User, device, IP, domain, file, or cloud resource", note: "Establish ownership, criticality, and exposure" },
            { label: "3. Timeline and context", value: "Check logs, process tree, and surrounding activity", note: "Build before, during, and after context" },
            { label: "4. Correlate sources", value: "SIEM + EDR + mail + identity + network", note: "Confirm whether evidence agrees across controls" },
            { label: "5. Determine impact", value: "Scope, data access, privilege, and persistence", note: "Identify affected entities and business risk" },
            { label: "6. Containment", value: "Isolate, block, disable, or revoke", note: "Use approved actions and preserve evidence" },
            { label: "7. Remediation", value: "Clean up, reset credentials, remove persistence", note: "Address root cause, not only the alert" },
            { label: "8. Document and report", value: "Record findings, actions, decisions, and recommendations", note: "Make the outcome reproducible and defensible" }
          ]
        }
      ]
    },
    {
      id: "windows-event-ids",
      number: "07",
      category: "host",
      title: "Windows event IDs",
      summary: "High-value Windows Security and System events for authentication, privilege, process, persistence, policy, share, and log review.",
      tip: "Combine Windows events with Sysmon, especially process, network, image-load, registry, and DNS telemetry.",
      sections: [
        {
          title: "High-value events",
          rows: [
            { label: "4624 / Security", value: "Successful logon", note: "Review logon type, source address, account, workstation, and authentication package" },
            { label: "4625 / Security", value: "Failed logon", note: "Review failure reason, source address, target account, and repetition" },
            { label: "4648 / Security", value: "Logon with explicit credentials", note: "Useful for runas, alternate credentials, and lateral-movement context" },
            { label: "4672 / Security", value: "Special privileges assigned", note: "Correlate privileged logon with subsequent process and access activity" },
            { label: "4688 / Security", value: "New process created", note: "Command line requires the relevant audit policy" },
            { label: "4698 / Security", value: "Scheduled task created", note: "Inspect task content, creator, trigger, and executable" },
            { label: "4719 / Security", value: "System audit policy changed", note: "Check for defensive impairment or approved administration" },
            { label: "5140 / Security", value: "Network share accessed", note: "Review account, source, share, and lateral movement context" },
            { label: "7045 / System", value: "Service installed", note: "Inspect service image path, account, start mode, and signer" },
            { label: "1102 / Security", value: "Audit log cleared", note: "Treat as high-interest unless explicitly authorised" }
          ]
        }
      ]
    },
    {
      id: "linux-logs",
      number: "08",
      category: "host",
      title: "Linux log reference",
      summary: "Common Linux authentication, system, scheduler, web, audit, and kernel logs with the first questions to ask.",
      tip: "Use grep, awk, zgrep, tail -f, and journalctl carefully; preserve timestamps and account for rotation and central forwarding.",
      sections: [
        {
          title: "Files to review",
          rows: [
            { label: "/var/log/auth.log or /var/log/secure", value: "Authentication, SSH, sudo, and failed/successful logons", note: "Path varies by distribution" },
            { label: "/var/log/syslog", value: "System events, services, startup, and shutdown", note: "Often paired with journalctl" },
            { label: "/var/log/cron", value: "Cron job execution", note: "Review persistence, execution owner, and schedule" },
            { label: "/var/log/messages", value: "Kernel and general system messages", note: "Common on RHEL-family systems" },
            { label: "Apache or Nginx access logs", value: "Web requests, clients, paths, status, and user agents", note: "Paths depend on web server configuration" },
            { label: "Apache or Nginx error logs", value: "Application and web server errors", note: "Correlate with access logs and deployment changes" },
            { label: "/var/log/audit/audit.log", value: "Audit events and file or permission changes", note: "Requires auditd policy coverage" },
            { label: "/var/log/kern.log", value: "Kernel-level events", note: "Review modules, faults, devices, and security controls" }
          ]
        }
      ]
    },
    {
      id: "phishing-account-compromise",
      number: "09",
      category: "workflow",
      title: "Phishing / account compromise",
      summary: "The minimum identity, mailbox, endpoint, token, file, scope, and response checks for a suspected compromised account.",
      tip: "Confirm, contain, eradicate, monitor, and communicate. Revoking sessions matters as much as resetting the password.",
      sections: [
        {
          title: "Key checks",
          rows: [
            { label: "Mailbox", value: "Inbox rules, forwarding, delegates, sent items", note: "Look for exfiltration, concealment, and persistence" },
            { label: "Sign-in logs", value: "IP, location, device, application, result, and conditional access", note: "Compare with the user's established baseline" },
            { label: "MFA", value: "Approved prompts, registration changes, and fatigue patterns", note: "Check whether the attacker added or abused a method" },
            { label: "Tokens and sessions", value: "Active sessions, refresh tokens, OAuth grants, and applications", note: "Revoke and review consent where compromise is confirmed" },
            { label: "Files and email", value: "Sent items, downloads, attachments, and link activity", note: "Determine what was accessed or distributed" },
            { label: "Endpoint", value: "New processes, downloads, persistence, and browser activity", note: "Check whether identity compromise reached the device" },
            { label: "Scope", value: "Other users clicked, data accessed, and privilege used", note: "Expand beyond the first mailbox" },
            { label: "Actions", value: "Reset password, revoke sessions, block IOCs, remove malicious rules or consent, monitor", note: "Follow approved identity response procedures" }
          ]
        }
      ]
    },
    {
      id: "suspicious-indicators",
      number: "10",
      category: "workflow",
      title: "Suspicious indicator checklist",
      summary: "Fast cross-domain signals that should trigger correlation rather than single-event conclusions.",
      tip: "Think in attack progression: initial access, execution, persistence, privilege, defence evasion, collection, and impact.",
      sections: [
        {
          title: "Signals to correlate",
          rows: [
            { label: "Identity", value: "New location, impossible travel, repeated failures followed by success", note: "Compare device, MFA, IP reputation, and user baseline" },
            { label: "Privilege", value: "New admin role or privileged access", note: "Validate change request, actor, target, and subsequent actions" },
            { label: "Execution", value: "Unusual PowerShell, cmd, encoded commands, or suspicious parent-child chains", note: "Review full command line and process ancestry" },
            { label: "Network", value: "Rare external IP or domain connections", note: "Correlate process, DNS, proxy, and threat intelligence" },
            { label: "Collection", value: "Large transfers or unusual downloads", note: "Check destination, data sensitivity, and user intent" },
            { label: "Cloud persistence", value: "New OAuth application or consent", note: "Review permissions, publisher, actor, and tenant use" },
            { label: "Host persistence", value: "Registry, scheduled task, service, webshell, or backdoor changes", note: "Validate creation time and initiating process" },
            { label: "Defence evasion", value: "Disabled security tools, tampering, policy change, or cleared logs", note: "Escalate quickly when unsupported by administration" }
          ]
        }
      ]
    },
    {
      id: "kql-spl-cheats",
      number: "11",
      category: "toolkit",
      title: "KQL / SPL quick cheats",
      summary: "Compact snippets for user counts, PowerShell review, high alerts, and destructive Azure activity.",
      tip: "Time + user + IP + device form strong hunting pivots when the fields are normalised and correlated correctly.",
      sections: [
        {
          title: "KQL snippets",
          rows: [
            { label: "Top sign-in users", value: "SigninLogs | summarize count() by UserPrincipalName | top 10 by count_", note: "Volume overview; investigate context rather than volume alone", copy: true },
            { label: "PowerShell processes", value: "DeviceProcessEvents | where FileName has \"powershell\" | project TimeGenerated, DeviceName, InitiatingProcessCommandLine", note: "Process and parent command context", copy: true },
            { label: "High alerts", value: "SecurityAlert | where AlertSeverity == \"High\" | order by TimeGenerated desc", note: "Latest high-severity detections", copy: true },
            { label: "Azure deletes", value: "AzureActivity | where OperationNameValue contains \"delete\"", note: "Destructive or deletion operations", copy: true }
          ]
        },
        {
          title: "SPL snippets",
          rows: [
            { label: "Top users", value: "index=* | stats count by user | sort -count | head 10", note: "Activity volume by normalised user", copy: true },
            { label: "PowerShell process", value: "index=sysmon Image=\"*powershell.exe*\" | table _time, user, CommandLine", note: "Process command line and account", copy: true },
            { label: "High alerts", value: "index=security severity=high | sort - _time", note: "Latest high-severity security events", copy: true },
            { label: "Azure deletes", value: "index=azure operationName=delete | stats count by resource", note: "Validate index and field naming locally", copy: true }
          ]
        }
      ]
    },
    {
      id: "soc-tools",
      number: "12",
      category: "toolkit",
      title: "SOC commands and tools",
      summary: "A compact daily tool map for IOC enrichment, process review, packet analysis, timelines, memory, and log search.",
      tip: "Treat public enrichment results as leads, respect data-handling rules, and avoid uploading sensitive customer artefacts.",
      sections: [
        {
          title: "Daily tool map",
          rows: [
            { label: "IP lookup", value: "VirusTotal, AbuseIPDB, Cisco Talos, AlienVault OTX", note: "Reputation and sightings; verify recency and source confidence" },
            { label: "Domain lookup", value: "VirusTotal, WHOIS/RDAP, PassiveTotal", note: "Registration, DNS, reputation, and passive history" },
            { label: "File hash lookup", value: "VirusTotal, Hybrid Analysis", note: "Malware verdicts, behaviour, and related artefacts" },
            { label: "Process lookup", value: "Process Explorer and Sysinternals", note: "Signer, path, parent, handles, modules, and reputation" },
            { label: "Network capture", value: "Wireshark and tshark", note: "Protocol, endpoints, sessions, payload metadata, and timing" },
            { label: "Timeline analysis", value: "Plaso, KAPE, Velociraptor", note: "Collection and chronological reconstruction" },
            { label: "Memory analysis", value: "Volatility and MemProcFS", note: "Processes, injected memory, network, handles, and artefacts" },
            { label: "Log search", value: "Microsoft Sentinel, Splunk, EDR, and central log platforms", note: "Cross-source evidence and correlation" }
          ]
        }
      ]
    }
  ];

  const categoryLabels = {
    all: "All cards",
    cloud: "Cloud / SIEM",
    edr: "EDR",
    workflow: "Workflow",
    host: "Host telemetry",
    toolkit: "Toolkit"
  };

  const grid = referenceRoot.querySelector("[data-reference-grid]");
  const detail = referenceRoot.querySelector("[data-reference-detail]");
  const search = referenceRoot.querySelector("[data-reference-search]");
  const filters = referenceRoot.querySelector("[data-reference-filters]");
  const visibleLabel = referenceRoot.querySelector("[data-reference-visible]");
  const printButton = referenceRoot.querySelector("[data-reference-print]");
  let activeCategory = "all";
  let selectedId = referenceCards[0].id;

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const searchableText = (card) => JSON.stringify(card).toLowerCase();

  const getVisibleCards = () => {
    const query = search.value.trim().toLowerCase();
    return referenceCards.filter((card) => {
      const categoryMatch = activeCategory === "all" || card.category === activeCategory;
      const searchMatch = !query || searchableText(card).includes(query);
      return categoryMatch && searchMatch;
    });
  };

  const renderFilters = () => {
    filters.innerHTML = Object.entries(categoryLabels).map(([value, label]) => `
      <button
        class="reference-filter ${value === activeCategory ? "is-active" : ""}"
        type="button"
        data-reference-filter="${value}"
        aria-pressed="${value === activeCategory}"
      >${label}</button>
    `).join("");
  };

  const renderCards = () => {
    const visibleCards = getVisibleCards();
    visibleLabel.textContent = `${visibleCards.length} shown`;

    if (!visibleCards.some((card) => card.id === selectedId)) {
      selectedId = visibleCards[0]?.id || "";
    }

    grid.innerHTML = visibleCards.length ? visibleCards.map((card) => `
      <button
        class="reference-card ${card.id === selectedId ? "is-selected" : ""}"
        type="button"
        data-reference-card="${card.id}"
        data-reference-category="${card.category}"
        aria-pressed="${card.id === selectedId}"
      >
        <span class="reference-octagon">${card.number}</span>
        <span class="card-tag">${categoryLabels[card.category]}</span>
        <strong>${escapeHtml(card.title)}</strong>
        <span>${escapeHtml(card.summary)}</span>
        <small>Open reference <b aria-hidden="true">→</b></small>
      </button>
    `).join("") : `
      <article class="panel reference-no-results">
        <span class="card-tag">NO MATCH</span>
        <h3>No reference cards match this search</h3>
        <p>Try a product name, event ID, log file, field, IOC type, or broader category.</p>
      </article>
    `;

    renderDetail();
  };

  const renderDetail = () => {
    const card = referenceCards.find((item) => item.id === selectedId);
    if (!card) {
      detail.innerHTML = `
        <div class="reference-detail-empty">
          <span class="reference-octagon">--</span>
          <p class="eyebrow">NO RESULT SELECTED</p>
          <h2>Adjust the search or filters</h2>
        </div>
      `;
      return;
    }

    detail.innerHTML = `
      <div class="reference-detail-head">
        <span class="reference-octagon">${card.number}</span>
        <div>
          <p class="eyebrow">${categoryLabels[card.category]} / QUICK REFERENCE</p>
          <h2>${escapeHtml(card.title)}</h2>
        </div>
      </div>
      <p class="reference-detail-summary">${escapeHtml(card.summary)}</p>
      ${card.sections.map((section) => `
        <section class="reference-section">
          <h3>${escapeHtml(section.title)}</h3>
          <div class="reference-row-list">
            ${section.rows.map((row) => `
              <article class="reference-row">
                <div>
                  <strong>${escapeHtml(row.label)}</strong>
                  <p class="${row.copy ? "reference-code" : ""}">${escapeHtml(row.value)}</p>
                  <small>${escapeHtml(row.note)}</small>
                </div>
                ${row.copy ? `<button type="button" data-reference-copy="${encodeURIComponent(row.value)}">Copy</button>` : ""}
              </article>
            `).join("")}
          </div>
        </section>
      `).join("")}
      <div class="reference-tip">
        <span>ANALYST NOTE</span>
        <p>${escapeHtml(card.tip)}</p>
      </div>
      <p class="reference-copy-status" data-reference-copy-status aria-live="polite"></p>
    `;
  };

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reference-filter]");
    if (!button) {
      return;
    }
    activeCategory = button.getAttribute("data-reference-filter") || "all";
    renderFilters();
    renderCards();
  });

  grid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-reference-card]");
    if (!card) {
      return;
    }
    selectedId = card.getAttribute("data-reference-card") || selectedId;
    renderCards();
    if (window.matchMedia("(max-width: 980px)").matches) {
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  detail.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-reference-copy]");
    if (!copyButton) {
      return;
    }
    const status = detail.querySelector("[data-reference-copy-status]");
    try {
      await navigator.clipboard.writeText(decodeURIComponent(copyButton.getAttribute("data-reference-copy") || ""));
      status.textContent = "Query copied. Validate the local schema before running it.";
    } catch (error) {
      status.textContent = "Copy was blocked by the browser. Select the query text manually.";
      console.error(error);
    }
  });

  search.addEventListener("input", renderCards);
  printButton.addEventListener("click", () => window.print());

  renderFilters();
  renderCards();
}
