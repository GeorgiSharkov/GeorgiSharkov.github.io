(() => {
  const queries = {
    kql: {title: 'Defender / web worker child processes', code: `DeviceProcessEvents
| where Timestamp > ago(7d)
| where InitiatingProcessFileName in~
    ("httpd", "httpd.exe", "apache2", "apache2.exe", "php", "php.exe")
    or InitiatingProcessFileName startswith "php-fpm"
| where FileName in~ ("sh", "bash", "dash", "zsh", "cmd.exe",
    "powershell.exe", "pwsh", "curl", "wget", "python", "python3", "perl")
| project Timestamp, DeviceName, AccountName,
    InitiatingProcessFileName, InitiatingProcessCommandLine,
    FileName, ProcessCommandLine, ProcessId, InitiatingProcessId
| order by Timestamp desc`, note: 'Requires Microsoft Defender for Endpoint process telemetry (or its Sentinel connector). Immediate-parent hunt; review deeper lineage separately. Legitimate application jobs can match. Missing child processes do not exclude in-process execution.'},
    splunk: {title: 'Splunk / CIM web worker child processes', code: `| tstats summariesonly=false count min(_time) as firstTime
    max(_time) as lastTime
  from datamodel=Endpoint.Processes
  where (Processes.parent_process_name="httpd"
    OR Processes.parent_process_name="apache2"
    OR Processes.parent_process_name="php-fpm*"
    OR Processes.parent_process_name="php")
    (Processes.process_name="sh" OR Processes.process_name="bash"
    OR Processes.process_name="curl" OR Processes.process_name="wget"
    OR Processes.process_name="python*" OR Processes.process_name="perl")
    earliest=-7d latest=now
  by Processes.dest Processes.user Processes.parent_process_name
    Processes.process_name Processes.process
| convert ctime(firstTime) ctime(lastTime)`, note: 'Requires populated Splunk CIM Endpoint.Processes data. Adapt process names and telemetry mappings. Review cron, image conversion, backups, and other expected web application subprocesses before escalation.'},
    files: {title: 'Defender / PHP files written by web workers', code: `DeviceFileEvents
| where Timestamp > ago(7d)
| where ActionType in ("FileCreated", "FileModified", "FileRenamed")
| where FileName endswith ".php" or FileName endswith ".phtml"
| where InitiatingProcessFileName in~ ("httpd", "apache2", "php", "php.exe")
    or InitiatingProcessFileName startswith "php-fpm"
| project Timestamp, DeviceName, ActionType, FolderPath, FileName,
    SHA1, InitiatingProcessFileName, InitiatingProcessCommandLine
| order by Timestamp desc`, note: 'Broad webshell triage pivot; review file content and change records. CMS/plugin updates may match. Check coverage for your platform and webroot paths; attackers can use different extensions or avoid file writes entirely.'}
  };
  const code = document.getElementById('query-code');
  const status = document.getElementById('copy-status');
  function showQuery(key) {
    const q = queries[key];
    code.textContent = q.code;
    document.getElementById('query-title').textContent = q.title;
    document.getElementById('query-note').textContent = q.note;
    status.textContent = '';
    document.querySelectorAll('[data-query]').forEach(b => {
      const active = b.dataset.query === key;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }
  document.querySelectorAll('[data-query]').forEach(b => b.addEventListener('click', () => showQuery(b.dataset.query)));
  document.getElementById('copy-query').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code.textContent); status.textContent = 'Query copied.'; }
    catch { status.textContent = 'Clipboard unavailable. Select and copy the query above.'; }
  });
  document.querySelectorAll('[data-path]').forEach(b => b.addEventListener('click', () => {
    const state = b.dataset.path === 'state';
    document.getElementById('path-middle').textContent = state ? 'State survives a request' : 'Interrupted initialization';
    document.getElementById('path-detail').textContent = state ? 'A worker retains a reference to freed request memory; a later request consumes it.' : 'Memory exhaustion can leave partially initialized request memory visible to shutdown.';
    document.getElementById('path-note').textContent = state ? 'The stale-state advisory includes a validated FPM session lifecycle path requiring a suitable application operation. Both a producer and a later consumer on the same worker are needed. [2]' : 'mod_php exploitation is confirmed. FPM susceptibility for this OOM path is supported by source analysis; the advisory does not claim a complete demonstrated FPM exploit for this path. [1]';
    document.querySelectorAll('[data-path]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  showQuery('kql');
})();
