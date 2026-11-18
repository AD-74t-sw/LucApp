"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { type ActionState, Button, FormAlert, IDLE } from "@/shared/ui";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "./actions";

/** What this browser can do with notifications, before asking anything. */
type Support = "unknown" | "supported" | "install-first" | "unsupported" | "denied";

const noSubscription = () => () => {};

function readSupport(): Support {
  const capable =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!capable) {
    // iPhone and iPad only allow notifications for apps added to the home screen.
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const installed = window.matchMedia("(display-mode: standalone)").matches;
    return ios && !installed ? "install-first" : "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "supported";
}

/** The VAPID public key in the binary form `pushManager.subscribe` wants. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function registerWorker() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/**
 * Turns notifications on or off for this device (each phone or browser
 * subscribes on its own). `compact` is the reminder shown in the meals app.
 */
export function PushSettings({
  publicKey,
  compact = false,
}: {
  /** Null when the server has no push keys. */
  publicKey: string | null;
  compact?: boolean;
}) {
  const support = useSyncExternalStore(noSubscription, readSupport, () => "unknown" as const);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [state, setState] = useState<ActionState>(IDLE);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (support !== "supported" || !publicKey) return;
    let active = true;
    registerWorker()
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (active) setSubscribed(subscription !== null);
      })
      .catch(() => {
        if (active) setSubscribed(false);
      });
    return () => {
      active = false;
    };
  }, [support, publicKey]);

  const enable = () =>
    startTransition(async () => {
      if (!publicKey) return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState({
          status: "error",
          message: "No diste permiso para mostrar notificaciones.",
          fieldErrors: {},
        });
        return;
      }
      try {
        const registration = await registerWorker();
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(publicKey),
          }));
        const result = await savePushSubscriptionAction(subscription.toJSON());
        setState(result);
        setSubscribed(result.status === "success");
      } catch {
        setState({
          status: "error",
          message: "No se pudieron activar las notificaciones en este navegador.",
          fieldErrors: {},
        });
      }
    });

  const disable = () =>
    startTransition(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setState({ status: "success", message: "Notificaciones desactivadas en este dispositivo." });
    });

  const test = () => startTransition(async () => setState(await sendTestPushAction()));

  if (compact) {
    // Only a nudge: nothing when they are on, unknown or impossible here.
    if (!publicKey || support !== "supported" || subscribed !== false) return null;
    return (
      <div className="border-accent/30 bg-accent-soft text-accent flex flex-wrap items-center gap-3 rounded-xs border px-4 py-3 text-sm">
        <Bell className="size-4" aria-hidden />
        <span className="flex-1">
          Activa las notificaciones para que te avise cuando toca comer.
        </span>
        <Button size="sm" onClick={enable} disabled={pending}>
          Activar
        </Button>
        {state.status === "error" ? <FormAlert state={state} /> : null}
      </div>
    );
  }

  let description: string;
  if (!publicKey) {
    description =
      "Las notificaciones no están configuradas en el servidor (faltan las claves VAPID).";
  } else if (support === "install-first") {
    description =
      "En iPhone, primero agrega LucApp a la pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí.";
  } else if (support === "unsupported") {
    description = "Este navegador no permite notificaciones.";
  } else if (support === "denied") {
    description =
      "Bloqueaste las notificaciones para LucApp. Habilítalas en los ajustes del navegador o del teléfono.";
  } else if (subscribed) {
    description = "Activadas en este dispositivo: avisos al empezar cada comida y si falta comida.";
  } else {
    description = "Recibe un aviso al empezar cada comida y cuando falta comida en casa.";
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-sm">{description}</p>
      <FormAlert state={state} />
      {publicKey && support === "supported" && subscribed !== null ? (
        <div className="flex flex-wrap gap-2">
          {subscribed ? (
            <>
              <Button size="sm" variant="secondary" onClick={test} disabled={pending}>
                <Send className="size-4" aria-hidden />
                Enviar prueba
              </Button>
              <Button size="sm" variant="ghost" onClick={disable} disabled={pending}>
                <BellOff className="size-4" aria-hidden />
                Desactivar
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={enable} disabled={pending}>
              <Bell className="size-4" aria-hidden />
              Activar notificaciones
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
