import type { Metadata } from "next";
import { ComingSoonDistrict } from "@/components/ComingSoonDistrict";
import { getDistrict } from "@/content/world";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <ComingSoonDistrict
      district={getDistrict("shop")!}
      body="Freedom University gear and printed study guides are on the way. The shop will never sell financial products, signals or advice."
    />
  );
}
