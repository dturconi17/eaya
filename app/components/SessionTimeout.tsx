"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/app/context/UserContext";
import SessionTimeoutModal from "@/app/components/SessionTimeoutModal";
import {
  SESSION_TIMEOUT,
  SESSION_WARNING,
} from "@/lib/config";

const STORAGE_KEY = "crm_session_activity";

export default function SessionTimeout() {

  const { user, loading } = useUser();

  const expiresAt = useRef(0);
  const showModalRef = useRef(false);
  const logoutRunning = useRef(false);
  const lastWrite = useRef(0);

  const [showModal, setShowModal] = useState(false);
  const [seconds, setSeconds] = useState(
    Math.floor(SESSION_WARNING / 1000)
  );

  useEffect(() => {
    showModalRef.current = showModal;
  }, [showModal]);

  useEffect(() => {
    if (!user) {
      expiresAt.current = 0;
      setShowModal(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const logout = async () => {
    if (logoutRunning.current) return;

    logoutRunning.current = true;

    try {
      localStorage.removeItem(STORAGE_KEY);

      await supabase.auth.signOut();

      
    } finally {
      logoutRunning.current = false;
    }
  };

  const renewSession = () => {
    const now = Date.now();

    // evita escribir cientos de veces por segundo
    if (now - lastWrite.current < 1000) return;

    lastWrite.current = now;

    expiresAt.current = now + SESSION_TIMEOUT;

    localStorage.setItem(
      STORAGE_KEY,
      expiresAt.current.toString()
    );
  };

  useEffect(() => {
    if (loading || !user) return;

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      expiresAt.current = Number(saved);
    } else {
      renewSession();
    }

    const activity = () => {
      if (!showModalRef.current) {
        renewSession();
      }
    };

    const storage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY &&
        e.newValue
      ) {
        expiresAt.current = Number(e.newValue);
      }
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "click",
    ];

    events.forEach((e) =>
      window.addEventListener(e, activity, {
        passive: true,
      })
    );

    window.addEventListener("storage", storage);

    return () => {
      events.forEach((e) =>
        window.removeEventListener(e, activity)
      );

      window.removeEventListener(
        "storage",
        storage
      );
    };
  }, [loading, user]);

  useEffect(() => {
    if (loading || !user) return;

    const timer = window.setInterval(() => {
      const remaining =
        expiresAt.current - Date.now();

      if (
        remaining <= SESSION_WARNING &&
        remaining > 0
      ) {
        if (!showModalRef.current) {
          setShowModal(true);
        }

        setSeconds(Math.ceil(remaining / 1000));
      }

      if (remaining <= 0) {
        logout();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading, user]);

const continueWorking = () => {
  renewSession();
  setShowModal(false);
};

  if (!showModal) return null;

  return (
    <SessionTimeoutModal
      seconds={seconds}
      onContinue={continueWorking}
      onLogout={logout}
    />
  );
}