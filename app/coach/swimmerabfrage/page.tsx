import { redirect } from "next/navigation";

/*
 * Frueher eine eigene Liste. Seit der Zusammenfuehrung gibt es
 * nur noch EINE Athletenliste - alte Links fuehren dorthin.
 */
export default function Page() {
  redirect("/coach/schwimmer");
}
