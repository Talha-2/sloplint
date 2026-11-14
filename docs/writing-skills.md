# Writing skills

How the skills in `skills/` are written. Follow this when you add or change one.

A skill is read by a model that will follow it literally, in situations its author didn't foresee. Every sentence either helps it act correctly or adds noise it has to work around. Write for that reader.

## Layout

```
skills/<name>/
  SKILL.md              when to use the skill, its goal, and the steps
  agents/openai.yaml    display name and invocation policy for Codex
  references/*.md       detail the agent reads only when a step needs it
```

Keep `SKILL.md` short enough to read in full every time. Move tables of commands, long examples and rarely needed cases into `references/`, and link each one from the step that needs it: "Read [registries](references/registries.md) for the commands."

## Description

The description is the only part the agent always sees. It decides whether the skill loads.

- Start with **when**: "Use when you…", naming the actions and the words people use for them ("add, install, suggest or upgrade a package").
- Describe the **situation**, not the request. "Use when someone asks you to review" loads the skill only on request; "Use whenever you review a change, whether or not a review was requested" also covers checking your own work before a commit. Name the unprompted moments explicitly.
- Say **what it covers** in one sentence.
- Say **what it doesn't cover** and which skill does: "To review someone else's change, use sloplint-review."

## SKILL.md

1. **Goal.** One short paragraph: what the job is and what done looks like.
2. **Principle.** One bold sentence the agent can fall back on when the steps don't cover a case. For example, **Confirm before you report.**
3. **Steps.** Numbered headings that start with a verb: `## 2. Get the exact name`. Each step says what to do, then why if the reason isn't obvious.
4. **Report.** What to tell the user, with a short template.
5. **When something fails.** What to do when a tool, network or test run isn't available.

## Sentences

- Put the intent before the mechanics: "To prove the test can fail, break the code…".
- One idea per sentence. Prefer short words.
- Use the same word for the same thing everywhere. If it's a "finding" in step 2, it isn't an "issue" in step 5.
- Bold a term where it is defined, not for emphasis elsewhere.
- Give the reason when a rule would otherwise look arbitrary.
- Say what is **not** proof. Agents mistake signs of progress for results: "A test that passes is not proof it can fail." "A package that installs is not proof it's the one you meant."
- Guard against over-applying a rule. Say where it stops: "This is about comments that only repeat the code. Comments that explain a decision are fine."
- Bound the effort: "Stop after a few searches and report what you have."
- Give the failure path. A missing tool should produce an honest report, not a stalled task or a guessed result.

## Confidence

When a skill reports results, name how sure each one is, using a small fixed set of words (for example **Confirmed** and **Unconfirmed**), and say what each one requires. Never let an unconfirmed result read like a confirmed one.

## Templates

Give the output shape as a fenced template, set a length where it matters, and end with "Drop sections that don't apply." Templates without that line come back with empty headings.

## Before you commit a skill

- Read it as the agent would: top to bottom, taking every sentence literally. Remove anything that could be read two ways.
- Check every command it tells the agent to run.
- Check that numbers in examples are real, and date them if they will change.
- Keep shared rules consistent across skills and `templates/agents-md-section.md`.
