import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage } from "@/components/account/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — Studyowl Study Planner" },
      { name: "description", content: "The terms for using the Studyowl study planner (draft)." },
      { property: "og:title", content: "Terms and Conditions — Studyowl Study Planner" },
      { property: "og:description", content: "The terms for using the Studyowl study planner (draft)." },
    ],
  }),
  component: () => (
    <LegalPage title="Terms and Conditions">
      <p>These terms explain the rules for using Studyowl, a study planner for students. By creating an account you agree to them.</p>
      <h2>1. Your account</h2>
      <ul>
        <li>You need a valid email address and must keep your password private.</li>
        <li>You are responsible for activity on your account.</li>
        <li>If you are under the age required to consent to online services where you live, ask a parent or guardian before signing up.</li>
      </ul>
      <h2>2. What the service does</h2>
      <p>Studyowl helps you organise subjects, topics, tasks, exams and focus sessions, and offers an AI study assistant that makes suggestions from your own data. Suggestions are for guidance only and may sometimes be wrong — always use your own judgement and follow your school's instructions.</p>
      <h2>3. Acceptable use</h2>
      <ul>
        <li>Don't misuse the service, try to access other people's data, or disrupt it.</li>
        <li>Only upload content (such as syllabi or notes) that you have the right to use.</li>
      </ul>
      <h2>4. Your content</h2>
      <p>The study data you add belongs to you. You give us permission to store and process it only to run the service for you.</p>
      <h2>5. Ending your account</h2>
      <p>You can delete your account and all your data at any time from Settings. We may suspend accounts that break these terms.</p>
      <h2>6. No guarantees</h2>
      <p>The service is provided "as is". We work to keep it available and your data safe, but we can't promise it will always be error-free or uninterrupted.</p>
      <h2>7. Changes</h2>
      <p>We may update these terms. If changes are significant we'll let you know in the app, and the "last updated" date above will change.</p>
      <h2>8. Contact</h2>
      <p>Questions? Email <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  ),
});
