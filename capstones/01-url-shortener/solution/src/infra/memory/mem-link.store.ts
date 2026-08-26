import type {
  ClickDrain,
  ClickEvent,
  ClickQueue,
  LinkProjection,
  LinkStore,
  NewLink,
} from "../../domain/ports";

interface StoredLink extends LinkProjection {
  code: string;
}

/**
 * Default LinkStore: a Map, nothing else. Tests and `pnpm start` without env
 * vars run on this; PgLinkStore is a drop-in swap behind DATABASE_URL.
 */
export class MemLinkStore implements LinkStore {
  private readonly byCode = new Map<string, StoredLink>();

  async save(link: NewLink): Promise<void> {
    // Overwrite is allowed; the create path pre-probes uniqueness and pg's
    // unique constraint covers the cross-process race.
    this.byCode.set(link.code, {
      code: link.code,
      targetUrl: link.targetUrl,
      expiresAt: link.expiresAt,
      disabledAt: null,
    });
  }

  /** Returns a fresh projection object per call - never the stored instance. */
  async findByCode(code: string): Promise<LinkProjection | null> {
    const link = this.byCode.get(code);
    if (!link) return null;
    return { targetUrl: link.targetUrl, expiresAt: link.expiresAt, disabledAt: link.disabledAt };
  }

  async setDisabled(code: string, disabledAt: number): Promise<boolean> {
    const link = this.byCode.get(code);
    if (!link || link.disabledAt !== null) return false;
    link.disabledAt = disabledAt;
    return true;
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
