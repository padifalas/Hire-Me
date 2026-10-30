import LegalLayout from "./LegalLayout";
import { LEGAL } from "../../config/legalConfig";

const sections = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {LEGAL.appName} is a career-matching platform that connects South
          African students and graduates with employers. It was built as{" "}
          {LEGAL.projectContext}, and isn’t a commercial service.{" "}
          {LEGAL.operator} is the “responsible party” for your personal
          information under the Protection of Personal Information Act 4 of
          2013 (POPIA).
        </p>
        <p>
          Our Information Officer is {LEGAL.informationOfficer}. You can reach
          us at <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <h3>Everyone</h3>
        <ul>
          <li>Name, email address, password (stored hashed by our authentication provider) and whether you signed up as a student or an employer.</li>
          <li>Technical data such as IP address, browser type and error logs, used to keep the service secure and working.</li>
        </ul>
        <h3>Students and graduates</h3>
        <ul>
          <li>Education, skills, work experience, career preferences and any other details you add to your profile.</li>
          <li>Your CV file and the text and skills we extract from it.</li>
          <li>Your applications, their status and any feedback an employer sends back.</li>
        </ul>
        <h3>Employers</h3>
        <ul>
          <li>Company details, your role, and the job postings you publish.</li>
          <li>Your decisions on applicants (for example interview or reject) and feedback you write.</li>
        </ul>
        <p>
          Please don’t upload sensitive details you don’t want shared, such as
          ID numbers, health information or a photo, unless a vacancy asks for
          them. Your CV is shared with employers you apply to.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use your information",
    body: (
      <ul>
        <li>To create and run your account.</li>
        <li>To read your CV, extract your skills and compare them with job requirements.</li>
        <li>To show students and employers relevant matches and send service notifications.</li>
        <li>To let employers review applicants and give feedback.</li>
        <li>To protect the platform against fraud, abuse and security incidents.</li>
        <li>To meet legal obligations and improve the service using aggregated, non-identifying statistics.</li>
      </ul>
    ),
  },
  {
    id: "ai-matching",
    title: "AI skill extraction and match scores",
    body: (
      <>
        <p>
          We use AI to read CVs and job descriptions and to calculate a match
          score. To do this, the text of your CV or job posting is sent to our
          AI providers (currently Google Gemini, with Anthropic’s Claude as a
          fallback) for processing.
        </p>
        <ul>
          <li>Match scores are a guide. They don’t decide whether someone is hired, and employers make every hiring decision.</li>
          <li>AI can make mistakes. If an extracted skill or score looks wrong, you can correct your profile or contact us and ask for a person to review it.</li>
          <li>We don’t use your CV to train our own models, and we configure our providers so they don’t use your data to train theirs where that option is available.</li>
        </ul>
      </>
    ),
  },
  {
    id: "who-sees-it",
    title: "Who can see your information",
    body: (
      <>
        <ul>
          <li><strong>Employers</strong> can see the profile and CV of students who apply to their jobs, and any other profile details we tell you are visible when you add them.</li>
          <li><strong>Students</strong> can see employer company details and job postings.</li>
          <li><strong>Service providers (operators)</strong> process data on our behalf: Supabase (database, authentication, file storage), Google and Anthropic (AI processing), and {LEGAL.webHost} (website hosting).</li>
          <li><strong>Authorities</strong> when the law requires it.</li>
        </ul>
        <p>We don’t sell your personal information.</p>
      </>
    ),
  },
  {
    id: "lawful-basis",
    title: "Why we’re allowed to use it",
    body: (
      <p>
        We process your information because you consent when you create an
        account and upload a CV, because we need it to provide the service you
        asked for, because the law requires it, or because it serves a
        legitimate interest such as keeping the platform secure. You can
        withdraw consent at any time, though that may stop us providing parts
        of the service.
      </p>
    ),
  },
  {
    id: "transfers",
    title: "Transfers outside South Africa",
    body: (
      <p>
        Our database is hosted in {LEGAL.hostingRegion}, and our AI providers
        process data on servers outside South Africa. We only use providers
        that are bound by agreements or laws giving your information a level of
        protection comparable to POPIA.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <p>
          We keep your information while your account is active. To have your
          profile, CV and applications deleted, email us and we’ll remove them
          within 30 days.
        </p>
        <p>
          Because {LEGAL.appName} is a university project, we may also delete
          or anonymise all user data when the project ends.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        We use role-based access controls so students and employers only see
        what they’re meant to, encrypted connections, hashed passwords and
        restricted access to our systems. No system is perfectly secure. If a
        breach puts your information at risk, we’ll notify you and the
        Information Regulator as POPIA requires.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Under POPIA you can:</p>
        <ul>
          <li>ask what personal information we hold about you and get a copy;</li>
          <li>ask us to correct or delete it;</li>
          <li>object to us processing it, or withdraw your consent;</li>
          <li>ask for human review of a decision based only on automated processing;</li>
          <li>complain to the Information Regulator.</li>
        </ul>
        <p>
          Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>{" "}
          and we’ll respond within 30 days. The Information Regulator can be
          reached at{" "}
          <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">
            inforegulator.org.za
          </a>.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Age requirement",
    body: (
      <p>
        {LEGAL.appName} is for people aged 18 and over. If you’re under 18,
        don’t create an account. If we learn we hold a child’s information
        without a parent or guardian’s consent, we’ll delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We’ll update the date at the top when this policy changes and tell you
        in the app if the change is significant.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="This policy explains what personal information HireMe collects, why, who sees it, and how you stay in control of it."
      sections={sections}
    />
  );
}
