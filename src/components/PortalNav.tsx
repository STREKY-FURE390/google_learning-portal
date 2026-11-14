import React from 'react';
import { Compass, Home, Layers, LogOut, User } from 'lucide-react';
import { PortalPageId } from '../data/portalData';

interface PortalNavProps {
  activePage: PortalPageId;
  onSelectPage: (page: PortalPageId) => void;
  onExitDemo: () => void;
}

const NAV_ITEMS: { id: PortalPageId; label: string; mobileLabel: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', mobileLabel: 'Home', Icon: Home },
  { id: 'learning-path', label: 'Learning Path', mobileLabel: 'Path', Icon: Compass },
  { id: 'courses', label: 'Courses', mobileLabel: 'Courses', Icon: Layers },
  { id: 'profile', label: 'Profile', mobileLabel: 'Profile', Icon: User },
];

export function PortalNav({ activePage, onSelectPage, onExitDemo }: PortalNavProps) {
  return (
    <>
      {/* Persistent Fixed 3-Zone Top Navigation Bar (Gold & White Luxury Frosted Glass) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#FCFBF8]/92 backdrop-blur-xl border-b border-[#E6D7B3]/85 text-[#1B1710] shadow-[0_6px_24px_-16px_rgba(120,86,18,0.18)] transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-8">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              onSelectPage('home');
            }}
            className="font-display text-lg font-extrabold tracking-tight text-[#1B1710] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] rounded"
          >
            DevPath <span className="text-[#9E7016]">Studio</span>
          </a>

          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectPage(item.id);
                  }}
                  className={`py-1.5 text-sm border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] rounded-xs ${
                    isActive
                      ? 'border-[#C89B3C] text-[#1B1710] font-semibold'
                      : 'border-transparent text-[#6A5F4B] hover:text-[#1B1710] font-medium'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onExitDemo}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_-6px_rgba(120,86,18,0.2)] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
            >
              <LogOut className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
              <span>Exit demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile iPhone-Style Persistent Fixed Bottom Tab Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FCFBF8]/95 backdrop-blur-xl border-t border-[#E6D7B3]/90 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(120,86,18,0.18)]"
      >
        <div className="grid grid-cols-4 items-center h-13">
          {NAV_ITEMS.map(({ id, mobileLabel, Icon }) => {
            const isActive = activePage === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectPage(id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                  isActive ? 'text-[#9E7016]' : 'text-[#6A5F4B] hover:text-[#1B1710]'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                  {mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
