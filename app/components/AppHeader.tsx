import Link from "next/link";
import ProfileMenu from "./ProfileMenu";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-emerald-500">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold text-white">
          CircleSave
        </Link>

        <ProfileMenu />
      </div>
    </header>
  );
}
