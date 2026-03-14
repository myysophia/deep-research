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

function RegisterForm() {
  const { t } = useTranslation();
  const formSchema = z
    .object({
      email: z.string().email(t("auth.validation.email")),
      password: z.string().min(6, t("auth.validation.passwordMin")),
      confirmPassword: z.string().min(6, t("auth.validation.confirmPasswordRequired")),
      acceptTerms: z.boolean().refine((value) => value, {
        message: t("auth.validation.acceptTerms"),
      }),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.validation.passwordMismatch"),
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
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
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

    return () => {
      active = false;
    };
  }, [nextPath, router, supabase.auth]);

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    setFormError("");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = getAuthErrorMessage(
        t("auth.feedback.registerFailed"),
        payload?.error?.message,
      );
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const message = getAuthErrorMessage(
        t("auth.feedback.invalidCredentials"),
        error.message,
      );
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    toast.success(t("auth.feedback.registerSuccess"));
    router.replace(nextPath);
  }

  return (
    <AuthPageFrame
      badge={t("auth.register.badge")}
      title={t("auth.register.title")}
      description={t("auth.register.description")}
      footer={<Link href="/login" className="underline underline-offset-4">{t("auth.actions.haveAccount")}</Link>}
    >
      {!ready ? (
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
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
                  <FormLabel>{t("auth.fields.password")}</FormLabel>
                  <FormControl>
                    <Password autoComplete="new-password" type="text" placeholder={t("auth.placeholders.newPassword")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.fields.confirmPassword")}</FormLabel>
                  <FormControl>
                    <Password autoComplete="new-password" type="text" placeholder={t("auth.placeholders.confirmPassword")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3 text-sm text-stone-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <input
                      checked={field.value}
                      className="mt-1 h-4 w-4 rounded border-stone-300"
                      onChange={(event) => field.onChange(event.target.checked)}
                      type="checkbox"
                    />
                    <span>{t("auth.register.acceptTerms")}</span>
                  </label>
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
              {submitting ? t("auth.actions.creating") : t("auth.actions.createAccount")}
            </Button>
          </form>
        </Form>
      )}
    </AuthPageFrame>
  );
}

export default RegisterForm;
