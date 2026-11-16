import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPushPublicKey, subscribePush, unsubscribePush } from "@/lib/push.functions";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function toBytes(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

/** Active les alertes push sur le téléphone de l'élève. */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const fetchKey = useServerFn(getPushPublicKey);
  const subscribe = useServerFn(subscribePush);
  const unsubscribe = useServerFn(unsubscribePush);

  useEffect(() => {
    void (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function enable() {
    try {
      const key = await fetchKey();
      if (!key) throw new Error("Alertes indisponibles pour le moment.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(key) });
      const json = sub.toJSON();
      await subscribe({ data: { endpoint: sub.endpoint, p256dh: json.keys!["p256dh"]!, auth: json.keys!["auth"]! } });
      setState("on");
      toast.success("Alertes activées sur ce téléphone");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'activer les alertes");
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await unsubscribe({ data: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "loading" || state === "unsupported") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
      {state === "ios-install" ? (
        <p className="text-xs text-muted-foreground">
          📱 iPhone : touche <b>Partager</b> puis <b>Sur l'écran d'accueil</b>, ouvre EPS Progress depuis l'icône pour activer les alertes.
        </p>
      ) : state === "denied" ? (
        <p className="text-xs text-muted-foreground">Alertes bloquées : autorise-les dans les réglages du téléphone.</p>
      ) : state === "on" ? (
        <>
          <p className="text-xs text-primary">🔔 Alertes actives sur ce téléphone</p>
          <Button variant="ghost" size="sm" onClick={() => void disable()}><BellOff className="size-4" /> Désactiver</Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Reçois chaque nouveauté sur ton téléphone.</p>
          <Button size="sm" onClick={() => void enable()}><BellRing className="size-4" /> Activer les alertes</Button>
        </>
      )}
    </div>
  );
}
