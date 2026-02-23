import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LeaderboardPageClient from "./LeaderboardPageClient";

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  return <LeaderboardPageClient currentUserName={session?.user?.name} />;
}
