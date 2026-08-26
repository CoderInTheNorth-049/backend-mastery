import { Module } from "@nestjs/common";
import { PaymentsContext } from "./payments.context";

@Module({
  providers: [PaymentsContext],
  exports: [PaymentsContext],
})
export class PaymentsModule {}
