"use client";
import { Heart } from "lucide-react";
import { useFavouritesStore } from "@/hooks/useFavourites";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  type: "product" | "seller";
  refId: string;
  className?: string;
}

export default function FavouriteButton({ type, refId, className }: Props) {
  const { toggle, isFavourite } = useFavouritesStore();
  const { data: session } = useSession();
  const router = useRouter();
  const faved = isFavourite(type, refId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) return router.push("/auth/login");
    toggle(type, refId);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "rounded-full p-1.5 transition-colors",
        faved ? "text-red-500" : "text-stone-400 hover:text-red-400",
        className
      )}
      aria-label={faved ? "Remove from favourites" : "Add to favourites"}
    >
      <Heart className={cn("h-4 w-4", faved && "fill-current")} />
    </button>
  );
}
