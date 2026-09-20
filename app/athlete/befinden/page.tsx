import { redirect } from "next/navigation";

/*
 * Der taegliche Check-in wird vollstaendig
 * ueber /athlete/check-in erfasst.
 *
 * Diese Seite gab es frueher zusaetzlich und
 * hat in dieselbe Tabelle geschrieben. Damit
 * bestehende Links und Lesezeichen weiter
 * funktionieren, bleibt sie erhalten und
 * leitet nur noch weiter.
 */
export default function BefindenPage() {
  redirect("/athlete/check-in");
}
