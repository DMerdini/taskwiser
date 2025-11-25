'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Switch } from './ui/switch';
import { Label } from './ui/label';

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-5 w-5" />
      <Switch
        id="dark-mode"
        checked={theme === 'dark'}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        aria-label="Toggle dark mode"
      />
      <Moon className="h-5 w-5" />
      <Label htmlFor="dark-mode" className="sr-only">
        Dark Mode
      </Label>
    </div>
  );
}
