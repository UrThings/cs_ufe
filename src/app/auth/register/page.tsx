import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeading } from "@/components/layout/PageHeading";
import { AnimatedPage } from "@/components/motion/AnimatedPage";
import { AuthCardForm } from "@/features/auth/ui/AuthCardForm";

export default function RegisterPage() {
  return (
    <MainLayout>
      <AnimatedPage>
        <PageHeading
          eyebrow="Authentication"
          title="Create your esports workspace"
          description="Нэр, Gmail, утас, оюутны кодоо оруулаад бүртгүүлж team урсгал руу орно."
          badge="Captain Ready"
        />
        <AuthCardForm mode="register" />
      </AnimatedPage>
    </MainLayout>
  );
}
