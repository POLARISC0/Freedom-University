import type { Metadata } from "next";
import { ComingSoonDistrict } from "@/components/ComingSoonDistrict";
import { getDistrict } from "@/content/world";

export const metadata: Metadata = { title: "Community Square" };

export default function SquarePage() {
  return (
    <ComingSoonDistrict
      district={getDistrict("square")!}
      body="The square is where students will hang out between lessons, swap notes and watch the floor together. It isn't open yet. Until then, every mentor's office is open on the map."
    />
  );
}
