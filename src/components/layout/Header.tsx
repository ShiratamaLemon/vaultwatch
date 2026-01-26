'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Menu, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Projects', href: '/projects' },
  { name: 'Register', href: '/register' },
  { name: 'Dashboard', href: '/dashboard' },
];

export const Header = () => {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 text-xl font-bold"
              onClick={closeMobileMenu}
            >
              <Shield className="h-8 w-8 text-emerald-500" />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                VaultWatch
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const requiresAuth = item.href === '/dashboard' || item.href === '/register';
              
              if (requiresAuth && !isConnected) {
                return null;
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-emerald-400',
                    isActive
                      ? 'text-emerald-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Desktop Connect Button */}
          <div className="hidden md:flex md:items-center">
            <ConnectButton
              accountStatus="address"
              chainStatus="icon"
              showBalance={false}
            />
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const requiresAuth = item.href === '/dashboard' || item.href === '/register';
                
                if (requiresAuth && !isConnected) {
                  return null;
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'block rounded-md px-3 py-2 text-base font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={closeMobileMenu}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="px-3 py-2">
                <ConnectButton
                  accountStatus="address"
                  chainStatus="icon"
                  showBalance={false}
                />
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
