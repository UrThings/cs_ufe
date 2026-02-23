import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { AuthCardForm } from "@/features/auth/ui/AuthCardForm";

export default function LoginPage() {
  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Authentication"
          title="Log in to your command deck"
          description="Access team controls, tournament brackets, and admin workflows from a single secure session."
          badge="JWT + Cookies"
        />
        <AuthCardForm mode="login" />
      </AnimatedPage>
    </MainLayout>
  );
}
