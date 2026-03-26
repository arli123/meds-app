const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPushSubscription(supabase, userId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, subscription: subscription.toJSON() },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('Push subscription failed:', err);
  }
}
