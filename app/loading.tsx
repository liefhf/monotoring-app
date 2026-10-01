import Loader from "@/components/Loader";

/* Beim Seitenwechsel: Ladebalken in der Mitte, bis die Seite da ist */
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <Loader />
    </div>
  );
}
