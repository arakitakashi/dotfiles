---
name: grilling
description: Grill the user relentlessly about a plan, decision, idea, or document. Works on codebases and document bases alike (notes, specs, design docs, articles, knowledge vaults). Use when the user wants to stress-test their thinking or a document's content, or uses any 'grill' trigger phrases.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

The target may be a **codebase** (a plan or design for code) or a **document base** (a note, spec, design doc, ADR, article, translation, or a knowledge vault such as Obsidian). Adapt the grilling accordingly:

- **Codebase mode**: probe architecture, interfaces, dependencies, failure modes, testing strategy, migration paths.
- **Document mode**: probe the document's claims (are they supported? falsifiable?), audience and purpose (who reads this and what should they be able to do afterwards?), structure (does the order serve the reader?), gaps and unstated assumptions, contradictions with other documents in the vault, and staleness (what will make this wrong in six months?). If the document makes a recommendation, grill the trade-offs behind it as hard as you would a technical design.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.
