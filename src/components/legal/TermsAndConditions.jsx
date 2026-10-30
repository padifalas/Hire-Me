import LegalLayout from "./LegalLayout";
import { LEGAL } from "../../config/legalConfig";

const sections = [
  {
    id: "acceptance",
    title: "Accepting these terms",
    body: (
      <p>
        By creating an account or using {LEGAL.appName}, you agree to these
        terms and to our <a href="/privacy">Privacy Policy</a> and{" "}
        <a href="/cookies">Cookie Policy</a>. If you don’t agree, don’t use the
        service.
      </p>
    ),
  },
  {
    id: "project-status",
    title: "About the platform",
    body: (
      <p>
        {LEGAL.appName} is {LEGAL.projectContext}. It isn’t a commercial
        service and the vacancies and employers on it may be test data. Some
        features may change, be unavailable or contain errors, and we provide
        the platform “as is” to the extent the law allows.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use it",
    body: (
      <p>
        You must be 18 or older and legally able to enter a contract. Employers
        must be authorised to act for the business they register.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>Give accurate information and keep it up to date.</li>
        <li>Keep your password private. You’re responsible for activity on your account.</li>
        <li>One person per account, and one account per person.</li>
        <li>Tell us straight away if you think someone else has accessed your account.</li>
      </ul>
    ),
  },
  {
    id: "students",
    title: "Students and graduates",
    body: (
      <ul>
        <li>Only upload a CV and qualifications that are truthful and yours.</li>
        <li>You allow us to process your CV and profile to extract skills, calculate match scores and share them with employers you apply to.</li>
        <li>Applying to a job doesn’t guarantee an interview or an offer.</li>
      </ul>
    ),
  },
  {
    id: "employers",
    title: "Employers",
    body: (
      <ul>
        <li>Post only real vacancies that you’re entitled to fill, with accurate descriptions.</li>
        <li>Don’t charge applicants a fee, or ask for money, at any stage.</li>
        <li>Follow South African employment and equality law, including the Employment Equity Act. Don’t discriminate unfairly.</li>
        <li>Use applicant information only to assess and communicate about the job they applied for. Don’t sell it, scrape it or share it with others.</li>
        <li>Make hiring decisions yourself. Don’t rely on a match score alone.</li>
      </ul>
    ),
  },
  {
    id: "ai",
    title: "AI features",
    body: (
      <p>
        Skill extraction and match scores are generated automatically and can
        be wrong or incomplete. They’re there to help you, not to replace your
        judgement. We don’t promise any score reflects a person’s real ability
        or suitability for a role.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "What you can’t do",
    body: (
      <ul>
        <li>Post false, misleading, defamatory, or unlawful content.</li>
        <li>Harass, discriminate against or impersonate anyone.</li>
        <li>Upload malware, or try to break, probe or overload the service.</li>
        <li>Access data that isn’t yours, or bypass access controls.</li>
        <li>Scrape the platform or use it to build a competing database.</li>
      </ul>
    ),
  },
  {
    id: "content",
    title: "Your content and our rights",
    body: (
      <p>
        You keep ownership of what you upload. You give us a limited licence to
        store, process and display it as needed to run {LEGAL.appName} for you.
        The platform itself, including its design, code and branding, belongs to{" "}
        {LEGAL.operator} or its licensors.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third parties",
    body: (
      <p>
        We aren’t a party to any employment relationship formed through the
        platform and we don’t verify every employer or student. Check an
        opportunity yourself before you share sensitive details or accept an
        offer.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability",
    body: (
      <p>
        We try to keep {LEGAL.appName} running, but we don’t promise it will
        always be available or error-free. We may change or remove features at
        any time.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Ending your account",
    body: (
      <p>
        You can delete your account at any time. We can suspend or close an
        account that breaks these terms or puts others at risk. Sections that
        by their nature should continue (such as liability and governing law)
        survive termination.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <p>
        To the extent the law allows, {LEGAL.operator} and the University of
        the Witwatersrand aren’t liable for indirect or consequential loss,
        lost opportunities, or decisions made by employers or students using
        the platform. Nothing in these terms
        limits rights you have under the Consumer Protection Act 68 of 2008 or
        any liability that can’t lawfully be excluded.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the Republic of South Africa,
        and the South African courts have jurisdiction over any dispute.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        We may update these terms. If you keep using {LEGAL.appName} after a
        change takes effect, you accept the new version. Questions? Email{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    ),
  },
];

export default function TermsAndConditions() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      intro="These terms set out the rules for using HireMe as a student, graduate or employer."
      sections={sections}
    />
  );
}
