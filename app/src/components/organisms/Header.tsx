// app/src/components/organisms/Header.tsx
import ThemeToggle from "@/components/molecules/ThemeToggle";

const Header = () => {
  return (
    <header
      className="flex justify-between items-center px-4 py-2"
      aria-label="サイトヘッダー"
    >
      <ThemeToggle />
    </header>
  );
};

export default Header;
