import { appIcon } from "./app-icon";

/** Home screen icon for iPhone and iPad ("Agregar a pantalla de inicio"). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(size.width);
}
