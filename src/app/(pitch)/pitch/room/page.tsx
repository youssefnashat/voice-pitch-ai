"use client";

import { Suspense } from "react";
import { PitchRoom } from "@/components/PitchRoom";

export default function PitchRoomPage() {
  return (
    <Suspense>
      <PitchRoom />
    </Suspense>
  );
}
