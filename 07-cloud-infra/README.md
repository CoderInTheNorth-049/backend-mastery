# Phase 07 — Cloud & infrastructure (~5 weeks)

**Outcome:** ship like a platform team: containerized apps with lean multi-stage images, K8s manifests that pass real structural review, AWS SDK code tested without cloud costs, HCL that parses and validates, and deploy strategies that never sleep users.

## Beginner-friendly picks

- 🎥 [Fireship — Docker/K8s 100-seconders](https://www.youtube.com/@Fireship) — orientation before each topic
- 🧪 [Play with Docker](https://labs.play-with-docker.com/) & [Killercoda K8s scenarios](https://killercoda.com/killercoda) — FREE browser labs, no installs

## How this phase verifies (sandbox-friendly by design)

| Topic | Grading mechanism |
|---|---|
| [01-docker-foundations](01-docker-foundations/) | Dockerfile + compose **structure contracts** (like phase-04's workflow grader) |
| [02-kubernetes-basics](02-kubernetes-basics/) | Deployment/Service manifests graded via YAML structure (probes, resources, selectors) |
| [03-aws-localstack](03-aws-localstack/) | SDK code unit-tested with **aws-sdk-client-mock** — fully offline; LocalStack lab is a documented stretch |
| [04-terraform-iac](04-terraform-iac/) | Real `terraform fmt -check` against your HCL (binary via installer script) + textual contracts |
| [05-zero-downtime-deploys](05-zero-downtime-deploys/) | Written rollout plan + strategy decisions |

No Docker needed anywhere for grading. Where a live stack adds value (LocalStack, kind), stretch labs are marked clearly.

## Topics

| Folder | Est. | You produce |
|---|---|---|
| [01-docker-foundations](01-docker-foundations/) | 4 days | Multi-stage Dockerfile + compose stack, layer-cache-aware |
| [02-kubernetes-basics](02-kubernetes-basics/) | 5 days | Deployment + Service manifests with probes & resource budgets |
| [03-aws-localstack](03-aws-localstack/) | 4 days | S3 document store + SQS sender behind typed clients (mock-tested) |
| [04-terraform-iac](04-terraform-iac/) | 3 days | First HCL: provider, variables, S3 bucket, output — `fmt`-clean |
| [05-zero-downtime-deploys](05-zero-downtime-deploys/) | 3 days | Expand→migrate→contract rollout plan + strategy picks |

Parallel track: **[Flagship 1](../flagships/webhook-delivery-platform/project-brief.md)** gets its AWS-mode note this phase ([M7 guide](../flagships/webhook-delivery-platform/milestones/M7-aws-mode.md)).

## Anchor free resources

- [Docker — best practices](https://docs.docker.com/build/building/best-practices/) · [compose spec](https://compose-spec.io/)
- [Kubernetes docs](https://kubernetes.io/docs/home/) · [kind](https://kind.sigs.k8s.io/)
- [AWS SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) · [LocalStack docs](https://docs.localstack.cloud/) · [aws-sdk-client-mock](https://aws-sdk-client-mock.readthedocs.io/)
- [Terraform tutorials](https://developer.hashicorp.com/terraform/tutorials) · [ Twelve-Factor App](https://12factor.net/)

## Done means

- [ ] All four coded topics green (`pnpm test:solutions` proves keys)
- [ ] Your Dockerfile would survive a senior's review comment-by-comment
- [ ] You can explain expand→migrate→contract to a backend AND a PM
- [ ] Flagship #1 M7 notes merged
