import { prisma } from "@/lib/prisma";
import ParametresForm from "./ParametresForm";

export default async function AdminParametresPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-stone-900">Paramètres du site</h1>
      <ParametresForm
        initial={{
          siteName: settings?.siteName ?? null,
          headerImageUrl: settings?.headerImageUrl ?? null,
          backgroundImageUrl: settings?.backgroundImageUrl ?? null,
        }}
      />
    </div>
  );
}
