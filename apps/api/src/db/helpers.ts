import { customType } from "drizzle-orm/pg-core";

export const timestamptz = customType<{ data: Date; driverData: string }>({
  dataType() {
    return "timestamptz";
  },
  fromDriver(value: string): Date {
    return new Date(value);
  },
  toDriver(value: Date): string {
    return value.toISOString();
  },
});
