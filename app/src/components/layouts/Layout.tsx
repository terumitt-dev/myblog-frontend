// app/src/components/layouts/Layout.tsx
import type { ReactNode } from "react";
import Header from "@/components/organisms/Header";
import Container from "@/components/layouts/Container";

type Props = {
  children: ReactNode;
};

const Layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-linear-to-b from-[#4161EC] to-[#BC7AF2] dark:from-[#1d2a7a] dark:to-[#6b3aa8] text-gray-800 dark:text-gray-100">
      <Header />

      <Container id="main-content" className="py-8" role="main">
        {children}
      </Container>
    </div>
  );
};

export default Layout;
