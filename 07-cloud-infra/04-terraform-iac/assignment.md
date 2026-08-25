# Assignment — First HCL stack (parse-checked by the real binary)

## The problem you're solving
Infrastructure code earns trust the same way app code does: it parses, it's formatted canonically, and it's reviewed. You'll write your first Terraform — provider, variables, an S3 bucket, an output — and the spec runs the REAL terraform binary's `fmt -check` against your file. Syntax errors fail exactly like compile errors.

## Your tasks
Install once: `bash scripts/install-terraform.sh`. Then author [submission/main.tf](submission/main.tf):

1. `terraform` block: `required_version >= 1.5` and `required_providers` pinning aws `~> 5.0`.
2. `provider "aws"` with `region = var.aws_region`.
3. Variable `aws_region`: description + default `"us-east-1"`.
4. Variable `bucket_name`: description PLUS a validation block rejecting names shorter than 3 characters.
5. `resource "aws_s3_bucket" "app"` with `bucket = var.bucket_name` and a tags map containing Environment + ManagedBy="terraform".
6. `output "bucket_name"` exposing `aws_s3_bucket.app.id` with a description.

## Definition of done
- [ ] Textual contract specs green (regex per requirement above)
- [ ] REAL `terraform fmt -check` exits clean on your file — and a guard test proves fmt genuinely rejects broken HCL so the pass can't be vacuous

## Hints (open only when stuck)

<details><summary>Variable validation</summary>
Nested <code>validation { condition = length(var.bucket_name) >= 3 error_message = "…" }</code> inside the variable block.</details>

<details><summary>fmt quirks</summary>
Two-space indent, aligned '=' inside blocks, LF endings. Run <code>terraform fmt -diff submission/</code> to SEE complaints.</details>

## Going further (optional)
Add lifecycle prevent_destroy and argue when it hurts; split into variables/main/outputs files keeping fmt clean.

## Hints

<details><summary>Variable validation</summary>
<code>validation { condition = length(var.bucket_name) >= 3 error_message = "…" }</code> nested INSIDE the variable block.
</details>

<details><summary>fmt quirks</summary>
fmt normalizes indentation (2 spaces), aligns '=' inside blocks, requires LF endings. Run <code>terraform fmt -diff submission/</code> locally to SEE its complaints.
</details>

## Acceptance criteria

- [ ] Textual contracts green
- [ ] `terraform fmt -check` exits 0 against your file
- [ ] Bonus: `terraform init && terraform validate` in your scratch copy (needs network for provider download)

## Stretch

- Add `lifecycle { prevent_destroy = true }` to the bucket and explain when that hurts
- Split into variables.tf / main.tf / outputs.tf and keep fmt clean across all three
