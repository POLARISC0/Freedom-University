import { DISTRICTS } from "@/content/world";
import { WorldExperience } from "@/components/world/WorldExperience";
import { WorldStatic } from "@/components/world/WorldStatic";
import { HEADMASTERS, MENTORS } from "@/lib/agents/registry";

// Where the two Headmasters float above the districts in the 3D world.
const HEADMASTER_SPACE: Record<string, { x: number; y: number; z: number }> = {
  halo: { x: -3.5, y: 7.8, z: -6 },
  kite: { x: 4.5, y: 8.6, z: -8 },
};

export default function HomePage() {
  const gatekeepers = Object.fromEntries(MENTORS.map((m) => [m.districtId, `${m.name}, ${m.role}`]));
  const headmasters = HEADMASTERS.map((h, i) => ({
    id: h.id,
    name: h.name,
    title: h.title,
    color: h.color,
    space: HEADMASTER_SPACE[h.id] ?? { x: i * 6 - 3, y: 8, z: -3 },
  }));
  return (
    <div className="full-bleed -mt-8 -mb-8">
      <WorldExperience districts={DISTRICTS} headmasters={headmasters} gatekeepers={gatekeepers}>
        <WorldStatic />
      </WorldExperience>
    </div>
  );
}
