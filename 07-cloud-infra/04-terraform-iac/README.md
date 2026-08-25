# Topic: Terraform — infrastructure as reviewable code

> **Goal:** Write your first HCL: a provider, variables, an S3 bucket, an output. Your file must PARSE (real `terraform fmt -check` against the actual binary) and satisfy structural contracts — the same gate real IaC repos run in CI.

## Beginner-friendly picks

- 🎥 [HashiCorp — Terraform getting started videos](https://developer.hashicorp.com/terraform/tutorials/cli/init) embedded in tutorials
- 🧪 Your `fmt -check` spec IS the beginner feedback loop — run it constantly while editing HCL

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| HCL anatomy | blocks (resource/variable/output/provider), arguments, expressions `${var.x}` | [Terraform language docs](https://developer.hashicorp.com/terraform/language) |
| Providers | plugins talking to APIs; version constraints pin behavior across machines | [Terraform — providers](https://developer.hashicorp.com/terraform/language/providers) |
| Variables & outputs | inputs typed w/ defaults+descriptions; outputs export values to humans/other stacks | [Terraform — variables](https://developer.hashicorp.com/terraform/language/values/variables) |
| State | terraform.tfstate maps config↔real world; remote state + locking for teams; NEVER commit state | [Terraform — state](https://developer.hashicorp.com/terraform/language/state) |
| Plan → apply discipline | plan is the review artifact; apply is audited execution; -detailed-exitcode for CI drift checks | [Terraform CLI](https://developer.hashicorp.com/terraform/cli/commands/plan) |
| fmt & validate | `fmt` = canonical style (and a syntax check); `validate` = semantic checks post-init | [fmt](https://developer.hashicorp.com/terraform/cli/commands/fmt) |

## Keep in mind

- **`terraform fmt` in CI ends HCL style debates** — same energy as prettier, zero opinions left to argue.
- **State files contain secrets sometimes** — remote backends with encryption + access control are mandatory past tutorial stage.
- **Variables need descriptions** — six months later YOU are the stranger reading them.
- **Bucket names are GLOBAL**: collisions aren't yours alone; prefix with org/product identifiers.
- This phase validates SYNTAX + STRUCTURE. Real `plan` needs provider downloads + credentials — that's your local stretch lab.

## Self-check quiz

<details><summary>1. What breaks if two engineers <code>apply</code> from laptops with local state?</summary>
Last-writer-wins overwrites: one person's destroy vanishes from state while resources keep running (orphans), or duplicate creation. Remote backend + locking fixes it.</details>

<details><summary>2. Why pin provider versions instead of floating latest?</summary>
Providers change default behaviors/validation. Floating = unreviewable infra diffs on unrelated days. Pin like any dependency.</details>

<details><summary>3. Where does <code>terraform validate</code> sit vs <code>plan</code>?</summary>
validate: offline type/reference checking after init (no API calls). plan: full diff against REAL infrastructure via provider APIs. CI runs both; validate first.</details>

## Assignment

[assignment.md](assignment.md) — author `submission/main.tf`: AWS provider (pinned), region + bucket-name variables with descriptions, an S3 bucket resource using interpolation, a tags map, and an output exporting the bucket name. Graded by textual contracts PLUS real `terraform fmt -check`.
