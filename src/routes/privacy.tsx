import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage } from "@/components/account/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Studyowl Study Planner" },
      { name: "description", content: "What data the Studyowl study planner collects and how it is used (draft)." },
      { property: "og:title", content: "Privacy Policy — Studyowl Study Planner" },
      { property: "og:description", content: "What data the Studyowl study planner collects and how it is used (draft)." },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy">
      <p>This policy explains what information Studyowl collects, why, and the choices you have.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your first name, optional last name, email address and an encrypted password.</li>
        <li><strong>Study data you add:</strong> subjects, topics, tasks, weekly objectives, exams and scores, and focus sessions (subject, length and date).</li>
        <li><strong>Preferences:</strong> theme, timezone, Pomodoro lengths, daily focus goal, and when you accepted these terms.</li>
        <li><strong>Assistant chats and uploads:</strong> messages you send the AI assistant and files you upload for bulk add are sent to our AI provider to generate a reply. Chat history is kept on your device.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run the planner and sync your data across your devices.</li>
        <li>To give you statistics, streaks and AI study suggestions based only on your own data.</li>
        <li>To send account emails such as sign-up confirmation and password resets.</li>
      </ul>
      <h2>How it is stored</h2>
      <p>Your data is stored in our cloud database. Access rules make each student's records readable and editable only by their own signed-in account.</p>
      <h2>What we don't do</h2>
      <ul>
        <li>We do not sell your personal data.</li>
        <li>We do not show your study data to other users.</li>
      </ul>
      <h2>Your rights</h2>
      <ul>
        <li>View and edit your data in the app at any time.</li>
        <li>Delete your account and all of its data from Settings → "Delete account and all data". This is permanent.</li>
        <li>Contact us to ask about the data we hold about you.</li>
      </ul>
      <h2>Contact</h2>
      <p>Email <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  ),
});
