import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();

  if (user?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Admin"
          title="Admin access"
          description="Admin эрхтэй хэрэглэгч энэ хэсгээр нэвтэрч dashboard болон tournament удирдлагад орно."
          badge="Restricted"
        />
        <AdminLoginForm />
      </AnimatedPage>
    </MainLayout>
  );
}
