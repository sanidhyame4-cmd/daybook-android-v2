import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = !!window.Capacitor?.isNativePlatform?.();
const STORAGE_KEY = 'daybook1';
const ID_BASE = 1_000_000;
const ID_RANGE = 900_000;
let syncQueued = false;
let permissionAskedThisSession = false;

function toast(message) {
  // Use the app's own toast when available; otherwise fall back quietly.
  if (typeof window.toast === 'function') window.toast(message);
  else console.info(`[Daybook] ${message}`);
}

function reminderId(task) {
  const source = String(task.id ?? `${task.date}:${task.t}`);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ID_BASE + ((hash >>> 0) % ID_RANGE);
}

function reminderDate(task) {
  if (!task.date || task.rem == null || task.rem === '') return null;
  const minutes = Number(task.rem);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1439) return null;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const when = new Date(`${task.date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  return Number.isNaN(when.getTime()) ? null : when;
}

async function ensurePermission() {
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted' && !permissionAskedThisSession) {
    permissionAskedThisSession = true;
    permission = await LocalNotifications.requestPermissions();
  }
  return permission.display === 'granted';
}

async function syncReminders() {
  if (!isNative) return;
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return; }
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const now = Date.now();
  const upcoming = tasks.map(task => ({ task, at: reminderDate(task) }))
    .filter(item => item.at && item.at.getTime() > now && item.task.t)
    .sort((a, b) => a.at - b.at)
    .slice(0, 60);

  const pending = await LocalNotifications.getPending();
  const ours = (pending.notifications || []).filter(n => n.id >= ID_BASE && n.id < ID_BASE + ID_RANGE);
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
  if (!upcoming.length) return;
  if (!(await ensurePermission())) {
    toast('Allow notifications in Android settings to receive Daybook reminders');
    return;
  }

  const notifications = upcoming.map(({ task, at }) => ({
    id: reminderId(task),
    title: 'Daybook reminder',
    body: String(task.t).slice(0, 180),
    schedule: { at, allowWhileIdle: true },
    extra: { taskId: String(task.id ?? ''), taskDate: String(task.date ?? '') },
  }));
  await LocalNotifications.schedule({ notifications });
}

function queueReminderSync() {
  if (!isNative || syncQueued) return;
  syncQueued = true;
  queueMicrotask(async () => {
    syncQueued = false;
    try { await syncReminders(); }
    catch (error) { console.warn('[Daybook] Reminder sync failed', error); }
  });
}

async function exportBackup(text, filename) {
  if (!isNative) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  const saved = await Filesystem.writeFile({
    path: filename,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({
    title: 'Daybook backup',
    text: 'Daybook JSON backup. Save it somewhere safe so you can restore it later.',
    url: saved.uri,
    dialogTitle: 'Save or share Daybook backup',
  });
}

window.DaybookNative = { exportBackup, syncReminders };

if (isNative) {
  // Intercept the exact storage key used by the uploaded HTML. Every existing
  // save path (task edits, completion, imports, settings) then refreshes alarms.
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    const result = originalSetItem.call(this, key, value);
    if (key === STORAGE_KEY) queueReminderSync();
    return result;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') queueReminderSync();
  });
  window.addEventListener('pageshow', queueReminderSync);
  // Let the original script finish its initial render before inspecting data.
  queueMicrotask(queueReminderSync);
}
