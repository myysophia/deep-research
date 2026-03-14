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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/Internal/Button";
import AuthPageFrame from "@/components/Auth/AuthPageFrame";

function ForgotPasswordForm() {
  const { t } = useTranslation();
  const formSchema = z.object({
    email: z.string().email(t("auth.validation.email")),
  });
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const supabase = getSupabaseBrowserClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        router.replace("/");
        return;
      }
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [router, supabase.auth]);

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true);
    setFormError("");

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      const message = t("auth.feedback.resetEmailFailed");
      setFormError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    toast.success(t("auth.feedback.resetEmailSent"));
    setSubmitting(false);
  }

  return (
    <AuthPageFrame
      badge={t("auth.forgot.badge")}
      title={t("auth.forgot.title")}
      description={t("auth.forgot.description")}
      footer={<Link href="/login" className="underline underline-offset-4">{t("auth.actions.backLogin")}</Link>}
    >
      {!ready ? (
        <div className="space-y-3">
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
          <div className="h-11 animate-pulse rounded-xl bg-stone-100 dark:bg-slate-900" />
        </div>
      ) : submitted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {t("auth.feedback.resetEmailSentHint")}
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
            {formError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {formError}
              </div>
            ) : null}
            <Button className="h-11 w-full rounded-xl" disabled={submitting} type="submit">
              {submitting ? t("auth.actions.sending") : t("auth.actions.sendReset")}
            </Button>
          </form>
        </Form>
      )}
    </AuthPageFrame>
  );
}

export default ForgotPasswordForm;
