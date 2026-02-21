'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Package, ShoppingCart, 
  DollarSign, Star, Settings, Menu, LogOut,
  Store, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // 1️⃣ Hooks always declared first
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  // 2️⃣ Fetch shop approval status
  useEffect(() => {
    const checkStatus = async () => {
      if (!session) return;

      try {
        const res = await fetch('/api/vendor/status');
        const data = await res.json();
        if (data.success) setIsApproved(data.isApproved);
      } catch (error) {
        console.error('Failed to check shop status:', error);
      }
    };
    checkStatus();
  }, [session]);

  // 3️⃣ Handle redirect safely after hooks
  useEffect(() => {
    if (status !== 'loading' && (!session || session.user.role !== 'shop_owner')) {
      router.push('/auth/login');
    }
  }, [status, session, router]);

  // 4️⃣ Render loading state
  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Navigation items, filtered by approval
  const navigation = [
    { name: 'Dashboard', href: '/vendor', icon: LayoutDashboard },
    { name: 'Products', href: '/vendor/products', icon: Package, requiresApproval: true },
    { name: 'Orders', href: '/vendor/orders', icon: ShoppingCart, requiresApproval: true },
    { name: 'Earnings', href: '/vendor/payouts', icon: DollarSign, requiresApproval: true },
    { name: 'Reviews', href: '/vendor/reviews', icon: Star, requiresApproval: true },
    { name: 'Settings', href: '/vendor/settings', icon: Settings },
  ].filter(item => !item.requiresApproval || isApproved);

  const isActive = (path: string) => (path === '/vendor' ? pathname === path : pathname.startsWith(path));

  const Sidebar = () => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-16 lg:px-6">
        <Link href="/vendor" className="flex items-center gap-2 font-semibold">
          <Store className="h-6 w-6" />
          <span className="text-lg">Vendor Panel</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 py-4 text-sm font-medium lg:px-4 gap-1">
          {navigation.map(item => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary hover:bg-muted'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar />
      </div>

      <div className="flex flex-col">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-16 lg:px-6">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold md:hidden">Vendor Dashboard</h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() || 'V'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/vendor/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <Store className="mr-2 h-4 w-4" />
                    View Storefront
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}