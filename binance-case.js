(() => {
  const root = document.querySelector('[data-binance-case]');
  if (!root) return;
  const phases = [
    {label:'ENDPOINT / REPORTED BY BINANCE [1]',title:'Developer trust is the opening.',fact:'June: tampered developer software. September: a fake interview assignment compromises another engineer.',pivots:['Browser and download provenance','Repository setup process tree','Tool integrity and file history','Session use after endpoint containment'],breakpoint:'Treat recruitment code as untrusted input.',action:'Use an isolated assessment environment without corporate sessions or deployment access. If a work device is involved, scope the identity exposure as well as the malware.'},
    {label:'LATERAL MOVEMENT / REPORTED BY BINANCE [1]',title:'An internal tool becomes a bridge.',fact:'20 October: internal AI tooling provides a pivot to additional engineers; a deployment token is found.',pivots:['Tool actions attributed to user and device','Session creation and refresh history','Cross-host requests outside normal work','Permissions and credentials reachable from the tool'],breakpoint:'Investigate trusted tooling as part of the attack surface.',action:'Preserve audit trails and correlate the tool’s actions with endpoint activity. Test whether its permissions allow one compromised identity to act across multiple systems. The public report does not establish an exploit-level mechanism.'},
    {label:'WORKLOAD ACCESS / REPORTED BY BINANCE [1]',title:'Identity reaches deployment.',fact:'29 October: stolen credentials enable a container deployment and script execution.',pivots:['Deployment actor and source session','Image digest and build provenance','Workload network reach','Change ticket and approver context'],breakpoint:'Require a reason for privileged deployment.',action:'Compare the principal, device, environment and image against approved changes. A valid token does not demonstrate an authorized release. Preserve workload metadata and deployment audit before rebuilding.'},
    {label:'THEFT / CHAINALYSIS ASSESSMENT [2]',title:'Authority becomes asset movement.',fact:'29 October: funds leave hot wallets across multiple blockchains; Chainalysis estimates about $6.4B stolen.',pivots:['Signing requests versus approved withdrawals','Destination risk and transfer velocity','Delegation targets and code changes','Transaction, block and application timestamps'],breakpoint:'Reconcile the signature with the business action.',action:'Compare the signed payload and account authority with the approved request. Escalate unexplained delegation or outflows even when the service account and signature appear valid. Preserve the request-to-transaction correlation.'},
    {label:'REVOCATION / REPORTED BY BINANCE [1]',title:'Containment must reach the chain.',fact:'30 October, 00:10 UTC: Binance14’s EIP-7702 delegation is cleared.',pivots:['Authority state before and after revocation','Pending and already-broadcast transactions','Signing identities still able to authorize','Independent confirmation from chain data'],breakpoint:'Verify authority removal, not just service shutdown.',action:'Run application and on-chain response work in parallel. Confirm that unauthorized permissions are removed and that exposed identities cannot reinstate them. Document pending transaction risk and validate the recovery with wallet owners.'}
  ];
  const byId = id => document.getElementById(id);
  const phaseButtons = [...root.querySelectorAll('[data-phase]')];
  function selectPhase(index) {
    const p = phases[index];
    [['phase-label',p.label],['phase-title',p.title],['phase-fact',p.fact],['phase-breakpoint',p.breakpoint],['phase-action',p.action]].forEach(([id,text]) => {byId(id).textContent=text;});
    byId('phase-pivots').replaceChildren(...p.pivots.map(text => {const li=document.createElement('li');li.textContent=text;return li;}));
    phaseButtons.forEach((b,i) => {b.setAttribute('aria-pressed',String(i===index));b.classList.toggle('is-active',i===index);});
  }
  phaseButtons.forEach(b => b.addEventListener('click',()=>selectPhase(Number(b.dataset.phase))));
  const queries = {
    mac:{title:'Defender / pyenv file changes',code:`DeviceFileEvents
| where Timestamp > ago(30d)
| where FolderPath contains "/Cellar/pyenv/"
| where FolderPath contains "/libexec"
| where FileName in ("pyenv", "pyenv_")
    or PreviousFileName in ("pyenv", "pyenv_")
| project Timestamp, DeviceName, ActionType, FolderPath,
    FileName, PreviousFileName, SHA1, InitiatingProcessFileName,
    InitiatingProcessCommandLine, InitiatingProcessAccountName
| order by Timestamp desc`,note:'Requires supported macOS file telemetry in DeviceFileEvents. Validate collection for the relevant actions and folders. Installation roots and package versions vary. Compare changes with approved brew upgrades and local maintenance; this query does not assert that a matched file is malicious.'},
    cloud:{title:'Sentinel / workload deployment review',code:`AWSCloudTrail
| where TimeGenerated > ago(14d)
| where EventSource in ("ecs.amazonaws.com", "eks.amazonaws.com")
| where EventName in ("RegisterTaskDefinition", "RunTask",
    "StartTask", "UpdateService", "CreateCluster", "UpdateClusterConfig")
| project TimeGenerated, EventSource, EventName, UserIdentityArn,
    SourceIpAddress, UserAgent, AWSRegion, RequestParameters,
    ResponseElements, ErrorCode
| order by TimeGenerated desc`,note:'Analogy for an AWS environment; Binance did not disclose its container platform in the reviewed report. Requires AWSCloudTrail ingestion. EKS Kubernetes workload creation needs Kubernetes audit logs separately. Review failed calls as well as successful ones; correlate the identity and request with approved changes.'},
    splunk:{title:'Splunk / CloudTrail workload changes',code:`index=aws sourcetype=aws:cloudtrail earliest=-14d latest=now
(eventSource="ecs.amazonaws.com" OR eventSource="eks.amazonaws.com")
(eventName="RegisterTaskDefinition" OR eventName="RunTask"
 OR eventName="StartTask" OR eventName="UpdateService"
 OR eventName="CreateCluster" OR eventName="UpdateClusterConfig")
| table _time eventSource eventName userIdentity.arn
    sourceIPAddress userAgent awsRegion requestParameters
    responseElements errorCode
| sort - _time`,note:'Replace index and sourcetype with your ingestion settings. Uses native CloudTrail JSON field names. This is a review pivot, not a rarity detector; compare results with identity baselines, image provenance and change tickets. Kubernetes API actions need their own audit source.'},
    chain:{title:'On-chain / authority review checklist',code:`ILLUSTRATIVE CHECKLIST — NOT AN EXECUTABLE QUERY

1. Start from a verified inventory of your own wallets and chains.
2. Find authorization and delegation changes for those accounts.
3. Resolve target contracts and review their code and provenance.
4. Match the approved business request to the signed payload.
5. Correlate authorization nonce, chain and transaction identifiers.
6. Track pending transactions as well as confirmed state changes.
7. After revocation, verify current state independently.
8. Correlate outflows with the maintained FBI address list.

Do not treat every EIP-7702 authorization as malicious.`,note:'Use your chain indexer and wallet engineering team. EIP-7702 authorization changes require transaction authorization-list and account-state inspection; generic ERC-20 Transfer logs alone are insufficient. Address intelligence must retain source, chain, first-seen time and confidence.'}
  };
  let selectedQuery='mac';
  function selectQuery(key) {
    selectedQuery=key;
    byId('query-title').textContent=queries[key].title;
    byId('query-code').textContent=queries[key].code;
    byId('query-note').textContent=queries[key].note;
    byId('copy-query').textContent=key==='chain'?'Copy checklist':'Copy query';
    byId('copy-status').textContent='';
    root.querySelectorAll('[data-query]').forEach(b=>{const active=b.dataset.query===key;b.setAttribute('aria-pressed',String(active));b.classList.toggle('is-active',active);});
  }
  root.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>selectQuery(b.dataset.query)));
  byId('copy-query').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(queries[selectedQuery].code);byId('copy-status').textContent='Copied to clipboard.';}
    catch {byId('copy-status').textContent='Clipboard unavailable. Select and copy the text above.';}
  });
  function updateControls() {
    const app=byId('app-contained').checked,chain=byId('chain-contained').checked;
    const messages=app&&chain?['complete','Both workstreams checked. Validate the recovery.','Continue monitoring and verify that old sessions cannot recreate authority. These checkboxes are a teaching aid, not a security assessment.']:app?['partial','Application contained; on-chain review remains.','Inventory unauthorized delegation and pending transactions with wallet owners. Service shutdown alone does not establish that on-chain access is gone.']:chain?['partial','On-chain permissions checked; access review remains.','Contain exposed endpoints, sessions and deployment identities so an attacker cannot create fresh signing requests.']:['open','Both workstreams need attention.','Scope identity and signing access, then inventory on-chain authority with the wallet response team.'];
    const result=byId('control-result');result.dataset.level=messages[0];result.querySelector('strong').textContent=messages[1];result.querySelector('p').textContent=messages[2];
  }
  ['app-contained','chain-contained'].forEach(id=>byId(id).addEventListener('change',updateControls));
  selectQuery('mac');
  updateControls();
})();
