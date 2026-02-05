import Image from "next/image";
import Link from "next/link";
import { Zap } from "lucide-react";

export function PadelHero() {
  return (
    <Link href="/bookings/new">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#008080] via-[#008080] to-[#00A3A3] p-5 text-white shadow-[0_10px_20px_rgba(0,128,128,0.15)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_12px_24px_rgba(0,128,128,0.2)]">
        <div className="flex items-center justify-between">
          <div className="z-10 space-y-1">
            <h3 className="text-xl font-bold">Book a Game</h3>
            <p className="text-sm text-white/70">Set up a new session and invite your crew</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-padel-lime px-4 py-2 text-sm font-semibold text-padel-charcoal">
              <Zap className="h-4 w-4" />
              Quick Book
            </div>
          </div>
          <div className="relative">
            <Image
              src="/padel-hero.png"
              alt="Padel racket and court"
              width={120}
              height={120}
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
