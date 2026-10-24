import { LegalPage } from "@/components/legal_page";
import { ReportForm } from "@/components/report_form";

export default function ReportPage() {
  return (
    <LegalPage title="Report a museum">
      <p>If someone is in immediate danger, contact local emergency services.</p>
      <p>
        Use this form for a museum that shares private photos without permission, or for abusive guestbook notes.
        In this preview the report is copied to your clipboard and is not uploaded.
      </p>
      <ReportForm />
    </LegalPage>
  );
}
