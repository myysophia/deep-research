"use client";

import { useTranslation } from "react-i18next";
import AuthenticatedAppShell from "@/components/Internal/AuthenticatedAppShell";
import RevisionWorkspace from "@/components/Revision/Workspace";

function RevisePage() {
  const { t } = useTranslation();

  return (
    <AuthenticatedAppShell
      title={t("revise.workspace.title", { defaultValue: "AI论文修改" })}
      description={t("revise.workspace.description", {
        defaultValue: "按批注解析审阅意见，自动修订安全项，并输出干净稿与修改说明。",
      })}
    >
      <RevisionWorkspace />
    </AuthenticatedAppShell>
  );
}

export default RevisePage;
