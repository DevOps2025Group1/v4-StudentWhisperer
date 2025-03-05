import { ThemeToggle } from "./theme-toggle";
import React from "react";

interface HeaderProps {
  children?: React.ReactNode;
}

export const Header = ({ children }: HeaderProps) => {
  return (
    <>
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-background text-black dark:text-white w-full">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {children}
          <ThemeToggle />
        </div>
      </header>
    </>
  );
};