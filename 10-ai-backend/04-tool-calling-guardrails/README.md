# Topic: Tool calling & guardrails — letting models ACT safely

> **Goal:** Give an LLM hands: registered tools with typed schemas, argument validation before execution, and loop guardrails so a confused model can't spin forever or call what doesn't exist. Scripted LLM turns keep every test deterministic and free.

## Beginner-friendly picks

- 📝 [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) (read free) — the request/response shapes you're mimicking
- 🎥 YouTube search: **“function calling LLM explained”** — one conceptual video before building

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Tool contracts | name + description + parameter TYPES the model must fill; description IS the model's documentation | [OpenAI function calling](https://platform.openai.com/docs/guides/function-calling) |
| Validate BEFORE execute | model output is untrusted input: missing/typed-wrong/unknown args fail closed | your assignment |
| The agent loop | model → tool_call → result → model … until final answer or LIMITS hit | same guide |
| Guardrails | max iterations, allow-lists, per-call timeouts — the difference between an agent and a fork bomb | your guardrails |
| Deterministic testing | scripted "model turns" make agent behavior reproducible without any API | your spec's design |

## Keep in mind

- **The model invents arguments.** Every tool invocation is attacker-adjacent input: validate shape, types, AND unknown keys.
- **Unknown tool ≠ crash** — it's a controlled error the loop reports back to the model for self-correction (or halts on, per policy).
- **Iteration caps are safety brakes**: without them, models loop retrying failing tools, burning tokens (topic 05 meters the burn).
- **Descriptions drive selection**: vague descriptions cause wrong-tool picks more than bad models do.

## Self-check quiz

<details><summary>1. Model calls <code>get_weather</code> but only <code>getWeather</code> is registered. Response?</summary>
Controlled unknown-tool error naming the closest match if you like — never undefined-function crashes, never silent success.</details>

<details><summary>2. Args include <code>{city:"Paris", units:"celsius", debug:true}</code> when schema declares city+units. Verdict?</summary>
Reject with unknown-key error (<code>debug</code>) — strictness keeps prompts honest; silently dropping keys hides prompt/model drift.</details>

<details><summary>3. Your agent hits maxCalls mid-task. Options?</summary>
Halt with structured partial state for resumption, or report best-effort failure to the model. NEVER reset the counter silently.</details>

## Assignment

[assignment.md](assignment.md) — implement `ToolRegistry`, `validateArgs`, `executeToolCall`, and `createGuardedExecutor`. All LLM turns are SCRIPTED in tests: deterministic, free, offline.
