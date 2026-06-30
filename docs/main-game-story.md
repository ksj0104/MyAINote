# TRACE//CALL — Main Game Story Bible

> This document defines the proposed main game story that can replace or sit above the current campaign structure.
> It is written as a production reference for mission design, dialogue, UI copy, endings, and future implementation.

---

## 1. Core Pitch

**Title:** `TRACE//CALL`  
**Subtitle:** `One phone call leads to the heart of a corporation.`

**Logline**

A 10-year security professional and white-hat hacker hears that their parents may have been targeted by a voice phishing scam. What begins as a personal incident response becomes a hunt through phishing pages, call routing nodes, money mule accounts, leaked victim lists, and outsourced call centers. The trail eventually points to a giant corporation that publicly sells anti-fraud protection while secretly enabling the fraud ecosystem.

**Genre**

- Cyber investigation thriller
- Terminal-based hacking simulation
- Personal revenge story expanding into corporate conspiracy

**Player Fantasy**

The player is not a random hacker. They are an experienced defender using professional skills: log analysis, OSINT, phishing infrastructure tracking, packet inspection, credential tracing, forensic recovery, and controlled intrusion. The core fantasy is "I know how systems fail, and this time the system hurt my family."

---

## 2. Theme

**Main Theme**

Security tools do not protect people by default. They protect whoever controls the data.

**Personal Theme**

A professional who has spent 10 years protecting other people's systems is forced to confront the one breach they cannot treat as a ticket: their own family.

**Moral Question**

How far can a white-hat hacker go when legal routes are too slow, evidence is being destroyed, and more victims are being targeted every hour?

**Recurring Motifs**

- Missed calls
- Verification codes
- Elderly-targeted scripts
- "Protection" products used as surveillance funnels
- Logs that change after being viewed
- A support line that never reaches a human

---

## 3. Protagonist

**Name:** Yoon Seo-jin  
**Age:** 38  
**Role:** 10-year security lead at a private security company  
**Background:** Incident response, forensic triage, threat hunting, network defense  
**Public Identity:** Responsible defender, trusted by clients, careful with procedure  
**Private Weakness:** Family guilt. Seo-jin has been too busy protecting clients to notice their parents becoming vulnerable targets.

**Character Arc**

1. Starts as a professional trying to verify a rumor.
2. Becomes a child trying to protect their parents.
3. Becomes an investigator uncovering a national-scale fraud pipeline.
4. Becomes a whistleblower or outlaw depending on player choices.

**Internal Conflict**

Seo-jin knows the rules because they have enforced them for years. The more the corporation abuses lawful systems, the more the player must decide whether legality and justice still overlap.

---

## 4. Key Characters

| Character | Role | Function |
|---|---|---|
| **Yoon Seo-jin** | Player character | 10-year white-hat security professional |
| **Mother / Father** | Initial victims or near-victims | Personal stakes and emotional trigger |
| **Han Ji-woo** | Coworker and compliance-minded ally | Warns Seo-jin about legal and ethical limits |
| **MOTHER** | Anonymous source | Provides tips, leaked fragments, and pressure to go deeper |
| **Park Do-hyun** | Missing former telecom security engineer | Prior investigator who found the same trail |
| **HELIOS GROUP** | Corporate antagonist | Public anti-fraud company, secret fraud enabler |
| **The Call Center Crew** | Mid-tier antagonists | Operators, script writers, mule managers |
| **SilverNet Board** | Final antagonists | Executives who turned protection data into targeting intelligence |

---

## 5. Antagonist: HELIOS GROUP

**Public Face**

HELIOS GROUP is a trusted security, fintech, telecom authentication, and elder-care protection provider. It markets itself as a national shield against fraud.

**Real Function**

HELIOS does not directly place phishing calls. Instead, it provides the ecosystem that makes voice phishing profitable:

- Risk-scored elderly victim profiles
- Authentication relay infrastructure
- Call routing and number masking
- Money movement analytics
- "Fraud protection" telemetry repurposed into targeting data
- Cleanup procedures when campaigns are exposed

**Internal Project**

`PROJECT SILVERNET`

A product originally presented as an elderly financial protection platform. In practice, it became a target recommendation engine that scores victims by:

- Age
- Banking habits
- Call response probability
- Relationship with children
- Likelihood of trusting official-sounding calls
- History of ignoring security warnings
- Available liquidity estimate

---

## 6. Story Structure

### ACT 1 — The Missed Call

**Premise**

Seo-jin receives a message from their mother:

> "Seo-jin, your father got a strange call. This is fine, right?"

At first, the parents deny serious damage. But transaction alerts, SMS verification codes, and browser history suggest that someone walked them through a fake bank security process.

**Player Goal**

Confirm whether the parents were compromised, identify the phishing page, and trace the first infrastructure layer.

**Mission Types**

- Inspect copied SMS and call records
- Identify suspicious URLs
- Use `curl` to fetch phishing pages
- Use `whois`/DNS-style recon
- Extract hidden endpoint names from HTML
- Compare bank UI copy against fake page text
- Identify first mule account reference

**Act Reveal**

The phishing page contains an internal marker:

```text
HX-ROUTE / CLIENT: HELIOS-AUTH-BRIDGE
```

This is too structured for a small fraud crew.

---

### ACT 2 — The Call Center

**Premise**

The first trail leads to an outsourced call center and a rotating infrastructure of phishing domains, VPN nodes, and VOIP routes. Seo-jin discovers operator scripts designed to manipulate elderly victims.

**Player Goal**

Map the scam operation and recover active victim lists before the data is rotated out.

**Mission Types**

- Search leaked operator manuals
- Parse call scripts for campaign IDs
- Track VOIP routing nodes
- Analyze packet captures
- Find active callback panels
- Extract victim list fragments
- Identify money mule handoff timing

**Act Reveal**

The victim data was not scraped from random breaches. It came from a legitimate-looking elder protection service: `HELIOS CARE`.

Seo-jin finds their parents in a risk-scored target table.

---

### ACT 3 — The Protection Product

**Premise**

HELIOS CARE publicly claims to protect seniors from financial abuse. Internally, it classifies seniors by exploitability.

**Player Goal**

Prove that the call center receives target data from HELIOS-controlled systems.

**Mission Types**

- Investigate partner portals
- Recover API keys from exposed staging code
- Compare timestamps between HELIOS exports and scam campaigns
- Crack hashes from leaked admin panels
- Trace data broker contracts
- Access archived compliance reports

**Act Reveal**

`PROJECT SILVERNET` is not an accident or rogue employee scheme. It is known at the board level. HELIOS sells protection to banks while monetizing the same telemetry through shell vendors.

---

### ACT 4 — The Corporate Wall

**Premise**

Seo-jin attempts to report the findings through proper channels. Evidence starts disappearing. Phishing servers go offline. Logs mutate. Seo-jin's employer receives pressure to remove them from the case.

MOTHER pushes Seo-jin:

```text
MOTHER> A screenshot is not evidence.
MOTHER> A report is not leverage.
MOTHER> Bring back the originals, or they will bury this before sunrise.
```

**Player Goal**

Infiltrate HELIOS infrastructure deeply enough to obtain original, verifiable evidence.

**Mission Types**

- Breach a vendor portal
- Pivot through a forgotten staging host
- Use logs to identify a jumpbox
- Open SSH tunnels into segmented services
- Extract board reports
- Recover deleted audit logs
- Prove log tampering
- Find the SilverNet scoring model

**Act Reveal**

Park Do-hyun, the missing telecom engineer, had already found the same evidence. HELIOS framed him as a criminal insider and erased his reports. His dead drop becomes the key to validating Seo-jin's evidence.

---

### ACT 5 — Disclosure

**Premise**

Seo-jin has enough evidence to hurt HELIOS, but not every route leads to justice. The player must decide how to use the access they have gained.

**Final Objective**

Choose how to expose, submit, or destroy HELIOS's fraud support infrastructure.

**Endgame Choices**

1. **Legal Submission**
   - Submit evidence to regulators and law enforcement.
   - Safer for Seo-jin.
   - Risk: HELIOS may delay, lobby, and dilute the case.

2. **Public Leak**
   - Release evidence to press, civic groups, and victims.
   - More immediate pressure.
   - Risk: Seo-jin may be prosecuted for illegal access.

3. **Infrastructure Blackout**
   - Disable HELIOS fraud support systems directly.
   - Immediate reduction of active harm.
   - Risk: Seo-jin crosses the clearest legal and ethical line.

4. **Truth Route**
   - Requires optional evidence: original logs, board approval chain, Park Do-hyun archive, victim score model, and live call center routing proof.
   - Enables simultaneous legal submission and public verification.
   - Best ending, but hardest to unlock.

---

## 7. Ending Framework

### Creed Ending — Procedure

Seo-jin submits the evidence through official channels. HELIOS stock drops, hearings begin, and victims get public acknowledgment. The process is slow. Seo-jin keeps their identity and profession but must live with uncertainty.

**Tone:** restrained, lawful, incomplete justice.

### Ghost Ending — Blackout

Seo-jin destroys critical infrastructure and wipes their trail. Active campaigns collapse overnight. HELIOS cannot publicly explain what happened without admitting the system existed. Seo-jin disappears from their old life.

**Tone:** effective, lonely, morally compromised.

### Leak Ending — Firestorm

Seo-jin leaks the evidence. Victims organize. Media coverage explodes. HELIOS tries to frame Seo-jin, but public pressure makes the cover-up harder.

**Tone:** chaotic, brave, dangerous.

### Truth Ending — Verified Disclosure

Seo-jin combines original logs, board documents, victim data lineage, and Park Do-hyun's archive. The evidence is mirrored, timestamped, and delivered to journalists, regulators, and victim lawyers at once.

**Tone:** hard-earned victory. The system cannot quietly erase the truth.

---

## 8. Mission Progression Draft

| # | Mission Title | Story Beat | Skill Focus |
|---|---|---|---|
| 1 | Missed Calls | Parents receive suspicious calls | `cat`, `grep`, `less`, file reading |
| 2 | Fake Bank Page | Identify phishing URL | `curl`, HTML inspection |
| 3 | Verification Trap | Analyze SMS/auth flow | `grep`, pattern matching |
| 4 | First Host | Trace phishing host | `dig`, `nmap` |
| 5 | Mule Trail | Extract account hints | `strings`, `base64` |
| 6 | Operator Manual | Recover call scripts | `find`, `grep -r` |
| 7 | Callback Panel | Access exposed admin panel | `login`, SQLi basics |
| 8 | VOIP Route | Map call routing | `tcpdump`, logs |
| 9 | Victim List | Find target data | `dump`, `hashcat` |
| 10 | HELIOS CARE | Connect data source | web/API recon |
| 11 | Staging Leak | Find exposed API key | `grep`, `scp` |
| 12 | Partner Portal | Pivot into vendor system | `ssh`, credentials |
| 13 | SilverNet | Discover scoring model | file search, data parsing |
| 14 | Do-hyun Archive | Recover missing engineer's notes | compression/forensics |
| 15 | Log Mutation | Prove audit log tampering | `diff`, `sed`, timestamps |
| 16 | Board Packet | Extract executive report | privilege escalation |
| 17 | Live Campaign | Trace active scam in progress | multi-step investigation |
| 18 | Evidence Vault | Preserve originals | hashes, checksums, exfiltration |
| 19 | Corporate Core | Final HELIOS access | pivot chain |
| 20 | Disclosure | Choose ending route | final decision |

---

## 9. Opening Scene Draft

```text
[23:41]
7 missed calls.

The last message is from Mother.

"Seo-jin, your father got a strange call.
They said his account was being used for a crime.
This is fine, right?"

For ten years, Seo-jin had investigated breaches for banks,
hospitals, and companies that measured loss in dashboards.

This one did not start with a dashboard.
It started with a parent trying not to sound afraid.
```

---

## 10. Tone Guide

**Narration**

- Grounded, tense, personal.
- Avoid superhero hacker fantasy.
- Make each technical step feel like investigation, not magic.

**Seo-jin**

- Professional language when focused.
- Short emotional slips when family is involved.
- Does not brag.

**Han Ji-woo**

- Practical, cautious, legally aware.
- Represents the cost of crossing lines.

**MOTHER**

- Cryptic, useful, morally ambiguous.
- Speaks in pressure, not comfort.

**HELIOS**

- Corporate, clean, plausible.
- Never sounds cartoonishly evil.
- Uses risk, compliance, protection, and customer safety language to hide harm.

---

## 11. Safety Framing

The game should consistently frame hacking as simulated, investigative, and bounded by the fictional environment.

Design notes:

- Do not present real-world victim exploitation as aspirational.
- Keep player goals focused on evidence preservation, harm reduction, and accountability.
- When illegal actions appear as story choices, attach consequences.
- White-hat identity should matter mechanically and narratively.

---

## 12. Implementation Notes

This story can be implemented as a new `main game` path separate from the old campaign.

Recommended structure:

- Keep current Academy / CodeLab / Wargame as training modes.
- Replace or branch the existing campaign level list with `TRACE//CALL` missions.
- Add a case-file UI for victim data, evidence, and chain-of-custody.
- Track ending state with evidence flags:
  - `parentProtected`
  - `victimListRecovered`
  - `silvernetDiscovered`
  - `boardApprovalFound`
  - `dohyunArchiveRecovered`
  - `logTamperingProved`
  - `liveCampaignStopped`
  - `evidenceVerified`

Ending route can be computed from evidence completeness plus final player choice.

