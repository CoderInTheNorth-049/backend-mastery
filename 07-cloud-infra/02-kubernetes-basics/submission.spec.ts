import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { load as loadYaml } from "js-yaml";
import { readFileSync } from "node:fs";

const DIR =
  process.env.SOLUTION_MODE === "1"
    ? join(__dirname, "solution")
    : join(__dirname, "submission");

function readYaml(file: string): Record<string, any> {
  return loadYaml(readFileSync(join(DIR, file), "utf8")) as Record<string, any>;
}

describe("deployment.yml contract", () => {
  const doc = readYaml("deployment.yml");

  it("K1: apps/v1 Deployment", () => {
    expect(doc.apiVersion).toBe("apps/v1");
    expect(doc.kind).toBe("Deployment");
  });

  it("K2: at least two replicas", () => {
    expect(doc.spec?.replicas).toBeGreaterThanOrEqual(2);
  });

  it("K3: selector matches template labels exactly on app=api", () => {
    const selector = doc.spec?.selector?.matchLabels;
    const labels = doc.spec?.template?.metadata?.labels;
    expect(selector).toEqual({ app: "api" });
    expect(labels).toMatchObject({ app: "api" });
  });

  it("K4/K5: single api container, pinned tag, port 3000", () => {
    const containers = doc.spec?.template?.spec?.containers ?? [];
    expect(containers).toHaveLength(1);

    const c = containers[0];
    expect(c.name).toBe("api");
    expect(String(c.image)).toMatch(/^registry\.example\.com\/api:\d+\.\d+\.\d+$/);
    expect(c.image).not.toContain("latest");
    expect(c.ports?.[0]?.containerPort).toBe(3000);
  });

  it("K6: resources budgeted — requests cpu+memory, memory limit present", () => {
    const r = doc.spec.template.spec.containers[0].resources;
    expect(r.requests?.cpu).toBeTruthy();
    expect(r.requests?.memory).toBeTruthy();
    expect(r.limits?.memory).toBeTruthy();
  });

  it("K7/K8: liveness /healthz and readiness /readyz over httpGet :3000", () => {
    const c = doc.spec.template.spec.containers[0];
    expect(c.livenessProbe?.httpGet).toMatchObject({ path: "/healthz", port: 3000 });
    expect(c.readinessProbe?.httpGet).toMatchObject({ path: "/readyz", port: 3000 });
  });

  it("K9: conservative rolling update (maxSurge 1 / maxUnavailable 0)", () => {
    const ru = doc.spec.strategy?.rollingUpdate;
    expect(ru?.maxSurge).toBe(1);
    expect(ru?.maxUnavailable).toBe(0);
  });
});

describe("service.yml contract", () => {
  const svc = readYaml("service.yml");

  it("S1: ClusterIP Service", () => {
    expect(svc.kind).toBe("Service");
    expect(svc.spec?.type ?? "ClusterIP").toBe("ClusterIP");
  });

  it("S2/S3: selects app=api; port 80 → targetPort 3000", () => {
    expect(svc.spec?.selector).toEqual({ app: "api" });
    const port = svc.spec?.ports?.[0];
    expect(port.port).toBe(80);
    expect(port.targetPort).toBe(3000);
  });

  it("cross-file consistency: service selector matches deployment labels", () => {
    const dep = readYaml("deployment.yml");
    const labels = dep.spec.template.metadata.labels;
    expect(svc.spec.selector).toEqual(labels);
  });
});
