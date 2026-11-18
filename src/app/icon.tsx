import { appIcon } from "./app-icon";

/** Browser tab icon (32) and the icons listed in the web manifest (Android, desktop installs). */
export function generateImageMetadata() {
  return [32, 192, 512].map((px) => ({
    id: String(px),
    size: { width: px, height: px },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  return appIcon(Number(await id));
}
