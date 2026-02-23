"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { TeamCodeHint } from "@/features/auth/ui/TeamCodeHint";

type AuthCardFormProps = {
  mode: "login" | "register";
};

type AuthFormValues = {
  name: string;
  phone: string;
  studentCode: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type AuthResponse = {
  message?: string;
  data?: {
    user?: {
      role?: "MEMBER" | "ADMIN";
    };
  };
};

export function AuthCardForm({ mode }: AuthCardFormProps) {
  const isLogin = mode === "login";
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      studentCode: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!isLogin && values.password !== values.confirmPassword) {
      setError("confirmPassword", { type: "validate", message: "Passwords do not match." });
      return;
    }

    setApiError(null);
    setSuccessMessage(null);

    const payload = isLogin
      ? { email: values.email, password: values.password }
      : {
          name: values.name,
          phone: values.phone,
          studentCode: values.studentCode,
          email: values.email,
          password: values.password,
        };

    try {
      const response = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as AuthResponse;

      if (!response.ok) {
        setApiError(result.message ?? "Request failed.");
        return;
      }

      setSuccessMessage(result.message ?? `${isLogin ? "Logged in" : "Account created"}.`);
      const nextPath = result.data?.user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
      router.push(nextPath);
    } catch {
      setApiError("Unable to reach the server. Try again shortly.");
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mx-auto w-full max-w-md"
    >
      <Card className="neon-border border-amber-500/60 bg-[#070406]/60">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-300/80">
            {isLogin ? "Welcome Back" : "Create Account"}
          </p>
          <CardTitle>{isLogin ? "Sign in to your hub" : "Join the arena"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            {apiError ? <p className="text-sm text-amber-200">{apiError}</p> : null}
            {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}
            {!isLogin ? (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  {...register("name", {
                    required: "Name is required.",
                    minLength: { value: 2, message: "Name must be at least 2 characters." },
                  })}
                  placeholder="Enter your name"
                  autoComplete="name"
                />
                {errors.name ? <p className="text-xs text-amber-200">{errors.name.message}</p> : null}
              </div>
            ) : null}
            {!isLogin ? (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register("phone", {
                    required: "Phone number is required.",
                    pattern: {
                      value: /^[0-9]{8,15}$/,
                      message: "Phone number must be 8-15 digits.",
                    },
                  })}
                  placeholder="99112233"
                  autoComplete="tel"
                />
                {errors.phone ? <p className="text-xs text-amber-200">{errors.phone.message}</p> : null}
              </div>
            ) : null}
            {!isLogin ? (
              <div className="space-y-2">
                <Label htmlFor="studentCode">Student code</Label>
                <Input
                  id="studentCode"
                  {...register("studentCode", {
                    required: "Student code is required.",
                    minLength: {
                      value: 3,
                      message: "Student code must be at least 3 characters.",
                    },
                    maxLength: {
                      value: 32,
                      message: "Student code must be 32 characters or fewer.",
                    },
                  })}
                  placeholder="UFE12345"
                  autoComplete="off"
                />
                {errors.studentCode ? (
                  <p className="text-xs text-amber-200">{errors.studentCode.message}</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                {...register("email", {
                  required: "Email is required.",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Provide a valid email address.",
                  },
                })}
                type="email"
                placeholder="you@esports.gg"
                autoComplete="email"
              />
              {errors.email ? <p className="text-xs text-amber-200">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                {...register("password", {
                  required: "Password is required.",
                  minLength: { value: 8, message: "Password must be at least 8 characters." },
                })}
                type="password"
                placeholder="********"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              {errors.password ? (
                <p className="text-xs text-amber-200">{errors.password.message}</p>
              ) : null}
            </div>
            {!isLogin ? (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  {...register("confirmPassword", {
                    required: "Confirm your password.",
                  })}
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                />
                {errors.confirmPassword ? (
                  <p className="text-xs text-amber-200">{errors.confirmPassword.message}</p>
                ) : null}
              </div>
            ) : null}
            <Button className="mt-2 w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
            <p className="text-center text-sm text-zinc-400">
              {isLogin ? "Need an account?" : "Already have an account?"}{" "}
              <Link
                href={isLogin ? "/auth/register" : "/auth/login"}
                className="font-medium text-zinc-300 hover:text-zinc-200"
              >
                {isLogin ? "Register" : "Log in"}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

