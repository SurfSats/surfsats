import { permanentRedirect } from "next/navigation";

export default function JukeboxPage() {
  permanentRedirect("/music?tab=jukebox");
}
