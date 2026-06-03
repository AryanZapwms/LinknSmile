// components/promo-bar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Promo {
  _id: string;
  title: string;
  message: string;
  link?: string;
  linkText?: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  priority: number;
}

export function PromoBar() {
  const [promo, setPromo] = useState<Promo | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPromo = async () => {
      try {
        const res = await fetch("/api/promos?active=true");
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setPromo(data[0]); // Get the highest priority active promo
          }
        }
      } catch (error) {
        console.error("Error fetching promo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromo();
  }, []);

  if (isLoading || !promo || !isVisible) {
    return null;
  }

  return (
    <div
      className="relative px-4 py-3 text-center transition-all duration-300"
      style={{
        backgroundColor: promo.backgroundColor,
        color: promo.textColor,
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4">
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold md:text-base">{promo.title}</p>
          <p className="text-sm md:text-base">{promo.message}</p>
          {promo.link && promo.linkText && (
            <Link
              href={promo.link}
              className="mt-1 inline-block font-medium underline hover:no-underline"
              style={{ color: promo.textColor }}
            >
              {promo.linkText}
            </Link>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 p-0 hover:bg-black/10"
          style={{ color: promo.textColor }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
