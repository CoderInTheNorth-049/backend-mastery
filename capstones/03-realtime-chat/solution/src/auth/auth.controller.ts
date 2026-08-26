import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { TokenService } from "./token.service";

const MAX_USER_ID_LENGTH = 128;

@Controller("auth")
export class AuthController {
  constructor(private readonly tokens: TokenService) {}

  /**
   * Dev-friendly identity mint: any userId gets a signed token. Real auth
   * (OIDC etc.) would replace this controller; the gateway only ever trusts
   * the HMAC signature, so swapping issuers touches nothing else.
   */
  @Post("token")
  @HttpCode(HttpStatus.OK)
  issue(@Body() body: unknown): { token: string } {
    const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>).userId : undefined;
    const userId = typeof raw === "string" ? raw.trim() : "";
    if (!userId || userId.length > MAX_USER_ID_LENGTH) {
      throw new BadRequestException(`userId must be a string of 1..${MAX_USER_ID_LENGTH} characters`);
    }
    return { token: this.tokens.issue(userId) };
  }
}
