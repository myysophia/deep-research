"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/libs/supabase/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/Internal/Button";
import { Password } from "@/components/Internal/PasswordInput";
import AuthPageFrame from "@/components/Auth/AuthPageFrame";
import { getAuthErrorMessage, resolveNextPath } from "@/components/Auth/shared";

function LoginForm() {
  const { t } = useTranslation();
  const formSchema = z.object({
    email: z.string().email(t("auth.validation.email")),
    password: z.string().min(6, t("auth.validation.passwordMin")),
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [formError, setFormError] = useState("");
  const supabase = getSupabaseBrowserClient();
  const nextPath = useMemo(
    () => resolveNextPath(searchParams.get("next")),
    [searchParams],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: searchParams.get("email") || "",
      password: "",
    },
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        router.replace(nextPath);
        return;
      }
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(nextPath);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [nextPath, router, supabase.auth]);

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    setFormError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const message = getAuthErrorMessage(t("auth.feedback.invalidCredentials"), error.message);
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    toast.success(t("auth.feedback.loginSuccess"));
    router.replace(nextPath);
  }

  return (
    <AuthPageFrame
      badge={t("auth.login.badge")}
      title={t("auth.login.title")}
      description={t("auth.login.description")}
      footer={<Link href="/register" className="underline underline-offset-4">{t("auth.actions.createAccount")}</Link>}
    >
      {!ready ? (
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
        </div>
      ) : (
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.fields.email")}</FormLabel>
                  <FormControl>
                    <Input autoComplete="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("auth.fields.password")}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-stone-500 underline underline-offset-4 dark:text-slate-400"
                    >
                      {t("auth.actions.forgotPassword")}
                    </Link>
                  </div>
                  <FormControl>
                    <Password autoComplete="current-password" type="text" placeholder={t("auth.placeholders.password")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {formError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {formError}
              </div>
            ) : null}
            <Button className="h-11 w-full rounded-xl" disabled={submitting} type="submit">
              {submitting ? t("auth.actions.loggingIn") : t("auth.actions.login")}
            </Button>
          </form>
        </Form>
      )}
    </AuthPageFrame>
  );
}

export default LoginForm;
