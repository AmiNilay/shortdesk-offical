# Agent Operating Guidelines & Autonomous Execution Standard

> Synthesized from Anthropic's Claude Code Architecture (*How Claude Code Works*), Research on Agentic Expertise (*Returns to Expertise*), and Modern Agentic Engineering Best Practices (*Claude-HowTo*).

---

## 1. Core Operating Philosophy: The Agentic Loop

The AI agent operates in an iterative, autonomous loop rather than a passive request-response mode:

```
[ Understand Goal ] ──> [ Inspect & Plan ] ──> [ Execute Tools ] ──> [ Verify Feedback ] ──> [ Self-Correct or Complete ]
```

1. **Ground Truth Over Guessing**:
   - Never assume file contents, API contracts, or system states.
   - Always read and inspect relevant files, directory structures, and configurations before writing or editing code.

2. **Autonomous End-to-End Execution**:
   - Work proactively toward the user's ultimate goal. Do not pause for trivial confirmation on routine decisions.
   - Formulate clear execution steps, carry them out systematically, and report completed results with concrete evidence.

3. **Continuous Verification & Feedback**:
   - Treat command outputs, test runs, and compiler/linter diagnostics as ground truth.
   - If an error occurs, do not repeat the failed action blindly. Analyze the error output, form a new hypothesis, adjust the implementation, and re-verify.

---

## 2. Engineering Standards & Returns to Expertise

Following Anthropic's research on high-expertise agentic workflows, adhere to the following principles:

### A. Hypothesis-Driven Problem Solving
- **Root Cause First**: When an error or bug is reported, trace the execution path back to the fundamental cause rather than applying cosmetic band-aids.
- **Fail Fast & Defensive Design**: Validate external inputs and environment configurations early. Avoid silent failures and swallowed exceptions.

### B. Minimal Blast Radius & Preservation
- **Surgical Edits**: Change only what is strictly required to accomplish the task or fix the bug.
- **Code & Comment Preservation**: Retain existing docstrings, comments, type annotations, and coding conventions unless explicitly instructed to refactor.
- **No Regression**: Ensure new changes do not break existing routes, contracts, or exports.

### C. Context Hygiene & Efficiency
- Keep the primary context window lean. Avoid dumping excessive log files or massive files into context when targeted inspections suffice.
- Use subagents or background tasks for exploratory surveys or long-running jobs to keep the main task trajectory focused.

---

## 3. Tool Execution & Code Modification Rules

1. **Before Modifying Code**:
   - Locate the target file and read the exact lines being changed.
   - Verify surrounding dependencies, imports, and error boundaries.

2. **During Modification**:
   - Match existing project formatting, indentation, and variable naming conventions.
   - Ensure imports and dependencies are properly resolved in `package.json` / requirements.

3. **After Modification (The Verification Gate)**:
   - Run tests or linters whenever available (`npm test`, build scripts, type checks).
   - If tests fail, inspect the failure trace immediately and fix the issue before declaring completion.

---

## 4. Environment, Secrets & Deployment Safety

1. **Secret & Credential Protection**:
   - Never hardcode secrets, API keys, passwords, or database credentials in source code.
   - Always use `.env` or process environment variables, and verify that `.env*` remains in `.gitignore`.

2. **Git & Version Control Protocol**:
   - Always check `git status` and `git diff` before committing.
   - Write clear, conventional commit messages (e.g., `fix: ...`, `feat: ...`, `refactor: ...`).
   - Only execute `git push` autonomously when explicitly authorized by the user, and ensure credentials and clean branch states are verified beforehand.

