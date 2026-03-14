"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/Internal/Button";
import { Password } from "@/components/Internal/PasswordInput";
import AuthPageFrame from "@/components/Auth/AuthPageFrame";
import { getAuthErrorMessage } from "@/components/Auth/shared";

function ResetPasswordForm() {
  const { t } = useTranslation();
  const formSchema = z
    .object({
      password: z.string().min(6, t("auth.validation.passwordMin")),
      confirmPassword: z.string().min(6, t("auth.validation.confirmPasswordRequired")),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.validation.passwordMismatch"),
    });
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [formError, setFormError] = useState("");
  const supabase = getSupabaseBrowserClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCheckingSession(false);
      if (!data.session) {
        setInvalidLink(true);
      }
    });

    return () => {
      active = false;
    };
  }, [supabase.auth]);

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    setFormError("");

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      const message = getAuthErrorMessage(t("auth.feedback.resetFailed"), error.message);
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    toast.success(t("auth.feedback.resetSuccess"));
    router.replace("/login");
  }

  return (
    <AuthPageFrame
      badge={t("auth.reset.badge")}
      title={t("auth.reset.title")}
      description={t("auth.reset.description")}
      footer={<Link href="/login" className="underline underline-offset-4">{t("auth.actions.backLogin")}</Link>}
    >
      {checkingSession ? (
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
        </div>
      ) : invalidLink ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          {t("auth.feedback.invalidLink")}
        </div>
      ) : (
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.fields.newPassword")}</FormLabel>
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
            {formError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {formError}
              </div>
            ) : null}
            <Button className="h-11 w-full rounded-xl" disabled={submitting} type="submit">
              {submitting ? t("auth.actions.updating") : t("auth.actions.updatePassword")}
            </Button>
          </form>
        </Form>
      )}
    </AuthPageFrame>
  );
}

export default ResetPasswordForm;
