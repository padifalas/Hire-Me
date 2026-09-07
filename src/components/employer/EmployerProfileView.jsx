import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/authContext";
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
} from "../../services/authService";

import "./EmployerProfileView.css";

import { User as UserIcon, CheckCircle2 } from "lucide-react";

export default function EmployerProfileView({ user }) {
  const { refreshUserProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const result = await getUserProfile(user.id);
      if (result.success) {
        setProfile(result.profile);
        setFullName(result.profile.full_name ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  function handleAvatarSelect(file) {
    setAvatarFile(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      if (avatarFile) {
        const avatarResult = await uploadAvatar(avatarFile, user.id);
        if (!avatarResult.success) throw new Error(avatarResult.error);
      }

      const result = await updateUserProfile(user.id, { fullName });
      if (!result.success) throw new Error(result.error);

      const refreshed = await getUserProfile(user.id);
      if (refreshed.success) setProfile(refreshed.profile);

      await refreshUserProfile(); // updates sidebar name/avatar immediately

      setAvatarFile(null);
      setSaveMessage("Profile saved.");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="epv-loading">Loading your profile...</div>;
  if (!profile)
    return <div className="epv-loading">Couldn't load your profile.</div>;

  const displayedAvatar = avatarPreview || profile.avatar_url;

  return (
    <div className="epv-root">
      <div className="epv-header">
        <h1 className="epv-title">My Profile</h1>
        <p className="epv-subtitle">
          Your personal details, separate from your company profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="epv-card">
        <div className="epv-avatar-row">
          <label className="epv-avatar-dropzone">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
              hidden
            />
            {displayedAvatar ? (
              <img src={displayedAvatar} alt="Profile" />
            ) : (
              <UserIcon size={22} />
            )}
          </label>
          <div>
            <div className="epv-avatar-label">Profile photo</div>
            <div className="epv-avatar-hint">
              Click to upload or replace (PNG, JPG, WEBP, max 2MB)
            </div>
          </div>
        </div>

        <div className="epv-field">
          <label>Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="epv-field">
          <label>Email</label>
          <input value={profile.email ?? ""} disabled />
          <span className="epv-field-hint">
            Email can't be changed here yet.
          </span>
        </div>

        {saveMessage && (
          <p className="epv-save-message">
            <CheckCircle2 size={14} /> {saveMessage}
          </p>
        )}
        {error && <p className="epv-error">{error}</p>}

        <button type="submit" className="epv-save-btn" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
