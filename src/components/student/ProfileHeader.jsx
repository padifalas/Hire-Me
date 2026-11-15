import {
  Camera,
  GraduationCap,
  MapPin,
  Globe,
  User as UserIcon,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

import "./ProfileHeader.css";

// so can allow "github.com/me" as well as "https://github.com/me"
function toUrl(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function LinkButton({ href, icon: Icon, label }) {
  const url = toUrl(href);
  if (!url) return null;
  return (
    <a
      className="ph-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Icon size={14} aria-hidden="true" />
      {label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default function ProfileHeader({
  avatarUrl,
  preview,
  fullName,
  degree,
  university,
  graduationYear,
  location,
  linkedinUrl,
  githubUrl,
  portfolioUrl,
  onSelectAvatar,
  saving,
}) {
  const photo = preview || avatarUrl;
  const subtitle = [degree, university].filter(Boolean).join(" at ");
  const hasLinks = linkedinUrl || githubUrl || portfolioUrl;

  return (
    <header className="ph-card">
      <label className="ph-avatar">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => onSelectAvatar(e.target.files?.[0] ?? null)}
        />
        <span className="ph-avatar__frame">
          {photo ? (
            <img src={photo} alt="" />
          ) : (
            <UserIcon size={30} aria-hidden="true" />
          )}
        </span>
        <span className="ph-avatar__badge" aria-hidden="true">
          <Camera size={13} />
        </span>
        <span className="sr-only">Change profile photo</span>
      </label>

      <div className="ph-main">
        <h2 className="ph-name">{fullName || "Your name"}</h2>
        <p className="ph-sub">
          {subtitle || "Add your qualification and university below"}
        </p>

        <ul className="ph-meta">
          {location && (
            <li>
              <MapPin size={14} aria-hidden="true" />
              {location}
            </li>
          )}
          {graduationYear && (
            <li>
              <GraduationCap size={14} aria-hidden="true" />
              Graduating {graduationYear}
            </li>
          )}
        </ul>

        {hasLinks && (
          <div className="ph-links">
            <LinkButton href={linkedinUrl} icon={FaLinkedin} label="LinkedIn" />
          <LinkButton href={githubUrl} icon={FaGithub} label="GitHub" />
<LinkButton href={portfolioUrl} icon={Globe} label="Portfolio" />
          </div>
        )}

        <p className="ph-hint" role="status">
          {saving
            ? "Uploading photo..."
            : "Select your photo to change it. PNG, JPG or WebP, up to 2 MB."}
        </p>
      </div>
    </header>
  );
}
