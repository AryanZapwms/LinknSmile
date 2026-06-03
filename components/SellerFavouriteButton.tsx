"use client";
import FavouriteButton from "@/components/FavouriteButton";

export default function SellerFavouriteButton({ shopId }: { shopId: string }) {
  return <FavouriteButton type="seller" refId={shopId} />;
}
