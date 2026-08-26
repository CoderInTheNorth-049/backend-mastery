import { Pool } from "pg";
import type { LinkProjection, LinkStore, NewLink } from "../../domain/ports";

/**
 * Postgres LinkStore. Matches db/migrations/0001_init.sql.
 *
 * The redirect query selects ONLY the projection columns - the M2 rule "no
 * SELECT * on the hot path" - mirroring what MemLinkStore.findByCode returns,
 * so the two adapters are behaviorally interchangeable.
 */
export class PgLinkStore implements LinkStore {
  constructor(private readonly pool: Pool) {}

  async save(link: NewLink): Promise<void> {
    await this.pool.query(
      `INSERT INTO links (code, target_url, expires_at)
       VALUES ($1, $2, $3)`,
      [link.code, link.targetUrl, link.expiresAt === null ? null : new Date(link.expiresAt)],
    );
  }

  async findByCode(code: string): Promise<LinkProjection | null> {
    const { rows } = await this.pool.query<{
      targetUrl: string;
      expiresAt: Date | null;
      disabledAt: Date | null;
    }>(
      `SELECT target_url AS "targetUrl",
              expires_at AS "expiresAt",
              disabled_at AS "disabledAt"
       FROM links
       WHERE code = $1`,
      [code],
    );
    const row = rows[0];
    if (row === undefined) return null;
    return {
      targetUrl: row.targetUrl,
      expiresAt: row.expiresAt === null ? null : row.expiresAt.getTime(),
      disabledAt: row.disabledAt === null ? null : row.disabledAt.getTime(),
    };
  }

  async setDisabled(code: string, disabledAt: number): Promise<boolean> {
    // Guarded update: idempotent for already-disabled links (rowCount 0).
    const result = await this.pool.query(
      `UPDATE links
       SET disabled_at = $2
       WHERE code = $1 AND disabled_at IS NULL`,
      [code, new Date(disabledAt)],
    );
    return result.rowCount === 1;
  }

  async ping(): Promise<boolean> {
    await this.pool.query("SELECT 1");
    return true;
  }
}
