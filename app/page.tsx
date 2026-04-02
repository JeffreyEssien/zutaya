import Header from "@/components/modules/Header";
import Hero from "@/components/modules/Hero";
import PromiseBar from "@/components/modules/PromiseBar";
import NewArrivals from "@/components/modules/NewArrivals";
import ShopByCategory from "@/components/modules/ShopByCategory";
import HomeCta from "@/components/modules/HomeCta";
import AboutSnippet from "@/components/modules/AboutSnippet";
import Footer from "@/components/modules/Footer";
import { getNewProducts, getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [newProducts, categories] = await Promise.all([
    getNewProducts(),
    getCategories(),
  ]);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <PromiseBar />
        <NewArrivals products={newProducts} />
        <ShopByCategory categories={categories} />
        <HomeCta />
        <AboutSnippet />
      </main>
      <Footer />
    </>
  );
}
