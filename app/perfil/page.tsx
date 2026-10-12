"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";
import { uploadAvatar } from "@/lib/uploadAvatar";
import { UserAvatar } from "@/app/components/UserAvatar";

type Notice = { type: "success" | "error"; text: string } | null;

export default function PerfilPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useUser();
  const fileInput = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [sexo, setSexo] = useState("");
  const [fecha, setFecha] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNombre(profile.full_name ?? "");
    setSexo(profile.sexo ?? "");
    setFecha(profile.fecha_nacimiento ?? "");
  }, [profile]);

  const cancelarCambios = () => {
    setNombre(profile?.full_name ?? "");
    setSexo(profile?.sexo ?? "");
    setFecha(profile?.fecha_nacimiento ?? "");
    setProfileNotice(null);
  };

  const passwordScore = [
    newPassword.length >= 12,
    /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
    /\d/.test(newPassword),
    /[^A-Za-z0-9]/.test(newPassword),
  ].filter(Boolean).length;
  const passwordLevel = !newPassword ? "" : passwordScore <= 1 ? "Débil" : passwordScore <= 3 ? "Media" : "Fuerte";

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!user || !file) return;
    setProfileNotice(null);
    if (!file.type.startsWith("image/")) {
      setProfileNotice({ type: "error", text: "Seleccioná una imagen válida." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileNotice({ type: "error", text: "La imagen no puede superar los 5 MB." });
      return;
    }
    try {
      setUploading(true);
      const publicUrl = await uploadAvatar(file, user.id);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setProfileNotice({ type: "success", text: "Foto de perfil actualizada." });
    } catch (error) {
      setProfileNotice({ type: "error", text: error instanceof Error ? error.message : "No pudimos actualizar la foto." });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setProfileNotice(null);
    if (!nombre.trim()) {
      setProfileNotice({ type: "error", text: "Ingresá tu nombre completo." });
      return;
    }
    if (!sexo) {
      setProfileNotice({ type: "error", text: "Seleccioná una opción en el campo sexo." });
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from("profiles").update({
        full_name: nombre.trim(), sexo, fecha_nacimiento: fecha || null,
      }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      setProfileNotice({ type: "success", text: "Tus datos se guardaron correctamente." });
      router.refresh();
    } catch (error) {
      setProfileNotice({ type: "error", text: error instanceof Error ? error.message : "No pudimos guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };

  const cambiarPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordNotice(null);
    if (!user?.email) {
      setPasswordNotice({ type: "error", text: "No encontramos el correo de tu sesión. Volvé a iniciar sesión." });
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice({ type: "error", text: "Completá los tres campos de contraseña." });
      return;
    }
    if (newPassword.length < 12) {
      setPasswordNotice({ type: "error", text: "La nueva contraseña debe tener al menos 12 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "error", text: "La confirmación no coincide con la nueva contraseña." });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordNotice({ type: "error", text: "La nueva contraseña debe ser diferente de la actual." });
      return;
    }
    setChangingPassword(true);
    try {
      // Cliente aislado: verificar la contraseña anterior sin reemplazar la sesión principal del CRM.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Falta configurar las variables públicas de Supabase.");
      }
      const verifier = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { error: verificationError } = await verifier.auth.signInWithPassword({
        email: user.email, password: currentPassword,
      });
      if (verificationError) {
        setPasswordNotice({ type: "error", text: "La contraseña actual no es correcta." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice({ type: "success", text: "Contraseña actualizada correctamente." });
    } catch (error) {
      setPasswordNotice({ type: "error", text: error instanceof Error ? error.message : "No pudimos actualizar tu contraseña." });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <main className="perfil-page">
      <div className="perfil-wrap">
        <header className="page-heading">
          <div><button type="button" className="back-button" onClick={() => router.back()} aria-label="Volver a la pantalla anterior"><span aria-hidden="true">←</span> Volver</button><div><span className="eyebrow">MI CUENTA</span><h1>Mi perfil</h1><p>Administrá tus datos personales y la seguridad de tu cuenta.</p></div></div>
          <span className="account-pill"><span className="status-dot" /> Cuenta activa</span>
        </header>

        <section className="identity-card" aria-label="Resumen de la cuenta">
          <div className="avatar-frame"><UserAvatar name={profile?.full_name ?? user?.email ?? undefined} avatarUrl={profile?.avatar_url ?? undefined} size={76} /></div>
          <div className="identity-copy"><h2>{profile?.full_name || user?.email || "Mi cuenta"}</h2><p>{user?.email ?? ""}</p><span className="role-pill">{profile?.role ?? "Usuario"}</span></div>
          <div className="avatar-action"><input ref={fileInput} id="avatar-file" type="file" accept="image/*" onChange={handleUpload} disabled={uploading || !user} className="sr-only" /><label htmlFor="avatar-file" className={`secondary-button ${uploading || !user ? "is-disabled" : ""}`}>{uploading ? "Subiendo foto..." : "Cambiar foto"}</label><small>JPG, PNG o WebP · Máx. 5 MB</small></div>
        </section>
        {profileNotice && <div role="status" className={`notice ${profileNotice.type}`}>{profileNotice.text}</div>}

        <div className="content-grid">
          <section className="panel" aria-labelledby="personal-title">
            <div className="panel-heading"><div className="section-icon">01</div><div><h2 id="personal-title">Información personal</h2><p>Mantené actualizados tus datos de perfil.</p></div></div>
            <form onSubmit={guardar} className="panel-form">
              <div className="field"><label htmlFor="profile-name">Nombre completo <span>*</span></label><input id="profile-name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ingresá tu nombre completo" autoComplete="name" required /></div>
              <div className="field"><label htmlFor="profile-email">Correo electrónico</label><input id="profile-email" value={user?.email ?? ""} readOnly disabled /><small>El correo de acceso no se modifica desde esta pantalla.</small></div>
              <div className="field-row"><div className="field"><label htmlFor="profile-sex">Sexo <span>*</span></label><select id="profile-sex" value={sexo} onChange={(e) => setSexo(e.target.value)} required><option value="">Seleccionar</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Prefiero no comentarlo">Prefiero no comentarlo</option></select></div><div className="field"><label htmlFor="profile-birth">Fecha de nacimiento</label><input id="profile-birth" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} max={new Date().toISOString().slice(0, 10)} /></div></div>
              <div className="form-footer"><button className="secondary-button cancel-button" type="button" onClick={cancelarCambios} disabled={saving}>Cancelar</button><button className="primary-button" type="submit" disabled={saving || !user}>{saving ? "Guardando..." : "Guardar cambios"}</button></div>
            </form>
          </section>

          <section className="panel" aria-labelledby="security-title">
            <div className="panel-heading"><div className="section-icon lock-icon">02</div><div><h2 id="security-title">Seguridad de la cuenta</h2><p>Cambiá tu contraseña de acceso a EAYA.</p></div></div>
            <form onSubmit={cambiarPassword} className="panel-form">
              <div className="field"><label htmlFor="current-password">Contraseña actual <span>*</span></label><input id="current-password" type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Ingresá tu contraseña actual" autoComplete="current-password" required /></div>
              <div className="field"><label htmlFor="new-password">Nueva contraseña <span>*</span></label><input id="new-password" type={showPasswords ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 12 caracteres" autoComplete="new-password" minLength={12} required /><small>Usá una contraseña única de al menos 12 caracteres.</small>{newPassword && <div className="strength-wrap" aria-live="polite"><div className="strength-track" role="meter" aria-label="Fortaleza de la contraseña" aria-valuemin={0} aria-valuemax={4} aria-valuenow={passwordScore}><span className={`strength-fill strength-${passwordScore}`} style={{ width: `${Math.max(passwordScore, 1) * 25}%` }} /></div><small>Fortaleza: {passwordLevel}</small></div>}</div>
              <div className="field"><label htmlFor="confirm-password">Confirmar nueva contraseña <span>*</span></label><input id="confirm-password" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetí tu nueva contraseña" autoComplete="new-password" required /></div>
              <label className="show-password"><input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} /> Mostrar contraseñas</label>
              {passwordNotice && <div role="status" className={`notice ${passwordNotice.type}`}>{passwordNotice.text}</div>}
              <div className="form-footer"><button className="primary-button" type="submit" disabled={changingPassword || !user}>{changingPassword ? "Actualizando..." : "Actualizar contraseña"}</button></div>
            </form>
          </section>
        </div>
      </div>
      <style jsx>{`
        .back-button{border:0;background:transparent;color:#5353d6;font:inherit;font-size:13px;font-weight:750;padding:0;display:inline-flex;align-items:center;gap:8px;cursor:pointer;margin:0 0 16px}.back-button span{font-size:21px;line-height:1}.back-button:hover{text-decoration:underline}.perfil-page{min-height:100%;background:#f6f8fc;padding:36px 24px 64px;color:#17233d;font-family:inherit}.perfil-wrap{max-width:1120px;margin:0 auto}.page-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:26px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.13em;color:#6366f1}.page-heading h1{font-size:clamp(27px,3vw,36px);letter-spacing:-.04em;margin:6px 0 7px;font-weight:800}.page-heading p,.panel-heading p{color:#718096;margin:0;font-size:14px;line-height:1.6}.account-pill{display:inline-flex;align-items:center;gap:8px;background:#eaf8f0;color:#167347;border:1px solid #cdeedb;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:700;white-space:nowrap}.status-dot{width:7px;height:7px;border-radius:50%;background:#25a56a}.identity-card{background:linear-gradient(115deg,#fff 0%,#f7f8ff 100%);border:1px solid #e6eaf2;border-radius:20px;padding:24px 28px;display:flex;align-items:center;gap:20px;box-shadow:0 6px 24px rgba(26,43,77,.035);margin-bottom:22px}.avatar-frame{flex-shrink:0;border-radius:50%;padding:4px;background:white;box-shadow:0 0 0 1px #e8eaf2}.identity-copy{flex:1;min-width:0}.identity-copy h2{font-size:20px;letter-spacing:-.025em;margin:0 0 5px;overflow-wrap:anywhere}.identity-copy p{font-size:13px;color:#718096;margin:0 0 10px;overflow-wrap:anywhere}.role-pill{display:inline-flex;padding:5px 10px;background:#eef0ff;border-radius:7px;color:#5358ba;text-transform:capitalize;font-size:11px;font-weight:800}.avatar-action{display:flex;align-items:flex-end;flex-direction:column;gap:9px}.avatar-action small,.field small{color:#8a95a8;font-size:11px;line-height:1.5}.secondary-button{display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border-radius:10px;border:1px solid #d9deea;background:white;font-weight:700;font-size:12px;color:#34415b;cursor:pointer;transition:.2s}.secondary-button:hover{border-color:#858bf4;color:#4f46e5}.secondary-button.is-disabled{opacity:.55;cursor:not-allowed}.content-grid{display:grid;grid-template-columns:1fr 1fr;align-items:stretch;gap:22px}.panel{display:flex;flex-direction:column;background:white;border:1px solid #e6eaf2;border-radius:20px;padding:27px;box-shadow:0 6px 24px rgba(26,43,77,.035);min-width:0}.panel-heading{display:flex;align-items:flex-start;gap:13px;padding-bottom:22px;margin-bottom:23px;border-bottom:1px solid #edf0f5}.section-icon{width:36px;height:36px;flex-shrink:0;display:grid;place-items:center;border-radius:10px;background:#eef0ff;color:#5556b8;font-weight:800;font-size:12px}.lock-icon{background:#eaf7f2;color:#23805c}.panel-heading h2{font-size:17px;letter-spacing:-.02em;margin:0 0 5px}.panel-form{display:flex;flex:1;flex-direction:column;gap:19px}.field{display:flex;flex-direction:column;gap:8px;min-width:0}.field label{font-size:12px;font-weight:750;color:#34415b}.field label span{color:#e26d73}.field input,.field select{width:100%;box-sizing:border-box;min-width:0;border:1px solid #dce2ec;border-radius:10px;background:white;color:#26344c;font-family:inherit;font-size:14px;padding:12px 13px;min-height:46px;outline:none;transition:border-color .2s,box-shadow .2s}.field input:focus,.field select:focus{border-color:#7778e9;box-shadow:0 0 0 3px rgba(99,102,241,.11)}.field input:disabled{background:#f5f7fa;color:#8290a3;cursor:not-allowed}.field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.show-password{display:flex;align-items:center;gap:9px;color:#56647b;font-size:12px;cursor:pointer}.show-password input{accent-color:#5955d9;width:15px;height:15px}.form-footer{padding-top:20px;margin-top:auto;gap:10px;border-top:1px solid #edf0f5;display:flex;justify-content:flex-end}.cancel-button{min-height:44px}.strength-wrap{display:flex;flex-direction:column;gap:6px;margin-top:2px}.strength-track{height:6px;border-radius:999px;background:#edf0f5;overflow:hidden}.strength-fill{height:100%;display:block;border-radius:999px;transition:width .2s}.strength-1{background:#e56b70}.strength-2{background:#e7a34b}.strength-3{background:#d4b445}.strength-4{background:#2aa879}.primary-button{background:#5353d6;border:1px solid #5353d6;color:#fff;border-radius:10px;padding:12px 20px;min-height:44px;font-family:inherit;font-size:13px;font-weight:750;cursor:pointer;transition:background .2s,transform .2s}.primary-button:hover:not(:disabled){background:#4343bc;transform:translateY(-1px)}.primary-button:disabled{opacity:.55;cursor:not-allowed}.notice{border-radius:10px;padding:12px 14px;font-size:12px;line-height:1.5;margin-bottom:16px;overflow-wrap:anywhere}.panel-form .notice{margin-bottom:0}.notice.success{background:#eaf8f0;color:#176342;border:1px solid #cbead8}.notice.error{background:#fff0f0;color:#a33139;border:1px solid #f6d4d7}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        @media(max-width:850px){.content-grid{grid-template-columns:1fr}.perfil-wrap{max-width:650px}.perfil-page{padding:26px 18px 48px}}@media(max-width:520px){.perfil-page{padding:22px 12px 40px}.page-heading{align-items:flex-start}.account-pill{font-size:0;padding:9px}.status-dot{width:9px;height:9px}.identity-card{padding:20px;flex-wrap:wrap;gap:14px}.identity-copy h2{font-size:17px}.avatar-action{width:100%;align-items:stretch}.avatar-action .secondary-button{width:100%;box-sizing:border-box}.avatar-action small{text-align:center}.panel{padding:20px 17px;border-radius:16px}.field-row{grid-template-columns:1fr}.form-footer .primary-button,.form-footer .cancel-button{flex:1;padding-left:10px;padding-right:10px}.page-heading p{max-width:260px}}
      `}</style>
    </main>
  );
}
