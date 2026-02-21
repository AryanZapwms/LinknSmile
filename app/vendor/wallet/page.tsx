// app/vendor/wallet/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import WalletDashboardClient from "./WalletDashboardClient";

export default async function VendorWalletPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "shop_owner") {
    redirect("/auth/login");
  }
  return <WalletDashboardClient />;
}